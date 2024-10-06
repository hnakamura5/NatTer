import { api } from "@/api";
import ProcessAccordion from "@/components/Session/ProcessAccordion";
import { ProcessID } from "@/server/ShellProcess";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useRef, useState } from "react";

interface SessionProps {
  pid: ProcessID;
}

function Session(props: SessionProps) {
  // Length is used as the trigger of the event of submitting new command.
  const [length, setLength] = useState<number>(0);
  // Mechanism to scroll to the bottom of the session.
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (bottom.current) {
      bottom.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [length]);

  // Fetching commands.
  const commands = api.shell.commands.useQuery(props.pid, {
    onError: (error) => {
      console.log(`commands fetch: ${error}`);
    },
    refetchInterval: 200,
  });
  if (!commands.data) {
    return <Box>Loading...</Box>;
  }
  // Detecting new command exists.
  if (commands.data.length !== length) {
    setLength(commands.data.length);
  }

  // List of commands into list of ProcessAccordion.
  const processAccordions = commands.data.map((command, index) => {
    console.log(`command: ${command.command} key: ${index}`);
    return (
      <ProcessAccordion
        command={command}
        key={command.clock}
        listIndex={index}
      />
    );
  });

  return (
    <ErrorBoundary
      fallbackRender={() => {
        return <Box>Session load error.</Box>;
      }}
    >
      <Box
        sx={{
          maxHeight: "calc(100vh - 70px)", // TODO: calculate using actual height.
          overflow: "auto",
        }}
      >
        {processAccordions}
        <div ref={bottom} />
      </Box>
    </ErrorBoundary>
  );
}

export default Session;
