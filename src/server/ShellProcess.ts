import { spawnShell, ChildShellStream } from "@/server/childShell";

import {
  ShellSpecification,
  ShellSpecificationSchema,
} from "@/datatypes/ShellSpecification";
import { isCommandClosed } from "@/datatypes/ShellUtils/CommandClose";
import { z } from "zod";
import * as iconv from "iconv-lite";
import {
  Command,
  CommandIDSchema,
  CommandSchema,
  emptyCommand,
  getOutputPartOfStdout,
} from "@/datatypes/Command";

import { EventEmitter, on } from "events";

import { server } from "@/server/tRPCServer";
import { PowerShellSpecification } from "@/builtin/shell/Powershell";
import { ShellConfig, ShellConfigSchema } from "@/datatypes/Config";
import { BashSpecification } from "@/builtin/shell/Bash";
import { CmdSpecification } from "@/builtin/shell/Cmd";
import { AnsiUp } from "@/datatypes/ansiUpCustom";
import { observable } from "@trpc/server/observable";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";

const ProcessSpecs = new Map<string, ShellSpecification>();
ProcessSpecs.set(PowerShellSpecification.name, PowerShellSpecification);
ProcessSpecs.set(BashSpecification.name, BashSpecification);
ProcessSpecs.set(CmdSpecification.name, CmdSpecification);

type Process = {
  id: ProcessID;
  handle: ChildShellStream;
  shellSpec: ShellSpecification;
  config: ShellConfig;
  currentCommand: Command;
  currentDirectory: string;
  user: string;
  clock: number;
  event: EventEmitter;
};
const processHolder: Process[] = [];
const commandsOfProcessID: Command[][] = [];
function clockIncrement(process: Process) {
  process.clock += 1;
  process.currentCommand.clock = process.clock;
  return process.clock;
}

const ProcessIDScheme = z
  .number()
  .int()
  .min(0)
  .refine((value) => {
    return value < processHolder.length;
  });
type ProcessID = z.infer<typeof ProcessIDScheme>;

export const StdoutEventSchema = z.object({
  cid: CommandIDSchema,
  stdout: z.string(),
  clock: z.number().int(),
});
export type StdoutEvent = z.infer<typeof StdoutEventSchema>;

function addStdout(config: ShellConfig, current: Command, response: string) {
  current.stdout = current.stdout.concat(response);
}

function receiveCommandResponse(
  process: Process,
  onEnd?: (command: Command) => void
) {
  const current = process.currentCommand;
  // stdout handling.
  process.handle.onStdout((data: Buffer) => {
    // console.log(
    //   `Received data in command ${current.command} in process ${process.id} data: ${data} len: ${data.length}`
    // );
    if (current.isFinished) {
      console.log(`Received in Finished command`);
      return true;
    }
    const response = decodeFromShellEncoding(process, data);
    console.log(`onStdout: ${response}`);
    console.log(`onStdout: end.`);
    // Stdout handling. Emit the event, add to the command, and increment the clock.
    process.event.emit("stdout", {
      stdout: response,
      commandId: current.cid,
      clock: process.clock,
    });
    addStdout(process.config, current, response);
    clockIncrement(process);
    // Check if the command is finished.
    const detected = process.shellSpec.detectResponseAndExitCode({
      interact: process.config.interact,
      stdout: current.stdout,
      boundaryDetector: current.boundaryDetector,
    });
    const commandFinished = detected !== undefined;
    if (!commandFinished) {
      return false;
    }
    // Finish the command.
    const exitStatus = detected.exitStatus;
    current.isFinished = true;
    current.exitStatus = exitStatus;
    current.exitStatusIsOK = process.shellSpec.isExitCodeOK(exitStatus);
    console.log(
      `Finished ${current.command} by status ${current.exitStatus} in process ${process.id}`
    );
    current.stdoutResponse = detected.response;
    console.log(`stdoutResponsePart: ${current.stdoutResponse}`);
    process.event.emit("finish", current);
    if (onEnd !== undefined) {
      console.log(`Call onEnd in process ${process.id}`);
      onEnd(current);
    }
    return true;
  });
  // stderr handling.
  process.handle.onStderr((data: Buffer) => {
    if (current.isFinished) {
      return;
    }
    const response = decodeFromShellEncoding(process, data);
    //console.log(`stderr: ${response}`);
    current.stderr = current.stderr.concat(response);
    process.event.emit("stderr", response);
    clockIncrement(process);
  });
}

