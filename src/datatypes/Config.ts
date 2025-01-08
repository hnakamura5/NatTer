import { z } from "zod";
import JSON5 from "json5";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";

export const ShellConfigSchema = z.object({
  name: z.string(),
  executable: z.string(),
  args: z.array(z.string()).optional(),
  kind: z.enum(["bash", "cmd", "powershell"]),
  encoding: z.string().optional(),
  interact: ShellInteractKindSchema,
  virtualPath: z.object({
    encodeToVirtual: z.string(),
    decodeToOS: z.string(),
  }).optional(),
});

export type ShellConfig = z.infer<typeof ShellConfigSchema>;

export const ConfigSchema = z.object({
  language: z.string().optional(),
  theme: z.string().optional(),
  themePaths: z.array(z.string()).optional(),
  defaultShell: z.string().optional(),
  shells: z.array(ShellConfigSchema).nonempty(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function parseConfig(json: string): Config | undefined {
  try {
    return ConfigSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse config: ", e);
    return undefined;
  }
}
