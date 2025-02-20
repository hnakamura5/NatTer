import { z } from "zod";
import JSON5 from "json5";
import {
  KeybindCommands,
  KeybindCommandsSchema,
  KeybindScopeSchema,
  CustomKeybindCommandsSchema as CustomKeybindCommandsSchema,
} from "@/datatypes/KeybindCommands";
import { KeyboardEvent } from "react";

// Use the xterm internal evaluation by copying the function from xterm.js.
import { evaluateKeyboardEvent } from "@/datatypes/xtermCopySrc/Keyboard";

export const CustomKeybindSchema = z.object({
  key: z.string(),
  command: CustomKeybindCommandsSchema,
  args: z.array(z.string()).optional(),
  scope: KeybindScopeSchema.optional(),
});
export type CustomKeybind = z.infer<typeof CustomKeybindSchema>;

export const CustomKeybindListSchema = z.array(CustomKeybindSchema);
export type CustomKeybindList = z.infer<typeof CustomKeybindListSchema>;

export const PartialCustomKeybindSchema = CustomKeybindSchema.deepPartial();
export type PartialCustomKeybind = z.infer<typeof PartialCustomKeybindSchema>;

export const PartialCustomKeybindListSchema = z.array(
  PartialCustomKeybindSchema
);
export type PartialCustomKeybindList = z.infer<
  typeof PartialCustomKeybindListSchema
>;

export const KeybindSchema = z.object({
  key: z.string(),
  command: KeybindCommandsSchema,
  args: z.array(z.string()).optional(),
  scope: KeybindScopeSchema.optional(),
});
export type Keybind = z.infer<typeof KeybindSchema>;

export const KeybindListSchema = z.array(KeybindSchema);
export type KeybindList = z.infer<typeof KeybindListSchema>;

export function parseCustomKeybindList(json: string): CustomKeybindList {
  try {
    return CustomKeybindListSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse keybind: ", e);
    return [];
  }
}

export function parseCustomUserKeybindList(
  json: string
): PartialCustomKeybindList {
  try {
    return PartialCustomKeybindListSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse keybind: ", e);
    return [];
  }
}

// Add key binds that user can't change.
export function addFixedKeybinds(keybinds: CustomKeybindList): KeybindList {
  const fixedKeybinds: KeybindList = [
    {
      key: "ctrl+c",
      command: "Copy",
    },
    {
      key: "ctrl+v",
      command: "Paste",
    },
    {
      key: "ctrl+x",
      command: "Cut",
    },
    {
      key: "ctrl+z",
      command: "Undo",
    },
    {
      key: "ctrl+y",
      command: "Redo",
    },
    {
      key: "ctrl+a",
      command: "SelectAll",
    },
    {
      key: "ctrl+s",
      command: "Save",
    },
    {
      key: "delete",
      command: "Delete",
    },
  ];
  return fixedKeybinds.concat(keybinds);
}

// Check if the key is used for fixed keybinds.
export function isFixedKeyboardEvent(e: KeyboardEvent) {
  return (
    e.ctrlKey &&
    (e.key === "c" ||
      e.key === "v" ||
      e.key === "x" ||
      e.key === "z" ||
      e.key === "y" ||
      e.key === "a" ||
      e.key === "s")
  );
}

export function evaluateKeyboardEventToTerminalCode(e: KeyboardEvent) {
  // TODO: isMac?
  return evaluateKeyboardEvent(e, false, false, false).key;
}

export function keyOfCommand(
  keybinds: KeybindList,
  commandName: KeybindCommands
): Keybind | undefined {
  return keybinds.find((keybind) => keybind.command === commandName);
}

export type KeybindListMap = Map<KeybindCommands, Keybind[]>;

export function keybindListMap(keybinds: KeybindList): KeybindListMap {
  const map = new Map<KeybindCommands, Keybind[]>();
  keybinds.forEach((keybind) => {
    if (!map.has(keybind.command)) {
      map.set(keybind.command, []);
    }
    map.get(keybind.command)?.push(keybind);
  });
  return map;
}
