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
import React, { RefObject, useEffect, useState } from "react";
import { EasyFocus } from "@/components/EasyFocus";
import { GlobalFocusMap } from "@/components/GlobalFocusMap";
import { InputText, MonacoEditorAtom, usePid } from "@/SessionStates";
import { useAtom } from "jotai";
import { CommandID } from "@/datatypes/Command";
import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "@/components/KeybindScope";

import { log } from "@/datatypes/Logger";
import { MonacoInput } from "./MonacoInput";
import { setMonacoInputTheme } from "./MonacoInputTheme";

export function Input(props: {
  key: string;
  submit: (command: string) => void;
  inputBoxRef: React.MutableRefObject<HTMLElement>;
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
  // log.debug(`Input rendered text:${text} (history: ${commandHistory})`);
  //setMonacoInputTheme(theme, "TextInput");

  const [monacoInputAtom, setMonacoInputAtom] = useAtom(MonacoEditorAtom);

  return (
    <MonacoInput
      value={text}
      maxHeight={200}
      monacoTheme="vitesse-black"
      language="powershell"
      style={{
        padding: "3px 8px 3px 8px",
        borderRadius: "5px",
        margin: "0px 5px 0px 3px", // top right bottom left
      }}
      ref={
        props.inputBoxRef
          ? (props.inputBoxRef as RefObject<HTMLDivElement>)
          : undefined
      }
      onChange={(v, e) => {
        // log.debug(`Input changed to ${v}`);
        setText(v);
      }}
      onKeyDown={(e) => {
        if (e.ctrlKey && e.key === "Enter") {
          if (e.altKey) {
            // Run background
            props.submit(text);
            setText("");
            e.preventDefault();
          } else {
            // Run
            log.debug(`Input submit ctrl+enter: ${text}`);
            props.submit(text);
            setText("");
            e.preventDefault();
          }
        }
      }}
      onDidMount={(editor) => {
        const domNode = editor.getContainerDomNode();
        if (domNode) {
          log.debug(
            `Input mounted: ${domNode}#${domNode.id}.${domNode.className}`
          );
          //  props.inputBoxRef.current = domNode;
        }
        setMonacoInputAtom(editor);
        editor.onDidFocusEditorText(() => {
          log.debug(
            `Input focused: ${domNode}#${domNode.id}.${domNode.className}`
          );
        });
      }}
    />
  );

  return (
    <ErrorBoundary fallback={<InputBoxError />}>
      <KeybindScope keybindRef={keybindRef}>
        <MuiInputBase
          id={`input-${pid}`}
          inputRef={props.inputBoxRef}
          style={{
            width: `calc(100% - 8px)`,
            backgroundColor: theme.shell.secondaryBackgroundColor,
            color: theme.shell.textColor,
            fontFamily: theme.shell.font,
            fontSize: theme.shell.fontSize,
            borderRadius: "5px",
            marginLeft: "0px",
            paddingLeft: "5px",
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
