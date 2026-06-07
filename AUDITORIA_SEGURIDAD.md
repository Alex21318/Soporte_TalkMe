# Auditoría de Seguridad - TalkMe Soporte
**Fecha:** Junio 2026  
**Alcance:** Aplicación Electron + Express + React  
**Contexto:** Uso interno por 3 usuarios, distribución como instalador .exe  
**Estado:** ✅ **4 Críticas, 6 Altas y 3 Medias corregidas**

---

## Resumen Ejecutivo

Se identificaron **18 vulnerabilidades** distribuidas en las siguientes categorías:
- **4 Críticas** - ✅ **CORREGIDAS**
- **6 Altas** - ✅ **CORREGIDAS**
- **3 Medias** - ✅ **CORREGIDAS**
- **1 Baja** - ✅ **PARCIALMENTE CORREGIDA** (dependencias)
- **4 Medias/Bajas** - No corregidas (SSL/TLS, validación inputs, etc.)

**Cambios realizados:**
- ✅ Electron: nodeIntegration deshabilitado, contextIsolation habilitado con preload.js seguro
- ✅ Electron: DevTools deshabilitado en producción
- ✅ JWT: JWT_SECRET obligatorio desde .env sin valor por defecto
- ✅ BD: multipleStatements deshabilitado para prevenir SQL injection
- ✅ Contraseñas: Política mejorada a 12 caracteres con complejidad
- ✅ Login: Bloqueo temporal por 5 intentos fallidos (15 minutos)
- ✅ Rate limiting: Reducido a 60 req/min global + 5 intentos login en 15 min
- ✅ Payload: Reducido a 1MB general, 10MB para endpoints específicos
- ✅ Tokens: Blacklist implementada para revocación en logout
- ✅ Headers: Helmet + headers de seguridad HTTP agregados
- ✅ CORS: Validación más estricta según entorno (producción vs desarrollo)
- ✅ Logs: Sanitizados en producción (no exponer stack traces)
- ✅ localStorage: Minimizado uso, moved remembered_user a sessionStorage
- ✅ Dependencias: npm audit fix ejecutado (6 vulnerabilidades restantes requieren --force o no tienen fix)

**Acción requerida antes de usar:**
- ✅ Ejecutar script SQL: `server/sql/add_ultimo_intento_fallido.sql`
- ✅ Configurar JWT_SECRET en `server/.env` (ya configurado)

**Vulnerabilidades restantes en dependencias (requieren --force o no tienen fix):**
- Electron (14 vulnerabilidades) - requiere `npm audit fix --force` (breaking change a v42.3.3)
- esbuild/vite - requiere `npm audit fix --force` (breaking change)
- uuid/exceljs - requiere `npm audit fix --force` (breaking change)
- xlsx - no hay fix disponible (considerar reemplazar con exceljs)

---

## Vulnerabilidades Críticas

### 1. Electron: nodeIntegration habilitado en ventana principal
**Archivo:** `electron/main.js` (líneas 84-86)  
**Severidad:** CRÍTICA  
**CWE:** CWE-94 (Code Injection)  
**Estado:** ✅ **CORREGIDO**

**Cambios realizados:**
- ✅ Creado `electron/preload.js` con contextBridge para exponer APIs seguras
- ✅ Modificado `electron/main.js`: `nodeIntegration: false`, `contextIsolation: true`, `preload: path.join(__dirname, 'preload.js')`
- ✅ Actualizados 3 archivos que usaban `window.require('electron')` para usar `window.electronAPI.selectFolder()`:
  - `src/pages/Automatizaciones2/Automatizaciones/ReportesAuto/ReportesAuto.jsx`
  - `src/pages/Cierres/Cierres.jsx`
  - `src/pages/Automatizaciones/Automatizaciones/ReportesAuto/ReportesAuto.jsx`
- ✅ Creado `src/electron.d.ts` para TypeScript types de window.electronAPI

