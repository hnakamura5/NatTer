import { server } from "@/server/tRPCServer";
import { z } from "zod";
import {
  PathKind,
  PathKindSchema,
  FileStatScheme,
} from "@/datatypes/PathAbstraction";
import path from "node:path";
import fs from "node:fs/promises";
import { pathOf } from "@/server/pathAbstractionUtil";
import { chmod, chown } from "original-fs";
import { logger } from "@/datatypes/Logger";

const proc = server.procedure;

function pathCanonicalize(filePath: string): string {
  return path.normalize(filePath);
}

export const fileSystemRouter = server.router({
  list: proc
    .input(z.string())
    .output(z.array(z.string()))
    .query(async (opts) => {
      const filePath = opts.input;
      return fs.readdir(path.normalize(filePath));
    }),

  sep :proc
    .output(z.string())
    .query(async () => {
      return path.sep;
    }),

  stat: proc
    .input(z.string())
    .output(FileStatScheme)
    .query(async (opts) => {
      const filePath = opts.input;
      const stats = fs.stat(path.normalize(filePath));
      return stats
        .then((stats) => {
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
        })
        .catch((err) => {
          logger.logTrace(`Failed to stat ${filePath}: ${err}`);
          throw err;
        });
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
    .input(z.string())
    .output(
      z.object({
        dir: z.string(),
        dirList: z.array(z.string()),
        base: z.string(),
        ext: z.string(),
        stem: z.string(),
      })
    )
    .query(async (opts) => {
      const filePath = opts.input;
      const parsed = path.parse(path.normalize(filePath));
      const dirList = parsed.dir.split(path.sep);
      return {
        dir: parsed.dir,
        dirList,
        base: parsed.base,
        ext: parsed.ext,
        stem: parsed.name,
      };
    }),
});
