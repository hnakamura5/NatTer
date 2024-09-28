import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  ShellSpecification,
  ShellSpecificationSchema,
  isCommandClosed,
} from "@/datatypes/ShellSpecification";
import { z } from "zod";
import * as iconv from "iconv-lite";

import { server } from "@/server/tRPCServer";

export const CommandSchema = z.object({
  command: z.string(),
  exactCommand: z.string(),
  currentDirectory: z.string(),
  startTime: z.string(),

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
    startTime: "",
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
  console.log(`Started process ${pid} with ${shellSpec.path}`);
  return pid;
}

function getStringFromResponseData(process: Process, data: Buffer): string {
  return iconv.decode(data, process.shellSpec.encoding);
}

function executeCommand(process: Process, command: string) {
  // The command including the end detector.
  const encoded = iconv.encode(command, process.shellSpec.encoding);
  const exactCommand = process.shellSpec.extendCommandWithEndDetector(
    encoded.toString()
  );
  // Set new current command.
  process.currentCommand = {
    command: command,
    exactCommand: exactCommand.newCommand,
    currentDirectory: process.currentDirectory,
    startTime: new Date().toISOString(),
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
  process.handle.stdout.on("data", (data: Buffer) => {
    const response = getStringFromResponseData(process, data);
    console.log(`stdout: ${response}`);
    process.currentCommand.stdout.concat(response);
    process.currentCommand.timeline.push({
      response: response,
      isError: false,
    });
    // Check if the command is finished.
    if (
      process.shellSpec.detectEndOfCommandAndExitCode({
        commandResponse: process.currentCommand.stdout,
        endDetector: process.currentCommand.endDetector,
      })
    ) {
      // End of command.
    }
  });
  // stderr handling.
  process.handle.stderr.on("data", (data: Buffer) => {
    const response = getStringFromResponseData(process, data);
    console.log(`stderr: ${response}`);
    process.currentCommand.stderr.concat(response);
    process.currentCommand.timeline.push({
      response: response,
      isError: true,
    });
  });
  console.log(`Executed command ${command} in process ${process.id}`);
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
          pid: ProcessIDScheme,
          command: z.string(),
        })
        .refine((value) => {
          return isCommandClosed(
            processHolder[value.pid].shellSpec,
            value.command
          );
        })
    )
    .output(CommandSchema)
    .mutation(async (opts) => {
      const { pid, command } = opts.input;
      return executeCommand(processHolder[pid], command);
    }),

  // Send a key to current command of the shell process.
  sendKey: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        key: z.string(),
      })
    )
    .output(z.void())
    .mutation(async (opts) => {
      const { pid, key } = opts.input;
      sendKey(processHolder[pid], key);
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
    .input(ProcessIDScheme)
    .output(z.string())
    .query(async (pid) => {
      return processHolder[pid.input].currentCommand.stderr;
    }),
  pollTimeline: proc
    .input(ProcessIDScheme)
    .output(
      z.object({
        timeline: z.array(
          z.object({ response: z.string(), isError: z.boolean() })
        ),
        timelineCount: z.number().int(),
        isFinished: z.boolean(),
      })
    )
    .query(async (pid) => {
      return {
        timeline: processHolder[pid.input].currentCommand.timeline,
        timelineCount: processHolder[pid.input].currentCommand.timeline.length,
        isFinished: processHolder[pid.input].currentCommand.isFinished,
      };
    }),

  // Stop the shell process.
  stop: proc
    .input(ProcessIDScheme)
    .output(z.void())
    .mutation(async (pid) => {
      stopProcess(processHolder[pid.input]);
    }),

  // Process state queries.
  spec: proc
    .input(ProcessIDScheme)
    .output(ShellSpecificationSchema)
    .query(async (pid) => {
      return processHolder[pid.input].shellSpec;
    }),
  currentDir: proc
    .input(ProcessIDScheme)
    .output(z.string())
    .query(async (pid) => {
      return processHolder[pid.input].currentDirectory;
    }),
  commands: proc
    .input(ProcessIDScheme)
    .output(z.array(CommandSchema).optional())
    .query(async (pid) => {
      return commandsOfProcessID[pid.input];
    }),
});
