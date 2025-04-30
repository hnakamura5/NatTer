import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { UniversalPathScheme, UniversalPath } from "@/datatypes/UniversalPath";
import { pathOf, univPath } from "@/server/FileSystem/univPath";

import { univFs } from "./FileSystem/univFs";
import {
  FlattenPathListScheme,
  FlattenPathNode,
  NestedFileTreeNode,
  NestedFileTreeNodeScheme,
} from "@/datatypes/PathListForTree";

async function flattenList(
  path: UniversalPath,
  expanded: Set<string>,
  depth: number,
  parent?: FlattenPathNode
): Promise<FlattenPathNode[]> {
  const result: FlattenPathNode[] = [];
  const ls = await univFs.list(path);
  if (parent) {
    parent.numExpandedDirectChildren = ls.length;
  }
  for (const f of ls) {
    const fIsExpanded = expanded.has(f);
    const node: FlattenPathNode = {
      path: f,
      expanded: fIsExpanded,
      numExpandedChildren: 0,
      numExpandedDirectChildren: 0,
      depth: depth,
      parent: parent?.path,
    };
    result.push(node);
    if (fIsExpanded) {
      const childPath = univPath.join(path, f);
      const childExpanded = await flattenList(
        childPath,
        expanded,
        depth + 1,
        node
      );
      for (const child of childExpanded) {
        child.parent = f;
        result.push(child);
      }
      node.numExpandedChildren = childExpanded.length;
    }
  }
  return result;
}

async function nestedList(
  path: UniversalPath,
  baseIndexes: number[],
  expanded: Set<string>
): Promise<NestedFileTreeNode[]> {
  const result: NestedFileTreeNode[] = [];
  const list = await univFs.list(path);
  for (let i = 0; i < list.length; i++) {
    const f = list[i];
    const fIsExpanded = expanded.has(f);
    const childPath = univPath.join(path, f);
    const childIndexes = [...baseIndexes, i];
    const fNode: NestedFileTreeNode = {
      id: childPath.path,
      uPath: childPath,
      baseName: f,
      loaded: fIsExpanded,
      indexes: childIndexes,
    };
    result.push(fNode);
    if (fIsExpanded) {
      const childExpanded = await nestedList(childPath, childIndexes, expanded);
      fNode.children = childExpanded;
    }
  }
  return result;
}

const proc = server.procedure;

export const fileManagerRouter = server.router({
  flattenList: proc
    .input(
      z.object({
        path: UniversalPathScheme,
        loaded: z.array(z.string()).optional(),
      })
    )
    .output(FlattenPathListScheme)
    .query(async (opts) => {
      const { path, loaded } = opts.input;
      const expanded = new Set(loaded);
      return {
        nodes: await flattenList(path, expanded, 0),
        remoteHost: path.remoteHost,
      };
    }),

  nestedListAsync: proc
    .input(
      z.object({
        uPath: UniversalPathScheme,
        baseIndexes: z.array(z.number()).optional(), // For partial update
        loaded: z.set(z.string()).optional(),
      })
    )
    .output(z.array(NestedFileTreeNodeScheme))
    .mutation(async (opts) => {
      const { uPath, baseIndexes, loaded } = opts.input;
      const expanded = new Set(loaded);
      return nestedList(uPath, baseIndexes || [], expanded);
    }),
});
