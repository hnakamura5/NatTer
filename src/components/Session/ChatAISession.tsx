import { api } from "@/api";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useRef, useState, RefObject } from "react";
import { GlobalFocusMap as GFM } from "@/components/GlobalFocusMap";
import { useSession } from "@/SessionStates";

import { log } from "@/datatypes/Logger";
import { ChatAccordion } from "../ChatAccordion";

import { hasScrollbarY } from "../Utils";

interface ChatAISessionProps {
  chatAIName: string;
  systemPrompt?: string;
}

export function ChatAISession(props: ChatAISessionProps) {
  const sessionID = useSession();
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

  // Fetching chat sessions.
  const chatSessions = api.ai.chatSessions.useQuery(sessionID, {
    refetchInterval: 200,
    onError: (error) => {
      log.error(`chat sessions fetch: ${sessionID}`, error);
    },
  });
  log.debug(`sessions in sessionID-${sessionID}: `, chatSessions.data);
  if (!chatSessions.data) {
    return <Box>Loading...</Box>;
  }
  // Detecting new command exists.
  if (chatSessions.data.length !== length) {
    setLength(chatSessions.data.length);
  }

  const processAccordions = chatSessions.data.map((chatID, i) => {
    return <ChatAccordion key={i} chatID={chatID} index={i} />;
  });

  return (
    <ErrorBoundary fallbackRender={ChatAISessionError}>
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

function ChatAISessionError() {
  return <Box>ChatAISessionError</Box>;
}
