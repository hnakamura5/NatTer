import { api } from "@/api";
import { ProcessAccordion } from "@/components/ProcessAccordion";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import React, { useEffect, useRef, useState, RefObject } from "react";
import { GlobalFocusMap as GFM } from "@/components/GlobalFocusMap";
import { usePid } from "@/SessionStates";

import { log } from "@/datatypes/Logger";
import { hasScrollbarY } from "../Utils";
import { Virtuoso } from "react-virtuoso";

interface SessionProps {}

function ShellSession(props: SessionProps) {
  const pid = usePid();
  // Length is used as the trigger of the event of submitting new command.
  const [length, setLength] = useState<number>(0);
  // Ref to scroll to the bottom of the session. (Now not used.)
  const bottom = useRef<HTMLDivElement>(null);
  // Ref to the box containing all the process accordions.
  const boxRef = useRef<HTMLDivElement>(null);
  const [hasScrollbarY, setHasScrollbarY] = useState<boolean>(false);
  // Handle to focus on the last command.
  const handleGFM = GFM.useHandle();
  // Effect on the length change, that is, new command is added.
  useEffect(() => {
    // Switch focus to the last command.
    // ProcessAccordion will switch focus to the input box if it is the last command.
    handleGFM.focus(GFM.GlobalKey.LastCommand);
  }, [handleGFM, length]);
  // Detecting scrollbar.

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

  log.debug(`ShellSession: length: ${length} hasScrollbarY: ${hasScrollbarY}`);

  // TODO try other virtualizers
  return (
    <ErrorBoundary fallbackRender={SessionError}>
      <Box
        sx={{
          height: "calc(100vh - 50px)", // TODO: calculate using actual height.
          padding: `0px ${
            hasScrollbarY ? "0px" : "5px" // right
          } 0px 8px`, // top right bottom left
        }}
      >
        <Virtuoso
          style={{
            height: "100%",
          }}
          data={Array.from({ length }, (_, i) => i)}
          itemContent={(_, i) => {
            return <ProcessAccordion cid={i} isLast={i === length - 1} />;
          }}
          alignToBottom
          scrollerRef={(scroller) => {
            if (scroller && scroller instanceof HTMLElement) {
              setHasScrollbarY(scroller.scrollHeight > scroller.clientHeight);
            }
          }}
        />
        <div ref={bottom} />
      </Box>
    </ErrorBoundary>
  );
}

function SessionError() {
  return <Box>Session load error.</Box>;
}

export default ShellSession;
