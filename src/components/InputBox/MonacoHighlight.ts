import { createHighlighter } from "shiki";

export const highlighter = await createHighlighter({
  themes: ["vitesse-black", "vitesse-light"],
  langs: [
    "javascript",
    "typescript",
    "shellscript",
    "powershell",
    "bash",
    "python",
  ],
});
