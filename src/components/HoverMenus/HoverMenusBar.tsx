import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";

import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";

import styled from "@emotion/styled";
import { Theme } from "@emotion/react";

const VerticalList = styled(List)`
  display: flex;
  flex-direction: column;
`;

const BlockListItem = styled(ListItem)`
  display: block;
  padding: 0;
  margin: 0;
  width: 80px;
`;

interface HoverMenusBarProps {
  theme: Theme;
}

function HoverMenusBar(props: HoverMenusBarProps) {
  return (
    <div>
      <VerticalList>
        <BlockListItem>
          <ListItemButton>
            <ListItemIcon>
              <FolderIcon sx={{ color: "white" , fontSize: 50 }} />
            </ListItemIcon>
          </ListItemButton>
        </BlockListItem>
        <BlockListItem>
          <ListItemButton>
            <ListItemIcon>
              <SettingsIcon sx={{ color: "white", fontSize: 50 }} />
            </ListItemIcon>
          </ListItemButton>
        </BlockListItem>
      </VerticalList>
    </div>
  );
}

export default HoverMenusBar;
