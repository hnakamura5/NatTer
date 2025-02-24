import { IChildPTy, ChildShellStreamOptions } from "./interface";
import { ConnectConfig } from "ssh2";
import { SshConnectorBase } from "./sshConnectorBase";

export class SshPty extends SshConnectorBase implements IChildPTy {
  private cols: number;
  private rows: number;

  constructor(
    protected connectConfig: ConnectConfig,
    protected options?: ChildShellStreamOptions
  ) {
    const cols = 80;
    const rows = 24;
    super(
      connectConfig,
      {
        cols: cols,
        rows: rows,
      },
      options
    );
    this.cols = cols;
    this.rows = rows;
  }

  resize(cols: number, rows: number): void {
    // TODO: height and width are calculated in the same ratio with default PseudoTtyOptions. Is it right?
    this.start().then(() => {
      this.stream?.setWindow(rows, cols, rows * 20, cols * 8);
      this.cols = cols;
      this.rows = rows;
    });
  }

  getSize() {
    return { cols: this.cols, rows: this.rows };
  }

  clear() {
    // Send the escape sequence to clear the screen
    // \x1b[2J clears the screen
    // \x1b[H moves the cursor to the top-left corner
    this.write("\x1b[2J\x1b[H");
  }

  pause() {
    this.start().then(() => {
      this.stream?.pause();
    });
  }

  resume() {
    this.start().then(() => {
      this.stream?.resume();
    });
  }
}
