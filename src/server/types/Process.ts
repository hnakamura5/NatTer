import { z } from "zod";

import {
  ChildShellStream,
  IChildPTy,
  IChildShell,
} from "@/server/ChildProcess/interface";
import { ShellConfig } from "@/datatypes/Config";
import { ShellSpecification } from "@/datatypes/ShellSpecification";
import { Command } from "@/datatypes/Command";
import { ProcessID, CommandID } from "@/datatypes/Command";

import { EventEmitter, on } from "node:events";
import * as iconv from "iconv-lite";

import { log } from "@/datatypes/Logger";

export type Process = {
  id: ProcessID;
  shell: IChildShell;
  pty?: IChildPTy;
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
  shell: IChildShell,
  pty: IChildPTy | undefined,
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

// function adjustEncoding(encoding: string): string {
//   const lower = encoding.toLowerCase();
//   if (
//     lower === "shift_jis" ||
//     lower === "shift-jis" ||
//     lower === "shiftjis" ||
//     lower === "sjis"
//   ) {
//     return "windows-31j";
//   }
//   return encoding;
// }

// export function decodeFromShellEncoding(
//   process: Process,
//   data: Buffer
// ): string {
//   if (process.config.encoding === undefined) {
//     return data.toString();
//   }
//   return iconv.decode(data, adjustEncoding(process.config.encoding));
// }

// export function encodeToShellEncoding(
//   process: Process,
//   command: string
// ): Buffer {
//   if (process.config.encoding === undefined) {
//     return Buffer.from(command);
//   }
//   const encoding = adjustEncoding(process.config.encoding);
//   log.debug(
//     `encodeToShellEncoding: ${command} to ${encoding} isSupported:${iconv.encodingExists(
//       encoding
//     )}`
//   );
//   return iconv.encode(command, process.config.encoding);
// }
