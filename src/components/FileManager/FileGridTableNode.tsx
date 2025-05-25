import { FileManagerPaneHandle } from "./FileManagerHandle";
import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import { ReactNode } from "react";
import { FileStat } from "@/datatypes/UniversalPath";
import styled from "@emotion/styled";

import { IconForFileOrFolder, InlineIconAdjustStyle } from "./FileIcon";
import { FileTreeFileItemContextMenu } from "./FileTreeItemContextMenu";
import { ContextMenuContext } from "../Menu/ContextMenu";
import { RenamingInput } from "./FileTreeItem";

function WithFileNodeContextMenu(props: {
  stat: FileStat;
  setRenamingMode: (mode: boolean) => void;
  children: ReactNode;
}) {
  return (
    <ContextMenuContext
      menuItems={
        <FileTreeFileItemContextMenu
          stat={props.stat}
          setRenamingMode={props.setRenamingMode}
        />
      }
    >
      {props.children}
    </ContextMenuContext>
  );
}

function FileNodeComponent(props: {
  name: string;
  isDir: boolean;
  stat: FileStat;
  renamingMode: boolean;
  setRenamingMode: (mode: boolean) => void;
  submitName: (baseName: string) => void;
  cancel: () => void;
}) {
  if (props.renamingMode) {
    return (
      <RenamingInput
        currentName={props.name}
        isDir={props.isDir}
        submitName={props.submitName}
        cancel={props.cancel}
      />
    );
  }
  return (
    <WithFileNodeContextMenu
      stat={props.stat}
      setRenamingMode={props.setRenamingMode}
    >
      <IconForFileOrFolder
        name={props.name}
        isDir={props.isDir}
        style={InlineIconAdjustStyle}
      />
      {props.name}
    </WithFileNodeContextMenu>
  );
}

export type FileGridTableNode = {
  name: string;
  fullPath: string;
  time: Date;
  size: number;
  fileTypeDescription: string;
  stat: FileStat;
  nameComponent: ReactNode;
  sizeComponent: ReactNode;
  timeComponent: ReactNode;
  permissionComponent: ReactNode;
};

function permissionToString(permission: number) {
  return (
    ((permission & 0o1000000) > 0 ? "r" : "-") +
    ((permission & 0o0100000) > 0 ? "w" : "-") +
    ((permission & 0o0010000) > 0 ? "x" : "-") +
    ((permission & 0o0001000) > 0 ? "r" : "-") +
    ((permission & 0o0000100) > 0 ? "w" : "-") +
    ((permission & 0o0000010) > 0 ? "x" : "-") +
    ((permission & 0o0000004) > 0 ? "r" : "-") +
    ((permission & 0o0000002) > 0 ? "w" : "-") +
    ((permission & 0o0000001) > 0 ? "x" : "-")
  );
}

export function createGridTableNode(
  stat: FileStat,
  handle: FileManagerPaneHandle
): FileGridTableNode {
  const time = new Date(stat.modifiedTime);
  const renamingMode = stat.fullPath === handle.getRenamingPath();
  log.debug(
    `createGridTableNode: ${
      stat.fullPath
    } renamingMode:${renamingMode} renamingPath: ${handle.getRenamingPath()}`
  );

  return {
    name: stat.baseName,
    fullPath: stat.fullPath,
    time: time,
    size: stat.byteSize,
    fileTypeDescription: stat.isDir ? "folder" : "file",
    stat: stat,
    nameComponent: (
      <FileNodeComponent
        name={stat.baseName}
        isDir={stat.isDir}
        stat={stat}
        renamingMode={renamingMode}
        setRenamingMode={(mode: boolean) => {
          if (renamingMode === mode) {
            return;
          }
          if (mode) {
            handle.startRenaming(stat.fullPath);
          } else {
            handle.cancelRenaming();
          }
        }}
        submitName={handle.submitRenaming}
        cancel={handle.cancelRenaming}
      />
    ),
    sizeComponent: (
      <WithFileNodeContextMenu stat={stat} setRenamingMode={() => {}}>
        <span>{stat.byteSize}</span>
      </WithFileNodeContextMenu>
    ),
    timeComponent: (
      <WithFileNodeContextMenu stat={stat} setRenamingMode={() => {}}>
        <span>
          {time.toLocaleDateString() + " " + time.toLocaleTimeString()}
        </span>
      </WithFileNodeContextMenu>
    ),
    permissionComponent: (
      <WithFileNodeContextMenu stat={stat} setRenamingMode={() => {}}>
        <span>{permissionToString(stat.permissionMode)}</span>
      </WithFileNodeContextMenu>
    ),
  };
}
