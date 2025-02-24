import {
  ShellOptions,
  IShell,
  ITerminalPTy,
} from "@/server/ChildProcess/interface";
import {
  ShellSpecification,
  ShellSpecificationSchema,
  getCurrentCommand,
  getUserCommand,
} from "@/datatypes/ShellSpecification";
import { ShellConfig, ShellConfigSchema } from "@/datatypes/Config";
import { isCommandClosed } from "@/server/ShellUtils/CommandClose";
import { z } from "zod";
import {
  Command,
  CommandID,
  CommandIDSchema,
  CommandSchema,
  emptyCommand,
  ProcessID,
  ProcessIDSchema as ProcessIDSchemaRaw,
} from "@/datatypes/Command";

import { server } from "@/server/tRPCServer";
import { observable } from "@trpc/server/observable";
import {
  ShellInteractKind,
  ShellInteractKindSchema,
} from "@/datatypes/ShellInteract";
import { Process, newProcess, clockIncrement } from "@/server/types/Process";
import { executeCommandByEcho } from "@/server/ShellUtils/ExecuteByEcho";
import { executeCommandByPrompt } from "./ShellUtils/ExecuteByPrompt";
import { isCommandEchoBackToStdout } from "./ShellUtils/BoundaryDetectorUtils";
import { getStdoutOutputPartInPlain } from "@/server/ShellUtils/ExecuteUtils";

import { log } from "@/datatypes/Logger";
import { readShellSpecs } from "./configServer";
import { ChildShell } from "./ChildProcess/childShell";
import { ChildPty } from "./ChildProcess/childPty";

const ProcessSpecs = new Map<string, ShellSpecification>();

export function setupShellProcess() {
  log.debug(`ShellProcess setup.`);
  return readShellSpecs().then((specs) => {
    specs.forEach((spec) => {
      log.debug(`Read shell spec: `, spec);
      ProcessSpecs.set(spec.name, spec);
    });
  });
}

export function shutdownShellProcess() {
  log.debug(`ShellProcess shutdown.`);
  processHolder.forEach((process) => {
    log.debug(`Shutdown process ${process.id}`);
    process.shell.kill();
  });
  log.debug(`Shutdown all processes.`);
}

const processHolder: Process[] = [];
function getProcess(pid: ProcessID): Process {
  return processHolder[pid - 1];
}
function addProcess(process: Process) {
  processHolder.push(process);
}
function getNextProcessID(): ProcessID {
  return processHolder.length + 1;
}

const commandsOfProcessID: Command[][] = [];
function emplaceCommandList(pid: ProcessID) {
  const currentLength = commandsOfProcessID.length;
  for (let i = currentLength; i < pid; i++) {
    commandsOfProcessID.push([]);
  }
}
function getCommand(pid: ProcessID, cid: CommandID): Command {
  emplaceCommandList(pid);
  return commandsOfProcessID[pid - 1][cid];
}
function getNumCommands(pid: ProcessID): number {
  emplaceCommandList(pid);
  return commandsOfProcessID[pid - 1].length;
}
function addCommand(pid: ProcessID, command: Command) {
  emplaceCommandList(pid);
  commandsOfProcessID[pid - 1].push(command);
}
function getCommands(pid: ProcessID): Command[] {
  emplaceCommandList(pid);
  return commandsOfProcessID[pid - 1];
}

const ProcessIDScheme = ProcessIDSchemaRaw.refine((value) => {
  return value < getNextProcessID();
});

export const StdoutEventSchema = z.object({
  cid: CommandIDSchema,
  stdout: z.string(),
  stdoutIsFinished: z.boolean(),
  clock: z.number().int(),
});
export type StdoutEvent = z.infer<typeof StdoutEventSchema>;

export const StderrEventSchema = z.object({
  cid: CommandIDSchema,
  stderr: z.string(),
  stderrIsFinished: z.boolean(),
  clock: z.number().int(),
});
export type StderrEvent = z.infer<typeof StderrEventSchema>;

