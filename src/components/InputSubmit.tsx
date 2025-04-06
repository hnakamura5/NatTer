import { api } from "@/api";
import { InputText, usePid, useShellConfig } from "@/SessionStates";
import { log } from "@/datatypes/Logger";
import {
  HistoryProvider,
  useHistory,
} from "@/components/InputBox/HistoryProvider";
import { useCallback, useRef, useState } from "react";

import { InputBox, InputBoxProps } from "@/components/InputBox";

export function TerminalInputBox(props: InputBoxProps) {
  const pid = usePid();
  const executeTerminal = api.terminal.execute.useMutation();
  const numHistory = api.terminal.numHistory.useQuery(pid, {
    refetchInterval: 1000,
  });
  const history = api.terminal.history.useMutation();
  const submit = useCallback(
    (command: string, styledCommand?: string) => {
      if (command === "") {
        log.debug("InputBox: empty command submitted");
        return;
      }
      executeTerminal.mutate(
        { pid: pid, command: command },
        {
          onError: (error) => {
            log.error(`failed to execute: ${pid}`, error);
          },
        }
      );
    },
    [pid, executeTerminal]
  );

  return (
    <HistoryProvider
      size={numHistory.data}
      get={(index: number) => history.mutateAsync({ pid: pid, index: index })}
    >
      <InputBox {...props} submit={submit} />
    </HistoryProvider>
  );
}

export function ShellInputBox(props: InputBoxProps) {
  const pid = usePid();
  const executeShell = api.shell.execute.useMutation();
  const numCommands = api.shell.numCommands.useQuery(pid);
  const getCommand = api.shell.commandAsync.useMutation();
  const submit = useCallback(
    (command: string, styledCommand?: string) => {
      if (command === "") {
        log.debug("InputBox: empty command submitted");
        return;
      }
      executeShell.mutate(
        { pid: pid, command: command, styledCommand: styledCommand },
        {
          onError: (error) => {
            log.error(`failed to execute: ${pid}`, error);
          },
        }
      );
    },
    [pid, executeShell]
  );

  return (
    <HistoryProvider
      size={numCommands.data}
      get={(index: number) =>
        getCommand
          .mutateAsync({ pid: pid, cid: index })
          .then((command) => command.command)
      }
    >
      <InputBox {...props} submit={submit} />
    </HistoryProvider>
  );
}
