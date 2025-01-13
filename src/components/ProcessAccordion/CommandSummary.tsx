import { useTheme } from "@/AppState";
import { api } from "@/api";
import { Box } from "@mui/system";

import styled from "@emotion/styled";
import { Theme } from "@/datatypes/Theme";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoopICon from "@mui/icons-material/Loop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import { Command, summarizeCommand } from "@/datatypes/Command";

function statusIconSx(color: string) {
  const marginTop = -0.4;
  const marginLeft = -1.0;
  return {
    color: color,
    scale: 0.7,
    verticalAlign: "-2px",
    marginTop: marginTop,
    marginLeft: marginLeft,
  };
}

function statusIcon(command: Command, theme: Theme) {
  if (command.exitStatusIsOK === undefined) {
    return <LoopICon sx={statusIconSx(theme.shell.thinTextColor)} />;
  }
  if (command.exitStatusIsOK) {
    return (
      <CheckCircleOutlineIcon sx={statusIconSx(theme.shell.stdoutColor)} />
    );
  }
  return <ErrorOutlineIcon sx={statusIconSx(theme.shell.stderrColor)} />;
}

interface CommandSummaryProps {
  command: Command;
}

const CommandStyle = styled(Box)(({ theme }) => ({
  width: "100%",
  backgroundColor: theme.shell.backgroundColor,
  paddingTop: "3px",
}));

const FloatRight = styled.span(({ theme }) => ({
  float: "right",
  marginRight: "10px",
}));

export function CommandSummary(props: CommandSummaryProps) {
  const theme = useTheme();
  const command = props.command;
  return (
    <>
      <CommandStyle>
        <span style={{ verticalAlign: "5px" }}>
          {summarizeCommand(command, 40)}
        </span>
        <FloatRight>
          {statusIcon(command, theme)}
          <span
            style={{ verticalAlign: "5px", color: theme.shell.thinTextColor }}
          >
            #{command.cid}
          </span>
        </FloatRight>
      </CommandStyle>
    </>
  );
}
