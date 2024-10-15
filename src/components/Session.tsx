import { api } from "@/api";
import ProcessAccordion from "@/components/Session/ProcessAccordion";
import { ProcessID } from "@/server/ShellProcess";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useRef, useState } from "react";
import { GlobalFocusMap } from "./GlobalFocusMap";

interface SessionProps {
  pid: ProcessID;
}

function Session(props: SessionProps) {
  // Length is used as the trigger of the event of submitting new command.
  const [length, setLength] = useState<number>(0);
  // Mechanism to scroll to the bottom of the session.
  const bottom = useRef<HTMLDivElement>(null);
  const handleGFM = GlobalFocusMap.useHandle();
  // Effect on the length change.
  useEffect(() => {
    handleGFM.focus(GlobalFocusMap.Key.LastCommand);
    // Scroll to the bottom.
    bottom.current?.scrollIntoView({ behavior: "smooth" });
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
        isLast={index === commands.data.length - 1}
      />
    );
  });

  return (
    <ErrorBoundary fallbackRender={SessionError}>
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

function SessionError() {
  return <Box>Session load error.</Box>;
}

export default Session;
