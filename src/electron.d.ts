// Type definitions for Electron API exposed via preload.js
interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  getVersion: () => string;
  getPlatform: () => string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
