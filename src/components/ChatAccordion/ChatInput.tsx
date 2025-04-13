import React, { useState } from "react";
import { Box, TextField, Button, CircularProgress } from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean; // General loading state for the mutation
}

// Input used in each chat accordion, which is tied with the chat session.
export const ChatInput: React.FC<ChatInputProps> = ({ onSend, isLoading }) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleSend = () => {
    if (inputValue.trim() && !isLoading) {
      onSend(inputValue.trim());
      setInputValue(""); // Clear input after sending
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Send message on Enter key press (Shift+Enter for newline)
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Prevent default form submission/newline
      handleSend();
    }
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type your message..."
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        disabled={isLoading}
        multiline
        maxRows={4} // Allow some vertical expansion
        size="small"
      />
      <Button
        variant="contained"
        onClick={handleSend}
        disabled={isLoading || !inputValue.trim()}
        sx={{ minWidth: "auto", p: "8px" }} // Adjust padding for better size
      >
        {isLoading ? (
          <CircularProgress size={24} color="inherit" />
        ) : (
          <SendIcon />
        )}
      </Button>
    </Box>
  );
};
