import { createContext, useContext } from "react";

export interface FileManagerHandleBasic {
  getCurrentPath: () => string;
  moveToPath: (path: string) => void;
  navigateForward: () => void;
  navigateBack: () => void;
  trackingCurrent: () => boolean;
  setKeepTrackCurrent: (keepTracking: boolean) => void;
  addBookmark: (path: string) => void;
  getBookmarks: () => string[];
  getRecentDirectories: () => string[];
  splitPane: () => void;
  move: (src: string, dest: string) => void;
  moveStructural: (src: string[], destDir: string) => void;
  moveTo: (src: string, destDir: string) => void;
  remove: (filePath: string) => void;
  copy: (src: string, dest: string) => void;
  copyTo: (src: string, destDir: string) => void;
  copyStructural: (src: string[], destDir: string) => void;
}

// File handling shell. Does not contain the state itself.
class FileManagerHandle implements FileManagerHandleBasic {
  constructor(
    public readonly getCurrentPath: () => string,
    public readonly moveToPath: (path: string) => void,
    public readonly navigateForward: () => void,
    public readonly navigateBack: () => void,
    public readonly trackingCurrent: () => boolean,
    public readonly setKeepTrackCurrent: (keepTracking: boolean) => void,
    public readonly addBookmark: (path: string) => void,
    public readonly getBookmarks: () => string[],
    public readonly getRecentDirectories: () => string[],
    public readonly splitPane: () => void,
    public readonly move: (src: string, dest: string) => void,
    public readonly moveTo: (src: string, destDir: string) => void,
    public readonly moveStructural: (src: string[], destDir: string) => void,
    public readonly remove: (filePath: string) => void,
    public readonly copy: (src: string, dest: string) => void,
    public readonly copyTo: (src: string, destDir: string) => void,
    public readonly copyStructural: (src: string[], dest: string) => void
  ) {}

  toggleKeepTrackCurrent = () => {
    this.setKeepTrackCurrent(!this.trackingCurrent());
  };
}

export function createFileManagerHandle(
  handleBasic: FileManagerHandleBasic
): FileManagerHandle {
  return new FileManagerHandle(
    handleBasic.getCurrentPath,
    handleBasic.moveToPath,
    handleBasic.navigateForward,
    handleBasic.navigateBack,
    handleBasic.trackingCurrent,
    handleBasic.setKeepTrackCurrent,
    handleBasic.addBookmark,
    handleBasic.getBookmarks,
    handleBasic.getRecentDirectories,
    handleBasic.splitPane,
    handleBasic.move,
    handleBasic.moveTo,
    handleBasic.moveStructural,
    handleBasic.remove,
    handleBasic.copy,
    handleBasic.copyTo,
    handleBasic.copyStructural
  );
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
