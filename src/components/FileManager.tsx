import { SimpleTreeView as MuiTreeView } from "@mui/x-tree-view";
import { Box } from "@mui/material";
import styled from "@emotion/styled";

import { forwardRef, useEffect, useState } from "react";
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
import {
  FileManagerHandle,
  FileManagerHandleContext,
  FileManagerPaneHandle,
} from "./FileManager/FileManagerHandle";

import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { useHotkeys } from "react-hotkeys-hook";
import { FileKeybindings } from "./FileManager/FileManagerKeybindings";
import { useAtom } from "jotai";
import { parse } from "path";
import { RemoteHost } from "@/datatypes/SshConfig";
import { UniversalPath } from "@/datatypes/UniversalPath";
import {
  univPathArrayToString,
  univPathToString,
} from "@/datatypes/UniversalPath";
import { useFileManagerHandleForState } from "./FileManager/FileManagerHandleForState";

const FileManagerFrame = styled(Box)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.backgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  width: `calc(100vw - ${theme.system.hoverMenuWidth} - 15px)`,
}));

const FileTreeFrame = styled(Box)(({ theme }) => ({
  height: "50vh",
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
  remoteHost?: RemoteHost;
};
function emptyState(activePath: string): FileManagerState {
  return {
    activePath: activePath,
    trackingCurrent: true,
    expandedItems: [],
    historyBack: [],
    historyForward: [],
    historyRecent: [],
  };
}

export type FileManagerProps = {
  current: string;
  state?: FileManagerState;
  setState: (state: FileManagerState) => void;
  remoteHost?: RemoteHost;
};

export const FileManager = forwardRef<HTMLDivElement, FileManagerProps>(
  (props, ref) => {
    // Local state does not lives
    const [selectedItems, setSelectedItems] = useState<string[]>([]);

    useEffect(() => {
      log.debug(`FileManager: componentDidMount`);
    }, []);

    useEffect(() => {
      // Initialize the state if it is not set
      if (!props.state) {
        log.debug(`FileManager: state Effect`);
        props.setState(emptyState(props.current));
      }
    }, [props.state === undefined]);
    useEffect(() => {
      // Track to the current path of the shell
      if (state) {
        if (state.trackingCurrent && state.activePath !== props.current) {
          log.debug(`FileManager: track to current: ${props.current}`);
          props.setState({
            ...state,
            activePath: props.current,
            remoteHost: props.remoteHost,
          });
        }
      }
    }, [props.state, props, props.current]);

    // In order to avoid undefined state, initialize it with an empty state
    const state = props.state || emptyState(props.current);

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

    const {
      activePath: currentPath,
      trackingCurrent,
      expandedItems,
      historyBack,
      historyForward,
      historyRecent,
    } = state;
    const remoteHost = props.remoteHost;
    // State update functions
    const setExpandedItems = (items: string[]) => {
      props.setState({ ...state, expandedItems: items });
    };
    log.debug(
      `FileManager: props.current:${props.current} currentPath: ${currentPath} trackingCurrent: ${trackingCurrent} remoteHost: ${remoteHost}`
    );

    const handle = useFileManagerHandleForState(
      currentPath,
      selectedItems,
      setSelectedItems,
      state,
      props.setState
    );

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
                handle.copyStructural(
                  { paths: selectedItems, remoteHost },
                  { path: toId as string, remoteHost }
                );
              } else {
                handle.copyTo(
                  { path: fromId as string, remoteHost },
                  { path: toId as string, remoteHost }
                );
              }
            } else {
              if (fromIdIsSelected) {
                // Move all selected items
                handle.moveStructural(
                  { paths: selectedItems, remoteHost },
                  { path: toId as string, remoteHost }
                );
              } else {
                handle.moveTo(
                  { path: fromId as string, remoteHost },
                  { path: toId as string, remoteHost }
                );
              }
            }
          }
        }}
      >
        <FileManagerHandleContext.Provider value={handle}>
          <FileKeybindings>
            <div ref={ref} tabIndex={-1}>
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
);
