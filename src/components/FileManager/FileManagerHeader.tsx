import { Box, IconButton } from "@mui/material";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { api } from "@/api";

import { AlignRight } from "@/components/AlignUtils";
import { PathParsed } from "@/datatypes/UniversalPath";
import { FileBreadcrumbs, FileNavigationBar } from "./FileNavigationBar";
import { TooltipHover } from "@/components/TooltipHover";

import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";
import BookmarksIcon from "@mui/icons-material/Bookmarks";
import HistoryIcon from "@mui/icons-material/History";

import { useFileManagerHandle } from "./FileManagerHandle";
import { log } from "@/datatypes/Logger";
import { useLabels } from "@/AppState";
import { LabelsSchema, Labels } from "@/datatypes/Labels";

type tooltipLabelType = Labels["fileManager"]["header"]["tooltip"];

function NavigationForwardButton(props: {
  navigateForward: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  return (
    <TooltipHover title={props.tooltipLabels.forward}>
      <IconButton
        onClick={() => {
          props.navigateForward();
        }}
      >
        <NavigateNextIcon fontSize="small" />
      </IconButton>
    </TooltipHover>
  );
}

function NavigationBackButton(props: {
  navigateBack: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  return (
    <TooltipHover title={props.tooltipLabels.back}>
      <IconButton
        onClick={() => {
          props.navigateBack();
        }}
      >
        <NavigateBeforeIcon fontSize="small" />
      </IconButton>
    </TooltipHover>
  );
}

function KeepTrackCurrentToggleButton(props: {
  trackingCurrent: () => boolean;
  toggleKeepTrackCurrent: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  const color = props.trackingCurrent() ? "warning" : "disabled";
  return (
    <TooltipHover title={props.tooltipLabels.linkToCurrent}>
      <IconButton
        onClick={() => {
          props.toggleKeepTrackCurrent();
        }}
      >
        <LinkIcon fontSize="small" color={color} />
      </IconButton>
    </TooltipHover>
  );
}

function BookmarksButton(props: {
  bookmarks: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  return (
    <TooltipHover title={props.tooltipLabels.bookmark}>
      <IconButton
        onClick={() => {
          console.log("TODO: Bookmarks");
          // TODO: implement bookmarks
        }}
      >
        <BookmarksIcon fontSize="small" />
      </IconButton>
    </TooltipHover>
  );
}

function RecentHistoryButton(props: {
  recent: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  return (
    <TooltipHover title={props.tooltipLabels.history}>
      <IconButton
        onClick={() => {
          console.log("TODO: Recent");
          // TODO: implement recent
        }}
      >
        <HistoryIcon fontSize="small" />
      </IconButton>
    </TooltipHover>
  );
}

function SearchButton(props: {
  search: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  return (
    <TooltipHover title={props.tooltipLabels.search}>
      <IconButton
        onClick={() => {
          console.log("TODO: Search");
        }}
      >
        <SearchIcon fontSize="small" />
      </IconButton>
    </TooltipHover>
  );
}

function SplitButton(props: {
  split: () => void;
  tooltipLabels: tooltipLabelType;
}) {
  return (
    <IconButton
      onClick={() => {
        console.log("TODO: Split");
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
  const fullPath = handle.getActivePath();
  const [parsedPath, setParsedPath] = useState<PathParsed | undefined>(
    undefined
  );
  const labels = useLabels();
  const tooltipLabels = labels.fileManager.header.tooltip;

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
        navigateBack={handle.navigateBack}
        tooltipLabels={tooltipLabels}
      />
      <NavigationForwardButton
        navigateForward={handle.navigateForward}
        tooltipLabels={tooltipLabels}
      />
      <KeepTrackCurrentToggleButton
        trackingCurrent={handle.trackingCurrent}
        toggleKeepTrackCurrent={() => {
          handle.setKeepTrackCurrent(!handle.trackingCurrent());
        }}
        tooltipLabels={tooltipLabels}
      />
      <FileNavigationBar parsedPath={parsed.data} />
      <AlignRight>
        <BookmarksButton
          bookmarks={handle.getBookmarks}
          tooltipLabels={tooltipLabels}
        />
      </AlignRight>
      <AlignRight>
        <RecentHistoryButton
          recent={handle.getRecentDirectories}
          tooltipLabels={tooltipLabels}
        />
      </AlignRight>
      <AlignRight>
        <SearchButton
          search={
            // TODO: implement search
            () => console.log("TODO: search")
          }
          tooltipLabels={tooltipLabels}
        />
      </AlignRight>
      <AlignRight>
        <SplitButton split={handle.splitPane} tooltipLabels={tooltipLabels} />
      </AlignRight>
    </FileManagerHeaderFrame>
  );
}
