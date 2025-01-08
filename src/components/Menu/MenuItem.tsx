import { ListItemIcon, MenuItem as MuiMenuItem } from "@mui/material";
import styled from "@emotion/styled";
import { ReactNode } from "react";

export const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  color: theme.system.textColor,
  borderRadius: "3px",
  padding: "3px !important",
}));

export type IconMenuItemProps = {
  icon?: ReactNode;
  label: string;
  onClick: () => void;
};

export function IconMenuItem(props: IconMenuItemProps) {
  if (!props.icon) {
    return <MenuItem onClick={props.onClick}>{props.label}</MenuItem>;
  }
  return (
    <MenuItem onClick={props.onClick}>
      <ListItemIcon>
        {props.icon}
        {props.label}
      </ListItemIcon>
    </MenuItem>
  );
}
