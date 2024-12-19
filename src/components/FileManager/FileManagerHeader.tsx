import {
  Box,
  IconButton,
  Link,
  Breadcrumbs as MUIBreadcrumbs,
} from "@mui/material";
import styled from "@emotion/styled";
import { useState } from "react";
import { api } from "@/api";
import { PathParsed } from "@/datatypes/PathAbstraction";
import { IconForFileOrFolder, InlineIconAdjustStyle } from "./FileIcon";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import LinkIcon from "@mui/icons-material/Link";
import SearchIcon from "@mui/icons-material/Search";
import VerticalSplitIcon from "@mui/icons-material/VerticalSplit";

function FileBreadcrumbElement(props: {
  name: string;
  fullPath: string;
  isDir: boolean;
  useIcon?: boolean;
}) {
  const handleClick = (e) => {
    e.preventDefault();
    console.log("clicked on", props.fullPath);
  };
  if (props.useIcon) {
    return (
      <Link href="/" color="inherit" onClick={handleClick}>
        <IconForFileOrFolder
          name={props.name}
          isDir={props.isDir}
          isOpen={props.isDir}
          style={InlineIconAdjustStyle}
        />
        {props.name}
      </Link>
    );
  } else {
    return (
      <Link href="/" color="inherit" onClick={handleClick}>
        {props.name}
      </Link>
    );
  }
}

const Breadcrumbs = styled(MUIBreadcrumbs)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.backgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  padding: "3px 10px 3px 10px", // top right bottom left
  borderRadius: "5px",
}));

function FileBreadcrumb(props: { parsedPath: PathParsed }) {
  const { parsedPath } = props;
  const elements = [];
  const hier = parsedPath.dirHier;
  let elementFullPath = "";
  for (let i = 0; i < hier.length; i++) {
    const part = hier[i];
    if (i > 1) {
      // Separator not in the first.
      // Root already has the separator.
      // So, add separator before the second element first.
      elementFullPath += parsedPath.sep;
    }
    elementFullPath += part;
    elements.push(
      <FileBreadcrumbElement
        key={part}
        name={part}
        fullPath={elementFullPath}
        isDir={true}
        useIcon={i > 0}
      />
    );
  }
  return (
    <Breadcrumbs
      sx={{
        ".MuiBreadcrumbs-separator": {
          marginLeft: "0px",
          marginRight: "0px",
        },
        width: "100%",
      }}
      separator={<NavigateNextIcon fontSize="small" />}
    >
      {elements}
    </Breadcrumbs>
  );
}

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
  trackingCurrent: boolean;
  toggleKeepTrackCurrent: () => void;
}) {
  const color = props.trackingCurrent ? "warning" : "disabled";
  return (
    <IconButton
      onClick={() => {
        console.log("Keep track current");
        props.toggleKeepTrackCurrent();
      }}
    >
      <LinkIcon fontSize="small" color={color} />
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
  fullPath: string;
  moveFullPath: (path: string) => void;
  navigateForward: () => void;
  navigateBack: () => void;
  trackingCurrent: boolean;
  toggleKeepTrackCurrent: () => void;
  focusRef?: React.RefObject<HTMLElement>;
};

export function FileManagerHeader(props: FileManagerHeaderProps) {
  const [parsedPath, setParsedPath] = useState<PathParsed | undefined>(
    undefined
  );
  const parsed = api.fs.parsePath.useQuery(
    {
      fullPath: props.fullPath,
    },
    {
      enabled: parsedPath === undefined,
      onError: () => {
        console.error(`Failed to parse ${props.fullPath}`);
      },
    }
  );
  if (!parsedPath && parsed.data) {
    setParsedPath(parsed.data);
  }
  if (!parsed.data) {
    return <div>Loading...</div>;
  }
  return (
    <FileManagerHeaderFrame>
      <NavigationBackButton
        parsedPath={parsed.data}
        navigateBack={props.navigateBack}
      />
      <NavigationForwardButton
        parsedPath={parsed.data}
        navigateForward={props.navigateForward}
      />
      <KeepTrackCurrentToggleButton
        trackingCurrent={props.trackingCurrent}
        toggleKeepTrackCurrent={props.toggleKeepTrackCurrent}
      />
      <FileBreadcrumb parsedPath={parsed.data} />
      <div style={{ marginLeft: "auto" /* align to the right */ }}>
        <SearchButton search={() => console.log("search")} />
      </div>
      <div style={{ marginLeft: "auto" /* align to the right */ }}>
        <SplitButton split={() => console.log("split")} />
      </div>
    </FileManagerHeaderFrame>
  );
}
