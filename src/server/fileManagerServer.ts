import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { UniversalPathScheme, UniversalPath } from "@/datatypes/UniversalPath";
import { pathOf, univPath } from "@/server/FileSystem/univPath";

import { univFs } from "./FileSystem/univFs";
import {
  FlattenPathListScheme,
  FlattenPathNode,
} from "@/datatypes/FlattenPath";

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

const proc = server.procedure;

export const fileManagerRouter = server.router({
  flattenList: proc
    .input(
      z.object({
        path: UniversalPathScheme,
        expandedPath: z.array(z.string()).optional(),
      })
    )
    .output(FlattenPathListScheme)
    .query(async (opts) => {
      const { path, expandedPath } = opts.input;
      const expanded = new Set(expandedPath);
      return {
        nodes: await flattenList(path, expanded, 0),
        remoteHost: path.remoteHost,
      };
    }),
});
