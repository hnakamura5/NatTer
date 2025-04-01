import SFTPClient from "ssh2-sftp-client";
import {
  RemoteHost,
  sshConnectionToConnectConfig,
} from "@/datatypes/SshConfig";
import { readConfig } from "@/server/configServer";
import {
  FileStat,
  UniversalPath,
  isRemote,
  univPathToString,
} from "@/datatypes/UniversalPath";
import fs from "node:fs/promises";
import pathLibLocal from "node:path";

import { createHash } from "crypto";

import { log } from "@/datatypes/Logger";
import { univLift, univPath } from "./univPath";
import { localTempDir } from "../ConfigUtils/paths";

export type RemoteHostID = string;

export function remoteHostID(config: RemoteHost): RemoteHostID {
  return createHash("sha256")
    .update(
      JSON.stringify({
        host: config.host,
        port: config.port,
        username: config.username,
      })
    )
    .digest("hex");
}
const remoteConnections = new Map<RemoteHostID, SFTPClient>();
const remoteUninitializedConnections = new Map<RemoteHostID, SFTPClient>();
const initializedEventHandlers = new Map<RemoteHostID, (() => void)[]>();

async function getRemoteClient(remote: RemoteHost): Promise<SFTPClient> {
  const id = remoteHostID(remote);
  const client = remoteConnections.get(id);
  if (client !== undefined) {
    return client;
  }
  if (remoteUninitializedConnections.has(id)) {
    return new Promise<SFTPClient>((resolve, reject) => {
      initializedEventHandlers.set(id, [
        () => {
          resolve(remoteConnections.get(id)!);
        },
        ...(initializedEventHandlers.get(id) || []),
      ]);
    });
  }
  const newClient = new SFTPClient();
  remoteUninitializedConnections.set(id, newClient);
  await readConfig().then(async (config) => {
    for (const shell of config.shells) {
      if (shell.type === "ssh") {
        const connection = shell.connection;
        if (
          remote.host === connection.host &&
          remote.port === connection.port &&
          remote.username === connection.username
        ) {
          // Connect to the remote host.
          await newClient.connect(sshConnectionToConnectConfig(connection));
          remoteConnections.set(id, newClient);
          remoteUninitializedConnections.delete(id);
          for (const handler of initializedEventHandlers.get(id) || []) {
            handler();
          }
          initializedEventHandlers.delete(id);
          return;
        }
      }
    }
    log.debug("No remote credentials found", remote);
    throw new Error("No remote credentials found");
  });
  return newClient;
}

async function moveOrCopy(
  src: UniversalPath,
  dest: UniversalPath,
  copy: boolean
): Promise<void> {
  const srcStats = await univFs.stat(src);
  if (isRemote(src)) {
    const clientSrc = await getRemoteClient(src.remoteHost!);
    if (isRemote(dest)) {
      // Remote to remote.
      if (remoteHostID(src.remoteHost!) === remoteHostID(dest.remoteHost!)) {
        // Same remote host.
        log.debug(
          `${copy ? "Copy" : "Move"} remote in same host ${
            src.remoteHost?.host
          }: ${src.path} to ${dest.path}`
        );
        if (copy) {
          clientSrc.rcopy(src.path, dest.path);
        } else {
          clientSrc.rename(src.path, dest.path);
        }
      } else {
        // Different remote host. Download and upload.
        const clientDest = await getRemoteClient(dest.remoteHost!);
        const localTempSrc = pathLibLocal.join(
          localTempDir(),
          univPath.basename(src)
        );
        if (srcStats.isDir) {
          log.debug(
            `${copy ? "Copy" : "Move"} remote dir to remote: ${univPathToString(
              src
            )} to ${univPathToString(dest)}, local temp: ${localTempSrc}`
          );
          await clientSrc.downloadDir(src.path, localTempSrc);
          await clientDest.uploadDir(localTempSrc, src.path);
          if (!copy) {
            await univFs.rmdir(src);
          }
        } else {
          log.debug(
            `${
              copy ? "Copy" : "Move"
            } remote file to remote: ${univPathToString(
              src
            )} to ${univPathToString(dest)}, local temp: ${localTempSrc}`
          );
          await clientSrc.get(src.path, localTempSrc);
          await clientDest.put(localTempSrc, dest.path);
          if (!copy) {
            await univFs.rm(src);
          }
        }
        await fs.rm(localTempSrc);
      }
    } else {
      // Remote to local.
      if (srcStats.isDir) {
        log.debug(
          `${copy ? "Copy" : "Move"} remote dir to local: ${src.path} to ${
            dest.path
          }`
        );
        await clientSrc.downloadDir(src.path, dest.path);
        if (!copy) {
          await univFs.rmdir(src);
        }
      } else {
        log.debug(
          `${copy ? "Copy" : "Move"} remote file to local: ${src.path} to ${
            dest.path
          }`
        );
        await clientSrc.get(src.path, dest.path);
        if (!copy) {
          await univFs.rm(src);
        }
      }
    }
  } else {
    if (isRemote(dest)) {
      // Local to remote.
      const client = await getRemoteClient(dest.remoteHost!);
      if (srcStats.isDir) {
        log.debug(
          `${copy ? "Copy" : "Move"} local dir to remote: ${src.path} to ${
            dest.path
          }`
        );
        await client.uploadDir(src.path, dest.path);
      } else {
        log.debug(
          `${copy ? "Copy" : "Move"} local file to remote: ${src.path} to ${
            dest.path
          }`
        );
        await client.put(src.path, dest.path);
      }
      if (!copy) {
        await univFs.rm(src);
      }
    } else {
      // Local to local.
      log.debug(
        `${copy ? "Copy" : "Move"} local file to local: ${src.path} to ${
          dest.path
        }`
      );
      if (copy) {
        await fs.copyFile(src.path, dest.path);
      } else {
        await fs.rename(src.path, dest.path);
      }
    }
  }
}

