import { z } from "zod";

export const ShellInteractKindSchema = z.enum(["command", "terminal"]);
export type ShellInteractKind = z.infer<typeof ShellInteractKindSchema>;
