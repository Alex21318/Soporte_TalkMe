# Visor de Logs de Auditoría del Sistema

Esta funcionalidad proporciona a los administradores un registro inmutable de todas las acciones críticas e incidencias de soporte realizadas en los diferentes módulos de la aplicación.

---

## 🖥️ Interfaz de Usuario (Frontend)

La interfaz se define en [Auditoria.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Auditoria/Auditoria.jsx) y su hoja de estilos en [Auditoria.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Auditoria/Auditoria.css).

### 1. Panel de Estadísticas Consolidadas (`stats`)
Al cargar la pantalla se renderiza un resumen rápido con tarjetas de métricas sobre el rango de fechas seleccionado:
* **Total Logs:** Conteo total de registros en la vista.
* **Exitosos:** Conteo de transacciones que terminaron correctamente.
* **Errores:** Conteo de transacciones fallidas.
* **Usuarios Activos:** Total de operadores únicos que realizaron alguna acción.

### 2. Panel de Filtros de Auditoría
El usuario puede acotar las búsquedas utilizando las siguientes opciones de filtrado:
* **Fecha Desde / Fecha Hasta:** Rango temporal de búsqueda.
* **Tipo de Acción:** Filtro desplegable con acciones del sistema cargadas de forma dinámica (ej: `INSERT`, `UPDATE`, `DELETE`, `LOGIN`, `PERMISO_MASIVO`).
* **Entidad:** Tipo de recurso del sistema afectado (ej: `SKILL`, `BOT_RED`, `TIPO_CLIENTE`, `USUARIO`).
* **Usuario:** Entrada de texto para buscar acciones de un operador específico.
* **Botón 🧹 Limpiar:** Restablece todos los filtros a sus valores por defecto.

### 3. Tabla de Logs de Auditoría
Muestra los registros coincidentes de forma paginada (límite de 50 filas por página). La tabla se conforma por:
* **Fecha y Hora:** Formateada a zona horaria de Guatemala (`toLocaleString('es-GT')`).
* **Acción:** Badge con color condicional y emoji representativo de la acción (e.g. ✅ para inserción, ✏️ para actualizaciones, 🔑 para inicios de sesión).
* **Ventana:** Nombre simplificado de la sección de la aplicación a la que corresponde (e.g., Skills, Usuarios, Seguridad, Creaciones).
* **Usuario:** Nombre de la persona que ejecutó la acción y su dirección IP (`IP_ADDRESS`).
* **Base de Datos:** Base de datos sobre la que se operó (e.g., Talkme S1, Ficohsa S2).
* **Detalle:** Renderizado condicional mediante la función `formatearDetalle`:
  * *Acciones de Horarios:* Despliega una cuadrícula estructurada indicando la Skill, Empresa, Horario Original, Horario Nuevo y la Fecha de Aplicación.
  * *Acciones generales:* Muestra la descripción descriptiva guardada, el usuario afectado, la skill implicada y el bot.
* **Resultado:** Badge de éxito (✓) o error (✗) con clases CSS condicionales.

---

## ⚙️ Backend y Servicios

Las peticiones HTTP se derivan al servicio definido en `src/services/auditoriaService.js`, el cual consume las siguientes rutas protegidas de la API centralizadas en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
* **`GET /api/auditoria/logs`**: Recupera el listado paginado y filtrado de logs.
* **`GET /api/auditoria/stats`**: Obtiene el conteo consolidado de aciertos, errores y usuarios.
* **`GET /api/auditoria/tipos-accion`**: Obtiene el listado de tipos únicos de acciones para rellenar los filtros.
