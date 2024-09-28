import {
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
} from "@mui/material";

import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";

import styled from "@emotion/styled";
import { ProcessID } from "@/server/ShellProcess";
import { useTheme } from "@/datatypes/Theme";

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
  pid: ProcessID;
}

function HoverMenusBar(props: HoverMenusBarProps) {
  const theme = useTheme();
  return (
    <div>
      <VerticalList>
        <BlockListItem>
          <ListItemButton>
            <ListItemIcon>
              <FolderIcon
                sx={{ color: theme.system.colors.secondary, fontSize: 50 }}
              />
            </ListItemIcon>
          </ListItemButton>
        </BlockListItem>
        <BlockListItem>
          <ListItemButton>
            <ListItemIcon>
              <SettingsIcon
                sx={{ color: theme.system.colors.secondary, fontSize: 50 }}
              />
            </ListItemIcon>
          </ListItemButton>
        </BlockListItem>
      </VerticalList>
    </div>
  );
}

export default HoverMenusBar;
