import { SimpleTreeView as MuiTreeView } from "@mui/x-tree-view";
import { Box } from "@mui/material";
import styled from "@emotion/styled";

import { useEffect, useState } from "react";
import { api } from "@/api";
import { InternalClipboard, useTheme } from "@/AppState";
import { InternalClipboardType } from "@/datatypes/InternalClipboardData";

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
  FileManagerHandle,
  FileManagerHandleContext,
} from "./FileManager/FileManagerHandle";

import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";
import { FileKeybindings } from "./FileManager/FileKeybindings";
import { useAtom } from "jotai";

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
  activePath: string;
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
  const [internalClipboard, setInternalClipboard] = useAtom(InternalClipboard);
  // Local state does not lives
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    log.debug(`FileManager: componentDidMount`);
  }, []);

  useEffect(() => {
    // Initialize the state if it is not set
    if (!state) {
      props.setState({
        activePath: props.current,
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
      if (state.trackingCurrent && state.activePath !== props.current) {
        log.debug(`FileManager: track to current: ${props.current}`);
        props.setState({ ...state, activePath: props.current });
      }
    }
  }, [state, props]);

  // File system mutators
  const move = api.fs.move.useMutation();
  const moveTo = api.fs.moveTo.useMutation();
  const moveStructural = api.fs.moveStructural.useMutation();
  const remove = api.fs.remove.useMutation();
  const copy = api.fs.copy.useMutation();
  const copyTo = api.fs.copyTo.useMutation();
  const copyStructural = api.fs.copyStructural.useMutation();
  const writeClipboard = api.os.writeClipboard.useMutation();
  const readClipboard = api.os.readClipboard.useMutation();

  // Sensor to avoid preventing treeitem expansion and selection
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: {
      distance: 10, // pixels
    },
  });
  const dndSensors = useSensors(pointerSensor);
  const [ctrlIsPressed, setCtrlIsPressed] = useState(false);
  useHotkeys(
    "ctrl",
    (e) => {
      setCtrlIsPressed(e.type === "keydown");
    },
    { keyup: true, keydown: true }
  );

  if (!state) {
    return <div>FileManager Loading...</div>;
  }

  const {
    activePath: currentPath,
    trackingCurrent,
    expandedItems,
    historyBack,
    historyForward,
    historyRecent,
  } = state;
  // State update functions
  const setActivePath = (path: string, clearHistoryForward?: boolean) => {
    // If a path different from the current path is set, stop tracking
    const newTrackingCurrent = trackingCurrent && path === props.current;
    const historyLimit = 30; // TODO: Make this configurable
    const newRecent = historyRecent
      .filter((p) => p !== path)
      .slice(-(historyLimit - 1));
    newRecent.push(path);
    props.setState({
      ...state,
      activePath: path,
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
  const getCanonicalTargetPath = () => {
    return selectedItems.length == 0
      ? currentPath
      : selectedItems.length == 1
      ? selectedItems[0]
      : undefined;
  };
  const clipSelection = (clipType: InternalClipboardType) => {
    if (selectedItems.length > 0) {
      setInternalClipboard({
        clipType: clipType,
        args: selectedItems,
      });
      const clipString = selectedItems.join(" ");
      writeClipboard.mutate(clipString);
    }
  };

  log.debug(
    `FileManager: props.current:${props.current} currentPath: ${currentPath} trackingCurrent: ${trackingCurrent}`
  );

  const handle: FileManagerHandle = {
    getActivePath: () => currentPath,
    moveActivePathTo: (path) => {
      log.debug(`Move to path: ${path}`);
      if (currentPath != path) {
        historyBack.push(currentPath);
      }
      setActivePath(path, true);
    },
    navigateForward: () => {
      log.debug("Navigate forward");
      if (historyForward.length > 0) {
        const path = historyForward.pop();
        if (path) {
          historyBack.push(currentPath);
          setActivePath(path);
        }
      }
    },
    navigateBack: () => {
      log.debug("Navigate back");
      if (history.length > 0) {
        const path = historyBack.pop();
        if (path) {
          historyForward.push(currentPath);
          setActivePath(path);
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
        setActivePath(props.current);
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
    move: (src, dest) => {
      log.debug(`Move: ${src} -> ${dest}`);
      move.mutate({ src: src, dest: dest });
    },
    moveTo: (src, destDir) => {
      log.debug(`MoveTo: ${src} -> ${destDir}`);
      moveTo.mutate({ src: src, destDir: destDir });
    },
    moveStructural: (src, destDir) => {
      log.debug(`Move Structural: ${src} -> ${destDir}`);
      moveStructural.mutate({ src: src, destDir: destDir });
    },
    cutToInternalClipboard: (src) => {
      log.debug(`Cut Clipboard: ${src}`);
      setInternalClipboard({
        clipType: "FileCut",
        args: [src],
      });
      writeClipboard.mutate(src);
    },
    cutSelectedToInternalClipboard: () => {
      log.debug(`Cut Clipboard: `, selectedItems);
      clipSelection("FileCut");
    },
    remove: (filePath) => {
      log.debug(`Remove: ${filePath}`);
      remove.mutate(filePath);
    },
    copy: (src, dest) => {
      log.debug(`Copy: ${src} -> ${dest}`);
      copy.mutate({ src: src, dest: dest });
    },
    copyTo: (src, destDir) => {
      log.debug(`CopyTo: ${src} -> ${destDir}`);
      copyTo.mutate({ src: src, destDir: destDir });
    },
    copyStructural: (src, destDir) => {
      log.debug(`Copy Structural: ${src} -> ${destDir}`);
      copyStructural.mutate({ src: src, destDir: destDir });
    },
    copyToInternalClipboard: (src) => {
      log.debug(`Copy Clipboard: `, src);
      setInternalClipboard({
        clipType: "FileCopy",
        args: [src],
      });
      writeClipboard.mutate(src);
    },
    copySelectionToInternalClipboard: () => {
      log.debug(`Copy Clipboard: `, selectedItems);
      clipSelection("FileCopy");
    },
    pasteFromInternalClipboard: () => {
      const destDir = getCanonicalTargetPath();
      log.debug(
        `Paste Clipboard: dest=${destDir}, clipboard=`,
        internalClipboard
      );
      if (internalClipboard && destDir) {
        if (internalClipboard.clipType === "FileCut") {
          handle.moveStructural(internalClipboard.args, destDir);
        } else if (internalClipboard.clipType === "FileCopy") {
          handle.copyStructural(internalClipboard.args, destDir);
        }
      }
    },
    selectItems: (items) => {
      log.debug("Select Items", items);
      setSelectedItems(items);
    },
  };

  return (
    <DndContext
      sensors={dndSensors}
      onDragEnd={(e: DragEndEvent) => {
        const fromId = e.active.id;
        const fromIdIsSelected = selectedItems.includes(fromId as string);
        const toId = e.over?.id;
        // TODO: To get all selected items?
        log.debug(
          `FileManager DragEnd: ${fromId} -> ${toId} selected: ${fromIdIsSelected} ctrl: ${ctrlIsPressed}`
        );
        if (toId) {
          if (ctrlIsPressed) {
            if (fromIdIsSelected) {
              // Copy all selected items
              handle.copyStructural(selectedItems, toId as string);
            } else {
              handle.copyTo(fromId as string, toId as string);
            }
          } else {
            if (fromIdIsSelected) {
              // Move all selected items
              handle.moveStructural(selectedItems, toId as string);
            } else {
              handle.moveTo(fromId as string, toId as string);
            }
          }
        }
      }}
    >
      <FileManagerHandleContext.Provider value={handle}>
        <FileKeybindings>
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
                  selectedItems={selectedItems}
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
        </FileKeybindings>
      </FileManagerHandleContext.Provider>
    </DndContext>
  );
}
