import { z } from "zod";

export const LanguageServerIDSchema = z.string();
export type LanguageServerID = z.infer<typeof LanguageServerIDSchema>;

export function getNextLanguageServerID(
  index: number,
  key: string
): LanguageServerID {
  // TODO: Simply returning 0 is misunderstood as undefined?
  return `${index}-${key}`;
}

export const LanguageServerExecutableArgsSchema = z.object({
  executable: z.string(),
  args: z.array(z.string()).optional(),
});
export type LanguageServerExecutableArgs = z.infer<
  typeof LanguageServerExecutableArgsSchema
>;

export enum LanguageServerIPCChannel {
  start = "lsp.start",
  send = "lsp.send",
  close = "lsp.close",
}
export function LanguageServerIPCChannelReceiver(server: LanguageServerID) {
  return `lsp.receive:${server}`;
}
export function LanguageServerIPCChannelClosed(server: LanguageServerID) {
  return `${LanguageServerIPCChannelReceiver(server)}:closed`;
}
