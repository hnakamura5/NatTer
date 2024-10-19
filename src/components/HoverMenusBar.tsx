
import { List, ListItem, ListItemButton, ListItemIcon } from "@mui/material";

import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import SellIcon from "@mui/icons-material/Sell";
import BookmarksIcon from "@mui/icons-material/Bookmarks";
import InfoIcon from "@mui/icons-material/Info";

import styled from "@emotion/styled";
import { ProcessID } from "@/server/ShellProcess";
import { useTheme } from "@/datatypes/Theme";

const BlockListItem = styled(ListItem)`
  display: block;
  padding: 0;
  margin: 0;
  width: 50px;
`;

interface HoverMenusBarProps {
  pid: ProcessID;
}

function Item(props: { children: React.ReactNode }) {
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
  const iconStyle = { color: theme.system.colors.secondary, fontSize: 25 };

  const VerticalList = styled(List)`
    display: flex;
    flex-direction: column;
    margin-left: -5px;
    background-color: ${theme.system.colors.secondaryBackground};
  `;

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
