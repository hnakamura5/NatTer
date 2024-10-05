import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
  Tooltip,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";

import { api } from "@/api";
import { ProcessID } from "@/server/ShellProcess";
import { useState } from "react";
import { ErrorBoundary } from "react-error-boundary";

interface InputBoxProps {
  pid: ProcessID;
}

function InputBox(props: InputBoxProps) {
  const theme = useTheme();
  const Paper = styled(MuiPaper)`
    display: flex;
    flex-direction: row;
    align-items: center;
    background-color: ${theme.terminal.colors.background};
    color: ${theme.terminal.colors.primary};
  `;
  const iconWidth = 40;
  const IconButton = styled(MuiIconButton)`
    color: ${theme.terminal.colors.primary};
    background-color: ${theme.terminal.colors.background};
    width: ${iconWidth}px;
  `;
  const InputBase = styled(MuiInputBase)`
    color: ${theme.terminal.colors.primary};
    font-family: ${theme.terminal.font};
    font-size: ${theme.terminal.fontSize};
    width: calc(100% - ${iconWidth}px);
    background-color: ${theme.terminal.colors.secondaryBackground};
    margin-left: 10px;
  `;

  const [text, setText] = useState<string>("");
  const send = api.shell.execute.useMutation();

  const submit = () => {
    send.mutate(
      { pid: props.pid, command: text },
      {
        onError: (error) => {
          console.error(`failed to send: ${error}`);
        },
      }
    );
    setText("");
  };

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <Box>InputBox load error.</Box>;
      }}
    >
      <Box>
        <Paper>
          <InputBase
            value={text}
            autoFocus={true}
            onChange={(e) => {
              setText(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.ctrlKey && e.key === "Enter") {
                submit();
              }
            }}
          />
          <Tooltip title="Run">
            <IconButton onClick={submit}>
              <SendIcon sx={{ scale: 0.8 }} />
            </IconButton>
          </Tooltip>
        </Paper>
      </Box>
    </ErrorBoundary>
  );
}

export default InputBox;
