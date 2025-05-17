import styled from "@emotion/styled";
import { FileStat } from "@/datatypes/UniversalPath";
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
  FaAngleDown as AngleDownIcon,
  FaAngleRight as AngleRightIcon,
} from "react-icons/fa";
import {
  EmptySpaceIcon,
  EmptyStyle,
  IconForFile,
  IconForFolder,
  IconOpenFolder,
  InlineIconAdjustStyle,
} from "./FileIcon";
import { useFileManagerHandle } from "./FileManagerHandle";
import { CSSProperties } from "react";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

function Label(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const labelStyle: CSSProperties = {
    color: theme.system.textColor,
    fontFamily: theme.system.font,
    fontSize: theme.system.fontSize,
    paddingRight: "1rem",
    verticalAlign: "-0.25rem",
  };
  return <span style={labelStyle}>{props.children}</span>;
}

export function ParseLoadingLabel(props: { baseName?: string }) {
  const theme = useTheme();
  return (
    <span>
      <FileIcon
        style={InlineIconAdjustStyle}
        color={theme.system.loadingBaseColor}
      />
      <Label>
        {props.baseName ? props.baseName : <LoadingSkeleton width={80} />}
      </Label>
    </span>
  );
}

const DragStyle = (transform: Transform | null) => {
  return { transform: DndCSS.Translate.toString(transform) };
};

export function FileLabel(props: {
  stat: FileStat;
  baseName?: string;
  onRightClick?: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef: dragNodeRef,
    transform,
  } = useDraggable({
    id: props.stat.fullPath,
  });
  const handle = useFileManagerHandle();
  const parsed = api.fs.parsePath.useQuery(
    { path: props.stat.fullPath, remoteHost: handle.getRemoteHost() },
    {
      onError: () => {
        log.error(`Failed to parse ${props.stat.fullPath}`);
      },
    }
  );
  if (!parsed.data) {
    return <ParseLoadingLabel baseName={props.baseName} />;
  }
  const fileName = parsed.data.base;
  return (
    <div
      ref={dragNodeRef}
      style={DragStyle(transform)}
      {...attributes}
      {...listeners}
      onContextMenu={props.onRightClick}
    >
      <AngleRightIcon style={EmptyStyle} />
      <IconForFile name={fileName} style={InlineIconAdjustStyle} />
      <Label>{fileName}</Label>
    </div>
  );
}

export function DirectoryLabel(props: {
  stat: FileStat;
  isExpanded: boolean;
  baseName?: string;
  onRightClick?: () => void;
}) {
  const { setNodeRef: dropNodeRef, isOver } = useDroppable({
    id: props.stat.fullPath,
  });
  const handle = useFileManagerHandle();
  const {
    attributes,
    listeners,
    setNodeRef: dragNodeRef,
    transform,
  } = useDraggable({
    id: props.stat.fullPath,
  });
  const parsed = api.fs.parsePath.useQuery(
    { path: props.stat.fullPath, remoteHost: handle.getRemoteHost() },
    {
      onError: () => {
        log.error(`Failed to parse ${props.stat.fullPath}`);
      },
    }
  );
  if (!parsed.data) {
    return <ParseLoadingLabel baseName={props.baseName} />;
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
          onContextMenu={props.onRightClick}
        >
          <AngleDownIcon style={{ ...InlineIconAdjustStyle, scale: "0.75" }} />
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
        onContextMenu={props.onRightClick}
      >
        <AngleRightIcon style={{ ...InlineIconAdjustStyle, scale: "0.75" }} />
        <IconForFolder name={directoryName} style={InlineIconAdjustStyle} />
        <Label>{directoryName}</Label>
      </div>
    </div>
  );
}

export function StatLoadingLabel(props: { path: string; baseName?: string }) {
  const handle = useFileManagerHandle();
  const parsed = api.fs.parsePath.useQuery(
    { path: props.path, remoteHost: handle.getRemoteHost() },
    {
      onError: () => {
        log.error(`Failed to parse ${props.path}`);
      },
    }
  );
  if (!parsed.data) {
    return <ParseLoadingLabel baseName={props.baseName} />;
  }
  const fileName = parsed.data.base;
  return (
    <span>
      <AngleRightIcon style={EmptyStyle} />
      <IconForFile name={fileName} style={InlineIconAdjustStyle} />
      {fileName}
    </span>
  );
}
