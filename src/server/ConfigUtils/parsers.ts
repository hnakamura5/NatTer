import {
  Config,
  ConfigSchema,
  PartialConfig,
  PartialConfigSchema,
} from "@/datatypes/Config";
import path, { parse } from "node:path";
import JSON5 from "json5";
import { z } from "zod";

import { log } from "@/datatypes/Logger";
import {
  pathVariables,
  tempDir,
  commandTempDir,
  lspTempDir,
} from "./variables";

// Override the members of base with members of partial if they are defined.
export function overrideWithPartialSchema<T, PartialT>(
  base: T,
  partial: PartialT
  // partialConfig: z.infer<z.ZodType<Partial<T>>>
): T {
  if (!partial) {
    return base;
  }
  const result = { ...base } as T;
  for (const key in partial) {
    const value = partial[key];
    if (value !== undefined) {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        result[key as unknown as keyof T] = overrideWithPartialSchema(
          base[key as unknown as keyof T],
          value
        );
      } else {
        result[key as unknown as keyof T] = value as T[keyof T];
      }
    }
  }
  return result;
}

export function configPathAssignVariables<T extends string | undefined>(
  path: T
): T {
  if (path === undefined) {
    return undefined as T;
  }
  let result = path as string;
  for (const [key, value] of pathVariables) {
    result = result.replace(key, value);
  }
  return result as T;
}

function configPathAssignVariablesToConfig<T extends PartialConfig>(
  config: T
): T {
  return {
    ...config,
    shells: config.shells?.map((s) => ({
      ...s,
      executable: configPathAssignVariables(s.executable),
      args: s.args?.map((a) => configPathAssignVariables(a)),
      languageServer: s.languageServer
        ? {
            ...s.languageServer,
            executable: configPathAssignVariables(s.languageServer.executable),
            args: s.languageServer.args?.map((a) =>
              configPathAssignVariables(a)
            ),
          }
        : undefined,
    })),
    tempDir: configPathAssignVariables(config?.tempDir) || tempDir,
    commandTempDir:
      configPathAssignVariables(config?.commandTempDir) || commandTempDir,
    lspTempDir: configPathAssignVariables(config?.lspTempDir) || lspTempDir,
  };
}

export function parseConfig(json: string): Config | undefined {
  log.debug("parseConfig:");
  log.debug(`  .natter: ${process.env.DOT_NATTER_PATH}`);
  log.debug("  pathVariables:");
  for (const [key, value] of pathVariables) {
    log.debug(`    ${key} -> ${value}`);
  }

  try {
    const parsed = ConfigSchema.parse(JSON5.parse(json));
    // Assign path variables.
    return configPathAssignVariablesToConfig(parsed);
  } catch (e) {
    console.error("Failed to parse config: ", e);
    return undefined;
  }
}

export function parseUserConfig(json: string): PartialConfig | undefined {
  try {
    const parsed = PartialConfigSchema.parse(JSON5.parse(json));
    return configPathAssignVariablesToConfig(parsed);
  } catch (e) {
    console.error("Failed to parse config: ", e);
    return undefined;
  }
}
