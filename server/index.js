const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

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
const { router: bitacoraAdministrativaRoutes, initBitacoraAdministrativa } = require('./modules/bitacoraAdministrativa');

const app = express();
const port = 3001;

// 2. CONFIGURACIÓN DE MIDDLEWARES

// Rate Limiting simple para protección contra DDoS/Brute Force
const requestCounts = new Map();
const RATE_LIMIT = 5000; // requests por minuto
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

// Rate Limiting específico para login (más estricto)
const loginAttempts = new Map();
const LOGIN_LIMIT = 5; // 5 intentos por 15 minutos
const LOGIN_WINDOW = 15 * 60 * 1000; // 15 minutos en ms

const loginRateLimiter = (req, res, next) => {
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();

    if (!loginAttempts.has(ip)) {
      loginAttempts.set(ip, { count: 1, resetTime: now + LOGIN_WINDOW });
    } else {
      const data = loginAttempts.get(ip);
      if (now > data.resetTime) {
        data.count = 1;
        data.resetTime = now + LOGIN_WINDOW;
      } else {
        data.count++;
      }

      if (data.count > LOGIN_LIMIT) {
        console.warn(`Login rate limit exceeded for IP: ${ip}`);
        return res.status(429).json({
          error: 'Demasiados intentos de login. Intente en 15 minutos.'
        });
      }
    }
  }
  next();
};

// Aplicar rate limiting a todas las rutas
app.use(rateLimiter);
app.use(loginRateLimiter);

// Limpiar el mapa de rate limiting cada 10 minutos para evitar memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [ip, data] of requestCounts.entries()) {
    if (now > data.resetTime) {
      requestCounts.delete(ip);
    }
  }
  for (const [ip, data] of loginAttempts.entries()) {
    if (now > data.resetTime) {
      loginAttempts.delete(ip);
    }
  }
}, 600000);

// CORS restringido con validación más estricta
const corsOptions = {
  origin: (origin, callback) => {
    // En producción (Electron empaquetado), solo permitir file:// o null
    if (process.env.NODE_ENV === 'production') {
      if (!origin || origin === 'file://') {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS en producción'));
      }
    }
    // En desarrollo, permitir localhost
    else {
      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:3000',
        'file://',
        null
      ];
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('No permitido por CORS'));
      }
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Middleware para límite de payload específico por endpoint
const largePayloadEndpoints = ['/api/diagramas', '/api/skills/guardar', '/api/creaciones'];

const payloadLimiter = (req, res, next) => {
  const isLargePayload = largePayloadEndpoints.some(ep => req.path.startsWith(ep));
  if (isLargePayload) {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    express.json({ limit: '1mb' })(req, res, next);
  }
};

// Configuramos Express para que acepte JSON con límite reducido de 1MB (antes 50MB)
// Endpoints específicos (diagramas, skills, creaciones) permiten hasta 10MB
app.use(payloadLimiter);
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Headers de seguridad con helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // 'unsafe-inline' requerido para React
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "http://localhost:3001"],
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));

// Headers de seguridad adicionales
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

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

// Inicializar módulo de bitácora administrativa
initBitacoraAdministrativa(dbPools);
app.use('/', bitacoraAdministrativaRoutes);

// 4. MANEJO DE ERRORES GLOBAL
// Capturamos cualquier error inesperado para que el servidor no se caiga.
// En produccion no exponemos detalles del error al cliente.
const isDevelopment = process.env.NODE_ENV === 'development';

// Sanitizador de errores para logs en producción
const sanitizeError = (err) => {
  if (!isDevelopment) {
    return {
      message: err.message,
      code: err.code,
      status: err.status
    };
  }
  return err;
};

app.use((err, req, res, next) => {
  const sanitizedErr = sanitizeError(err);

  console.error('*** ERROR EN EL SERVIDOR UNIFICADO ***');
  console.error('Timestamp:', new Date().toISOString());
  console.error('Ruta:', req.path);
  console.error('Metodo:', req.method);
  console.error('Error:', sanitizedErr.message);
  if (isDevelopment) {
    console.error('Stack:', err.stack);
  }

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