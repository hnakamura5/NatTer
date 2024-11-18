import { api } from "@/api";
import { Config } from "@/datatypes/Config";
import { Theme, DefaultDarkTheme } from "@/datatypes/Theme";
import { useState, useContext, createContext } from "react";
import {
  ThemeProvider as EmotionThemeProvider,
  useTheme as emotionUseTheme,
} from "@emotion/react";
import { createTheme } from "@mui/material";

const ConfigContext = createContext<Config | undefined>(undefined);

export function useConfig() {
  const config = useContext(ConfigContext);
  if (config === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return config;
}

function ConfigProvider(props: { children: React.ReactNode }) {
  const config = api.config.read.useQuery();
  console.log("ConfigProvider: ", config.data);
  if (!config.data) {
    return <div>Failed to load config</div>;
  }
  return (
    <ConfigContext.Provider value={config.data}>
      {props.children}
    </ConfigContext.Provider>
  );
}

// TODO: ThemeProvider of emotion does not work.
// const ThemeContext = createContext(DefaultDarkTheme);
// export const useTheme = () => {
//   return useContext(ThemeContext);
// };

// function ThemeProvider(props: { children: React.ReactNode }) {
//   const [theme, setTheme] = useState<Theme>(DefaultDarkTheme);
//   return (
//     <ThemeContext.Provider value={theme}>
//       {props.children}
//     </ThemeContext.Provider>
//   );
// }
function themeWithMUI(theme: Theme) {
  const muiTheme = createTheme({
    palette: {
      mode: "dark",
    },
    ...theme,
  });
  return muiTheme;
}

function ThemeProvider(props: { children: React.ReactNode }) {
  const theme = themeWithMUI(DefaultDarkTheme);
  return (
    <EmotionThemeProvider theme={theme}>{props.children}</EmotionThemeProvider>
  );
}
export function useTheme() {
  return emotionUseTheme();
}

export function AppStateProvider(props: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <ThemeProvider>{props.children}</ThemeProvider>
    </ConfigProvider>
  );
}
