// Type definitions for Electron API exposed via preload.js
interface ElectronAPI {
  selectFolder: () => Promise<string | null>;
  getVersion: () => string;
  getPlatform: () => string;
  guardarCredenciales: (creds: { usuario: string; password: string }) => Promise<boolean>;
  cargarCredenciales: (usuario?: string) => Promise<{ usuario: string; password: string } | null>;
  listarUsuarios: () => Promise<{ usuarios: string[]; ultimo: string | null }>;
  eliminarCredenciales: (usuario?: string) => Promise<boolean>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
