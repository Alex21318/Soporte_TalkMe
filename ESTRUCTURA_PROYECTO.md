# 📁 Estructura del Proyecto TalkMe Support

> Documentación de la organización de archivos y carpetas

---

## 🗂️ Estructura General

```
d:/Proyectos/Soporte_TalkMe/
├── electron/              # Configuración de Electron
├── public/                # Assets estáticos
│   ├── assets/           # Imágenes, logos, iconos
│   └── workers/          # Web workers
├── server/               # Backend Node.js + Express
│   ├── modules/         # Módulos de funcionalidad ⭐
│   ├── tests/           # Tests unitarios
│   ├── archives/        # Backups y archivos ZIP
│   ├── api/             # Endpoints API adicionales
│   ├── migrations/      # Migraciones SQL
│   ├── services/        # Servicios compartidos
│   ├── sql/             # Scripts SQL
│   ├── config/          # Configuraciones (vacía)
│   ├── utils/           # Utilidades (vacía)
│   ├── middlewares/     # Middlewares Express (vacía)
│   ├── jobs/            # Jobs programados
│   ├── index.js         # Punto de entrada del servidor
│   ├── auth.js          # Autenticación
│   ├── db.js            # Configuración de pools de BD
│   └── worker.js        # Worker de procesamiento
├── src/                  # Frontend React + Vite
│   ├── pages/          # Páginas/Vistas del sistema ⭐
│   ├── components/     # Componentes reutilizables
│   ├── hooks/          # Custom React hooks
│   ├── services/       # Servicios de API
│   ├── config/         # Configuración (API URLs)
│   ├── context/        # React Context
│   ├── styles/         # Estilos globales y temas
│   ├── assets/         # Assets del frontend
│   └── _archives/      # Backups del frontend
├── .windsurfrules       # Reglas de Windsurf
├── package.json
└── vite.config.js
```

---

## 📦 Backend (`server/`)

### `server/modules/` - Módulos de Funcionalidad

| Archivo | Descripción |
|---------|-------------|
| `asignacionMasiva.js` | Gestión masiva de permisos |
| `auditoria.js` | Sistema de auditoría y logs |
| `creaciones.js` | Creación de instancias/empresas |
| `diagramas.js` | Diagramas y visualización de bots |
| `diagramasBD.js` | Diagramas desde base de datos |
| `emailService.js` | Servicio de envío de emails |
| `historial.js` | Historial de estados de usuarios |
| `permisosUsuarios.js` | Permisos individuales de usuarios |
| `reportes.js` | Reportes (versión anterior) |
| `reportes2.js` | Reportes (versión actual) |
| `scheduler.js` | Programador de tareas y cron jobs |
| `seguridad.js` | Gestión de seguridad y perfiles |
| `skills.js` | Gestión de skills y horarios |
| `usuariosQRM.js` | Gestión de usuarios QRM |

### Estructura de un módulo típico:

```javascript
const express = require('express');
const router = express.Router();

// Configuración de pools (inyectada desde index.js)
let pools = null;
function initPools(p) { pools = p; }

// Rutas del módulo
router.get('/api/endpoint', async (req, res) => {
  // Lógica aquí
});

module.exports = { router, initPools };
```

---

## 🎨 Frontend (`src/`)

### `src/pages/` - Páginas Organizadas por Funcionalidad

| Carpeta | Contenido |
|---------|-----------|
| `Auditoria/` | Logs de auditoría |
| `Cierres/` | Cierre de conversaciones y solicitudes FB |
| `Creaciones/` | Creación de instancias, integraciones |
| `Diagramas/` | Visualización de flujos de bots |
| `DiagramasBD/` | Diagramas desde base de datos |
| `Login/` | Página de autenticación |
| `Reportes/` | Generación de reportes |
| `Skills/` | Gestión de skills y programación |
| `Usuarios/` | Gestión de usuarios, permisos, QRM |

### Convenciones de Nomenclatura:

**CSS Modules:**
- `.usr-*` - Página Usuarios
- `.sk-*` - Página Skills
- `.cr-*` - Página Creaciones
- `.ci-*` - Página Cierres
- `.rep-*` - Página Reportes

**Componentes:**
- PascalCase para componentes React (`ConfirmModal.jsx`)
- camelCase para hooks (`useApi.js`)
- SCREAMING_SNAKE_CASE para constantes globales

---

## 🚀 Cómo Agregar Nuevos Módulos

### Backend:

1. Crear archivo en `server/modules/nombreModulo.js`
2. Exportar `{ router, initPools }`
3. Importar en `server/index.js`:
   ```javascript
   const { router: nombreRoutes } = require('./modules/nombreModulo');
   ```
4. Registrar rutas:
   ```javascript
   app.use('/', nombreRoutes);
   ```

### Frontend:

1. Crear carpeta en `src/pages/NombrePagina/`
2. Crear componente principal `NombrePagina.jsx`
3. Crear estilos `NombrePagina.css`
4. Agregar ruta en `src/App.jsx`

---

## 📋 Checklist de Organización

- [x] Módulos del backend en `server/modules/`
- [x] Tests en `server/tests/`
- [x] Backups en `server/archives/` y `src/_archives/`
- [x] Páginas organizadas por funcionalidad en `src/pages/`
- [x] Componentes compartidos en `src/components/`
- [x] Servicios de API centralizados en `src/services/`
- [x] Configuración en `src/config/`

---

> **Nota:** Los archivos vacíos en `config/`, `utils/` y `middlewares/` están preparados para futura expansión del proyecto.
