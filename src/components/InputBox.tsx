import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MenuIcon from "@mui/icons-material/Menu";
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
    width: calc(100% - ${iconWidth * 2}px);
  `;

  const [text, setText] = useState<string>("");
  const send = api.shell.execute.useMutation();

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <Box>fallback InputBox</Box>;
      }}
    >
      <Box>
        <Paper>
          <IconButton>
            <MenuIcon />
          </IconButton>
          <InputBase
            value={text}
            autoFocus={true}
            onChange={(e) => {
              setText(e.target.value);
            }}
          />
          <IconButton
            onClick={() => {
              send.mutate(
                { pid: props.pid, command: text },
                {
                  onError: (error) => {
                    console.error(`failed to send: ${error}`);
                  },
                }
              );
            }}
          >
            <SendIcon />
          </IconButton>
        </Paper>
      </Box>
    </ErrorBoundary>
  );
}

export default InputBox;
