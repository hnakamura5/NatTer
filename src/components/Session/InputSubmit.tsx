import { api } from "@/api";
import { InputText, usePid, useSession, useShellConfig } from "@/SessionStates";
import { log } from "@/datatypes/Logger";
import {
  HistoryProvider,
  useHistory,
} from "@/components/InputBox/HistoryProvider";
import { useCallback, useRef, useState } from "react";

import { InputBox, InputBoxProps } from "@/components/InputBox";

export function TerminalInputBox(props: InputBoxProps) {
  const pid = usePid();
  const shellConfig = useShellConfig();
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
      <InputBox
        {...props}
        submit={submit}
        languageServerConfig={
          shellConfig.languageServer
            ? {
                executable: shellConfig.languageServer.executable,
                args: shellConfig.languageServer.args,
              }
            : undefined
        }
      />
    </HistoryProvider>
  );
}

export function ShellInputBox(props: InputBoxProps) {
  const pid = usePid();
  const shellConfig = useShellConfig();
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
      <InputBox
        {...props}
        submit={submit}
        languageServerConfig={
          shellConfig.languageServer
            ? {
                executable: shellConfig.languageServer.executable,
                args: shellConfig.languageServer.args,
              }
            : undefined
        }
      />
    </HistoryProvider>
  );
}

type ChatAIInputBoxProps = InputBoxProps & {
  chatAIName: string;
  systemPrompt?: string;
};

export function ChatAIInputBox(props: ChatAIInputBoxProps) {
  const sessionID = useSession();
  const aiStart = api.ai.start.useMutation();
  const numHistory = api.ai.numChatSessions.useQuery(sessionID, {
    refetchInterval: 500,
  });
  const chatSubmit = api.ai.chatSubmit.useMutation();
  const getHistory = api.ai.getSessionFirstInputHistory.useMutation();

  const submit = useCallback(
    (message: string, styledMessage?: string) => {
      if (message === "") {
        log.debug("InputBox: empty command submitted");
        return;
      }
      // Start new chat session, then send the first message.
      aiStart
        .mutateAsync(
          {
            sessionID,
            chatAIName: props.chatAIName, // TODO: Where does it comes from?
            systemPrompt: props.systemPrompt,
          },
          {
            onError: (error) => {
              log.error(`failed to execute: ${sessionID}`, error);
            },
          }
        )
        .then((chatID) => {
          if (chatID === undefined) {
            log.debug(`ChatAIInputBox: chatID is undefined`);
            return;
          }
          chatSubmit.mutate({
            id: chatID,
            message: message,
          });
        });
    },
    [sessionID, props.chatAIName, props.systemPrompt]
  );
  return (
    <HistoryProvider
      size={numHistory.data}
      get={(index: number) =>
        getHistory.mutateAsync({ sessionID, index }).then((history) => history)
      }
    >
      <InputBox {...props} submit={submit} />
    </HistoryProvider>
  );
}
