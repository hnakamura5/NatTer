import nodePath, { win32, posix, PlatformPath } from "node:path";
import { UniversalPath } from "@/datatypes/UniversalPath";
import { PathKind } from "@/datatypes/SshConfig";

export function pathOf(kind?: PathKind): PlatformPath {
  if (kind === "win32") {
    return win32;
  } else if (kind === "posix") {
    return posix;
  }
  // Application's OS Local path.
  return nodePath;
}

export function univLift<T>(
  uPath: UniversalPath,
  func: (pathLib: PlatformPath, path: UniversalPath["path"]) => T
) {
  return func(pathOf(uPath.remoteHost?.pathKind), uPath.path);
}

export function univConvert(
  uPath: UniversalPath,
  func: (
    pathLib: PlatformPath,
    path: UniversalPath["path"]
  ) => UniversalPath["path"]
) {
  return {
    ...uPath,
    path: func(pathOf(uPath.remoteHost?.pathKind), uPath.path),
  };
}

export namespace univPath {
  export function join(uPath: UniversalPath, ...args: string[]) {
    return univConvert(uPath, (pathLib, path) => pathLib.join(path, ...args));
  }
  export function normalize(uPath: UniversalPath) {
    return univConvert(uPath, (pathLib, path) => pathLib.normalize(path));
  }
  export function resolve(uPath: UniversalPath, ...args: string[]) {
    return univConvert(uPath, (pathLib, path) =>
      pathLib.resolve(path, ...args)
    );
  }
  export function parse(uPath: UniversalPath) {
    return univLift(uPath, (pathLib, path) => pathLib.parse(path));
  }
  export function dirname(uPath: UniversalPath) {
    return univConvert(uPath, (pathLib, path) => pathLib.dirname(path));
  }
  export function basename(uPath: UniversalPath) {
    return univLift(uPath, (pathLib, path) => pathLib.basename(path));
  }
  export function equal(uPath1: UniversalPath, uPath2: UniversalPath) {
    return (
      uPath1.path === uPath2.path &&
      uPath1.remoteHost?.host === uPath2.remoteHost?.host
    );
  }
}
