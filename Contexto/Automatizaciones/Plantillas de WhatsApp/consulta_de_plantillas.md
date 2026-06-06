# Consulta de Plantillas de WhatsApp

Esta funcionalidad permite a los administradores visualizar el catálogo de plantillas oficiales de WhatsApp configuradas en Gupshup, detallando el estado de aprobación, la estructura multimedia, los parámetros del mensaje y los botones de acción integrados.

---

## 🖥️ Interfaz de Usuario (Frontend)

La interfaz se implementa en el archivo [ContenidoPlantillasWhatsApp.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/ContenidoPlantillasWhatsApp.jsx) y el flujo de consulta en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Panel de Filtros (Topbar)
* **Empresa:** Selector de empresas obtenidas desde el endpoint `/api/empresas-plantillas`.
* **Bot:** Selector reactivo que carga los bots asociados a la empresa seleccionada desde `/api/bots-plantillas?db_key={dbKey}&id_empresa={idEmpresa}`.
* **Estado:** Filtro de estados oficiales de WhatsApp: Todos, Activo, Inactivo.
* **Botón de Consulta:** `🔍 Consultar`

### 2. Flujo de Consulta (`consultarPlantillas`)
1. Valida que haya una empresa seleccionada.
2. Activa el estado de carga (`loadingPlantillas = true`).
3. Llama al endpoint de consulta en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
   * **URL:** `GET /api/plantillas-whatsapp?db_key={dbKey}&id_empresa={idEmp}&id_bot={idBot}&estado={estado}`
4. Guarda las plantillas en `plantillasData` y muestra una notificación con el conteo de plantillas cargadas.
5. Desactiva el estado de carga (`loadingPlantillas = false`).

### 3. Tarjeta de Plantilla (`wa-card`)
El listado renderiza una cuadrícula de tarjetas con la siguiente información:
* **Estado Gupshup (Badge):** Convierte el código numérico de estado de Gupshup a etiquetas visuales legibles:
  * `0` -> 🛑 `DELETED`
  * `1` -> ✅ `APPROVED`
  * `2` -> ⏳ `PENDING`
  * `3` -> ❌ `REJECTED`
  * `4` -> ⚠️ `FAILED`
* **Badge de Categoría:** Categoría de la plantilla (e.g., Marketing, Utility).
* **Badge de Carrusel:** Si `tipo_plantilla === 1`, indica que es un carrusel interactivo de WhatsApp.
* **Título de la Plantilla:** Nombre registrado de la plantilla.
* **Vista Previa de Multimedia:** Si la plantilla contiene archivos adjuntos (`media_url`):
  * Muestra una previsualización de imagen (`<img>`), video (`<video>`) o un enlace de descarga para documentos.
* **Mensaje Mapeado:** Muestra el texto de la plantilla. Los parámetros variables (ej: `{{1}}`, `{{2}}`) se identifican mediante una expresión regular en la función `formatearMensaje` y se formatean con estilos destacados (`wa-param`) en color para distinguirlos del texto estático.
* **Vista Previa de Botones:** Muestra botones rápidos estilizados según el tipo:
  * `QUICK_REPLY` (Prefijo ↩️)
  * `URL` (Prefijo 🔗)
  * `PHONE_NUMBER` (Prefijo 📞)

### 4. Panel de Detalles Expandible
Al hacer clic sobre la tarjeta de una plantilla, esta se expande para revelar la configuración técnica:
* Enlaces y URL multimedia configurados.
* Listado de variables de parámetros (orden y nombre).
* Información detallada de enlaces URL de botones y números telefónicos.
