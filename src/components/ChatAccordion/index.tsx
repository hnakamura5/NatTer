import React, { useState, useCallback, useEffect, useRef } from "react";
import { Box } from "@mui/system";
import { Alert, CircularProgress, Typography } from "@mui/material";
import { ChatInput } from "./ChatInput";
import { ChatMessage, ChatMessageProps } from "./ChatMessage";
import { api } from "@/api";
// Assuming InteractiveAccordion exists and has similar props to MUI Accordion + title + initiallyExpanded
// If not, replace with import { Accordion, AccordionSummary, AccordionDetails } from '@mui/material'; and adapt
import { InteractiveAccordion } from "../ProcessAccordion/InteractiveAccordion"; // Adjust path if necessary
import ExpandMoreIcon from "@mui/icons-material/ExpandMore"; // If using MUI Accordion directly

export type ChatAccordionProps = {
  index: number;
  ProcessID: string;
  chatAIName: string;
  title?: string;
};

type Message = Omit<ChatMessageProps, "content"> & {
  content: string; // Keep content as string internally for streaming updates
};

export function ChatAccordion(props: ChatAccordionProps) {
  const { index, ProcessID, chatAIName, title } = props;
  const [ProcessID, setProcessID] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false); // Loading state for session start and message response
  const [error, setError] = useState<string | null>(null);
  const [currentMessageToSend, setCurrentMessageToSend] = useState<
    string | null
  >(null);
  const messageEndRef = useRef<HTMLDivElement>(null); // Ref to scroll to bottom

  const clearHistory = api.ai.clearHistory.useMutation();

  // --- Effects ---

  // Start chat session on mount or when core props change
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setMessages([]); // Clear messages on new session start

    start.mutate(
      { chatAIName, systemPrompt },
      {
        onSuccess: (id) => {
          setProcessID(id);
          console.log(`Chat session started with ID: ${id}`);
          // Add system prompt to local messages if provided
          if (systemPrompt) {
            setMessages([{ role: "system", content: systemPrompt }]);
          } else {
            setMessages([]); // Ensure messages are empty if no system prompt
          }
          setIsLoading(false);
        },
        onError: (err) => {
          console.error("Failed to start chat session:", err);
          setError(`Failed to start session: ${err.message}`);
          setIsLoading(false);
        },
      }
    );

    // Cleanup: Stop session when component unmounts or core props change causing restart
    return () => {
      if (ProcessID) {
        console.log(`Stopping chat session: ${ProcessID}`);
        stop.mutate(ProcessID, {
          onError: (err) =>
            console.error(`Failed to stop session ${ProcessID}:`, err),
        });
        setProcessID(null); // Clear session ID on cleanup
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatAIName, systemPrompt]); // Rerun effect if chatAIName or systemPrompt changes

  // Scroll to bottom when messages update
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- api Subscription for Streaming Chat Response ---
  api.ai.chatStream.useSubscription(
    { id: ProcessID!, message: currentMessageToSend! },
    {
      enabled: !!ProcessID && !!currentMessageToSend,
      onStarted: () => {
        console.log("Stream started for message:", currentMessageToSend);
        setIsLoading(true); // Ensure loading is true when stream starts
        // Add placeholder for AI response
        setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      },
      onData: (chunk) => {
        // Append chunk to the *last* message (the AI one)
        setMessages((prev) => {
          const lastMsgIndex = prev.length - 1;
          if (lastMsgIndex >= 0 && prev[lastMsgIndex].role === "assistant") {
            const updatedMessages = [...prev];
            // Create a new object for the updated message to ensure state update
            updatedMessages[lastMsgIndex] = {
              ...updatedMessages[lastMsgIndex],
              content: updatedMessages[lastMsgIndex].content + chunk,
            };
            return updatedMessages;
          }
          // Should not happen if onStarted worked, but return prev as fallback
          console.warn(
            "chatStream.onData: Could not find assistant message placeholder."
          );
          return prev;
        });
      },
      onComplete: () => {
        console.log("Stream completed.");
        setIsLoading(false);
        setCurrentMessageToSend(null); // Ready for next message
        // Optional: Invalidate history query if you want to ensure sync with server's final state
        // utils.ai.getHistory.invalidate(ProcessID);
      },
      onError: (err) => {
        console.error("Streaming error:", err);
        setError(`Streaming error: ${err.message}`);
        // Remove the potentially incomplete AI message placeholder
        setMessages((prev) => {
          if (
            prev.length > 0 &&
            prev[prev.length - 1].role === "assistant" &&
            prev[prev.length - 1].content === ""
          ) {
            return prev.slice(0, -1);
          }
          return prev;
        });
        setIsLoading(false);
        setCurrentMessageToSend(null);
      },
    }
  );

  // --- Callbacks ---

  const handleSendMessage = useCallback(
    (message: string) => {
      if (!ProcessID || isLoading) return;

      setError(null); // Clear previous errors
      // Add user message locally
      const userMessage: Message = { role: "user", content: message };
      setMessages((prev) => [...prev, userMessage]);

      // Trigger the subscription by setting the message to send
      setCurrentMessageToSend(message);
      // Note: isLoading will be set to true within the subscription's onStarted callback
    },
    [ProcessID, isLoading]
  );

  const handleClearHistory = useCallback(() => {
    if (!ProcessID) return;
    setError(null);
    clearHistory.mutate(ProcessID, {
      onSuccess: () => {
        // Reset local history, keeping system prompt if it exists
        if (systemPrompt) {
          setMessages([{ role: "system", content: systemPrompt }]);
        } else {
          setMessages([]);
        }
        console.log(`History cleared for session: ${ProcessID}`);
      },
      onError: (err) => {
        console.error("Failed to clear history:", err);
        setError(`Failed to clear history: ${err.message}`);
      },
    });
  }, [ProcessID, systemPrompt, clearHistory]);

  // --- Render Logic ---

  // Determine the title including session ID (if available)
  const accordionTitle = `${title}${
    ProcessID ? ` (${ProcessID.substring(0, 8)}...)` : ""
  }`;

  // Loading state specifically for session initialization
  if (start.isLoading && !ProcessID) {
    return (
      <InteractiveAccordion
        title={`${title} (Initializing...)`}
        initiallyExpanded={initiallyExpanded}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 2,
          }}
        >
          <CircularProgress size={24} />
          <Typography sx={{ ml: 1 }}>Starting chat session...</Typography>
        </Box>
      </InteractiveAccordion>
    );
  }

  // Error state during session initialization
  if (start.isError && !ProcessID) {
    return (
      <InteractiveAccordion
        title={`${title} (Error)`}
        initiallyExpanded={initiallyExpanded}
      >
        <Alert
          severity="error"
          sx={{ m: 1 }}
        >{`Failed to start session: ${start.error?.message}`}</Alert>
      </InteractiveAccordion>
    );
  }

  // Main chat interface render
  return (
    // Replace InteractiveAccordion with MUI Accordion if needed
    <InteractiveAccordion
      title={accordionTitle}
      initiallyExpanded={initiallyExpanded}
      onClear={handleClearHistory}
      clearDisabled={isLoading || messages.length <= (systemPrompt ? 1 : 0)}
    >
      <Box sx={{ maxHeight: "500px", overflowY: "auto", mb: 1, p: 1 }}>
        {messages.map((msg, index) => (
          <ChatMessage
            key={`${ProcessID}-${index}`}
            role={msg.role}
            content={msg.content}
          />
        ))}
        {/* Show subtle loading indicator when waiting for AI response chunks */}
        {isLoading && currentMessageToSend && (
          <ChatMessage
            role="assistant"
            content={<CircularProgress size={20} color="inherit" />}
          />
        )}
        <div ref={messageEndRef} /> {/* Element to scroll to */}
      </Box>
      {error && (
        <Alert severity="error" sx={{ mx: 1, mb: 1 }}>
          {error}
        </Alert>
      )}
      {ProcessID ? (
        <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />
      ) : (
        <Typography sx={{ p: 2, textAlign: "center", color: "text.secondary" }}>
          Chat session not started.
        </Typography>
      )}
    </InteractiveAccordion>
  );
}
