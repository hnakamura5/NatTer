import { createTheme } from "@uiw/codemirror-themes";
import { tags as t } from "@lezer/highlight";
import { Theme } from "@/datatypes/Theme";

export function codeMirrorTheme(theme: Theme) {
  return createTheme({
    theme: "light",
    settings: {
      fontFamily: theme.shell.font,
      fontSize: theme.shell.fontSize,
      background: theme.shell.secondaryBackgroundColor,
      backgroundImage: "",
      foreground: theme.shell.textColor,
      caret: theme.shell.textColor,
      selection: "#036dd626",
      selectionMatch: "#036dd626",
      lineHighlight: theme.shell.backgroundColor,
      gutterBackground: theme.shell.backgroundColor,
      gutterForeground: theme.shell.textColor,
    },
    styles: [
      { tag: t.comment, color: "#787b8099" },
      { tag: t.variableName, color: "#0080ff" },
      { tag: [t.string, t.special(t.brace)], color: "#5c6166" },
      { tag: t.number, color: "#5c6166" },
      { tag: t.bool, color: "#5c6166" },
      { tag: t.null, color: "#5c6166" },
      { tag: t.keyword, color: "#5c6166" },
      { tag: t.operator, color: "#5c6166" },
      { tag: t.className, color: "#5c6166" },
      { tag: t.definition(t.typeName), color: "#5c6166" },
      { tag: t.typeName, color: "#5c6166" },
      { tag: t.angleBracket, color: "#5c6166" },
      { tag: t.tagName, color: "#5c6166" },
      { tag: t.attributeName, color: "#5c6166" },
    ],
  });
}
