import { z } from "zod";

import { ChildShellStream } from "@/server/ShellUtils/childShell";
import { ShellConfig } from "@/datatypes/Config";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { Command } from "@/datatypes/Command";
import { ProcessID } from "@/datatypes/Command";

import { EventEmitter, on } from "node:events";
import * as iconv from "iconv-lite";

export type Process = {
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

export function newProcess(
  pid: ProcessID,
  handle: ChildShellStream,
  config: ShellConfig,
  shellSpec: ShellSpecification,
  currentCommand: Command
): Process {
  return {
    id: pid,
    handle: handle,
    config: config,
    shellSpec: shellSpec,
    currentCommand: currentCommand,
    currentDirectory: "",
    user: "",
    clock: 0,
    event: new EventEmitter(),
  };
}

export function clockIncrement(process: Process) {
  process.clock += 1;
  process.currentCommand.clock = process.clock;
  return process.clock;
}

export function decodeFromShellEncoding(
  process: Process,
  data: Buffer
): string {
  if (process.config.encoding === undefined) {
    return data.toString();
  }
  return iconv.decode(data, process.config.encoding);
}

export function encodeToShellEncoding(
  process: Process,
  command: string
): Buffer {
  if (process.config.encoding === undefined) {
    return Buffer.from(command);
  }
  return iconv.encode(command, process.config.encoding);
}
