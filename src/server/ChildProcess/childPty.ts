import * as pty from "node-pty";
import { ITerminalPTy, ShellOptions } from "./interface";
import { CallbackManager } from "./utility";

export class ChildPty extends CallbackManager implements ITerminalPTy {
  private pty: pty.IPty;
  private newline: string;

  constructor(
    executable: string,
    args: string[],
    options?: ShellOptions
  ) {
    super();
    this.pty = pty.spawn(executable, args, {
      cwd: options?.cwd,
      env: options?.env,
      encoding: options?.encoding, // Encoding is handled by node-pty
    });
    this.newline = options?.newline || "\n";
    this.pty.onData((data: string) => {
      this.stdoutCall(data);
    });
    // PTy doesn't support stderr
    this.pty.onExit(({ exitCode, signal }) => {
      this.exitCall(exitCode, signal);
    });
  }

  start() {
    return Promise.resolve();
  }

  write(data: string) {
    this.pty.write(data);
  }

  execute(command: string) {
    this.pty.write(command + this.newline);
  }

  kill(signal?: NodeJS.Signals) {
    this.pty.kill(signal);
  }

  resize(cols: number, rows: number) {
    this.pty.resize(cols, rows);
  }

  getSize() {
    return { cols: this.pty.cols, rows: this.pty.rows };
  }

  clear() {
    this.pty.clear();
  }

  pause() {
    this.pty.pause();
  }

  resume() {
    this.pty.resume();
  }
}
