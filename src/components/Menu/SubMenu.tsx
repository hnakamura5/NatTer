import * as RadixContextMenu from "@radix-ui/react-context-menu";
import { ReactNode } from "react";
import { log } from "@/datatypes/Logger";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { InlineFullFillPadding } from "../AlignUtils";
import { MenuItem } from "./MenuItem";
import { useTheme } from "@/AppState";

export function SubMenuItem(props: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <MenuItem>
      <div style={{ display: "flex", flex: 1 }}>
        {props.children}
        <InlineFullFillPadding />
        <span style={{ verticalAlign: "middle", marginTop: "3px" }}>
          <ChevronRightIcon
            sx={{ scale: 1.4, fontSize: theme.system.fontSize }}
          />
        </span>
      </div>
    </MenuItem>
  );
}

export type SubMenuProps = {
  label: ReactNode;
  disabled?: boolean;
  children: ReactNode;
};

export function SubMenu(props: SubMenuProps) {
  return (
    <RadixContextMenu.Sub>
      <RadixContextMenu.SubTrigger disabled={props.disabled}>
        {props.label}
      </RadixContextMenu.SubTrigger>
      <RadixContextMenu.Portal>
        <RadixContextMenu.SubContent>
          {props.children}
        </RadixContextMenu.SubContent>
      </RadixContextMenu.Portal>
    </RadixContextMenu.Sub>
  );
}
