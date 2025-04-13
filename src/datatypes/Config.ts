import { z } from "zod";
import {
  InteractKind,
  InteractKindSchema,
  ShellInteractKindSchema,
} from "@/datatypes/Interact";
import { LanguageServerConfigSchema } from "@/components/LanguageServerConfigs";
import { PathKindSchema, SshConnectionSchema } from "./SshConfig";
import { ChatAIConfigSchema } from "./AIModelConnectionConfigs";

const ShellConfigCommon = z.object({
  language: z.string(),
  encoding: z.string().optional(),
  interact: ShellInteractKindSchema,
  virtualPath: z
    .object({
      encodeToVirtual: z.string(),
      decodeToOS: z.string(),
    })
    .optional(),
  languageServer: LanguageServerConfigSchema.optional(),
  pathKind: PathKindSchema.optional(),
});
const ShellConfigExecutableCommon = z.object({});

export const LocalShellConfigSchema = z
  .object({
    name: z.string(),
    type: z.literal("local"),
    executable: z.string().optional(),
    args: z.array(z.string()).optional(),
  })
  .merge(ShellConfigCommon);
export type LocalShellConfig = z.infer<typeof LocalShellConfigSchema>;

export const SshShellConfigSchema = z
  .object({
    name: z.string(),
    type: z.literal("ssh"),
    connection: SshConnectionSchema,
    executable: z.string(),
    args: z.array(z.string()).optional(),
  })
  .merge(ShellConfigCommon)
  .merge(ShellConfigExecutableCommon.deepPartial());
export type SshShellConfig = z.infer<typeof SshShellConfigSchema>;

export const ShellConfigSchema = z.discriminatedUnion("type", [
  LocalShellConfigSchema,
  SshShellConfigSchema,
]);
// Discriminated Union of LocalShellConfig and SshShellConfig
export type ShellConfig = z.infer<typeof ShellConfigSchema>;

export function shellConfigExecutable(
  config: LocalShellConfig
): string | undefined {
  if (config.args) {
    return `${config.executable} ${config.args.join(" ")}`;
  } else {
    return config.executable;
  }
}

// Application Global config.
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

// Why deepPartial is deprecated? https://github.com/colinhacks/zod/issues/2854
export const PartialConfigSchema = ConfigSchema.deepPartial();
export type PartialConfig = z.infer<typeof PartialConfigSchema>;

export function decodeVirtualPathToOS(
  config: LocalShellConfig,
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

// Session identification information exposed to the client.
export const SessionInteractionSchema = z.object({
  interaction: InteractKindSchema,
  name: z.string(),
});

export type SessionInteraction = z.infer<typeof SessionInteractionSchema>;

// Asserting SessionInteraction has member interact of InteractKind.
type AssertSubtype<TSubtype extends TBase, TBase> = never;
type Assert = AssertSubtype<SessionInteraction, { interaction: InteractKind }>;
