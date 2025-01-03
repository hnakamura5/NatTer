import { TreeItem as MuiTreeItem, TreeItemProps } from "@mui/x-tree-view";
import styled from "@emotion/styled";
import { FileStat } from "@/datatypes/PathAbstraction";
import { api } from "@/api";
import { useTheme } from "@/AppState";
import { log } from "@/datatypes/Logger";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { CSS as DndCSS, Transform } from "@dnd-kit/utilities";

import {
  FaFolder as FolderIcon,
  FaFile as FileIcon,
  FaFolderOpen as FolderOpenIcon,
} from "react-icons/fa";
import {
  IconForFile,
  IconForFolder,
  IconOpenFolder,
  InlineIconAdjustStyle,
} from "./FileIcon";

import { useFileManagerHandle } from "./FileManagerHandle";
import { CSSProperties } from "react";

function Label(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const labelStyle = {
    color: theme.system.textColor,
    fontFamily: theme.system.font,
    fontSize: theme.system.fontSize,
    paddingRight: "10px",
  };
  return <span style={labelStyle}>{props.children}</span>;
}

function ParseLoadingLabel() {
  const theme = useTheme();
  return (
    <span>
      <FileIcon
        style={InlineIconAdjustStyle}
        color={theme.system.loadingBaseColor}
      />
      <Label>
        <LoadingSkeleton width={80} />
      </Label>
    </span>
  );
}

const DragStyle = (transform: Transform | null) => {
  return { transform: DndCSS.Translate.toString(transform) };
};

function FileLabel(props: { stat: FileStat }) {
  const {
    attributes,
    listeners,
    setNodeRef: dragNodeRef,
    transform,
  } = useDraggable({
    id: props.stat.fullPath,
  });
  const parsed = api.fs.parsePath.useQuery(
    { fullPath: props.stat.fullPath },
    {
      onError: () => {
        log.error(`Failed to parse ${props.stat.fullPath}`);
      },
    }
  );
  if (!parsed.data) {
    return <ParseLoadingLabel />;
  }
  const fileName = parsed.data.base;
  return (
    <div
      ref={dragNodeRef}
      style={DragStyle(transform)}
      {...attributes}
      {...listeners}
    >
      <IconForFile name={fileName} style={InlineIconAdjustStyle} />
      <Label>{fileName}</Label>
    </div>
  );
}

function DirectoryLabel(props: { stat: FileStat; isExpanded: boolean }) {
  const { setNodeRef: dropNodeRef, isOver } = useDroppable({
    id: props.stat.fullPath,
  });
  const {
    attributes,
    listeners,
    setNodeRef: dragNodeRef,
    transform,
  } = useDraggable({
    id: props.stat.fullPath,
  });
  const parsed = api.fs.parsePath.useQuery(
    { fullPath: props.stat.fullPath },
    {
      onError: () => {
        log.error(`Failed to parse ${props.stat.fullPath}`);
      },
    }
  );
  if (!parsed.data) {
    return <ParseLoadingLabel />;
  }
  const directoryName = parsed.data.base;
  const dropOverStyle = isOver
    ? { backgroundColor: "rgba(144, 202, 249, 0.16)" }
    : {};
  // const dropOverStyle = {};
  if (props.isExpanded) {
    return (
      <div ref={dropNodeRef} style={dropOverStyle}>
        <div
          ref={dragNodeRef}
          style={DragStyle(transform)}
          {...attributes}
          {...listeners}
        >
          <IconOpenFolder name={directoryName} style={InlineIconAdjustStyle} />
          <Label>{directoryName}</Label>
        </div>
      </div>
    );
  }
  return (
    <div ref={dropNodeRef} style={dropOverStyle}>
      <div
        ref={dragNodeRef}
        style={DragStyle(transform)}
        {...attributes}
        {...listeners}
      >
        <IconForFolder name={directoryName} style={InlineIconAdjustStyle} />
        <Label>{directoryName}</Label>
      </div>
    </div>
  );
}

function StatLoadingLabel(props: { path: string }) {
  const parsed = api.fs.parsePath.useQuery(
    { fullPath: props.path },
    {
      onError: () => {
        log.error(`Failed to parse ${props.path}`);
      },
    }
  );
  if (!parsed.data) {
    return <ParseLoadingLabel />;
  }
  const fileName = parsed.data.base;
  return (
    <span>
      <IconForFile name={fileName} style={InlineIconAdjustStyle} />
      {fileName}
    </span>
  );
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

function DraggableTreeItem(props: TreeItemProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: props.itemId,
  });
  return (
    <StyledTreeItem
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      {...props}
    />
  );
}

export function FileTreeItem(props: {
  path: string;
  key: string;
  showTop: boolean;
  expandedItems: string[];
}) {
  const handle = useFileManagerHandle();
  //log.error(`FileTreeItem: ${props.path}`);
  const stat = api.fs.stat.useQuery(props.path, {
    onError: () => {
      log.error(`Failed to stat ${props.path}`);
    },
  });
  const list = api.fs.list.useQuery(props.path, {
    onError: () => {
      log.error(`Failed to list ${props.path}`);
    },
  });
  const sep = api.fs.sep.useQuery(undefined, {
    onError: () => {
      log.error(`Failed to get sep`);
    },
  });
  api.fs.pollChange.useSubscription(props.path, {
    onError: () => {
      log.error(`Failed to pollChange ${props.path}`);
    },
    onData: () => {
      stat.refetch();
      list.refetch();
    },
  });

  if (!stat.data) {
    return (
      <StyledTreeItem
        itemId={props.path}
        label={<StatLoadingLabel path={props.path} />}
      />
    );
  }

  if (stat.data.isDir) {
    // Directory
    const children = list.data?.map((child) => (
      <FileTreeItem
        path={props.path + sep.data + child}
        key={child}
        showTop={true}
        expandedItems={props.expandedItems}
      />
    ));
    if (props.showTop) {
      return (
        <StyledTreeItem
          itemId={props.path}
          label={
            <DirectoryLabel
              stat={stat.data}
              isExpanded={props.expandedItems.includes(props.path)}
            />
          }
          onDoubleClick={(e) => {
            handle.moveActivePathTo(props.path);
            e.stopPropagation();
          }}
        >
          {children}
        </StyledTreeItem>
      );
    } else {
      return <>{children}</>;
    }
  } else {
    // File
    return (
      <StyledTreeItem
        itemId={props.path}
        label={<FileLabel stat={stat.data} />}
      />
    );
  }
}
