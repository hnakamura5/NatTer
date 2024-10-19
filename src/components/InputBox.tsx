import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
  Tooltip,
  TextField,
  Input as MuiInput,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";

import { api } from "@/api";
import { ProcessID } from "@/server/ShellProcess";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "./FocusBoundary";
import React from "react";
import { EasyFocus } from "./EasyFocus";
import { Theme } from "@emotion/react";
import { GlobalFocusMap } from "./GlobalFocusMap";

interface InputBoxProps {
  pid: ProcessID;
}

function Input(props: {
  theme: Theme;
  submit: (text: string) => void;
  pid: number;
  inputBoxRef: React.RefObject<HTMLInputElement>;
}) {
  const theme = props.theme;
  const [text, setText] = useState<string>("");

  const iconWidth = 40;
  const IconButton = styled(MuiIconButton)`
    color: ${theme.terminal.colors.primary};
    background-color: ${theme.terminal.colors.background};
    width: ${iconWidth}px;
  `;


  // TODO: Input must be on top level of the component to avoid the focus problem.
  // That is, we lose the focus when the component re-rendered (e.g.on input change).
  // Even styled component causes this problem.

  return (
    <>
      <MuiInputBase
        inputRef={props.inputBoxRef}
        style={{
          width: "calc(100% - 40px)",
          backgroundColor: theme.terminal.colors.secondaryBackground,
          color: theme.terminal.colors.primary,
          fontFamily: theme.terminal.font,
          fontSize: theme.terminal.fontSize,
          marginLeft: "0px",
          paddingLeft: "10px",
        }}
        defaultValue={text}
        // autoFocus={true} // TODO: problem
        onChange={(e) => {
          setText(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.ctrlKey && e.key === "Enter") {
            props.submit(text);
            setText("");
          }
        }}
      />
      <Tooltip title="Run Command (Ctrl+Enter)">
        <IconButton
          onClick={() => {
            // TODO: Focus after submitting. Now focus is lost.
            props.submit(text);
            setText("");
          }}
        >
          <SendIcon sx={{ scale: 0.8 }} />
        </IconButton>
      </Tooltip>
    </>
  );
}

function InputBox(props: InputBoxProps) {
  const theme = useTheme();
  const inputBoxRef = React.createRef<HTMLInputElement>();

  const Paper = styled(MuiPaper)`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: ${theme.terminal.colors.background};
    color: ${theme.terminal.colors.primary};
  `;
  const send = api.shell.execute.useMutation();
  const submit = (text: string) => {
    send.mutate(
      { pid: props.pid, command: text },
      {
        onError: (error) => {
          console.error(`failed to send: ${error}`);
        },
      }
    );
  };

  return (
    <ErrorBoundary fallbackRender={InputBoxError}>
      <FocusBoundary>
        <EasyFocus.Land focusTarget={inputBoxRef}>
          <GlobalFocusMap.Target
            focusKey={GlobalFocusMap.Key.InputBox}
            target={inputBoxRef}
          >
            <Paper>
              <Input
                theme={theme}
                pid={props.pid}
                inputBoxRef={inputBoxRef}
                submit={submit}
              />
            </Paper>
          </GlobalFocusMap.Target>
        </EasyFocus.Land>
      </FocusBoundary>
    </ErrorBoundary>
  );
}

function InputBoxError() {
  return <Box>InputBox load error.</Box>;
}

export default InputBox;