const ansiUp = new AnsiUp();
function escapeTrim(command: string): string {
  return ansiUp.ansi_to_text(command).trim();
}

function executeCommandAndReceiveResponse(
  process: Process,
  exactCommand: { newCommand: string; boundaryDetector: string },
  onEnd?: (command: Command) => void
) {
  // TODO: prompt detection have to set the prompt before the command.
  receiveCommandResponse(process, onEnd);
  // Execute the command.
  process.handle.execute(exactCommand.newCommand);
}

// Re-set the current directory after the command.
function currentSetter(process: Process) {
  return () => {
    if (process.shellSpec.directoryCommands !== undefined) {
      const currentDir = process.shellSpec.directoryCommands.getCurrent();
      const getUser = process.shellSpec.directoryCommands.getUser();
      executeCommand(process, currentDir, true, undefined, (command) => {
        process.currentDirectory = escapeTrim(command.stdoutResponse);
        executeCommand(process, getUser, true, undefined, (command) => {
          console.log(`User: ${command.stdoutResponse}`);
          process.user = escapeTrim(command.stdoutResponse);
        });
      });
    }
  };
}

function startProcess(config: ShellConfig): ProcessID {
  const { name, executable, args, kind, encoding } = config;
  const shellSpec = ProcessSpecs.get(kind);
  if (shellSpec === undefined) {
    // TODO: Error handling.
    throw new Error(`Shell kind ${kind} for ${name} is not supported.`);
  }
  if (processHolder.length > 100) {
    throw new Error("Too many processes. This is for debugging.");
  }
  const proc = spawnShell(config.interact, executable, args);
  const pid = processHolder.length;
  console.log(`Start process call ${pid} with ${config.executable}`);
  const process = {
    id: pid,
    handle: proc,
    config: config,
    shellSpec: shellSpec,
    currentCommand: emptyCommand(pid, -1),
    currentDirectory: "",
    user: "",
    clock: 0,
    event: new EventEmitter(),
  };
  processHolder.push(process);
  commandsOfProcessID.push([]);
  console.log(`Started process ${pid} with ${config.executable}`);
  // First execute move to home command and wait for wake up.
  const exactCommand = process.shellSpec.extendCommandWithBoundaryDetector("");
  console.log(`First command ${exactCommand.newCommand}`);
  process.currentCommand = emptyCommand(
    pid,
    commandsOfProcessID[process.id].length
  );
  const current = process.currentCommand;
  current.command = `"${config.executable}" ${config.args?.join(" ")}`;
  current.exactCommand = exactCommand.newCommand;
  current.boundaryDetector = exactCommand.boundaryDetector;
  // Memorize as a command.
  commandsOfProcessID[pid].push(current);
  executeCommandAndReceiveResponse(
    process,
    exactCommand,
    currentSetter(process)
  );
  console.log(
    `Started process ${pid} with command ${exactCommand.newCommand} detector ${exactCommand.boundaryDetector}`
  );
  return pid;
}

function decodeFromShellEncoding(process: Process, data: Buffer): string {
  if (process.config.encoding === undefined) {
    return data.toString();
  }
  return iconv.decode(data, process.config.encoding);
}

function encodeToShellEncoding(process: Process, command: string): Buffer {
  if (process.config.encoding === undefined) {
    return Buffer.from(command);
  }
  return iconv.encode(command, process.config.encoding);
}

function executeCommand(
  process: Process,
  command: string,
  isSilent: boolean,
  styledCommand?: string,
  onEnd?: (command: Command) => void
): Command {
  // The command including the end detector.
  const encoded = encodeToShellEncoding(process, command);
  const exactCommand = process.shellSpec.extendCommandWithBoundaryDetector(
    encoded.toString()
  );
  console.log(
    `Execute command ${command} (exact: ${exactCommand.newCommand}) in process ${process.id}`
  );
  // Set new current command.
  process.currentCommand = emptyCommand(
    process.id,
    isSilent ? -1 : commandsOfProcessID[process.id].length
  );
  const current = process.currentCommand;
  current.command = command;
  current.exactCommand = exactCommand.newCommand;
  current.currentDirectory = process.currentDirectory;
  current.user = process.user;
  current.boundaryDetector = exactCommand.boundaryDetector;
  current.styledCommand = styledCommand;
  if (!isSilent) {
    commandsOfProcessID[process.id].push(process.currentCommand);
  }
  executeCommandAndReceiveResponse(process, exactCommand, onEnd);
  console.log(`Executed command ${command} in process ${process.id}`);
  return process.currentCommand;
}

