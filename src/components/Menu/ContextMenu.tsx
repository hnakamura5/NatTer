import * as RadixContextMenu from "@radix-ui/react-context-menu";
import { ReactNode } from "react";
import styled from "@emotion/styled";
import { log } from "@/datatypes/Logger";
import { SubMenu, SubMenuProps } from "./SubMenu";
import { Divider } from "@mui/material";

const TransparentTrigger = styled(RadixContextMenu.Trigger)({
  position: "relative",
  flex: 1,
});

// Use this to surround the context menu items.
const ContextMenuStyleBox = styled.div(({ theme }) => ({
  fontSize: theme.system.fontSize,
  width: theme.system.contextMenuWidth,
  backgroundColor: theme.system.contextMenuBackgroundColor,
  color: theme.system.textColor,
  borderRadius: "2px",
  position: "relative",
  flex: 1,
  padding: "2px",
}));

// Context to use ContextMenu. Enable the right-click context menu to the children.
// The content of the context menu is passed as the prop contextMenuItems.
export function ContextMenuContext(props: {
  children: ReactNode;
  menuItems: ReactNode;
}) {
  return (
    <RadixContextMenu.Root modal={false}>
      <TransparentTrigger>{props.children}</TransparentTrigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.Content>
          <ContextMenuStyleBox>{props.menuItems}</ContextMenuStyleBox>
        </RadixContextMenu.Content>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Root>
  );
}

// Use this to surround the context sub menu items.
const ContextSubMenuStyleBox = styled.div(({ theme }) => ({
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

export function ContextDivider() {
  return (
    <Divider
      sx={{
        marginTop: "5px",
        marginBottom: "5px",
      }}
    />
  );
}
