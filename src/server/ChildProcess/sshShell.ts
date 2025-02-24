import { ShellOptions } from "./interface";
import { ConnectConfig } from "ssh2";
import { SshConnectorBase } from "./sshConnectorBase";

export class SshShell extends SshConnectorBase {
  constructor(
    protected connectConfig: ConnectConfig,
    protected options?: ShellOptions
  ) {
    super(connectConfig, false, options);
  }
}
