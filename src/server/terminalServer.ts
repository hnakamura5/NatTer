import { z } from "zod";
import { server } from "@/server/tRPCServer";

import { ShellConfig, ShellConfigSchema } from "@/datatypes/Config";
import { observable } from "@trpc/server/observable";

import { Process, newProcessID } from "./types/Process";
import {
  Command,
  CommandID,
  CommandSchema,
  ProcessID,
  ProcessIDSchema,
  newCommand,
} from "@/datatypes/Command";
import { spawnChildTerminal } from "./ChildProcess/spawn";

import { ITerminalPTy } from "@/server/ChildProcess/interface";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { log } from "@/datatypes/Logger";

import { EventEmitter, on } from "node:events";
import {
  addCommand,
  addNewProcess,
  getCommand,
  getNumCommands,
  getProcess,
} from "./processServer";

function startTerminal(shellConfig: ShellConfig) {
  const term = spawnChildTerminal(
    shellConfig,
    shellConfig.executable || "",
    shellConfig.args || [],
    {}
  );
  const process = addNewProcess(term, term, shellConfig, executeCommand);
  return process.id;
}

function getTerminal(pid: ProcessID) {
  const result = getProcess(pid).pty;
  if (result === undefined) {
    throw new Error(`Process ${pid} is not terminal`);
  }
  return result;
}

function executeCommand(
  process: Process,
  command: string,
  cid: CommandID,
  styledCommand?: string,
  isSilent?: boolean,
  onEnd?: (command: Command) => void
): Command {
  const result = newCommand(
    process.id,
    cid,
    command,
    command,
    process.currentDirectory,
    process.user,
    "",
    undefined,
    styledCommand,
    process.pty?.getSize()
  );
  process.pty?.execute(command);
  // TODO: Other command members such as exitCode?
  return result;
}

function sendKey(term: ITerminalPTy, key: string) {
  term.write(key);
}

const proc = server.procedure;
export const terminalRouter = server.router({
  start: proc
    .input(ShellConfigSchema)
    .output(ProcessIDSchema)
    .mutation(async (opts) => {
      try {
        log.debug(`Start terminal ${opts.input.name}`);
        return startTerminal(opts.input);
      } catch (e) {
        console.error(e);
        throw e;
      }
    }),

  execute: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        command: z.string(),
        isSilent: z.boolean().optional(),
      })
    )
    .output(CommandSchema)
    .mutation(async (opts) => {
      const { pid, command, isSilent } = opts.input;
      const cid = isSilent ? -1 : getNumCommands(pid);
      log.debug(`Execute command ${command} in process ${pid}`);
      const currentCommand = executeCommand(
        getProcess(pid),
        command,
        cid,
        undefined,
        isSilent
      );
      if (!isSilent) {
        addCommand(pid, currentCommand);
      }
      return currentCommand;
    }),

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
      log.debug(`Send key ${key} to process ${pid}`);
      sendKey(getTerminal(pid), key);
    }),

  stop: proc
    .input(ProcessIDSchema)
    .output(z.void())
    .mutation(async (pid) => {
      getTerminal(pid.input).kill();
    }),

  stdout: proc.input(ProcessIDSchema).subscription(async (opts) => {
    const pid = opts.input;
    return observable<string>((emit) => {
      const onData = (data: string) => {
        log.debug(`stdout: ${data} in terminal ${pid}`);
        emit.next(data);
      };
      getTerminal(pid).onStdout(onData);
      return () => {
        getTerminal(pid).removeStdoutListener(onData);
      };
    });
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
      getTerminal(pid).resize(cols, rows);
    }),

  numHistory: proc
    .input(ProcessIDSchema)
    .output(z.number().int())
    .query(async (pid) => {
      return getNumCommands(pid.input);
    }),

  history: proc
    .input(z.object({ pid: ProcessIDSchema, index: z.number().int() }))
    .output(z.string().optional())
    .mutation(async (opts) => {
      const { pid, index } = opts.input;
      if (index >= getNumCommands(pid)) {
        return undefined;
      }
      return getCommand(pid, index).command;
    }),
});
