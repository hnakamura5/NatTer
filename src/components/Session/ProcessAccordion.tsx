import { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Box } from "@mui/system";
import { useTheme } from "../../datatypes/Theme"

import styled from "@emotion/styled";

interface ProcessAccordionProps {
  commandName: string;
  commandResponse: string;
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
        sx={{ marginBottom: "2px"}}
      >
        <AccordionStyle>
          <AccordionSummary
            expandIcon={<ExpandMoreIcon />}
          >
            {props.commandName}
          </AccordionSummary>
        </AccordionStyle>
        <AccordionStyle>
          <AccordionDetails>
            {props.commandResponse}
          </AccordionDetails>
        </AccordionStyle>
      </Accordion>
    </Box>
  );
}

export default ProcessAccordion;
