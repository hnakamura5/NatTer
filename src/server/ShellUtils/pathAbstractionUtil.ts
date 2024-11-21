import path from "node:path";
import { PathKind } from "@/datatypes/PathAbstraction";

export function pathOf(kind: PathKind): path.PlatformPath {
  if (kind === "win32") {
    return path.win32;
  }
  return path.posix;
}
