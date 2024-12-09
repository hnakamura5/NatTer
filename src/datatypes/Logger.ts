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

export const logger = new Logger();

function stringToHexLog(str: string) {
  const encoded = new TextEncoder().encode(str);
  return Array.from(encoded)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join(" ");
}
