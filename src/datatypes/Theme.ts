import { Theme } from "@emotion/react";
import { createContext, useContext } from "react";

export const DefaultDarkTheme: Theme = {
  terminal: {
    font: "Consolas",
    fontSize: "12px",
    colors: {
      primary: "#EEEEEE",
      secondary: "#9E9E9E",
      background: "#616161",
    },
  },
  system: {
    font: "Consolas",
    colors: {
      primary: "#F5F5F5",
      secondary: "#9E9E9E",
      background: "##212121",
    },
  },
};

export const DefaultLightTheme: Theme = {
  terminal: {
    font: "Consolas",
    fontSize: "16px",
    colors: {
      primary: "#00FF00",
      secondary: "#FF0000",
      background: "#FFFFFF",
    },
  },
  system: {
    font: "Consolas",
    colors: {
      primary: "#00FF00",
      secondary: "#FF0000",
      background: "#FFFFFF",
    },
  },
};

// TODO: ThemeProvider of emotion does not work.
export const ThemeContext = createContext(DefaultDarkTheme);
export const useTheme = () => {
  return useContext(ThemeContext);
};