// Re-set the current directory after the command.
function currentSetter(process: Process) {
  const includesCommandItSelf = isCommandEchoBackToStdout(
    process.shellSpec,
    process.config.interact
  );
  return () => {
    const currentDir = getCurrentCommand(process.shellSpec);
    const getUser = getUserCommand(process.shellSpec);
    // Set current directory.
    if (currentDir === undefined || getUser === undefined) {
      return;
    }
    executeCommand(process, currentDir, true, undefined, (command) => {
      log.debug(`currentDirectory: ${command.stdoutResponse}`);
      getStdoutOutputPartInPlain(command, includesCommandItSelf).then((dir) => {
        log.debug(`set currentDirectory: ${dir}`);
        process.currentDirectory = dir;
        // Set user.
        executeCommand(process, getUser, true, undefined, (command) => {
          log.debug(`User: ${command.stdoutResponse}`);
          getStdoutOutputPartInPlain(command, includesCommandItSelf).then(
            (user) => {
              log.debug(`set User: ${user}`);
              process.user = user;
            }
          );
        });
      });
    });
  };
}

// Select the appropriate executor.
function selectExecutor(shellSpec: ShellSpecification, config: ShellConfig) {
  if (config.interact === "terminal") {
    if (!shellSpec.promptCommands) {
      log.debug(
        `terminal interact but promptCommands is not defined: ${shellSpec.name}`
      );
      throw new Error("Prompt commands are not defined.");
    }
    return executeCommandByPrompt;
  } else {
    if (shellSpec.promptCommands) {
      return executeCommandByPrompt;
    } else if (shellSpec.echoCommands) {
      return executeCommandByEcho;
    }
    // TODO: Any way in this case? Use default prompt?
    throw new Error("No Executor available.");
  }
}

function spawnChildShell(
  kind: ShellInteractKind,
  executable: string,
  args: string[],
  options?: ShellOptions
): IShell {
  if (kind === "terminal") {
    return new ChildPty(executable, args, options);
  } else {
    return new ChildShell(executable, args, options);
  }
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
  const shell = spawnChildShell(
    config.interact,
    `"${executable}"`,
    args || [],
    {
      encoding: encoding,
    }
  );
  const pid = getNextProcessID();
  log.debug(`Start process call ${pid} with ${config.executable}`);
  const process = newProcess(
    pid,
    shell,
    config.interact == "terminal" ? (shell as ITerminalPTy) : undefined,
    config,
    shellSpec,
    emptyCommand(pid, -1),
    selectExecutor(shellSpec, config)
  );
  addProcess(process);
  log.debug(`Started process ${pid} with ${config.executable}`);
  // First execute move to home command and wait for wake up.
  process.executor(
    process,
    ``,
    getNumCommands(pid),
    undefined,
    false,
    (command) => {
      log.debug(`First command ${command.exactCommand}`);
      // Memorize the shell execution command.
      command.command = `"${config.executable}" ${config.args?.join(" ")}`;
      addCommand(pid, command);
      currentSetter(process)();
    }
  );
  log.debug(
    `Started process ${pid} with command "${process.currentCommand.exactCommand}" detector ${process.currentCommand.boundaryDetector}`
  );
  return pid;
}

function executeCommand(
  process: Process,
  command: string,
  isSilent: boolean,
  styledCommand?: string,
  onEnd?: (command: Command) => void
): Command {
  const cid = isSilent ? -1 : getNumCommands(process.id);
  const shellSpec = process.shellSpec;
  const currentCommand = process.executor(
    process,
    command,
    cid,
    styledCommand,
    isSilent,
    onEnd
  );
  if (!isSilent) {
    addCommand(process.id, currentCommand);
  }
  return currentCommand;
}

function sendKey(process: Process, key: string) {
  // TODO: handle the key code to appropriate code?
  if (process.currentCommand.stdoutIsFinished) {
    log.debug(`Send key ${key} to process ${process.id} finished command.`);
    return;
  }
  log.debug(`Send key ${key} to process ${process.id}`);
  clockIncrement(process);
  process.shell.write(key);
}

