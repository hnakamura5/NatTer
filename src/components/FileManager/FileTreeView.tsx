import { NodeRendererProps, Tree, TreeApi } from "react-arborist";
import { useFileManagerHandle } from "./FileManagerHandle";

import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import {
  KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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

import { DefaultContainer } from "react-arborist/dist/module/components/default-container";

const TreeWrapperDiv = styled.div(({ theme }) => ({
  height: "100%",
}));

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
  }, [univPathToString(uPath)]);
  api.fs.pollChange.useSubscription(uPath, {
    onData: () => {
      reloadTree(path);
    },
    onError: (e) => {
      log.error(`Failed to pollChange ${path} `, e);
    },
  });

  const statAsync = api.fs.statAsync.useMutation();

  // Keybinds
  const keybindRef = useKeybindOfCommandScopeRef();
  useKeybindOfCommand(
    "RenameFile",
    () => {
      const treeAPI = treeRef.current;
      if (treeAPI) {
        if (treeAPI.focusedNode) {
          log.debug(
            `FileTreeItem: rename ${treeAPI.focusedNode.data.uPath.path}`
          );
          treeAPI.edit(treeAPI.focusedNode);
        }
      }
    },
    keybindRef
  );
  useKeybindOfCommand(
    "SelectAll",
    () => treeRef.current?.selectAll(),
    keybindRef
  );
  useKeybindOfCommand(
    "Enter",
    () => {
      const treeAPI = treeRef.current;
      if (treeAPI) {
        if (treeAPI.focusedNode) {
          const uPath = treeAPI.focusedNode.data.uPath;
          statAsync.mutateAsync(uPath).then((stat) => {
            if (stat.isDir) {
              handle.moveActivePathTo(uPath.path);
            } else {
              handle.openFile(uPath.path);
            }
          });
        }
      }
    },
    keybindRef
  );
  useKeybindOfCommand("Backspace", () => handle.navigateBack(), keybindRef);

  // Modify forcefully the default behavior of the tree.
  // Note this modifies AFTER the default behavior of the tree is completed.
  // react-arborist does not support configuring the default behavior.
  const handleKeybindings = useCallback((e: KeyboardEvent) => {
    const treeAPI = treeRef.current;
    if (!treeAPI) {
      return;
    }
    // This is defined as default behavior for meta+a.
    if (e.ctrlKey && e.key == "a") {
      treeAPI.selectAll();
      e.stopPropagation();
      e.preventDefault();
      return;
    }
    const up = e.key === "ArrowUp";
    if (!up && e.key !== "ArrowDown") {
      return;
    }
    // This is node after focus move is completed.
    const focusedNode = treeAPI.focusedNode;
    if (!focusedNode) {
      return;
    }
    const beforeFocusedNode = up ? focusedNode.next : focusedNode.prev;
    if (e.shiftKey && beforeFocusedNode) {
      treeAPI.selectMulti(beforeFocusedNode);
      treeAPI.deselect(focusedNode); // TODO: Is this desired behavior?
      treeAPI.focus(focusedNode);
      e.stopPropagation();
      return;
    }
  }, []);

  // Each file item.
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
          onRightClick={(node) => {
            log.debug(`TreeNode onRightClick: ${node.data.uPath.path}`);
            // TODO: Cannot focus the node when context menu is focused.
            if (!node.isSelected) {
              node.select();
            }
          }}
          treeRef={treeRef}
        />
      );
    },
    [loaded, reloadTree]
  );

  log.debug(`FileTreeView render: ${path}`);

  return (
    <KeybindScope keybindRef={keybindRef} id={"FileTreeView"}>
      <TreeWrapperDiv ref={containerRef} onKeyDown={handleKeybindings}>
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
      </TreeWrapperDiv>
    </KeybindScope>
  );
}
