import { createContext, useContext } from "react";
import { UniversalPath, UniversalPathArray } from "@/datatypes/UniversalPath";
import { RemoteHost } from "@/datatypes/SshConfig";

import { api } from "@/api";
import { log } from "@/datatypes/Logger";

// Global handle in FileManager.
// Access to file system and OS. Given from outside?
export interface FileManagerHandle {
  move: (src: UniversalPath, dest: UniversalPath) => void;
  moveTo: (src: UniversalPath, destDir: UniversalPath) => void;
  moveStructural: (src: UniversalPathArray, destDir: UniversalPath) => void;
  cutToInternalClipboard: (src: UniversalPath) => void;
  cutSelectedToInternalClipboard: () => void;
  remove: (filePath: UniversalPath) => void;
  removeSelection: () => void;
  trash: (filePath: UniversalPath) => void;
  trashSelection: () => void;
  copy: (src: UniversalPath, dest: UniversalPath) => void;
  copyTo: (src: UniversalPath, destDir: UniversalPath) => void;
  copyStructural: (src: UniversalPathArray, destDir: UniversalPath) => void;
  copyToInternalClipboard: (src: UniversalPath) => void;
  copySelectionToInternalClipboard: () => void;
  pasteFromInternalClipboard: (destDir?: UniversalPath) => void;
  copyToOSClipboard: (text: string) => void;
  getFromOSClipboard: () => Promise<string>;
  openFile: (path: string) => void;
}

// Provided inside for functionalities of manager.
export interface FileManagerPaneHandle {
  getActivePath: () => string;
  moveActivePathTo: (path: string) => Promise<boolean>;
  getRemoteHost: () => RemoteHost | undefined;
  setRemoteHost: (host?: RemoteHost) => void;
  navigateForward: () => void;
  navigateBack: () => void;
  trackingCurrent: () => boolean;
  setKeepTrackCurrent: (keepTracking: boolean) => void;
  addBookmark: (path: string) => void;
  getBookmarks: () => string[];
  getRecentDirectories: () => string[];
  splitPane: () => void;
  startRenaming: (src: string) => void;
  getRenamingPath: () => string | undefined;
  submitRenaming(newBaseName: string): void;
  cancelRenaming: () => void;
  selectItems: (items: string[]) => void;
  selectedItems: () => string[];
  getRelativePathFromActive: (path: string) => string;
  getSubPathList: (path: string) => Promise<string[]>;
  getDndType: () => string;
  getUniversalPath: (fullPath: string) => UniversalPath;
}

export const FileManagerHandleContext = createContext<
  (FileManagerHandle & FileManagerPaneHandle) | undefined
>(undefined);

export function useFileManagerHandle() {
  const handle = useContext(FileManagerHandleContext);
  if (handle === undefined) {
    throw new Error(
      "useFileManagerHandle must be used within a FileManagerHandleProvider"
    );
  }
  return handle;
}
