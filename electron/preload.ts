import { ipcRenderer, contextBridge } from "electron";
import { exposeElectronTRPC } from "electron-trpc/main";

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

console.log("preload completed.");
