import { test, _electron as electron, expect } from "@playwright/test";
import { generateManifest } from "material-icon-theme";

// ./node_modules/material-icon-theme/icons/*.svg

const manifest = generateManifest({
  activeIconPack: "react",
});

test("Icon exists", async () => {
  expect(manifest).not.toBeNull();
  expect(manifest.file === "file").toBeTruthy();
  expect(manifest.folder === "folder").toBeTruthy();
  expect(manifest.folderExpanded === "folder-open").toBeTruthy();

  expect(manifest.fileNames).not.toBeNull();
  // Pick a random file name
  expect(manifest.fileNames?.["package.json"] === "nodejs").toBeTruthy();

  for (const key in manifest.fileNames) {
    // console.log(`fileNames[${key}]: ${manifest.fileNames[key]}`);
  }
  for (const key in manifest.fileExtensions) {
    console.log(`fileExtensions[${key}]: ${manifest.fileExtensions[key]}`);
  }
  for (const key in manifest.folderNames) {
    //console.log(`folderNames[${key}]: ${manifest.folderNames[key]}`);
  }
  for (const key in manifest.folderNamesExpanded) {
    // console.log(
    //   `folderNamesExpanded[${key}]: ${manifest.folderNamesExpanded[key]}`
    // );
  }
});
