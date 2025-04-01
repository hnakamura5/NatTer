import { Box, Typography } from "@mui/material";

import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoopICon from "@mui/icons-material/Loop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";

import styled from "@emotion/styled";
import { Theme } from "@/datatypes/Theme";
import { useTheme } from "@/AppState";

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

function statusIcon(statusIsOK: boolean | undefined, theme: Theme) {
  if (statusIsOK === undefined) {
    return <LoopICon sx={statusIconSx(theme.shell.thinTextColor)} />;
  }
  if (statusIsOK) {
    return (
      <CheckCircleOutlineIcon sx={statusIconSx(theme.shell.stdoutColor)} />
    );
  }
  return <ErrorOutlineIcon sx={statusIconSx(theme.shell.stderrColor)} />;
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

export type InteractionAccordionSummaryTitleProps = {
  index: number;
  title: string;
  setTitle: (title: string) => void;
  statusIsOK: boolean | undefined;
};

export function InteractionAccordionSummaryTitle(
  props: InteractionAccordionSummaryTitleProps
) {
  const theme = useTheme();
  return (
    <CommandStyle>
      <span style={{ verticalAlign: "5px" }}>
        {props.title /* TODO: enable edit here */}
      </span>
      <FloatRight>
        {statusIcon(props.statusIsOK, theme)}
        <span
          style={{ verticalAlign: "5px", color: theme.shell.thinTextColor }}
        >
          #{props.index}
        </span>
      </FloatRight>
    </CommandStyle>
  );
}
