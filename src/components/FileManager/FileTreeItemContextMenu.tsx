import { FileManagerHandle, useFileManagerHandle } from "./FileManagerHandle";
import {
  ContextMenuStyleBox,
  ContextSubMenuStyleBox,
  ContextSubMenu,
} from "@/components/Menu/ContextMenu";
import { IconMenuItem } from "@/components/Menu/MenuItem";
import { useLabels, useTheme } from "@/AppState";
import { IconSubMenuItem, SubMenu, SubMenuItem } from "../Menu/SubMenu";
import { Divider } from "@mui/material";

import FileCopyIcon from "@mui/icons-material/FileCopy";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import SpaceBarIcon from "@mui/icons-material/SpaceBar";
import styled from "@emotion/styled";
import { useEffect, useState } from "react";
import { FileStat } from "@/datatypes/PathAbstraction";

const EmptySpaceIcon = styled(SpaceBarIcon)({
  opacity: 0,
});

const IconStyle = {
  scale: 0.7,
  marginTop: "0px",
  marginBottom: "0px",
  marginRight: "4px",
};

function DeleteSubMenu(props: { filePath: string }) {
  const labels = useLabels();
  const handle = useFileManagerHandle();
  return (
    <ContextSubMenuStyleBox>
      <IconMenuItem
        icon={<DeleteIcon sx={IconStyle} />}
        label={labels.fileManager.context.trash}
        onClick={() => {
          handle.trash(props.filePath);
        }}
      />
      <IconMenuItem
        icon={<DeleteForeverIcon sx={IconStyle} />}
        label={labels.fileManager.context.deletePermanently}
        onClick={() => {
          handle.remove(props.filePath);
        }}
      />
    </ContextSubMenuStyleBox>
  );
}

function CopyPathSubMenu(props: { filePath: string; baseName: string }) {
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
      <Divider />
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
};

export function FileTreeFileItemContextMenu(
  props: FileTreeFileItemContextMenuProps
) {
  const labels = useLabels();
  const handle = useFileManagerHandle();
  const filePath = props.stat.fullPath;
  return (
    <ContextMenuStyleBox>
      <IconMenuItem
        icon={<FileCopyIcon sx={IconStyle} />}
        label={labels.fileManager.context.copy}
        onClick={() => {
          handle.copyToInternalClipboard(filePath);
        }}
      />
      <IconMenuItem
        icon={<ContentCutIcon sx={IconStyle} />}
        label={labels.fileManager.context.cut}
        onClick={() => {
          handle.cutToInternalClipboard(filePath);
        }}
      />
      <ContextSubMenu
        label={
          <IconSubMenuItem
            icon={<EmptySpaceIcon style={IconStyle} />}
            label={labels.fileManager.context.delete}
          />
        }
      >
        <DeleteSubMenu filePath={filePath} />
      </ContextSubMenu>
      <Divider />
      <ContextSubMenu
        label={
          <IconSubMenuItem
            icon={<ContentCopyIcon style={IconStyle} />}
            label={labels.fileManager.context.copyPath}
          />
        }
      >
        <CopyPathSubMenu filePath={filePath} baseName={props.stat.baseName} />
      </ContextSubMenu>
    </ContextMenuStyleBox>
  );
}
