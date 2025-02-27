import { z } from "zod";
import { ConnectConfig } from "ssh2";

const CommonAuthSchema = z.object({
  host: z.string(),
  port: z.number().int().optional(),
  username: z.string(),
  forceIPv4: z.boolean().optional(),
  forceIPv6: z.boolean().optional(),
  hostHash: z.string().optional(),
  readyTimeout: z.number().int().optional(),
  timeout: z.number().int().optional(),
});

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
