import { coerce, z } from "zod";

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

