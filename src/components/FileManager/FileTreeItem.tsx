import { TreeItem as MuiTreeItem, TreeItemProps } from "@mui/x-tree-view";
import Input from "@mui/material/Input";
import styled from "@emotion/styled";
import { FileStat } from "@/datatypes/UniversalPath";
import { api } from "@/api";
import { useTheme } from "@/AppState";
import { log } from "@/datatypes/Logger";
import { useFileManagerHandle } from "./FileManagerHandle";
import { ContextMenu } from "../Menu/ContextMenu";
import { FileTreeFileItemContextMenu } from "./FileTreeItemContextMenu";
import {
  DirectoryLabel,
  StatLoadingLabel,
  FileLabel,
} from "./FileTreeItemLabel";
import { useState } from "react";
import { IconForFileOrFolder } from "./FileIcon";
import { InlineIconAdjustStyle } from "./FileIcon";

import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "@/components/KeybindScope";
import { ListItemIcon } from "@mui/material";
import { BasicInput } from "../BasicInput";

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

function DirectoryLabelOrRenamingInput(props: {
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
      <ContextMenu
        items={
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
      </ContextMenu>
    );
  }
}

function FileLabelOrRenamingInput(props: {
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
      <ContextMenu
        items={
          <FileTreeFileItemContextMenu
            stat={props.stat}
            setRenamingMode={props.setRenamingMode}
          />
        }
      >
        <FileLabel stat={props.stat} baseName={props.baseName} />
      </ContextMenu>
    );
  }
}

export const ListMargin = "3px";

const StyledTreeItem = styled(MuiTreeItem)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.secondaryBackgroundColor,
  textAlign: "left",
  margin: `-${ListMargin} 0px -${ListMargin} 0px`,
  padding: "0px 0px 0px 3px", // top right bottom left
  "& .MuiTreeItem-iconContainer": {
    marginRight: "-7px",
  },
}));

// TODO: Fast up the rendering of directories with many files. (e.g. prefetching)
export function FileTreeItem(props: {
  path: string;
  key: string;
  showTop: boolean;
  expandedItems: string[];
  renamingMode?: boolean;
  baseName?: string; // Used for loading skeleton
}) {
  const [renamingMode, setRenamingMode] = useState(!!props.renamingMode);

  const handle = useFileManagerHandle();
  //log.error(`FileTreeItem: ${props.path}`);
  const uPath = {
    path: props.path,
    remoteHost: handle.getRemoteHost(),
  };
  const stat = api.fs.stat.useQuery(uPath, {
    onError: () => {
      log.error(`Failed to stat ${props.path}`);
    },
  });
  const parsed = api.fs.parsePath.useQuery(uPath, {
    onError: () => {
      log.error(`Failed to parse ${props.path}`);
    },
  });
  const list = api.fs.list.useQuery(uPath, {
    onError: () => {
      log.error(`Failed to list ${props.path}`);
    },
  });
  api.fs.pollChange.useSubscription(uPath, {
    onError: () => {
      log.error(`Failed to pollChange ${props.path}`);
    },
    onData: () => {
      stat.refetch();
      list.refetch();
    },
  });

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "RenameFile",
    () => {
      setRenamingMode(true);
    },
    keybindRef
  );

  if (!stat.data || !parsed.data) {
    return (
      <StyledTreeItem
        itemId={props.path}
        label={<StatLoadingLabel path={props.path} baseName={props.baseName} />}
      />
    );
  }

  const submitRenaming = (baseName: string) => {
    const newPath = parsed.data.dir + parsed.data.sep + baseName;
    log.debug(`Renaming ${props.path} to ${newPath}`);
    setRenamingMode(false);
    handle.move(uPath, { path: newPath, remoteHost: handle.getRemoteHost() });
  };

  if (stat.data.isDir) {
    // Directory
    const children = list.data?.map((child) => (
      <FileTreeItem
        path={props.path + parsed.data.sep + child}
        key={child}
        showTop={true}
        expandedItems={props.expandedItems}
        baseName={child}
      />
    ));
    if (props.showTop) {
      return (
        <KeybindScope keybindRef={keybindRef}>
          <StyledTreeItem
            itemId={props.path}
            label={
              <DirectoryLabelOrRenamingInput
                stat={stat.data}
                isExpanded={props.expandedItems.includes(props.path)}
                baseName={parsed.data.base}
                renamingMode={renamingMode}
                setRenamingMode={setRenamingMode}
                submitRenaming={submitRenaming}
              />
            }
            onDoubleClick={(e) => {
              handle.moveActivePathTo(props.path);
              e.stopPropagation();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handle.moveActivePathTo(props.path);
                e.stopPropagation();
              }
            }}
          >
            {children}
          </StyledTreeItem>
        </KeybindScope>
      );
    } else {
      return <>{children}</>;
    }
  } else {
    // File
    return (
      <KeybindScope keybindRef={keybindRef}>
        <StyledTreeItem
          itemId={props.path}
          label={
            <FileLabelOrRenamingInput
              stat={stat.data}
              baseName={parsed.data.base}
              renamingMode={renamingMode}
              setRenamingMode={setRenamingMode}
              submitRenaming={submitRenaming}
            />
          }
          onDoubleClick={(e) => {
            handle.openFile(props.path);
            e.stopPropagation();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              handle.openFile(props.path);
              e.stopPropagation();
            }
          }}
        />
      </KeybindScope>
    );
  }
}
