import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
  TextField,
  Input as MuiInput,
  Icon,
} from "@mui/material";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";

import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";
import React, { useEffect, useState } from "react";
import { EasyFocus } from "@/components/EasyFocus";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { InputText, usePid } from "@/SessionStates";
import { useAtom } from "jotai";
import { CommandID } from "@/datatypes/Command";
import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "@/components/KeybindScope";

import { log } from "@/datatypes/Logger";

export function Input(props: {
  key: string;
  submit: (command: string) => void;
  inputBoxRef: React.RefObject<HTMLInputElement>;
}) {
  const pid = usePid();
  const numCommands = api.shell.numCommands.useQuery(pid).data;
  const theme = useTheme();
  // const [text, setText] = useState<string>("");
  const [text, setText] = useAtom(InputText);
  const [commandHistory, setCommandHistory] = useState<CommandID | undefined>(
    undefined
  );

  const command = api.shell.command.useQuery(
    {
      pid: pid,
      cid: commandHistory || 0,
    },
    {
      enabled: commandHistory !== undefined,
      refetchInterval: 200,
    }
  );
  // If the command history is changed, update the text.
  useEffect(() => {
    log.debug(`Command history changed to ${commandHistory} ${command.data}`);
    if (commandHistory) {
      if (command.data) {
        log.debug(`Set history command: ${command.data.command}`);
        setText(command.data.command);
      }
    }
  }, [commandHistory]);

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "CommandHistoryUp",
    () => {
      log.debug(
        `CommandHistoryUp history:${commandHistory} num:${numCommands}`
      );
      if (numCommands) {
        if (commandHistory === undefined) {
          setCommandHistory(numCommands - 1);
        } else if (commandHistory === 0) {
          setCommandHistory(undefined);
          setText("");
        } else {
          setCommandHistory(commandHistory - 1);
        }
      }
    },
    keybindRef
  );
  useKeybindOfCommand(
    "CommandHistoryDown",
    () => {
      log.debug(
        `CommandHistoryDown history:${commandHistory} num:${numCommands}`
      );
      if (numCommands) {
        if (commandHistory === undefined) {
          setCommandHistory(0);
        } else if (commandHistory === numCommands - 1) {
          setCommandHistory(undefined);
          setText("");
        } else {
          setCommandHistory(commandHistory + 1);
        }
      }
    },
    keybindRef
  );
  // TODO: Input must be on top level of the component to avoid the focus problem.
  // That is, we lose the focus when the component re-rendered (e.g.on input change).
  // Even styled component causes this problem.
  log.debug(`Input rendered text:${text} (history: ${commandHistory})`);

  return (
    <ErrorBoundary fallback={<InputBoxError />}>
      <KeybindScope keybindRef={keybindRef}>
        <MuiInputBase
          inputRef={props.inputBoxRef}
          style={{
            width: `calc(100% - ${theme.system.hoverMenuWidth})`,
            backgroundColor: theme.terminal.secondaryBackgroundColor,
            color: theme.terminal.textColor,
            fontFamily: theme.terminal.font,
            fontSize: theme.terminal.fontSize,
            marginLeft: "0px",
            paddingLeft: "10px",
          }}
          value={text}
          // autoFocus={true} // TODO: problem
          onChange={(e) => {
            setText(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.ctrlKey && e.key === "Enter") {
              if (e.altKey) {
                // Run background
                props.submit(text);
                setText("");
              } else {
                // Run
                props.submit(text);
                setText("");
              }
            }
          }}
        />
      </KeybindScope>
    </ErrorBoundary>
  );
}

function InputBoxError() {
  return <Box>InputBox load error.</Box>;
}
