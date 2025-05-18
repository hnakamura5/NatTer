import { RefCallback, MutableRefObject } from "react";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import { KeybindCommands } from "@/datatypes/KeybindCommands";
import { HotkeyCallback, useHotkeys } from "react-hotkeys-hook";
import { useKeybindList } from "@/AppState";

import { log } from "@/datatypes/Logger";

type KeybindOfCommandScopeRef =
  MutableRefObject<RefCallback<HTMLElement> | null>;

export function useKeybindOfCommandScopeRef(): KeybindOfCommandScopeRef {
  return { current: null };
}

// Bind predefined key command to hotkey.
// Use KeybindOfCommandScopeRef to chain the commands and bind to handle for scoping.
// In default. prevent default bubbling.
export function useKeybindOfCommand(
  command: KeybindCommands,
  callback: HotkeyCallback,
  keybindRef?: KeybindOfCommandScopeRef,
  options?: OptionsOrDependencyArray & { notStopPropagation?: boolean }
) {
  const keys = useKeybindList().get(command);
  const keyList = keys?.map((key) => key.key).join(", ") || [];
  // TODO: how to support args?
  const ref = useHotkeys(
    keyList || "",
    (e, h) => {
      callback(e, h);
      if (!options?.notStopPropagation) {
        e.stopPropagation();
      }
    },
    {
      enabled: keys !== undefined,
      preventDefault: true,
      enableOnContentEditable: true,
      enableOnFormTags: true,
      ...options,
    }
  );
  if (keybindRef !== undefined) {
    const current = keybindRef.current;
    if (current !== null) {
      keybindRef.current = (instance: HTMLElement | null) => {
        current(instance);
        ref(instance);
      };
    } else {
      keybindRef.current = ref;
    }
  }
}

export function useKeybindOfCommandBlocker(
  command: KeybindCommands,
  keybindRef?: KeybindOfCommandScopeRef
) {
  useKeybindOfCommand(command, () => {}, keybindRef, {
    notStopPropagation: false, // Stop propagation. (default)
  });
}

export function useBuiltinKeybindsBlocker(
  keybindRef?: KeybindOfCommandScopeRef
) {
  useKeybindOfCommandBlocker("Copy", keybindRef);
  useKeybindOfCommandBlocker("Paste", keybindRef);
  useKeybindOfCommandBlocker("Cut", keybindRef);
  useKeybindOfCommandBlocker("Undo", keybindRef);
  useKeybindOfCommandBlocker("Redo", keybindRef);
  useKeybindOfCommandBlocker("SelectAll", keybindRef);
  useKeybindOfCommandBlocker("Save", keybindRef);
}

export function KeybindScope(props: {
  keybindRef?: KeybindOfCommandScopeRef;
  style?: React.CSSProperties;
  id?: string;
  children: React.ReactNode;
}) {
  const current = props.keybindRef?.current;
  if (!current) {
    return <>{props.children}</>;
  } else {
    // TODO: This div collapses the layout
    return (
      <div
        ref={current}
        tabIndex={-1}
        style={{ ...props.style, display: "contents" }}
        id={props.id}
        onKeyDown={(e) => {
          log.debug(`KeybindScope: key: ${e.key} #${props.id}`);
        }}
        onFocus={(e) => {
          log.debug(
            `KeybindScope: focus #${props.id} target id=${e.target.id}`
          );
        }}
      >
        {props.children}
      </div>
    );
  }
}

export function handleKeybindings(keybindRef: KeybindOfCommandScopeRef) {
  return (e: React.KeyboardEvent<HTMLDivElement>) => {
    keybindRef.current?.(e.target as HTMLElement);
  };
}
