import { Stats } from "node:fs";
import fs from "node:fs/promises";
import path, { parse } from "node:path";

import { overrideWithPartialSchema } from "./parsers";
import { log } from "@/datatypes/Logger";

// Manage config file, both built-in and user. Check last updated time.
class ConfigFileManager<ConfigT> {
  parsedConfig: ConfigT | undefined;
  configLastUpdateTime: number | undefined;

  constructor(
    public configFilePath: string,
    public parseConfig: (config: string) => ConfigT | undefined
  ) {}

  isUpToDate(): Promise<boolean> {
    if (!this.parsedConfig) {
      return Promise.resolve(false);
    }
    return fs.stat(this.configFilePath).then((configStat) => {
      return this.checkLastUpdatedTime(configStat);
    });
  }

  checkLastUpdatedTime(configStat: Stats) {
    if (!this.configLastUpdateTime) {
      return false;
    }
    const lastUpdateTime = configStat.mtime.getTime();
    return lastUpdateTime != this.configLastUpdateTime;
  }

  readConfig(): Promise<ConfigT> {
    return fs.stat(this.configFilePath).then((stats) => {
      const lastUpdateTime = stats.mtime.getTime();
      if (lastUpdateTime === this.configLastUpdateTime && this.parsedConfig) {
        return this.parsedConfig;
      }
      const configRead = fs.readFile(this.configFilePath, "utf-8");
      return configRead.then((config) => {
        log.debug(`Reading config ${config} from: `, this.configFilePath);
        const parsed = this.parseConfig(config);
        this.parsedConfig = parsed;
        this.configLastUpdateTime = lastUpdateTime;
        if (parsed) {
          return parsed;
        }
        // TODO: Friendly error message.
        throw new Error("Failed to parse config");
      });
    });
  }

  writeConfig(config: ConfigT) {
    const configStr = JSON.stringify(config, null, 2);
    const configWrite = fs.writeFile(this.configFilePath, configStr);
    log.debug(`Writing config ${configStr} to: `, this.configFilePath);
    return configWrite;
  }
}

// Manage config directory. The result is array of all config files in the directory.
class ConfigDirectoryManager<ConfigT> {
  fileManagers: Map<string, ConfigFileManager<ConfigT>> = new Map();

  constructor(
    public configDirPath: string,
    public parseConfig: (config: string) => ConfigT | undefined
  ) {}

  setupFileManagers() {
    const newFileManagers = new Map<string, ConfigFileManager<ConfigT>>();
    const files = fs.readdir(this.configDirPath);
    return files.then((fileNames) => {
      fileNames.map((fileName) => {
        const filePath = path.join(this.configDirPath, fileName);
        if (this.fileManagers.has(fileName)) {
          newFileManagers.set(fileName, this.fileManagers.get(fileName)!);
        } else {
          newFileManagers.set(
            fileName,
            new ConfigFileManager<ConfigT>(filePath, this.parseConfig)
          );
        }
        this.fileManagers = newFileManagers;
      });
      return Promise.resolve();
    });
  }

  readConfigWithFileName(): Promise<{ fileName: string; config: ConfigT }[]> {
    return this.setupFileManagers().then(async () => {
      const configs = [];
      for (const [fileName, manager] of this.fileManagers) {
        const config = await manager.readConfig();
        configs.push({ fileName, config });
      }
      return configs;
    });
  }

  writeConfig(fileName: string, config: ConfigT) {
    const filePath = path.join(this.configDirPath, fileName);
    if (this.fileManagers.has(fileName)) {
      return this.fileManagers.get(fileName)!.writeConfig(config);
    } else {
      const newManager = new ConfigFileManager<ConfigT>(
        filePath,
        this.parseConfig
      );
      this.fileManagers.set(fileName, newManager);
      return newManager.writeConfig(config);
    }
  }
}

// Generic utility for reading and writing built-in and user config files.
export class BuiltinAndUserConfigManager<ConfigT, PartialT> {
  mergedConfig: ConfigT | undefined;

