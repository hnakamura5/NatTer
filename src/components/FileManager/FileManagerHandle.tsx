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
    public readonly splitPane: () => void
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
    handleBasic.splitPane
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
