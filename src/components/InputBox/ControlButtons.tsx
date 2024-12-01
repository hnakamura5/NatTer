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
import { useTheme } from "@/AppState";

import { InputText, usePid } from "@/SessionStates";
import { useCallback, useState } from "react";
import { useAtom } from "jotai";

function Button(props: {
  icon: React.ReactNode;
  color: string;
  tooltip: string;
  onClick: () => void;
}) {
  const theme = useTheme();
  const iconWidth = "20px";
  const IconButton = styled(MuiIconButton)({
    color: theme.terminal.textColor,
    backgroundColor: theme.terminal.backgroundColor,
    width: iconWidth,
    padding: "0px",
    scale: 0.6,
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

export function ControlButtons(props: { submit: (command: string) => void }) {
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
