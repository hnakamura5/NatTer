import { SimpleTreeView as MuiTreeView } from "@mui/x-tree-view";
import { Box } from "@mui/material";
import styled from "@emotion/styled";

import { useState } from "react";
import { api } from "@/api";
import { useTheme } from "@/AppState";

import React from "react";
import { KeybindScope } from "@/components/KeybindScope";

import { FileTreeItem } from "@/components/FileManager/FileTreeItem";

import { log } from "@/datatypes/Logger";
import { FileManagerHeader } from "./FileManager/FileManagerHeader";
import { set } from "zod";
import {
  FileManagerHandleContext,
  createFileManagerHandle,
} from "./FileManager/FileManagerHandle";

const ListMargin = "0px";

const TreeView = styled(MuiTreeView)(({ theme }) => ({
  color: theme.system.textColor,
  margin: `${ListMargin} 0px ${ListMargin} 0px`, // top right bottom left
}));

const FileManagerFrame = styled(Box)(({ theme }) => ({
  backgroundColor: theme.system.backgroundColor,
  color: theme.system.textColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  width: `calc(100vw - ${theme.system.hoverMenuWidth} - 10px)`,
}));

const FileTreeFrame = styled(Box)(({ theme }) => ({
  maxHeight: "70vh",
  overflowY: "scroll",
}));

export type FileManagerProps = {
  home: string;
  current: string;
  focusRef?: React.Ref<unknown>;
};

export function FileManager(props: FileManagerProps) {
  const [trackingCurrent, setTrackingCurrent] = useState<boolean>(true);
  const [currentPath, setCurrentPath] = useState<string>(props.current);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  log.debug(
    `FileManager: home:${props.home} shellCurrent:${props.current} current: ${currentPath} trackingCurrent: ${trackingCurrent}`
  );
  if (trackingCurrent && currentPath !== props.current) {
    setCurrentPath(props.current);
  }

  const handle = createFileManagerHandle({
    getCurrentPath: () => currentPath,
    moveToPath: (path) => {
      log.debug(`Move to path: ${path}`);
      setTrackingCurrent(false);
      setCurrentPath(path);
    },
    navigateForward: () => {
      log.debug("Navigate forward");
      // TODO: Implement navigate forward
      setTrackingCurrent(false);
    },
    navigateBack: () => {
      log.debug("Navigate back");
      // TODO: Implement navigate back
      setTrackingCurrent(false);
    },
    trackingCurrent: () => trackingCurrent,
    setKeepTrackCurrent: (value) => {
      setTrackingCurrent(value);
      if (value) {
        setCurrentPath(props.current);
      }
    },
    addBookmark: (path) => {
      log.debug(`Add bookmark: ${path}`);
    },
    getBookmarks: () => {
      log.debug("get bookmarks");
      return [];
    },
    splitPane: () => {
      console.log("split pane");
    },
  });

  return (
    <KeybindScope>
      <FileManagerHandleContext.Provider value={handle}>
        <div ref={props.focusRef as React.Ref<HTMLDivElement>} tabIndex={-1}>
          <FileManagerFrame>
            <FileManagerHeader />
            <FileTreeFrame>
              <TreeView
                onExpandedItemsChange={(e, items) => {
                  setExpandedItems(items);
                }}
                multiSelect
              >
                <FileTreeItem
                  path={currentPath}
                  key={currentPath}
                  showTop={false}
                  expandedItems={expandedItems}
                />
              </TreeView>
            </FileTreeFrame>
          </FileManagerFrame>
        </div>
      </FileManagerHandleContext.Provider>
    </KeybindScope>
  );
}
