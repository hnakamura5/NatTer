import { ShellConfig } from "@/datatypes/Config";
import {
  ShellOptions,
  IShell,
  ITerminalPTy,
} from "@/server/ChildProcess/interface";
import { sshConnectionToConnectConfig } from "@/datatypes/SshConfig";

import { SshPty } from "./sshPty";
import { SshShell } from "./sshShell";
import { ChildShell } from "./childShell";
import { ChildPty } from "./childPty";

import { log } from "@/datatypes/Logger";

export function spawnChildTerminal(
  config: ShellConfig,
  executable: string /* TODO: needless? */,
  args: string[] /* TODO: needless? */,
  options?: ShellOptions
): ITerminalPTy {
  if (config.interact !== "terminal") {
    throw new Error(
      "Terminal can only be spawned when interact is set to terminal."
    );
  }
  if (config.type === "ssh") {
    const connectionConfig = sshConnectionToConnectConfig(config.connection);
    // TODO: pass executable for ssh
    log.debug(`spawn SshPty connectionConfig: ${connectionConfig}`);
    return new SshPty(connectionConfig, options);
  } else {
    // local
    log.debug(`spawn ChildPty executable:${executable} args:`, args);
    return new ChildPty(executable, args, options);
  }
}

export function spawnChildShell(
  config: ShellConfig,
  executable: string,
  args: string[],
  options?: ShellOptions
): IShell {
  if (config.type === "ssh") {
    const connectionConfig = sshConnectionToConnectConfig(config.connection);
    // TODO: pass executable for ssh
    log.debug(`spawn SshShell connectionConfig: ${connectionConfig}`);
    return new SshShell(connectionConfig, options);
  } else {
    // local
    log.debug(`spawn ChildShell executable:${executable} args:`, args);
    return new ChildShell(executable, args, options);
  }
}