function sendKey(process: Process, key: string) {
  // TODO: handle the key code to appropriate code?
  console.log(`Send key ${key} to process ${process.id}`);
  clockIncrement(process);
  process.handle.write(key);
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
    .input(ShellConfigSchema)
    .output(ProcessIDScheme)
    .mutation(async (opts) => {
      try {
        return startProcess(opts.input);
      } catch (e) {
        console.error(e);
        throw e;
      }
    }),

  // Execute a new command in the shell process.
  execute: proc
    .input(
      z
        .object({
          pid: ProcessIDScheme,
          command: z.string(),
          isSilent: z.boolean().optional(),
          styledCommand: z.string().optional(),
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
      const { pid, command, isSilent, styledCommand } = opts.input;
      const process = processHolder[pid];
      return executeCommand(
        process,
        command,
        isSilent ? true : false,
        styledCommand,
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

  // Subscription api for process. Intended to be used from terminal.
  // using trpc V10 API.  https://trpc.io/docs/v10/subscriptions
  onStdout: proc.input(ProcessIDScheme).subscription(async (opts) => {
    console.log(`onStdout subscription call: ${opts.input}`);
    const pid = opts.input;
    const process = processHolder[pid];
    return observable<StdoutEvent>((emit) => {
      const onData = (data: StdoutEvent) => {
        emit.next(data);
      };
      process.event.on("stdout", onData);
      return () => {
        process.event.off("stdout", onData);
      };
    });
  }),
  onStderr: proc
    .input(ProcessIDScheme)
    .output(z.string())
    .subscription(async (opts) => {
      const pid = opts.input;
      const process = processHolder[pid];
      return new Promise((resolve) => {
        process.event.on("stderr", (e: string) => {
          resolve(e);
        });
      });
    }),
  onCommandFinish: proc
    .input(ProcessIDScheme)
    .output(CommandSchema)
    .subscription(async (opts) => {
      const pid = opts.input;
      const process = processHolder[pid];
      return new Promise((resolve) => {
        process.event.on("finish", (command: Command) => {
          resolve(command);
        });
      });
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
  current: proc
    .input(ProcessIDScheme)
    .output(z.object({ directory: z.string(), user: z.string() }))
    .query(async (pid) => {
      return {
        directory: processHolder[pid.input].currentDirectory,
        user: processHolder[pid.input].user,
      };
    }),
  commands: proc
    .input(ProcessIDScheme)
    .output(z.array(CommandSchema))
    .query(async (pid) => {
      return commandsOfProcessID[pid.input];
    }),
  numCommands: proc
    .input(ProcessIDScheme)
    .output(z.number().int())
    .query(async (pid) => {
      for (let i = 0; i < commandsOfProcessID[pid.input].length; i++) {
        console.log(`Command ${i}: ${commandsOfProcessID[pid.input][i].command}`);
      }
      return commandsOfProcessID[pid.input].length;
    }),
  command: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        cid: z.number().int(),
      })
    )
    .output(CommandSchema)
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return commandsOfProcessID[pid][cid];
    }),
  isFinished: proc
    .input(
      z.object({
        pid: ProcessIDScheme.refine((value) => {
          return value < processHolder.length;
        }),
        cid: CommandIDSchema.refine((value) => {
          return value < commandsOfProcessID[value.pid].length;
        }),
      })
    )
    .output(z.boolean())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      try {
        return commandsOfProcessID[pid][cid].isFinished;
      } catch (e) {
        console.log(`isFinished error: ${pid} ${cid}`);
        throw e;
      }
    }),
  name: proc
    .input(ProcessIDScheme)
    .output(z.string())
    .query(async (pid) => {
      return processHolder[pid.input].config.name;
    }),
  config: proc
    .input(ProcessIDScheme)
    .output(ShellConfigSchema)
    .query(async (pid) => {
      return processHolder[pid.input].config;
    }),
  interactMode: proc
    .input(ProcessIDScheme)
    .output(ShellInteractKindSchema)
    .query(async (pid) => {
      return processHolder[pid.input].config.interact;
    }),
  resize: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        rows: z.number().int(),
        cols: z.number().int(),
      })
    )
    .mutation(async (opts) => {
      const { pid, rows, cols } = opts.input;
      processHolder[pid].handle.resize(rows, cols);
    }),
});
