const express = require('express');
const cors = require('cors');

// ============================================
// 1. IMPORTACIÓN DE MÓDULOS ORGANIZADOS POR CARPETAS
// ============================================
// Estructura:
//   - modules/    : Módulos de funcionalidad del backend
//   - tests/      : Archivos de prueba
//   - archives/   : Backups y archivos ZIP
//   - Core (raíz) : auth.js, db.js, index.js

// Core
const { router: authRoutes } = require('./auth');
const dbPools = require('./db');

// Módulos de funcionalidad (en carpeta modules/)
const diagramasRoutes = require('./modules/diagramas');
const diagramasBDRoutes = require('./modules/diagramasBD');
const { router: skillsRoutes } = require('./modules/skills');
const reportesRoutes = require('./modules/reportes2');
const { router: schedulerRoutes } = require('./modules/scheduler');
const { router: auditoriaRoutes, initAuditoria } = require('./modules/auditoria');
const { initAuditoriaSkills } = require('./modules/skills');
const { router: creacionesRoutes, init: initCreaciones } = require('./modules/creaciones');
const { router: seguridadRoutes, initAuditoriaSeguridad } = require('./modules/seguridad');
const { router: usuariosQRMRoutes, initPools: initUsuariosQRMPools } = require('./modules/usuariosQRM');
const { router: permisosUsuariosRoutes, initPools: initPermisosUsuariosPools } = require('./modules/permisosUsuarios');
const { router: asignacionMasivaRoutes, initPools: initAsignacionMasivaPools } = require('./modules/asignacionMasiva');
const { router: historialRoutes, initPools: initHistorialPools } = require('./modules/historial');

const app = express();
const port = 3001;

// 2. CONFIGURACIÓN DE MIDDLEWARES

// Rate Limiting simple para protección contra DDoS/Brute Force
const requestCounts = new Map();
const RATE_LIMIT = 500; // requests
const RATE_WINDOW = 60000; // 1 minuto en ms

const rateLimiter = (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  
  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
  } else {
    const data = requestCounts.get(ip);
    if (now > data.resetTime) {
      data.count = 1;
      data.resetTime = now + RATE_WINDOW;
    } else {
      data.count++;
    }
    
    if (data.count > RATE_LIMIT) {
      console.warn(`Rate limit exceeded for IP: ${ip}`);
      return res.status(429).json({ 
        error: 'Demasiadas solicitudes. Por favor intente mas tarde.' 
      });
    }
  }
  next();
};

// Aplicar rate limiting a todas las rutas
app.use(rateLimiter);

// Limpiar el mapa de rate limiting cada 10 minutos para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
}, 600000);

// CORS restringido solo para localhost y entorno de desarrollo
const corsOptions = {
  origin: [
    'http://localhost:5173',   // Vite dev server
    'http://localhost:3000',   // Posible otro puerto
    'http://127.0.0.1:5173',
    'file://',                 // Electron
    null                       // Requests sin origin (Electron)
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Configuramos Express para que acepte JSON con un límite de 50MB.
// Esto es vital para que las imágenes (logos) y diagramas grandes no den error de "Payload Too Large".
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Forzar charset UTF-8 en todas las respuestas JSON
app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  next();
});

// 3. REGISTRO DE RUTAS
// Estas líneas conectan los archivos externos con el servidor principal.

// Las rutas de diagramas responderán en: http://localhost:3001/api/bots
app.use('/api', diagramasRoutes);

// Las rutas de diagramas desde BD responderán en: http://localhost:3001/api/diagramas/bot-menu
app.use('/api', diagramasBDRoutes);

// IMPORTANTE: seguridadRoutes debe ir ANTES de skillsRoutes porque aSkills.js
// contiene endpoints viejos de /api/seguridad/* que serían tomados primero.
app.use('/', seguridadRoutes);

// Las rutas de skills responderán en: http://localhost:3001/api/skills
app.use('/', skillsRoutes);
app.use('/', reportesRoutes);
app.use('/', schedulerRoutes);
app.use('/', authRoutes);

// Inicializar auditoría con el pool de control
const auditoriaModulo = require('./modules/auditoria');
initAuditoria(dbPools.control);
initAuditoriaSkills(auditoriaModulo, dbPools.control);
initAuditoriaSeguridad(auditoriaModulo);
app.use('/', auditoriaRoutes);

// Inicializar módulo de creaciones
initCreaciones(dbPools.control, auditoriaModulo.registrarLogInterno);
app.use('/', creacionesRoutes);

// Inicializar módulo de usuarios QRM
initUsuariosQRMPools(dbPools);
app.use('/', usuariosQRMRoutes);

// Inicializar módulo de permisos de usuarios (Permisos TalkMe)
initPermisosUsuariosPools(dbPools);
app.use('/', permisosUsuariosRoutes);

// Inicializar módulo de asignación masiva
initAsignacionMasivaPools(dbPools);
app.use('/', asignacionMasivaRoutes);

// Inicializar módulo de historial de estados
initHistorialPools(dbPools);
app.use('/', historialRoutes);

// 4. MANEJO DE ERRORES GLOBAL
// Capturamos cualquier error inesperado para que el servidor no se caiga.
// En produccion no exponemos detalles del error al cliente.
const isDevelopment = process.env.NODE_ENV === 'development';

app.use((err, req, res, next) => {
  console.error('*** ERROR EN EL SERVIDOR UNIFICADO ***');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Ruta:', req.path);
  console.error('Metodo:', req.method);
  console.error('Error:', err.message);
  console.error('Stack:', err.stack);
  
  // No exponer detalles de errores de base de datos o del servidor al cliente
  const mensajeError = isDevelopment 
    ? err.message 
    : 'Error interno del servidor. Por favor intente mas tarde.';
    
  res.status(err.status || 500).json({ 
    error: mensajeError,
    // Solo incluir detalle en desarrollo
    ...(isDevelopment && { stack: err.stack })
  });
});

// 5. INICIO DEL SERVIDOR
app.listen(port, () => {
  console.log('======================================================');
  console.log(`🚀 SERVIDOR SOPORTE TALKME INICIADO`);
  console.log(`📍 Puerto: ${port}`);
  console.log(`🔗 Diagramas: http://localhost:${port}/api/bots`);
  console.log(`🔗 Skills: http://localhost:${port}/api/skills`);
  console.log('======================================================');
});