import { z } from "zod";
import path from "node:path";

// TODO: Add "url" to kind
export const PathKindSchema = z.enum(["posix", "win32"]);
export type PathKind = z.infer<typeof PathKindSchema>;

export function pathOf(kind: PathKind): path.PlatformPath {
  if (kind === "win32") {
    return path.win32;
  }
  return path.posix;
}