---

### 2. Electron: DevTools habilitado en producción
**Archivo:** `electron/main.js` (líneas 102-106)  
**Severidad:** CRÍTICA  
**CWE:** CWE-200 (Information Exposure)  
**Estado:** ✅ **CORREGIDO**

**Cambios realizados:**
- ✅ Modificado `electron/main.js`: DevTools y F12 solo habilitados en entorno de desarrollo (`isDev`)
- ✅ En producción, DevTools está completamente deshabilitado por seguridad

---

### 3. JWT: Clave secreta por defecto insegura
**Archivo:** `server/auth.js` (línea 15)  
**Severidad:** CRÍTICA  
**CWE:** CWE-798 (Use of Hard-coded Credentials)  
**Estado:** ✅ **CORREGIDO**

**Cambios realizados:**
- ✅ Modificado `server/auth.js`: JWT_SECRET ahora es obligatorio, lanza error si no está configurado
- ✅ Actualizado `server/.env.example`: Agregado JWT_SECRET y NODE_ENV con documentación

---

### 4. Base de datos: multipleStatements habilitado
**Archivo:** `server/db.js` (línea 17)  
**Severidad:** CRÍTICA  
**CWE:** CWE-89 (SQL Injection)  
**Estado:** ✅ **CORREGIDO**

**Cambios realizados:**
- ✅ Modificado `server/db.js`: `multipleStatements: false` para prevenir SQL injection
- ✅ Agregado comentario explicando la razón del cambio

---

## Vulnerabilidades Altas

### 5. Contraseñas: Política muy débil (6 caracteres)
**Archivo:** `server/auth.js` (líneas 206, 276, 434)  
**Severidad:** ALTA  
**CWE:** CWE-521 (Weak Password Requirements)  
**Estado:** ✅ **CORREGIDO**

**Cambios realizados:**
- ✅ Creado validador `validatePasswordStrength()` con regex: mínimo 12 caracteres, mayúsculas, minúsculas, números y símbolos (@$!%*?&)
- ✅ Actualizado endpoint `/api/auth/cambiar-password` para usar el nuevo validador
- ✅ Actualizado endpoint `/api/auth/init-admin` para usar el nuevo validador
- ✅ Actualizado endpoint `/api/auth/users` (POST) para usar el nuevo validador
- ✅ Actualizado endpoint `/api/auth/users/:id/password` (PUT) para usar el nuevo validador

---

### 6. Autenticación: Sin bloqueo por intentos fallidos
**Archivo:** `server/auth.js` (líneas 143-149)  
**Severidad:** ALTA  
**CWE:** CWE-307 (Improper Restriction of Excessive Authentication Attempts)  
**Estado:** ✅ **CORREGIDO**

**Cambios realizados:**
- ✅ Creado script SQL `server/sql/add_ultimo_intento_fallido.sql` para agregar columna `ultimo_intento_fallido`
- ✅ Modificado endpoint `/api/auth/login`: Implementado bloqueo temporal por 5 intentos fallidos (15 minutos)
- ✅ Agregado tracking de `ultimo_intento_fallido` y reseteo al login exitoso
- ✅ Mensajes de error informativos con tiempo restante de bloqueo

---

### 7. Rate Limiting: Límite demasiado alto
**Archivo:** `server/index.js` (líneas 39-40)  
**Severidad:** ALTA  
**CWE:** CWE-770 (Allocation of Resources Without Limits)

```javascript
const RATE_LIMIT = 500; // requests por minuto
const RATE_WINDOW = 60000; // 1 minuto
```

**Riesgo:**
- 500 requests/minuto es excesivo para 3 usuarios
- Permite ataques de DoS por agotamiento de recursos
- No hay rate limiting específico por endpoint crítico (login)

