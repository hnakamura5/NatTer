import { app } from "electron";
import path, { parse } from "node:path";

export const tempDir = path.join(app.getPath("temp"), ".natter");
export const commandTempDir = path.join(tempDir, "Command");
export const lspTempDir = path.join(tempDir, "LSPTempBuffer");

export const pathVariables: Map<string, string> = new Map();
pathVariables.set("${EXE}", app.getPath("exe"));
pathVariables.set("${MODULE}", app.getPath("module"));
pathVariables.set("${HOME}", app.getPath("home"));
pathVariables.set("${APPDATA}", app.getPath("appData"));
pathVariables.set(
  "${APPROOT}",
  process.env.APP_ROOT || path.join(app.getPath("exe"), "..")
);
pathVariables.set("${TEMP}", tempDir);
pathVariables.set("${LSPTEMP}", lspTempDir);
