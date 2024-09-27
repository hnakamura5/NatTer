import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  ShellSpecification,
  ShellSpecificationSchema,
  isCommandClosed,
} from "@/datatypes/ShellSpecification";
import { z } from "zod";

import { server } from "@/server/tRPCServer";

export const CommandSchema = z.object({
  command: z.string(),
  exactCommand: z.string(),
  currentDirectory: z.string(),
  startTime: z.date(),

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

function emptyCommand(): Command {
  return {
    command: "",
    exactCommand: "",
    currentDirectory: "",
    startTime: new Date(),
    isFinished: true,
    stdout: "",
    stderr: "",
    timeline: [],
    endDetector: "",
  };
}

type Process = {
  id: ProcessID;
  handle: ChildProcessWithoutNullStreams;
  shellSpec: ShellSpecification;
  shellArgs: string[];
  currentCommand: Command;
  currentDirectory: string;
};
const processHolder: Process[] = [];
const commandsOfProcessID: Command[][] = [];

export const ProcessIDScheme = z
  .number()
  .int()
  .min(0)
  .refine((value) => {
    return value < processHolder.length;
  });
export type ProcessID = z.infer<typeof ProcessIDScheme>;

function startProcess(
  shellSpec: ShellSpecification,
  args: string[]
): ProcessID {
  const process = spawn(shellSpec.path, args);
  const pid = processHolder.length;
  processHolder.push({
    id: pid,
    handle: process,
    shellSpec: shellSpec,
    shellArgs: args,
    currentCommand: emptyCommand(),
    currentDirectory: shellSpec.homeDirectory,
  });
  commandsOfProcessID.push([]);
  return pid;
}

function getStringFromResponseData(data: string): string {
  // TODO: encoding?
  return data;
}

function executeCommand(process: Process, command: string) {
  // The command including the end detector.
  const exactCommand = process.shellSpec.extendCommandWithEndDetector(command);
  // Set new current command.
  process.currentCommand = {
    command: command,
    exactCommand: exactCommand.newCommand,
    currentDirectory: process.currentDirectory,
    startTime: new Date(),
    isFinished: false,
    stdout: "",
    stderr: "",
    timeline: [],
    endDetector: exactCommand.endDetector,
  };
  commandsOfProcessID[process.id].push(process.currentCommand);
  // Execute the command.
  process.handle.stdin.write(exactCommand + "\n");
  // stdout handling.
  process.handle.stdout.on("data", (data) => {
    const response = getStringFromResponseData(data.toString());
    process.currentCommand.stdout.concat(response);
    process.currentCommand.timeline.push({
      response: response,
      isError: false,
    });
    // Check if the command is finished.
    if (
      process.shellSpec.detectEndOfCommandAndExitCodeResponse({
        commandResponse: process.currentCommand.stdout,
        endDetector: process.currentCommand.endDetector,
      })
    ) {
      // End of command.
    }
  });
  // stderr handling.
  process.handle.stderr.on("data", (data) => {
    const response = getStringFromResponseData(data.toString());
    process.currentCommand.stderr.concat(response);
    process.currentCommand.timeline.push({
      response: response,
      isError: true,
    });
  });
  return process.currentCommand;
}

function sendKey(process: Process, key: string) {
  // TODO: handle the key code to appropriate code?
  process.handle.stdin.write(key);
}

function stopProcess(process: Process) {
  process.handle.kill();
}

const proc = server.procedure;
export const shellRouter = server.router({
  // Start a new process of shell.
  start: proc
    .input(
      z.object({
        shellSpec: ShellSpecificationSchema,
        args: z.array(z.string()),
      })
    )
    .output(ProcessIDScheme)
    .mutation(async (opts) => {
      const { shellSpec, args } = opts.input;
      return startProcess(shellSpec, args);
    }),

  // Execute a new command in the shell process.
  execute: proc
    .input(
      z
        .object({
          process: ProcessIDScheme,
          command: z.string(),
        })
        .refine((value) => {
          return isCommandClosed(
            processHolder[value.process].shellSpec,
            value.command
          );
        })
    )
    .output(CommandSchema)
    .mutation(async (opts) => {
      const { process, command } = opts.input;
      return executeCommand(processHolder[process], command);
    }),

  // Send a key to current command of the shell process.
  sendKey: proc
    .input(
      z.object({
        process: ProcessIDScheme,
        key: z.string(),
      })
    )
    .output(z.void())
    .mutation(async (opts) => {
      const { process, key } = opts.input;
      sendKey(processHolder[process], key);
    }),

  // Poll the current command status of the shell process asynchronously.
  pollStdout: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
      })
    )
    .output(
      z.object({
        stdout: z.string(),
        isFinished: z.boolean(),
      })
    )
    .query(async (opts) => {
      const { pid } = opts.input;
      return {
        stdout: processHolder[pid].currentCommand.stdout,
        isFinished: processHolder[pid].currentCommand.isFinished,
      };
    }),
  pollStderr: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
      })
    )
    .output(z.string())
    .query(async (opts) => {
      const { pid } = opts.input;
      return processHolder[pid].currentCommand.stderr;
    }),
  pollTimeline: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
      })
    )
    .output(
      z.object({
        timeline: z.array(
          z.object({ response: z.string(), isError: z.boolean() })
        ),
        timelineCount: z.number().int(),
        isFinished: z.boolean(),
      })
    )
    .query(async (opts) => {
      const { pid } = opts.input;
      return {
        timeline: processHolder[pid].currentCommand.timeline,
        timelineCount: processHolder[pid].currentCommand.timeline.length,
        isFinished: processHolder[pid].currentCommand.isFinished,
      };
    }),

  // Stop the shell process.
  stop: proc
    .input(
      z.object({
        process: ProcessIDScheme,
      })
    )
    .output(z.void())
    .mutation(async (opts) => {
      const { process } = opts.input;
      stopProcess(processHolder[process]);
    }),
});
