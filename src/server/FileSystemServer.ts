import { server } from "@/server/tRPCServer";
import { z } from "zod";
import {
  FileStatScheme,
  PathParsedScheme,
  UniversalPathScheme,
  UniversalPath,
  UniversalPathArrayScheme,
  UniversalPathArray,
} from "@/datatypes/UniversalPath";
import { PathKind, PathKindSchema } from "@/datatypes/SshConfig";
import path from "node:path";
import fs from "node:fs/promises";

// Fix for  https://github.com/withastro/astro/issues/8660#issuecomment-1733313988
import * as Electron from "electron";

import { pathOf, univPath } from "@/server/FileSystem/univPath";
import { chmod, chown } from "original-fs";

import { log } from "@/datatypes/Logger";
import { observable } from "@trpc/server/observable";
import { EventEmitter, on } from "node:events";

import { readConfig } from "./configServer";
import { univFs } from "./FileSystem/univFs";

const proc = server.procedure;

const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(1000);
function changeFileEvent(uPath: UniversalPath) {
  changeDirectoryEvent(univPath.dirname(uPath));
}
function changeDirectoryEvent(uPath: UniversalPath) {
  eventEmitter.emit(uPath.path);
}

const directoryPathScheme = UniversalPathScheme;

function parsePath(uPath: UniversalPath) {
  const fullPath = uPath.path;
  const pathLib = pathOf(uPath.remoteHost?.pathKind);
  const normalizedPath = pathLib.normalize(fullPath);
  const parsed = pathLib.parse(normalizedPath);
  // All hierarchies including the root as the first element
  const nonRootPart = parsed.dir.slice(parsed.root.length);
  const dirHier = nonRootPart.length == 0 ? [] : nonRootPart.split(pathLib.sep);
  dirHier.unshift(parsed.root);
  if (parsed.base.length > 0) {
    dirHier.push(parsed.base);
  }
  return {
    fullPath: normalizedPath,
    dir: parsed.dir,
    root: parsed.root,
    dirHier: dirHier,
    base: parsed.base,
    baseStem: parsed.name,
    baseExt: parsed.ext,
    sep: pathLib.sep,
  };
}

