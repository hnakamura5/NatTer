import * as Electron from "electron";
import path from "node:path";
import { ShellConfig } from "@/datatypes/Config";
import { pathOf } from "../FileSystem/univPath";
import { readConfig } from "../configServer";

export function localTempDir() {
  return path.join(Electron.app.getPath("temp"), "natter");
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

export function localUserHomeDir() {
  return Electron.app.getPath("home");
}

// User-specific configuration directory.
export function localUserHomeConfigDir() {
  return path.join(Electron.app.getPath("home"), ".natter");
}
// TODO: Is remote home required?
export function getUserHomeConfigDir(config: ShellConfig) {
  if (config.type === "ssh") {
    const pathLib = pathOf(config.connection.pathKind);
    return pathLib.join(config.connection.home, ".natter");
  }
  return localUserHomeConfigDir();
}

// FIXME: Error in importing Electron in test with Playwright.
const appDataConfigDir = () =>
  path.join(Electron.app.getPath("appData"), ".natter");
// Reserved for user, to place their application executables.
const appDataUserAppDir = () => path.join(appDataConfigDir(), "applications");
// Reserved for saved credentials.
const appDataHiddenDir = () => path.join(appDataConfigDir(), "hidden");

const pathVariables: Map<string, string> = new Map();

export function getPathVariables() {
  if (pathVariables.size === 0) {
    pathVariables.set("${EXE}", Electron.app.getPath("exe"));
    pathVariables.set("${MODULE}", Electron.app.getPath("module"));
    pathVariables.set("${HOME}", Electron.app.getPath("home"));
    pathVariables.set("${APP_DATA}", appDataConfigDir());
    pathVariables.set(
      "${APP_ROOT}",
      process.env.APP_ROOT || path.join(Electron.app.getPath("exe"), "..")
    );
    pathVariables.set("${TEMP}", localTempDir());
    pathVariables.set("${LSP_TEMP}", localLspTempDir());
    pathVariables.set("${USER_APP}", appDataUserAppDir());
    pathVariables.set("${HIDDEN}", appDataHiddenDir());
  }
  return pathVariables;
}
