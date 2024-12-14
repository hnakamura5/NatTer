import * as logMain from "electron-log/main";
import * as logRenderer from "electron-log/renderer";

// Generic access to the logger, wrapping both main and renderer loggers.

function isRenderer() {
  return process.type === "renderer";
}

export const log = {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  error: (...params: any[]) => {
    if (isRenderer()) {
      logRenderer.error(...params);
    } else {
      logMain.error(...params);
    }
  },
  warn: (...params: any[]) => {
    if (isRenderer()) {
      logRenderer.warn(...params);
    } else {
      logMain.warn(...params);
    }
  },
  info: (...params: any[]) => {
    if (isRenderer()) {
      logRenderer.info(...params);
    } else {
      logMain.info(...params);
    }
  },
  verbose: (...params: any[]) => {
    if (isRenderer()) {
      logRenderer.verbose(...params);
    } else {
      logMain.verbose(...params);
    }
  },
  debug: (...params: any[]) => {
    if (isRenderer()) {
      logRenderer.debug(...params);
    } else {
      logMain.debug(...params);
    }
  },
  debugTrace: (...params: any[]) => {
    const traceStack = new Error().stack;
    if (isRenderer()) {
      logRenderer.debug(...params, traceStack);
    } else {
      logMain.debug(...params, traceStack);
    }
  },
  silly: (...params: any[]) => {
    if (isRenderer()) {
      logRenderer.silly(...params);
    } else {
      logMain.silly(...params);
    }
  },
};

class Logger {
  log(message: string) {
    console.log(message);
  }
  logTrace(message: string) {
    const error = new Error();
    const stackLines = error.stack?.split("\n");
    if (stackLines && stackLines.length > 2) {
      const callerLine = stackLines[2];
      console.log(`${message} at ${callerLine.trim()}`);
    } else {
      console.log(message);
    }
  }
}

export function trace() {
  return new Error().stack;
}

export const logger = new Logger();

function stringToHexLog(str: string) {
  const encoded = new TextEncoder().encode(str);
  return Array.from(encoded)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
}