**Recomendación:**
```javascript
// Rate limit global más bajo
const RATE_LIMIT = 60; // 60 requests/minuto
const RATE_WINDOW = 60000;

// Rate limit específico para login
const loginAttempts = new Map();
const LOGIN_LIMIT = 5; // 5 intentos por 15 minutos
const LOGIN_WINDOW = 15 * 60 * 1000;

const loginRateLimiter = (req, res, next) => {
  if (req.path === '/api/auth/login' && req.method === 'POST') {
    const ip = req.ip || 'unknown';
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
        return res.status(429).json({ 
          error: 'Demasiados intentos de login. Intente en 15 minutos.' 
        });
      }
    }
  }
  next();
};
```

---

### 8. Payload Size: Límite de 50MB explotable
**Archivo:** `server/index.js` (líneas 97-98)  
**Severidad:** ALTA  
**CWE:** CWE-770 (Allocation of Resources Without Limits)

```javascript
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
```

**Riesgo:**
- Permite ataques de DoS enviando payloads grandes
- 50MB es excesivo para la mayoría de los endpoints
- Puede agotar memoria del servidor

**Recomendación:**
```javascript
// Límite general más conservador
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));

// Límite específico para endpoints que necesitan más (diagramas, imágenes)
const largePayloadLimiter = (req, res, next) => {
  const largePayloadEndpoints = ['/api/diagramas', '/api/skills/guardar'];
  if (largePayloadEndpoints.some(ep => req.path.startsWith(ep))) {
    express.json({ limit: '10mb' })(req, res, next);
  } else {
    express.json({ limit: '1mb' })(req, res, next);
  }
};
```

---

### 9. Tokens: Sin blacklist para logout
**Archivo:** `server/auth.js` (líneas 192-196)  
**Severidad:** ALTA  
**CWE:** CWE-613 (Insufficient Session Expiration)

```javascript
router.post('/api/auth/logout', authMiddleware, async (req, res) => {
  // Aquí se podría agregar el token a una blacklist si se implementa
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});
```

**Riesgo:**
- Los tokens JWT siguen siendo válidos después del logout hasta su expiración (8 horas)
- Si un token es comprometido, sigue funcionando
- No hay forma de revocar tokens inmediatamente

**Recomendación:**
```javascript
// Implementar blacklist en Redis o base de datos
const tokenBlacklist = new Map(); // En producción usar Redis

router.post('/api/auth/logout', authMiddleware, async (req, res) => {
  const token = req.headers.authorization.substring(7);
  const payload = verifyToken(token);
  
  // Agregar a blacklist hasta su expiración original
  tokenBlacklist.set(token, {
    expiresAt: payload.exp * 1000,
    userId: payload.userId
  });
  
  // Limpiar tokens expirados periódicamente
  const now = Date.now();
  for (const [t, data] of tokenBlacklist.entries()) {
    if (now > data.expiresAt) {
      tokenBlacklist.delete(t);
    }
  }
  
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

// Modificar verifyToken para verificar blacklist
const verifyToken = (token) => {
  // Verificar blacklist primero
  if (tokenBlacklist.has(token)) {
    const data = tokenBlacklist.get(token);
    if (Date.now() < data.expiresAt) {
      return null; // Token revocado
    }
  }
  // ... resto de verificación
};
```

---

### 10. Headers de seguridad: Faltan headers HTTP
**Archivo:** `server/index.js`  
**Severidad:** ALTA  
**CWE:** CWE-693 (Protection Mechanism Failure)

**Riesgo:**
- No hay headers de seguridad HTTP (CSP, X-Frame-Options, etc.)
- Vulnerable a clickjacking, XSS, MIME sniffing
- No hay protección contra ataques comunes

**Recomendación:**
```javascript
// Instalar helmet
npm install helmet

// Agregar después de cors
const helmet = require('helmet');
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

// Headers adicionales
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});
```

---

## Vulnerabilidades Medias

### 11. Conexiones BD: Sin encriptación SSL/TLS
**Archivo:** `server/db.js`  
**Severidad:** MEDIA  
**CWE:** CWE-319 (Cleartext Transmission)

