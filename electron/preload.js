const { contextBridge, ipcRenderer } = require('electron');

// Exponer APIs seguras al proceso de renderizado
contextBridge.exposeInMainWorld('electronAPI', {
  // API para seleccionar carpeta
  selectFolder: async () => {
    try {
      const resultado = await ipcRenderer.invoke('seleccionar-carpeta');
      return resultado || null;
    } catch (error) {
      console.error('Error al seleccionar carpeta:', error);
      return null;
    }
  },

  // Versión de Electron (útil para debugging)
  getVersion: () => process.versions.electron,

  // Plataforma (útil para comportamientos específicos)
  getPlatform: () => process.platform
});
