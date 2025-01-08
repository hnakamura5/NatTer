import { FileManagerHandle } from "./FileManagerHandle";
import {
  ContextMenuStyleBox,
  ContextSubMenuStyleBox,
  ContextSubMenu,
} from "@/components/Menu/ContextMenu";
import { IconMenuItem } from "@/components/Menu/MenuItem";
import { useLabels, useTheme } from "@/AppState";
import { SubMenu, SubMenuItem } from "../Menu/SubMenu";
import { Icon } from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import ContentCutIcon from "@mui/icons-material/ContentCut";
import DeleteIcon from "@mui/icons-material/Delete";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import SpaceBarIcon from "@mui/icons-material/SpaceBar";
import styled from "@emotion/styled";

export type FileTreeFileItemContextMenuProps = {
  handle: FileManagerHandle;
  filePath: string;
};
const EmptySpaceIcon = styled(SpaceBarIcon)({
  opacity: 0,
});

export function FileTreeFileItemContextMenu(
  props: FileTreeFileItemContextMenuProps
) {
  const labels = useLabels();

  const theme = useTheme();
  const IconStyle = {
    scale: 0.7,
    marginTop: "-3px",
    marginRight: "5px",
  };

  return (
    <ContextMenuStyleBox>
      <IconMenuItem
        icon={<ContentCopyIcon sx={IconStyle} />}
        label={labels.fileManager.context.copy}
        onClick={() => {
          props.handle.copyToInternalClipboard(props.filePath);
        }}
      />
      <IconMenuItem
        icon={<ContentCutIcon sx={IconStyle} />}
        label={labels.fileManager.context.cut}
        onClick={() => {
          props.handle.cutToInternalClipboard(props.filePath);
        }}
      />
      <ContextSubMenu
        label={
          <SubMenuItem>
            <EmptySpaceIcon style={IconStyle} />
            {labels.fileManager.context.delete}
          </SubMenuItem>
        }
      >
        <ContextSubMenuStyleBox>
          <IconMenuItem
            icon={<DeleteIcon sx={IconStyle} />}
            label={labels.fileManager.context.trash}
            onClick={() => {
              props.handle.trash(props.filePath);
            }}
          />
          <IconMenuItem
            icon={<DeleteForeverIcon sx={IconStyle} />}
            label={labels.fileManager.context.deletePermanently}
            onClick={() => {
              props.handle.remove(props.filePath);
            }}
          />
        </ContextSubMenuStyleBox>
      </ContextSubMenu>
    </ContextMenuStyleBox>
  );
}
