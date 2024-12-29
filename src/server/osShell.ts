// TODO: move to electron directory? or expose the module to renderer?
// TODO: These api are possibly impossible depending on environment. (e.g. ssh)
import {
  shell,
  dialog,
  clipboard,
  ShortcutDetails as ElectronShortcutDetails,
  OpenDialogReturnValue as ElectronOpenDialogReturnValue,
  OpenDialogOptions as ElectronOpenDialogOptions,
  SaveDialogReturnValue as ElectronSaveDialogReturnValue,
  SaveDialogOptions as ElectronSaveDialogOptions,
} from "electron";
import path from "node:path";

import { boolean, z } from "zod";
import { server } from "@/server/tRPCServer";
import { read } from "node:fs";

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

// Dialog schemas. Limited from the original options.
export const OpenDialogOptionsSchema = z.object({
  title: z.string().optional(),
  defaultPath: z.string().optional(),
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      })
    )
    .optional(),
  openFileOrDirectory: z
    .union([z.literal("file"), z.literal("directory"), z.literal("both")])
    .optional(),
  multiSelections: z.boolean().optional(),
});
export type OpenDialogOptions = z.infer<typeof OpenDialogOptionsSchema>;

export const OpenDialogReturnValueSchema = z.object({
  filePaths: z.array(z.string()),
  canceled: z.boolean(),
});
export type OpenDialogReturnValue = z.infer<typeof OpenDialogReturnValueSchema>;

export const SaveDialogOptionsSchema = z.object({
  title: z.string().optional(),
  defaultPath: z.string().optional(),
  filters: z
    .array(
      z.object({
        name: z.string(),
        extensions: z.array(z.string()),
      })
    )
    .optional(),
});
export type SaveDialogOptions = z.infer<typeof SaveDialogOptionsSchema>;

export const SaveDialogReturnValueSchema = z.object({
  filePath: z.string(),
  canceled: z.boolean(),
});
export type SaveDialogReturnValue = z.infer<typeof SaveDialogReturnValueSchema>;

const proc = server.procedure;
// Provides shell and dialog functionalities.
export const osShellRouter = server.router({
  // Open the file in the default app.
  openPath: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    shell.openPath(input);
  }),
  // Show the file in file manager.
  showItemInFolder: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    shell.showItemInFolder(input);
  }),
  // Open the external URL in the default browser app.
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
  // Send the file to the trash.
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

  // Show the open dialog.
  showOpenDialog: proc
    .input(OpenDialogOptionsSchema)
    .output(OpenDialogReturnValueSchema)
    .query(async (opts) => {
      const { input } = opts;
      return showOpenDialog(input);
    }),
  // Show the save dialog.
  showSaveDialog: proc
    .input(SaveDialogOptionsSchema)
    .output(SaveDialogReturnValueSchema)
    .query(async (opts) => {
      const { input } = opts;
      return showSaveDialog(input);
    }),
    // Clipboard functionalities.
  writeClipboard: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    await clipboard.writeText(input);
  }),
  readClipboard: proc
    .input(z.boolean().optional())
    .output(z.string())
    .mutation(async (opts) => {
      const clear = opts.input;
      const result = clipboard.readText();
      if (clear) {
        clipboard.clear();
      }
      return result;
    }),
});

// Safe version of osShellRouter.
// Contains only the method that has the confirmation dialog to the user.
// Gives only synchronous versions to avoid the dialog attack from the process.
const safetyTime = 2000;
export const safeOsShellRouter = server.router({
  showItemInFolder: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    // To prevent opening the file manager too many times.
    await new Promise((_) => {
      setTimeout(_, safetyTime);
    });
    shell.showItemInFolder(input);
  }),
  openExternal: proc.input(z.string()).mutation(async (opts) => {
    const { input } = opts;
    // To prevent opening the external URL too many times.
    await new Promise((_) => {
      setTimeout(_, safetyTime);
    });
    await shell.openExternal(input);
  }),
  showOpenDialogSync: proc
    .input(OpenDialogOptionsSchema)
    .output(OpenDialogReturnValueSchema)
    .query(async (opts) => {
      const { input } = opts;
      return await showOpenDialog(input).then(async (result) => {
        return {
          filePaths: result.filePaths,
          canceled: result.canceled,
        };
      });
    }),
  showSaveDialogSync: proc
    .input(SaveDialogOptionsSchema)
    .output(SaveDialogReturnValueSchema)
    .query(async (opts) => {
      const { input } = opts;
      return showSaveDialog(input).then(async (result) => {
        return {
          filePath: result.filePath,
          canceled: result.canceled,
        };
      });
    }),
});

async function showOpenDialog(
  input: OpenDialogOptions
): Promise<OpenDialogReturnValue> {
  const props: ElectronOpenDialogOptions["properties"] = [
    "showHiddenFiles",
    "createDirectory",
  ];
  if (input.openFileOrDirectory === "file" || !input.openFileOrDirectory) {
    props.push("openFile");
  } else if (input.openFileOrDirectory === "directory") {
    props.push("openDirectory");
  } else if (input.openFileOrDirectory === "both") {
    props.push("openFile", "openDirectory");
  }
  if (input.multiSelections) {
    props.push("multiSelections");
  }
  return dialog
    .showOpenDialog({
      title: input.title,
      defaultPath: input.defaultPath,
      filters: input.filters,
      properties: props,
    })
    .then((result) => {
      return {
        filePaths: result.filePaths,
        canceled: result.canceled,
      };
    });
}

async function showSaveDialog(
  input: SaveDialogOptions
): Promise<SaveDialogReturnValue> {
  const props: ElectronSaveDialogOptions["properties"] = [
    "showHiddenFiles",
    "createDirectory",
    "showOverwriteConfirmation",
  ];
  return dialog
    .showSaveDialog({
      title: input.title,
      defaultPath: input.defaultPath,
      filters: input.filters,
      properties: props,
    })
    .then((result) => {
      return {
        filePath: result.filePath,
        canceled: result.canceled,
      };
    });
}
