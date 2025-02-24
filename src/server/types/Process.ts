import { z } from "zod";

import { ITerminalPTy, IShell } from "@/server/ChildProcess/interface";
import { ShellConfig } from "@/datatypes/Config";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { Command } from "@/datatypes/Command";
import { ProcessID, CommandID } from "@/datatypes/Command";

import { EventEmitter, on } from "node:events";
import * as iconv from "iconv-lite";

import { log } from "@/datatypes/Logger";

export type Process = {
  id: ProcessID;
  shell: IShell;
  pty?: ITerminalPTy;
  shellSpec: ShellSpecification;
  config: ShellConfig;
  currentCommand: Command;
  currentDirectory: string;
  user: string;
  clock: number;
  event: EventEmitter;
  executor: (
    process: Process,
    command: string,
    cid: CommandID,
    styledCommand?: string,
    isSilent?: boolean,
    onEnd?: (command: Command) => void
  ) => Command;
};

export function newProcess(
  pid: ProcessID,
  shell: IShell,
  pty: ITerminalPTy | undefined,
  config: ShellConfig,
  shellSpec: ShellSpecification,
  currentCommand: Command,
  executor: Process["executor"]
): Process {
  return {
    id: pid,
    shell: shell,
    pty: pty,
    config: config,
    shellSpec: shellSpec,
    currentCommand: currentCommand,
    currentDirectory: "",
    user: "",
    clock: 0,
    event: new EventEmitter(),
    executor: executor,
  };
}

export function clockIncrement(process: Process) {
  process.clock += 1;
  process.currentCommand.clock = process.clock;
  return process.clock;
}
