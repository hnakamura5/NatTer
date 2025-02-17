import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { Config, ConfigSchema } from "@/datatypes/Config";
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

export const tempDir = path.join(app.getPath("temp"), ".natter");
export const commandTempDir = path.join(tempDir, "Command");
export const lspTempDir = path.join(tempDir, "LSPTempBuffer");

const pathVariables: Map<string, string> = new Map();
pathVariables.set("${APPROOT}", app.getPath("exe"));
pathVariables.set("${HOME}", app.getPath("home"));
pathVariables.set("${APPDATA}", app.getPath("appData"));
pathVariables.set("${TEMP}", tempDir);
pathVariables.set("${LSPTEMP}", lspTempDir);

export function configPathAssignVariables(path: string): string {
  for (const [key, value] of pathVariables) {
    path = path.replace(key, value);
  }
  return path;
}

function configPathAssignVariablesOptional(
  path: string | undefined
): string | undefined {
  if (path) {
    return configPathAssignVariables(path);
  } else {
    return undefined;
  }
}

function pathToURI(pathStr: string): string {
  const url = new URL(`file:///${pathStr}`);
  return url.toString();
}

function pathToURIOptional(pathStr: string | undefined): string | undefined {
  if (pathStr) {
    return pathToURI(pathStr);
  } else {
    return undefined;
  }
}

export function parseConfig(json: string): Config | undefined {
  try {
    const parsed = ConfigSchema.parse(JSON5.parse(json));
    // Assign path variables.
    return {
      ...parsed,
      shells: parsed.shells.map((s) => ({
        ...s,
        executable: configPathAssignVariables(s.executable),
        args: s.args?.map((a) => configPathAssignVariables(a)),
        languageServer: s.languageServer
          ? {
              ...s.languageServer,
              executable: configPathAssignVariables(
                s.languageServer.executable
              ),
              args: s.languageServer.args?.map((a) =>
                configPathAssignVariables(a)
              ),
            }
          : undefined,
      })),
      tempDir: configPathAssignVariablesOptional(parsed.tempDir) || tempDir,
      commandTempDir:
        configPathAssignVariablesOptional(parsed.commandTempDir) ||
        commandTempDir,
      lspTempDir:
        configPathAssignVariablesOptional(parsed.lspTempDir) || lspTempDir,
    };
  } catch (e) {
    console.error("Failed to parse config: ", e);
    return undefined;
  }
}

const configFilePath = path.join(app.getPath("home"), ".natter", "config.json");
const keybindFilePath = path.join(
  app.getPath("home"),
  ".natter",
  "keybind.json"
);
const shellSpecDir = path.join(app.getPath("home"), ".natter", "shellSpecs");
const labelsDir = path.join(app.getPath("home"), ".natter", "locale");

let parsedConfig: Config | undefined;
let configReadTime: number | undefined;

// Read config. Use this also in server side.
export function readConfig() {
  return fs.stat(configFilePath).then((stats) => {
    const lastUpdateTime = stats.mtime.getTime();
    if (lastUpdateTime === configReadTime && parsedConfig) {
      return parsedConfig;
    }
    const configRead = fs.readFile(configFilePath, "utf-8");
    log.debug("Reading config from: ", configFilePath);
    return configRead.then((config) => {
      const parsed = parseConfig(config);
      parsedConfig = parsed;
      configReadTime = lastUpdateTime;
      if (parsed) {
        return parsed;
      }
      throw new Error("Failed to parse config");
    });
  });
}

function writeConfig(config: Config) {
  const writeFile = fs.writeFile(
    configFilePath,
    JSON.stringify(config, null, 2)
  );
  return writeFile
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
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
  writeConfig: proc
    .input(ConfigSchema)
    .output(z.boolean())
    .mutation(async (opts) => {
      return writeConfig(opts.input);
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
