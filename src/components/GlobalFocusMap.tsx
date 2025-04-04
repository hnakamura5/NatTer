import {
  RefCallback,
  RefObject,
  MutableRefObject,
  useEffect,
  useContext,
  createContext,
} from "react";

import { log } from "@/datatypes/Logger";

type FocusTarget = {
  focusRef?: RefObject<HTMLElement>;
  callBeforeFocus?: (
    focusRef?: RefObject<HTMLElement>
  ) => Promise<boolean>;
};

// Helper context to manage focus target globally.
class GlobalFocusMapHandle {
  private map = new Map<GlobalFocusMap.Key, FocusTarget>();

  set(key: GlobalFocusMap.Key, target: FocusTarget) {
    // log.debug(`GlobalFocusMap.set: ${key} target: ${target.focusRef?.current}`);
    this.map.set(key, target);
  }
  get(key: GlobalFocusMap.Key) {
    return this.map.get(key);
  }
  delete(key: GlobalFocusMap.Key) {
    this.map.delete(key);
  }
  focus(key: GlobalFocusMap.Key) {
    const target = this.map.get(key);
    log.debug(`GlobalFocusMap.focus: ${key}`);
    if (target) {
      if (target.callBeforeFocus) {
        target.callBeforeFocus(target.focusRef).then((prevent) => {
          if (!prevent && target.focusRef?.current) {
            // log.debug(
            //   `GlobalFocusMap.focus: focusing ${key} ${target.focusRef.current}`
            // );
            target.focusRef.current.focus();
          }
        });
      } else if (target.focusRef?.current) {
        log.debug(
          `GlobalFocusMap.focus: focusing ${key} ${target.focusRef.current}#${target.focusRef.current.id}.${target.focusRef.current.className}`
        );
        target.focusRef.current.focus();
      } else {
        log.debug(
          `GlobalFocusMap.focus: no focus target ${key} ${target.focusRef?.current}`
        );
      }
    } else {
      log.debug(`GlobalFocusMap.focus: no target entry for ${key}`);
    }
  }
  isFocused(key: GlobalFocusMap.Key) {
    const target = this.map.get(key);
    if (target) {
      return target.focusRef?.current === document.activeElement;
    }
    return false;
  }
}

const MapContext = createContext(new GlobalFocusMapHandle());

export module GlobalFocusMap {
  // Define keys for managed focus targets.
  export enum GlobalKey {
    InputBox,
    LastCommand,
    FileView,
  }
  export type Key = GlobalKey | string;

  export function useHandle() {
    return useContext(MapContext);
  }

  export function Provider(props: { children: React.ReactNode }) {
    return (
      <MapContext.Provider value={new GlobalFocusMapHandle()}>
        {props.children}
      </MapContext.Provider>
    );
  }

  // To focus on focusRef when the key is invoked from handle.
  // callBeforeFocus is called to check if the focus should be done.
  // Return true to prevent focus.
  export function Target(props: {
    focusKey?: Key;
    focusRef?: RefObject<HTMLElement>;
    // Return false to prevent the focus to the ref.
    callBeforeFocus?: (focusRef?: RefObject<HTMLElement>) => Promise<boolean>;
    children: React.ReactNode;
  }) {
    const handle = useHandle();
    useEffect(() => {
      // log.debug(`GlobalFocusMap.Target: ${props.focusKey} ${props.focusRef?.current}`);
      if (props.focusKey === undefined) {
        return;
      }
      if (props.focusRef || props.callBeforeFocus) {
        handle.set(props.focusKey, {
          focusRef: props.focusRef,
          callBeforeFocus: props.callBeforeFocus,
        });
      }
      return () => {
        if (props.focusKey) {
          handle.delete(props.focusKey);
        }
      };
    }, [props.focusKey, props.focusRef, props.callBeforeFocus, handle]);
    return <>{props.children}</>;
  }
}
