import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { Config, ConfigSchema, parseConfig } from "@/datatypes/Config";
import {
  KeybindListSchema,
  parseUserKeybindList,
  UserKeybindListSchema,
  KeybindList,
} from "@/datatypes/Keybind";
import fs from "node:fs/promises";
import Electron from "electron";
import path from "node:path";

import { log } from "@/datatypes/Logger";
import {
  ShellSpecificationSchema,
  ShellSpecification,
  parseShellSpec,
} from "@/datatypes/ShellSpecification";

const proc = server.procedure;

//const configFilePath = Electron.app.getPath("home") + "/.natter/config.json";
const configFilePath = path.join(
  Electron.app.getPath("home"),
  ".natter",
  "config.json"
);
const keybindFilePath = path.join(
  Electron.app.getPath("home"),
  ".natter",
  "keybind.json"
);
const shellSpecDir = path.join(
  Electron.app.getPath("home"),
  ".natter",
  "shellSpecs"
);

function readConfig() {
  const configRead = fs.readFile(configFilePath, "utf-8");
  log.debug("Reading config from: ", configFilePath);
  return configRead.then((config) => {
    const parsed = parseConfig(config);
    if (parsed) {
      return parsed;
    }
    throw new Error("Failed to parse config");
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
        const specPath = shellSpecDir + "/" + spec;
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
  const specPath = shellSpecDir + "/" + name;
  const writeFile = fs.writeFile(specPath, JSON.stringify(spec, null, 2));
  return writeFile
    .then(() => {
      return true;
    })
    .catch(() => {
      return false;
    });
}

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
});
