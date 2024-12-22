import React from "react";

export function AlignRight(props: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginLeft: "auto" /* align to the right */,
      }}
    >
      {props.children}
    </div>
  );
}
