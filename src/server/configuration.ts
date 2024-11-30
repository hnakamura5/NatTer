import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { ConfigSchema, parseConfig } from "@/datatypes/Config";
import {
  KeybindSchema,
  KeybindListSchema,
  parseKeybindList,
} from "@/datatypes/KeyBind";
import fs from "node:fs/promises";
import Electron from "electron";
import { read, write } from "original-fs";
import { KeybindList } from "@/datatypes/KeyBind";

const proc = server.procedure;

const configFilePath = Electron.app.getPath("home") + "/.NatTer/config.json";
const keybindFilePath = Electron.app.getPath("home") + "/.NatTer/keybind.json";

export const configurationRouter = server.router({
  readConfig: proc.output(ConfigSchema).query(async () => {
    const configRead = fs.readFile(configFilePath, "utf-8");
    console.log("Reading config from: ", configFilePath);
    return configRead.then((config) => {
      const parsed = parseConfig(config);
      if (parsed) {
        return parsed;
      }
      throw new Error("Failed to parse config");
    });
  }),
  writeConfig: proc
    .input(ConfigSchema)
    .output(z.boolean())
    .mutation(async (opts) => {
      const writeFile = fs.writeFile(
        configFilePath,
        JSON.stringify(opts.input, null, 2)
      );
      return writeFile
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    }),
  readKeybind: proc.output(KeybindListSchema).query(async () => {
    const keybindRead = fs.readFile(keybindFilePath, "utf-8");
    console.log("Reading keybind from: ", keybindFilePath);
    return keybindRead.then((keybind) => {
      const parsed = parseKeybindList(keybind);
      if (parsed) {
        return parsed;
      }
      throw new Error("Failed to parse keybind");
    });
  }),
  writeKeybind: proc
    .input(z.string())
    .output(z.boolean())
    .mutation(async (opts) => {
      const writeFile = fs.writeFile(
        keybindFilePath,
        JSON.stringify(opts.input, null, 2)
      );
      return writeFile
        .then(() => {
          return true;
        })
        .catch(() => {
          return false;
        });
    }),
});
