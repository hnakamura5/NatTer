import { z } from "zod";
import { server } from "@/server/tRPCServer";

import { ShellConfig, ShellConfigSchema } from "@/datatypes/Config";
import { observable } from "@trpc/server/observable";

import { newProcessID } from "./types/Process";
import { ProcessID, ProcessIDSchema } from "@/datatypes/Command";
import { spawnChildTerminal } from "./ChildProcess/spawn";

import { ITerminalPTy } from "@/server/ChildProcess/interface";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { log } from "@/datatypes/Logger";

import { EventEmitter, on } from "node:events";

const Terminals = new Map<ProcessID, ITerminalPTy>();
const configs = new Map<ProcessID, ShellConfig>();
const stdoutEvent = new EventEmitter();

function startTerminal(shellConfig: ShellConfig) {
  const id = newProcessID();
  const term = spawnChildTerminal(
    shellConfig,
    shellConfig.executable || "",
    shellConfig.args || [],
    {}
  );
  Terminals.set(id, term);
  configs.set(id, shellConfig);
  term.onStdout((data: string) => {
    stdoutEvent.emit(id, data);
  });
  return id;
}

function getTerminal(pid: ProcessID) {
  const result = Terminals.get(pid);
  if (result === undefined) {
    throw new Error(`Terminal ${pid} not found`);
  }
  return result;
}

function getConfig(pid: ProcessID) {
  const result = configs.get(pid);
  if (result === undefined) {
    throw new Error(`Config for Terminal ${pid} not found`);
  }
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
      })
    )
    .output(z.void())
    .mutation(async (opts) => {
      const { pid, command } = opts.input;
      log.debug(`Execute command ${command} in process ${pid}`);
      const term = getTerminal(pid);
      term.execute(command);
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
      const process = getTerminal(pid.input);
      process.kill();
      Terminals.delete(pid.input);
    }),

  stdout: proc.input(ProcessIDSchema).subscription(async (opts) => {
    const pid = opts.input;
    let firstEmit = true;
    return observable<string>((emit) => {
      const onData = (data: string) => {
        if (firstEmit) {
          emit.next(data);
          firstEmit = false;
        }
      };
      stdoutEvent.on(pid, onData);
      return () => {
        stdoutEvent.off(pid, onData);
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
      getTerminal(pid).resize(rows, cols);
    }),
});
