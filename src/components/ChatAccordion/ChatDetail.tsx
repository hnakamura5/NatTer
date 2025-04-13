import { Box } from "@mui/system";
import styled from "@emotion/styled";
import { useTheme } from "@/AppState";
import { ChatID } from "@/datatypes/SessionID";
import { api } from "@/api";

import { log } from "@/datatypes/Logger";
import { ChatLikeResponse } from "../InteractionAccordion/ChatLikeResponse";
import { ChatLikeUserInput } from "../InteractionAccordion/ChatLikeUserInput";

export function ChatAccordionDetail(props: { chatID: ChatID; index: number }) {
  const exchange = api.ai.chatSessionHistory.useQuery(
    {
      id: props.chatID,
      index: props.index,
    },
    {
      refetchInterval: 500,
    }
  );

  if (!exchange.data) {
    return <div>Loading...</div>;
  }

  const userInput = exchange.data.userInput;
  const aiResponse = exchange.data.aiResponse;
  return (
    <Box>
      <ChatLikeUserInput html={userInput.contentHTML} />
      {aiResponse.map((message, index) => (
        <ChatLikeResponse
          key={index}
          successHtml={message.contentHTML}
          errorHtml={message.errorHTML}
        />
      ))}
    </Box>
  );
}
