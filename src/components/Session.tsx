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
  const numCommands = api.shell.numCommands.useQuery(pid, {
    refetchInterval: 200,
    onError: (error) => {
      logger.logTrace(`commands fetch: ${error}`);
    },
  });
  if (!numCommands.data) {
    return <Box>Loading...</Box>;
  }
  // Detecting new command exists.
  if (numCommands.data !== length) {
    setLength(numCommands.data);
  }
  if (numCommands.data === 0) {
    return <Box>No commands.</Box>;
  }
  const processAccordions = Array.from(
    { length: numCommands.data },
    (_, i) => i
  )
    .map((i) => {
      return (
        <ProcessAccordion key={i} cid={i} isLast={i === numCommands.data - 1} />
      );
    });

  return (
    <ErrorBoundary fallbackRender={SessionError}>
      <Box
        sx={{
          maxHeight: "calc(100vh - 50px)", // TODO: calculate using actual height.
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
