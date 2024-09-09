import { Box, Button, TextField } from "@mui/material";
import SendIcon from '@mui/icons-material/Send';

function InputBox() {
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
        style={{ color: "white", width: "70%", backgroundColor: "white"}}
      />
      <Button variant="contained" startIcon={<SendIcon />} size="large" />
    </div>
  );
}

export default InputBox;
