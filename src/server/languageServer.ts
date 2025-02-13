import { log } from "@/datatypes/Logger";
import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  LanguageServerID,
  LanguageServerIDSchema,
  LanguageServerExecutableArgs,
  LanguageServerExecutableArgsSchema,
  getNextLanguageServerID,
  LanguageServerIPCChannel,
  LanguageServerIPCChannelReceiver,
  LanguageServerIPCChannelClosed,
} from "@/datatypes/LanguageServerConfigs";
import { ipcMain } from "electron";

const LanguageServerProcesses: Map<
  LanguageServerID,
  ChildProcessWithoutNullStreams | undefined
> = new Map();

function start({ executable, args }: LanguageServerExecutableArgs) {
  log.debug(`lsp new process: ${executable} `, args);
  const serverProcess = spawn(executable, args, {});
  const size = LanguageServerProcesses.size;
  const id = getNextLanguageServerID(size, executable);
  LanguageServerProcesses.set(id, serverProcess);
  return id;
}

function send(server: LanguageServerID, message: string) {
  log.debug(`lsp send: server:${server} message:${message}`);
  const serverProcess = LanguageServerProcesses.get(server);
  if (serverProcess === undefined) {
    const logMessage = `lsp send: ${server} not found`;
    log.debug(logMessage);
    return;
  }
  serverProcess.stdin.write(message);
}
function close(server: LanguageServerID) {
  log.debug(`lsp close: ${server}`);
  const serverProcess = LanguageServerProcesses.get(server);
  if (serverProcess === undefined) {
    const logMessage = `lsp close: ${server} not found`;
    log.debug(logMessage);
    return;
  }
  serverProcess.stdout.removeAllListeners("data");
  serverProcess.kill();
  // Delete may cause id conflict.
  LanguageServerProcesses.set(server, undefined);
}

// Define tRPC server interface.
const proc = server.procedure;
export const languageServerRouter = server.router({
  start: proc
    .input(LanguageServerExecutableArgsSchema)
    .output(LanguageServerIDSchema)
    .mutation(async (opts) => {
      return start(opts.input);
    }),
  send: proc
    .input(
      z.object({
        server: LanguageServerIDSchema,
        message: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { server, message } = opts.input;
      send(server, message);
    }),
  receive: proc.input(LanguageServerIDSchema).subscription(async (opts) => {
    const server = opts.input;
    log.debug(`lsp receive: ${server}`);
    const serverProcess = LanguageServerProcesses.get(server);
    if (serverProcess === undefined) {
      const logMessage = `lsp receive: ${server} not found`;
      log.debug(logMessage);
      return;
    }
    return observable<string>((emit) => {
      const onData = (data: Buffer) => {
        const message = data.toString();
        log.debug(`lsp receive from stdout: ${message}`);
        emit.next(message);
      };
      serverProcess.stdout.on("data", onData);
      return () => {
        serverProcess.stdout.removeListener("data", onData);
      };
    });
  }),
  close: proc.input(LanguageServerIDSchema).mutation(async (opts) => {
    const server = opts.input;
    close(server);
  }),
});

// Define electron IPC handlers interface.
ipcMain.handle(
  LanguageServerIPCChannel.start,
  (event, executable: string, args: string[]) => {
    const id = start({ executable, args });
    // Register the receiver now.
    LanguageServerProcesses.get(id)?.stdout.on("data", (data) => {
      const message = data.toString();
      log.debug(`lsp receive from stdout: ${message}`);
      ipcMain.emit(LanguageServerIPCChannelReceiver(id), message);
    });
    return id;
  }
);
ipcMain.handle(
  LanguageServerIPCChannel.send,
  (event, server: LanguageServerID, message: string) => {
    send(server, message);
  }
);
ipcMain.handle(
  LanguageServerIPCChannel.close,
  (event, server: LanguageServerID) => {
    close(server);
    ipcMain.emit(LanguageServerIPCChannelClosed(server));
  }
);
