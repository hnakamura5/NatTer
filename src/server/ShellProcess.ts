import { spawnShell } from "@/server/ShellUtils/childShell";
import {
  ShellSpecification,
  ShellSpecificationSchema,
} from "@/datatypes/ShellSpecification";
import { ShellConfig, ShellConfigSchema } from "@/datatypes/Config";
import { isCommandClosed } from "@/server/ShellUtils/CommandClose";
import { z } from "zod";
import {
  Command,
  CommandIDSchema,
  CommandSchema,
  emptyCommand,
  getStdoutOutputPartInPlain,
  ProcessID,
  ProcessIDSchema as ProcessIDSchemaRaw,
} from "@/datatypes/Command";

import { server } from "@/server/tRPCServer";
import { PowerShellSpecification } from "@/builtin/shell/Powershell";
import { BashSpecification } from "@/builtin/shell/Bash";
import { CmdSpecification } from "@/builtin/shell/Cmd";
import { observable } from "@trpc/server/observable";
import { ShellInteractKindSchema } from "@/datatypes/ShellInteract";
import { Process, newProcess, clockIncrement } from "@/server/types/Process";
import { executeCommandByEcho } from "@/server/ShellUtils/ExecuteByEcho";
import { executeCommandByPrompt } from "./ShellUtils/ExecuteByPrompt";
import { isCommandEchoBackToStdout } from "./ShellUtils/BoundaryDetectorUtils";
import stripAnsi from "strip-ansi";

const ProcessSpecs = new Map<string, ShellSpecification>();
ProcessSpecs.set(PowerShellSpecification.name, PowerShellSpecification);
ProcessSpecs.set(BashSpecification.name, BashSpecification);
ProcessSpecs.set(CmdSpecification.name, CmdSpecification);

const processHolder: Process[] = [];
const commandsOfProcessID: Command[][] = [];

const ProcessIDScheme = ProcessIDSchemaRaw.refine((value) => {
  return value < processHolder.length;
});

export const StdoutEventSchema = z.object({
  cid: CommandIDSchema,
  stdout: z.string(),
  isFinished: z.boolean(),
  clock: z.number().int(),
});
export type StdoutEvent = z.infer<typeof StdoutEventSchema>;

// Re-set the current directory after the command.
function currentSetter(process: Process) {
  const includesCommandItSelf = isCommandEchoBackToStdout(
    process.shellSpec,
    process.config.interact
  );
  return () => {
    if (process.shellSpec.directoryCommands !== undefined) {
      const currentDir = process.shellSpec.directoryCommands.getCurrent();
      const getUser = process.shellSpec.directoryCommands.getUser();
      executeCommand(process, currentDir, true, undefined, (command) => {
        console.log(`currentDirectory: ${command.stdoutResponse}`);
        getStdoutOutputPartInPlain(command, includesCommandItSelf).then(
          (dir) => {
            console.log(`set currentDirectory: ${dir}`);
            process.currentDirectory = dir;
          }
        );
        executeCommand(process, getUser, true, undefined, (command) => {
          console.log(`User: ${command.stdoutResponse}`);
          getStdoutOutputPartInPlain(command, includesCommandItSelf).then(
            (user) => {
              console.log(`set User: ${user}`);
              process.user = user;
            }
          );
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
  const childShell = spawnShell(config.interact, executable, args);
  const pid = processHolder.length;
  console.log(`Start process call ${pid} with ${config.executable}`);
  const process = newProcess(
    pid,
    childShell,
    config,
    shellSpec,
    emptyCommand(pid, -1)
  );
  processHolder.push(process);
  commandsOfProcessID.push([]);
  console.log(`Started process ${pid} with ${config.executable}`);
  // First execute move to home command and wait for wake up.
  const executer =
    config.interact === "terminal"
      ? executeCommandByPrompt
      : executeCommandByEcho;
  executer(
    process,
    ``,
    commandsOfProcessID[process.id].length,
    undefined,
    false,
    (command) => {
      console.log(`First command ${command.exactCommand}`);
      // Memorize the shell execution command.
      command.command = `"${config.executable}" ${config.args?.join(" ")}`;
      commandsOfProcessID[process.id].push(command);
      currentSetter(process)();
    }
  );
  console.log(
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
  const cid = isSilent ? -1 : commandsOfProcessID[process.id].length;
  if (process.config.interact === "terminal") {
    executeCommandByPrompt(process, command, cid, styledCommand, isSilent, onEnd);
  } else {
    executeCommandByEcho(process, command, cid, styledCommand, isSilent, onEnd);
  }
  if (!isSilent) {
    commandsOfProcessID[process.id].push(process.currentCommand);
  }
  return process.currentCommand;
}

function sendKey(process: Process, key: string) {
  // TODO: handle the key code to appropriate code?
  if (process.currentCommand.isFinished) {
    console.log(`Send key ${key} to process ${process.id} finished command.`);
    return;
  }
  console.log(`Send key ${key} to process ${process.id}`);
  clockIncrement(process);
  // [HN] TODO: filtering the key. e.g. NonConvert
  // [HN]  process.handle.write(key);
}

function stopProcess(process: Process) {
  console.log(`Stop process call ${process.id}`);
  clockIncrement(process);
  process.handle.kill();
}

export function shutdown() {
  processHolder.forEach((process) => {
    console.log(`Shutdown process ${process.id}`);
    process.handle.kill();
  });
  console.log(`Shutdown all processes.`);
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
  onStdout: proc
    .input(
      z.object({
        pid: ProcessIDScheme,
        cid: CommandIDSchema,
      })
    )
    .subscription(async (opts) => {
      console.log(`onStdout subscription call: ${opts.input}`);
      const { pid, cid } = opts.input;
      const process = processHolder[pid];
      return observable<StdoutEvent>((emit) => {
        const onData = (data: StdoutEvent) => {
          if (data.cid === cid) {
            emit.next(data);
          }
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
      //console.log(`numCommands call ${pid.input}`);
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
          //console.log(`isFinished call pid refine ${value}`);
          return value < processHolder.length;
        }),
        cid: CommandIDSchema,
      })
    )
    .output(z.boolean())
    .query(async (opts) => {
      const { pid, cid } = opts.input;
      // console.log(
      //   `isFinished call ${pid} ${cid} ${commandsOfProcessID[pid][cid].isFinished}`
      // );
      return commandsOfProcessID[pid][cid].isFinished;
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
