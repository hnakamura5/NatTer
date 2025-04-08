import { server } from "@/server/tRPCServer";
import { z } from "zod";

import MarkdownIt from "markdown-it";

import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  BaseMessage,
} from "@langchain/core/messages";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { start } from "repl";
import { ChatAIConnection } from "@/datatypes/AIModelConnection";
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
  aiRendered: string; // HTML
}

// Store both connection and message history
interface ChatSession {
  sessionID: SessionID;
  connection: ChatAIConnection;
  systemPrompt?: SystemMessage;
  messageHistory: MessageExchange[];
  onGoingMessage?: MessageExchange;
  historyContext: BaseMessage[]; // Context to pass to LLM.
  userInputHistory: string[]; // To provide history for input box.
}
const chatSessions = new Map<ChatID["id"], ChatSession>();
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
        renderOutput: z.boolean().default(false),
      })
    )
    .output(z.string())
    .mutation(async ({ input }) => {
      const { id, message, renderOutput } = input;
      const session = chatSessions.get(id.id);
      if (!session) {
        throw new Error("Chat session not found. Please start a new session.");
      }
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
      return renderOutput ? markdown.render(response) : response;
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
      if (!session) {
        throw new Error("Chat session not found. Please start a new session.");
      }
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
          session.onGoingMessage = {
            user: message,
            userAppendFiles: [], // TODO: Add files
            ai: "",
            aiRendered: "",
          };
          // Stream the response from the LLM
          try {
            for await (const chunk of stream) {
              session.onGoingMessage.ai =
                session.onGoingMessage.ai || "" + chunk;
              // set rendered response
              session.onGoingMessage.aiRendered = markdown.render(
                session.onGoingMessage.ai
              );
            }
            // After streaming completes, add the full response to history
            const aiMessage = new AIMessage(session.onGoingMessage.ai);
            session.historyContext.push(aiMessage);
            session.messageHistory.push(session.onGoingMessage);
            session.onGoingMessage = undefined;
          } catch (error) {
            log.debug("Error streaming response ", error);
          }
        });
    }),

  chatResponse: proc
    .input(ChatIDSchema)
    .output(
      z.object({
        ai: z.string(),
        aiRendered: z.string(),
      })
    )
    .query(({ input }) => {
      const session = getChatSession(input);
      return {
        ai: session.onGoingMessage?.ai || "",
        aiRendered: session.onGoingMessage?.aiRendered || "",
      };
    }),

  // Get all chat history by role:message pair
  chatSessionAllHistory: proc
    .input(ChatIDSchema)
    .output(z.array(z.object({ role: z.string(), content: z.string() })))
    .query(({ input }) => {
      const session = getChatSession(input);
      // Convert LangChain messages to a simpler format for the client
      return session.historyContext.map((msg) => {
        let role: "system" | "user" | "assistant";
        if (msg instanceof SystemMessage) {
          role = "system";
        } else if (msg instanceof HumanMessage) {
          role = "user";
        } else {
          role = "assistant";
        }
        return {
          role,
          content: msg.text,
        };
      });
    }),

  chatSessionHistoryNumUserInputs: proc
    .input(ChatIDSchema)
    .output(z.number().int())
    .query(({ input }) => {
      const session = getChatSession(input);
      return session.userInputHistory.length;
    }),

  // Get the chat user input history in the chat session by order.
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
    return { success: removed };
  }),
});
