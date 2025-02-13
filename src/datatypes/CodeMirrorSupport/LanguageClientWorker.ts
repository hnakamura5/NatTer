import {
  LanguageServerExecutableArgs,
  LanguageServerID,
} from "@/datatypes/LanguageServerConfigs";

type MessageType = "message" | "messageerror" | "error";
// WebWorker interface object to interact with the language server.
// onmessage and postMessage have opposite meaning from standard WebWorker.
// This acts as a proxy/adapter between the language client and server,
// where the "Worker" side is actually the language server process.
// Interaction is by electron IPC.
export class LanguageClientWorker implements Worker {
  url: string = "";
  serverID: LanguageServerID | undefined = undefined;

  private messageListeners: ((ev: MessageEvent<string>) => void)[] = [];
  private messageErrorListeners: ((ev: MessageEvent<string>) => void)[] = [];
  private errorListeners: ((ev: ErrorEvent) => void)[] = [];

  constructor(executableArgs: LanguageServerExecutableArgs) {
    const url = URL.createObjectURL(
      new Blob([""], { type: "application/javascript" })
    );
    this.url = url;
    this.initializeServer(executableArgs);
  }

  initializeServer({ executable, args }: LanguageServerExecutableArgs) {
    window.languageServer.start(executable, args || []).then((serverID) => {
      this.serverID = serverID;
      window.languageServer.onReceive(serverID, (message) => {
        if (this.onmessage) {
          const messageEvent = new MessageEvent("message", { data: message });
          this.onmessage(messageEvent);
        }
      });
    });
  }

  handleMessage(message: string) {
    if (this.serverID !== undefined) {
      window.languageServer.send(this.serverID, message);
    }
  }

  // Worker interface.

  // Get message from the language server.
  onmessage(ev: MessageEvent<string>) {
    // Dispatch the message listener.
    for (const listener of this.messageListeners) {
      listener(ev);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessageerror(ev: MessageEvent<string>) {
    for (const listener of this.messageErrorListeners) {
      listener(ev);
    }
  }

  onerror(ev: ErrorEvent) {
    for (const listener of this.errorListeners) {
      listener(ev);
    }
  }

  // Get message from the language client.
  postMessage(message: string) {
    this.handleMessage(message);
  }

  terminate() {
    if (this.serverID !== undefined) {
      window.languageServer.close(this.serverID);
    }
    URL.revokeObjectURL(this.url);
  }

  addEventListener(
    type: "message" | "messageerror" | "error",
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    switch (type) {
      case "message":
        this.messageListeners.push(
          listener as (ev: MessageEvent<string>) => void
        );
        break;
      case "messageerror":
        this.messageErrorListeners.push(
          listener as (ev: MessageEvent<any>) => void
        );
        break;
      case "error":
        this.errorListeners.push(listener as (ev: ErrorEvent) => void);
        break;
    }
  }

  removeEventListener(
    type: "message" | "messageerror" | "error",
    listener: EventListener,
    options?: boolean | EventListenerOptions
  ): void {
    switch (type) {
      case "message":
        this.messageListeners = this.messageListeners.filter(
          (l) => l !== listener
        );
        break;
      case "messageerror":
        this.messageErrorListeners = this.messageErrorListeners.filter(
          (l) => l !== listener
        );
        break;
      case "error":
        this.errorListeners = this.errorListeners.filter((l) => l !== listener);
        break;
    }
  }

  dispatchEvent(event: Event): boolean {
    switch (event.type) {
      case "message":
        this.messageListeners.forEach((listener) =>
          listener(event as MessageEvent<string>)
        );
        break;
      case "messageerror":
        this.messageErrorListeners.forEach((listener) =>
          listener(event as MessageEvent<string>)
        );
        break;
      case "error":
        this.errorListeners.forEach((listener) =>
          listener(event as ErrorEvent)
        );
        break;
    }
    return !event.defaultPrevented;
  }
}
