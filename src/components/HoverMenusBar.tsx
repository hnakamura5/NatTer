import { List, ListItem, ListItemButton, ListItemIcon } from "@mui/material";

import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import SellIcon from "@mui/icons-material/Sell";
import BookmarksIcon from "@mui/icons-material/Bookmarks";
import InfoIcon from "@mui/icons-material/Info";

import styled from "@emotion/styled";
import { useTheme } from "@/datatypes/Theme";

interface HoverMenusBarProps {}

function Item(props: { children: React.ReactNode }) {
  const theme = useTheme();

  const BlockListItem = styled(ListItem)({
    display: "block",
    padding: 0,
    margin: 0,
    width: theme.system.hoverMenuWidth,
  });

  return (
    <BlockListItem>
      <ListItemButton>
        <ListItemIcon>{props.children}</ListItemIcon>
      </ListItemButton>
    </BlockListItem>
  );
}

function HoverMenusBar(props: HoverMenusBarProps) {
  const theme = useTheme();
  const iconStyle = {
    color: theme.system.colors.secondary,
    fontSize: theme.system.hoverMenuIconSize,
  };

  const VerticalList = styled(List)({
    display: "flex",
    flexDirection: "column",
    marginLeft: "-5px",
    backgroundColor: theme.system.colors.secondaryBackground,
  });

  return (
    <VerticalList>
      <Item>
        <FolderIcon sx={iconStyle} />
      </Item>
      <Item>
        <BookmarksIcon sx={iconStyle} />
      </Item>
      <Item>
        <SellIcon sx={iconStyle} />
      </Item>
      <Item>
        <InfoIcon sx={iconStyle} />
      </Item>
      <Item>
        <SettingsIcon sx={iconStyle} />
      </Item>
    </VerticalList>
  );
}

export default HoverMenusBar;
