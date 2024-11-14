// Abstract shellInterface of shell by child_process, node-pty and ssh2 shell.

import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import * as pty from "node-pty";
import { ShellInteractKind } from "@/datatypes/ShellInteract";

export class ChildShellStream {
  private pty?: pty.IPty;
  private childProcess?: ChildProcessWithoutNullStreams;
  private usePty;

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
    } else {
      this.childProcess?.stdin.write(data);
    }
  }

  execute(command: string) {
    if (this.usePty) {
      this.pty?.write(command + "\r");
    } else {
      this.childProcess?.stdin.write(command + "\n");
    }
  }

  kill(signal?: NodeJS.Signals) {
    if (this.usePty) {
      this.pty?.kill(signal);
    } else {
      this.childProcess?.kill(signal);
    }
  }

  resize(cols: number, rows: number) {
    if (this.usePty) {
      this.pty?.resize(cols, rows);
    } else {
      // child_process does not support resizing
    }
  }

  clear() {
    if (this.usePty) {
      this.pty?.clear();
    } else {
      // child_process does not support clearing
    }
  }

  pause() {
    if (this.usePty) {
      this.pty?.pause();
    } else {
      // child_process does not support pausing
    }
  }

  resume() {
    if (this.usePty) {
      this.pty?.resume();
    } else {
      // child_process does not support resuming
    }
  }

  onStdout(callback: (data: Buffer) => void) {
    if (this.usePty) {
      this.pty?.onData((str: string) => {
        callback(Buffer.from(str));
      });
    } else {
      this.childProcess?.stdout.removeAllListeners("data");
      this.childProcess?.stdout?.on("data", callback);
    }
  }

  onStderr(callback: (data: Buffer) => void) {
    if (this.usePty) {
      // node-pty does not support stderr
    } else {
      this.childProcess?.stderr.removeAllListeners("data");
      this.childProcess?.stderr?.on("data", callback);
    }
  }

  onExit(callback: (code: number, signal?: number | undefined) => void) {
    if (this.usePty) {
      this.pty?.onExit(({ exitCode, signal }) => {
        callback(exitCode, signal);
      });
    } else {
      this.childProcess?.removeAllListeners("exit");
      this.childProcess?.on("exit", callback);
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
