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
import { pathOf } from "@/server/ShellUtils/pathAbstractionUtil";
import { chmod, chown } from "original-fs";

import { log } from "@/datatypes/Logger";

const proc = server.procedure;

function pathCanonicalize(filePath: string): string {
  return path.normalize(filePath);
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
      await fs.rename(src, dest);
    }),

  remove: proc.input(z.string()).mutation(async (opts) => {
    const filePath = opts.input;
    fs.rm(path.normalize(filePath), { recursive: true, force: true });
    return;
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
      await fs.copyFile(src, dest);
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
      const pathLib = pathKind ? pathOf(pathKind) : path;
      const parsed = pathLib.parse(pathLib.normalize(fullPath));
      // All hierarchies including the root as the first element
      const dirHier = parsed.dir.slice(parsed.root.length).split(pathLib.sep);
      dirHier.unshift(parsed.root);
      return {
        dir: parsed.dir,
        root: parsed.root,
        dirHier: dirHier,
        base: parsed.base,
        baseStem: parsed.name,
        baseExt: parsed.ext,
        sep: pathLib.sep,
      };
    }),
});
