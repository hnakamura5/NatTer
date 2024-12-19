import { TreeItem as MuiTreeItem } from "@mui/x-tree-view";
import styled from "@emotion/styled";
import { FileStat } from "@/datatypes/PathAbstraction";
import { api } from "@/api";
import { useTheme } from "@/AppState";

import {
  FaFolder as FolderIcon,
  FaFile as FileIcon,
  FaFolderOpen as FolderOpenIcon,
} from "react-icons/fa";

import { log } from "@/datatypes/Logger";

import {
  IconForFile,
  IconForFolder,
  IconOpenFolder,
  InlineIconAdjustStyle,
} from "./FileIcon";

function Icon(props: { icon: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span style={{ verticalAlign: "-2px", fontSize: "0.8em", ...props.style }}>
      {props.icon}{" "}
    </span>
  );
}

function Label(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const labelStyle = {
    color: theme.system.textColor,
    fontFamily: theme.system.font,
    fontSize: theme.system.fontSize,
    paddingRight: "10px",
  };
  return <span style={labelStyle}>{props.children}</span>;
}

function FileLabel(props: { stat: FileStat }) {
  const theme = useTheme();

  const parsed = api.fs.parsePath.useQuery(
    { fullPath: props.stat.fullPath },
    {
      onError: () => {
        log.error(`Failed to parse ${props.stat.fullPath}`);
      },
    }
  );
  if (!parsed.data) {
    return <Label>Loading...</Label>;
  }
  const fileName = parsed.data.base;
  // <Icon icon={<FileIcon />} />
  return (
    <>
      <IconForFile name={fileName} style={InlineIconAdjustStyle} />
      <Label>{fileName}</Label>
    </>
  );
}

function DirectoryLabel(props: { stat: FileStat; isExpanded: boolean }) {
  const parsed = api.fs.parsePath.useQuery(
    { fullPath: props.stat.fullPath },
    {
      onError: () => {
        log.error(`Failed to parse ${props.stat.fullPath}`);
      },
    }
  );
  if (!parsed.data) {
    return <Label>Loading...</Label>;
  }
  const directoryName = parsed.data.base;
  if (props.isExpanded) {
    return (
      <>
        <IconOpenFolder name={directoryName} style={InlineIconAdjustStyle} />
        <Label>{directoryName}</Label>
      </>
    );
  }
  return (
    <>
      <IconForFolder name={directoryName} style={InlineIconAdjustStyle} />
      <Label>{directoryName}</Label>
    </>
  );
}

const ListMargin = "3px";

const TreeItem = styled(MuiTreeItem)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.secondaryBackgroundColor,
  textAlign: "left",
  margin: `-${ListMargin} 0px -${ListMargin} 0px`,
  padding: "0px 0px 0px 1px", // top right bottom left
}));

export function FileTreeItem(props: {
  path: string;
  key: string;
  showTop: boolean;
  expandedItems: string[];
}) {
  //log.error(`FileTreeItem: ${props.path}`);
  const stat = api.fs.stat.useQuery(props.path, {
    onError: () => {
      log.error(`Failed to stat ${props.path}`);
    },
  });
  const list = api.fs.list.useQuery(props.path, {
    onError: () => {
      log.error(`Failed to list ${props.path}`);
    },
  });
  const sep = api.fs.sep.useQuery(undefined, {
    onError: () => {
      log.error(`Failed to get sep`);
    },
  });

  if (!stat.data) {
    return (
      <TreeItem
        itemId={props.path}
        label={`The pass ${props.path} not found.`}
      />
    );
  }

  if (stat.data.isDir) {
    // Directory
    const children = list.data?.map((child) => (
      <FileTreeItem
        path={props.path + sep.data + child}
        key={child}
        showTop={true}
        expandedItems={props.expandedItems}
      />
    ));
    if (props.showTop) {
      return (
        <TreeItem
          itemId={props.path}
          label={
            <DirectoryLabel
              stat={stat.data}
              isExpanded={props.expandedItems.includes(props.path)}
            />
          }
        >
          {children}
        </TreeItem>
      );
    } else {
      return <>{children}</>;
    }
  } else {
    // File
    return (
      <TreeItem itemId={props.path} label={<FileLabel stat={stat.data} />} />
    );
  }
}
