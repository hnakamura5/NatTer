import { z } from "zod";

const ThemeSchema = z.object({
  shell: z.object({
    font: z.string(),
    fontSize: z.string(),
    textColor: z.string(),
    thinTextColor: z.string(),
    backgroundColor: z.string(),
    secondaryBackgroundColor: z.string(),
    useCommandColor: z.string(),
    stdoutColor: z.string(),
    stderrColor: z.string(),
    directoryColor: z.string(),
    userColor: z.string(),
    timeColor: z.string(),
    runButtonColor: z.string(),
    runBackgroundButtonColor: z.string(),
    stopButtonColor: z.string(),
    pauseButtonColor: z.string(),
    resumeButtonColor: z.string(),
  }),
  system: z.object({
    font: z.string(),
    fontSize: z.string(),
    textColor: z.string(),
    defaultIconColor: z.string(),
    backgroundColor: z.string(),
    secondaryBackgroundColor: z.string(),
    focusedFrameColor: z.string(),
    hoverMenuWidth: z.string(),
    hoverMenuIconSize: z.string(),
    bookmarkColor: z.string(),
    tagColor: z.string(),
    infoColor: z.string(),
    settingsColor: z.string(),
    loadingBaseColor: z.string(),
    loadingHighlightColor: z.string(),
    tooltipColor: z.string(),
    tooltipBackgroundColor: z.string(),
    contextMenuWidth: z.string(),
    contextNestedMenuWidth: z.string(),
    contextMenuColor: z.string(),
    contextMenuBackgroundColor: z.string(),
  }),
});

export type Theme = z.infer<typeof ThemeSchema>;

export const DefaultDarkTheme: Theme = {
  shell: {
    // font: "Consolas",
    font: "PlemolJP Console NF",
    fontSize: "12px",
    textColor: "#EEEEEE",
    thinTextColor: "#9E9E9E",
    backgroundColor: "#212121",
    secondaryBackgroundColor: "#060606",
    useCommandColor: "#3F51B5",
    stdoutColor: "#4CAF50",
    stderrColor: "#F44336",
    directoryColor: "#FF9800",
    userColor: "#8BC34A",
    timeColor: "#7986CB",
    runButtonColor: "#81C784",
    runBackgroundButtonColor: "#4DB6AC",
    stopButtonColor: "#E57373",
    pauseButtonColor: "#64B5F6",
    resumeButtonColor: "#64B5F6",
  },
  system: {
    // font: "Consolas",
    font: "PlemolJP Console NF",
    fontSize: "12px",
    textColor: "#F5F5F5",
    defaultIconColor: "#9E9E9E",
    backgroundColor: "#060606",
    secondaryBackgroundColor: "#212121",
    focusedFrameColor: "#2196F3",
    hoverMenuWidth: "30px",
    hoverMenuIconSize: "20px",
    bookmarkColor: "#DCE775",
    tagColor: "#E57373",
    infoColor: "#64B5F6",
    settingsColor: "#A1887F",
    loadingBaseColor: "#9E9E9E",
    loadingHighlightColor: "#E0E0E0",
    tooltipColor: "#F5F5F5",
    tooltipBackgroundColor: "#060606",
    contextMenuWidth: "250px",
    contextNestedMenuWidth: "200px",
    contextMenuColor: "#F5F5F5",
    contextMenuBackgroundColor: "#131313",
  },
};
