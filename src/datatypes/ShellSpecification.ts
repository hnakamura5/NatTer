import { z } from "zod";
import { PathKindSchema } from "@/datatypes/UniversalPath";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";
import JSON5 from "json5";

const ScopeSchema = z.object({
  opener: z.string(),
  closer: z.string(),
  isRegionComment: z.boolean().optional(),
});
export type Scope = z.infer<typeof ScopeSchema>;

const StringScopeSchema = z.object({
  quote: z.string(),
  containsEscape: z.boolean().optional(),
  allowMultiline: z.boolean().optional(),
});
export type StringScope = z.infer<typeof StringScopeSchema>;

export const ShellSpecificationSchema = z.object({
  // Shell specification.
  name: z.string(),
  pathKind: PathKindSchema,
  // The list of supported interactions.
  supportedInteractions: z.array(ShellInteractKindSchema),

  // Command syntax specification.
  escapes: z.array(z.string()),
  scope: z.array(ScopeSchema),
  stringScope: z.array(StringScopeSchema),
  lineComments: z.array(z.string()),
  lineContinuations: z.array(z.string()),
  delimiter: z.string(),
  lineEnding: z.string(),
  exitCodeVariable: z.string(),
  // For some shell, quotation itself lives in string. e.g. cmd.
  quoteLivesInString: z.boolean().optional(),

  // Command end detection.
  boundaryDetectorCharset: z
    .object({
      boundary: z.string(),
      placer: z.string(),
    })
    .optional(),
  // Check if the exit code is OK.
  exitCodeOK: z.string(),

  // Current directory controls (optional functionality).
  directoryCommands: z
    .object({
      // If defined, the shell starts from the directory.
      defaultHome: z.string().optional(),
      // Get the current directory from the command response.
      getCurrent: z.string(),
      // Change the current directory command.
      changeCurrent: z.string(),
      // Get the content of the directory.
      list: z.string(),
      // Get current user.
      getUser: z.string(),
    })
    .optional(),
  // Command like source in bash
  sourceCommand: z.string().optional(),
  // Paren to group commands
  paren: z.string().optional(),

  echoCommands: z
    .object({
      toStdout: z.string(),
      toStderr: z.string().optional(),
    })
    .optional(),

  // Prompt control (optional functionality for terminal).
  promptCommands: z
    .object({
      // Get the prompt from the command response.
      get: z.string(),
      // Change the prompt command.
      set: z.string(),
      // Set the continuation prompt.
      setContinuation: z.string().optional(),
    })
    .optional(),

  // The command is not echo back to stdout unless tty. e.g. bash
  commandNotEchoBack: z.boolean().optional(),

  defaultExt: z.string(),
  temporalFilePath: z.string().optional(),
});
export type ShellSpecification = z.infer<typeof ShellSpecificationSchema>;

export const PartialShellSpecificationSchema =
  ShellSpecificationSchema.deepPartial();
export type PartialShellSpecification = z.infer<
  typeof PartialShellSpecificationSchema
>;

// Utilized functions for ShellSpecification.
export function getDefaultHome(shellSpec: ShellSpecification) {
  return shellSpec.directoryCommands?.defaultHome;
}

export function getCurrentCommand(shellSpec: ShellSpecification) {
  return shellSpec.directoryCommands?.getCurrent;
}

export function getChangeCurrentCommand(
  shellSpec: ShellSpecification,
  path: string
) {
  return shellSpec.directoryCommands?.changeCurrent.replace("${path}", path);
}

export function getListCommand(shellSpec: ShellSpecification, path: string) {
  return shellSpec.directoryCommands?.list.replace("${path}", path);
}

export function getUserCommand(shellSpec: ShellSpecification) {
  return shellSpec.directoryCommands?.getUser;
}

export function getPromptCommand(shellSpec: ShellSpecification) {
  return shellSpec.promptCommands?.get;
}

export function setPromptCommand(
  shellSpec: ShellSpecification,
  prompt: string
) {
  return shellSpec.promptCommands?.set.replace("${prompt}", prompt);
}

export function setContinuationPromptCommand(
  shellSpec: ShellSpecification,
  prompt: string
) {
  return shellSpec.promptCommands?.setContinuation?.replace(
    "${prompt}",
    prompt
  );
}

export function sourceCommand(shellSpec: ShellSpecification, path: string) {
  return shellSpec.sourceCommand?.replace("${path}", path);
}

export function parenCommand(shellSpec: ShellSpecification, command: string) {
  return shellSpec.paren?.replace("${command}", command) || command;
}

export function echoToStdout(shellSpec: ShellSpecification, message: string) {
  return shellSpec.echoCommands?.toStdout.replace("${message}", message);
}

export function echoToStderr(shellSpec: ShellSpecification, message: string) {
  return shellSpec.echoCommands?.toStderr?.replace("${message}", message);
}

export function isExitCodeOK(shellSpec: ShellSpecification, exitCode: string) {
  return exitCode === shellSpec.exitCodeOK;
}

export function parseShellSpec(json: string): ShellSpecification | undefined {
  try {
    return ShellSpecificationSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse shell spec: ", e);
    return undefined;
  }
}

export function parsePartialShellSpec(
  json: string
): PartialShellSpecification | undefined {
  try {
    return PartialShellSpecificationSchema.parse(JSON5.parse(json));
  } catch (e) {
    console.error("Failed to parse shell spec: ", e);
    return undefined;
  }
}

export function shellSpecListToMap(
  specs: ShellSpecification[]
): Map<string, ShellSpecification> {
  const map = new Map<string, ShellSpecification>();
  for (const spec of specs) {
    map.set(spec.name, spec);
  }
  return map;
}
