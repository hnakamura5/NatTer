import { z } from "zod";
import { UniversalPathScheme } from "@/datatypes/UniversalPath";
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
