import React, { useEffect } from "react";

// Helper context to manage focus target globally.
class GlobalFocusMapHandle {
  private map = new Map<GlobalFocusMap.Key, React.RefObject<HTMLElement>>();

  set(key: GlobalFocusMap.Key, target: React.RefObject<HTMLElement>) {
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
    console.log(`GlobalFocusMap.focus: ${key}`);
    if (target) {
      if (target.current) {
        console.log(`GlobalFocusMap.focus: focusing ${key} ${target.current}`);
        target.current.focus();
        return true;
      }
    }
    return false;
  }
  isFocused(key: GlobalFocusMap.Key) {
    const target = this.map.get(key);
    if (target) {
      return target.current === document.activeElement;
    }
    return false;
  }
}

const MapContext = React.createContext(new GlobalFocusMapHandle());

export module GlobalFocusMap {
  // Define keys for managed focus targets.
  export enum Key {
    InputBox,
    LastCommand,
  }

  export function useHandle() {
    return React.useContext(MapContext);
  }

  export function Provider(props: { children: React.ReactNode }) {
    return (
      <MapContext.Provider value={new GlobalFocusMapHandle()}>
        {props.children}
      </MapContext.Provider>
    );
  }

  export function Target(props: {
    focusKey: Key;
    target: React.RefObject<HTMLElement> | undefined;
    children: React.ReactNode;
  }) {
    const handle = useHandle();
    useEffect(() => {
      if (props.target) {
        handle.set(props.focusKey, props.target);
      }
      return () => {
        handle.delete(props.focusKey);
      };
    });
    return <>{props.children}</>;
  }
}
