import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box } from "@mui/system";
import { Accordion, Alert, CircularProgress, Typography } from "@mui/material";
import { ChatInput } from "./ChatInput";
import { api } from "@/api";
import { ChatID, SessionID } from "@/datatypes/SessionID";
import { ChatSummary } from "./ChatSummary";
import { ChatAccordionDetail } from "./ChatDetail";
import { InteractionAccordion } from "../InteractionAccordion/Accordion";

export type ChatAccordionProps = {
  chatID: ChatID;
  index: number;
};

export function ChatAccordion(props: ChatAccordionProps) {
  const { chatID, index } = props;
  const numHistory = api.ai.chatSessionNumHistory.useQuery(props.chatID, {
    refetchInterval: 500,
  });

  if (numHistory.data === undefined) {
    return <CircularProgress />;
  }
  return (
    <InteractionAccordion >
      <ChatSummary chatID={chatID} />
      <ChatAccordionDetail chatID={chatID} index={index} />
      {/* <ChatInput chatID={chatID} /> */}
    </InteractionAccordion>
  );
}
