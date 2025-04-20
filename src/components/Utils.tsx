import { ReactNode, CSSProperties } from "react";

export function hasScrollbarX(element?: HTMLElement | null) {
  if (!element) {
    return false;
  }
  return element.scrollWidth > element.clientWidth;
}

export function hasScrollbarY(element?: HTMLElement | null) {
  if (!element) {
    return false;
  }
  return element.scrollHeight > element.clientHeight;
}

/**
 * Use under the element with style display: flex and flex: 1 to fill the remaining space
 */
export function InlineFullFillPadding() {
  return <div style={{ flex: 1 }}></div>;
}

/**
 * Align the children to the right in the container.
 * The last element before this is spread to the right.
 */
export function AlignRight(props: { children: ReactNode }) {
  return (
    <div
      style={{
        marginLeft: "auto" /* align to the right */,
        display: "contents",
      }}
    >
      {props.children}
    </div>
  );
}

// Debounce the event by interval (or 200ms). This is used to prevent the
// consistent events (such as resizing) from being triggered too often.
export function eventStabilizer<T extends unknown[]>(
  callback: (...args: T) => void,
  interval?: number
) {
  let timeout: NodeJS.Timeout | undefined = undefined;

  return (...args: T) => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      callback(...args);
    }, interval || 200); // 200ms debounce in default.
  };
}
export const flexColumnGrowHeight: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  height: "100%",
  minWidth: 0,
};

export function FlexColumnGrowHeightBox(props: { children: ReactNode }) {
  return <div style={flexColumnGrowHeight}>{props.children}</div>;
}

export const flexRowGrowWidth: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  flexGrow: 1,
  width: "100%",
  minHeight: 0,
};

export function FlexRowGrowWidthBox(props: { children: ReactNode }) {
  return <div style={flexRowGrowWidth}>{props.children}</div>;
}
