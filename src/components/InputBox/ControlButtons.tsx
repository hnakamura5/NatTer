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
import { useLabels, useTheme } from "@/AppState";

import { TooltipHover } from "@/components/TooltipHover";

import { InputText, usePid } from "@/SessionStates";
import { useCallback, useState } from "react";
import { useAtom } from "jotai";

const iconWidth = "20px";
const IconButton = styled(MuiIconButton)(({ theme }) => ({
  color: theme.shell.textColor,
  backgroundColor: theme.shell.backgroundColor,
  width: iconWidth,
  padding: "0px",
  scale: 0.8,
}));

function Button(props: {
  icon: React.ReactNode;
  color: string;
  tooltip: string;
  onClick: () => void;
}) {
  return (
    <TooltipHover title={props.tooltip}>
      <IconButton onClick={props.onClick}>
        <span
          style={{
            color: props.color,
          }}
        >
          {props.icon}
        </span>
      </IconButton>
    </TooltipHover>
  );
}

export function ControlButtons(props: { submit: (command: string) => void }) {
  const theme = useTheme();
  const labels = useLabels();
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
        color={theme.shell.runButtonColor}
        tooltip={`${labels.input.tooltip.run} (Ctrl+Enter)`}
        onClick={run}
      />
    </IconBox>
  );
}

// <Button
//   icon={<PlayCircle />}
//   color={theme.shell.runBackgroundButtonColor}
//   tooltip={`${labels.input.tooltip.runBackground} (Ctrl+Alt+Enter)`}
//   onClick={run}
// />
