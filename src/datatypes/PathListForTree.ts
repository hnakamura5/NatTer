import { z } from "zod";
import { FileStatScheme, UniversalPathScheme } from "@/datatypes/UniversalPath";
import { RemoteHostSchema } from "@/datatypes/SshConfig";

export const FlattenPathNodeScheme = z
  .object({
    path: z.string(),
    expanded: z.boolean(),
    numExpandedChildren: z.number().int(),
    numExpandedDirectChildren: z.number().int(),
    depth: z.number().int(),
    parent: z.string().optional(),
  })
  .merge(UniversalPathScheme);
export type FlattenPathNode = z.infer<typeof FlattenPathNodeScheme>;

export const FlattenPathListScheme = z.object({
  nodes: z.array(FlattenPathNodeScheme),
  remoteHost: RemoteHostSchema.optional(),
});
export type FlattenPathList = z.infer<typeof FlattenPathListScheme>;

// https://zod.dev/?id=recursive-types
const FileTreeNodeBaseScheme = z.object({
  id: z.string(),
  uPath: UniversalPathScheme,
  baseName: z.string(),
  loaded: z.boolean(),
  indexes: z.array(z.number()), // Indicates the position in the list
});

// Recursive tree definition
export type FileTreeNode = z.infer<typeof FileTreeNodeBaseScheme> & {
  children?: FileTreeNode[];
};
export const FileTreeNodeScheme: z.ZodType<FileTreeNode> =
  FileTreeNodeBaseScheme.extend({
    children: z.lazy(() => z.array(FileTreeNodeScheme).optional()),
  });
