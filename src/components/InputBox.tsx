import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
  Tooltip,
  TextField,
  Input as MuiInput,
  Icon,
  Menu,
} from "@mui/material";
import styled from "@emotion/styled";
import { useConfig, useTheme } from "@/AppState";

import { api } from "@/api";
import { useCallback, useRef, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "@/components/FocusBoundary";
import React from "react";
import { EasyFocus } from "@/components/EasyFocus";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { InputText, usePid, useShellConfig } from "@/SessionStates";
import { useAtom } from "jotai";

import { ControlButtons } from "@/components/InputBox/ControlButtons";
import { Input } from "@/components/InputBox/TextInput";
import {
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "@/components/KeybindScope";

import { log } from "@/datatypes/Logger";
import {
  ContextMenu,
  ContextSubMenu,
  ContextMenuStyleBox,
  ContextSubMenuStyleBox,
} from "./Menu/ContextMenu";
import { SubMenu, SubMenuItem } from "./Menu/SubMenu";
import { MenuItem } from "./Menu/MenuItem";
import { CommandID } from "@/datatypes/Command";
import { set } from "zod";

function InputBoxContextMenuContents() {
  return (
    <>
      <MenuItem>test</MenuItem>
      <ContextSubMenu label={<SubMenuItem>nest</SubMenuItem>}>
        <ContextSubMenuStyleBox>
          <MenuItem>nested test</MenuItem>
        </ContextSubMenuStyleBox>
      </ContextSubMenu>
    </>
  );
}

const Paper = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  backgroundColor: theme.shell.backgroundColor,
  color: theme.shell.textColor,
  paddingTop: "1px",
  paddingBottom: "3px",
}));

const OverToLeft = styled(Box)(({ theme }) => ({
  position: "relative",
  left: `calc(-${theme.system.hoverMenuWidth})`,
  width: `calc(100% + ${theme.system.hoverMenuWidth})`,
}));

interface InputBoxProps {}

function InputBox(
  props: InputBoxProps & {
    submit: (command: string, styledCommand?: string) => void;
    historyHandle?: {
      size: number;
      get: (index: number) => Promise<string | undefined>;
    };
  }
) {
  const history = props.historyHandle;
  const theme = useTheme();
  const pid = usePid();
  const inputBoxRef = React.useRef<HTMLElement>(null);

  const [text, setText] = useAtom(InputText);
  const [commandHistory, setCommandHistory] = useState<CommandID | undefined>(
    undefined
  );
  // The input text before history back command started.
  const [valueBeforeHistoryBack, setValueBeforeHistoryBack] = useState<
    string | undefined
  >(undefined);

  const handleGFM = GlobalFocusMap.useHandle();

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  // Focus commands.
  useKeybindOfCommand(
    "FocusCommandUp",
    () => {
      log.debug(`FocusCommandUp from Input`);
      handleGFM.focus(GlobalFocusMap.GlobalKey.LastCommand);
    },
    keybindRef
  );
  useKeybindOfCommand(
    "FocusFileView",
    () => {
      log.debug(`FocusFileView from Input`);
      handleGFM.focus(GlobalFocusMap.GlobalKey.FileView);
    },
    keybindRef
  );
  // History commands.
  useKeybindOfCommand(
    "CommandHistoryUp",
    () => {
      log.debug(
        `CommandHistoryUp history:${commandHistory} num:${history?.size}`
      );
      if (history?.size) {
        if (commandHistory === undefined) {
          history.get(history.size - 1).then((command) => {
            if (command) {
              setValueBeforeHistoryBack(text);
              setText(command);
              setCommandHistory(history.size - 1);
            }
          });
        } else if (commandHistory === 0) {
          setCommandHistory(undefined);
          setText(valueBeforeHistoryBack || "");
          setValueBeforeHistoryBack(undefined);
        } else {
          history.get(commandHistory - 1).then((command) => {
            if (command) {
              setCommandHistory(commandHistory - 1);
              setText(command);
            }
          });
        }
      }
    },
    keybindRef
  );
  useKeybindOfCommand(
    "CommandHistoryDown",
    () => {
      log.debug(
        `CommandHistoryDown history:${commandHistory} num:${history?.size}`
      );
      if (history?.size) {
        if (commandHistory === undefined) {
          history.get(0).then((command) => {
            if (command) {
              setValueBeforeHistoryBack(text);
              setText(command);
              setCommandHistory(0);
            }
          });
        } else if (commandHistory === history.size - 1) {
          setCommandHistory(undefined);
          setText(valueBeforeHistoryBack || "");
          setValueBeforeHistoryBack(undefined);
        } else {
          history.get(commandHistory + 1).then((command) => {
            if (command) {
              setCommandHistory(commandHistory + 1);
              setText(command);
            }
          });
        }
      }
    },
    keybindRef
  );

  return (
    <ErrorBoundary fallbackRender={InputBoxError}>
      <OverToLeft>
        <FocusBoundary defaultBorderColor={theme.shell.backgroundColor}>
          <EasyFocus.Land focusTarget={inputBoxRef} name={`InputBox-${pid}`}>
            <GlobalFocusMap.Target
              focusKey={GlobalFocusMap.GlobalKey.InputBox}
              callBeforeFocus={() => {
                return Promise.resolve(false);
              }}
              focusRef={inputBoxRef}
            >
              <Paper>
                <ControlButtons
                  submit={(command: string, styledCommand?: string) => {
                    // Submit invalidates history.
                    setCommandHistory(undefined);
                    setValueBeforeHistoryBack(undefined);
                    props.submit(command, styledCommand);
                  }}
                />
                <ContextMenu items={<InputBoxContextMenuContents />}>
                  <Input
                    id={`input-${pid}`}
                    inputBoxRef={
                      // TODO: any better way?
                      inputBoxRef
                    }
                    submit={props.submit}
                    onChange={(value) => {
                      // User change invalidates history.
                      setCommandHistory(undefined);
                      setValueBeforeHistoryBack(undefined);
                    }}
                  />
                </ContextMenu>
              </Paper>
            </GlobalFocusMap.Target>
          </EasyFocus.Land>
        </FocusBoundary>
      </OverToLeft>
    </ErrorBoundary>
  );
}

function InputBoxError() {
  return <Box>InputBox load error.</Box>;
}

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
    <InputBox
      {...props}
      submit={submit}
      historyHandle={
        numHistory.data
          ? {
              size: numHistory.data,
              get: (index: number) =>
                history.mutateAsync({ pid: pid, index: index }),
            }
          : undefined
      }
    />
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
    <InputBox
      {...props}
      submit={submit}
      historyHandle={
        numCommands.data
          ? {
              size: numCommands.data,
              get: (index: number) =>
                getCommand
                  .mutateAsync({ pid: pid, cid: index })
                  .then((command) => command.command),
            }
          : undefined
      }
    />
  );
}
