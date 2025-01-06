import { ListItemIcon, MenuItem as MuiMenuItem } from "@mui/material";
import styled from "@emotion/styled";
import { ReactNode } from "react";

export const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
  font: theme.system.font,
  fontSize: theme.system.fontSize,
  color: theme.system.textColor,
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
        <span style={{ verticalAlign: "middle" }}>{props.icon}</span>
        {props.label}
      </ListItemIcon>
    </MenuItem>
  );
}
