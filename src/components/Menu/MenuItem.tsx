import {
  ListItemIcon,
  ListItemText,
  MenuItem as MuiMenuItem,
} from "@mui/material";
import styled from "@emotion/styled";
import { ReactNode } from "react";
import * as RadixContextMenu from "@radix-ui/react-context-menu";

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
  if (!props.icon) {
    return (
      <MenuItem
        onClick={(e) => {
          if (props.onClick) {
            props.onClick();
            e.stopPropagation();
          }
        }}
      >
        {props.label}
      </MenuItem>
    );
  }
  return (
    <RadixContextMenu.Item>
      <MenuItem
        onClick={(e) => {
          if (props.onClick) {
            props.onClick();
            e.stopPropagation();
          }
        }}
      >
        <ListItemIcon>{props.icon}</ListItemIcon>
        {props.label}
      </MenuItem>
    </RadixContextMenu.Item>
  );
}
