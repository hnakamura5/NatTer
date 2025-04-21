import { ListItemIcon, MenuItem as MuiMenuItem } from "@mui/material";
import styled from "@emotion/styled";
import { ReactNode } from "react";

export const MenuItem = styled(MuiMenuItem)(({ theme }) => ({
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  color: theme.system.textColor,
  borderRadius: "3px",
  padding: "0px !important",
}));

export type IconMenuItemProps = {
  icon?: ReactNode;
  label: string | ReactNode;
  onClick?: () => void;
};

export function IconMenuItem(props: IconMenuItemProps) {
  return (
    <MenuItem
      onClick={(e) => {
        if (props.onClick) {
          props.onClick();
          e.stopPropagation();
        }
      }}
    >
      {props.icon && <ListItemIcon>{props.icon}</ListItemIcon>}
      {props.label}
    </MenuItem>
  );
}
