import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";
import React from "react";
import { useFileManagerHandle } from "./FileManagerHandle";

export function FileKeybindings(props: { children: React.ReactNode }) {
  const handle = useFileManagerHandle();
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand("Cut", handle.cutToInternalClipboard, keybindRef);
  useKeybindOfCommand("Copy", handle.copyToInternalClipboard, keybindRef);
  useKeybindOfCommand("Paste", handle.pasteFromInternalClipboard, keybindRef);

  return <KeybindScope keybindRef={keybindRef}>{props.children}</KeybindScope>;
}
