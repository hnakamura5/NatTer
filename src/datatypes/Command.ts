import { styled } from "@mui/material";
import { z } from "zod";

export const CommandSchema = z.object({
  pid: z.number().int().min(0), // Process ID
  cid: z.number().int().min(-1), // Command ID (-1 is silent command)
  command: z.string(),
  exactCommand: z.string(),
  styledCommand: z.string().optional(),
  currentDirectory: z.string(),
  startTime: z.string(),
  clock: z.number().int().min(0),

  isFinished: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  timeline: z.array(
    z.object({
      response: z.string(),
      isError: z.boolean(),
    })
  ),
  exitStatus: z.string().optional(),
  exitStatusIsOK: z.boolean().optional(),
  stdoutResponse: z.string(),
  endDetector: z.string(),
});
export type Command = z.infer<typeof CommandSchema>;

export function emptyCommand(pid: number, cid:number): Command {
  return {
    command: "",
    pid: pid,
    cid: cid,
    exactCommand: "",
    styledCommand: undefined,
    currentDirectory: "",
    startTime: new Date().toLocaleString(),
    clock: 0,
    isFinished: false,
    stdout: "",
    stderr: "",
    timeline: [],
    exitStatus: undefined,
    exitStatusIsOK: undefined,
    stdoutResponse: "",
    endDetector: "",
  };
}

export function getOutputPartOfStdout(command: Command): string {
  const result = command.stdout.slice(
    command.stdout.indexOf(command.exactCommand) +
      command.exactCommand.length +
      1
  );
  if (command.isFinished) {
    return result.slice(0, result.indexOf(command.endDetector));
  }
  return result;
}

export function summarizeCommand(command: Command): string {
  let result = command.command;
  if (result.length > 20) {
    result = result.slice(0, 20) + "...";
  }
  return result.replace(/\n/g, " ");
}
