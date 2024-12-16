import { CSSProperties } from "react";
import { api } from "@/api";
import { useState } from "react";

import { FaFolder, FaFile, FaFolderOpen } from "react-icons/fa";

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
