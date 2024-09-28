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

import styled from "@emotion/styled";
import { Command } from "@/server/ShellProcess";

interface ProcessAccordionProps {
  command: Command;
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

  return (
    <Box>
      <Accordion
        expanded={expanded}
        onChange={handleChange}
        sx={{ marginBottom: "2px" }}
      >
        <AccordionStyle>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            {props.command.command}
          </AccordionSummary>
        </AccordionStyle>
        <AccordionStyle>
          <AccordionDetails>
            <Box>{props.command.startTime}</Box>
            <Box>{props.command.stdout}</Box>
            <Box>{props.command.stderr}</Box>
          </AccordionDetails>
        </AccordionStyle>
      </Accordion>
    </Box>
  );
}

export default ProcessAccordion;
