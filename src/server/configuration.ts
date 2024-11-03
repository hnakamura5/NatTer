import { server } from "@/server/tRPCServer";
import { z } from "zod";
import { ConfigSchema, parseConfig } from "@/datatypes/Config";
import fs from "node:fs/promises";
import Electron from "electron";

const proc = server.procedure;

const configFilePath = Electron.app.getPath("home") + "/.natter/config.json";

export const configurationRouter = server.router({
  read: proc.output(ConfigSchema).query(async () => {
    const configRead = fs.readFile(configFilePath, "utf-8");
    console.log("Reading config from: ", configFilePath);
    return configRead.then((config) => {
      console.log("Read config: ", config);
      const parsed = parseConfig(config);
      if (parsed) {
        return parsed;
      }
      throw new Error("Failed to parse config");
    });
  }),
  write: proc
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
});
