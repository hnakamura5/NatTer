import * as iconv from "iconv-lite";
import stream from "stream";

iconv.enableStreamingAPI(stream);

export class Encoder {
  constructor(private encoding?: string) {}

  encode(command: string) {
    if (this.encoding) {
      return iconv.encode(command, this.encoding);
    } else {
      return command;
    }
  }

  decode(data: Buffer) {
    if (this.encoding) {
      return iconv.decode(data, this.encoding);
    } else {
      return data.toString();
    }
  }
}

export class CallbackManager {
  protected onStdoutCallBacks: ((data: string) => void)[] = [];
  protected onStderrCallBacks: ((data: string) => void)[] = [];
  protected onExitCallBacks: ((
    code: number,
    signal?: number | undefined
  ) => void)[] = [];

  protected stdoutCall(data: string) {
    for (const callback of this.onStdoutCallBacks) {
      callback(data);
    }
  }

  protected stderrCall(data: string) {
    for (const callback of this.onStderrCallBacks) {
      callback(data);
    }
  }

  protected exitCall(code: number, signal?: number | undefined) {
    for (const callback of this.onExitCallBacks) {
      callback(code, signal);
    }
  }

  onStdout(callback: (data: string) => void) {
    this.onStdoutCallBacks.push(callback);
  }

  onStderr(callback: (data: string) => void) {
    this.onStderrCallBacks.push(callback);
  }

  onExit(callback: (code: number, signal?: number | undefined) => void) {
    this.onExitCallBacks.push(callback);
  }

  removeStdoutListener(callback: (data: string) => void) {
    this.onStdoutCallBacks = this.onStdoutCallBacks.filter(
      (cb) => cb !== callback
    );
  }

  removeStderrListener(callback: (data: string) => void) {
    this.onStderrCallBacks = this.onStderrCallBacks.filter(
      (cb) => cb !== callback
    );
  }

  removeExitListener(
    callback: (code: number, signal?: number | undefined) => void
  ) {
    this.onExitCallBacks = this.onExitCallBacks.filter((cb) => cb !== callback);
  }

  removeAllStderrListener() {
    this.onStderrCallBacks = [];
  }

  removeAllStdoutListener() {
    this.onStdoutCallBacks = [];
  }

  removeAllExitListener() {
    this.onExitCallBacks = [];
  }
}
