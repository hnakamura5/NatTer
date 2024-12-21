import { atom } from "jotai";
import React from "react";
import { ProcessID } from "@/datatypes/Command";
import { FileManagerState } from "@/components/FileManager";

// Defines the state with scope of one session

// ProcessID is the identifier of the process.
export const pidContext = React.createContext<ProcessID | undefined>(undefined);
export const usePid = () => {
  const pid = React.useContext(pidContext);
  if (pid === undefined) {
    throw new Error("usePid must be used within a pidContext");
  }
  return pid;
};

// InputText is the text in the command input box.
export const InputText = atom("");

// State of the file manager.
export const FileManagerStateAtom = atom<FileManagerState | undefined>(
  undefined
);
