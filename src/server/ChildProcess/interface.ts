// Abstract interface of shell by child_process, node-pty and ssh2 shell.
import * as iconv from "iconv-lite";
import stream from "stream";

iconv.enableStreamingAPI(stream);

export type ShellOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  encoding?: string; // UTF-8 by default
  newline?: string;
};

// API supported common between child_process, ssh and node-pty.
export interface IShell {
  start: () => Promise<void>;
  write: (data: string) => void;
  execute: (command: string) => void;
  kill: (signal?: NodeJS.Signals) => void;
  onStdout: (callback: (data: string) => void) => void;
  onStderr: (callback: (data: string) => void) => void;
  onExit: (
    callback: (code: number, signal?: number | undefined) => void
  ) => void;
  removeStdoutListener: (callback: (data: string) => void) => void;
  removeStderrListener: (callback: (data: string) => void) => void;
  removeExitListener: (
    callback: (code: number, signal?: number | undefined) => void
  ) => void;
  removeAllStdoutListener: () => void;
  removeAllStderrListener: () => void;
  removeAllExitListener: () => void;
}

// API supported by node-pty.
export interface ITerminalPTy extends IShell {
  resize: (cols: number, rows: number) => void;
  getSize: () => { cols: number; rows: number };
  clear: () => void;
  pause: () => void;
  resume: () => void;
}
