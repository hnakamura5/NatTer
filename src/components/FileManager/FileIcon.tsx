import { CSSProperties } from "react";
import { api } from "@/api";
import { useState } from "react";

import { FaFolder, FaFile, FaFolderOpen } from "react-icons/fa";

import styled from "@emotion/styled";
import SpaceBarIcon from "@mui/icons-material/SpaceBar";

export function IconForFile(props: { name: string; style?: CSSProperties }) {
  const [iconPath, setIconPath] = useState<string | undefined>(undefined);
  const fileIcon = api.icon.fileIcon.useQuery(props.name, {
    enabled: iconPath === undefined,
  });
  if (!iconPath && fileIcon.data) {
    setIconPath(fileIcon.data);
  }
  if (!iconPath) {
    return <FaFile style={props.style} />;
  }
  return <img src={iconPath} style={props.style} />;
}

export function IconForFolder(props: { name: string; style: CSSProperties }) {
  const [iconPath, setIconPath] = useState<string | undefined>(undefined);
  const folderIcon = api.icon.folderIcon.useQuery(props.name, {
    enabled: iconPath === undefined,
  });
  if (!iconPath && folderIcon.data) {
    setIconPath(folderIcon.data);
  }
  if (!iconPath) {
    return <FaFolder style={props.style} />;
  }
  return <img src={iconPath} style={props.style} />;
}

export function IconOpenFolder(props: { name: string; style: CSSProperties }) {
  const [iconPath, setIconPath] = useState<string | undefined>(undefined);
  const folderIcon = api.icon.openFolderIcon.useQuery(props.name, {
    enabled: iconPath === undefined,
  });
  if (!iconPath && folderIcon.data) {
    setIconPath(folderIcon.data);
  }
  if (!iconPath) {
    return <FaFolderOpen style={props.style} />;
  }
  return <img src={iconPath} style={props.style} />;
}

export function IconForFileOrFolder(props: {
  name: string;
  isDir: boolean;
  isOpen?: boolean;
  style?: CSSProperties;
}) {
  if (props.isDir) {
    if (props.isOpen) {
      return <IconOpenFolder name={props.name} style={props.style || {}} />;
    }
    return <IconForFolder name={props.name} style={props.style || {}} />;
  }
  return <IconForFile name={props.name} style={props.style} />;
}

export const InlineIconAdjustStyle = {
  verticalAlign: "-4px",
  width: "1em",
  height: "1em",
  paddingRight: "4px",
};

export const EmptySpaceIcon = styled(SpaceBarIcon)({
  opacity: 0,
});
