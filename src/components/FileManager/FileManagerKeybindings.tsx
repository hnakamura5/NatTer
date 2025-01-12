import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";
import React from "react";
import { useFileManagerHandle } from "./FileManagerHandle";
import { useKey } from "@dnd-kit/core/dist/components/DragOverlay/hooks";

export function FileKeybindings(props: { children: React.ReactNode }) {
  const handle = useFileManagerHandle();
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand("Cut", handle.cutSelectedToInternalClipboard, keybindRef);
  useKeybindOfCommand(
    "Copy",
    handle.copySelectionToInternalClipboard,
    keybindRef
  );
  useKeybindOfCommand(
    "Paste",
    () => {
      handle.pasteFromInternalClipboard();
    },
    keybindRef
  );
  useKeybindOfCommand("Delete", handle.trashSelection, keybindRef);

  return <KeybindScope keybindRef={keybindRef}>{props.children}</KeybindScope>;
}
