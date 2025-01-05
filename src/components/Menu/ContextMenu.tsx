import { Menu, ClickAwayListener, Box } from "@mui/material";
import { useState, ReactNode, useRef } from "react";
import styled from "@emotion/styled";
import { log } from "@/datatypes/Logger";

export const ContextMenuStyleBox = styled(Box)(({ theme }) => ({
  font: theme.system.font,
  fontSize: theme.system.fontSize,
  width: theme.system.contextMenuWidth,
  backgroundColor: theme.system.contextMenuBackgroundColor,
  color: theme.system.textColor,
}));

export const NestedContextMenuStyleBox = styled(Box)(({ theme }) => ({
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
// Menu is by MUI menu.
export function ContextMenu(props: {
  children: ReactNode;
  contextMenuItems: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [onContext, setOnContext] = useState(false);
  const [position, setPosition] = useState<
    | {
        mouseX: number;
        mouseY: number;
      }
    | undefined
  >(undefined);

  return (
    <div
      onMouseEnter={() => {
        log.debug("Mouse enter to the container menu context");
        setOnContext(true);
      }}
      onMouseLeave={() => {
        log.debug("Mouse leave from the context menu context");
        setOnContext(false);
      }}
      onContextMenu={(e) => {
        e.preventDefault();
        log.debug(
          `onContextMenu on: ${onContext} position: ${e.clientX}, ${e.clientY} target: ${e.target} childRef: ${ref.current}`
        );
        if (
          ref.current &&
          isPointInsideElement(ref.current, e.clientX, e.clientY)
        ) {
          setPosition({ mouseX: e.clientX + 2, mouseY: e.clientY - 2 });
        } else {
          setPosition(undefined);
        }
      }}
      style={{
        display: "contents",
      }}
    >
      <ClickAwayListener onClickAway={() => setPosition(undefined)}>
        <div
          className="ContextMenuContext"
          style={{ position: "relative", flex: 1 }}
          ref={ref}
        >
          {props.children}
        </div>
      </ClickAwayListener>
      <Menu
        open={position !== undefined}
        onClose={() => setPosition(undefined)}
        anchorReference="anchorPosition"
        anchorPosition={
          position !== undefined
            ? { top: position.mouseY, left: position.mouseX }
            : undefined
        }
      >
        <ContextMenuStyleBox>{props.contextMenuItems}</ContextMenuStyleBox>
      </Menu>
    </div>
  );
}
