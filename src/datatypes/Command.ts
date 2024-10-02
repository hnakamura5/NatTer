
import { z } from "zod";

export const CommandSchema = z.object({
  command: z.string(),
  exactCommand: z.string(),
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
  endDetector: z.string(),
});
export type Command = z.infer<typeof CommandSchema>;

export function emptyCommand(): Command {
  return {
    command: "",
    exactCommand: "",
    currentDirectory: "",
    startTime: "",
    clock: 0,
    isFinished: true,
    stdout: "",
    stderr: "",
    timeline: [],
    endDetector: "",
  };
}

export function getOutputPartOfStdout(command: Command): string {
  const result = command.stdout.slice(command.exactCommand.length);
  if (command.isFinished) {
    return result.slice(0, result.indexOf(command.endDetector));
  }
  return result;
}
