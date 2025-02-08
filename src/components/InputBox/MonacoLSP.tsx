// import * as monaco from "@codingame/monaco-vscode-editor-api";
// import { initServices } from "monaco-languageclient/vscode/services";
// import getConfigurationServiceOverride from "@codingame/monaco-vscode-configuration-service-override";
// // monaco-editor does not supply json highlighting with the json worker,
// // that's why we use the textmate extension from VSCode
// import "@codingame/monaco-vscode-json-default-extension";
// import { MonacoLanguageClient } from "monaco-languageclient";
// import {
//   CloseAction,
//   ErrorAction,
//   MessageTransports,
// } from "vscode-languageclient/browser";
// import {
//   BrowserMessageReader,
//   BrowserMessageWriter,
//   createMessageConnection,
// } from "vscode-jsonrpc/browser";
// import { ConsoleLogger } from "monaco-languageclient/tools";

// // https://github.com/TypeFox/monaco-languageclient/blob/main/packages/examples/src/bare/client.ts


// //https://github.com/TypeFox/monaco-languageclient/discussions/570#discussioncomment-7670771
// //No need of monaco-languageclient?

// // https://github.com/eclipse-theia/theia/wiki/LSP-and-Monaco-Integration

// // Example for python
// // https://github.com/pplonski/electron-monaco-python-lsp

// export const runClient = async (
//   editor: monaco.editor.IStandaloneCodeEditor
// ) => {
//   const logger = new ConsoleLogger(/*LogLevel.Debug*/ 2);
//   await initServices(
//     {
//       serviceOverrides: {
//         ...getConfigurationServiceOverride(),
//       },
//       userConfiguration: {
//         json: JSON.stringify({
//           "editor.experimental.asyncTokenization": true,
//         }),
//       },
//     },
//     {
//       htmlContainer: editor.getContainerDomNode(),
//       logger: logger,
//     }
//   );
//   initWebSocketAndStartClient("ws://localhost:30000/sampleServer");
// };

// /** parameterized version , support all languageId */
// export const initWebSocketAndStartClient = (url: string): WebSocket => {
//   const webSocket = new WebSocket(url);
//   webSocket.onopen = () => {
//     const socket = toSocket(webSocket);
//     const reader = new WebSocketMessageReader(socket);
//     const writer = new WebSocketMessageWriter(socket);
//     const languageClient = createLanguageClient({
//       reader,
//       writer,
//     });
//     languageClient.start();
//     reader.onClose(() => languageClient.stop());
//   };
//   return webSocket;
// };

// export const createLanguageClient = (
//   messageTransports: MessageTransports
// ): MonacoLanguageClient => {
//   return new MonacoLanguageClient({
//     name: "Sample Language Client",
//     clientOptions: {
//       // use a language id as a document selector
//       documentSelector: ["json"],
//       // disable the default error handler
//       errorHandler: {
//         error: () => ({ action: ErrorAction.Continue }),
//         closed: () => ({ action: CloseAction.DoNotRestart }),
//       },
//     },
//     connectionProvider: {
//       get: (errorHandler, closeHandler) => {
//         return Promise.resolve(
//           createConnection(connection, errorHandler, closeHandler)
//         );
//       },
//     },
//     // create a language client connection from the JSON RPC connection on demand
//     messageTransports: messageTransports,
//   });
// };
