import { z } from "zod";

export const SupportedProvider = z.enum([
  "openai",
  "anthropic",
  "google",
  "ollama",
]);
export type SupportedProvider = z.infer<typeof SupportedProvider>;

export const ChatAIConfigSchema = z.object({
  name: z.string(),
});
export type ChatAIConfig = z.infer<typeof ChatAIConfigSchema>;

export const ChatAIConnectionConfigSchema = z
  .object({
    model: z.string().optional(),
    options: z.object({
      temperature: z.number().min(0).max(1).default(0.5),
    }),
    provider: SupportedProvider,
    apiKey: z.string().optional(),
    inputTokens: z.number().min(0),
    outputTokens: z.number().min(0),
  })
  .merge(ChatAIConfigSchema);

export type ChatAIConnectionConfig = z.infer<
  typeof ChatAIConnectionConfigSchema
>;

export const ChatAIConnectionArraySchema = z.object({
  models: ChatAIConnectionConfigSchema.array(),
});
export type ChatAIConnectionArray = z.infer<typeof ChatAIConnectionArraySchema>;

export function parseChatAIConnection(
  json: string
): ChatAIConnectionConfig | undefined {
  try {
    return ChatAIConnectionConfigSchema.parse(JSON.parse(json));
  } catch {
    return undefined;
  }
}

export function parseChatAIConnectionArray(
  json: string
): ChatAIConnectionConfig[] {
  try {
    return ChatAIConnectionArraySchema.parse(JSON.parse(json)).models;
  } catch {
    return [];
  }
}
