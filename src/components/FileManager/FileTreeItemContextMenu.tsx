import { FileManagerHandle, useFileManagerHandle } from "./FileManagerHandle";
import {
  ContextMenuStyleBox,
  ContextSubMenuStyleBox,
  ContextSubMenu,
  ContextDivider,
} from "@/components/Menu/ContextMenu";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { FileStat } from "@/datatypes/PathAbstraction";
import { IconMenuItem } from "@/components/Menu/MenuItem";
import { useLabels, useTheme } from "@/AppState";
import { IconSubMenuItem, SubMenu, SubMenuItem } from "../Menu/SubMenu";
import { Divider } from "@mui/material";
import { EmptySpaceIcon } from "./FileIcon";
import { log } from "@/datatypes/Logger";

import FileOpenIcon from "@mui/icons-material/FileOpen";
import FolderOpenIcon from "@mui/icons-material/FolderOpen";
import FileCopyIcon from "@mui/icons-material/FileCopy";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditIcon from "@mui/icons-material/Edit";
import ContentPasteIcon from "@mui/icons-material/ContentPaste";
import FeedIcon from "@mui/icons-material/Feed";

const IconStyle = {
  scale: 0.7,
  marginTop: "0px",
  marginBottom: "0px",
  marginRight: "4px",
};

export function DeleteSubMenu(props: { filePath: string }) {
  const labels = useLabels();
  const contextLabels = labels.fileManager.context;
  const handle = useFileManagerHandle();
  return (
    <ContextSubMenuStyleBox>
      <IconMenuItem
        icon={<DeleteIcon sx={IconStyle} />}
        label={contextLabels.trash}
        onClick={() => {
          handle.trash(props.filePath);
        }}
      />
      <IconMenuItem
        icon={<DeleteForeverIcon sx={IconStyle} />}
        label={contextLabels.deletePermanently}
        onClick={() => {
          handle.remove(props.filePath);
        }}
      />
    </ContextSubMenuStyleBox>
  );
}

export function CopyPathSubMenu(props: { filePath: string; baseName: string }) {
  const handle = useFileManagerHandle();
  const [subPaths, setSubPaths] = useState<string[]>([]);
  const relativePath = handle.getRelativePathFromActive(props.filePath);

  useEffect(() => {
    if (subPaths.length === 0) {
      handle.getSubPathList(props.filePath).then((list) => {
        setSubPaths(list);
      });
    }
  }, []);

  return (
    <ContextSubMenuStyleBox>
      {relativePath !== props.baseName ? (
        <IconMenuItem
          key={props.baseName}
          label={props.baseName}
          onClick={() => {
            handle.copyToOSClipboard(props.baseName);
          }}
        />
      ) : (
        <></>
      )}
      <IconMenuItem
        key={relativePath}
        label={relativePath}
        onClick={() => {
          handle.copyToOSClipboard(relativePath);
        }}
      />
      <ContextDivider />
      {subPaths.map((subPath) => {
        return (
          <IconMenuItem
            key={subPath}
            label={subPath}
            onClick={() => {
              handle.copyToOSClipboard(subPath);
            }}
          />
        );
      })}
    </ContextSubMenuStyleBox>
  );
}

export type FileTreeFileItemContextMenuProps = {
  stat: FileStat;
  setRenamingMode: (mode: boolean) => void;
};

export function FileTreeFileItemContextMenu(
  props: FileTreeFileItemContextMenuProps
) {
  const labels = useLabels();
  const contextLabels = labels.fileManager.context;
  const handle = useFileManagerHandle();
  const isDir = props.stat.isDir;
  const filePath = props.stat.fullPath;
  return (
    <ContextMenuStyleBox>
      <IconMenuItem
        icon={
          isDir ? (
            <FolderOpenIcon sx={IconStyle} />
          ) : (
            <FileOpenIcon sx={IconStyle} />
          )
        }
        label={isDir ? contextLabels.openDirectory : contextLabels.openFile}
        onClick={() => {
          isDir ? handle.moveActivePathTo(filePath) : handle.openFile(filePath);
        }}
      />
      <IconMenuItem
        icon={<FileCopyIcon sx={IconStyle} />}
        label={contextLabels.copy}
        onClick={() => {
          handle.copyToInternalClipboard(filePath);
        }}
      />
      <IconMenuItem
        icon={<ContentCutIcon sx={IconStyle} />}
        label={contextLabels.cut}
        onClick={() => {
          handle.cutToInternalClipboard(filePath);
        }}
      />
      {isDir ? (
        <IconMenuItem
          icon={<ContentPasteIcon sx={IconStyle} />}
          label={contextLabels.paste}
          onClick={() => {
            handle.pasteFromInternalClipboard(filePath);
          }}
        />
      ) : (
        <></>
      )}
      <ContextSubMenu
        label={
          <IconSubMenuItem
            icon={<EmptySpaceIcon sx={IconStyle} />}
            label={contextLabels.delete}
          />
        }
      >
        <DeleteSubMenu filePath={filePath} />
      </ContextSubMenu>
      <IconMenuItem
        icon={<EditIcon sx={IconStyle} />}
        label={contextLabels.rename}
        onClick={() => {
          props.setRenamingMode(true);
        }}
      />
      <ContextDivider />
      <ContextSubMenu
        label={
          <IconSubMenuItem
            icon={<ContentCopyIcon sx={IconStyle} />}
            label={contextLabels.copyPath}
          />
        }
      >
        <CopyPathSubMenu filePath={filePath} baseName={props.stat.baseName} />
      </ContextSubMenu>
      <ContextDivider />
      <IconMenuItem
        icon={<FeedIcon sx={IconStyle} />}
        label={contextLabels.properties}
        onClick={() => {
          log.debug("Show properties");
          // TODO: Show properties
        }}
      />
    </ContextMenuStyleBox>
  );
}
