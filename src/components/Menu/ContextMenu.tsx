import * as RadixContextMenu from "@radix-ui/react-context-menu";
import { useState, ReactNode, useRef } from "react";
import styled from "@emotion/styled";
import { log } from "@/datatypes/Logger";
import { IconSubMenuItem, SubMenu, SubMenuProps } from "./SubMenu";
import { IconMenuItem, IconMenuItemProps } from "./MenuItem";
import { Divider } from "@mui/material";

export const TransparentTrigger = styled(RadixContextMenu.Trigger)({
  position: "relative",
  flex: 1,
});

export const ContextMenuStyleBox = styled.div(({ theme }) => ({
  fontSize: theme.system.fontSize,
  width: theme.system.contextMenuWidth,
  backgroundColor: theme.system.contextMenuBackgroundColor,
  color: theme.system.textColor,
  borderRadius: "2px",
  position: "relative",
  flex: 1,
  padding: "2px",
}));

function isPointInsideElement(element: HTMLElement, x: number, y: number) {
  const rect = element.getBoundingClientRect();
  const isWithinX = x >= rect.left && x <= rect.right;
  const isWithinY = y >= rect.top && y <= rect.bottom;
  return isWithinX && isWithinY;
}

// Context to use ContextMenu. Enable the right-click context menu to the children.
// The content of the context menu is passed as the prop contextMenuItems.
export function ContextMenu(props: { children: ReactNode; items: ReactNode }) {
  return (
    <RadixContextMenu.Root modal={false}>
      <TransparentTrigger>{props.children}</TransparentTrigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content>
          <ContextMenuStyleBox>{props.items}</ContextMenuStyleBox>
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

export function ContextMenuItem(props: IconMenuItemProps) {
  return (
    <RadixContextMenu.Item>
      <IconMenuItem {...props} />
    </RadixContextMenu.Item>
  );
}

export const ContextSubMenuStyleBox = styled.div(({ theme }) => ({
  fontSize: theme.system.fontSize,
  minWidth: theme.system.contextNestedMenuWidth,
  backgroundColor: theme.system.contextMenuBackgroundColor,
  color: theme.system.textColor,
  borderRadius: "3px",
  padding: "3px",
}));

export function ContextSubMenu(props: SubMenuProps) {
  return (
    <SubMenu {...props}>
      <ContextSubMenuStyleBox>{props.children}</ContextSubMenuStyleBox>
    </SubMenu>
  );
}

export function ContextSubMenuItem(props: IconMenuItemProps) {
  return (
    <RadixContextMenu.Item>
      <IconSubMenuItem {...props} />
    </RadixContextMenu.Item>
  );
}


export function ContextDivider() {
  return <Divider sx={{
    marginTop: "5px",
    marginBottom: "5px",
  }}/>;
}
