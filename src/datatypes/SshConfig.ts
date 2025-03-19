import { z } from "zod";
import { ConnectConfig } from "ssh2";

import { ShellConfig } from "./Config";

export const PathKindSchema = z.enum(["posix", "win32"]);
export type PathKind = z.infer<typeof PathKindSchema>;

// TODO: Multi hup?
export const RemoteHostSchema = z.object({
  host: z.string(),
  port: z.number().int().optional(),
  username: z.string(),
  pathKind: PathKindSchema.optional(),
});
export type RemoteHost = z.infer<typeof RemoteHostSchema>;



export function remoteHostFromConfig(
  config: ShellConfig
): RemoteHost | undefined {
  if (config.type === "ssh") {
    const connection = config.connection;
    return {
      host: connection.host,
      port: connection.port,
      username: connection.username,
      pathKind: config.pathKind,
    };
  }
  return undefined;
}

// TODO: How to read this with variable?
const CommonConfigSchema = z.object({
  home: z.string(),
  tempDir: z.string(), // Temporal directory for command execution.
});

const CommonAuthSchema = z
  .object({
    forceIPv4: z.boolean().optional(),
    forceIPv6: z.boolean().optional(),
    hostHash: z.string().optional(),
    readyTimeout: z.number().int().optional(),
    timeout: z.number().int().optional(),
  })
  .merge(RemoteHostSchema)
  .merge(CommonConfigSchema);

const PasswordAuthSchema = z
  .object({
    authentication: z.literal("password"),
    password: z.string(),
  })
  .merge(CommonAuthSchema);

const PrivateKeyAuthSchema = z
  .object({
    authentication: z.literal("privateKey"),
    privateKey: z.string(),
    passphrase: z.string().optional(),
  })
  .merge(CommonAuthSchema);

// auth: "password" | "privateKey" is discrimination tag.
export const SshConnectionSchema = z.discriminatedUnion("authentication", [
  PasswordAuthSchema,
  PrivateKeyAuthSchema,
]);

export type SshConnection = z.infer<typeof SshConnectionSchema>;

export function sshConnectionToConnectConfig(
  config: SshConnection
): ConnectConfig {
  if (config.authentication === "password") {
    return {
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      forceIPv4: config.forceIPv4,
      forceIPv6: config.forceIPv6,
    };
  } else {
    return {
      host: config.host,
      port: config.port,
      username: config.username,
      privateKey: config.privateKey,
      passphrase: config.passphrase,
      forceIPv4: config.forceIPv4,
      forceIPv6: config.forceIPv6,
    };
  }
}
