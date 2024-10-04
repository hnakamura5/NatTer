import { useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  colors,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box } from "@mui/system";
import { useTheme } from "@/datatypes/Theme";
import { api } from "@/api";
import { Command, getOutputPartOfStdout } from "@/datatypes/Command";

import styled from "@emotion/styled";

import { AnsiUp } from "ansi-up";

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
  `;
  const CommandResponseStyle = styled(Box)`
    width: 100%;
    margin-right: 10px;
    background-color: ${theme.terminal.colors.secondaryBackground};
    padding: 5px;
  `;

  const [expanded, setExpanded] = useState<boolean>(true);
  const handleChange = (_: React.SyntheticEvent, newExpanded: boolean) => {
    setExpanded(newExpanded);
  };
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
            sx={{
              paddingX: 1,
              paddingY: 0,
              marginY: -0.5,
            }}
          >
            <CommandResponseStyle>{command.command}</CommandResponseStyle>
          </AccordionSummary>
        </AccordionStyle>
        <AccordionStyle>
          <AccordionDetails
            sx={{
              paddingX: 1,
              paddingY: 0,
            }}
          >
            <CommandResponseStyle>
              <Box
                sx={{
                  borderLeft: `3px solid ${theme.terminal.infoColor}`,
                  paddingLeft: "5px",
                }}
              >
                <span>{command.currentDirectory}</span>
                <span>[{command.startTime}]</span>
              </Box>
              <Box
                sx={{
                  borderLeft: `3px solid ${theme.terminal.stdoutColor}`,
                  paddingLeft: "5px",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: stdoutHTML,
                  }}
                />
              </Box>
              <Box
                sx={{
                  borderLeft: `3px solid ${theme.terminal.stderrColor}`,
                  paddingLeft: "5px",
                }}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: stderrHTML,
                  }}
                />
              </Box>
            </CommandResponseStyle>
          </AccordionDetails>
        </AccordionStyle>
      </Accordion>
    </Box>
  );
}

export default ProcessAccordion;
