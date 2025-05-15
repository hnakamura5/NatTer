import { z } from "zod";

export const CustomKeybindCommandsSchema = z.enum([
  "CommandCopyToClipboard",
  "CommandHistoryUp",
  "CommandHistoryDown",
  "ExpandToggleCommand",
  "ExpandToggleCommandAll",
  "FocusListUp",
  "FocusListDown",
  "FocusInput",
  "FocusFileView",
  "RenameFile",
  "SearchCommands",
  "SearchInCommand",
  "SendKill",
]);
export type CustomKeybindCommands = z.infer<typeof CustomKeybindCommandsSchema>;

export const FixedKeybindCommands = z.enum([
  // Keybind for builtin commands
  "Copy",
  "Paste",
  "Cut",
  "Undo",
  "Redo",
  "SelectAll",
  "Save",
  // Keybind for single specific keys
  "Delete",
  "Enter",
  "Backspace",
  "UpArrow",
  "DownArrow",
  "LeftArrow",
  "RightArrow",
  "Escape",
  "Tab",
]);
export type FixedKeybindCommands = z.infer<typeof FixedKeybindCommands>;

export const KeybindCommandsSchema = z.union([
  CustomKeybindCommandsSchema,
  FixedKeybindCommands,
]);
export type KeybindCommands = z.infer<typeof KeybindCommandsSchema>;

export const KeybindScopeSchema = z.enum(["Global", "Command"]);
export type KeybindScope = z.infer<typeof KeybindScopeSchema>;
