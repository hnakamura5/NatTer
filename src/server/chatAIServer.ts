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

// Store both connection and message history
interface ChatSession {
  connection: ChatAIConnection;
  history: BaseMessage[];
}
const chatSessions = new Map<string, ChatSession>();

const proc = server.procedure;
export const aiRouter = server.router({
  start: proc
    .input(
      z.object({
        chatAIName: z.string(),
        systemPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { chatAIName, systemPrompt } = input;
      const connection = await getConnectionFromName(chatAIName);
      const id = randomUUID();
      const history = [];
      if (systemPrompt) {
        history.push(new SystemMessage(systemPrompt));
      }
      // Initialize with empty history
      chatSessions.set(id, {
        connection,
        history,
      });
      return id;
    }),

  chat: proc
    .input(
      z.object({
        id: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const session = chatSessions.get(input.id);
      if (!session) {
        throw new Error("Chat session not found. Please start a new session.");
      }
      const llm = getLLM(session.connection);
      const parser = new StringOutputParser();
      // Add user message to history
      const userMessage = new HumanMessage(input.message);
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
        id: z.string(),
        message: z.string(),
      })
    )
    .subscription(async ({ input }) => {
      const session = chatSessions.get(input.id);
      if (!session) {
        throw new Error("Chat session not found. Please start a new session.");
      }
      const llm = getLLM(session.connection);
      session.history.push(new HumanMessage(input.message));
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

  getHistory: proc.input(z.string()).query(({ input }) => {
    const session = chatSessions.get(input);
    if (!session) {
      throw new Error("Chat session not found");
    }
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
        content: msg.content,
      };
    });
  }),

  clearHistory: proc.input(z.string()).mutation(({ input }) => {
    const session = chatSessions.get(input);
    if (!session) {
      throw new Error("Chat session not found");
    }
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

  stop: proc.input(z.string()).mutation(({ input }) => {
    const removed = chatSessions.delete(input);
    return { success: removed };
  }),
});
