import { NodeApi, NodeRendererProps, Tree, TreeApi } from "react-arborist";
import { useFileManagerHandle } from "./FileManagerHandle";

import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UniversalPath, univPathToString } from "@/datatypes/UniversalPath";
import styled from "@emotion/styled";
import { Box } from "@mui/material";
import { ContextMenuContext } from "../Menu/ContextMenu";
import { FileTreeFileItemContextMenu } from "./FileTreeItemContextMenu";
import { DirectoryLabel, FileLabel } from "./FileTreeItemLabel";
import { NestedFileTreeNode } from "@/datatypes/PathListForTree";
import { RemoteHostID } from "@/server/FileSystem/univFs";
import { RemoteHost } from "@/datatypes/SshConfig";
import { eventStabilizer, useResizeObserver } from "../Utils";
import { useTheme } from "@/AppState";

type FileTreeNode = NestedFileTreeNode;

const StyledTreeItem = styled(Box)(({ theme }) => ({
  color: theme.system.textColor,
  backgroundColor: theme.system.fileManagerBackgroundColor,
  textAlign: "left",
  margin: 0,
  padding: "0px 0px 0px 3px", // top right bottom left
  "& .MuiTreeItem-iconContainer": {
    marginRight: "-7px",
  },
}));

function FileTreeItem(
  props: NodeRendererProps<FileTreeNode> & {
    onLoad: (fullPath: string, indexes: number[]) => Promise<void>;
  }
) {
  const theme = useTheme();
  const node = props.node;
  const data = node.data;
  const handle = useFileManagerHandle();

  const stat = api.fs.stat.useQuery(data.uPath, {
    onError: () => {
      log.error(`Failed to stat ${data.uPath.path}`);
    },
  });
  api.fs.pollChange.useSubscription(data.uPath, {
    onError: () => {
      log.error(`Failed to pollChange ${data.uPath.path}`);
    },
    onData: () => {
      if (stat.data?.isDir) {
        props.onLoad(data.uPath.path, data.indexes);
      }
    },
  });

  const clickTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      log.debug(
        `FileTreeItem: handleClick ${data.uPath.path}, isDir: ${stat.data?.isDir}, children: ${node.children}`
      );
      // Implement of react-arborist click is not comprehensive
      // (e.g. Not supporting ctrl+click).
      e.stopPropagation();
      if (clickTimeout.current) {
        return;
      }
      clickTimeout.current = setTimeout(() => {
        clickTimeout.current = undefined;
        // Handle selection.
        if (e.ctrlKey || e.metaKey) {
          node.isSelected ? node.deselect() : node.selectMulti();
        } else if (e.shiftKey) {
          node.selectContiguous();
        } else {
          node.select();
          node.activate();
        }
        // Handle open/close and children
        if (stat.data?.isDir && !data.loaded) {
          props.onLoad(data.uPath.path, data.indexes).then(() => {
            log.debug(`FileTreeItem: handleClick loaded ${data.uPath.path}`);
            node.toggle();
          });
        } else {
          node.toggle();
        }
      }, 300);
    },
    [stat.data]
  );

  const statusStyle: React.CSSProperties = useMemo(
    () => ({
      backgroundColor: node.isSelected
        ? theme.system.selectionBackgroundColor
        : node.isFocused
        ? theme.system.focusBackgroundColor
        : theme.system.fileManagerBackgroundColor,
    }),
    [node.isSelected, node.isFocused]
  );

  if (node.isFocused) {
    log.debug(`FileTreeItem: isFocused ${data.uPath.path}`);
  }

  if (!stat.data) {
    return <div>Loading...</div>;
  }
  return (
    <div
      style={{ ...statusStyle, ...props.style }}
      onClick={handleClick}
      onDoubleClick={(e) => {
        if (clickTimeout.current) {
          clearTimeout(clickTimeout.current);
          clickTimeout.current = undefined;
        }
        handle.moveActivePathTo(data.uPath.path);
        e.stopPropagation();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          handle.moveActivePathTo(data.uPath.path);
          e.stopPropagation();
        }
      }}
    >
      <ContextMenuContext
        menuItems={
          <FileTreeFileItemContextMenu
            stat={stat.data}
            setRenamingMode={(mode: boolean) => {}}
          />
        }
      >
        {stat.data.isDir ? (
          <DirectoryLabel
            stat={stat.data}
            baseName={data.baseName}
            isExpanded={node.isOpen}
          />
        ) : (
          <FileLabel stat={stat.data} baseName={data.baseName} />
        )}
      </ContextMenuContext>
    </div>
  );
}

