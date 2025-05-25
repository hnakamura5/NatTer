import { createContext, useContext, useMemo, useState } from "react";
import {
  UniversalPath,
  univPathToString,
  univPathArrayToString,
} from "@/datatypes/UniversalPath";
import { RemoteHost } from "@/datatypes/SshConfig";
import { FileManagerHandle, FileManagerPaneHandle } from "./FileManagerHandle";

import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import { FileManagerState } from "../FileManager";
import { useAtom } from "jotai";
import { InternalClipboard } from "@/AppState";
import { InternalClipboardType } from "@/datatypes/InternalClipboardData";

export function useFileManagerHandleForState(
  current: string,
  selectedItems: string[],
  setSelectedItems: (items: string[]) => void,
  state: FileManagerState,
  setState: (state: FileManagerState) => void
): FileManagerHandle & FileManagerPaneHandle {
  const {
    activePath,
    trackingCurrent,
    expandedItems,
    historyBack,
    historyForward,
    historyRecent,
    remoteHost,
  } = state;

  const [internalClipboard, setInternalClipboard] = useAtom(InternalClipboard);
  const [renamingPath, setRenamingPath] = useState<string | undefined>(
    undefined
  );

  const setActivePath = (path: string, clearHistoryForward?: boolean) => {
    // If a path different from the current path is set, stop tracking
    const newTrackingCurrent = trackingCurrent && path === current;
    const historyLimit = 30; // TODO: Make this configurable
    const newRecent = historyRecent
      .filter((p) => p !== path)
      .slice(-(historyLimit - 1));
    newRecent.push(path);
    setState({
      ...state,
      activePath: path,
      trackingCurrent: newTrackingCurrent,
      historyForward: clearHistoryForward ? [] : historyForward,
      historyRecent: newRecent,
    });
  };
  const setTrackingCurrent = (value: boolean) => {
    setState({ ...state, trackingCurrent: value });
  };
  const setExpandedItems = (items: string[]) => {
    setState({ ...state, expandedItems: items });
  };
  const getCanonicalTargetPath = () => {
    return selectedItems.length == 0
      ? activePath
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

  // This is memo critical to prevent unexpected re-renders,
  // which flashes context menu.
  const handle: FileManagerHandle & FileManagerPaneHandle = useMemo(
    () => ({
      getActivePath: () => activePath,
      moveActivePathTo: (path) => {
        log.debug(`Try Move active to path: ${path}`);
        return pathExistsAsync
          .mutateAsync({
            fullPath: { path, remoteHost },
            fileOrDir: "directory",
          })
          .then((exists) => {
            if (exists) {
              if (activePath != path) {
                historyBack.push(activePath);
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
            historyBack.push(activePath);
            setActivePath(path);
          }
        }
      },
      navigateBack: () => {
        log.debug("Navigate back");
        if (history.length > 0) {
          const path = historyBack.pop();
          if (path) {
            historyForward.push(activePath);
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
          setActivePath(current);
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
        log.debug(
          `Move: ${univPathToString(src)} -> ${univPathToString(dest)}`
        );
        move.mutate({ src: src, dest: dest });
      },
      moveTo: (src, destDir) => {
        log.debug(
          `MoveTo: ${univPathToString(src)} -> ${univPathToString(destDir)}`
        );
        moveTo.mutate({ src: src, destDir: destDir });
      },
      moveStructural: (src, destDir) => {
        log.debug(
          `Move Structural: ${univPathArrayToString(src)} -> ${univPathToString(
            destDir
          )}`
        );
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
        log.debug(`Start Rename: ${src}`);
        setRenamingPath(src);
      },
      getRenamingPath: () => {
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
      selectedItems: () => {
        return selectedItems;
      },
      copyToOSClipboard: (text) => {
        writeClipboard.mutate(text);
      },
      getFromOSClipboard: () => {
        return readClipboard.mutateAsync();
      },
      getRelativePathFromActive: (path) => {
        if (path.startsWith(activePath)) {
          return path.slice(activePath.length + 1);
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
        setState({ ...state, remoteHost: host });
      },
    }),
    [activePath, trackingCurrent, remoteHost, renamingPath]
  );
  return handle;
}
