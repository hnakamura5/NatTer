import * as logRenderer from "electron-log";

// Generic access to the logger, wrapping both main and renderer loggers.

function isRenderer() {
  return process.type === "renderer";
}

function traceStack() {
  const traceStack = new Error().stack;
  return traceStack?.slice(traceStack.indexOf("\n"));
}

export const log = {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  error: (...params: any[]) => {
    logRenderer.error(...params);
  },
  errorTrace: (...params: any[]) => {
    logRenderer.error(...params, traceStack());
  },
  warn: (...params: any[]) => {
    logRenderer.warn(...params);
  },
  info: (...params: any[]) => {
    logRenderer.info(...params);
  },
  verbose: (...params: any[]) => {
    logRenderer.verbose(...params);
  },
  debug: (...params: any[]) => {
    logRenderer.debug(...params);
  },
  debugTrace: (...params: any[]) => {
    logRenderer.debug(...params, traceStack());
  },
  silly: (...params: any[]) => {
    logRenderer.silly(...params);
  },
};

export function stringToHexLog(str: string) {
  const encoded = new TextEncoder().encode(str);
  return Array.from(encoded)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
}


