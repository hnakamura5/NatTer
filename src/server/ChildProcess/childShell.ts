import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { IShell, ShellOptions } from "./interface";
import { Encoder } from "./utility";
import { log } from "@/datatypes/Logger";

export class ChildShell implements IShell {
  private childProcess: ChildProcessWithoutNullStreams;
  private newline: string;
  private encoder: Encoder;
  private stdoutCallbackMap = new Map<
    (data: string) => void,
    (data: Buffer) => void
  >();
  private stderrCallbackMap = new Map<
    (data: string) => void,
    (data: Buffer) => void
  >();

  constructor(
    private executable: string,
    private args: string[],
    private options?: ShellOptions
  ) {
    log.debug(`ChildProcessShell executable:${executable} args:`, args);
    this.childProcess = spawn(executable, args, {
      cwd: options?.cwd,
      env: options?.env,
      shell: true,
    });
    this.encoder = new Encoder(options?.encoding);
    this.newline = options?.newline || "\n";
  }

  start() {
    return Promise.resolve();
  }

  write(data: string) {
    this.childProcess.stdin.write(this.encoder.encode(data));
  }

  execute(command: string) {
    log.debug(`childShell executing command:\n*****\n${command}\n*****`);
    this.childProcess.stdin.write(this.encoder.encode(command + this.newline));
  }

  kill(signal?: NodeJS.Signals) {
    this.childProcess.kill(signal);
  }

  onStdout(callback: (data: string) => void) {
    const decodedCallback = (data: Buffer) => {
      callback(this.encoder.decode(data));
    };
    this.stdoutCallbackMap.set(callback, decodedCallback);
    this.childProcess.stdout.on("data", decodedCallback);
  }

  onStderr(callback: (data: string) => void) {
    const decodedCallback = (data: Buffer) => {
      callback(this.encoder.decode(data));
    };
    this.stderrCallbackMap.set(callback, decodedCallback);
    this.childProcess.stderr.on("data", decodedCallback);
  }

  onExit(callback: (code: number, signal?: number | undefined) => void) {
    this.childProcess.on("exit", callback);
  }

  removeStdoutListener(callback: (data: string) => void) {
    const decodedCallback = this.stdoutCallbackMap.get(callback);
    if (decodedCallback) {
      this.childProcess.stdout.removeListener("data", decodedCallback);
    }
    this.stdoutCallbackMap.delete(callback);
  }

  removeStderrListener(callback: (data: string) => void) {
    const decodedCallback = this.stderrCallbackMap.get(callback);
    if (decodedCallback) {
      this.childProcess.stderr.removeListener("data", decodedCallback);
    }
    this.stderrCallbackMap.delete(callback);
  }

  removeExitListener(
    callback: (code: number, signal?: number | undefined) => void
  ) {
    this.childProcess.removeListener("exit", callback);
  }

  removeAllStdoutListener() {
    this.childProcess.stdout.removeAllListeners("data");
    this.stdoutCallbackMap.clear();
  }

  removeAllStderrListener() {
    this.childProcess.stderr.removeAllListeners("data");
    this.stderrCallbackMap.clear();
  }

  removeAllExitListener() {
    this.childProcess.removeAllListeners("exit");
  }
}