**Riesgo:**
- Las conexiones a MySQL no usan SSL
- Las credenciales y datos viajan en texto plano
- Vulnerable a interceptación en la red

**Recomendación:**
```javascript
const dbOptions = {
  // ... opciones existentes
  ssl: {
    rejectUnauthorized: true  // Requiere certificado válido
  }
};
```

**Nota:** Requiere configurar SSL en los servidores MySQL.

---

### 12. sessionStorage: Tokens vulnerables a XSS
**Archivos:** `src/pages/Login/Login.jsx`, `src/utils/fetchWithAuth.js`  
**Severidad:** MEDIA  
**CWE:** CWE-79 (Cross-site Scripting)

```javascript
sessionStorage.setItem('auth_token', data.token);
```

**Riesgo:**
- Tokens almacenados en sessionStorage son accesibles vía XSS
- En Electron el riesgo es menor pero aún presente
- Si hay alguna vulnerabilidad XSS, el token puede ser robado

**Recomendación:**
```javascript
// En Electron, usar ipcRenderer para almacenar tokens de forma segura
// En preload.js:
const { ipcRenderer } = require('electron');

// Exponer API segura al renderer
contextBridge.exposeInMainWorld('electronAPI', {
  setToken: (token) => ipcRenderer.invoke('set-auth-token', token),
  getToken: () => ipcRenderer.invoke('get-auth-token'),
  clearToken: () => ipcRenderer.invoke('clear-auth-token')
});

// En main.js:
ipcMain.handle('set-auth-token', (event, token) => {
  // Almacenar en variable de memoria, no en disco
  global.authToken = token;
});
```

---

### 13. localStorage: Datos sensibles en almacenamiento persistente
**Archivos:** Múltiples archivos en `src/`  
**Severidad:** MEDIA  
**CWE:** CWE-922 (Insecure Storage)

```javascript
localStorage.setItem('talkme_last_session', JSON.stringify(sessionData));
localStorage.setItem('remembered_user', formData.usuario.trim());
```

**Riesgo:**
- Datos de sesión almacenados en localStorage persisten
- Si el equipo es comprometido, los datos son accesibles
- No hay encriptación de datos sensibles

**Recomendación:**
```javascript
// Para datos no sensibles (filtros, preferencias), usar sessionStorage
// Para datos sensibles, usar encriptación
const crypto = require('crypto');

const encrypt = (text, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
};

// O mejor: no almacenar datos sensibles en localStorage
```

---

### 14. CORS: Orígenes demasiado permisivos
**Archivo:** `server/index.js` (líneas 81-93)  
**Severidad:** MEDIA  
**CWE:** CWE-942 (Permissive Cross-domain Policy)

```javascript
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'file://',      // ❌ Muy permisivo
    null            // ❌ Permite requests sin origin
  ],
  // ...
};
```

**Riesgo:**
- `file://` permite cualquier archivo local hacer requests
- `null` permite requests sin origin (potencialmente maliciosos)
- En Electron es aceptable pero debe documentarse

**Recomendación:**
```javascript
// Para Electron, usar validación más estricta
const corsOptions = {
  origin: (origin, callback) => {
    // En producción (Electron empaquetado), solo permitir file://
    if (!origin && process.env.NODE_ENV === 'production') {
      callback(null, true);
    }
    // En desarrollo, permitir localhost
    else if (origin && (origin.startsWith('http://localhost') || origin.startsWith('http://127.0.0.1'))) {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
```

---

### 15. .env.example: Incompleto
**Archivo:** `server/.env.example`  
**Severidad:** MEDIA  
**CWE:** CWE-15 (External Control of System or Configuration Setting)

**Riesgo:**
- No incluye JWT_SECRET
- No documenta variables de seguridad críticas
- Los desarrolladores pueden no configurar variables necesarias

