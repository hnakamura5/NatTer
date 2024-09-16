import {
  Box,
  Paper as MuiPaper,
  InputBase as MuiInputBase,
  IconButton as MuiIconButton,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import MenuIcon from "@mui/icons-material/Menu";
import { Theme } from "@emotion/react";
import styled from "@emotion/styled";
import { useTheme } from "../datatypes/Theme";


interface InputBoxProps {
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

  return (
    <Box>
      <Paper>
        <IconButton>
          <MenuIcon />
        </IconButton>
        <InputBase />
        <IconButton>
          <SendIcon />
        </IconButton>
      </Paper>
    </Box>
  );
}

export default InputBox;
