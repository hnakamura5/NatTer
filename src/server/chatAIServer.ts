import { server } from "@/server/tRPCServer";
import { z } from "zod";

import MarkdownIt from "markdown-it";
import DOMPurify from "dompurify";

import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatAIConnectionConfig } from "@/datatypes/AIModelConnectionConfigs";
import { randomUUID } from "crypto";
import { getConnectionFromName, getLLM } from "./ChatAIUtils/connection";
import { observable } from "@trpc/server/observable";
import {
  ChatID,
  ChatIDSchema,
  SessionID,
  SessionIDSchema,
} from "@/datatypes/SessionID";
import { assertSessionExists } from "./sessionServer";
import { newUUID } from "./cryptoServer";

import { log } from "@/datatypes/Logger";
import {
  addAIResponse,
  ChatAIMessageSchema,
  ChatAIRole,
  ChatMessageExchange,
  ChatMessageExchangeSchema,
  newChatMessageExchange,
} from "@/datatypes/ChatAI";

const markdown = new MarkdownIt({
  linkify: true,
  typographer: true,
  breaks: true,
  // TODO: highlight: function (str, lang) { },
});

interface MessageExchange {
  user: string;
  userAppendFiles: string[];
  ai: string;
  aiRenderedHTML: string; // HTML
}

// Store both connection and message history
interface ChatSession {
  sessionID: SessionID;
  connection: ChatAIConnectionConfig;
  systemPrompt?: SystemMessage;
  messageHistory: ChatMessageExchange[];
  onGoingMessage?: ChatMessageExchange;
  historyContext: BaseMessage[]; // Context to pass to LLM.
  userInputHistory: string[]; // To provide history for input box.
}
const chatSessions = new Map<ChatID["id"], ChatSession>();
const stoppedChatSessions = new Set<ChatID["id"]>();
function getChatSession(id: ChatID) {
  const session = chatSessions.get(id.id);
  if (!session) {
    throw new Error("Chat session not found");
  }
  return session;
}
// order keeper for each application session
const orderedChatSessionBySession = new Map<SessionID["id"], ChatID[]>();
function getChatSessionBySession(sessionID: SessionID) {
  const sessions = orderedChatSessionBySession.get(sessionID.id);
  if (!sessions) {
    return undefined;
  }
  return sessions;
}
function getChatSessionBySessionIndex(sessionID: SessionID, index: number) {
  const sessions = orderedChatSessionBySession.get(sessionID.id);
  if (!sessions) {
    return undefined;
  }
  if (index < 0 || index >= sessions.length) {
    return undefined;
  }
  return chatSessions.get(sessions[index].id);
}

async function start(
  sessionID: SessionID,
  chatAIName: string,
  systemPrompt?: string
) {
  const connection = await getConnectionFromName(chatAIName);
  const id: ChatID = { type: "chat", id: newUUID() };
  const historyContext = [];
  let systemPromptMessage = undefined;
  if (systemPrompt) {
    systemPromptMessage = new SystemMessage(systemPrompt);
    historyContext.push(systemPromptMessage);
  }
  // Initialize with empty history
  chatSessions.set(id.id, {
    sessionID,
    connection,
    systemPrompt: systemPromptMessage,
    messageHistory: [],
    onGoingMessage: undefined,
    historyContext,
    userInputHistory: [],
  });
  // Add sessionID to the order keeper.
  if (orderedChatSessionBySession.has(sessionID.id)) {
    orderedChatSessionBySession.get(sessionID.id)!.push(id);
  } else {
    orderedChatSessionBySession.set(sessionID.id, [id]);
  }
  return id;
}

async function chatOneShot(
  session: ChatSession,
  message: string,
  renderOutputToHTML: boolean
) {
  const llm = getLLM(session.connection);
  const parser = new StringOutputParser();
  // Add user message to history
  const userMessage = new HumanMessage(message);
  session.historyContext.push(userMessage);
  session.userInputHistory.push(message);
  // Call the LLM with the full history
  const response = await llm.pipe(parser).invoke(session.historyContext);
  // Add AI response to history
  const aiMessage = new AIMessage(response);
  session.historyContext.push(aiMessage);
  // Return the AI's response
  return renderOutputToHTML
    ? DOMPurify.sanitize(markdown.render(response))
    : response;
}

async function chatSubmit(session: ChatSession, message: string) {
  const llm = getLLM(session.connection);
  // Add user message to history
  session.userInputHistory.push(message);
  const userMessage = new HumanMessage(message);
  session.historyContext.push(userMessage);
  llm
    .pipe(new StringOutputParser())
    .stream(session.historyContext)
    .then(async (stream) => {
      // Start onGoingMessage.
      const onGoingMessage = newChatMessageExchange(
        message,
        undefined,
        [] /* TODO: Add files */
      );
      session.onGoingMessage = onGoingMessage;
      session.messageHistory.push(onGoingMessage);
      const response = addAIResponse(onGoingMessage, session.connection.name);
      // Stream the response from the LLM
      try {
        for await (const chunk of stream) {
          response.content = response.content + chunk;
          // set rendered response
          response.contentHTML = DOMPurify.sanitize(
            markdown.render(response.content)
          );
        }
        // After streaming completes, add the full response to history
        session.historyContext.push(new AIMessage(response.content));
        session.onGoingMessage = undefined;
      } catch (error) {
        log.debug(
          "Error streaming response ",
          error,
          " in ",
          session.connection.name
        );
      }
    });
}