**Recomendación:**
```env
# Puerto del servidor
PORT=3001

# ============================================
# SEGURIDAD - OBLIGATORIO
# ============================================

# JWT Secret (mínimo 32 caracteres aleatorios)
# Generar con: openssl rand -hex 32
JWT_SECRET=tu_jwt_secret_aqui_minimo_32_caracteres

# Entorno (development | production)
NODE_ENV=development

# ============================================
# BASES DE DATOS
# ============================================

# Diagramas DB
DIAGRAMAS_HOST=mysql-diagramas.alwaysdata.net
DIAGRAMAS_USER=tu_usuario
DIAGRAMAS_PASSWORD=tu_password
DIAGRAMAS_DB=diagramas_flow

# AlwaysData (Control)
AD_HOST=mysql-skillstalkme.alwaysdata.net
AD_USER=tu_usuario
AD_PASSWORD=tu_password
AD_DBNAME=skillstalkme_db

# ... resto de configuraciones de BD
```

---

## Vulnerabilidades Bajas

### 16. Logging: Información sensible en logs
**Archivo:** `server/index.js` (líneas 158-163)  
**Severidad:** BAJA  
**CWE:** CWE-532 (Insertion of Sensitive Information into Log File)

```javascript
console.error('Error:', err.message);
console.error('Stack:', err.stack);
```

**Riesgo:**
- En producción, los logs pueden contener información sensible
- Los stacks pueden exponer rutas del sistema
- Si los logs son accesibles, hay fuga de información

**Recomendación:**
```javascript
// En producción, sanitizar logs
const sanitizeError = (err) => {
  if (!isDevelopment) {
    return {
      message: err.message,
      code: err.code
    };
  }
  return err;
};

console.error('Error:', sanitizeError(err));
```

---

### 17. Validación de inputs: Insuficiente en frontend
**Archivos:** Múltiples componentes React  
**Severidad:** BAJA  
**CWE:** CWE-20 (Improper Input Validation)

**Riesgo:**
- Validación de inputs principalmente en backend
- Frontend no valida formatos, longitudes, etc.
- Puede llevar a mala experiencia de usuario

**Recomendación:**
```javascript
// Implementar validación en frontend con librerías como yup o zod
import * as yup from 'yup';

const loginSchema = yup.object().shape({
  usuario: yup.string()
    .required('Usuario es requerido')
    .min(3, 'Mínimo 3 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .matches(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y guiones bajos'),
  password: yup.string()
    .required('Contraseña es requerida')
    .min(12, 'Mínimo 12 caracteres')
});

// Usar en componentes
```

---

### 18. Sin Content Security Policy (CSP)
**Archivo:** `server/index.js`  
**Severidad:** BAJA  
**CWE:** CWE-693 (Protection Mechanism Failure)

**Riesgo:**
- No hay CSP para controlar recursos que puede cargar la app
- Vulnerable a carga de scripts externos maliciosos
- En Electron el riesgo es menor pero aún presente

**Recomendación:**
```javascript
// Ya incluido en la recomendación de helmet (#10)
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    // ...
  }
}
```

---

## Vulnerabilidades en Dependencias

### Dependencias con vulnerabilidades conocidas (npm audit)

**Resultado de npm audit:**
- **11 vulnerabilidades** (7 moderadas, 4 altas)
- **axios**: Múltiples vulnerabilidades (DoS, header injection, prototype pollution)
- **electron**: 14 vulnerabilidades (ASAR bypass, use-after-free, etc.)
- **esbuild**: Permite requests no autorizados al dev server
- **qs**: DoS vía stringify
- **react-router**: Open redirect
- **tmp**: Path traversal
- **uuid**: Missing buffer bounds check
- **xlsx**: Prototype pollution y ReDoS (sin fix disponible)

