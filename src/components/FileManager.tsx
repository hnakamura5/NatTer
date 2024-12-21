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
  if (currentPath !== props.home) {
    setCurrentPath(props.home);
  }

  const handle = createFileManagerHandle({
    currentFullPath: () => currentPath,
    moveFullPath: (path) => {
      setTrackingCurrent(false);
      setCurrentPath(path);
    },
    navigateForward: () => {
      console.log("Navigate forward");
      // TODO: Implement navigate forward
      setTrackingCurrent(false);
    },
    navigateBack: () => {
      console.log("Navigate back");
      // TODO: Implement navigate back
      setTrackingCurrent(false);
    },
    trackingCurrent: () => trackingCurrent,
    setKeepTrackCurrent: (value) => {
      setTrackingCurrent(value);
    },
    addBookmark: (path) => {
      console.log(`Add bookmark: ${path}`);
    },
    getBookmarks: () => {
      console.log("get bookmarks");
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
            <FileManagerHeader
              fullPath={currentPath}
              moveFullPath={(path) => {
                setTrackingCurrent(false);
                setCurrentPath(path);
              }}
              navigateBack={() => {
                console.log("Navigate back");
                // TODO: Implement navigate back
                setTrackingCurrent(false);
              }}
              navigateForward={() => {
                console.log("Navigate forward");
                // TODO: Implement navigate forward
                setTrackingCurrent(false);
              }}
              trackingCurrent={trackingCurrent}
              toggleKeepTrackCurrent={() => {
                setTrackingCurrent(!trackingCurrent);
              }}
            />
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
