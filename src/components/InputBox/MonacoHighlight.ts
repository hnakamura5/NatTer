import { createHighlighter } from "shiki";

export const highlighter = await createHighlighter({
  themes: [
    "vitesse-black",
    "vitesse-light",
    "material-theme-darker",
    "material-theme-lighter",
    "dark-plus",
    "light-plus",
  ],
  langs: [
    "javascript",
    "typescript",
    "shellscript",
    "powershell",
    "bash",
    "python",
  ],
})
