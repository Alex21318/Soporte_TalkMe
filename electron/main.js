const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const cron = require('node-cron');

// 🔴 Encendemos el servidor principal que contiene Diagramas y Skills
require('../server/index.js');

// ── Eliminar la barra de menú nativa de Electron (File, Edit, View...) ────────
Menu.setApplicationMenu(null);

// ── Scheduler de reportes automáticos ────────────────────────────────────────
const { ejecutarReportesScheduled, leerConfig } = require('../server/modules/scheduler');

let cronJob = null;

function programarCron() {
  // Cancelar job anterior si existe
  if (cronJob) { cronJob.stop(); cronJob = null; }

  const config = leerConfig();
  if (!config.activo || !config.hora) {
    console.log('[Scheduler] Desactivado o sin hora configurada');
    return;
  }

  // Parsear "HH:MM" → expresion cron "MM HH * * *" en hora Guatemala (UTC-6 → sumar 6h para UTC)
  const [hh, mm] = config.hora.split(':').map(Number);
  const hhUTC = (hh + 6) % 24;
  const expresion = `${mm} ${hhUTC} * * *`;

  cronJob = cron.schedule(expresion, async () => {
    console.log(`[Scheduler] ⏰ Ejecutando reportes automáticos (${config.hora} GT)...`);
    try {
      const resultado = await ejecutarReportesScheduled(config);
      console.log('[Scheduler] ✅ Completado:', JSON.stringify(resultado.log));
    } catch (e) {
      console.error('[Scheduler] ❌ Error:', e.message);
    }
  }, { timezone: 'UTC' });

  console.log(`[Scheduler] ✅ Programado para las ${config.hora} GT (cron: ${expresion} UTC)`);
}

// ── Icono de la aplicación ────────────────────────────────────────────────────
const APP_ICON = path.join(__dirname, '../public/assets/new_logo_T.png');

// ── Splash screen ─────────────────────────────────────────────────────────────
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 480,
    height: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    movable: true,
    skipTaskbar: false,
    icon: APP_ICON,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.center();
  splashWindow.on('closed', () => { splashWindow = null; });
}

// ── Ventana principal ─────────────────────────────────────────────────────────
function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false, // No mostrar hasta que esté lista (mientras splash está visible)
    icon: APP_ICON,
    title: 'TalkMe — Soporte',
    autoHideMenuBar: true,
    menuBarVisible: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });
  mainWindow.setMenuBarVisibility(false);

  // Si estamos en entorno de desarrollo, cargamos el servidor de Vite.
  // Si está empaquetado, cargamos el index.html compilado.
  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools(); // Habilitado solo para desarrollo
    
    // Habilitar F12 para abrir DevTools solo en desarrollo
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.key === 'F12') {
        mainWindow.webContents.toggleDevTools();
      }
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // En producción, DevTools está deshabilitado por seguridad
  }

  // Cuando la app esté completamente lista (DOM cargado), hacemos transición suave
  mainWindow.webContents.once('did-finish-load', () => {
    // Pequeño delay mínimo para que se aprecie el splash al menos 1s
    setTimeout(() => {
      // 1. Inicializar ventana principal en opacity 0 y mostrarla detrás del splash
      mainWindow.setOpacity(0);
      mainWindow.show();
      
      // 2. Fade-out del splash + fade-in de la ventana principal en paralelo
      const fadeDurationMs = 450;
      const stepMs = 16; // ~60 fps
      const steps = Math.floor(fadeDurationMs / stepMs);
      let currentStep = 0;
      
      const fadeInterval = setInterval(() => {
        currentStep++;
        const progress = Math.min(currentStep / steps, 1);
        // Easing: easeOutCubic para una sensación más fluida
        const eased = 1 - Math.pow(1 - progress, 3);
        
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.setOpacity(1 - eased);
        }
        if (!mainWindow.isDestroyed()) {
          mainWindow.setOpacity(eased);
        }
        
        if (progress >= 1) {
          clearInterval(fadeInterval);
          if (splashWindow && !splashWindow.isDestroyed()) {
            splashWindow.close();
          }
          if (!mainWindow.isDestroyed()) {
            mainWindow.setOpacity(1);
            mainWindow.focus();
          }
        }
      }, stepMs);
    }, 1000);
  });
}

// ── IPC: abrir selector de carpeta nativo ─────────────────────────────────────
ipcMain.handle('seleccionar-carpeta', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Seleccionar carpeta de destino',
    properties: ['openDirectory', 'createDirectory'],
    buttonLabel: 'Seleccionar carpeta'
  });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(() => {
  // 1. Mostrar splash inmediatamente
  createSplashWindow();
  // 2. Crear ventana principal en background (no se muestra hasta did-finish-load)
  createWindow();
  // 3. Iniciar el scheduler al arrancar la app
  programarCron();

  // En Windows, fijar AppUserModelID para que el icono salga correctamente en taskbar
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.talkme.soporte');
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createSplashWindow();
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Reprogramar cuando el backend notifica cambio de config
process.on('message', (msg) => {
  if (msg?.type === 'SCHEDULER_CONFIG_UPDATED') {
    console.log('[Scheduler] Config actualizada, reprogramando...');
    programarCron();
  }
});