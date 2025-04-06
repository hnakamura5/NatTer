import { atom, createStore } from "jotai";
import React from "react";
import { ProcessID, SessionID } from "@/datatypes/SessionID";
import { FileManagerState } from "@/components/FileManager";
import { log } from "@/datatypes/Logger";

import * as monaco from "monaco-editor";
import { ShellConfig } from "./datatypes/Config";

// Defines the state with scope of one session
export const sessionContext = React.createContext<SessionID | undefined>(
  undefined
);
export function useSession(): SessionID {
  const session = React.useContext(sessionContext);
  if (session === undefined) {
    const message = "useSession must be used within a sessionContext";
    log.error(message);
    throw new Error(message);
  }
  return session;
}

// ProcessID is the identifier of the process.
export const pidContext = React.createContext<ProcessID | undefined>(undefined);
export function usePid(): ProcessID {
  const pid = React.useContext(pidContext);
  if (pid === undefined) {
    const message = "usePid must be used within a pidContext";
    log.error(message);
    throw new Error(message);
  }
  return pid;
}

export const shellConfigContext = React.createContext<ShellConfig | undefined>(
  undefined
);
export function useShellConfig(): ShellConfig {
  const shellConfig = React.useContext(shellConfigContext);
  if (shellConfig === undefined) {
    const message = "useShellConfig must be used within a ShellConfigContext";
    log.error(message);
    throw new Error(message);
  }
  return shellConfig;
}

export const SessionStateJotaiStore = createStore();

// InputText is the text in the command input box.
export const InputText = atom("");
SessionStateJotaiStore.set(InputText, "");

// State of the file manager.
export const FileManagerStateAtom = atom<FileManagerState | undefined>(
  undefined
);
SessionStateJotaiStore.set(FileManagerStateAtom, undefined);
