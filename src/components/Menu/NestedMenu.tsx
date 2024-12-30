import { Menu, Popper } from "@mui/material";
import { useEffect, useRef, useState, ReactNode } from "react";

export type NestedMenuProps = {
  label: ReactNode;
  disabled?: boolean;
  children: ReactNode;
};

// Using MUI Menu to create a nested menu
export function NestedMenu(props: NestedMenuProps) {
  const [open, setOpen] = useState(false);
  const labelRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setAnchorEl(labelRef.current);
  }, [labelRef]);

  return (
    <div // Container for the label and the nested menu
      style={{ display: "contents" }}
      // Mouse control
      onMouseEnter={() => {
        setOpen(!props.disabled);
      }}
      onMouseLeave={() => {
        setOpen(false);
      }}
    >
      <div // Label
        ref={labelRef}
        tabIndex={-1}
        // Keyboard control
        onFocus={() => {
          setOpen(!props.disabled);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.stopPropagation();
            setOpen(!props.disabled);
            // Focus the first item in the nested menu
            (menuRef.current?.children[0] as HTMLDivElement)?.focus();
          }
        }}
      >
        {props.label}
      </div>
      <Menu // Nested menu
        style={{ pointerEvents: "none" }}
        open={open}
        anchorEl={anchorEl}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        onClose={() => {
          setOpen(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.stopPropagation();
            setOpen(false);
          }
        }}
        ref={menuRef}
      >
        {props.children}
      </Menu>
    </div>
  );
}
