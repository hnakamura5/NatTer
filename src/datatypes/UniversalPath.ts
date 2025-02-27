import { z } from "zod";
import { RemoteHostSchema, SshConnectionSchema } from "./SshConfig";

// TODO: Add "url" to kind
export const PathKindSchema = z.enum(["posix", "win32"]);
export type PathKind = z.infer<typeof PathKindSchema>;

// "Universal" in the means that it supports POSIX/Windows remote/local paths
export const UniversalPathScheme = z.object({
  path: z.string(),
  kind: PathKindSchema,
  // For remote paths. undefined for local
  remoteHost: RemoteHostSchema.optional(),
});
export type UniversalPath = z.infer<typeof UniversalPathScheme>;

export function isRemote(path: UniversalPath) {
  return path.remoteHost !== undefined;
}

export const FileStatScheme = z.object({
  fullPath: z.string(),
  baseName: z.string(),
  isDir: z.boolean(),
  isSymlink: z.boolean(),
  modifiedTime: z.string(),
  changedTime: z.string(),
  accessedTime: z.string(),
  birthTime: z.string(),
  byteSize: z.number(),
  permissionMode: z.number(),
});

export type FileStat = z.infer<typeof FileStatScheme>;

export const PathParsedScheme = z.object({
  fullPath: z.string(),
  // Directory of the path
  dir: z.string(),
  // Root of the path. For example, "/" in Unix-like systems and "C:\" in Windows
  root: z.string(),
  // All hierarchies including the root as the first element
  dirHier: z.array(z.string()),
  // File name with extension
  base: z.string(),
  // Extension without the dot
  baseExt: z.string(),
  // File name without extension
  baseStem: z.string(),
  // Path separator of this file system
  sep: z.string(),
});

export type PathParsed = z.infer<typeof PathParsedScheme>;
