import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  ShellSpecification,
  ShellSpecificationSchema,
  isCommandClosed,
} from "@/datatypes/ShellSpecification";
import { z } from "zod";
import * as iconv from "iconv-lite";
import { PathKind } from "@/datatypes/PathAbstraction";
import {
  Command,
  CommandSchema,
  emptyCommand,
  getOutputPartOfStdout,
} from "@/datatypes/Command";
import path from "node:path";

import { server } from "@/server/tRPCServer";
import { PowerShellSpecification } from "@/builtin/shell/Powershell";

function pathOf(kind: PathKind): path.PlatformPath {
  if (kind === "win32") {
    return path.win32;
  }
  return path.posix;
}

const ProcessSpecs = new Map<string, ShellSpecification>();
ProcessSpecs.set("powershell", PowerShellSpecification);

type Process = {
  id: ProcessID;
  handle: ChildProcessWithoutNullStreams;
  shellSpec: ShellSpecification;
  shellArgs: string[];
  currentCommand: Command;
  currentDirectory: string;
  clock: number;
};
const processHolder: Process[] = [];
const commandsOfProcessID: Command[][] = [];
function clockIncrement(process: Process) {
  process.clock += 1;
  process.currentCommand.clock = process.clock;
  return process.clock;
}

export const ProcessIDScheme = z
  .number()
  .int()
  .min(0)
  .refine((value) => {
    return value < processHolder.length;
  });
export type ProcessID = z.infer<typeof ProcessIDScheme>;

function receiveCommandResponse(
  process: Process,
  onEnd?: (command: Command) => void
) {
  const current = process.currentCommand;
  // stdout handling.
  process.handle.stdout.removeAllListeners("data");
  process.handle.stdout.on("data", (data: Buffer) => {
    if (current.isFinished) {
      return;
    }
    const response = getStringFromResponseData(process, data);
    console.log(`stdout: ${response}`);
    current.stdout = current.stdout + response;
    current.timeline.push({
      response: response,
      isError: false,
    });
    clockIncrement(process);
    // Check if the command is finished.
    const exitStatus = process.shellSpec.detectEndOfCommandAndExitCode({
      stdout: current.stdout,
      endDetector: current.endDetector,
    });
    if (exitStatus !== undefined) {
      // End of command.
      current.isFinished = true;
      current.exitStatus = exitStatus;
      current.exitStatusIsOK = process.shellSpec.isExitCodeOK(exitStatus);
      console.log(
        `Finished ${current.command} by status ${current.exitStatus} in process ${process.id}`
      );
      current.stdoutResponse = getOutputPartOfStdout(current);
      console.log(`stdoutResponse: ${current.stdoutResponse}`);
      if (onEnd !== undefined) {
        console.log(`Call onEnd in process ${process.id}`);
        onEnd(current);
      }
    }
  });
  // stderr handling.
  process.handle.stderr.on("data", (data: Buffer) => {
    if (current.isFinished) {
      return;
    }
    const response = getStringFromResponseData(process, data);
    //console.log(`stderr: ${response}`);
    current.stderr = current.stderr.concat(response);
    current.timeline.push({
      response: response,
      isError: true,
    });
    clockIncrement(process);
  });
}

function currentSetter(process: Process) {
  return () => {
    if (process.shellSpec.directoryCommands !== undefined) {
      const currentDir = process.shellSpec.directoryCommands.getCurrent();
      executeCommand(process, currentDir, true, (command) => {
        process.currentDirectory = command.stdoutResponse;
      });
    }
  };
}

function startProcess(shell: string, args: string[]): ProcessID {
  const shellSpec = ProcessSpecs.get(shell);
  if (shellSpec === undefined) {
    // TODO: Error handling.
    throw new Error(`Shell ${shell} is not supported.`);
  }
  if (processHolder.length > 10) {
    throw new Error("Too many processes. This is for debugging.");
  }
  const proc = spawn(shellSpec.path, args);
  const pid = processHolder.length;
  console.log(`Start process call ${pid} with ${shellSpec.path}`);
  const process = {
    id: pid,
    handle: proc,
    shellSpec: shellSpec,
    shellArgs: args,
    currentCommand: emptyCommand(pid),
    currentDirectory: "",
    clock: 0,
  };
  processHolder.push(process);
  commandsOfProcessID.push([]);
  console.log(`Started process ${pid} with ${shellSpec.path}`);
  // First execute move to home command and wait for wake up.
  const exactCommand = process.shellSpec.extendCommandWithEndDetector("");
  process.currentCommand = emptyCommand(pid);
  const current = process.currentCommand;
  current.command = shellSpec.path + args.join(" ");
  current.exactCommand = exactCommand.newCommand;
  current.endDetector = exactCommand.endDetector;
  // Memorize as a command.
  commandsOfProcessID[pid].push(current);
  receiveCommandResponse(process, currentSetter(process));
  process.handle.stdin.write(exactCommand.newCommand + "\n");
  console.log(`Started process ${pid} with command ${exactCommand.newCommand}`);
  return pid;
}

function getStringFromResponseData(process: Process, data: Buffer): string {
  return iconv.decode(data, process.shellSpec.encoding);
}

function executeCommand(
  process: Process,
  command: string,
  isSilent: boolean,
  onEnd?: (command: Command) => void
): Command {
  // The command including the end detector.
  const encoded = iconv.encode(command, process.shellSpec.encoding);
  const exactCommand = process.shellSpec.extendCommandWithEndDetector(
    encoded.toString()
  );
  console.log(
    `Execute command ${command} (exact: ${exactCommand.newCommand}) in process ${process.id}`
  );
  // Set new current command.
  process.currentCommand = emptyCommand(process.id);
  const current = process.currentCommand;
  current.command = command;
  current.exactCommand = exactCommand.newCommand;
  current.currentDirectory = process.currentDirectory;
  current.endDetector = exactCommand.endDetector;
  if (!isSilent) {
    commandsOfProcessID[process.id].push(process.currentCommand);
  }
  clockIncrement(process);
  receiveCommandResponse(process, onEnd);
  // Execute the command.
  process.handle.stdin.write(exactCommand.newCommand + "\n");
  console.log(`Executed command ${command} in process ${process.id}`);
  return process.currentCommand;
}

function sendKey(process: Process, key: string) {
  // TODO: handle the key code to appropriate code?
  console.log(`Send key ${key} to process ${process.id}`);
  clockIncrement(process);
  process.handle.stdin.write(key);
}

function stopProcess(process: Process) {
  console.log(`Stop process call ${process.id}`);
  clockIncrement(process);
  process.handle.kill();
}

const proc = server.procedure;
export const shellRouter = server.router({
  // Start a new process of shell.
  start: proc
    .input(
      z.object({
        shell: z.string().refine((value) => {
          return ProcessSpecs.has(value);
        }),
        args: z.array(z.string()),
      })
    )
    .output(ProcessIDScheme)
    .mutation(async (opts) => {
      const { shell, args } = opts.input;
      return startProcess(shell, args);
    }),

  // Execute a new command in the shell process.
  execute: proc
    .input(
      z
        .object({
          pid: ProcessIDScheme,
          command: z.string(),
          isSilent: z.boolean().optional(),
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
      const { pid, command, isSilent } = opts.input;
      const process = processHolder[pid];
      return executeCommand(
        process,
        command,
        isSilent ? true : false,
        currentSetter(process)
      );
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
    .output(z.array(CommandSchema))
    .query(async (pid) => {
      return commandsOfProcessID[pid.input].concat();
    }),
});
