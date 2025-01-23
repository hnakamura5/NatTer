import { atom, createStore } from "jotai";
import React from "react";
import { ProcessID } from "@/datatypes/Command";
import { FileManagerState } from "@/components/FileManager";
import { log } from "@/datatypes/Logger";

import * as monaco from "monaco-editor";

// Defines the state with scope of one session

// ProcessID is the identifier of the process.
export const pidContext = React.createContext<ProcessID | undefined>(undefined);
export const usePid = () => {
  const pid = React.useContext(pidContext);
  if (pid === undefined) {
    const message = "usePid must be used within a pidContext";
    log.error(message);
    throw new Error(message);
  }
  return pid;
};

export const SessionStateJotaiStore = createStore();

// InputText is the text in the command input box.
export const InputText = atom("");
SessionStateJotaiStore.set(InputText, "");

// State of the file manager.
export const FileManagerStateAtom = atom<FileManagerState | undefined>(
  undefined
);
SessionStateJotaiStore.set(FileManagerStateAtom, undefined);
