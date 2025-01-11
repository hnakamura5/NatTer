import { server } from "@/server/tRPCServer";
import { z } from "zod";
import {
  PathKind,
  PathKindSchema,
  FileStatScheme,
  PathParsedScheme,
} from "@/datatypes/PathAbstraction";
import path from "node:path";
import fs from "node:fs/promises";
import { shell } from "electron";
import { pathOf } from "@/server/ShellUtils/pathAbstractionUtil";
import { chmod, chown } from "original-fs";

import { log } from "@/datatypes/Logger";
import { observable } from "@trpc/server/observable";
import { EventEmitter, on } from "node:events";

const proc = server.procedure;

function pathCanonicalize(filePath: string): string {
  return path.normalize(filePath);
}

const eventEmitter = new EventEmitter();
function changeFileEvent(filePath: string) {
  changeDirectoryEvent(path.dirname(filePath));
}
function changeDirectoryEvent(filePath: string) {
  eventEmitter.emit("change", filePath);
}

const directoryPathScheme = z.string().refine(async (path) => {
  return await fs.stat(path).then((stats) => {
    return stats.isDirectory();
  });
});

function parsePath(fullPath: string, pathKind?: PathKind) {
  const pathLib = pathKind ? pathOf(pathKind) : path;
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
    .input(z.string())
    .output(z.array(z.string()))
    .query(async (opts) => {
      const filePath = opts.input;
      return fs.readdir(path.normalize(filePath)).catch((err) => {
        return [] as string[];
      });
    }),

  sep: proc.output(z.string()).query(async () => {
    return path.sep;
  }),

  stat: proc
    .input(z.string())
    .output(FileStatScheme.optional())
    .query(async (opts) => {
      const filePath = opts.input;
      try {
        const stats = fs.stat(path.normalize(filePath));
        return stats.then((stats) => {
          return {
            fullPath: filePath,
            baseName: path.basename(filePath),
            isDir: stats.isDirectory(),
            isSymlink: stats.isSymbolicLink(),
            modifiedTime: stats.mtime.toISOString(),
            changedTime: stats.ctime.toISOString(),
            accessedTime: stats.atime.toISOString(),
            birthTime: stats.birthtime.toISOString(),
            byteSize: stats.size,
            permissionMode: stats.mode,
          };
        });
      } catch (err) {
        log.error(`Failed to stat ${filePath}: ${err}`);
        return undefined;
      }
    }),

  move: proc
    .input(
      z.object({
        src: z.string(),
        dest: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { src, dest } = opts.input;
      if (src !== dest) {
        await fs.rename(src, dest);
        changeFileEvent(src);
        changeFileEvent(dest);
      }
    }),

  moveTo: proc
    .input(
      z.object({
        src: z.string(),
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      if (src !== destDir) {
        await fs.rename(src, path.join(destDir, path.basename(src)));
        changeFileEvent(src);
        changeDirectoryEvent(destDir);
      }
    }),

  moveStructural: proc
    .input(
      z.object({
        src: z.array(z.string()),
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      log.debug(`moveStructural: mutation ${src} -> ${destDir}`);
      moveStructural(src, destDir);
    }),

  remove: proc.input(z.string()).mutation(async (opts) => {
    const filePath = opts.input;
    fs.rm(path.normalize(filePath), { recursive: true, force: true }).then(
      () => {
        changeFileEvent(filePath);
      }
    );
  }),

  trash: proc.input(z.string()).mutation(async (opts) => {
    const filePath = opts.input;
    shell.trashItem(path.normalize(filePath)).then(() => {
      changeFileEvent(filePath);
    });
  }),

  copy: proc
    .input(
      z.object({
        src: z.string(),
        dest: z.string(),
      })
    )
    .mutation(async (opts) => {
      const { src, dest } = opts.input;
      if (src !== dest) {
        await fs.copyFile(src, dest);
        changeFileEvent(src);
        changeFileEvent(dest);
      }
    }),

  copyTo: proc
    .input(
      z.object({
        src: z.string(),
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      if (src !== destDir) {
        await fs.copyFile(src, path.join(destDir, path.basename(src)));
        changeFileEvent(src);
        changeDirectoryEvent(destDir);
      }
    }),

  copyStructural: proc
    .input(
      z.object({
        src: z.array(z.string()),
        destDir: directoryPathScheme,
      })
    )
    .mutation(async (opts) => {
      const { src, destDir } = opts.input;
      copyStructural(src, destDir);
    }),

  makeDir: proc
    .input(z.object({ parent: z.string(), name: z.string() }))
    .mutation(async (opts) => {
      const { parent, name } = opts.input;
      await fs.mkdir(path.join(parent, name));
    }),

  makeFile: proc
    .input(z.object({ parent: z.string(), name: z.string() }))
    .mutation(async (opts) => {
      const { parent, name } = opts.input;
      await fs.writeFile(path.join(parent, name), "");
    }),

  changeOwner: proc
    .input(
      z.object({
        filePath: z.string(),
        uid: z.number(),
        gid: z.number(),
      })
    )
    .mutation(async (opts) => {
      const { filePath, uid, gid } = opts.input;
      await fs.chown(path.normalize(filePath), uid, gid);
    }),

  changePermissionMode: proc
    .input(
      z.object({
        filePath: z.string(),
        mode: z.number(),
      })
    )
    .mutation(async (opts) => {
      const { filePath, mode } = opts.input;
      await fs.chmod(path.normalize(filePath), mode);
    }),

  parsePath: proc
    .input(
      // If pathKind is not provided, use the OS's default path kind
      z.object({ fullPath: z.string(), pathKind: PathKindSchema.optional() })
    )
    .output(PathParsedScheme)
    .query(async (opts) => {
      const { fullPath, pathKind } = opts.input;
      return parsePath(fullPath, pathKind);
    }),

  parsePathAsync: proc
    .input(
      z.object({ fullPath: z.string(), pathKind: PathKindSchema.optional() })
    )
    .output(PathParsedScheme)
    .mutation(async (opts) => {
      const { fullPath, pathKind } = opts.input;
      return parsePath(fullPath, pathKind);
    }),

  pollChange: proc.input(z.string()).subscription(async (opts) => {
    const filePath = opts.input;
    const isDir = (await fs.stat(filePath)).isDirectory();
    return observable<boolean>((observer) => {
      const onChange = (changedPath: string) => {
        if (changedPath === filePath) {
          log.debug(`pollChange: ${filePath} changed`);
          observer.next(true);
        }
      };
      if (isDir) {
        eventEmitter.on("change", onChange);
        return () => {
          eventEmitter.off("change", onChange);
        };
      }
    });
  }),
});

// If one of the src contains other ones in src, keeps the structure in destination.
export function structuralSrcToDest(
  src: string[],
  destDir: string
): [string, string][] {
  const result: [string, string][] = [];
  const sorted = src.sort();
  for (let i = 0; i < sorted.length; i++) {
    const srcPath = sorted[i];
    const destPath = path.join(destDir, path.basename(srcPath));
    let childAdded = false;
    for (let j = i + 1; j < sorted.length; j++) {
      const srcPathMayChild = sorted[j];
      if (srcPathMayChild.startsWith(srcPath)) {
        const destPathChild = path.join(
          destPath,
          srcPathMayChild.slice(srcPath.length)
        );
        result.push([srcPathMayChild, destPathChild]);
        childAdded = true;
        i = j;
      } else {
        break;
      }
    }
    if (!childAdded) {
      result.push([srcPath, destPath]);
    }
  }
  return result;
}

async function exists(dir: string): Promise<boolean> {
  return fs
    .access(dir)
    .then(() => true)
    .catch(() => false);
}

async function operationStructural(
  src: string[],
  destDir: string,
  operation: (src: string, dest: string) => Promise<void>,
  logName?: string
) {
  const srcToDest = structuralSrcToDest(src, destDir);
  for (const [srcPath, destPath] of srcToDest) {
    if (srcPath !== destPath) {
      const destPathDir = path.dirname(destPath);
      if (!(await exists(destPathDir))) {
        await fs.mkdir(destPathDir, { recursive: true });
      }
      log.debug(`${logName} ${srcPath} -> ${destPath}`);
      operation(srcPath, destPath)
        .then(() => {
          changeDirectoryEvent(destDir);
        })
        .catch((err) => {
          log.error(`error ${logName} ${srcPath} -> ${destPath}: ${err}`);
        });
      changeFileEvent(srcPath);
    }
  }
}

async function moveStructural(src: string[], destDir: string) {
  operationStructural(src, destDir, fs.rename, "moveStructural");
}

async function copyStructural(src: string[], destDir: string) {
  operationStructural(src, destDir, fs.copyFile, "copyStructural");
}
