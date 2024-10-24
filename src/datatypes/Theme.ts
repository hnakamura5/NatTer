import { Theme } from "@emotion/react";
import { createContext, useContext } from "react";

export const DefaultDarkTheme: Theme = {
  terminal: {
    // font: "Consolas",
    font: "PlemolJP Console NF",
    fontSize: "12px",
    colors: {
      primary: "#EEEEEE",
      secondary: "#9E9E9E",
      background: "#212121",
      secondaryBackground: "#060606",
    },
    infoColor: "#3F51B5",
    stdoutColor: "#4CAF50",
    stderrColor: "#F44336",
    currentDirColor: "#FF9800",
    userColor: "#8BC34A",
  },
  system: {
    // font: "Consolas",
    font: "PlemolJP Console NF",
    fontSize: "12px",
    colors: {
      primary: "#F5F5F5",
      secondary: "#9E9E9E",
      background:  "#060606",
      secondaryBackground: "#212121",
    },
    focusedFrameColor: "#2196F3"
  },
};

// TODO: ThemeProvider of emotion does not work.
export const ThemeContext = createContext(DefaultDarkTheme);
export const useTheme = () => {
  return useContext(ThemeContext);
};
