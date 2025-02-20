import { z } from "zod";
import path, { parse } from "node:path";
import { Stats } from "node:fs";
import fs from "node:fs/promises";

import { overrideWithPartialSchema, parseConfig } from "./parsers";
import { log } from "@/datatypes/Logger";

export class BuiltinAndUserConfigManager<ConfigT, PartialT> {
  parsedConfig: ConfigT | undefined;
  configLastUpdateTime: number | undefined;
  mergedConfig: ConfigT | undefined;

  userConfig: PartialT | undefined;
  userConfigLastUpdateTime: number | undefined;

  constructor(
    private baseConfigFilePath: string,
    private userConfigFilePath: string,
    private parseBaseConfig: (config: string) => ConfigT | undefined,
    private parseUserConfig: (config: string) => PartialT | undefined
  ) {}

  checkLastUpdatedTime(configStat: Stats, userConfigStat?: Stats) {
    const lastUpdateTime = configStat.mtime.getTime();
    if (lastUpdateTime !== this.configLastUpdateTime) {
      return false;
    }
    if (userConfigStat) {
      const userLastUpdateTime = userConfigStat.mtime.getTime();
      if (userLastUpdateTime !== this.userConfigLastUpdateTime) {
        return false;
      }
    }
    return true;
  }

  readConfig(): Promise<ConfigT> {
    return fs.stat(this.baseConfigFilePath).then(async (configStat) => {
      const userConfigStat = await fs
        .stat(this.userConfigFilePath)
        .catch(() => {
          return undefined;
        });
      if (
        this.mergedConfig &&
        this.checkLastUpdatedTime(configStat, userConfigStat)
      ) {
        return this.mergedConfig;
      }
      const lastUpdateTime = configStat.mtime.getTime();
      // Read the config and override with user config.
      const configRead = fs.readFile(this.baseConfigFilePath, "utf-8");
      log.debug("Reading config from: ", this.baseConfigFilePath);
      return configRead.then((config) => {
        const parsed = this.parseBaseConfig(config);
        this.parsedConfig = parsed;
        this.configLastUpdateTime = lastUpdateTime;
        if (parsed) {
          return this.readUserConfig().then((userConfig) => {
            if (userConfig) {
              // Override the config if there is a user config.
              const merged = overrideWithPartialSchema(parsed, userConfig);
              this.mergedConfig = merged;
              log.debug("Merged config: ", merged);
              return merged;
            }
            return parsed;
          });
        }
        throw new Error("Failed to parse config");
      });
    });
  }

  readUserConfig(): Promise<PartialT | undefined> {
    return fs
      .stat(this.userConfigFilePath)
      .then((stats) => {
        const lastUpdateTime = stats.mtime.getTime();
        if (
          lastUpdateTime === this.userConfigLastUpdateTime &&
          this.userConfig
        ) {
          return this.userConfig;
        }
        const configRead = fs.readFile(this.userConfigFilePath, "utf-8");
        log.debug("Reading user config from: ", this.userConfigFilePath);
        return configRead.then((config) => {
          const parsed = this.parseUserConfig(config);
          this.userConfig = parsed;
          this.userConfigLastUpdateTime = lastUpdateTime;
          if (parsed) {
            return parsed;
          }
          // TODO: Friendly error message.
          throw new Error("Failed to parse user config");
        });
      })
      .catch((e) => {
        return undefined;
      });
  }

  writeBaseConfig(config: ConfigT) {
    return fs
      .writeFile(this.baseConfigFilePath, JSON.stringify(config, null, 2))
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
  }

  writeUserConfig(config: PartialT) {
    return fs
      .writeFile(this.userConfigFilePath, JSON.stringify(config, null, 2))
      .then(() => {
        return true;
      })
      .catch(() => {
        return false;
      });
  }
}
