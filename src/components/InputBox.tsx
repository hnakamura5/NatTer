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
import { HistoryProvider, useHistory } from "./InputBox/HistoryProvider";

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
  }
) {
  const historyHandle = useHistory();
  const theme = useTheme();
  const pid = usePid();
  const inputBoxRef = React.useRef<HTMLElement>(null);

  const [text, setText] = useAtom(InputText);
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
      historyHandle.historyUp(text).then((newText) => {
        if (newText !== undefined) {
          setText(newText);
        }
      });
    },
    keybindRef
  );
  useKeybindOfCommand(
    "CommandHistoryDown",
    () => {
      historyHandle.historyDown(text).then((newText) => {
        if (newText !== undefined) {
          setText(newText);
        }
      });
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
                    historyHandle.reset();
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
                      historyHandle.reset();
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
