import { z } from "zod";

// function stripAnsi(text: string): string {
//   const ansiUp = new AnsiUp();
//   return ansiUp.ansi_to_text(text);
// }

// Command ID (-1 is silent command)
export const CommandIDSchema = z.number().int().min(-1);
export type CommandID = z.infer<typeof CommandIDSchema>;

export const ProcessIDSchema = z.string();
export type ProcessID = z.infer<typeof ProcessIDSchema>;

export const TerminalIDSchema = z.string();
export type TerminalID = string;

export const CommandSchema = z.object({
  pid: ProcessIDSchema,
  cid: CommandIDSchema,
  command: z.string(),
  exactCommand: z.string(),
  styledCommand: z.string().optional(),
  currentDirectory: z.string(),
  user: z.string(),
  startTime: z.string(),
  clock: z.number().int().min(0),

  stdoutIsFinished: z.boolean(),
  responseStarted: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  stderrIsFinished: z.boolean(),
  exitStatus: z.string().optional(),
  exitStatusIsOK: z.boolean().optional(),
  stdoutResponse: z.string(),
  stdoutIgnoringLine: z.boolean().optional(),
  boundaryDetector: z.string(),
  lineIgnoreMarker: z.string().optional(),
  outputCompleted: z.boolean().optional(),
  stdoutHTML: z.string().optional(),
  stderrHTML: z.string().optional(),
  terminalSize: z
    .object({
      cols: z.number().int(),
      rows: z.number().int(),
    })
    .optional(),
});
export type Command = z.infer<typeof CommandSchema>;

export function emptyCommand(pid: ProcessID, cid: CommandID): Command {
  return {
    command: "",
    pid: pid,
    cid: cid,
    exactCommand: "",
    styledCommand: undefined,
    currentDirectory: "",
    user: "",
    startTime: new Date().toLocaleString(),
    clock: 0,
    stdoutIsFinished: false,
    responseStarted: false,
    stdout: "",
    stderr: "",
    stderrIsFinished: false,
    exitStatus: undefined,
    exitStatusIsOK: undefined,
    stdoutResponse: "",
    boundaryDetector: "",
    lineIgnoreMarker: "",
  };
}

export function newCommand(
  pid: ProcessID,
  cid: CommandID,
  command: string,
  exactCommand: string,
  currentDirectory: string,
  user: string,
  boundaryDetector: string,
  lineIgnoreMarker?: string,
  styledCommand?: string,
  terminalSize?: { cols: number; rows: number }
): Command {
  const result = emptyCommand(pid, cid);
  result.command = command;
  result.exactCommand = exactCommand;
  result.currentDirectory = currentDirectory;
  result.user = user;
  result.boundaryDetector = boundaryDetector;
  result.lineIgnoreMarker = lineIgnoreMarker;
  result.styledCommand = styledCommand;
  result.terminalSize = terminalSize;
  return result;
}

export function summarizeCommand(command: Command, length: number): string {
  let result = command.command;
  if (result.length > length) {
    result = result.slice(0, length) + " ...";
  }
  return result.replace(/\n/g, " ");
}
