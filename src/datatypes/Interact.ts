import { z } from "zod";

export const ShellInteractKindSchema = z.enum(["command", "terminal"]);
export type ShellInteractKind = z.infer<typeof ShellInteractKindSchema>;

export const AIInteractionKindSchema = z.enum(["chatAI"]);
export type AIInteractionKind = z.infer<typeof AIInteractionKindSchema>;

// All the supported interactions
export const InteractKindSchema = ShellInteractKindSchema.or(
  AIInteractionKindSchema
);
export type InteractKind = z.infer<typeof InteractKindSchema>;
