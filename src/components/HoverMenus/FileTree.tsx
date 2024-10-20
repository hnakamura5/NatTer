import {
  TreeItem as MuiTreeItem,
  SimpleTreeView as MuiTreeView,
} from "@mui/x-tree-view";
import { Box, Breadcrumbs as MUIBreadcrumbs } from "@mui/material";
import { styled } from "@mui/material";

import { useState } from "react";
import { FileStat } from "@/datatypes/PathAbstraction";
import { api } from "@/api";
import { useTheme } from "@/datatypes/Theme";
import { Theme } from "@emotion/react";

import { logger } from "@/datatypes/Logger";

function FileLabel(props: { stat: FileStat }) {
  const theme = useTheme();
  const parsed = api.fs.parsePath.useQuery(props.stat.fullPath, {
    onError: () => {
      logger.logTrace(`Failed to parse ${props.stat.fullPath}`);
    },
  });
  if (!parsed.data) {
    return (
      <span style={{ color: theme.system.colors.primary }}>Loading...</span>
    );
  }
  return (
    <span style={{ color: theme.system.colors.primary }}>
      {parsed.data.base}
    </span>
  );
}

function DirectoryLabel(props: { stat: FileStat }) {
  const theme = useTheme();
  const parsed = api.fs.parsePath.useQuery(props.stat.fullPath, {
    onError: () => {
      logger.logTrace(`Failed to parse ${props.stat.fullPath}`);
    },
  });
  if (!parsed.data) {
    return (
      <span style={{ color: theme.system.colors.primary }}>Loading...</span>
    );
  }
  return (
    <span style={{ color: theme.system.colors.primary }}>
      {parsed.data.base}
    </span>
  );
}

function FileTreeItem(props: { path: string }) {
  const theme = useTheme();
  const TreeItem = styled(MuiTreeItem)({
    color: theme.system.colors.primary,
  });
  //logger.logTrace(`FileTreeItem: ${props.path}`);
  const stat = api.fs.stat.useQuery(props.path, {
    onError: () => {
      logger.logTrace(`Failed to stat ${props.path}`);
    },
  });
  const list = api.fs.list.useQuery(props.path, {
    onError: () => {
      logger.logTrace(`Failed to list ${props.path}`);
    },
  });
  const sep = api.fs.sep.useQuery(undefined, {
    onError: () => {
      logger.logTrace(`Failed to get sep`);
    },
  });

  if (!stat.data) {
    return <Box>Loading...</Box>;
  }

  if (stat.data.isDir) {
    // Directory
    const children = list.data?.map((child) => (
      <FileTreeItem path={props.path + sep.data + child} />
    ));
    return (
      <TreeItem itemId={props.path} label={<DirectoryLabel stat={stat.data} />}>
        {children}
      </TreeItem>
    );
  } else {
    // File
    return (
      <TreeItem itemId={props.path} label={<FileLabel stat={stat.data} />} />
    );
  }
}

export type FileTreeProps = {
  home: string;
};

export function FileTree(props: FileTreeProps) {
  const theme = useTheme();
  const FileTree = styled(MuiTreeView)({
    color: theme.system.colors.primary,
  });

  const [current, setCurrent] = useState<string>(props.home);
  if (current !== props.home) {
    setCurrent(props.home);
  }
  // logger.logTrace(`FileTree: current=${current}`);

  return (
    <FileTree>
      <FileTreeItem path={current} />
    </FileTree>
  );
}
