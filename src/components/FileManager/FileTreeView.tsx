import { NodeApi, NodeRendererProps, Tree, TreeApi } from "react-arborist";
import { useFileManagerHandle } from "./FileManagerHandle";

import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { UniversalPath, univPathToString } from "@/datatypes/UniversalPath";
import styled from "@emotion/styled";
import { FileTreeNode } from "@/datatypes/PathListForTree";
import { eventStabilizer, useResizeObserver } from "../Utils";
import { useTheme } from "@/AppState";
import { FileTreeItem } from "./FileTreeItem";
import {
  KeybindScope,
  useKeybindOfCommand,
  useKeybindOfCommandScopeRef,
} from "../KeybindScope";

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
          handle.selectItems(nodes.map((node) => node.data.uPath.path));
        }}
      >
        {TreeNode}
      </Tree>
    </div>
  );
}
