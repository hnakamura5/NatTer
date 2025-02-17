import { z } from "zod";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";
import { LanguageServerConfigSchema } from "@/components/LanguageServerConfigs";
import { lspTempDir, tempDir } from "@/server/configServer";

export const ShellConfigSchema = z.object({
  name: z.string(),
  executable: z.string(),
  args: z.array(z.string()).optional(),
  kind: z.string(),
  encoding: z.string().optional(),
  interact: ShellInteractKindSchema,
  virtualPath: z
    .object({
      encodeToVirtual: z.string(),
      decodeToOS: z.string(),
    })
    .optional(),
  languageServer: LanguageServerConfigSchema.optional(),
});

export type ShellConfig = z.infer<typeof ShellConfigSchema>;

export function shellConfigExecutable(config: ShellConfig): string {
  if (config.args) {
    return `${config.executable} ${config.args.join(" ")}`;
  } else {
    return config.executable;
  }
}

export const ConfigSchema = z.object({
  locale: z.string().optional(),
  theme: z.string().optional(),
  themePaths: z.array(z.string()).optional(),
  defaultShell: z.string().optional(),
  editor: z.enum(["CodeMirror", "Monaco"]).optional(),
  shells: z.array(ShellConfigSchema),
  tempDir: z.string().optional(),
  commandTempDir: z.string().optional(),
  lspTempDir: z.string().optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export function decodeVirtualPathToOS(
  config: ShellConfig,
  path: string
): string {
  if (config.virtualPath) {
    return config.virtualPath.decodeToOS.replace("${path}", path);
  } else {
    return path;
  }
}

export function encodeOSPathToVirtual(
  config: ShellConfig,
  path: string
): string {
  if (config.virtualPath) {
    return config.virtualPath.encodeToVirtual.replace("${path}", path);
  } else {
    return path;
  }
}
