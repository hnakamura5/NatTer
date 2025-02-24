import { ChildShellStreamOptions } from "./interface";
import { ConnectConfig } from "ssh2";
import { SshConnectorBase } from "./sshConnectorBase";

export class SshShell extends SshConnectorBase {
  constructor(
    protected connectConfig: ConnectConfig,
    protected options?: ChildShellStreamOptions
  ) {
    super(connectConfig, false, options);
  }
}
