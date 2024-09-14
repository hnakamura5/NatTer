import { Box, Button, TextField } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';
import { Theme } from "@emotion/react";

interface InputBoxProps {
  theme: Theme;
}

function InputBox(props: InputBoxProps) {
  return (
    <div>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
        }}
      />
      <TextField
        id="command-input"
        label="Command"
        variant="outlined"
        size="small"
        placeholder="Command"
        style={{ color: "white", width: "90%", backgroundColor: "white"}}
      />
      <Button variant="contained" startIcon={<SendIcon />} size="large" />
    </div>
  );
}

export default InputBox;
