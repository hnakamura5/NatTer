import { SimpleTreeView as MuiTreeView } from "@mui/x-tree-view";
import { Box } from "@mui/material";
import styled from "@emotion/styled";

import { useEffect, useState } from "react";
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

export type FileManagerState = {
  currentPath: string;
  trackingCurrent: boolean;
  expandedItems: string[];
  historyBack: string[];
  historyForward: string[];
};

export type FileManagerProps = {
  current: string;
  state?: FileManagerState;
  setState: (state: FileManagerState) => void;
  focusRef?: React.Ref<unknown>;
};

export function FileManager(props: FileManagerProps) {
  // const [currentPath, setCurrentPath] = useState<string>(props.current);
  // const [trackingCurrent, setTrackingCurrent] = useState<boolean>(true);
  // const [expandedItems, setExpandedItems] = useState<string[]>([]);
  useEffect(() => {
    log.debug(`FileManager: componentDidMount`);
  }, []);

  const state = props.state;
  useEffect(() => {
    // Initialize the state if it is not set
    if (!state) {
      props.setState({
        currentPath: props.current,
        trackingCurrent: true,
        expandedItems: [],
        historyBack: [],
        historyForward: [],
      });
    }
  }, [state === undefined]);
  useEffect(() => {
    // Track to the current path of the shell
    if (state) {
      if (state.trackingCurrent && state.currentPath !== props.current) {
        log.debug(`FileManager: track to current: ${props.current}`);
        props.setState({ ...state, currentPath: props.current });
      }
    }
  }, [state, props]);

  if (!state) {
    return <div>FileManager Loading...</div>;
  }

  const {
    currentPath,
    trackingCurrent,
    expandedItems,
    historyBack,
    historyForward,
  } = state;
  // State update functions
  const setCurrentPath = (path: string, clearHistoryForward?: boolean) => {
    // If a path different from the current path is set, stop tracking
    const newTrackingCurrent = trackingCurrent && path === props.current;
    props.setState({
      ...state,
      currentPath: path,
      trackingCurrent: newTrackingCurrent,
      historyForward: clearHistoryForward ? [] : historyForward,
    });
  };
  const setTrackingCurrent = (value: boolean) => {
    props.setState({ ...state, trackingCurrent: value });
  };
  const setExpandedItems = (items: string[]) => {
    props.setState({ ...state, expandedItems: items });
  };

  log.debug(
    `FileManager: props.current:${props.current} currentPath: ${currentPath} trackingCurrent: ${trackingCurrent}`
  );

  const handle = createFileManagerHandle({
    getCurrentPath: () => currentPath,
    moveToPath: (path) => {
      log.debug(`Move to path: ${path}`);
      if (currentPath != path) {
        historyBack.push(currentPath);
      }
      setCurrentPath(path, true);
    },
    navigateForward: () => {
      log.debug("Navigate forward");
      if (historyForward.length > 0) {
        const path = historyForward.pop();
        if (path) {
          historyBack.push(currentPath);
          setCurrentPath(path);
        }
      }
    },
    navigateBack: () => {
      log.debug("Navigate back");
      if (history.length > 0) {
        const path = historyBack.pop();
        if (path) {
          historyForward.push(currentPath);
          setCurrentPath(path);
        }
      }
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
