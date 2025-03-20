import { app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createIPCHandler } from "electron-trpc/main";
import { router } from "@/server/tRPCRouter";
import { setupShellProcess, shutdownShellProcess } from "@/server/ShellProcess";

import * as log from "electron-log/main";
import * as logRenderer from "electron-log/renderer";
import { shutdownTerminals } from "@/server/terminalServer";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, "public")
  : RENDERER_DIST;

// Path to material-icon-theme icons.
process.env.MATERIAL_ICON_THEME_PATH = app.isPackaged
  ? path.join(process.env.APP_ROOT, "node_modules/material-icon-theme/icons")
  : path.join("./node_modules/material-icon-theme/icons");
// In non-packaged mode, the absolute path is blocked by security policy.

// The name ".natter" causes bug of electron-builder (not bundled)
// https://github.com/electron-userland/electron-builder/issues/5904
process.env.BUILTIN_DOT_NATTER_PATH = app.isPackaged
  ? path.join(process.env.APP_ROOT, "defaultConfig")
  : path.join("defaultConfig");

logRenderer.transports.console.format = "[{level}:main] > {text}";
log.debug(`APP_ROOT: ${process.env.APP_ROOT}`);
log.debug(`VITE_PUBLIC: ${process.env.VITE_PUBLIC}`);
log.debug(`MATERIAL_ICON_THEME_PATH: ${process.env.MATERIAL_ICON_THEME_PATH}`);
log.debug(`BUILTIN_DOT_NATTER_PATH: ${process.env.BUILTIN_DOT_NATTER_PATH}`);

let win: BrowserWindow | null;

// TODO: Stop logging to file now.
log.transports.file.level = false;
// Logger setup.
// TODO: set options to the logger
log.initialize();
if (VITE_DEV_SERVER_URL == undefined) {
  log.transports.file.level = "verbose";
}
// TODO: main and renderer is upside down?
log.transports.console.format = "[{level}:{processType}] > {text}";

function createWindow() {
  win = new BrowserWindow({
    //titleBarStyle: 'hidden',
    //titleBarOverlay: true,
    icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
    webPreferences: {
      preload: path.join(__dirname, "preload.mjs"),
    },
  });
  win.setMenuBarVisibility(false);

  // Test active push message to Renderer-process.
  win.webContents.on("did-finish-load", () => {
    // if (VITE_DEV_SERVER_URL) {
    //   win?.webContents.openDevTools();
    // }
    win?.webContents.openDevTools();
    win?.webContents.send("main-process-message", new Date().toLocaleString());
  });

  process.stdout.write(`VITE_DEV_SERVER_URL: ${VITE_DEV_SERVER_URL}\n`);
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, "index.html"));
  }
  log.debug(`createIPCHandler`);
  createIPCHandler({ router, windows: [win] });
  log.debug(`exe: ${app.getPath("module")}`);
  log.debug(`home: ${app.getPath("home")}`);
  log.debug(`appData: ${app.getPath("appData")}`);
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    win = null;
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

process.on("uncaughtException", (error) => {
  log.error(`Terminate by uncaught exception: ${error}`);
  app.quit();
});

app.on("quit", () => {
  shutdownShellProcess();
  shutdownTerminals();
  log.debug("app quit");
});

app.whenReady().then(async () => {
  // Main process initializers here.
  await setupShellProcess();
  createWindow();
});
