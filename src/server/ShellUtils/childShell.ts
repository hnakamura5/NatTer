// Abstract shellInterface of shell by child_process, node-pty and ssh2 shell.

import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as pty from "node-pty";
import { ShellInteractKind } from "@/datatypes/ShellInteract";

export class ChildShellStream {
  private pty?: pty.IPty;
  private childProcess?: ChildProcessWithoutNullStreams;
  private usePty;
  private onStdoutCallBacks: ((data: Buffer) => void)[] = [];
  private onExitCallBacks: ((
    code: number,
    signal?: number | undefined
  ) => void)[] = [];

  constructor(
    private shellInterface: ShellInteractKind,
    command: string,
    args?: string[],
    options?: {
      cwd: string;
      env: NodeJS.ProcessEnv;
    }
  ) {
    this.usePty = this.shellInterface === "terminal";
    if (this.usePty) {
      // Use node-pty
      console.log(`Spawning shell: ${command} ${args}`);
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
    }
  }

  write(data: string) {
    if (this.usePty) {
      this.pty?.write(data);
    } else if (this.childProcess) {
      this.childProcess?.stdin.write(data);
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  execute(command: string) {
    console.log(`childShell executing command: ${command}`);
    if (this.usePty) {
      // TODO: snap the size for silent command.
      this.pty?.write(command + "\r");
    } else if (this.childProcess) {
      this.childProcess?.stdin.write(command + "\n");
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
    if (this.usePty) {
      this.onStdoutCallBacks = [callback];
    } else if (this.childProcess) {
      this.childProcess?.stdout.removeAllListeners("data");
      this.childProcess?.stdout?.on("data", callback);
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  onStderr(callback: (data: Buffer) => void) {
    if (this.usePty) {
      // node-pty does not support stderr
    } else if (this.childProcess) {
      this.childProcess?.stderr.removeAllListeners("data");
      this.childProcess?.stderr?.on("data", callback);
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }

  onExit(callback: (code: number, signal?: number | undefined) => void) {
    if (this.usePty) {
      this.onExitCallBacks = [callback];
    } else if (this.childProcess) {
      this.childProcess?.removeAllListeners("exit");
      this.childProcess?.on("exit", callback);
    } else {
      throw new Error("Shell stream is not initialized");
    }
  }
}

export function spawnShell(
  shellInterface: ShellInteractKind,
  command: string,
  args?: string[],
  options?: {
    cwd: string;
    env: NodeJS.ProcessEnv;
  }
) {
  try {
    return new ChildShellStream(shellInterface, command, args, options);
  } catch (e) {
    console.log("Failed to spawn shell: ", e);
    throw e;
  }
}
