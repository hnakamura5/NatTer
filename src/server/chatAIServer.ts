import { server } from "@/server/tRPCServer";
import { z } from "zod";

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

// Store both connection and message history
interface ChatSession {
  sessionID: SessionID;
  connection: ChatAIConnection;
  history: BaseMessage[];
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
      const history = [];
      if (systemPrompt) {
        history.push(new SystemMessage(systemPrompt));
      }
      // Initialize with empty history
      chatSessions.set(id.id, {
        sessionID,
        connection,
        history,
      });
      // Add sessionID to the order keeper.
      if (orderedChatSessionBySession.has(sessionID.id)) {
        orderedChatSessionBySession.get(sessionID.id)!.push(id);
      } else {
        orderedChatSessionBySession.set(sessionID.id, [id]);
      }
      return id;
    }),

  chat: proc
    .input(
      z.object({
        id: ChatIDSchema,
        message: z.string(),
      })
    )
    .output(z.string())
    .mutation(async ({ input }) => {
      const { id, message } = input;
      const session = chatSessions.get(id.id);
      if (!session) {
        throw new Error("Chat session not found. Please start a new session.");
      }
      const llm = getLLM(session.connection);
      const parser = new StringOutputParser();
      // Add user message to history
      const userMessage = new HumanMessage(message);
      session.history.push(userMessage);
      // Call the LLM with the full history
      const response = await llm.pipe(parser).invoke(session.history);
      // Add AI response to history
      const aiMessage = new AIMessage(response);
      session.history.push(aiMessage);
      // Return the AI's response
      return response;
    }),

  chatStream: proc
    .input(
      z.object({
        id: ChatIDSchema,
        message: z.string(),
      })
    )
    .subscription(async ({ input }) => {
      const { id, message } = input;
      const session = getChatSession(id);
      if (!session) {
        throw new Error("Chat session not found. Please start a new session.");
      }
      const llm = getLLM(session.connection);
      session.history.push(new HumanMessage(message));
      return observable<string>((observer) => {
        let fullResponse = "";
        llm
          .pipe(new StringOutputParser())
          .stream(session.history)
          .then(async (stream) => {
            try {
              for await (const chunk of stream) {
                fullResponse += chunk;
                observer.next(chunk);
              }
              // After streaming completes, add the full response to history
              const aiMessage = new AIMessage(fullResponse);
              session.history.push(aiMessage);
              observer.complete();
            } catch (error) {
              observer.error(error);
            }
          });
        return () => {};
      });
    }),

  getHistory: proc
    .input(ChatIDSchema)
    .output(z.array(z.object({ role: z.string(), content: z.string() })))
    .query(({ input }) => {
      const session = getChatSession(input);
      // Convert LangChain messages to a simpler format for the client
      return session.history.map((msg) => {
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

  clearHistory: proc.input(ChatIDSchema).mutation(({ input }) => {
    const session = getChatSession(input);
    // Keep the system prompt if it exists.
    if (
      session.history.length > 0 &&
      session.history[0] instanceof SystemMessage
    ) {
      session.history = session.history.slice(1);
    } else {
      session.history = [];
    }
    return { success: true };
  }),

  stop: proc.input(ChatIDSchema).mutation(({ input }) => {
    const removed = chatSessions.delete(input.id);
    return { success: removed };
  }),
});