function updateChildrenNodeOfIndexes(
  tree: FileTreeNode[],
  indexes: number[],
  newChildren: FileTreeNode[]
) {
  let node = tree;
  log.debug(`updateChildrenNodeOfIndexes: indexes: `, indexes);
  for (let i = 0; i < indexes.length - 1; i++) {
    const children = node[indexes[i]].children;
    if (!children) {
      log.error(`Failed to find node of indexes ${indexes}`);
      throw new Error(`Failed to find node of indexes ${indexes}`);
    }
    node = children;
  }
  const lastIndex = indexes[indexes.length - 1];
  node[lastIndex] = {
    ...node[lastIndex],
    children: newChildren,
  };
}

export type FileTreeViewProps = {
  uPath: UniversalPath;
};

export function FileTreeView(props: FileTreeViewProps) {
  const uPath = props.uPath;
  const path = uPath.path;
  const remoteHost = uPath.remoteHost;

  const handle = useFileManagerHandle();

  const treeRef = useRef<TreeApi<FileTreeNode>>(null);
  const loaded = useMemo(() => new Set<string>(), []);
  const [tree, setTree] = useState<FileTreeNode[]>([]);
  const [treeHeight, setTreeHeight] = useState<number | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement>(null);
  useResizeObserver(containerRef, () => {
    if (containerRef.current) {
      setTreeHeight(containerRef.current?.clientHeight);
    }
  });

  const nestedList = api.fileManager.nestedListAsync.useMutation();
  const reloadTree = useCallback(
    async (reloadPath: string, indexes?: number[]) => {
      log.debug(`FileTreeView reloadTree: ${reloadPath}`);
      return nestedList
        .mutateAsync({
          uPath: {
            path: reloadPath,
            remoteHost: remoteHost,
          },
          baseIndexes: indexes,
          loaded,
        })
        .then((result) => {
          if (indexes === undefined) {
            // Replace the whole tree.
            setTree(result);
            return;
          }
          //Replace the specific node.
          updateChildrenNodeOfIndexes(tree, indexes, result);
          setTree(tree);
        })
        .catch((e) => {
          log.error(e);
        });
    },
    [handle, loaded, tree]
  );

  useEffect(() => {
    reloadTree(path);
  }, [path]);

  api.fs.pollChange.useSubscription(uPath, {
    onError: () => {
      log.error(`Failed to pollChange ${path}`);
    },
    onData: () => {
      reloadTree(path);
    },
  });

  const TreeNode = useMemo(
    () => (props: NodeRendererProps<FileTreeNode>) => {
      return (
        <FileTreeItem
          {...props}
          key={`TreeNde-${props.node.id}`}
          onLoad={(loadPath: string, indexes: number[]) => {
            log.debug(`TreeNode onLoad: ${loadPath}`);
            if (!loaded.has(loadPath)) {
              loaded.add(loadPath);
            }
            return reloadTree(loadPath, indexes);
          }}
        />
      );
    },
    [loaded, reloadTree]
  );

  log.debug(`FileTreeView render: ${path}`);

  return (
    <div style={{ height: "100%" }} ref={containerRef}>
      <Tree
        data={tree}
        ref={treeRef}
        width={"100%"}
        height={treeHeight}
        openByDefault={false}
        onSelect={(nodes) => {
          // TODO: Add colors to selected nodes
          handle.selectItems(nodes.map((node) => node.data.uPath.path));
        }}
      >
        {TreeNode}
      </Tree>
    </div>
  );
}
