// TODO: move to electron directory? or expose the module to renderer?
// TODO: These api are possibly impossible depending on environment. (e.g. ssh)
import {
  shell,
  dialog,
  ShortcutDetails as ElectronShortcutDetails,
} from "electron";
import path from "node:path";

import { z } from "zod";
import { server } from "@/server/tRPCServer";

export const ShortcutDetailsSchema = z.object({
  target: z.string(),
  workingDirectory: z.string().optional(),
  args: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  iconIndex: z.number().optional(),
  appUserModelId: z.string().optional(),
  toastActivatorClsid: z.string().optional(),
}) satisfies z.ZodType<ElectronShortcutDetails>;
export type ShortcutDetails = z.infer<typeof ShortcutDetailsSchema>;

const proc = server.procedure;
export const osShellRouter = server.router({
  openPath: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    shell.openPath(input);
  }),
  showItemInFolder: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    shell.showItemInFolder(input);
  }),
  openExternal: proc
    .input(
      z.object({
        url: z.string(),
        options: z.object({
          activate: z.boolean().optional(),
          workingDirectory: z.string().optional(),
          logUsage: z.boolean().optional(),
        }),
      })
    )
    .mutation(async (opts) => {
      const { input } = opts;
      shell.openExternal(input.url, input.options);
    }),
  trashItem: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    shell.trashItem(input);
  }),
  readShortcutLink: proc
    .input(z.string())
    .output(ShortcutDetailsSchema)
    .query(async (opts) => {
      const { input } = opts;
      return shell.readShortcutLink(input);
    }),
  writeShortcutLink: proc
    .input(
      z.object({
        shortcutPath: z.string(),
        operation: z.union([
          z.literal("create"),
          z.literal("update"),
          z.literal("replace"),
        ]),
        options: ShortcutDetailsSchema,
      })
    )
    .output(z.boolean())
    .mutation(async (opts) => {
      const { input } = opts;
      return shell.writeShortcutLink(
        input.shortcutPath,
        input.operation,
        input.options
      );
    }),
    // TODO: showOpenDialog: proc
});
