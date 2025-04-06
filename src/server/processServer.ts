import os from "node:os";
import {
  Command,
  CommandID,
  CommandIDSchema,
  CommandSchema,
  emptyCommand,
} from "@/datatypes/Command";
import {
  SessionID,
  SessionIDSchema,
  ProcessID,
  ProcessIDSchema,
} from "@/datatypes/SessionID";
import { Process, newProcess, newProcessID } from "@/server/types/Process";
import { ShellSpecification } from "@/datatypes/ShellSpecification";

import { log } from "@/datatypes/Logger";
import { IShell, ITerminalPTy } from "./ChildProcess/interface";
import { ShellConfig, ShellConfigSchema } from "@/datatypes/Config";
import { remoteHostFromConfig, RemoteHostSchema } from "@/datatypes/SshConfig";
import { server } from "./tRPCServer";
import { z } from "zod";
import { ShellInteractKindSchema } from "@/datatypes/Interact";
import { localUserHomeDir } from "./ConfigUtils/paths";
import { readShellSpecs } from "./configServer";

const ProcessSpecs = new Map<string, ShellSpecification>();
const processHolder = new Map<ProcessID["id"], Process>();
const commandsOfProcessID = new Map<ProcessID["id"], Command[]>();

export function setupShellProcess() {
  log.debug(`ShellProcess setup.`);
  return readShellSpecs().then((specs) => {
    specs.forEach((spec) => {
      // log.debug(`Read shell spec: `, spec);
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

export function getProcess(pid: ProcessID): Process {
  const result = processHolder.get(pid.id);
  if (result === undefined) {
    const message = `Process ${pid} not found.`;
    log.error(message);
    throw new Error(message);
  }
  return result;
}

export function getShellSpec(name: string): ShellSpecification {
  const result = ProcessSpecs.get(name);
  if (result === undefined) {
    const message = `Shell spec ${name} not found.`;
    log.error(message);
    throw new Error(message);
  }
  return result;
}

function addProcess(pid: ProcessID, process: Process) {
  processHolder.set(pid.id, process);
  commandsOfProcessID.set(pid.id, []);
}

export function addNewProcess(
  shell: IShell,
  pty: ITerminalPTy | undefined,
  config: ShellConfig,
  executor: Process["executor"]
) {
  if (processHolder.size > 100) {
    throw new Error("Too many processes. This is for debugging.");
  }
  const shellSpec = getShellSpec(config.language);
  const pid = newProcessID();
  const process = newProcess(
    pid,
    shell,
    pty,
    config,
    shellSpec,
    emptyCommand(pid, -1),
    executor
  );
  if (config.type === "ssh") {
    log.debug(`set ssh connection as process.remoteHost:${config.connection}`);
    process.remoteHost = remoteHostFromConfig(config);
    process.currentDirectory = config.connection.home;
    process.user = config.connection.username;
  } else {
    process.currentDirectory = localUserHomeDir();
    process.user = os.userInfo().username;
  }
  addProcess(pid, process);
  return process;
}

export function getCommand(pid: ProcessID, cid: CommandID): Command {
  return getCommands(pid)[cid];
}

export function getNumCommands(pid: ProcessID): number {
  return getCommands(pid).length;
}

export function addCommand(pid: ProcessID, command: Command) {
  log.debug(`Add command ${command.command} to process ${pid}`);
  getCommands(pid).push(command);
}

export function getCommands(pid: ProcessID): Command[] {
  const result = commandsOfProcessID.get(pid.id);
  if (result === undefined) {
    const message = `Commands of Process ${pid} not found`;
    log.error(message);
    throw new Error(message);
  }
  return result;
}

const proc = server.procedure;
export const processRouter = server.router({
  currentDirectory: proc.input(ProcessIDSchema).query(({ input }) => {
    // log.debug(`Get current directory of process ${input}`);
    const process = getProcess(input);
    return process.currentDirectory;
  }),
  currentUser: proc.input(ProcessIDSchema).query(({ input }) => {
    const process = getProcess(input);
    return process.user;
  }),
  remoteHost: proc
    .input(ProcessIDSchema)
    .output(
      z.object({
        remoteHost: RemoteHostSchema.optional(),
      })
    )
    .query(({ input }) => {
      // log.debug(`Get remote host of process ${input}`);
      const process = getProcess(input);
      return { remoteHost: process.remoteHost };
    }),
  numCommands: proc
    .input(ProcessIDSchema)
    .output(z.number().int())
    .query(({ input }) => {
      return getNumCommands(input);
    }),
  command: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        cid: CommandIDSchema,
      })
    )
    .output(CommandSchema.optional())
    .query(({ input }) => {
      const { pid, cid } = input;
      return getCommand(pid, cid);
    }),
  commandAsync: proc
    .input(
      z.object({
        pid: ProcessIDSchema,
        cid: CommandIDSchema,
      })
    )
    .output(CommandSchema.optional())
    .mutation(({ input }) => {
      const { pid, cid } = input;
      return getCommand(pid, cid);
    }),
  shellConfig: proc
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
});
