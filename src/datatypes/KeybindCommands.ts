import { z } from "zod";

export const UserKeybindCommandsSchema = z.enum([
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
export type UserKeybindCommands = z.infer<typeof UserKeybindCommandsSchema>;

export const FixedKeybindCommands = z.enum([
  "Copy",
  "Paste",
  "Cut",
  "Undo",
  "Redo",
  "SelectAll",
  "Save",
]);
export type FixedKeybindCommands = z.infer<typeof FixedKeybindCommands>;

export const KeybindCommandsSchema = z.union([
  UserKeybindCommandsSchema,
  FixedKeybindCommands,
]);
export type KeybindCommands = z.infer<typeof KeybindCommandsSchema>;

export const KeybindScopeSchema = z.enum(["Global", "Command"]);
export type KeybindScope = z.infer<typeof KeybindScopeSchema>;
