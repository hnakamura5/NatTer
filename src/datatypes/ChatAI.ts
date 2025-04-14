import { z } from "zod";

export const ChatAIRole = z.enum(["system", "user", "assistant"]);
export type ChatAIRole = z.infer<typeof ChatAIRole>;

export const ChatUserMessageSchema = z.object({
  content: z.string(),
  contentHTML: z.string(),
  appendFiles: z.array(z.string()).optional(),
});
export type ChatUserMessage = z.infer<typeof ChatUserMessageSchema>;

export const ChatAIMessageSchema = z.object({
  name: z.string(), // Name of the AI model
  content: z.string(),
  contentHTML: z.string(),
  error: z.string().optional(),
  errorHTML: z.string().optional(),
});
export type ChatAIMessage = z.infer<typeof ChatAIMessageSchema>;

export const ChatMessageExchangeSchema = z.object({
  userInput: ChatUserMessageSchema,
  // In some strategy, multiple AI models return to one message
  aiResponse: z.array(ChatAIMessageSchema),
});
export type ChatMessageExchange = z.infer<typeof ChatMessageExchangeSchema>;

export function newChatMessageExchange(
  user: string,
  userHTML: string | undefined,
  appendFiles: string[]
): ChatMessageExchange {
  return {
    userInput: {
      content: user,
      contentHTML: userHTML || `<span>${user}</span>`,
      appendFiles: appendFiles,
    },
    aiResponse: [],
  };
}

export function addAIResponse(exchange: ChatMessageExchange, name: string) {
  const message = {
    name: name,
    content: "",
    contentHTML: "",
  };
  exchange.aiResponse.push(message);
  return message;
}
