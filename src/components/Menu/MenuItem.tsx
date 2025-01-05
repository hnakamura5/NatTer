import { MenuItem as MuiMenuItem } from "@mui/material";
import styled from "@emotion/styled";

export const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
  font: theme.system.font,
  fontSize: theme.system.fontSize,
  color: theme.system.textColor,
}));
