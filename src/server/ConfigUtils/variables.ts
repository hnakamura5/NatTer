import { app } from "electron";
import path from "node:path";

export const tempDir = path.join(app.getPath("temp"), ".natter");
export const commandTempDir = path.join(tempDir, "Command");
export const lspTempDir = path.join(tempDir, "LSPTempBuffer");
export const userHomeConfigDir = path.join(app.getPath("home"), ".natter");
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
    pathVariables.set("${APPDATA}", appDataConfigDir);
    pathVariables.set(
      "${APPROOT}",
      process.env.APP_ROOT || path.join(app.getPath("exe"), "..")
    );
    pathVariables.set("${TEMP}", tempDir);
    pathVariables.set("${LSPTEMP}", lspTempDir);
    pathVariables.set("${USERAPP}", appDataUserAppDir);
    pathVariables.set("${HIDDEN}", appDataHiddenDir);
  }
  return pathVariables;
}
