// Abstract shellInterface of shell by child_process, node-pty and ssh2 shell.

import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as pty from "node-pty";
import { ShellInteractKind } from "@/datatypes/ShellInteract";

import * as iconv from "iconv-lite";
import stream from "stream";

import { log } from "@/datatypes/Logger";

iconv.enableStreamingAPI(stream);

export type ChildShellStreamOptions = {
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  encoding?: string; // UTF-8 by default
  newline?: string;
};

// API supported common between child_process, ssh and node-pty.
export interface IChildShell {
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
export interface IChildPTy extends IChildShell {
  resize: (cols: number, rows: number) => void;
  getSize: () => { cols: number; rows: number };
  clear: () => void;
  pause: () => void;
  resume: () => void;
}

export class ChildShellStream {
  private pty?: pty.IPty;
  private childProcess?: ChildProcessWithoutNullStreams;
  private usePty;
  private onStdoutCallBacks: ((data: Buffer) => void)[] = [];
  private onStderrCallBacks: ((data: Buffer) => void)[] = [];
  private onExitCallBacks: ((
    code: number,
    signal?: number | undefined
  ) => void)[] = [];

  constructor(
    private shellInterface: ShellInteractKind,
    command: string,
    args?: string[],
    private options?: ChildShellStreamOptions
  ) {
    this.usePty = this.shellInterface === "terminal";
    if (this.usePty) {
      // Use node-pty
      log.debug(`Spawning shell: ${command} ${args}`);
      command = command.replace(/"/g, "");
      this.pty = pty.spawn(command, args || [], {
        cwd: options?.cwd,
        env: options?.env,
      });
      // [HN] this.pty?.resize(512, 16);
      this.pty?.onData((str: string) => {
        const data = Buffer.from(str);
        for (const callback of this.onStdoutCallBacks) {
          callback(data);
        }
      });
      this.pty?.onExit(({ exitCode, signal }) => {
        for (const callback of this.onExitCallBacks) {
          callback(exitCode, signal);
        }
      });
    } else {
      // Use child_process
      this.childProcess = spawn(`"${command}"`, args, {
        shell: true,
        cwd: options?.cwd,
        env: options?.env,
      });
      // pipe stdout and stderr to decoder.
      this.childProcess?.stdout
        .pipe(iconv.decodeStream(options?.encoding || "utf8"))
        .on("data", (data) => {
          log.debug(`childShell stdout: ${data}`);
          for (const callback of this.onStdoutCallBacks) {
            callback(data);
          }
        });
      this.childProcess?.stderr
        .pipe(iconv.decodeStream(options?.encoding || "utf8"))
        .on("data", (data) => {
          log.debug(`childShell stderr: ${data}`);
          for (const callback of this.onStderrCallBacks) {
            callback(data);
          }
        });
      // TODO: onExit type differs
      // this.childProcess?.on("exit", (code, signal) => {
      //   for (const callback of this.onExitCallBacks) {
      //     callback(code, signal);
      //   }
      // });
    }
  }

  write(data: string) {
    if (this.usePty) {
      this.pty?.write(data);
    } else if (this.childProcess) {
      // TODO: is this correct? only for windows?
      if (this.options?.encoding) {
        const encoded = iconv.encode(data, this.options.encoding);
        this.childProcess?.stdin.write(encoded);
      } else {
        this.childProcess?.stdin.write(data.replace(/\r/g, "\n"));
      }
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  execute(command: string) {
    log.debug(`childShell executing command:\n*****\n${command}\n*****`);
    if (this.usePty) {
      // TODO: snap the size for silent command.
      this.pty?.write(command + "\r");
    } else if (this.childProcess) {
      if (this.options?.encoding) {
        const encoded = iconv.encode(command + "\n", this.options.encoding);
        log.debug(`childShell writing encoded: ${encoded}`);
        if (!this.childProcess) {
          log.debug("childProcess is not initialized");
          throw new Error("Shell stream is not initialized");
        }
        this.childProcess?.stdin.write(encoded);
      } else {
        this.childProcess?.stdin.write(command + "\n");
      }
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  kill(signal?: NodeJS.Signals) {
    if (this.usePty) {
      this.pty?.kill(signal);
      this.pty = undefined;
    } else if (this.childProcess) {
      this.childProcess?.kill(signal);
      this.childProcess = undefined;
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  resize(cols: number, rows: number) {
    if (this.usePty) {
      this.pty?.resize(cols, rows);
    } else if (this.childProcess) {
      // child_process does not support resizing
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  getSize() {
    if (this.usePty) {
      if (this.pty) {
        return { cols: this.pty.cols, rows: this.pty.rows };
      }
      return undefined;
    } else if (this.childProcess) {
      // child_process does not support getting size
      return undefined;
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  clear() {
    if (this.usePty) {
      this.pty?.clear();
    } else if (this.childProcess) {
      // child_process does not support clearing
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  pause() {
    if (this.usePty) {
      this.pty?.pause();
    } else if (this.childProcess) {
      // child_process does not support pausing
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  resume() {
    if (this.usePty) {
      this.pty?.resume();
    } else if (this.childProcess) {
      // child_process does not support resuming
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  onStdout(callback: (data: Buffer) => void) {
    log.debug("onStdout registered");
    if (this.usePty) {
      this.onStdoutCallBacks = [callback];
    } else if (this.childProcess) {
      this.onStdoutCallBacks = [callback];
    } else {
      log.debug("childProcess is not initialized");
      throw new Error("Shell stream is not initialized");
    }
  }

  onStderr(callback: (data: Buffer) => void) {
    log.debug("onStderr registered");
    if (this.usePty) {
      // node-pty does not support stderr
    } else if (this.childProcess) {
      this.onStderrCallBacks = [callback];
    } else {
      log.debug("childProcess is not initialized");
      throw new Error("Shell stream is not initialized");
    }
  }

  onExit(callback: (code: number, signal?: number | undefined) => void) {
    if (this.usePty) {
      this.onExitCallBacks = [callback];
    } else if (this.childProcess) {
      this.onExitCallBacks = [callback];
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }
}

export function spawnShell(
  shellInterface: ShellInteractKind,
  command: string,
  args?: string[],
  options?: ChildShellStreamOptions
) {
  try {
    return new ChildShellStream(shellInterface, command, args, options);
  } catch (e) {
    log.debug("Failed to spawn shell: ", e);
    throw e;
  }
}
