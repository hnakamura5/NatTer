import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";
import React from "react";
import { useFileManagerHandle } from "./FileManagerHandle";
import { useKey } from "@dnd-kit/core/dist/components/DragOverlay/hooks";
import { log } from "@/datatypes/Logger";

export function FileKeybindings(props: { children: React.ReactNode }) {
  const handle = useFileManagerHandle();
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand("Cut", handle.cutSelectedToInternalClipboard, keybindRef);
  useKeybindOfCommand(
    "Copy",
    () => {
      handle.copySelectionToInternalClipboard();
      log.debug("Copy");
    },
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

  return (
    <KeybindScope keybindRef={keybindRef} id="FileManager">
      {props.children}
    </KeybindScope>
  );
}
