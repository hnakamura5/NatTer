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
import { useConfig, useTheme } from "@/AppState";

import { api } from "@/api";
import { ErrorBoundary } from "react-error-boundary";
import React, { RefObject, useEffect, useState } from "react";
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
import { MonacoInput } from "./MonacoInput";
import { setMonacoInputTheme } from "./MonacoInputTheme";
import { codeToHtml } from "shiki";
import { Theme } from "@/datatypes/Theme";
import { CodeMirrorInput } from "./CodeMirrorInput";
import { codeMirrorTheme } from "./CodeMirrorTheme";
import { ShellConfig } from "@/datatypes/Config";

function codeToHTMLWithTheme(
  code: string,
  monacoTheme: string,
  language: string,
  theme: Theme
) {
  return codeToHtml(code, {
    theme: monacoTheme,
    lang: language,
    structure: "inline",
  }).then((html) => {
    log.debug(`codeToHTMLWithTheme: ${code} -> ${html}`);
    return html;
  });
}

const StyledCodeMirrorInput = styled(CodeMirrorInput)(({ theme }) => ({
  "& .cm-editor": {
    borderRadius: "5px",
  },
  "& .cm-tooltip": {
    backgroundColor: theme.system.tooltipBackgroundColor,
    color: theme.system.textColor,
    fontFamily: theme.system.font,
  },
  "& .cm-completion-item": {
    backgroundColor: theme.system.tooltipBackgroundColor,
    color: theme.system.textColor,
    fontFamily: theme.system.font,
  },
}));

export function Input(props: {
  id: string;
  submit: (command: string, styledCommand?: string) => void;
  inputBoxRef: React.RefObject<HTMLElement>;
}) {
  const pid = usePid();
  const config = useConfig();
  const numCommands = api.shell.numCommands.useQuery(pid).data;
  const theme = useTheme();
  // const [text, setText] = useState<string>("");
  const [text, setText] = useAtom(InputText);
  const [commandHistory, setCommandHistory] = useState<CommandID | undefined>(
    undefined
  );
  const [shellConfig, setShellConfig] = useState<ShellConfig | undefined>(
    undefined
  );

  log.debug(
    `Input: id:${props.id} text:${text} history:${commandHistory} numCommands:${numCommands}`
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
  const shellConfigQuery = api.shell.shellConfig.useQuery(pid, {
    enabled: shellConfig === undefined,
    refetchInterval: 500,
  });

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

  useEffect(() => {
    if (shellConfigQuery.data && shellConfig !== shellConfigQuery.data) {
      log.debug(`Set shell config: ${JSON.stringify(shellConfigQuery.data)}`);
      setShellConfig(shellConfigQuery.data);
    }
  }, [shellConfigQuery.data, shellConfig]);

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

  const language = "powershell";
  const monacoTheme = "vitesse-black";

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.ctrlKey && e.key === "Enter") {
      if (e.altKey) {
        // Run background
        codeToHTMLWithTheme(text, monacoTheme, language, theme).then((html) => {
          props.submit(text, html);
        });
        setText("");
        e.preventDefault();
      } else {
        // Run
        log.debug(`Input submit ctrl+enter: ${text}`);
        codeToHTMLWithTheme(text, monacoTheme, language, theme).then((html) => {
          log.debug(`Input submit ctrl+enter html: ${html}`);
          props.submit(text, html);
        });
        setText("");
        e.preventDefault();
      }
    }
  };

  // TODO: Input must be on top level of the component to avoid the focus problem.
  // That is, we lose the focus when the component re-rendered (e.g.on input change).
  // Even styled component causes this problem.
  // log.debug(`Input rendered text:${text} (history: ${commandHistory})`);
  if (config.editor === "Monaco") {
    return (
      <MonacoInput
        value={text}
        maxHeight={200}
        monacoTheme={monacoTheme}
        language={language}
        id={`input-${pid}`}
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
          setText(v);
        }}
        onKeyDown={(e) =>
          handleKeyDown(e as unknown as React.KeyboardEvent<HTMLDivElement>)
        }
        onDidMount={(editor) => {
          const domNode = editor.getContainerDomNode();
          if (domNode) {
            log.debug(
              `Input mounted: ${domNode}#${domNode.id}.${domNode.className}`
            );
            //  props.inputBoxRef.current = domNode;
          }
          editor.onDidFocusEditorText(() => {
            log.debug(
              `Input focused: ${domNode}#${domNode.id}.${domNode.className}`
            );
          });
        }}
      />
    );
  }
  return (
    <StyledCodeMirrorInput
      id={`input-${pid}`}
      value={text}
      language={language}
      codeMirrorTheme={codeMirrorTheme(theme)}
      onChange={(value, update) => {
        setText(value);
      }}
      ref={
        props.inputBoxRef
          ? (props.inputBoxRef as RefObject<HTMLDivElement>)
          : undefined
      }
      style={{
        padding: "1px 5px 1px 5px", // top right bottom left
      }}
      onKeyDown={(e) => {
        handleKeyDown(e);
      }}
      languageServerConfig={
        shellConfig && shellConfig.languageServer
          ? {
              // TODO: Get current shell config
              executable: shellConfig.languageServer.executable,
              args: shellConfig.languageServer.args,
            }
          : undefined
      }
    />
  );
}

function InputBoxError() {
  return <Box>InputBox load error.</Box>;
}
