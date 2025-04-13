import { server } from "@/server/tRPCServer";
import { z } from "zod";
import {
  Config,
  ConfigSchema,
  PartialConfig,
  PartialConfigSchema,
  SessionInteraction,
  SessionInteractionSchema,
  ShellConfig,
  ShellConfigSchema,
} from "@/datatypes/Config";
import {
  KeybindListSchema,
  parseCustomKeybindList,
  CustomKeybindListSchema,
  KeybindList,
  PartialCustomKeybindList,
  CustomKeybindList,
  parseCustomUserKeybindList,
  PartialCustomKeybindListSchema,
} from "@/datatypes/Keybind";
// Import the new AI schemas
import {
  ChatAIConnectionConfig,
  ChatAIConnectionArray,
  ChatAIConnectionConfigSchema,
  parseChatAIConnection,
  parseChatAIConnectionArray,
} from "@/datatypes/AIModelConnectionConfigs"; // Adjust path if needed

import fs from "node:fs/promises";
import path, { parse } from "node:path";
import JSON5 from "json5";

import { log } from "@/datatypes/Logger";
import {
  ShellSpecificationSchema,
  ShellSpecification,
  parseShellSpec,
  PartialShellSpecification,
  parsePartialShellSpec,
} from "@/datatypes/ShellSpecification";
import { LabelsSchema, parseLabels } from "@/datatypes/Labels";
import {
  overrideWithPartialSchema,
  parseConfig,
  parseUserConfig,
} from "./ConfigUtils/parsers";
import { Stats } from "node:fs";
import {
  BuiltinAndUserConfigDirectoryManager,
  BuiltinAndUserConfigManager,
} from "./ConfigUtils/reader";
import { localUserHomeConfigDir } from "./ConfigUtils/paths";

// Builtin default config.
const configDir = () => process.env.BUILTIN_DOT_NATTER_PATH;

// Master configurations.
const configFileName = "config.json";
// Keybind Definitions.
const keybindFileName = "keybind.json";
// Shell Specifications.
const shellSpecDirName = "shellSpecs";
// Labels for each locale.
const labelsDirName = "locale";
// Themes.
const themesDirName = "themes";
// Chat AI configs
const chatAIDirName = "chatAIs";

const configFilePath = () => path.join(configDir(), configFileName);
const keybindFilePath = () => path.join(configDir(), keybindFileName);
const shellSpecDir = () => path.join(configDir(), shellSpecDirName);
const labelsDir = () => path.join(configDir(), labelsDirName);
const themesDir = () => path.join(configDir(), themesDirName);
const chatAIDir = () => path.join(configDir(), chatAIDirName);

const userConfigFilePath = () =>
  path.join(localUserHomeConfigDir(), configFileName);
const userKeybindFilePath = () =>
  path.join(localUserHomeConfigDir(), keybindFileName);
const userShellSpecDir = () =>
  path.join(localUserHomeConfigDir(), shellSpecDirName);
const userLabelsDir = () => path.join(localUserHomeConfigDir(), labelsDirName);
const userThemesDir = () => path.join(localUserHomeConfigDir(), themesDirName);
const userChatAIDir = () => path.join(localUserHomeConfigDir(), chatAIDirName);

let manager: BuiltinAndUserConfigManager<Config, PartialConfig> | undefined =
  undefined;
const configManager = () => {
  if (manager === undefined) {
    manager = new BuiltinAndUserConfigManager<Config, PartialConfig>(
      configFilePath(),
      userConfigFilePath(),
      parseConfig,
      parseUserConfig
    );
  }
  return manager;
};

// Read config. Use this also in accessing to config in server side.
export function readConfig(): Promise<Config> {
  return configManager().readConfigFile();
}
function writeUserConfig(config: PartialConfig): Promise<boolean> {
  return configManager().writeUserConfigFile(config);
}

const keybindManager = () =>
  new BuiltinAndUserConfigManager<CustomKeybindList, PartialCustomKeybindList>(
    keybindFilePath(),
    userKeybindFilePath(),
    parseCustomKeybindList,
    parseCustomUserKeybindList
  );

function readKeybind(): Promise<CustomKeybindList> {
  return keybindManager().readConfigFile();
}
function writeUserKeybind(keybind: PartialCustomKeybindList) {
  return keybindManager().writeUserConfigFile(keybind);
}

const shellSpecManager = () =>
  new BuiltinAndUserConfigDirectoryManager<ShellSpecification>(
    shellSpecDir(),
    userShellSpecDir(),
    parseShellSpec
  );

