import { FileManagerHandle } from "./FileManagerHandle";
import { ContextMenuStyleBox } from "@/components/Menu/ContextMenu";
import { IconMenuItem } from "@/components/Menu/MenuItem";

export type FileTreeItemContextMenuProps = {
  handle: FileManagerHandle;
  filePath: string;
};

export function FileTreeItemContextMenu(props: FileTreeItemContextMenuProps) {
  return (
    <ContextMenuStyleBox>
      <IconMenuItem
        label="Copy"
        onClick={() => {
          props.handle.copyToInternalClipboard(props.filePath);
        }}
      ></IconMenuItem>
    </ContextMenuStyleBox>
  );
}
