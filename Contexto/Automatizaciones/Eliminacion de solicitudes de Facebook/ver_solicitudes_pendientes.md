# Ver Solicitudes Pendientes (Facebook)

Esta funcionalidad permite consultar las solicitudes pendientes de eliminación de datos enviadas por usuarios de aplicaciones de Facebook en la base de datos seleccionada.

---

## 🖥️ Interfaz de Usuario (Frontend)

La interfaz se implementa en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx) bajo el componente `ContenidoFacebook`.

### 1. Estado Inicial e Interacción
* Cuando no hay previsualizaciones cargadas (`preview === null`), se muestra una tarjeta que invita a realizar la consulta:
  * **Botón:** `🔍 Ver solicitudes pendientes`
  * **Acción:** Invoca a `cargar()` (la cual mapea a la función global `cargarPreviewFb`).

### 2. Función `cargarPreviewFb`
* Activa el estado de carga (`loadingFb = true`) y limpia previsualizaciones y resultados previos (`previewFb = null`, `resultadoFb = null`).
* Realiza una petición `GET` al endpoint:
  * **URL:** `GET /api/facebook/preview?db_key={dbKey}`
* **Manejo de Respuesta:**
  * **Éxito (length > 0):** Asigna las solicitudes recuperadas al estado `previewFb` y muestra un toast informativo (`toast.success`) con el conteo de elementos.
  * **Éxito (length === 0):** Llama a `toast.info('No hay solicitudes de Facebook en estado "procesando"')`.
  * **Fallo:** Registra el error en consola, muestra un toast de alerta e inicializa `previewFb` como un array vacío `[]`.
* Desactiva el estado de carga (`loadingFb = false`).

### 3. Visualización en la Tabla
Cuando los datos se han cargado, se muestra una barra superior con la cantidad de solicitudes en estado "procesando" y una tabla con las columnas:
* **ID:** Identificador interno `ID_ELIMINACION`.
* **ID Solicitud:** Código de la solicitud de Facebook `ID_SOLICITUD`.
* **Usuario ID:** Identificador del usuario de Facebook `USUARIO_ID`.
* **Aplicación:** Nombre de la aplicación de Facebook `NOMBRE_APLICACION`.
* **Fecha Solicitud:** Fecha `FECHA_SOLICITO` formateada localmente en formato `es-GT`.
* **Estado:** Badge con el texto estático **"procesando"** y clase de color `ci-estado-procesando`.

---

## ⚙️ Backend y Base de Datos

La lógica del servidor se gestiona en Express en el archivo [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js).

### Endpoint
* **Ruta:** `/api/facebook/preview`
* **Método:** `GET`
* **Lógica:**
  * Obtiene la base de datos mediante el parámetro `db_key` de la consulta.
  * Ejecuta la consulta SQL:
    ```sql
    SELECT ID_ELIMINACION, ID_SOLICITUD, ESTADO, USUARIO_ID,
           NOMBRE_APLICACION, ALCANCE_DATOS, FECHA_SOLICITO
    FROM FACEBOOK_SOLICITUDES_ELIMINACION_DATOS
    WHERE ESTADO = 'procesando'
    ORDER BY FECHA_SOLICITO ASC
    ```
    *Esta consulta filtra y ordena las solicitudes de borrado que aún no han sido procesadas (`ESTADO = 'procesando'`), priorizando las más antiguas.*
