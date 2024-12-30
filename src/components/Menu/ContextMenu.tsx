import { Menu, ClickAwayListener } from "@mui/material";
import { useState, ReactNode } from "react";

// Context to use ContextMenu. Enable the right-click context menu to the children.
// The content of the context menu is passed as the prop contextMenuItems.
// Menu is by MUI menu.
export function ContextMenu(props: {
  children: ReactNode;
  contextMenuItems: ReactNode;
}) {
  const [position, setPosition] = useState<
    | {
        mouseX: number;
        mouseY: number;
      }
    | undefined
  >(undefined);

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setPosition({ mouseX: e.clientX + 2, mouseY: e.clientY - 2 });
      }}
      style={{ display: "contents" }}
    >
      {props.children}
      <ClickAwayListener onClickAway={() => setPosition(undefined)}>
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
          {props.contextMenuItems}
        </Menu>
      </ClickAwayListener>
    </div>
  );
}
