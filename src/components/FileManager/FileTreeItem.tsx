import styled from "@emotion/styled";
import { FileStat } from "@/datatypes/UniversalPath";
import { api } from "@/api";
import { useTheme } from "@/AppState";
import { log } from "@/datatypes/Logger";
import { useFileManagerHandle } from "./FileManagerHandle";
import { ContextMenuContext } from "../Menu/ContextMenu";
import { FileTreeFileItemContextMenu } from "./FileTreeItemContextMenu";
import {
  DirectoryLabel,
  StatLoadingLabel,
  FileLabel,
} from "./FileTreeItemLabel";
import { useCallback, useRef, useState } from "react";
import { IconForFileOrFolder } from "./FileIcon";
import { InlineIconAdjustStyle } from "./FileIcon";

import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "@/components/KeybindScope";
import { BasicInput } from "../BasicInput";
import { NodeRendererProps } from "react-arborist";
import { FileTreeNode } from "@/datatypes/PathListForTree";
import { ErrorBoundary } from "react-error-boundary";

function RenamingInput(props: {
  currentName: string;
  isDir: boolean;
  submitName: (baseName: string) => void;
  cancel: () => void;
}) {
  const [baseName, setBaseName] = useState(props.currentName);
  return (
    <div style={{ display: "flex" }}>
      <IconForFileOrFolder
        isDir={props.isDir}
        name={props.currentName}
        style={InlineIconAdjustStyle}
      />
      <BasicInput
        value={baseName}
        onChange={(e) => setBaseName(e.target.value)}
        style={{ width: "100%" }}
        autoFocus
        onBlur={() => {
          props.cancel();
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            props.submitName(baseName);
          } else if (e.key === "Escape") {
            props.cancel();
          }
          e.stopPropagation();
        }}
      />
    </div>
  );
}

export function DirectoryLabelOrRenamingInput(props: {
  stat: FileStat;
  isExpanded: boolean;
  baseName: string;
  renamingMode: boolean;
  setRenamingMode: (mode: boolean) => void;
  submitRenaming: (baseName: string) => void;
}) {
  if (props.renamingMode) {
    return (
      <RenamingInput
        currentName={props.baseName}
        isDir={true}
        submitName={props.submitRenaming}
        cancel={() => {
          props.setRenamingMode(false);
        }}
      />
    );
  } else {
    return (
      <ContextMenuContext
        menuItems={
          <FileTreeFileItemContextMenu
            stat={props.stat}
            setRenamingMode={props.setRenamingMode}
          />
        }
      >
        <DirectoryLabel
          stat={props.stat}
          isExpanded={props.isExpanded}
          baseName={props.baseName}
        />
      </ContextMenuContext>
    );
  }
}

export function FileLabelOrRenamingInput(props: {
  stat: FileStat;
  baseName: string;
  renamingMode: boolean;
  setRenamingMode: (mode: boolean) => void;
  submitRenaming: (baseName: string) => void;
}) {
  if (props.renamingMode) {
    return (
      <RenamingInput
        currentName={props.baseName}
        isDir={false}
        submitName={props.submitRenaming}
        cancel={() => {
          props.setRenamingMode(false);
        }}
      />
    );
  } else {
    return (
      <ContextMenuContext
        menuItems={
          <FileTreeFileItemContextMenu
            stat={props.stat}
            setRenamingMode={props.setRenamingMode}
          />
        }
      >
        <FileLabel stat={props.stat} baseName={props.baseName} />
      </ContextMenuContext>
    );
  }
}

export function FileTreeItem(
  props: NodeRendererProps<FileTreeNode> & {
    onLoad: (fullPath: string, indexes: number[]) => Promise<void>;
  }
) {
  const theme = useTheme();
  const node = props.node;
  const data = node.data;
  const handle = useFileManagerHandle();

  const [renamingMode, setRenamingMode] = useState(!!props.renamingMode);

  const stat = api.fs.stat.useQuery(data.uPath, {
    onError: () => {
      log.error(`Failed to stat ${data.uPath.path}`);
    },
  });
  api.fs.pollChange.useSubscription(data.uPath, {
    onError: () => {
      log.error(`Failed to pollChange ${data.uPath.path}`);
    },
    onData: () => {
      if (stat.data?.isDir) {
        props.onLoad(data.uPath.path, data.indexes);
      }
    },
  });
  const rename = api.fileManager.renameBaseName.useMutation();

  const clickTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      log.debug(
        `FileTreeItem: handleClick ${data.uPath.path}, isDir: ${stat.data?.isDir}, children: ${node.children}`
      );
      // Implement of react-arborist click is not comprehensive
      // (e.g. Not supporting ctrl+click).
      e.stopPropagation();
      if (clickTimeout.current) {
        return;
      }
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = undefined;
        // Handle selection.
        if (e.ctrlKey || e.metaKey) {
          node.isSelected ? node.deselect() : node.selectMulti();
        } else if (e.shiftKey) {
          node.selectContiguous();
        } else {
          node.select();
          node.activate();
        }
        // Handle open/close and children
        if (stat.data?.isDir && !data.loaded) {
          props.onLoad(data.uPath.path, data.indexes).then(() => {
            log.debug(`FileTreeItem: handleClick loaded ${data.uPath.path}`);
            node.toggle();
          });
        } else {
          node.toggle();
        }
      }, 200);
    },
    [stat.data]
  );

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "RenameFile",
    () => {
      log.debug(`FileTreeItem: rename ${data.uPath.path}`);
      setRenamingMode(true);
    },
    keybindRef
  );

  const statusStyle: React.CSSProperties = {
    backgroundColor: node.isSelected
      ? theme.system.selectionBackgroundColor
      : node.isFocused
      ? theme.system.focusBackgroundColor
      : theme.system.fileManagerBackgroundColor,
  };

  if (!stat.data) {
    return <div>Loading...</div>;
  }
  // KeybindScope must be the outermost element to capture key events.
  return (
    <ErrorBoundary fallbackRender={FileTreeItemError}>
      <KeybindScope keybindRef={keybindRef} id={data.uPath.path}>
        <div
          style={{ ...statusStyle, ...props.style }}
          onClick={handleClick}
          onDoubleClick={(e) => {
            if (clickTimeout.current) {
              clearTimeout(clickTimeout.current);
              clickTimeout.current = undefined;
            }
            handle.moveActivePathTo(data.uPath.path);
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              log.debug(`FileTreeItem: key ${e.key} ${data.uPath.path}`);
              handle.moveActivePathTo(data.uPath.path);
              e.stopPropagation();
            }
          }}
        >
          {stat.data.isDir ? (
            <DirectoryLabelOrRenamingInput
              stat={stat.data}
              baseName={data.baseName}
              isExpanded={node.isOpen}
              renamingMode={renamingMode}
              setRenamingMode={setRenamingMode}
              submitRenaming={(baseName: string) => {
                rename.mutate({
                  uPath: data.uPath,
                  newBaseName: baseName,
                });
              }}
            />
          ) : (
            <FileLabelOrRenamingInput
              stat={stat.data}
              baseName={data.baseName}
              renamingMode={renamingMode}
              setRenamingMode={setRenamingMode}
              submitRenaming={(baseName: string) => {
                rename.mutate({
                  uPath: data.uPath,
                  newBaseName: baseName,
                });
              }}
            />
          )}
        </div>
      </KeybindScope>
    </ErrorBoundary>
  );
}

function FileTreeItemError() {
  return <div>Failed to load file tree item</div>;
}
