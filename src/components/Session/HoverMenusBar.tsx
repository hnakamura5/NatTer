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
import React, { useCallback, useEffect } from "react";

import { api } from "@/api";
import { FileManager } from "@/components/FileManager";
import { FileManagerStateAtom, usePid } from "@/SessionStates";
import FocusBoundary from "@/components/FocusBoundary";
import { UnderConstruction } from "@/components/UnderConstruction";
import { GlobalFocusMap } from "../GlobalFocusMap";
import { set } from "zod";
import { useAtom } from "jotai";
import { log } from "@/datatypes/Logger";

function FileManagerWrapper(props: {
  focusRef: React.RefObject<HTMLDivElement>;
}) {
  const theme = useTheme();
  const pid = usePid();
  const [fileManagerState, setFileManagerState] = useAtom(FileManagerStateAtom);
  const currentDir = api.process.currentDirectory.useQuery(pid, {
    refetchInterval: 1000,
    onError: (error) => {
      log.error(`currentDir fetch: ${error}`);
    },
  });
  const remoteHost = api.process.remoteHost.useQuery(pid, {
    refetchInterval: 1000,
    onError: (error) => {
      log.error(`remoteHost fetch error: ${error}`);
    },
  });

  if (!currentDir.isSuccess || !remoteHost.isSuccess) {
    return <div>Loading...</div>;
  }
  log.debug(
    `FileManagerWrapper currentDir: ${currentDir.data} remoteHost: `,
    remoteHost.data
  );
  return (
    <FocusBoundary defaultBorderColor={theme.system.backgroundColor}>
      <FileManager
        current={currentDir.data}
        state={fileManagerState}
        setState={setFileManagerState}
        ref={props.focusRef}
        remoteHost={remoteHost.data.remoteHost}
      />
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
        <ListItemButton
          onClick={props.handleClick}
          sx={{
            padding: "6px 0px 6px 5px", // top right bottom left
          }}
        >
          <ListItemIcon>{props.children}</ListItemIcon>
        </ListItemButton>
      </BlockListItem>
    </div>
  );
}

type IconType = typeof FolderIcon;

interface HoverMenusBarProps {}

function HoverMenuItem(props: {
  icon: IconType;
  color: string;
  popup: React.ReactNode;
  focusKey?: GlobalFocusMap.Key;
  focusRef?: React.RefObject<HTMLElement>;
}) {
  const theme = useTheme();

  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);

  const handleClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(anchorRef.current);
    setOpen((currentOpen) => !currentOpen);
  }, []);

  useEffect(() => {
    setAnchorEl(anchorRef.current);
  }, [anchorRef]);

  return (
    <GlobalFocusMap.Target
      focusKey={props.focusKey}
      focusRef={props.focusRef}
      callBeforeFocus={() => {
        if (!open) {
          setOpen(true);
        }
        return new Promise((resolve) => {
          // Wait until the popup is opened, that is the focusRef is set.
          const interval = setInterval(() => {
            if (props.focusRef?.current) {
              clearInterval(interval);
              resolve(false);
            }
          }, 100);
        });
      }}
    >
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
            <props.icon
              sx={{
                color: theme.system.defaultIconColor,
                fontSize: theme.system.hoverMenuIconSize,
                margin: 0,
                "& .MuiListItemIcon-root": {
                  margin: 0,
                },
              }}
            />
          </Item>
        </div>
      </ClickAwayListener>
    </GlobalFocusMap.Target>
  );
}
const VerticalList = styled(List)(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  padding: 0,
  backgroundColor: theme.system.secondaryBackgroundColor,
}));

function HoverMenusBar(props: HoverMenusBarProps) {
  const theme = useTheme();
  const fileTreeRef = React.useRef<HTMLDivElement>(null);

  return (
    <VerticalList>
      <HoverMenuItem
        icon={FolderIcon}
        color={theme.shell.directoryColor}
        popup={<FileManagerWrapper focusRef={fileTreeRef} />}
        focusKey={GlobalFocusMap.GlobalKey.FileView}
        focusRef={fileTreeRef}
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