// TODO: add remote support.
export const fileSystemRouter = server.router({
  list: proc
    .input(UniversalPathScheme)
    .output(z.array(z.string()))
    .query(async (opts) => {
      const filePath = opts.input;
      return univFs.list(filePath).catch(() => {
        return [] as string[];
      });
    }),

  stat: proc
    .input(UniversalPathScheme)
    .output(FileStatScheme.optional())
    .query(async (opts) => {
      return await univFs.stat(opts.input);
    }),

  move: proc
    .input(
      z.object({
        src: UniversalPathScheme,
        dest: UniversalPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, dest } = opts.input;
      if (src !== dest) {
        await univFs.move(src, dest);
        changeFileEvent(src);
        changeFileEvent(dest);
      }
    }),

  moveTo: proc
    .input(
      z.object({
        src: UniversalPathScheme,
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      await univFs.move(src, destDir);
      if (src !== destDir) {
        await univFs.move(src, univPath.join(destDir, univPath.basename(src)));
        changeFileEvent(src);
        changeDirectoryEvent(destDir);
      }
    }),

  moveStructural: proc
    .input(
      z.object({
        src: UniversalPathArrayScheme,
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      log.debug(`moveStructural: mutation ${src} -> ${destDir}`);
      moveStructural(src, destDir);
    }),

  remove: proc.input(UniversalPathScheme).mutation(async (opts) => {
    const filePath = opts.input;
    univFs
      .rm(univPath.normalize(filePath), { recursive: true, force: true })
      .then(() => {
        changeFileEvent(filePath);
      });
  }),

  trash: proc.input(UniversalPathScheme).mutation(async (opts) => {
    const filePath = opts.input;
    if (filePath.remoteHost) {
      univFs.rm(univPath.normalize(filePath), { recursive: true, force: true });
    } else {
      Electron.shell.trashItem(univPath.normalize(filePath).path).then(() => {
        changeFileEvent(filePath);
      });
    }
  }),

  copy: proc
    .input(
      z.object({
        src: UniversalPathScheme,
        dest: UniversalPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, dest } = opts.input;
      if (src !== dest) {
        await univFs.copy(src, dest);
        changeFileEvent(src);
        changeFileEvent(dest);
      }
    }),

  copyTo: proc
    .input(
      z.object({
        src: UniversalPathScheme,
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      if (src !== destDir) {
        await univFs.copy(src, univPath.join(destDir, univPath.basename(src)));
        changeFileEvent(src);
        changeDirectoryEvent(destDir);
      }
    }),

  copyStructural: proc
    .input(
      z.object({
        src: UniversalPathArrayScheme,
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      copyStructural(src, destDir);
    }),

  makeDir: proc
    .input(z.object({ parent: UniversalPathScheme, name: z.string() }))
    .mutation(async (opts) => {
      const { parent, name } = opts.input;
      await univFs.mkdir(univPath.join(parent, name));
    }),

  makeFile: proc
    .input(z.object({ parent: UniversalPathScheme, name: z.string() }))
    .mutation(async (opts) => {
      const { parent, name } = opts.input;
      await univFs.writeFile(univPath.join(parent, name), "");
    }),

  changePermissionMode: proc
    .input(
      z.object({
        filePath: UniversalPathScheme,
        mode: z.number(),
      })
    )
    .mutation(async (opts) => {
      const { filePath, mode } = opts.input;
      await univFs.chmod(univPath.normalize(filePath), mode);
    }),

  parsePath: proc
    .input(UniversalPathScheme)
    .output(PathParsedScheme)
    .query(async (opts) => {
      return parsePath(opts.input);
    }),

  parsePathAsync: proc
    .input(UniversalPathScheme)
    .output(PathParsedScheme)
    .mutation(async (opts) => {
      return parsePath(opts.input);
    }),

  pathExistsAsync: proc
    .input(
      z.object({
        fullPath: UniversalPathScheme,
        fileOrDir: z
          .union([z.literal("file"), z.literal("directory")])
          .optional(),
      })
    )
    .output(z.boolean())
    .mutation(async (opts) => {
      const { fullPath, fileOrDir } = opts.input;
      return univFs
        .exists(fullPath)
        .then((exists) => {
          if (!exists) {
            return false;
          }
          if (!fileOrDir) {
            return true;
          }
          return univFs.stat(fullPath).then((stats) => {
            if (fileOrDir === "file") {
              return stats.isFile;
            } else {
              return stats.isDir;
            }
          });
        })
        .catch(() => false);
    }),

  pollChange: proc.input(UniversalPathScheme).subscription(async (opts) => {
    try {
      const filePath = opts.input;
      log.debug(`pollChange start: `, filePath);
      const isDir = (await univFs.stat(filePath)).isDir;
      return observable<boolean>((observer) => {
        const onChange = () => {
          log.debug(`pollChange: ${filePath} changed`);
          observer.next(true);
        };
        if (isDir) {
          // Invoke change event even if the host is different.
          // This may cause false positive but the cost is just refetching.
          eventEmitter.on(filePath.path, onChange);
          return () => {
            eventEmitter.off(filePath.path, onChange);
          };
        }
      });
    } catch (e) {
      log.debug("pollChange error:", e);
    }
  }),
});

// If one of the src contains other ones in src, keeps the structure in destination.
export function structuralSrcToDest(
  src: UniversalPathArray,
  destDir: UniversalPath
): [string, string][] {
  const result: [string, string][] = [];
  const sorted = src.paths.sort((x, y) => (x < y ? -1 : 1));
  for (let i = 0; i < sorted.length; i++) {
    const srcPath = sorted[i];
    const destPath = univPath.join(
      destDir,
      univPath.basename({ path: srcPath, remoteHost: src.remoteHost })
    );
    let childAdded = false;
    for (let j = i + 1; j < sorted.length; j++) {
      const srcPathMayChild = sorted[j];
      // If one is the prefix of the other, keep the structure.
      if (srcPathMayChild.startsWith(srcPath)) {
        const destPathChild = univPath.join(
          destPath,
          srcPathMayChild.slice(srcPath.length)
        );
        result.push([srcPathMayChild, destPathChild.path]);
        childAdded = true;
        i = j;
      } else {
        break;
      }
    }
    if (!childAdded) {
      result.push([srcPath, destPath.path]);
    }
  }
  return result;
}

async function operationStructural(
  src: UniversalPathArray,
  destDir: UniversalPath,
  operation: (src: UniversalPath, dest: UniversalPath) => Promise<void>,
  logName?: string
) {
  const srcToDest = structuralSrcToDest(src, destDir);
  for (const [srcPath, destPath] of srcToDest) {
    if (srcPath !== destPath) {
      const destPathDir = univPath.dirname({
        path: destPath,
        remoteHost: src.remoteHost,
      });
      if (!(await univFs.exists(destPathDir))) {
        await univFs.mkdir(destPathDir, /*recursive:*/ true);
      }
      log.debug(`${logName} ${srcPath} -> ${destPath}`);
      operation(
        { path: srcPath, remoteHost: src.remoteHost },
        { path: destPath, remoteHost: destDir.remoteHost }
      )
        .then(() => {
          changeDirectoryEvent(destDir);
        })
        .catch((err) => {
          log.error(`error ${logName} ${srcPath} -> ${destPath}: ${err}`);
        });
      changeFileEvent({ path: srcPath, remoteHost: src.remoteHost });
    }
  }
}

async function moveStructural(src: UniversalPathArray, destDir: UniversalPath) {
  operationStructural(src, destDir, univFs.move, "moveStructural");
}

async function copyStructural(src: UniversalPathArray, destDir: UniversalPath) {
  operationStructural(src, destDir, univFs.copy, "copyStructural");
}
