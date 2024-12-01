import { z } from "zod";

export const KeybindCommandsSchema = z.enum([
  "CommandCopyToClipboard",
  "CommandHistoryUp",
  "CommandHistoryDown",
  "ExpandToggleCommand",
  "ExpandToggleCommandAll",
  "FocusCommandUp",
  "FocusCommandDown",
  "FocusInput",
  "FocusFileView",
  "SearchCommands",
  "SearchInCommand",
  "SendKill",
]);
export type KeybindCommands = z.infer<typeof KeybindCommandsSchema>;

export const KeybindScopeSchema = z.enum(["Global", "Command"]);

export type KeybindScope = z.infer<typeof KeybindScopeSchema>;