const proc = server.procedure;
export const aiRouter = server.router({
  start: proc
    .input(
      z.object({
        sessionID: SessionIDSchema,
        chatAIName: z.string(),
        systemPrompt: z.string().optional(),
      })
    )
    .output(ChatIDSchema)
    .mutation(async ({ input }) => {
      const { sessionID, chatAIName, systemPrompt } = input;
      assertSessionExists(sessionID);
      return start(sessionID, chatAIName, systemPrompt);
    }),

  // Get all chat session IDs associated with the session.
  chatSessions: proc
    .input(SessionIDSchema)
    .output(z.array(ChatIDSchema))
    .query(({ input }) => {
      return getChatSessionBySession(input) || [];
    }),

  numChatSessions: proc
    .input(SessionIDSchema)
    .output(z.number().int())
    .query(({ input }) => {
      return getChatSessionBySession(input)?.length || 0;
    }),

  // Get first input history of a chat session by order of start.
  // To provide history for global input box.
  getSessionFirstInputHistory: proc
    .input(
      z.object({
        sessionID: SessionIDSchema,
        index: z.number().int(),
      })
    )
    .output(z.string())
    .mutation(({ input }) => {
      const { sessionID, index } = input;
      const chatSession = getChatSessionBySessionIndex(sessionID, index);
      return chatSession?.userInputHistory[0] || "";
    }),

  chatOneShot: proc
    .input(
      z.object({
        id: ChatIDSchema,
        message: z.string(),
        renderOutputToHTML: z.boolean().default(false),
      })
    )
    .output(z.string())
    .mutation(async ({ input }) => {
      const { id, message, renderOutputToHTML } = input;
      const session = getChatSession(id);
      return chatOneShot(session, message, renderOutputToHTML);
    }),

  chatSubmit: proc
    .input(
      z.object({
        id: ChatIDSchema,
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, message } = input;
      const session = getChatSession(id);
      chatSubmit(session, message);
    }),

  chatOnGoingResponse: proc
    .input(ChatIDSchema)
    .output(
      z.object({
        exists: z.boolean(),
        message: z.array(ChatAIMessageSchema).optional(),
      })
    )
    .query(({ input }) => {
      const session = getChatSession(input);
      if (session.onGoingMessage) {
        return {
          exists: true,
          message: session.onGoingMessage.aiResponse,
        };
      } else {
        return {
          exists: false,
          message: undefined,
        };
      }
    }),

  chatSessionTitle: proc
    .input(ChatIDSchema)
    .output(z.string())
    .query(({ input }) => {
      const session = getChatSession(input);
      return session.userInputHistory[0] || ""; // TODO Summarize by AI?
    }),

  chatSessionNumHistory: proc
    .input(ChatIDSchema)
    .output(z.number().int())
    .query(({ input }) => {
      const session = getChatSession(input);
      return session.messageHistory.length;
    }),

  chatSessionHistory: proc
    .input(z.object({ id: ChatIDSchema, index: z.number().int() }))
    .output(ChatMessageExchangeSchema)
    .query(({ input }) => {
      const session = getChatSession(input.id);
      return session.messageHistory[input.index];
    }),

  chatSessionHistoryNumUserInputs: proc
    .input(ChatIDSchema)
    .output(z.number().int())
    .query(({ input }) => {
      const session = getChatSession(input);
      return session.userInputHistory.length;
    }),

  // Get the chat user input history in the chat session by order.
  // To provide history for chat session input box.
  getChatSessionUserInputHistory: proc
    .input(z.object({ id: ChatIDSchema, index: z.number().int() }))
    .output(z.string())
    .mutation(({ input }) => {
      const session = getChatSession(input.id);
      return session.userInputHistory[input.index];
    }),

  clearChatSessionHistory: proc.input(ChatIDSchema).mutation(({ input }) => {
    const session = getChatSession(input);
    // Keep the system prompt if it exists.
    if (session.systemPrompt) {
      session.historyContext = [session.systemPrompt];
    } else {
      session.historyContext = [];
    }
    session.userInputHistory = [];
    session.messageHistory = [];
    session.onGoingMessage = undefined;
    return { success: true };
  }),

  stop: proc.input(ChatIDSchema).mutation(({ input }) => {
    const removed = chatSessions.delete(input.id);
    stoppedChatSessions.add(input.id);
    return { success: removed };
  }),

  chatSessionAlive: proc
    .input(ChatIDSchema)
    .output(z.boolean())
    .query(({ input }) => {
      if (chatSessions.has(input.id)) {
        return true;
      }
      if (stoppedChatSessions.has(input.id)) {
        return false;
      }
      throw new Error("Chat session not found");
    }),
});
