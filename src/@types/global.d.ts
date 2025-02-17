export interface IElectronAPI {
  callTest: (v: string) => void;
}

declare global {
  interface Window {
    testMain: IElectronAPI;
  }
}
