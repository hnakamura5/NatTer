import { SimpleTreeView as MuiTreeView } from "@mui/x-tree-view";
import { Box } from "@mui/material";
import styled from "@emotion/styled";

import { useEffect, useState } from "react";
import { api } from "@/api";
import { useTheme } from "@/AppState";

import React from "react";
import { KeybindScope } from "@/components/KeybindScope";

import {
  FileTreeItem,
  ListMargin,
} from "@/components/FileManager/FileTreeItem";

import { log } from "@/datatypes/Logger";
import { FileManagerHeader } from "./FileManager/FileManagerHeader";
import { set } from "zod";
import {
  FileManagerHandleContext,
  createFileManagerHandle,
} from "./FileManager/FileManagerHandle";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

const FileManagerFrame = styled(Box)(({ theme }) => ({
  backgroundColor: theme.system.backgroundColor,
  color: theme.system.textColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  width: `calc(100vw - ${theme.system.hoverMenuWidth} - 10px)`,
}));

const FileTreeFrame = styled(Box)(({ theme }) => ({
  maxHeight: "70vh",
  overflowY: "auto",
}));

const FileTreeView = styled(MuiTreeView)(({ theme }) => ({
  color: theme.system.textColor,
  padding: `${ListMargin} 0px ${ListMargin} 0px`, // top right bottom left
}));

export type FileManagerState = {
  currentPath: string;
  trackingCurrent: boolean;
  expandedItems: string[];
  historyBack: string[];
  historyForward: string[];
  historyRecent: string[];
};

export type FileManagerProps = {
  current: string;
  state?: FileManagerState;
  setState: (state: FileManagerState) => void;
  focusRef?: React.Ref<unknown>;
};

export function FileManager(props: FileManagerProps) {
  const state = props.state;
  // Local state does not lives
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    log.debug(`FileManager: componentDidMount`);
  }, []);

  useEffect(() => {
    // Initialize the state if it is not set
    if (!state) {
      props.setState({
        currentPath: props.current,
        trackingCurrent: true,
        expandedItems: [],
        historyBack: [],
        historyForward: [],
        historyRecent: [],
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

  // Sensor to avoid preventing treeitem expansion and selection
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 10, // pixels
    },
  });
  const dndSensors = useSensors(pointerSensor);

  if (!state) {
    return <div>FileManager Loading...</div>;
  }

  const {
    currentPath,
    trackingCurrent,
    expandedItems,
    historyBack,
    historyForward,
    historyRecent,
  } = state;
  // State update functions
  const setCurrentPath = (path: string, clearHistoryForward?: boolean) => {
    // If a path different from the current path is set, stop tracking
    const newTrackingCurrent = trackingCurrent && path === props.current;
    const historyLimit = 30; // TODO: Make this configurable
    const newRecent = historyRecent
      .filter((p) => p !== path)
      .slice(-(historyLimit - 1));
    newRecent.push(path);
    props.setState({
      ...state,
      currentPath: path,
      trackingCurrent: newTrackingCurrent,
      historyForward: clearHistoryForward ? [] : historyForward,
      historyRecent: newRecent,
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
    trackingCurrent: () => {
      log.debug(`Get Tracking current: ${trackingCurrent}`);
      return trackingCurrent;
    },
    setKeepTrackCurrent: (value) => {
      log.debug(`Set keep track current: ${value}`);
      if (value) {
        setCurrentPath(props.current);
      }
      setTrackingCurrent(value);
    },
    addBookmark: (path) => {
      log.debug(`Add bookmark: ${path}`);
    },
    getBookmarks: () => {
      log.debug("get bookmarks");
      return [];
    },
    getRecentDirectories: () => {
      log.debug("get recent directories");
      return historyRecent;
    },
    splitPane: () => {
      console.log("split pane");
    },
  });

  return (
    <KeybindScope>
      <DndContext
        sensors={dndSensors}
        onDragEnd={(e: DragEndEvent) => {
          const fromId = e.active.id;
          const fromIdIsSelected = selectedItems.includes(fromId as string);
          const toId = e.over?.id;
          // TODO: To get all selected items?
          log.debug(
            `FileManager DragEnd: ${fromId} -> ${toId} selected: ${fromIdIsSelected}`
          );
        }}
      >
        <FileManagerHandleContext.Provider value={handle}>
          <div ref={props.focusRef as React.Ref<HTMLDivElement>} tabIndex={-1}>
            <FileManagerFrame>
              <FileManagerHeader />
              <FileTreeFrame>
                <FileTreeView
                  onExpandedItemsChange={(e, items) => {
                    setExpandedItems(items);
                  }}
                  onSelectedItemsChange={(e, items) => {
                    if (typeof items === "string") {
                      setSelectedItems([items]);
                    } else if (items === null) {
                      setSelectedItems([]);
                    } else {
                      setSelectedItems(items);
                    }
                  }}
                  multiSelect
                >
                  <FileTreeItem
                    path={currentPath}
                    key={currentPath}
                    showTop={false}
                    expandedItems={expandedItems}
                  />
                </FileTreeView>
              </FileTreeFrame>
            </FileManagerFrame>
          </div>
        </FileManagerHandleContext.Provider>
      </DndContext>
    </KeybindScope>
  );
}
