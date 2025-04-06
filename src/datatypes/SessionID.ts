import { z } from "zod";

export const SessionIDSchema = z.object({
  type: z.literal("session"),
  id: z.string(),
});
export type SessionID = z.infer<typeof SessionIDSchema>;

export const ProcessIDSchema = z.object({
  type: z.literal("process"),
  id: z.string(),
});
export type ProcessID = z.infer<typeof ProcessIDSchema>;

export const ChatIDSchema = z.object({
  type: z.literal("chat"),
  id: z.string(),
});
export type ChatID = z.infer<typeof ChatIDSchema>;
