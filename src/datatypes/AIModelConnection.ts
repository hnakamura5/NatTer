import { z } from "zod";

export const SupportedProvider = z.enum([
  "openai",
  "anthropic",
  "google",
  "ollama",
]);
export type SupportedProvider = z.infer<typeof SupportedProvider>;

export const ChatAIConnectionSchema = z.object({
  name: z.string(),
  provider: SupportedProvider,
  model: z.string().optional(),
  apiKey: z.string().optional(),
  inputTokens: z.number().min(0),
  outputTokens: z.number().min(0),
  options: z.object({
    temperature: z.number().min(0).max(1).default(0.5),
  }),
});
export type ChatAIConnection = z.infer<typeof ChatAIConnectionSchema>;

export const ChatAIConnectionArraySchema = z.object({
  models: ChatAIConnectionSchema.array(),
});
export type ChatAIConnectionArray = z.infer<typeof ChatAIConnectionArraySchema>;

export function parseChatAIConnection(
  json: string
): ChatAIConnection | undefined {
  try {
    return ChatAIConnectionSchema.parse(JSON.parse(json));
  } catch {
    return undefined;
  }
}

export function parseChatAIConnectionArray(json: string): ChatAIConnection[] {
  try {
    return ChatAIConnectionArraySchema.parse(JSON.parse(json)).models;
  } catch {
    return [];
  }
}
