import { z } from "zod";

const InternalClipboard = z.enum(["FileCopy", "FileCut"]);
export type InternalClipboardType = z.infer<typeof InternalClipboard>;

export type InternalClipboardData = {
  clipType: InternalClipboardType;
  args: string[];
};
