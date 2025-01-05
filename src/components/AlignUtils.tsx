import { ReactNode } from "react";

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
