export interface IElectronAPI {
  callTest: (v: string) => void;
}

declare global {
  interface Window {
    testMain: IElectronAPI;

    // Language Server IPC handlers interface.
    languageServer: {
      start: (executable: string, args: string[]) => Promise<LanguageServerID>;
      send: (server: LanguageServerID, message: string) => void;
      close: (server: LanguageServerID) => void;
      onReceive: (
        server: LanguageServerID,
        callback: (data: string) => void
      ) => void;
    };
  }
}
