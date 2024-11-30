import { z } from "zod";

export const KeybindCommandsSchema = z.enum([
  "ExpandToggle",
  "ExpandToggleAll",
  "SendKill",
]);
export type KeybindCommands = z.infer<typeof KeybindCommandsSchema>;

export const KeybindScopeSchema = z.enum(["Global", "Command"]);

export type KeybindScope = z.infer<typeof KeybindScopeSchema>;
