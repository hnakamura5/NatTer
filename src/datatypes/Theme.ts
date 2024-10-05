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
  },
  system: {
    // font: "Consolas",
    font: "PlemolJP Console NF",
    colors: {
      primary: "#F5F5F5",
      secondary: "#9E9E9E",
      background:  "#060606",
      secondaryBackground: "#212121",
    },
  },
};

// TODO: ThemeProvider of emotion does not work.
export const ThemeContext = createContext(DefaultDarkTheme);
export const useTheme = () => {
  return useContext(ThemeContext);
};
