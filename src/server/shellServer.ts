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
import { z } from "zod";
import {
  Command,
  CommandID,
  CommandIDSchema,
  CommandSchema,
  emptyCommand,
} from "@/datatypes/Command";
import {
  SessionID,
  ProcessIDSchema,
  SessionIDSchema,
  ProcessID,
} from "@/datatypes/SessionID";

import { server } from "@/server/tRPCServer";
import { observable } from "@trpc/server/observable";
import { ShellInteractKindSchema } from "@/datatypes/Interact";
import {
  Process,
  newProcess,
  clockIncrement,
  newProcessID,
} from "@/server/types/Process";
import { executeCommandByEcho } from "@/server/ShellUtils/ExecuteByEcho";
import { executeCommandByPrompt } from "./ShellUtils/ExecuteByPrompt";
import { isCommandEchoBackToStdout } from "./ShellUtils/BoundaryDetectorUtils";
import { getStdoutOutputPartInPlain } from "@/server/ShellUtils/ExecuteUtils";

import { log } from "@/datatypes/Logger";
import { RemoteHostSchema, remoteHostFromConfig } from "@/datatypes/SshConfig";
import { spawnChildShell } from "./ChildProcess/spawn";
import {
  addCommand,
  addNewProcess,
  getCommand,
  getCommands,
  getNumCommands,
  getProcess,
  getShellSpec,
} from "./processServer";
import { assertSessionExists } from "./sessionServer";
import { readConfig } from "./configServer";

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
function selectExecutor(config: ShellConfig) {
  const shellSpec = getShellSpec(config.language);
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

async function startProcess(configName: string): Promise<ProcessID> {
  const config = (await readConfig()).shells.find(
    (shell) => shell.name === configName
  );
  if (!config || config.interact !== "command") {
    throw new Error(`Shell ${configName} is not defined`);
  }
  const { name, executable, args, language, encoding } = config;
  log.debug(`Start process ${name} config:`, config);
  const shell = spawnChildShell(config, `"${executable}"`, args || [], {
    encoding: encoding,
  });
  const process = addNewProcess(
    shell,
    undefined,
    config,
    selectExecutor(config)
  );
  const pid = process.id;
  log.debug(`Starting process ${pid} with ${config.executable}`);
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
    .input(z.object({ sessionID: SessionIDSchema, name: z.string() }))
    .output(ProcessIDSchema)
    .mutation(async (opts) => {
      const { sessionID, name } = opts.input;
      assertSessionExists(sessionID);
      try {
        return startProcess(name);
      } catch (e) {
        log.error(`proc start error: `, e);
        throw e;
      }
    }),

  // Execute a new command in the shell process.
  execute: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        command: z.string(),
        isSilent: z.boolean().optional(),
        styledCommand: z.string().optional(),
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
        pid: ProcessIDSchema,
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
        pid: ProcessIDSchema,
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
  onStderr: proc.input(ProcessIDSchema).subscription(async (opts) => {
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
    .input(ProcessIDSchema)
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
    .input(ProcessIDSchema)
    .output(z.void())
    .mutation(async (pid) => {
      stopProcess(getProcess(pid.input));
    }),

  // Process state queries.
  spec: proc
    .input(ProcessIDSchema)
    .output(ShellSpecificationSchema)
    .query(async (pid) => {
      return getProcess(pid.input).shellSpec;
    }),
  current: proc
    .input(ProcessIDSchema)
    .output(z.object({ directory: z.string(), user: z.string() }))
    .query(async (pid) => {
      return {
        directory: getProcess(pid.input).currentDirectory,
        user: getProcess(pid.input).user,
      };
    }),
  remoteHost: proc
    .input(ProcessIDSchema)
    .output(RemoteHostSchema.optional())
    .query(async (pid) => {
      return getProcess(pid.input).remoteHost;
    }),
  commands: proc
    .input(ProcessIDSchema)
    .output(z.array(CommandSchema))
    .query(async (pid) => {
      return getCommands(pid.input);
    }),
  numCommands: proc
    .input(ProcessIDSchema)
    .output(z.number().int())
    .query(async (pid) => {
      return getNumCommands(pid.input);
    }),
  command: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        cid: z.number().int(),
      })
    )
    .output(CommandSchema)
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid);
    }),
  commandAsync: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        cid: z.number().int(),
      })
    )
    .output(CommandSchema)
    .mutation(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid);
    }),
  stdoutIsFinished: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
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
        pid: ProcessIDSchema,
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
        pid: ProcessIDSchema,
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
        pid: ProcessIDSchema,
        cid: CommandIDSchema,
      })
    )
    .output(z.string())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      return getCommand(pid, cid).stdoutResponse;
    }),
  name: proc
    .input(ProcessIDSchema)
    .output(z.string())
    .query(async (pid) => {
      return getProcess(pid.input).config.name;
    }),
  config: proc
    .input(ProcessIDSchema)
    .output(ShellConfigSchema)
    .query(async (pid) => {
      return getProcess(pid.input).config;
    }),
  interactMode: proc
    .input(ProcessIDSchema)
    .output(ShellInteractKindSchema)
    .query(async (pid) => {
      return getProcess(pid.input).config.interact;
    }),
  resize: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        rows: z.number().int(),
        cols: z.number().int(),
      })
    )
    .mutation(async (opts) => {
      const { pid, rows, cols } = opts.input;
      getProcess(pid).pty?.resize(rows, cols);
    }),
  shellConfig: proc
    .input(ProcessIDSchema)
    .output(ShellConfigSchema)
    .query(async (pid) => {
      return getProcess(pid.input).config;
    }),
});
