import { createContext, useContext } from "react";

export interface FileManagerHandle {
  getActivePath: () => string;
  moveActivePathTo: (path: string) => Promise<boolean>;
  navigateForward: () => void;
  navigateBack: () => void;
  trackingCurrent: () => boolean;
  setKeepTrackCurrent: (keepTracking: boolean) => void;
  addBookmark: (path: string) => void;
  getBookmarks: () => string[];
  getRecentDirectories: () => string[];
  splitPane: () => void;
  move: (src: string, dest: string) => void;
  moveTo: (src: string, destDir: string) => void;
  moveStructural: (src: string[], destDir: string) => void;
  cutToInternalClipboard: (src: string) => void;
  cutSelectedToInternalClipboard: () => void;
  remove: (filePath: string) => void;
  removeSelection: () => void;
  trash: (filePath: string) => void;
  trashSelection: () => void;
  copy: (src: string, dest: string) => void;
  copyTo: (src: string, destDir: string) => void;
  copyStructural: (src: string[], destDir: string) => void;
  copyToInternalClipboard: (src: string) => void;
  copySelectionToInternalClipboard: () => void;
  pasteFromInternalClipboard: (destDir?: string) => void;
  startRenaming: (src: string) => void;
  getRenamingPath: () => string | undefined;
  submitRenaming(newBaseName: string): void;
  cancelRenaming: () => void;
  selectItems: (items: string[]) => void;
  copyToOSClipboard: (text: string) => void;
  getFromOSClipboard: () => Promise<string>;
  getRelativePathFromActive: (path: string) => string;
  getSubPathList: (path: string) => Promise<string[]>;
  openFile: (path: string) => void;
}

export const FileManagerHandleContext = createContext<
  FileManagerHandle | undefined
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
