import * as RadixContextMenu from "@radix-ui/react-context-menu";
import { useState, ReactNode, useRef } from "react";
import styled from "@emotion/styled";
import { log } from "@/datatypes/Logger";

export const StyledTrigger = styled(RadixContextMenu.Trigger)({
  position: "relative",
  flex: 1,
});

export const ContextMenuStyleBox = styled.div(({ theme }) => ({
  font: theme.system.font,
  fontSize: theme.system.fontSize,
  width: theme.system.contextMenuWidth,
  backgroundColor: theme.system.contextMenuBackgroundColor,
  color: theme.system.textColor,
  borderRadius: "5px",
  position: "relative",
  flex: 1,
}));

export const NestedContextMenuStyleBox = styled.div(({ theme }) => ({
  font: theme.system.font,
  fontSize: theme.system.fontSize,
  width: theme.system.contextNestedMenuWidth,
  backgroundColor: theme.system.contextMenuBackgroundColor,
  color: theme.system.textColor,
}));

function isPointInsideElement(element: HTMLElement, x: number, y: number) {
  const rect = element.getBoundingClientRect();
  const isWithinX = x >= rect.left && x <= rect.right;
  const isWithinY = y >= rect.top && y <= rect.bottom;
  log.debug(
    `isPointInsideElement: ${isWithinX} ${isWithinY} rect: l${rect.left} r${rect.right} t${rect.top} b${rect.bottom}`
  );
  return isWithinX && isWithinY;
}

// Context to use ContextMenu. Enable the right-click context menu to the children.
// The content of the context menu is passed as the prop contextMenuItems.
export function ContextMenu(props: {
  children: ReactNode;
  contextMenuItems: ReactNode;
}) {
  return (
    <RadixContextMenu.Root modal={false}>
      <StyledTrigger>{props.children}</StyledTrigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content>
          <ContextMenuStyleBox>{props.contextMenuItems}</ContextMenuStyleBox>
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}
