import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
  Tooltip,
  TextField,
  Input as MuiInput,
  Icon,
} from "@mui/material";
import { PlayArrow, PlayCircle, Stop, Pause } from "@mui/icons-material";
import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";

import { api } from "@/api";
import { useCallback, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import FocusBoundary from "./FocusBoundary";
import React from "react";
import { EasyFocus } from "./EasyFocus";
import { Theme } from "@emotion/react";
import { GlobalFocusMap } from "./GlobalFocusMap";
import { logger } from "@/datatypes/Logger";
import { InputText, usePid } from "@/SessionStates";
import { useAtom } from "jotai";

function Input(props: {
  theme: Theme;
  key: string;
  submit: (command: string) => void;
  inputBoxRef: React.RefObject<HTMLInputElement>;
}) {
  const theme = props.theme;
  // const [text, setText] = useState<string>("");
  const [text, setText] = useAtom(InputText);

  // TODO: Input must be on top level of the component to avoid the focus problem.
  // That is, we lose the focus when the component re-rendered (e.g.on input change).
  // Even styled component causes this problem.
  console.log("Input rendered");

  return (
    <MuiInputBase
      inputRef={props.inputBoxRef}
      style={{
        width: `calc(100% - ${theme.system.hoverMenuWidth})`,
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
  );
}

function Button(props: {
  icon: React.ReactNode;
  color: string;
  tooltip: string;
  onClick: () => void;
}) {
  const theme = useTheme();
  const iconWidth = "20px";
  const IconButton = styled(MuiIconButton)({
    color: theme.terminal.colors.primary,
    backgroundColor: theme.terminal.colors.background,
    width: iconWidth,
    padding: "0px",
    scale: 0.7,
  });
  return (
    <Tooltip title={props.tooltip}>
      <IconButton onClick={props.onClick}>
        <span
          style={{
            color: props.color,
          }}
        >
          {props.icon}
        </span>
      </IconButton>
    </Tooltip>
  );
}

function ControlButtons(props: { submit: (command: string) => void }) {
  const theme = useTheme();
  const IconBox = styled(Box)({
    width: `calc(${theme.system.hoverMenuWidth} - 5px)`,
  });
  const [text, setText] = useAtom(InputText);
  const run = useCallback(() => {
    props.submit(text);
    setText("");
  }, [text, setText, props]);
  return (
    <IconBox>
      <Button
        icon={<PlayArrow />}
        color={theme.terminal.runButtonColor}
        tooltip="Run Command (Ctrl+Enter)"
        onClick={run}
      />
      <Button
        icon={<PlayCircle />}
        color={theme.terminal.runBackgroundButtonColor}
        tooltip="Run Command Background (Ctrl+Alt+Enter)"
        onClick={run}
      />
    </IconBox>
  );
}

interface InputBoxProps {}

function InputBox(props: InputBoxProps) {
  const theme = useTheme();
  const pid = usePid();
  const inputBoxRef = React.createRef<HTMLInputElement>();

  const Paper = styled(Box)({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: theme.terminal.colors.background,
    color: theme.terminal.colors.primary,
    paddingTop: "1px",
    paddingBottom: "3px",
  });

  const OverToLeft = styled(Box)({
    position: "relative",
    left: `calc(-${theme.system.hoverMenuWidth} + 5px)`,
    width: `calc(100% + ${theme.system.hoverMenuWidth})`,
  });

  const execute = api.shell.execute.useMutation();
  const submit = useCallback(
    (command: string) => {
      execute.mutate(
        { pid: pid, command: command },
        {
          onError: (error) => {
            logger.logTrace(`failed to execute: ${error}`);
          },
        }
      );
    },
    [pid, execute]
  );

  return (
    <ErrorBoundary fallbackRender={InputBoxError}>
      <OverToLeft>
        <FocusBoundary>
          <EasyFocus.Land focusTarget={inputBoxRef}>
            <GlobalFocusMap.Target
              focusKey={GlobalFocusMap.Key.InputBox}
              target={inputBoxRef}
            >
              <Paper>
                <ControlButtons submit={submit} />
                <Input
                  theme={theme}
                  key={`input-${pid}`}
                  inputBoxRef={inputBoxRef}
                  submit={submit}
                />
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

export default InputBox;
