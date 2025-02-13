import { z } from "zod";
import JSON5 from "json5";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";
import path from "path";
import { exec } from "child_process";

const pathVariables: Map<string, string> = new Map();
pathVariables.set("${USERPROFILE}", process.env.USERPROFILE || "");
pathVariables.set("${HOME}", process.env.HOME || "");
pathVariables.set("${APPDATA}", process.env.APPDATA || "");

export function configPathAssignVariables(path: string): string {
  for (const [key, value] of pathVariables) {
    path = path.replace(key, value);
  }
  return path;
}

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
  languageServer: z
    .object({
      executable: z.string(),
      args: z.array(z.string()).optional(),
    })
    .optional(),
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
});

export type Config = z.infer<typeof ConfigSchema>;

export function parseConfig(json: string): Config | undefined {
  try {
    const parsed = ConfigSchema.parse(JSON5.parse(json));
    // Assign path variables.
    return {
      ...parsed,
      shells: parsed.shells.map((s) => ({
        ...s,
        executable: configPathAssignVariables(s.executable),
        args: s.args?.map((a) => configPathAssignVariables(a)),
        languageServer: s.languageServer
          ? {
              ...s.languageServer,
              executable: configPathAssignVariables(
                s.languageServer.executable
              ),
              args: s.languageServer.args?.map((a) =>
                configPathAssignVariables(a)
              ),
            }
          : undefined,
      })),
    };
  } catch (e) {
    console.error("Failed to parse config: ", e);
    return undefined;
  }
}

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
