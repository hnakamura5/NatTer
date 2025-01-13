import { Input } from "@mui/material";
import styled from "@emotion/styled";

export const BasicInput = styled(Input)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.inputBackgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
}));
