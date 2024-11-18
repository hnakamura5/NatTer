import { useTheme } from "@/AppState";
import { api } from "@/api";
import { Box } from "@mui/system";

import styled from "@emotion/styled";
import { Theme } from "@/datatypes/Theme";
import { logger } from "@/datatypes/Logger";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoopICon from "@mui/icons-material/Loop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import { Command, summarizeCommand } from "@/datatypes/Command";

function statusIcon(command: Command, theme: Theme) {
  const marginTop = -0.4;
  const marginLeft = -1.0;
  if (command.exitStatusIsOK === undefined) {
    return (
      <LoopICon
        sx={{ scale: 0.7, marginTop: marginTop, marginLeft: marginLeft }}
      />
    );
  }
  if (command.exitStatusIsOK) {
    return (
      <CheckCircleOutlineIcon
        sx={{
          color: theme.terminal.stdoutColor,
          scale: 0.7,
          marginTop: marginTop,
          marginLeft: marginLeft,
        }}
      />
    );
  }
  return (
    <ErrorOutlineIcon
      sx={{
        color: theme.terminal.stderrColor,
        scale: 0.7,
        marginTop: marginTop,
        marginLeft: marginLeft,
      }}
    />
  );
}

interface CommandSummaryProps {
  command: Command;
}

const CommandStyle = styled(Box)(({ theme }) => ({
  width: "100%",
  backgroundColor: theme.terminal.backgroundColor,
  paddingLeft: "0px",
}));
const CommandIndexStyle = styled.span(({ theme }) => ({
  float: "right",
  marginRight: "20px",
}));

export function CommandSummary(props: CommandSummaryProps) {
  const theme = useTheme();
  const command = props.command;
  return (
    <>
      {statusIcon(command, theme)}
      <CommandStyle>
        <span>{summarizeCommand(command, 40)}</span>
        <CommandIndexStyle>#{command.cid}</CommandIndexStyle>
      </CommandStyle>
    </>
  );
}
