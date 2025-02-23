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
  getPathVariables,
  tempDir,
  commandTempDir,
  lspTempDir,
} from "./variables";

// Force get the member "name" of the object.
type NameType<T> = T extends { name: infer N } ? N : never;
function getName<T>(item: T): NameType<T> {
  return (item as unknown as { name: NameType<T> }).name;
}

function arrayMerge<T>(base: T[], partial: T[]): T[] {
  // If T has the key name, make the result unique for it.
  const obj = base[0] || partial[0];
  if (!obj || typeof obj !== "object" || !("name" in obj)) {
    // No member named "name".
    return [...base, ...partial];
  }
  let result = base;
  const uniqueSet = new Set<NameType<T>>();
  for (const item of base) {
    uniqueSet.add(getName(item));
  }
  for (const item of partial) {
    const key = getName(item);
    if (uniqueSet.has(key)) {
      // Override with latter one. Remove the item with the same key.
      result = result.filter((x) => getName(x) !== key);
    }
    result.push(item);
  }
  return result;
}

// Override the members of base with members of partial if they are defined.
export function overrideWithPartialSchema<T, PartialT>(
  base: T,
  partial: PartialT
): T {
  if (!partial) {
    return base;
  }
  if (Array.isArray(partial)) {
    // For array, concatenate to base.
    if (Array.isArray(base)) {
      return arrayMerge(base, partial) as T;
    } else {
      // TODO: error?
      throw new Error(
        "overrideWithPartialSchema: partial is an array but base is not"
      );
    }
  } else {
    const result = { ...base } as T;
    for (const key in partial) {
      const userValue = partial[key];
      const baseValue = base[key as unknown as keyof T];
      log.debug(
        `overrideWithPartialSchema: ${key}:${typeof key} :: ${baseValue} <- ${userValue}: ${typeof userValue}`
      );
      if (userValue !== undefined) {
        if (typeof userValue === "object") {
          // For non-array override the base recursively.
          result[key as unknown as keyof T] = overrideWithPartialSchema(
            baseValue,
            userValue
          );
        } else {
          // For non-object scalar, just override the base.
          result[key as unknown as keyof T] = userValue as T[keyof T];
        }
      }
    }
    return result;
  }
}

export function configPathAssignVariables<T extends string | undefined>(
  path: T
): T {
  if (path === undefined) {
    return undefined as T;
  }
  let result = path as string;
  for (const [key, value] of getPathVariables()) {
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
  log.debug(`  .natter: ${process.env.BUILTIN_DOT_NATTER_PATH}`);
  log.debug("  pathVariables:");
  for (const [key, value] of getPathVariables()) {
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
