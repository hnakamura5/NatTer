import { log } from "@/datatypes/Logger";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import { ReactNode } from "react";
import styled from "@emotion/styled";

const StyledListItemButton = styled(ListItemButton)(({ theme }) => ({
  "& .MuiListItemButton-root": {
    paddingRight: 0,
    paddingLeft: 0,
  },
}));

export type SidebarListItemProps = {
  drawerOpen: boolean;
  icon: ReactNode;
  text: string;
  onClick?: () => void;
};

export function SidebarListItem(props: SidebarListItemProps) {
  const { drawerOpen, icon, text, onClick } = props;
  log.debug(
    `SidebarListItem drawerOpen: ${drawerOpen} icon: ${icon} text: ${text}`
  );
  return (
    <ListItem
      key={text}
      disablePadding
      sx={{ display: "block" }}
      onClick={onClick}
    >
      <StyledListItemButton
        sx={{
          minHeight: 48,
          paddingX: 2,
          justifyContent: drawerOpen ? "initial" : "center",
          "& .MuiListItemButton-root": {
            paddingRight: 0,
            paddingLeft: 0,
          },
        }}
      >
        <ListItemIcon
          sx={{
            minWidth: 0,
            justifyContent: "center",
            marginRight: drawerOpen ? 3 : "auto",
          }}
        >
          {icon}
        </ListItemIcon>
        {drawerOpen && <ListItemText primary={text} />}
      </StyledListItemButton>
    </ListItem>
  );
}
