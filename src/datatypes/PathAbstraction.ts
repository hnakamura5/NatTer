import { z } from "zod";

// TODO: Add "url" to kind
export const PathKindSchema = z.enum(["posix", "win32"]);
export type PathKind = z.infer<typeof PathKindSchema>;
