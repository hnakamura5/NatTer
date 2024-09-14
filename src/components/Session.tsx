import ProcessAccordion from "./Session/ProcessAccordion";
import { Theme } from "@emotion/react";

interface SessionProps {
  theme: Theme;
}

function Session(props: SessionProps) {
  const list = Array.from({ length: 10 }, (_, index) => index + 1);
  const commandList = list.map((item) => {
    return {
      commandName: `Command ${item}`,
      commandResponse: `Response ${item}`,
    };
  });
  const processAccordions = commandList.map((command) => (
    <ProcessAccordion
      theme={props.theme}
      commandName={command.commandName}
      commandResponse={command.commandResponse}
    />
  ));

  return (
    <div>
      <h1>Session</h1>
      {processAccordions}
    </div>
  );
}

export default Session;
