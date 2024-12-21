import { createContext, useContext } from "react";

export interface FileManagerHandleBasic {
  currentFullPath: () => string;
  moveFullPath: (path: string) => void;
  navigateForward: () => void;
  navigateBack: () => void;
  trackingCurrent: () => boolean;
  setKeepTrackCurrent: (keepTracking: boolean) => void;
  addBookmark: (path: string) => void;
  getBookmarks: () => string[]; // TODO: type?
  splitPane: () => void;
}

// File handling shell. Does not contain the state itself.
class FileManagerHandle implements FileManagerHandleBasic {
  constructor(
    public currentFullPath: () => string,
    public moveFullPath: (path: string) => void,
    public navigateForward: () => void,
    public navigateBack: () => void,
    public trackingCurrent: () => boolean,
    public setKeepTrackCurrent: (keepTracking: boolean) => void,
    public addBookmark: (path: string) => void,
    public getBookmarks: () => string[], // TODO: type?
    public splitPane: () => void
  ) {}

  public toggleKeepTrackCurrent() {
    this.setKeepTrackCurrent(!this.trackingCurrent());
  }
}

export function createFileManagerHandle(
  handleBasic: FileManagerHandleBasic
): FileManagerHandle {
  return new FileManagerHandle(
    handleBasic.currentFullPath,
    handleBasic.moveFullPath,
    handleBasic.navigateForward,
    handleBasic.navigateBack,
    handleBasic.trackingCurrent,
    handleBasic.setKeepTrackCurrent,
    handleBasic.addBookmark,
    handleBasic.getBookmarks,
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
      "useFileHandle must be used within a FileManagerHandleProvider"
    );
  }
  return handle;
}
