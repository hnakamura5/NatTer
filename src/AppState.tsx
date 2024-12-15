import { api } from "@/api";
import { Config } from "@/datatypes/Config";
import { Theme, DefaultDarkTheme } from "@/datatypes/Theme";
import {
  useState,
  useContext,
  createContext,
  RefCallback,
  RefObject,
  MutableRefObject,
} from "react";
import {
  ThemeProvider as EmotionThemeProvider,
  useTheme as emotionUseTheme,
} from "@emotion/react";
import { createTheme } from "@mui/material";
import {
  KeybindListMap,
  addFixedKeybinds,
  keyOfCommand,
  keybindListMap,
} from "@/datatypes/Keybind";
import { HotkeyCallback, useHotkeys } from "react-hotkeys-hook";
import { OptionsOrDependencyArray } from "react-hotkeys-hook/dist/types";
import { KeybindCommands } from "@/datatypes/KeybindCommands";

import { log } from "@/datatypes/Logger";

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
  log.debug("ConfigProvider: ", config.data);
  if (!config.data) {
    return <div>Failed to load config</div>;
  }
  return (
    <ConfigContext.Provider value={config.data}>
      {props.children}
    </ConfigContext.Provider>
  );
}

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

const KeybindContext = createContext<KeybindListMap | undefined>(undefined);

export function useKeybindList() {
  const keybind = useContext(KeybindContext);
  if (keybind === undefined) {
    throw new Error("useKeybind must be used within a KeybindListProvider");
  }
  return keybind;
}

function KeybindListProvider(props: { children: React.ReactNode }) {
  const keybind = api.config.readKeybind.useQuery(undefined, {
    onError: (error) => {
      console.error("Failed to load keybind: ", error);
    },
  });
  log.debug("KeybindListProvider: ", keybind.data);
  if (!keybind.data) {
    return <div>Failed to load keybind</div>;
  }
  const map = keybindListMap(addFixedKeybinds(keybind.data));
  return (
    <KeybindContext.Provider value={map}>
      {props.children}
    </KeybindContext.Provider>
  );
}

export function AppStateProvider(props: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <KeybindListProvider>
        <ThemeProvider>{props.children}</ThemeProvider>
      </KeybindListProvider>
    </ConfigProvider>
  );
}
