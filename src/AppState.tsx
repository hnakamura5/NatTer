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

import { atom, createStore, Provider as JotaiProvider } from "jotai";
import { InternalClipboardData } from "@/datatypes/InternalClipboardData";

import { log } from "@/datatypes/Logger";
import { Labels } from "./datatypes/Labels";

const ConfigContext = createContext<Config | undefined>(undefined);
export function useConfig() {
  const config = useContext(ConfigContext);
  if (config === undefined) {
    const message = "useConfig must be used within a ConfigProvider";
    log.error(message);
    throw new Error(message);
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
    const message = "useKeybindList must be used within a KeybindListProvider";
    log.error(message);
    throw new Error(message);
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

const LabelsContext = createContext<Labels | undefined>(undefined);

export function useLabels() {
  const labels = useContext(LabelsContext);
  if (labels === undefined) {
    const message = "useLabels must be used within a LabelsProvider";
    log.error(message);
    throw new Error(message);
  }
  return labels;
}

function LabelsProvider(props: { children: React.ReactNode }) {
  const config = useConfig();
  const labels = api.config.readLabels.useQuery(
    {
      locale: config.locale || "English",
    },
    {
      onError: (error) => {
        console.error("Failed to load labels: ", error);
      },
    }
  );
  log.debug("LabelsProvider: ", labels.data);
  if (!labels.data) {
    return <div>Failed to load labels</div>;
  }
  return (
    <LabelsContext.Provider value={labels.data}>
      {props.children}
    </LabelsContext.Provider>
  );
}

// Internal clipboard for renderer.
export const InternalClipboard = atom<InternalClipboardData | undefined>(
  undefined
);

export function AppStateProvider(props: { children: React.ReactNode }) {
  return (
    <ConfigProvider>
      <KeybindListProvider>
        <ThemeProvider>
          <LabelsProvider>
            <JotaiProvider>{props.children}</JotaiProvider>
          </LabelsProvider>
        </ThemeProvider>
      </KeybindListProvider>
    </ConfigProvider>
  );
}
