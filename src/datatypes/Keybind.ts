import { z } from "zod";
import JSON5 from "json5";
import {
  KeybindCommands,
  KeybindCommandsSchema,
  KeybindScopeSchema,
} from "@/datatypes/KeybindCommands";

export const KeybindSchema = z.object({
  key: z.string(),
  command: KeybindCommandsSchema,
  args: z.array(z.string()).optional(),
  scope: KeybindScopeSchema.optional(),
});

export type Keybind = z.infer<typeof KeybindSchema>;

export const KeybindListSchema = z.array(KeybindSchema);
export type KeybindList = z.infer<typeof KeybindListSchema>;

export function parseKeybindList(json: string): KeybindList {
  try {
    return KeybindListSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse keybind: ", e);
    return [];
  }
}

export function keyOfCommand(
  keybinds: KeybindList,
  commandName: KeybindCommands
): Keybind | undefined {
  return keybinds.find((keybind) => keybind.command === commandName);
}
