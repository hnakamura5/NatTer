import { Box, IconButton } from "@mui/material";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { api } from "@/api";

import { AlignRight } from "@/components/AlignUtils";
import { PathParsed } from "@/datatypes/PathAbstraction";
import { FileBreadcrumbs } from "./FileBreadcrumbs";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import BookmarksIcon from "@mui/icons-material/Bookmarks";
import { useFileManagerHandle } from "./FileManagerHandle";
import { log } from "@/datatypes/Logger";

function NavigationForwardButton(props: {
  parsedPath: PathParsed;
  navigateForward: () => void;
}) {
  return (
    <IconButton
      onClick={() => {
        console.log("Move forward");
        props.navigateForward();
      }}
    >
      <NavigateNextIcon fontSize="small" />
    </IconButton>
  );
}

function NavigationBackButton(props: {
  parsedPath: PathParsed;
  navigateBack: () => void;
}) {
  return (
    <IconButton
      onClick={() => {
        console.log("Move back");
        props.navigateBack();
      }}
    >
      <NavigateBeforeIcon fontSize="small" />
    </IconButton>
  );
}

function KeepTrackCurrentToggleButton(props: {
  trackingCurrent: () => boolean;
  toggleKeepTrackCurrent: () => void;
}) {
  const color = props.trackingCurrent() ? "warning" : "disabled";
  return (
    <IconButton
      onClick={() => {
        props.toggleKeepTrackCurrent();
      }}
    >
      <LinkIcon fontSize="small" color={color} />
    </IconButton>
  );
}

function BookmarksButton(props: { bookmarks: () => void }) {
  return (
    <IconButton
      onClick={() => {
        console.log("Bookmarks");
        props.bookmarks();
      }}
    >
      <BookmarksIcon fontSize="small" />
    </IconButton>
  );
}

function SearchButton(props: { search: () => void }) {
  return (
    <IconButton
      onClick={() => {
        console.log("Search");
        props.search();
      }}
    >
      <SearchIcon fontSize="small" />
    </IconButton>
  );
}

function SplitButton(props: { split: () => void }) {
  return (
    <IconButton
      onClick={() => {
        console.log("Split");
        props.split();
      }}
    >
      <VerticalSplitIcon fontSize="small" />
    </IconButton>
  );
}

const FileManagerHeaderFrame = styled(Box)(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  padding: "0px 0px 0px 0px", // top right bottom left
  color: theme.system.textColor,
  backgroundColor: theme.system.secondaryBackgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
}));

export type FileManagerHeaderProps = {
  focusRef?: React.RefObject<HTMLElement>;
};

export function FileManagerHeader(props: FileManagerHeaderProps) {
  const handle = useFileManagerHandle();
  const fullPath = handle.getCurrentPath();
  const [parsedPath, setParsedPath] = useState<PathParsed | undefined>(
    undefined
  );
  useEffect(() => {
    if (parsedPath?.fullPath != fullPath) {
      setParsedPath(undefined);
    }
  }, [fullPath, parsedPath]);
  const parsed = api.fs.parsePath.useQuery(
    {
      fullPath: fullPath,
    },
    {
      enabled: parsedPath === undefined,
      onError: () => {
        log.error(`Failed to parse ${fullPath}`);
      },
    }
  );
  if (!parsedPath && parsed.data) {
    setParsedPath(parsed.data);
  }
  if (!parsed.data) {
    return <div>Loading...</div>;
  }
  log.debug(
    `FileManagerHeader: ${parsed.data.fullPath}: `,
    parsed.data.dirHier
  );
  return (
    <FileManagerHeaderFrame>
      <NavigationBackButton
        parsedPath={parsed.data}
        navigateBack={handle.navigateBack}
      />
      <NavigationForwardButton
        parsedPath={parsed.data}
        navigateForward={handle.navigateForward}
      />
      <KeepTrackCurrentToggleButton
        trackingCurrent={handle.trackingCurrent}
        toggleKeepTrackCurrent={() => {
          handle.toggleKeepTrackCurrent();
        }}
      />
      <FileBreadcrumbs parsedPath={parsed.data} />
      <AlignRight>
        <BookmarksButton bookmarks={handle.getBookmarks} />
      </AlignRight>
      <AlignRight>
        <SearchButton
          search={
            // TODO: implement search
            () => console.log("TODO: search")
          }
        />
      </AlignRight>
      <AlignRight>
        <SplitButton split={handle.splitPane} />
      </AlignRight>
    </FileManagerHeaderFrame>
  );
}
