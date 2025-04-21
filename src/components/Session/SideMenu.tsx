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
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

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
import { useAtom } from "jotai";
import { log } from "@/datatypes/Logger";
import { SidebarListItem } from "../DrawerSidebarLayout/SidebarListItem";
import { flexColumnGrowHeight } from "../Utils";

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

type IconType = typeof FolderIcon;

function SideMenuStyledIcon(props: { icon: IconType; color: string }) {
  const theme = useTheme();
  return (
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
  );
}

function SideMenuItem(props: {
  icon: IconType;
  text: string;
  color: string;
  popup: React.ReactNode;
  drawerOpen: boolean;
  focusKey?: GlobalFocusMap.Key;
  focusRef?: React.RefObject<HTMLElement>;
}) {
  const anchorRef = React.useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
  const [open, setOpen] = React.useState(false);

  const handleClick = useCallback(() => {
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
        <div ref={anchorRef}>
          <Popper open={open} anchorEl={anchorEl} placement="right-start">
            {props.popup}
          </Popper>
          <SidebarListItem
            text={props.text}
            onClick={handleClick}
            icon={<SideMenuStyledIcon icon={props.icon} color={props.color} />}
            drawerOpen={props.drawerOpen}
          />
        </div>
      </ClickAwayListener>
    </GlobalFocusMap.Target>
  );
}

const StyledList = styled(List)(({ theme }) => ({
  ...flexColumnGrowHeight,
  paddingTop: 0,
  paddingBottom: 0,
  backgroundColor: theme.system.backgroundColor,
}));

const ToggleButtonContainer = styled(Box)({
  marginTop: "auto",
});

interface SideMenuListProps {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

export default function SideMenu(props: SideMenuListProps) {
  const theme = useTheme();
  const fileTreeRef = React.useRef<HTMLDivElement>(null);

  return (
    <StyledList>
      <SideMenuItem
        icon={FolderIcon}
        text="File Manager"
        color={theme.shell.directoryColor}
        popup={<FileManagerWrapper focusRef={fileTreeRef} />}
        drawerOpen={props.drawerOpen}
        focusKey={GlobalFocusMap.GlobalKey.FileView}
        focusRef={fileTreeRef}
      />
      <SideMenuItem
        icon={BookmarksIcon}
        text="Bookmarks"
        color={theme.system.bookmarkColor}
        popup={<UnderConstruction issueURL="https://github.com/hnakamura5" />}
        drawerOpen={props.drawerOpen}
      />
      <SideMenuItem
        icon={SellIcon}
        text="Tags"
        color={theme.system.tagColor}
        popup={<UnderConstruction />}
        drawerOpen={props.drawerOpen}
      />
      <SideMenuItem
        icon={InfoIcon}
        text="Info"
        color={theme.system.infoColor}
        popup={<UnderConstruction />}
        drawerOpen={props.drawerOpen}
      />
      <SideMenuItem
        icon={SettingsIcon}
        text="Settings"
        color={theme.system.settingsColor}
        popup={<UnderConstruction />}
        drawerOpen={props.drawerOpen}
      />
      <ToggleButtonContainer>
        <SidebarListItem
          text={props.drawerOpen ? "Collapse Menu" : "Expand Menu"}
          onClick={() => props.setDrawerOpen(!props.drawerOpen)}
          icon={
            <SideMenuStyledIcon
              icon={props.drawerOpen ? ChevronLeftIcon : ChevronRightIcon}
              color={theme.system.defaultIconColor}
            />
          }
          drawerOpen={props.drawerOpen}
        />
      </ToggleButtonContainer>
    </StyledList>
  );
}
