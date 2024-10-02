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

  const [expanded, setExpanded] = useState<boolean>(false);
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
      <Accordion
        expanded={expanded}
        onChange={handleChange}
        sx={{ marginBottom: "2px" }}
      >
        <AccordionStyle>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {command.command}
          </AccordionSummary>
        </AccordionStyle>
        <AccordionStyle>
          <AccordionDetails>
            <Box>
              <span>{command.currentDirectory}</span>
              <span>[{command.startTime}]</span>
            </Box>
            <Box>
              <div
                dangerouslySetInnerHTML={{
                  __html: stdoutHTML,
                }}
              />
            </Box>
            <Box>
              <div
                dangerouslySetInnerHTML={{
                  __html: stderrHTML,
                }}
              />
            </Box>
          </AccordionDetails>
        </AccordionStyle>
      </Accordion>
    </Box>
  );
}

export default ProcessAccordion;
