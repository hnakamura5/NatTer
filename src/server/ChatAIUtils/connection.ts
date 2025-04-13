import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatOllama } from "@langchain/ollama";
import { ChatAnthropic } from "@langchain/anthropic";
import {
  ChatAIConnectionConfig,
  SupportedProvider,
} from "@/datatypes/AIModelConnectionConfigs";

import { readChatAIs } from "@/server/configServer";

export function getLLM(connection: ChatAIConnectionConfig) {
  switch (connection.provider) {
    case "openai":
      return new ChatOpenAI({
        temperature: connection.options.temperature,
        apiKey: connection.apiKey,
        model: connection.model,
      });
    case "anthropic":
      return new ChatAnthropic({ temperature: connection.options.temperature });
    case "google":
      if (!connection.model) {
        throw new Error("Google model is required");
      }
      return new ChatGoogleGenerativeAI({
        temperature: connection.options.temperature,
        model: connection.model,
        apiKey: connection.apiKey,
      });
    case "ollama":
      return new ChatOllama({ temperature: connection.options.temperature });
  }
}

export async function getConnectionFromName(
  name: string
): Promise<ChatAIConnectionConfig> {
  const chatAIs = readChatAIs();
  for (const chatAI of await chatAIs) {
    if (chatAI.name === name) {
      return chatAI;
    }
  }
  throw new Error("Chat AI not found");
}
