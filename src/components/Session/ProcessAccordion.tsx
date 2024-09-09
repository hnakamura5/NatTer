import { useState } from "react";
import { Accordion, AccordionDetails, AccordionSummary } from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

function ProcessAccordion(props: {
  commandName: string;
  commandResponce: string;
}) {
  const [expanded, setExpanded] = useState<boolean>(false);
  const handleChange =
    (event: React.SyntheticEvent, newExpanded: boolean) => {
      setExpanded(newExpanded);
    };

  return (
    <div>
      <Accordion
        expanded={expanded}
        onChange={handleChange}
        sx={{ marginBottom: "2px" }}
      >
        <AccordionSummary
          aria-controls="panel1d-content"
          id="panel1d-header"
          expandIcon={<ExpandMoreIcon sx={{ fontSize: "2rem" }} />}
        >
          {props.commandName}
        </AccordionSummary>
        <AccordionDetails>{props.commandResponce}</AccordionDetails>
      </Accordion>
    </div>
  );
}

export default ProcessAccordion;