  baseConfigManager: ConfigFileManager<ConfigT>;
  userConfigManager: ConfigFileManager<PartialT>;

  constructor(
    public baseConfigFilePath: string,
    public userConfigFilePath: string,
    public parseBaseConfig: (config: string) => ConfigT | undefined,
    public parseUserConfig: (config: string) => PartialT | undefined
  ) {
    this.baseConfigManager = new ConfigFileManager<ConfigT>(
      baseConfigFilePath,
      parseBaseConfig
    );
    this.userConfigManager = new ConfigFileManager<PartialT>(
      userConfigFilePath,
      parseUserConfig
    );
  }

  async isUpToDate(): Promise<boolean> {
    if (!this.mergedConfig) {
      return Promise.resolve(false);
    }
    return (
      (await this.baseConfigManager.isUpToDate()) &&
      (await this.userConfigManager.isUpToDate())
    );
  }

  async readConfig(): Promise<ConfigT> {
    if (await this.isUpToDate()) {
      return this.mergedConfig!;
    }
    const baseConfig = await this.baseConfigManager.readConfig();
    const userConfig = await this.userConfigManager.readConfig();
    if (baseConfig) {
      log.debug("Base config: ", baseConfig);
      if (userConfig) {
        // Override the config if there is a user config.
        log.debug("User config: ", userConfig);
        const merged = overrideWithPartialSchema(baseConfig, userConfig);
        log.debug("Merged config: ", merged);
        this.mergedConfig = merged;
        return merged;
      }
      return baseConfig;
    } else {
      log.debug(`Failed to read base config from ${this.baseConfigFilePath}`);
      throw new Error("Failed to read base config");
    }
  }

  readBaseConfig(): Promise<ConfigT | undefined> {
    return this.baseConfigManager.readConfig();
  }

  readUserConfig(): Promise<PartialT | undefined> {
    return this.userConfigManager.readConfig();
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

// Manager supporting directory reading for locale, shellspec and so on.
// Read the base config as array and concatenate with the user config.
// In this case user configs must full standalone ones for each file.
export class BuiltinAndUserConfigDirectoryManager<ConfigT> {
  baseDirManager: ConfigDirectoryManager<ConfigT>;
  userDirManager: ConfigDirectoryManager<ConfigT>;

  constructor(
    public baseConfigDirPath: string,
    public userConfigDirPath: string,
    public parseConfig: (config: string) => ConfigT | undefined
  ) {
    this.baseDirManager = new ConfigDirectoryManager<ConfigT>(
      this.baseConfigDirPath,
      this.parseConfig
    );
    this.userDirManager = new ConfigDirectoryManager<ConfigT>(
      this.userConfigDirPath,
      this.parseConfig
    );
  }

  async setupFileManagers() {
    await this.baseDirManager.setupFileManagers();
    await this.userDirManager.setupFileManagers();
  }

  async readConfigWithFileName(): Promise<
    { fileName: string; config: ConfigT; isUserConfig: boolean }[]
  > {
    return this.setupFileManagers().then(async () => {
      const baseConfigs = await this.baseDirManager
        .readConfigWithFileName()
        .then((configs) => {
          return configs.map((config) => ({
            ...config,
            isUserConfig: false,
          }));
        });
      const userConfigs = await this.userDirManager
        .readConfigWithFileName()
        .then((configs) => {
          return configs.map((config) => ({
            ...config,
            isUserConfig: true,
          }));
        });
      return [...baseConfigs, ...userConfigs];
    });
  }

  readConfig(): Promise<ConfigT[]> {
    return this.readConfigWithFileName().then((configs) => {
      const result = configs.map((config) => config.config);
      log.debug(
        `readConfig from directory ${this.baseConfigDirPath} <- ${this.userConfigDirPath}: `,
        result
      );
      return result;
    });
  }

  writeUserConfig(fileName: string, config: ConfigT) {
    return this.userDirManager.writeConfig(fileName, config);
  }
}
