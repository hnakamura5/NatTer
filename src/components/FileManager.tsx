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
import { set } from "zod";
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

const FileManagerFrame = styled(Box)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.backgroundColor,
  fontFamily: theme.system.font,
  fontSize: theme.system.fontSize,
  width: `calc(100vw - ${theme.system.hoverMenuWidth} - 15px)`,
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
    const [internalClipboard, setInternalClipboard] =
      useAtom(InternalClipboard);
    // Local state does not lives
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [renamingPath, setRenamingPath] = useState<string | undefined>(
      undefined
    );

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

    // File system mutators
    const parsePathAsync = api.fs.parsePathAsync.useMutation();
    const pathExistsAsync = api.fs.pathExistsAsync.useMutation();
    const move = api.fs.move.useMutation();
    const moveTo = api.fs.moveTo.useMutation();
    const moveStructural = api.fs.moveStructural.useMutation();
    const remove = api.fs.remove.useMutation();
    const trash = api.fs.trash.useMutation();
    const copy = api.fs.copy.useMutation();
    const copyTo = api.fs.copyTo.useMutation();
    const copyStructural = api.fs.copyStructural.useMutation();
    const openPath = api.os.openPath.useMutation();
    const writeClipboard = api.os.writeClipboard.useMutation();
    const readClipboard = api.os.readClipboard.useMutation();

    // Queries for active path
    const stat = api.fs.stat.useQuery(
      { path: state?.activePath || "", remoteHost: props.remoteHost },
      {
        enabled: state?.activePath !== undefined,
      }
    );

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
      `FileManager: props.current:${props.current} currentPath: ${currentPath} trackingCurrent: ${trackingCurrent} remoteHost: ${remoteHost}`
    );

    const handle: FileManagerHandle & FileManagerPaneHandle = {
      getActivePath: () => currentPath,
      moveActivePathTo: (path) => {
        log.debug(`Try Move active to path: ${path}`);
        return pathExistsAsync
          .mutateAsync({
            fullPath: { path, remoteHost },
            fileOrDir: "directory",
          })
          .then((exists) => {
            if (exists) {
              if (currentPath != path) {
                historyBack.push(currentPath);
              }
              setActivePath(path, true);
              return true;
            }
            return false;
          })
          .catch(() => false);
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
        // TODO: RemoteHost?
        setInternalClipboard({
          clipType: "FileCut",
          args: [src.path],
        });
        writeClipboard.mutate(src.path);
      },
      cutSelectedToInternalClipboard: () => {
        log.debug(`Cut Clipboard: `, selectedItems);
        clipSelection("FileCut");
      },
      remove: (filePath) => {
        log.debug(`Remove: `, filePath);
        remove.mutate(filePath);
      },
      removeSelection: () => {
        log.debug(`Remove Selection: `, selectedItems);
        selectedItems.forEach((item) =>
          remove.mutate({ path: item, remoteHost })
        );
      },
      trash: (filePath) => {
        log.debug(`Trash: `, filePath);
        trash.mutate(filePath);
      },
      trashSelection: () => {
        log.debug(`Trash Selection: `, selectedItems);
        selectedItems.forEach((item) =>
          trash.mutate({ path: item, remoteHost })
        );
      },
      copy: (src, dest) => {
        log.debug(
          `Copy: ${univPathToString(src)} -> ${univPathToString(dest)}`
        );
        copy.mutate({ src: src, dest: dest });
      },
      copyTo: (src, destDir) => {
        log.debug(
          `CopyTo: ${univPathToString(src)} -> ${univPathToString(destDir)}`
        );
        copyTo.mutate({ src: src, destDir: destDir });
      },
      copyStructural: (src, destDir) => {
        log.debug(
          `Copy Structural: ${univPathArrayToString(src)} -> ${univPathToString(
            destDir
          )}`
        );
        copyStructural.mutate({ src: src, destDir: destDir });
      },
      copyToInternalClipboard: (src) => {
        log.debug(`Copy Clipboard: `, src);
        setInternalClipboard({
          clipType: "FileCopy",
          args: [src.path],
        });
        writeClipboard.mutate(src.path);
      },
      copySelectionToInternalClipboard: () => {
        log.debug(`Copy Clipboard: `, selectedItems);
        clipSelection("FileCopy");
      },
      pasteFromInternalClipboard: (destDir?: UniversalPath) => {
        const canonicalDest = getCanonicalTargetPath();
        const actualDestDir =
          destDir ||
          (canonicalDest
            ? {
                path: canonicalDest,
                remoteHost,
              }
            : undefined);
        log.debug(
          `Paste Clipboard: dest=${destDir}, actualDest=${actualDestDir} clipboard=`,
          internalClipboard
        );
        if (internalClipboard && actualDestDir) {
          if (internalClipboard.clipType === "FileCut") {
            handle.moveStructural(
              { paths: internalClipboard.args, remoteHost },
              actualDestDir
            );
          } else if (internalClipboard.clipType === "FileCopy") {
            handle.copyStructural(
              { paths: internalClipboard.args, remoteHost },
              actualDestDir
            );
          }
        }
      },
      startRenaming: (src) => {
        log.debug(`Rename: ${src}`);
        setRenamingPath(src);
      },
      getRenamingPath: () => {
        log.debug(`Get Rename Path: ${renamingPath}`);
        return renamingPath;
      },
      submitRenaming: (newBaseName) => {
        log.debug(`Submit Rename: ${newBaseName}`);
        if (renamingPath) {
          parsePathAsync
            .mutateAsync({ path: renamingPath, remoteHost })
            .then((parsed) => {
              setRenamingPath(undefined);
              const newPath = parsed.dir + "/" + newBaseName;
              move.mutate({
                src: { path: renamingPath, remoteHost },
                dest: { path: newPath, remoteHost },
              });
            });
        }
      },
      cancelRenaming: () => {
        log.debug(`Cancel Rename`);
        setRenamingPath(undefined);
      },
      selectItems: (items) => {
        log.debug("Select Items", items);
        setSelectedItems(items);
      },
      copyToOSClipboard: (text) => {
        writeClipboard.mutate(text);
      },
      getFromOSClipboard: () => {
        return readClipboard.mutateAsync();
      },
      getRelativePathFromActive: (path) => {
        if (path.startsWith(currentPath)) {
          return path.slice(currentPath.length + 1);
        }
        return path;
      },
      getSubPathList: (path) => {
        return parsePathAsync
          .mutateAsync({ path, remoteHost })
          .then((parsed) => {
            let accumulator = "";
            const result: string[] = [];
            for (let i = 0; i < parsed.dirHier.length; i++) {
              const element = parsed.dirHier[i];
              const isLast = i === parsed.dirHier.length - 1;
              accumulator =
                accumulator +
                element +
                (accumulator === "" || isLast ? "" : parsed.sep);
              result.push(accumulator);
            }
            return result.reverse();
          });
      },
      openFile: (path) => {
        if (!remoteHost) {
          openPath.mutate(path);
        }
      },
      getRemoteHost: () => remoteHost,
      setRemoteHost: (host) => {
        props.setState({ ...state, remoteHost: host });
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
