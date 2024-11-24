import { z } from "zod";
import  stripAnsiRaw from "strip-ansi";
import { Terminal } from "@xterm/headless";
import { SerializeAddon } from "@xterm/addon-serialize";
import { AnsiUp } from "./ansiUpCustom";

const xterm = new Terminal({
  allowProposedApi: true,
});
const serializeAddon = new SerializeAddon();
xterm.loadAddon(serializeAddon);
function stripAnsi(text: string) {
  xterm.clear();
  xterm.reset();
  xterm.resize(512, 64);  //[HN] TODO: set appropriate size.
  console.log(`stripAnsi: write ${text}`);
  let result: string | undefined = undefined;
  xterm.write(text, () => {
    result = serializeAddon.serialize();
    console.log(`stripAnsi: write done serial: ${result}`);
  });
  return new Promise<string>((resolve) => {
    const interval = setInterval(() => {
      if (result) {
        clearInterval(interval);
        resolve(stripAnsiRaw(result));
      }
    }, 100);
  });
}

// function stripAnsi(text: string): string {
//   const ansiUp = new AnsiUp();
//   return ansiUp.ansi_to_text(text);
// }

// Command ID (-1 is silent command)
export const CommandIDSchema = z.number().int().min(-1);
export type CommandID = z.infer<typeof CommandIDSchema>;

export const ProcessIDSchema = z.number().int().min(0);
export type ProcessID = z.infer<typeof ProcessIDSchema>;

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

  isFinished: z.boolean(),
  stdout: z.string(),
  stderr: z.string(),
  exitStatus: z.string().optional(),
  exitStatusIsOK: z.boolean().optional(),
  stdoutResponse: z.string(),
  boundaryDetector: z.string(),
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
    isFinished: false,
    stdout: "",
    stderr: "",
    exitStatus: undefined,
    exitStatusIsOK: undefined,
    stdoutResponse: "",
    boundaryDetector: "",
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
  styledCommand?: string
): Command {
  const result = emptyCommand(pid, cid);
  result.command = command;
  result.exactCommand = exactCommand;
  result.currentDirectory = currentDirectory;
  result.user = user;
  result.boundaryDetector = boundaryDetector;
  result.styledCommand = styledCommand;
  return result;
}

// Convert ANSI to plain text and remove the command itself if included.
// The caller must remove end boundaryDetector themselves.
export async function getStdoutOutputPartInPlain(
  command: Command,
  includesCommandItSelf: boolean
) {
  const result = (await stripAnsi(command.stdoutResponse)).trim();
  console.log(
    `getStdoutOutputPartInPlain: ${result}, includesCommandItSelf: ${includesCommandItSelf} exactCommand: ${command.exactCommand}`
  );
  if (!includesCommandItSelf) {
    return result;
  }
  const commandIndex = result.indexOf(command.exactCommand);
  console.log(`getStdoutOutputPartInPlain: commandIndex: ${commandIndex}`);
  if (commandIndex === -1) {
    return result;
  }
  const sliceStart = commandIndex + command.exactCommand.length + 1;
  return result.slice(sliceStart);
}

export function summarizeCommand(command: Command, length: number): string {
  let result = command.command;
  if (result.length > length) {
    result = result.slice(0, length) + " ...";
  }
  return result.replace(/\n/g, " ");
}
