import { Theme } from "@/datatypes/Theme";
import * as monaco from "monaco-editor";

export function setMonacoInputTheme(theme: Theme, name: string) {

  monaco.editor.defineTheme(name, {
    base: "vs-dark",
    colors: {
      "editor.background": theme.shell.secondaryBackgroundColor,
      "editor.selectionHighlight": theme.shell.secondaryBackgroundColor,
    },
    inherit: true,
    rules: [],
  });
}