export function readShellSpecs(): Promise<ShellSpecification[]> {
  return shellSpecManager().readConfigFiles();
}

export function writeShellSpec(name: string, spec: ShellSpecification) {
  const specPath = path.join(shellSpecDir(), name);
  const writeFile = fs.writeFile(specPath, JSON.stringify(spec, null, 2));
  return writeFile
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

export function readLabels(locale: string) {
  const labelsPath = path.join(labelsDir(), `${locale}.json`);
  log.debug("Reading labels from: ", labelsPath);
  const labelsRead = fs.readFile(labelsPath, "utf-8");
  return labelsRead
    .then((labels) => {
      const parsed = parseLabels(labels);
      if (parsed) {
        return parsed;
      }
      log.error("Failed to parse labels");
      throw new Error("Failed to parse labels");
    })
    .catch((e) => {
      log.error(`Failed to read labels from ${labelsPath}`, e);
      throw new Error("Failed to read labels");
    });
}

const chatAIManager = () =>
  new BuiltinAndUserConfigDirectoryManager<ChatAIConnectionConfig[]>(
    chatAIDir(),
    userChatAIDir(),
    parseChatAIConnectionArray
  );
export function readChatAIs(): Promise<ChatAIConnectionConfig[]> {
  return chatAIManager()
    .readConfigFiles()
    .then((configs) => {
      return configs.flat();
    });
}

export async function getShellConfig(name: string): Promise<ShellConfig> {
  const config = await readConfig();
  const shellConfig = config.shells.find((shell) => shell.name === name);
  if (!shellConfig) {
    throw new Error(`Shell ${name} is not defined`);
  }
  return shellConfig;
}

export async function getDefaultShell(): Promise<SessionInteraction> {
  const config = await readConfig();
  const defaultShell = config.defaultShell;
  // Use this as default if no default shell is defined.
  const firstShell = config.shells[0];
  if (!defaultShell) {
    log.debug(
      `Default shell is not defined, using ${firstShell.name} `,
      firstShell
    );
    return {
      interaction: firstShell.interact,
      name: firstShell.name,
    };
  }
  const shellConfig = config.shells.find(
    (shell) => shell.name === defaultShell
  );
  if (shellConfig !== undefined) {
    log.debug(`Default shell is ${defaultShell} `, shellConfig);
    return {
      interaction: shellConfig.interact,
      name: shellConfig.name,
    };
  }
  const chatConfigs = await readChatAIs();
  const chatConfig = chatConfigs.find((chatAI) => chatAI.name === defaultShell);
  if (chatConfig !== undefined) {
    log.debug(`Default shell is ${defaultShell} `, chatConfig);
    return {
      interaction: "chatAI",
      name: chatConfig.name,
    };
  }
  throw new Error(`Default shell ${defaultShell} is not defined`);
}

const proc = server.procedure;
export const configurationRouter = server.router({
  readConfig: proc.output(ConfigSchema).query(async () => {
    return readConfig();
  }),
  writeUserConfig: proc
    .input(PartialConfigSchema)
    .output(z.boolean())
    .mutation(async (opts) => {
      return writeUserConfig(opts.input);
    }),
  readKeybind: proc.output(CustomKeybindListSchema).query(async () => {
    return readKeybind();
  }),
  writeUserKeybind: proc
    .input(PartialCustomKeybindListSchema)
    .output(z.boolean())
    .mutation(async (opts) => {
      return writeUserKeybind(opts.input);
    }),
  readShellSpecs: proc
    .output(z.array(ShellSpecificationSchema))
    .query(async () => {
      return readShellSpecs();
    }),
  writeShellSpec: proc
    .input(z.object({ name: z.string(), spec: ShellSpecificationSchema }))
    .output(z.boolean())
    .mutation(async (opts) => {
      return writeShellSpec(opts.input.name, opts.input.spec);
    }),
  readLabels: proc
    .input(z.object({ locale: z.string() }))
    .output(LabelsSchema)
    .query(async (opts) => {
      return readLabels(opts.input.locale);
    }),
  readChatAIs: proc.output(z.array(z.string())).query(async () => {
    return readChatAIs().then((chatAIs) => {
      return chatAIs.map((chatAI) => chatAI.name);
    });
  }),
  getDefaultShell: proc.output(SessionInteractionSchema).mutation(async () => {
    return getDefaultShell();
  }),
  getShellConfig: proc
    .input(z.string())
    .output(ShellConfigSchema)
    .mutation(async (opts) => {
      return getShellConfig(opts.input);
    }),
});