export namespace univFs {
  export async function readFile(uPath: UniversalPath): Promise<Buffer> {
    if (isRemote(uPath)) {
      getRemoteClient(uPath.remoteHost!).then(async (client) => {
        const result = await client.get(uPath.path);
        log.debug(`Read file from remote: ${uPath.path}`);
        return result;
      });
    }
    return fs.readFile(uPath.path);
  }

  export async function writeFile(
    uPath: UniversalPath,
    data: string,
    append?: boolean
  ): Promise<void> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      log.debug(`Start write file to remote: ${uPath.path} << ${data}`);
      const fileExists = await exists(uPath);
      await new Promise((resolve, reject) => {
        client
          .createWriteStream(uPath.path, {
            autoClose: true,
            flags: append && fileExists ? "a" : "w",
          })
          .write(data, () => {
            resolve(null);
          });
      }).catch((e) => {
        log.debug("Failed to write ", e);
      });
      log.debug(`Wrote file to remote: ${uPath.path}`);
    } else {
      fs.writeFile(uPath.path, data, { flag: append ? "a" : "w" });
    }
  }

  export async function stat(uPath: UniversalPath): Promise<FileStat> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      const stats = await client.stat(uPath.path);
      log.debug(`Stat file from remote: ${uPath.path}`);
      const mtime = new Date(stats.modifyTime).toISOString();
      const atime = new Date(stats.accessTime).toISOString();
      return univLift(uPath, (pathLib, path) => ({
        fullPath: pathLib.normalize(path),
        baseName: pathLib.basename(path),
        isFile: stats.isFile,
        isDir: stats.isDirectory,
        isSymlink: stats.isSymbolicLink,
        isFIFO: stats.isFIFO,
        isSocket: stats.isSocket,
        isBlockDevice: stats.isBlockDevice,
        modifiedTime: mtime,
        changedTime: mtime,
        accessedTime: atime,
        birthTime: mtime,
        byteSize: stats.size,
        permissionMode: stats.mode,
      }));
    } else {
      const stats = await fs.stat(uPath.path);
      log.debug(`Stat file from local: ${uPath.path}`);
      return univLift(uPath, (pathLib, path) => ({
        fullPath: pathLib.normalize(path),
        baseName: pathLib.basename(path),
        isFile: stats.isFile(),
        isDir: stats.isDirectory(),
        isSymlink: stats.isSymbolicLink(),
        isFIFO: stats.isFIFO(),
        isSocket: stats.isSocket(),
        isBlockDevice: stats.isBlockDevice(),
        modifiedTime: stats.mtime.toISOString(),
        changedTime: stats.ctime.toISOString(),
        accessedTime: stats.atime.toISOString(),
        birthTime: stats.birthtime.toISOString(),
        byteSize: stats.size,
        permissionMode: stats.mode,
      }));
    }
  }

  export async function list(uPath: UniversalPath): Promise<string[]> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      const files = await client.list(uPath.path);
      log.debug(`List files from remote: ${uPath.path}`);
      return files.map((f) => f.name);
    } else {
      const files = await fs.readdir(uPath.path);
      log.debug(`List files from local: ${uPath.path}`);
      return files;
    }
  }

  export async function mkdir(
    uPath: UniversalPath,
    recursive?: boolean
  ): Promise<void> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      await client.mkdir(uPath.path, recursive).catch((e) => {
        log.debug(e);
      });
      log.debug(`Mkdir from remote: ${uPath.path}`);
    } else {
      await fs.mkdir(uPath.path, { recursive });
    }
  }

  export async function rmdir(uPath: UniversalPath): Promise<void> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      await client.rmdir(uPath.path);
      log.debug(`Rmdir from remote: ${uPath.path}`);
    } else {
      await fs.rmdir(uPath.path);
    }
  }

  export async function rm(
    uPath: UniversalPath,
    options?: { recursive?: boolean; force?: boolean }
  ): Promise<void> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      const stats = await stat(uPath);
      if (stats.isDir && options?.recursive) {
        await client.rmdir(uPath.path);
      } else {
        await client.delete(uPath.path);
      }
      log.debug(`Rm from remote: ${uPath.path}`);
    } else {
      await fs.rm(uPath.path, options);
    }
  }

  export async function move(
    src: UniversalPath,
    dest: UniversalPath
  ): Promise<void> {
    return await moveOrCopy(src, dest, false);
  }

  export async function copy(
    src: UniversalPath,
    dest: UniversalPath
  ): Promise<void> {
    return await moveOrCopy(src, dest, true);
  }

  export async function exists(uPath: UniversalPath): Promise<boolean> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      return client
        .stat(uPath.path)
        .then((s) => s != null)
        .catch(() => false);
    }
    return fs
      .access(uPath.path)
      .then(() => true)
      .catch(() => false);
  }

  export async function chmod(
    uPath: UniversalPath,
    mode: number
  ): Promise<void> {
    if (isRemote(uPath)) {
      const client = await getRemoteClient(uPath.remoteHost!);
      await client.chmod(uPath.path, mode);
    } else {
      await fs.chmod(uPath.path, mode);
    }
  }
}
