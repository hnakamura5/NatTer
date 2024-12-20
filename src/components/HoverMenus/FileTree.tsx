import {
  TreeItem as MuiTreeItem,
  SimpleTreeView as MuiTreeView,
} from "@mui/x-tree-view";
import { Box, Breadcrumbs as MUIBreadcrumbs } from "@mui/material";
import { styled } from "@mui/material";

import { useState } from "react";
import { FileStat } from "@/datatypes/PathAbstraction";
import { api } from "@/api";
import { useTheme } from "@/AppState";

import { FaFolder as FolderIcon, FaFile as FileIcon } from "react-icons/fa";

import React from "react";
import { KeybindScope } from "../KeybindScope";

import { log } from "@/datatypes/Logger";

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

  const parsed = api.fs.parsePath.useQuery(props.stat.fullPath, {
    onError: () => {
      log.error(`Failed to parse ${props.stat.fullPath}`);
    },
  });
  if (!parsed.data) {
    return <Label>Loading...</Label>;
  }
  return (
    <>
      <Icon icon={<FileIcon />} />
      <Label>{parsed.data.base}</Label>
    </>
  );
}

function DirectoryLabel(props: { stat: FileStat }) {
  const theme = useTheme();

  const parsed = api.fs.parsePath.useQuery(props.stat.fullPath, {
    onError: () => {
      log.error(`Failed to parse ${props.stat.fullPath}`);
    },
  });
  if (!parsed.data) {
    return <Label>Loading...</Label>;
  }
  return (
    <>
      <Icon
        icon={<FolderIcon />}
        style={{ color: theme.terminal.directoryColor }}
      />
      <Label>{parsed.data.base}</Label>
    </>
  );
}

const ListMargin = "3px";

function TreeView(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const TreeView = styled(MuiTreeView)({
    color: theme.system.textColor,
    margin: `${ListMargin} 0px ${ListMargin} 0px`,
  });
  return <TreeView>{props.children}</TreeView>;
}

function FileTreeItem(props: { path: string; key: string; showTop: boolean }) {
  const theme = useTheme();
  const TreeItem = styled(MuiTreeItem)({
    color: theme.system.textColor,
    backgroundColor: theme.system.secondaryBackgroundColor,
    textAlign: "left",
    margin: `-${ListMargin} 0px -${ListMargin} 0px`,
    padding: "0px 0px 0px 5px", // top right bottom left
  });
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
      />
    ));
    if (props.showTop) {
      return (
        <TreeItem
          itemId={props.path}
          label={<DirectoryLabel stat={stat.data} />}
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

export type FileTreeProps = {
  home: string;
  focusRef?: React.Ref<unknown>;
};

export function FileTree(props: FileTreeProps) {
  const theme = useTheme();

  const [current, setCurrent] = useState<string>(props.home);
  if (current !== props.home) {
    setCurrent(props.home);
  }
  // log.error(`FileTree: current=${current}`);

  return (
    <KeybindScope>
      <div ref={props.focusRef as React.Ref<HTMLDivElement>} tabIndex={-1}>
        <TreeView>
          <FileTreeItem path={current} key={current} showTop={false} />
        </TreeView>
      </div>
    </KeybindScope>
  );
}
