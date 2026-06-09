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
  getPlatform: () => process.platform,

  // Credenciales multi-usuario (cifradas con safeStorage, como Chrome Password Manager)
  guardarCredenciales: (creds) => ipcRenderer.invoke('guardar-credenciales', creds),
  cargarCredenciales: (usuario) => ipcRenderer.invoke('cargar-credenciales', usuario),
  listarUsuarios: () => ipcRenderer.invoke('listar-usuarios'),
  eliminarCredenciales: (usuario) => ipcRenderer.invoke('eliminar-credenciales', usuario)
});
