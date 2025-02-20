import { z } from "zod";

export const CustomKeybindCommandsSchema = z.enum([
  "CommandCopyToClipboard",
  "CommandHistoryUp",
  "CommandHistoryDown",
  "ExpandToggleCommand",
  "ExpandToggleCommandAll",
  "FocusCommandUp",
  "FocusCommandDown",
  "FocusInput",
  "FocusFileView",
  "RenameFile",
  "SearchCommands",
  "SearchInCommand",
  "SendKill",
]);
export type CustomKeybindCommands = z.infer<typeof CustomKeybindCommandsSchema>;

export const FixedKeybindCommands = z.enum([
  "Copy",
  "Paste",
  "Cut",
  "Undo",
  "Redo",
  "SelectAll",
  "Save",
  "Delete",
]);
export type FixedKeybindCommands = z.infer<typeof FixedKeybindCommands>;

export const KeybindCommandsSchema = z.union([
  CustomKeybindCommandsSchema,
  FixedKeybindCommands,
]);
export type KeybindCommands = z.infer<typeof KeybindCommandsSchema>;

export const KeybindScopeSchema = z.enum(["Global", "Command"]);
export type KeybindScope = z.infer<typeof KeybindScopeSchema>;
