import { useTheme } from "@/AppState";
import { api } from "@/api";
import { Box } from "@mui/system";

import styled from "@emotion/styled";
import { Theme } from "@/datatypes/Theme";

import { InteractionAccordionSummaryTitle } from "../InteractionAccordion/SummaryTitle";
import { ChatID } from "@/datatypes/SessionID";
import { useState } from "react";

export type ChatSummaryProps = {
  chatID: ChatID;
};

export function ChatSummary(props: ChatSummaryProps) {
  const [title, setTitle] = useState<string>("");
  const alive = api.ai.chatSessionAlive.useQuery(props.chatID);
  const chatTitle = api.ai.chatSessionTitle.useQuery(props.chatID, {
    enabled: title === "",
  });

  if (chatTitle.data) {
    if (title === "") {
      setTitle(chatTitle.data);
    }
  }
  return (
    <InteractionAccordionSummaryTitle
      title={title}
      setTitle={setTitle}
      statusIsOK={alive.data !== undefined ? alive.data : undefined}
      index={props.index}
    ></InteractionAccordionSummaryTitle>
  );
}
