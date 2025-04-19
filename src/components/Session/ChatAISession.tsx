import { api } from "@/api";
import { Box } from "@mui/material";
import { ErrorBoundary } from "react-error-boundary";
import { useEffect, useRef, useState, RefObject } from "react";
import { GlobalFocusMap as GFM } from "@/components/GlobalFocusMap";
import { useSession } from "@/SessionStates";

import { log } from "@/datatypes/Logger";
import { ChatAccordion } from "../ChatAccordion";

import { hasScrollbarY } from "../Utils";
import { InteractionAccordionList } from "../InteractionAccordion/AccordionList";

interface ChatAISessionProps {
  chatAIName: string;
  systemPrompt?: string;
}

export function ChatAISession(props: ChatAISessionProps) {
  const sessionID = useSession();
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
  // Fetching chat sessions.
  const chatSessions = api.ai.chatSessions.useQuery(sessionID, {
    refetchInterval: 300,
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

  return (
    <InteractionAccordionList
      length={length}
      member={(i) => (
        <ChatAccordion
          chatID={chatSessions.data[i]}
          index={i}
          isLast={i === length - 1}
        />
      )}
    />
  );
}