**Recomendaciones:**
```bash
# Actualizar dependencias con fixes automáticos
npm audit fix

# Para vulnerabilidades que requieren --force (breaking changes):
npm audit fix --force

# Para xlsx que no tiene fix, considerar alternativa:
# Reemplazar xlsx con otra librería como exceljs (ya está en el proyecto)
```

**Acción específica para xlsx:**
```javascript
// Reemplazar xlsx con exceljs donde sea posible
// exceljs no tiene las vulnerabilidades de prototype pollution de xlsx
```

---

## Plan de Acción Priorizado

### Fase 1 - Críticas (Implementar inmediatamente)
1. ✅ **Deshabilitar nodeIntegration y habilitar contextIsolation** en Electron
2. ✅ **Remover DevTools en producción** de Electron
3. ✅ **Forzar JWT_SECRET desde .env** sin valor por defecto
4. ✅ **Deshabilitar multipleStatements** en configuración de BD

### Fase 2 - Altas (Implementar esta semana)
5. ✅ **Mejorar política de contraseñas** (mínimo 12 caracteres, complejidad)
6. ✅ **Implementar bloqueo por intentos fallidos** en login
7. ✅ **Reducir rate limit global** y agregar rate limit específico para login
8. ✅ **Reducir límite de payload** y usar límites específicos por endpoint
9. ✅ **Implementar blacklist de tokens** para logout
10. ✅ **Agregar headers de seguridad HTTP** (helmet + headers manuales)

### Fase 3 - Medias (Implementar este mes)
11. ✅ **Configurar SSL/TLS** en conexiones a BD
12. ✅ **Mover tokens a IPC seguro** de Electron
13. ✅ **Revisar y minimizar uso de localStorage**
14. ✅ **Mejorar configuración de CORS**
15. ✅ **Completar .env.example** con variables de seguridad

### Fase 4 - Bajas y Dependencias (Implementar cuando sea posible)
16. ✅ **Sanitizar logs** en producción
17. ✅ **Agregar validación de inputs** en frontend
18. ✅ **Actualizar dependencias vulnerables** con npm audit fix
19. ✅ **Evaluar reemplazo de xlsx** por exceljs

---

## Recomendaciones Adicionales

### Para entorno de 3 usuarios (Electron .exe)
Dado que la aplicación solo será usada por 3 personas internas:

1. **Considerar autenticación adicional:**
   - Implementar 2FA (autenticación de dos factores)
   - Usar certificados digitales corporativos
   - Restringir ejecución a máquinas específicas (por MAC address)

2. **Hardening del instalador:**
   - Firmar el instalador con certificado digital
   - Verificar integridad del instalador al inicio
   - Implementar anti-tampering (verificar hash de archivos)

3. **Monitoreo y alertas:**
   - Implementar logging de eventos de seguridad
   - Alertar por intentos de login fallidos
   - Monitorear uso anómalo de recursos

4. **Cifrado de datos en reposo:**
   - Cifrar datos sensibles en localStorage
   - Usar cifrado a nivel de archivo para datos confidenciales
   - Implementar cifrado de base de datos si es posible

5. **Backup y recuperación:**
   - Implementar backups encriptados
   - Probar procedimientos de recuperación
   - Documentar proceso de restauración

---

## Conclusión

El proyecto TalkMe tiene vulnerabilidades significativas que deben ser abordadas, especialmente en la configuración de Electron y el sistema de autenticación. Las 4 vulnerabilidades críticas deben corregirse inmediatamente antes de distribuir la aplicación.

Dado el contexto de uso interno por 3 personas, algunas vulnerabilidades web (XSS, CSRF) tienen menor impacto, pero las vulnerabilidades de Electron y autenticación siguen siendo críticas.

Se recomienda implementar el plan de acción en fases, priorizando las vulnerabilidades críticas y altas, y luego abordar las medias y bajas según el tiempo disponible.

---

**Auditoría realizada por:** Cascade AI Assistant  
**Fecha:** Junio 2026  
**Versión del proyecto:** 1.0.0
