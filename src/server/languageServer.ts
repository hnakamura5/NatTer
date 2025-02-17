import { log } from "@/datatypes/Logger";
import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import {
  LanguageServerID,
  LanguageServerIDSchema,
  LanguageServerExecutableArgs,
  LanguageServerConfigSchema,
  getNextLanguageServerID,
} from "@/components/LanguageServerConfigs";
import * as jsonrpc from "vscode-jsonrpc/node";
import { readConfig } from "./configServer";

import path from "node:path";
import fs from "node:fs/promises";
import { createHash } from "crypto";

const LanguageServerProcesses: Map<
  LanguageServerID,
  | [
      ChildProcessWithoutNullStreams,
      jsonrpc.MessageReader,
      jsonrpc.MessageWriter
    ]
  | undefined
> = new Map();

function start({ executable, args }: LanguageServerExecutableArgs) {
  log.debug(`lsp server new process: ${executable} `, args);
  const serverProcess = spawn(executable, args, {});
  const reader = new jsonrpc.StreamMessageReader(serverProcess.stdout);
  const writer = new jsonrpc.StreamMessageWriter(serverProcess.stdin);
  const size = LanguageServerProcesses.size;
  const id = getNextLanguageServerID(size, executable);
  LanguageServerProcesses.set(id, [serverProcess, reader, writer]);
  serverProcess.stdout.on("data", (data) => {
    // To dispose the spawned command itself.
    log.debug(`lsp server receive from stdout after start: ${data}`);
  });
  serverProcess.stderr.on("data", (data) => {
    log.debug(`lsp server receive from stderr after start: ${data}`);
  });
  return id;
}

function send(server: LanguageServerID, message: string) {
  const [serverProcess, reader, writer] =
    LanguageServerProcesses.get(server) || [];
  if (serverProcess === undefined) {
    const logMessage = `lsp server send: ${server} not found message=${message}`;
    log.debug(logMessage);
    return;
  }
  log.debug(`lsp server send: server:${server} message=${message}`);
  // serverProcess.stdin.write(message + "\n");
  writer?.write(JSON.parse(message));
}
function close(server: LanguageServerID) {
  log.debug(`lsp server close: ${server}`);
  const [serverProcess, reader, writer] =
    LanguageServerProcesses.get(server) || [];
  if (serverProcess === undefined) {
    const logMessage = `lsp server close: ${server} not found`;
    log.debug(logMessage);
    return;
  }
  reader?.dispose();
  writer?.dispose();
  serverProcess.stdout.removeAllListeners("data");
  serverProcess.kill();
  // Delete may cause id conflict.
  LanguageServerProcesses.set(server, undefined);
}

async function makeBufferFile(server: LanguageServerID) {
  const hash = createHash("sha1").update(server).digest("hex").slice(0, 16);
  const fileName = `temp-${hash}`;
  const dir = await readConfig().then((config) => {
    return config.lspTempDir!;
  });
  const filePath = path.join(dir, fileName);
  log.debug(`makeBufferFile: ${filePath}`);
  return fs.mkdir(dir, { recursive: true }).then(() => {
    return fs
      .writeFile(filePath, "\n")
      .then(() => {
        return filePath;
      })
      .catch((e) => {
        const message = `makeBufferFile: Failed to save buffer to ${filePath}`;
        log.debugTrace(message, e);
        throw new Error(message);
      });
  });
}

async function removeBufferFile(filePath: string) {
  log.debug(`removeBufferFile: ${filePath}`);
  await fs.rm(filePath);
}

// Define tRPC server interface.
const proc = server.procedure;
export const languageServerRouter = server.router({
  start: proc
    .input(LanguageServerConfigSchema)
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
    log.debug(`lsp server receive subscript: ${server}`);
    const [serverProcess, reader, writer] =
      LanguageServerProcesses.get(server) || [];
    if (serverProcess === undefined || reader === undefined) {
      const logMessage = `lsp server receive: ${server} not found`;
      log.debug(logMessage);
      return;
    }
    return observable<string>((emit) => {
      const onMessage = (data: jsonrpc.Message) => {
        log.debug(`lsp server receive from reader: `, data);
        const message = JSON.stringify(data);
        log.debug(`lsp server receive from reader message: ${message}`);
        emit.next(message);
      };
      serverProcess.stdout.removeAllListeners("data");
      serverProcess.stdout.on("data", (data) => {
        const message = data.toString();
        // To dispose the spawned command itself.
        log.debug(`lsp server receive from stdout: ${message}`);
      });
      reader.listen(onMessage);
      return () => {};
    });
  }),
  close: proc.input(LanguageServerIDSchema).mutation(async (opts) => {
    const server = opts.input;
    close(server);
  }),
  // Make temp file works as buffer for the server.
  makeBufferFile: proc
    .input(LanguageServerIDSchema)
    .output(z.string())
    .mutation(async (opts) => {
      const server = opts.input;
      return makeBufferFile(server);
    }),
  removeBufferFile: proc.input(z.string()).mutation(async (opts) => {
    removeBufferFile(opts.input);
  }),
});
