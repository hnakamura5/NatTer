import {
  LanguageServerExecutableArgs,
  LanguageServerID,
} from "@/datatypes/LanguageServerConfigs";

// WebWorker process to interact with the language server.
// Interaction is by electron IPC.
export class LanguageClientWorker extends Worker {
  url: string = "";
  serverID: LanguageServerID | undefined = undefined;

  constructor(executableArgs: LanguageServerExecutableArgs) {
    const url = URL.createObjectURL(
      new Blob([""], { type: "application/javascript" })
    );
    super(url);
    this.url = url;
    this.initializeServer(executableArgs);
    this.onmessage = (e) => {
      this.handleMessage(e.data);
    };
  }

  initializeServer({ executable, args }: LanguageServerExecutableArgs) {
    window.languageServer.start(executable, args || []).then((serverID) => {
      this.serverID = serverID;
      window.languageServer.onReceive(serverID, (message) => {
        this.postMessage(message);
      });
    });
  }

  handleMessage(message: string) {
    if (this.serverID !== undefined) {
      window.languageServer.send(this.serverID, message);
    }
  }

  terminate() {
    if (this.serverID !== undefined) {
      window.languageServer.close(this.serverID);
    }
    super.terminate();
    URL.revokeObjectURL(this.url);
  }
}
