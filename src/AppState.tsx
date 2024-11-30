import { api } from "@/api";
import { Config } from "@/datatypes/Config";
import { Theme, DefaultDarkTheme } from "@/datatypes/Theme";
import { useState, useContext, createContext } from "react";
import {
  ThemeProvider as EmotionThemeProvider,
  useTheme as emotionUseTheme,
} from "@emotion/react";
import { createTheme } from "@mui/material";
import { KeybindList, keyOfCommand } from "@/datatypes/KeyBind";
import { HotkeyCallback, useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import { KeybindCommands } from "./datatypes/KeybindCommands";

const ConfigContext = createContext<Config | undefined>(undefined);

export function useConfig() {
  const config = useContext(ConfigContext);
  if (config === undefined) {
    throw new Error("useConfig must be used within a ConfigProvider");
  }
  return config;
}

function ConfigProvider(props: { children: React.ReactNode }) {
  const config = api.config.readConfig.useQuery(undefined, {
    onError: (error) => {
      console.error("Failed to load config: ", error);
    },
  });
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

const KeybindContext = createContext<KeybindList | undefined>(undefined);

function useKeybinds() {
  const keybind = useContext(KeybindContext);
  if (keybind === undefined) {
    throw new Error("useKeybind must be used within a KeybindProvider");
  }
  return keybind;
}

export function useKeybindOfCommand(
  command: KeybindCommands,
  callback: HotkeyCallback,
  options?: OptionsOrDependencyArray
) {
  const keybinds = useKeybinds();
  const key = keyOfCommand(keybinds, command);
  // TODO: if options has enabled?
  console.log(
    `useKeybindOfCommand: name:${command}  key: ${key?.key} command:${key?.command}`
  );
  useHotkeys(key?.key || "", callback, {
    enabled: key !== undefined,
    ...options,
  });
}

export function KeybindProvider(props: { children: React.ReactNode }) {
  const keybind = api.config.readKeybind.useQuery(undefined, {
    onError: (error) => {
      console.error("Failed to load keybind: ", error);
    },
  });
  console.log("KeybindProvider: ", keybind.data);
  if (!keybind.data) {
    return <div>Failed to load keybind</div>;
  }
  return (
    <KeybindContext.Provider value={keybind.data}>
      {props.children}
    </KeybindContext.Provider>
  );
}

export function AppStateProvider(props: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <KeybindProvider>
        <ThemeProvider>{props.children}</ThemeProvider>
      </KeybindProvider>
    </ConfigProvider>
  );
}
