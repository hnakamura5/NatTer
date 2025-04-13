import { api } from "@/api";
import { ProcessAccordion } from "@/components/ProcessAccordion";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import React, { useEffect, useRef, useState, RefObject } from "react";
import { GlobalFocusMap as GFM } from "@/components/GlobalFocusMap";
import { usePid } from "@/SessionStates";

import { log } from "@/datatypes/Logger";
import { hasScrollbarY } from "../Utils";

interface SessionProps {}

function ShellSession(props: SessionProps) {
  const pid = usePid();
  // Length is used as the trigger of the event of submitting new command.
  const [length, setLength] = useState<number>(0);
  // Ref to scroll to the bottom of the session. (Now not used.)
  const bottom = useRef<HTMLDivElement>(null);
  // Ref to the box containing all the process accordions.
  const boxRef = useRef<HTMLDivElement>(null);
  const [boxHasScrollbarY, setBoxHasScrollbarY] = useState<boolean>(false);
  // Handle to focus on the last command.
  const handleGFM = GFM.useHandle();
  // Effect on the length change, that is, new command is added.
  useEffect(() => {
    // Switch focus to the last command.
    // ProcessAccordion will switch focus to the input box if it is the last command.
    handleGFM.focus(GFM.GlobalKey.LastCommand);
  }, [handleGFM, length]);
  // Detecting scrollbar.
  useEffect(() => {
    if (!boxRef.current) {
      return;
    }
    new ResizeObserver(() => {
      setBoxHasScrollbarY(hasScrollbarY(boxRef.current));
    }).observe(boxRef.current);
  }, [boxRef]);

  // Fetching commands.
  const numCommands = api.shell.numCommands.useQuery(pid, {
    refetchInterval: 200,
    onError: (error) => {
      log.error(`num commands fetch: ${pid}`, error);
    },
  });
  log.debug(`numCommands in pid-${pid}: ${numCommands.data}`);
  if (!numCommands.data) {
    return <Box>Loading...</Box>;
  }
  // Detecting new command exists.
  if (numCommands.data !== length) {
    setLength(numCommands.data);
  }

  const processAccordions = Array.from(
    { length: numCommands.data },
    (_, i) => i
  ).map((i) => {
    return (
      <ProcessAccordion key={i} cid={i} isLast={i === numCommands.data - 1} />
    );
  });

  return (
    <ErrorBoundary fallbackRender={SessionError}>
      <Box
        sx={{
          maxHeight: "calc(100vh - 50px)", // TODO: calculate using actual height.
          overflowX: "auto",
          overflowY: "auto",
          padding: `0px ${
            boxHasScrollbarY ? "3px" : "8px" // right
          } 0px 8px`, // top right bottom left
        }}
        ref={boxRef}
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

export default ShellSession;
