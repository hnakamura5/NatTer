import { api } from "@/api";
import ProcessAccordion from "@/components/ProcessAccordion";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useRef, useState } from "react";
import { GlobalFocusMap as GFM } from "@/components/GlobalFocusMap";
import { logger } from "@/datatypes/Logger";
import { usePid } from "@/SessionStates";

interface SessionProps {}

function Session(props: SessionProps) {
  const pid = usePid();
  // Length is used as the trigger of the event of submitting new command.
  const [length, setLength] = useState<number>(0);
  // Mechanism to scroll to the bottom of the session.
  const bottom = useRef<HTMLDivElement>(null);
  const handleGFM = GFM.useHandle();
  // Effect on the length change.
  useEffect(() => {
    handleGFM.focus(GFM.Key.LastCommand);
    // Scroll to the bottom.
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [handleGFM, length]);

  // Fetching commands.
  const commands = api.shell.commands.useQuery(pid, {
    onError: (error) => {
      logger.logTrace(`commands fetch: ${error}`);
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
  const processAccordions = commands.data.reverse().map((command, index) => {
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
          maxHeight: "calc(100vh - 50px)", // TODO: calculate using actual height.
          overflow: "auto",
          flexDirection: "column-reverse",
          justifyContent: "flex-start",
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
