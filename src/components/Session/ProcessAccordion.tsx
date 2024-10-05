import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Icon,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import LoopICon from "@mui/icons-material/Loop";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { Box } from "@mui/system";
import { useTheme } from "@/datatypes/Theme";
import { api } from "@/api";
import { Command, getOutputPartOfStdout } from "@/datatypes/Command";

import styled from "@emotion/styled";

import { AnsiUp } from "ansi-up";

// The original implementation of ansi_up.js does not escape the space.
// We fix this by force overriding the doEscape method.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(AnsiUp.prototype as any).doEscape = function (txt: any) {
  return txt.replace(/[ &<>]/gm, function (str: string) {
    if (str === " ") return "&nbsp;";
    if (str === "&") return "&amp;";
    if (str === "<") return "&lt;";
    if (str === ">") return "&gt;";
  });
};

interface ProcessAccordionProps {
  command: Command;
  listIndex: number;
}

function ProcessAccordion(props: ProcessAccordionProps) {
  const theme = useTheme();
  const AccordionStyle = styled(Box)`
    color: ${theme.terminal.colors.primary};
    background-color: ${theme.terminal.colors.background};
    font-family: ${theme.terminal.font};
    font-size: ${theme.terminal.fontSize};
    text-align: left;
    overflow: hidden;
    overflow-wrap: anywhere;
  `;
  const CommandStyle = styled(Box)`
    width: 100%;
    margin-right: 5px;
    background-color: ${theme.terminal.colors.background};
    padding-left: 5px;
  `;
  const ResponseStyle = styled(Box)`
    width: 100%;
    margin-right: 10px;
    background-color: ${theme.terminal.colors.secondaryBackground};
    padding-bottom: 5px;
  `;

  const CommandInternalPadding = {
    paddingX: 1,
    paddingY: 1,
    marginY: -2,
  };
  const ResponseInternalPadding = {
    paddingX: 1.5,
    paddingY: 1,
    marginY: -1,
  };
  const colorLine = (color: string) => {
    return {
      borderLeft: `3px solid ${color}`,
      paddingLeft: 1,
    };
  };

  const [expanded, setExpanded] = useState<boolean>(true);
  const handleChange = (_: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded);
  };

  const statusIcon = (command: Command) => {
    if (command.exitStatusIsOK === undefined) {
      return (
        <LoopICon sx={{ scale: 0.7, marginTop: -0.2, marginLeft: -0.8 }} />
      );
    }
    if (command.exitStatusIsOK) {
      return (
        <CheckCircleOutlineIcon
          sx={{
            color: theme.terminal.stdoutColor,
            scale: 0.7,
            marginTop: -0.2,
            marginLeft: -0.8,
          }}
        />
      );
    }
    return (
      <ErrorOutlineIcon
        sx={{
          color: theme.terminal.stderrColor,
          scale: 0.7,
          marginTop: -0.2,
          marginLeft: -0.8,
        }}
      />
    );
  };

  // Convert stdout and stderr to HTML.
  const command = props.command;
  const ansiUp = new AnsiUp();
  const stdoutHTML = ansiUp
    .ansi_to_html(getOutputPartOfStdout(command))
    .replace(/\n/g, "<br />");
  const stderrHTML = ansiUp
    .ansi_to_html(command.stderr)
    .replace(/\n/g, "<br />");

  console.log(`command: ${command.command}, id: ${props.listIndex}`);
  console.log(`stdout: ${command.stdout}`);
  console.log(`stderr: ${command.stderr}`);

  return (
    <Box>
      <Accordion expanded={expanded} onChange={handleChange}>
        <AccordionStyle>
          <AccordionSummary
            expandIcon={
              <ExpandMoreIcon
                sx={{
                  color: theme.terminal.colors.primary,
                  margin: -1,
                }}
              />
            }
            sx={CommandInternalPadding}
          >
            {statusIcon(command)}
            <CommandStyle>{command.command}</CommandStyle>
          </AccordionSummary>
        </AccordionStyle>
        <AccordionStyle>
          <AccordionDetails sx={ResponseInternalPadding}>
            <ResponseStyle>
              <Box sx={colorLine(theme.terminal.infoColor)}>
                <span>
                  [{command.startTime}] {command.currentDirectory}
                </span>
              </Box>
              <Box sx={colorLine(theme.terminal.stdoutColor)}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: stdoutHTML,
                  }}
                />
              </Box>
              <Box sx={colorLine(theme.terminal.stderrColor)}>
                <div
                  dangerouslySetInnerHTML={{
                    __html: stderrHTML,
                  }}
                />
              </Box>
            </ResponseStyle>
          </AccordionDetails>
        </AccordionStyle>
      </Accordion>
    </Box>
  );
}

export default ProcessAccordion;
