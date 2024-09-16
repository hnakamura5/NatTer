import ProcessAccordion from "./Session/ProcessAccordion";
import { Box } from "@mui/material";
import { Theme } from "@emotion/react";

interface SessionProps {
}

function Session(props: SessionProps) {
  // TODO: Placeholder for now.
  const list = Array.from({ length: 10 }, (_, index) => index + 1);
  const commandList = list.map((item) => {
    return {
      commandName: `Command ${item}`,
      commandResponse: `Response ${item}`,
    };
  });
  const processAccordions = commandList.map((command) => (
    <ProcessAccordion
      commandName={command.commandName}
      commandResponse={command.commandResponse}
    />
  ));

  return <Box>{processAccordions}</Box>;
}

export default Session;
