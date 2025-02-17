import { api } from "@/api";
import { log } from "@/datatypes/Logger";
import { useEffect, useRef, useState } from "react";
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

export const LanguageServerConfigSchema = z.object({
  executable: z.string(),
  args: z.array(z.string()).optional(),
});
export type LanguageServerExecutableArgs = z.infer<
  typeof LanguageServerConfigSchema
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

export interface LanguageServerConnector {
  send: (message: string) => void;
  onmessage: (callback: (data: string) => void) => void;
  close: () => void;
}

export function useLanguageServerConnector(
  executableArgs?: Partial<LanguageServerExecutableArgs>
) {
  const { executable, args } = executableArgs || {};
  // Server ID of the language server.
  const [serverID, setServerID] = useState<LanguageServerID | undefined>(
    undefined
  );
  const [connector, setConnector] = useState<
    LanguageServerConnector | undefined
  >(undefined);

  // Hold the onmessage callback.
  const onMessageCallback = useRef<(data: string) => void>(() => {
    log.debug(
      "useLanguageServerConnector: onmessage onMessageCallback default called"
    );
  });

  const starter = api.lsp.start.useMutation();
  const sender = api.lsp.send.useMutation();
  const closer = api.lsp.close.useMutation();
  // Receive data from the server.
  api.lsp.receive.useSubscription(serverID!, {
    enabled: serverID !== undefined,
    onData(data) {
      log.debug("useLanguageServerConnector: onmessage receive data:", data);
      onMessageCallback.current(data);
    },
    onError(error) {
      log.debug("useLanguageServerConnector: receive error:", error);
    },
  });
  // Start the language server.
  useEffect(() => {
    log.debug(
      `useLanguageServerConnector useEffect: executable:${executable} args:${args} serverID:${serverID}`
    );
    if (!serverID && executable) {
      starter
        .mutateAsync({
          executable: executable,
          args: args,
        })
        .then((id) => {
          log.debug(`useLanguageServerConnector: started server ${id}`);
          setServerID(id);
        });
      return () => {};
    }
    if (serverID !== undefined) {
      log.debug(`useLanguageServerConnector: setConnector to ${serverID}`);
      setConnector({
        send: (message: string) => {
          if (serverID === undefined) {
            log.debug(
              `useLanguageServerConnector: send to undefined: `,
              message
            );
            return;
          }
          log.debug(
            `useLanguageServerConnector: send to ${serverID}: `,
            message
          );
          sender.mutate({
            server: serverID,
            message: message,
          });
        },
        onmessage: (callback: (data: string) => void) => {
          log.debug(`useLanguageServerConnector: onmessage set in ${serverID}`);
          onMessageCallback.current = callback;
        },
        close: () => {
          if (serverID === undefined) {
            log.debug(`useLanguageServerConnector: close undefined`);
            return;
          }
          log.debug(`useLanguageServerConnector: close ${serverID}`);
          closer.mutate(serverID);
        },
      });
      log.debug(`useLanguageServerConnector: return to close ${serverID}`);
      return () => {
        log.debug(`useLanguageServerConnector: close server ${serverID}`);
        onMessageCallback.current = () => {};
        // Close the language server.
        closer.mutate(serverID);
      };
    }
  }, [executable, args?.toString(), serverID]);

  log.debug(
    `useLanguageServerConnector: executable:${executable} args:${args} serverID:${serverID} clientConnector:`,
    connector ? "defined" : "undefined"
  );

  // Return both at the same time.
  return serverID && connector
    ? { connector: connector, server: serverID }
    : {};
}
