import { server } from "@/server/tRPCServer";
import { z } from "zod";
import {
  Config,
  ConfigSchema,
  PartialConfig,
  PartialConfigSchema,
} from "@/datatypes/Config";
import {
  KeybindListSchema,
  parseUserKeybindList,
  UserKeybindListSchema,
  KeybindList,
} from "@/datatypes/Keybind";
import fs from "node:fs/promises";
import { app } from "electron";
import path, { parse } from "node:path";
import JSON5 from "json5";

import { log } from "@/datatypes/Logger";
import {
  ShellSpecificationSchema,
  ShellSpecification,
  parseShellSpec,
} from "@/datatypes/ShellSpecification";
import { LabelsSchema, parseLabels } from "@/datatypes/Labels";
import {
  overrideWithPartialSchema,
  parseConfig,
  parseUserConfig,
} from "./ConfigUtils/parsers";
import { Stats } from "node:fs";
import { BuiltinAndUserConfigManager } from "./ConfigUtils/reader";

// Builtin default config.
const configDir = process.env.DOT_NATTER_PATH || ".natter";
// User configuration to override default config.
const userConfigDir = path.join(app.getPath("home"), ".natter");

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

const configFilePath = path.join(configDir, configFileName);
const keybindFilePath = path.join(configDir, keybindFileName);
const shellSpecDir = path.join(configDir, shellSpecDirName);
const labelsDir = path.join(configDir, labelsDirName);
const themesDir = path.join(configDir, themesDirName);

const userConfigFilePath = path.join(userConfigDir, configFileName);
const userKeybindFilePath = path.join(userConfigDir, keybindFileName);
const userShellSpecDir = path.join(userConfigDir, shellSpecDirName);
const userLabelsDir = path.join(userConfigDir, labelsDirName);
const userThemesDir = path.join(userConfigDir, themesDirName);

export const configManager = new BuiltinAndUserConfigManager<
  Config,
  PartialConfig
>(configFilePath, userConfigFilePath, parseConfig, parseUserConfig);

// Read config. Use this also in server side.
export function readConfig(): Promise<Config> {
  return configManager.readConfig();
}

function writeUserConfig(config: PartialConfig): Promise<boolean> {
  return configManager.writeUserConfig(config);
}

function readKeybind() {
  const keybindRead = fs.readFile(keybindFilePath, "utf-8");
  log.debug("Reading keybind from: ", keybindFilePath);
  return keybindRead.then((keybind) => {
    const parsed = parseUserKeybindList(keybind);
    if (parsed) {
      return parsed;
    }
    throw new Error("Failed to parse keybind");
  });
}

function writeKeybind(keybind: KeybindList) {
  const writeFile = fs.writeFile(
    keybindFilePath,
    JSON.stringify(keybind, null, 2)
  );
  return writeFile
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

export function readShellSpecs() {
  const shellSpecs = fs.readdir(shellSpecDir);
  return shellSpecs.then((specs) => {
    return Promise.all(
      specs.map((spec) => {
        const specPath = path.join(shellSpecDir, spec);
        log.debug("Reading shell spec from: ", specPath);
        const specRead = fs.readFile(specPath, "utf-8");
        return specRead.then((specContent) => {
          const parsed = parseShellSpec(specContent);
          if (parsed) {
            return parsed;
          }
          throw new Error(`Failed to parse shell spec in ${specPath}`);
        });
      })
    );
  });
}

export function writeShellSpec(name: string, spec: ShellSpecification) {
  const specPath = path.join(shellSpecDir, name);
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
  const labelsPath = path.join(labelsDir, `${locale}.json`);
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
  readKeybind: proc.output(UserKeybindListSchema).query(async () => {
    return readKeybind();
  }),
  writeKeybind: proc
    .input(KeybindListSchema)
    .output(z.boolean())
    .mutation(async (opts) => {
      return writeKeybind(opts.input);
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
});
