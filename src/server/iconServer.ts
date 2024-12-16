import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { generateManifest } from "material-icon-theme";
import path from "node:path";

import { log } from "@/datatypes/Logger";

const manifest = generateManifest({
  activeIconPack: "react",
});

// Adding missing extensions.
// TODO: but why?
const fileExtensionsAdditions = new Map([
  ["html", "html"],
  ["js", "javascript"],
  ["ts", "typescript"],
]);

function getIconForFile(name: string) {
  const fromNames = manifest.fileNames?.[name];
  if (fromNames) {
    return fromNames;
  }
  const fromExtensionsWhole = manifest.fileExtensions?.[name];
  if (fromExtensionsWhole) {
    return fromExtensionsWhole;
  }
  const ext = name.split(".").pop();
  if (ext) {
    const fromExtensions = manifest.fileExtensions?.[ext];
    if (fromExtensions) {
      return fromExtensions;
    }
    const fromExtensionsAdditions = fileExtensionsAdditions.get(ext);
    if (fromExtensionsAdditions) {
      return fromExtensionsAdditions;
    }
  }
  return manifest.file || "file";
}

function getIconForFolder(name: string) {
  const fromNames = manifest.folderNames?.[name];
  if (fromNames) {
    return fromNames;
  }
  return manifest.folder || "folder";
}

function getIconOpenFolder(name: string) {
  const fromNames = manifest.folderNamesExpanded?.[name];
  if (fromNames) {
    return fromNames;
  }
  return manifest.folderExpanded || "folder-open";
}

const proc = server.procedure;

export const iconServerRouter = server.router({
  fileIcon: proc
    .input(z.string())
    .output(z.string())
    .query(async (opts) => {
      log.debug(
        `fileIcon = ${
          path.join(
            process.env.MATERIAL_ICON_THEME_PATH,
            getIconForFile(opts.input)
          ) + ".svg"
        }`
      );
      return (
        path.join(
          process.env.MATERIAL_ICON_THEME_PATH,
          getIconForFile(opts.input)
        ) + ".svg"
      );
    }),

  folderIcon: proc
    .input(z.string())
    .output(z.string())
    .query(async (opts) => {
      return (
        path.join(
          process.env.MATERIAL_ICON_THEME_PATH,
          getIconForFolder(opts.input)
        ) + ".svg"
      );
    }),

  openFolderIcon: proc
    .input(z.string())
    .output(z.string())
    .query(async (opts) => {
      return (
        path.join(
          process.env.MATERIAL_ICON_THEME_PATH,
          getIconOpenFolder(opts.input)
        ) + ".svg"
      );
    }),
});