function stopProcess(process: Process) {
  log.debug(`Stop process call ${process.id}`);
  clockIncrement(process);
  process.shell.kill();
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
          return true;
        })
    )
    .output(CommandSchema)
    .mutation(async (opts) => {
      const { pid, command, isSilent, styledCommand } = opts.input;
      log.debug(`execute APIが呼ばれた ${pid} ${command}`);
      const process = getProcess(pid);
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
      sendKey(getProcess(pid), key);
    }),

  // Subscription api for process. Intended to be used from terminal.
  // using trpc V10 API.  https://trpc.io/docs/v10/subscriptions
  onStdout: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        cid: CommandIDSchema,
      })
    )
    .subscription(async (opts) => {
      log.debug(`onStdout subscription call: ${opts.input}`);
      const { pid, cid } = opts.input;
      const process = getProcess(pid);
      let firstEmit = true;
      return observable<StdoutEvent>((emit) => {
        const onData = (data: StdoutEvent) => {
          if (data.cid === cid) {
            if (firstEmit) {
              // Emit the all existing stdout.
              log.debug(
                `onStdout first emit: event:${data.stdout} all:${process.currentCommand.stdoutResponse}`
              );
              data.stdout = process.currentCommand.stdoutResponse;
            } else {
              log.debug(`onStdout emit: event:${data.stdout}`);
            }
            firstEmit = false;
            emit.next(data);
          }
        };
        process.event.on("stdout", onData);
        return () => {
          process.event.off("stdout", onData);
        };
      });
    }),
  onStderr: proc.input(ProcessIDScheme).subscription(async (opts) => {
    const pid = opts.input;
    const process = getProcess(pid);
    let firstEmit = true;
    return observable<StderrEvent>((emit) => {
      const onData = (data: StderrEvent) => {
        if (firstEmit) {
          // Emit the all existing stderr.
          log.debug(
            `onStderr first emit: event:${data.stderr} all:${process.currentCommand.stderr}`
          );
          data.stderr = process.currentCommand.stderr;
        } else {
          log.debug(`onStderr emit: event:${data.stderr}`);
        }
        firstEmit = false;
        emit.next(data);
      };
      process.event.on("stderr", onData);
      return () => {
        process.event.off("stderr", onData);
      };
    });
  }),
  onCommandFinish: proc
    .input(ProcessIDScheme)
    .output(CommandSchema)
    .subscription(async (opts) => {
      const pid = opts.input;
      const process = getProcess(pid);
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
      stopProcess(getProcess(pid.input));
    }),

  // Process state queries.
  spec: proc
    .input(ProcessIDScheme)
    .output(ShellSpecificationSchema)
    .query(async (pid) => {
      return getProcess(pid.input).shellSpec;
    }),
  current: proc
    .input(ProcessIDScheme)
    .output(z.object({ directory: z.string(), user: z.string() }))
    .query(async (pid) => {
      return {
        directory: getProcess(pid.input).currentDirectory,
        user: getProcess(pid.input).user,
      };
    }),
  commands: proc
    .input(ProcessIDScheme)
    .output(z.array(CommandSchema))
    .query(async (pid) => {
      return getCommands(pid.input);
    }),
  numCommands: proc
    .input(ProcessIDScheme)
    .output(z.number().int())
    .query(async (pid) => {
      return getNumCommands(pid.input);
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
      return getCommand(pid, cid);
    }),
  stdoutIsFinished: proc
    .input(
      z.object({
        pid: ProcessIDScheme.refine((value) => {
          //log.debug(`isFinished call pid refine ${value}`);
          return value < getNextProcessID();
        }),
        cid: CommandIDSchema,
      })
    )
    .output(z.boolean())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid).stdoutIsFinished;
    }),
  stderrIsFinished: proc
    .input(
      z.object({
        pid: ProcessIDScheme.refine((value) => {
          return value < getNextProcessID();
        }),
        cid: CommandIDSchema,
      })
    )
    .output(z.boolean())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid).stderrIsFinished;
    }),
  outputCompleted: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        cid: CommandIDSchema,
      })
    )
    .output(z.boolean())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid).outputCompleted ?? false;
    }),
  stdoutResponse: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        cid: CommandIDSchema,
      })
    )
    .output(z.string())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid).stdoutResponse;
    }),
  name: proc
    .input(ProcessIDScheme)
    .output(z.string())
    .query(async (pid) => {
      return getProcess(pid.input).config.name;
    }),
  config: proc
    .input(ProcessIDScheme)
    .output(ShellConfigSchema)
    .query(async (pid) => {
      return getProcess(pid.input).config;
    }),
  interactMode: proc
    .input(ProcessIDScheme)
    .output(ShellInteractKindSchema)
    .query(async (pid) => {
      return getProcess(pid.input).config.interact;
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
      getProcess(pid).pty?.resize(rows, cols);
    }),
  shellConfig: proc
    .input(ProcessIDScheme)
    .output(ShellConfigSchema)
    .query(async (pid) => {
      return getProcess(pid.input).config;
    }),
});
