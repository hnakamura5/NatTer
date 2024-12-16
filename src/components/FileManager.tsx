import { SimpleTreeView as MuiTreeView } from "@mui/x-tree-view";
import { Box, Breadcrumbs as MUIBreadcrumbs } from "@mui/material";
import styled from "@emotion/styled";

import { useState } from "react";
import { api } from "@/api";
import { useTheme } from "@/AppState";

import React from "react";
import { KeybindScope } from "@/components/KeybindScope";

import { FileTreeItem } from "@/components/FileManager/FileTreeItem";

import { log } from "@/datatypes/Logger";

const ListMargin = "3px";

const TreeView = styled(MuiTreeView)(({ theme }) => ({
  color: theme.system.textColor,
  margin: `${ListMargin} 0px ${ListMargin} 0px`,
}));

export type FileManagerProps = {
  home: string;
  focusRef?: React.Ref<unknown>;
};

export function FileManager(props: FileManagerProps) {
  const [current, setCurrent] = useState<string>(props.home);
  if (current !== props.home) {
    setCurrent(props.home);
  }

  return (
    <KeybindScope>
      <div ref={props.focusRef as React.Ref<HTMLDivElement>} tabIndex={-1}>
        <TreeView>
          <FileTreeItem path={current} key={current} showTop={false} />
        </TreeView>
      </div>
    </KeybindScope>
  );
}
