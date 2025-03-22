import { CommandID } from "@/datatypes/Command";
import { log } from "@/datatypes/Logger";
import { createContext, useContext, useState } from "react";

type HistoryHandle = {
  historyUp: (current: string) => Promise<string | undefined>;
  historyDown: (current: string) => Promise<string | undefined>;
  reset: () => void;
};

const HistoryContext = createContext<HistoryHandle | undefined>(undefined);
export function useHistory() {
  const history = useContext(HistoryContext);
  if (history === undefined) {
    throw new Error("useHistory must be used within a HistoryProvider");
  }
  return history;
}

type HistoryProviderProps = {
  size?: number;
  get: (index: number) => Promise<string | undefined>;
};

export function HistoryProvider(
  props: { children: React.ReactNode } & HistoryProviderProps
) {
  const size = props.size;
  const get = props.get;
  const [commandHistory, setCommandHistory] = useState<CommandID | undefined>(
    undefined
  );
  // The input text before history back command started.
  const [valueBeforeHistoryBack, setValueBeforeHistoryBack] = useState<
    string | undefined
  >(undefined);

  const historyUp = (current: string): Promise<string | undefined> => {
    log.debug(`CommandHistoryUp history:${commandHistory} num:${props.size} valueBefore:${valueBeforeHistoryBack} current:${current}`);
    if (size) {
      if (commandHistory === undefined) {
        return get(size - 1).then((command) => {
          if (command) {
            setValueBeforeHistoryBack(current);
            setCommandHistory(size - 1);
            return command;
          }
        });
      } else if (commandHistory === 0) {
        setCommandHistory(undefined);
        setValueBeforeHistoryBack(undefined);
        return new Promise((resolve) => resolve(valueBeforeHistoryBack || ""));
      } else {
        return get(commandHistory - 1).then((command) => {
          if (command) {
            setCommandHistory(commandHistory - 1);
            return command;
          }
        });
      }
    }
    return new Promise((resolve) => resolve(undefined));
  };

  const historyDown = (current: string): Promise<string | undefined> => {
    log.debug(`CommandHistoryDown history:${commandHistory} num:${size} valueBefore:${valueBeforeHistoryBack} current:${current}`);
    if (size) {
      if (commandHistory === undefined) {
        return get(0).then((command) => {
          if (command) {
            setValueBeforeHistoryBack(current);
            setCommandHistory(0);
            return command;
          }
        });
      } else if (commandHistory === size - 1) {
        setCommandHistory(undefined);
        setValueBeforeHistoryBack(undefined);
        return new Promise((resolve) => resolve(valueBeforeHistoryBack || ""));
      } else {
        return get(commandHistory + 1).then((command) => {
          if (command) {
            setCommandHistory(commandHistory + 1);
            return command;
          }
        });
      }
    }
    return new Promise((resolve) => resolve(undefined));
  };

  const reset = () => {
    setCommandHistory(undefined);
    setValueBeforeHistoryBack(undefined);
  };

  return (
    <HistoryContext.Provider
      value={{
        historyUp,
        historyDown,
        reset,
      }}
    >
      {props.children}
    </HistoryContext.Provider>
  );
}
