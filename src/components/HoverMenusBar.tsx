import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
} from "@mui/material";

import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import SellIcon from "@mui/icons-material/Sell";
import BookmarksIcon from "@mui/icons-material/Bookmarks";
import InfoIcon from "@mui/icons-material/Info";

import { ClickAwayListener } from "@mui/material";

import styled from "@emotion/styled";
import { useTheme } from "@/AppState";

import { Popper, PopperPlacementType } from "@mui/material";
import React, { useCallback } from "react";

import { api } from "@/api";
import { FileTree } from "@/components/HoverMenus/FileTree";
import { usePid } from "@/SessionStates";
import FocusBoundary from "@/components/FocusBoundary";
import { UnderConstruction } from "@/components/UnderConstruction";

function FileTreeWrapper() {
  const theme = useTheme();
  const pid = usePid();
  const currentDir = api.shell.current.useQuery(pid);
  if (!currentDir.data) {
    return <div>Loading...</div>;
  }
  return (
    <FocusBoundary defaultBorderColor={theme.system.backgroundColor}>
      <FileTree home={currentDir.data.directory} />
    </FocusBoundary>
  );
}

function DummyPopup() {
  return (
    <Box sx={{ width: "200px", height: "200px", backgroundColor: "blue" }}>
      dummy
    </Box>
  );
}

interface HoverMenusBarProps {}

function Item(props: {
  children: React.ReactNode;
  anchorRef: React.RefObject<HTMLDivElement>;
  handleClick: (event: React.MouseEvent<HTMLElement>) => void;
}) {
  const theme = useTheme();
  const BlockListItem = styled(ListItem)({
    display: "block",
    padding: 0,
    margin: 0,
    width: theme.system.hoverMenuWidth,
  });

  return (
    <div ref={props.anchorRef}>
      <BlockListItem>
        <ListItemButton onClick={props.handleClick}>
          <ListItemIcon>{props.children}</ListItemIcon>
        </ListItemButton>
      </BlockListItem>
    </div>
  );
}

type IconType = typeof FolderIcon;

function HoverMenuItem(props: {
  icon: IconType;
  color: string;
  popup: React.ReactNode;
}) {
  const theme = useTheme();
  const iconSize = theme.system.hoverMenuIconSize;

  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorRef.current);
    setOpen((currentOpen) => !currentOpen);
  }, []);

  return (
    <ClickAwayListener
      onClickAway={() => {
        setOpen(false);
      }}
    >
      <div>
        <Popper open={open} anchorEl={anchorEl} placement="right-start">
          {props.popup}
        </Popper>
        <Item handleClick={handleClick} anchorRef={anchorRef}>
          <props.icon sx={{ color: theme.system.defaultIconColor, fontSize: iconSize }} />
        </Item>
      </div>
    </ClickAwayListener>
  );
}

function HoverMenusBar(props: HoverMenusBarProps) {
  const theme = useTheme();
  const VerticalList = styled(List)({
    display: "flex",
    flexDirection: "column",
    marginLeft: "-5px",
    backgroundColor: theme.system.secondaryBackgroundColor,
  });
  return (
    <VerticalList>
      <HoverMenuItem
        icon={FolderIcon}
        color={theme.terminal.directoryColor}
        popup={<FileTreeWrapper />}
      />
      <HoverMenuItem
        icon={BookmarksIcon}
        color={theme.system.bookmarkColor}
        popup={<UnderConstruction issueURL="https://github.com/hnakamura5" />}
      />
      <HoverMenuItem
        icon={SellIcon}
        color={theme.system.tagColor}
        popup={<UnderConstruction />}
      />
      <HoverMenuItem
        icon={InfoIcon}
        color={theme.system.infoColor}
        popup={<UnderConstruction />}
      />
      <HoverMenuItem
        icon={SettingsIcon}
        color={theme.system.settingsColor}
        popup={<UnderConstruction />}
      />
    </VerticalList>
  );
}

export default HoverMenusBar;
