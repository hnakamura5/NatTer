import { z } from "zod";

// TODO: Add "url" to kind
export const PathKindSchema = z.enum(["posix", "win32"]);
export type PathKind = z.infer<typeof PathKindSchema>;

export const FileStatScheme = z.object({
  fullPath: z.string(),
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
