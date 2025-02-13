import { ipcRenderer, contextBridge } from "electron";
import { exposeElectronTRPC } from "electron-trpc/main";
import {
  LanguageServerID,
  LanguageServerIPCChannel,
  LanguageServerIPCChannelClosed,
  LanguageServerIPCChannelReceiver,
} from "@/datatypes/LanguageServerConfigs";

process.once("loaded", () => {
  exposeElectronTRPC();
});

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld("testMain", {
  // on(...args: Parameters<typeof ipcRenderer.on>) {
  //   const [channel, listener] = args
  //   return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  // },
  // You can expose other APTs you need here.
  callTest(v: string) {
    console.log(`contextBridge callTest: ${v}`);
  },
});

// We use built-in IPC to communicate with the main process for LSP.
// Because it is vert difficult to interact using tRPC in WebWorker client.
contextBridge.exposeInMainWorld("languageServer", {
  start: (executable: string, args: string[]) => {
    return ipcRenderer.invoke(
      LanguageServerIPCChannel.start,
      executable,
      args
    ) as Promise<LanguageServerID>;
  },
  send: (server: LanguageServerID, message: string) =>
    ipcRenderer.invoke(LanguageServerIPCChannel.send, server, message),
  close: (server: LanguageServerID) =>
    ipcRenderer.invoke(LanguageServerIPCChannel.close, server),
  onReceive: (server: LanguageServerID, callback: (data: string) => void) => {
    ipcRenderer.on(LanguageServerIPCChannelReceiver(server), (event, data) => {
      callback(data);
    });
    ipcRenderer.once(LanguageServerIPCChannelClosed(server), () =>
      ipcRenderer.removeAllListeners(LanguageServerIPCChannelReceiver(server))
    );
  },
});
