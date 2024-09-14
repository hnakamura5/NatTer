import { Theme } from "@emotion/react";

export const DarkTheme: Theme = {
  terminal: {
    font: "Consolas",
    fontSize: "12px",
    colors: {
      primary: "#F5F5F5",
      secondary: "#9E9E9E",
      background: "#616161",
    },
  },
  system: {
    font: "Consolas",
    colors: {
      primary: "##F5F5F5",
      secondary: "#9E9E9E",
      background: "##212121",
    },
  },
};

export const LightTheme: Theme = {
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
