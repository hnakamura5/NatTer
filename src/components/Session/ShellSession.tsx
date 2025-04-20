import { api } from "@/api";
import { ProcessAccordion } from "@/components/ProcessAccordion";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import React, { useEffect, useRef, useState, RefObject } from "react";
import { GlobalFocusMap as GFM } from "@/components/GlobalFocusMap";
import { usePid } from "@/SessionStates";

import { log } from "@/datatypes/Logger";
import { InteractionAccordionList } from "../InteractionAccordion/AccordionList";

interface SessionProps {}

export default function ShellSession(props: SessionProps) {
  const pid = usePid();
  // Length is used as the trigger of the event of submitting new command.
  const [length, setLength] = useState<number>(0);
  // Handle to focus on the last command.
  const handleGFM = GFM.useHandle();
  // Effect on the length change, that is, new command is added.
  useEffect(() => {
    // Switch focus to the last command.
    // ProcessAccordion will switch focus to the input box if it is the last command.
    handleGFM.focus(GFM.GlobalKey.LastCommand);
  }, [handleGFM, length]);

  // Fetching commands.
  const numCommands = api.shell.numCommands.useQuery(pid, {
    refetchInterval: 300,
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

  log.debug(`ShellSession: length: ${length}`);
  return (
    <InteractionAccordionList
      length={length}
      member={(i) => <ProcessAccordion cid={i} isLast={i === length - 1} />}
    />
  );
}
