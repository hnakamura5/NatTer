import { app } from "electron";
import path from "node:path";
import { ShellConfig } from "@/datatypes/Config";
import { pathOf } from "../FileSystem/univPath";
import { readConfig } from "../configServer";

export function localTempDir() {
  return path.join(app.getPath("temp"), "natter");
}
export async function getTempDir(config: ShellConfig) {
  if (config.type === "ssh") {
    return config.connection.tempDir;
  }
  const localConfig = await readConfig();
  return localConfig.tempDir || localTempDir();
}

// Temporal directory to save script file to execute commands.
export function localCommandTempDir() {
  return path.join(localTempDir(), "Command");
}
export async function getCommandTempDir(config: ShellConfig) {
  if (config.type === "ssh") {
    const pathLib = pathOf(config.pathKind);
    return pathLib.join(config.connection.tempDir, "Command");
  }
  const localConfig = await readConfig();
  return localConfig.commandTempDir || localCommandTempDir();
}

// Temporal directory to save language server dummy files.
export function localLspTempDir() {
  return path.join(localTempDir(), "LSPTempBuffer");
}
export async function getLspTempDir(config: ShellConfig) {
  if (config.type === "ssh") {
    const pathLib = pathOf(config.pathKind);
    return pathLib.join(config.connection.tempDir, "LSPTempBuffer");
  }
  const localConfig = await readConfig();
  return localConfig.lspTempDir || localLspTempDir();
}

// Used to temporal download files.
export function localFileSystemTempDir() {
  return path.join(localTempDir(), "FileSystemTempBuffer");
}
export async function getFileSystemTempDir(config: ShellConfig) {
  if (config.type === "ssh") {
    const pathLib = pathOf(config.pathKind);
    return pathLib.join(config.connection.tempDir, "FileSystemTempBuffer");
  }
  return path.join(await getTempDir(config), "FileSystemTempBuffer");
}

// User-specific configuration directory.
export function localUserHomeConfigDir() {
  return path.join(app.getPath("home"), ".natter");
}
// TODO: Is remote home required?
export function getUserHomeConfigDir(config: ShellConfig) {
  if (config.type === "ssh") {
    const pathLib = pathOf(config.connection.pathKind);
    return pathLib.join(config.connection.home, ".natter");
  }
  return localUserHomeConfigDir();
}

export const appDataConfigDir = path.join(app.getPath("appData"), ".natter");
// Reserved for user, to place their application executables.
export const appDataUserAppDir = path.join(appDataConfigDir, "applications");
// Reserved for saved credentials.
export const appDataHiddenDir = path.join(appDataConfigDir, "hidden");

const pathVariables: Map<string, string> = new Map();

export function getPathVariables() {
  if (pathVariables.size === 0) {
    pathVariables.set("${EXE}", app.getPath("exe"));
    pathVariables.set("${MODULE}", app.getPath("module"));
    pathVariables.set("${HOME}", app.getPath("home"));
    pathVariables.set("${APP_DATA}", appDataConfigDir);
    pathVariables.set(
      "${APP_ROOT}",
      process.env.APP_ROOT || path.join(app.getPath("exe"), "..")
    );
    pathVariables.set("${TEMP}", localTempDir());
    pathVariables.set("${LSP_TEMP}", localLspTempDir());
    pathVariables.set("${USER_APP}", appDataUserAppDir);
    pathVariables.set("${HIDDEN}", appDataHiddenDir);
  }
  return pathVariables;
}
