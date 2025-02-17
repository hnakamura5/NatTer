import { LanguageServerConnector } from "@/components/LanguageServerConfigs";
import { log } from "@/datatypes/Logger";
import {
  Message,
  RequestType,
  MessageSignature,
} from "vscode-languageserver-protocol";

type LanguageServerMessageType = MessageSignature;
function messageFromString(message: string): LanguageServerMessageType {
  return JSON.parse(message) as LanguageServerMessageType;
}
function messageToString(message: LanguageServerMessageType): string {
  return JSON.stringify(message);
}

type MessageType = "message" | "messageerror" | "error";
type MessageEventType = MessageEvent<LanguageServerMessageType>;
type MessageListenerType = (ev: MessageEventType) => void;

// WebWorker interface object to interact with the language server.
// onmessage and postMessage have opposite meaning from standard WebWorker.
// This acts as a proxy/adapter between the language client and server,
// where the "Worker" side is actually the language server process.
// Works as adaptor to the connector.
export class LanguageClientWorker implements Worker {
  private messageListeners: MessageListenerType[] = [];
  private messageErrorListeners: MessageListenerType[] = [];
  private errorListeners: ((ev: ErrorEvent) => void)[] = [];

  constructor(private connector: LanguageServerConnector) {
    this.connector.onmessage((message) => {
      const messageObject = messageFromString(message);
      const eventObject = new MessageEvent("message", {
        data: messageObject,
      });
      log.debug("LanguageClientWorker: onmessage from server:", eventObject);
      this.onmessage(eventObject);
    });
  }

  // Worker interface.

  // Get message from the language server.
  onmessage(ev: MessageEventType) {
    // Dispatch the message listener.
    for (const listener of this.messageListeners) {
      listener(ev);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onmessageerror(ev: MessageEventType) {
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
  postMessage(message: LanguageServerMessageType) {
    log.debug("LanguageClientWorker: postMessage from client:", message);
    this.connector.send(messageToString(message));
  }

  terminate() {
    this.connector.close();
  }

  addEventListener(
    type: MessageType,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    switch (type) {
      case "message":
        this.messageListeners.push(listener as MessageListenerType);
        break;
      case "messageerror":
        this.messageErrorListeners.push(listener as MessageListenerType);
        break;
      case "error":
        this.errorListeners.push(listener as (ev: ErrorEvent) => void);
        break;
    }
  }

  removeEventListener(
    type: MessageType,
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
          listener(event as MessageEventType)
        );
        break;
      case "messageerror":
        this.messageErrorListeners.forEach((listener) =>
          listener(event as MessageEventType)
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
