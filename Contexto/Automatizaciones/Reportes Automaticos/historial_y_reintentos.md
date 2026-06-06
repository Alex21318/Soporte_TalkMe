# Historial de Reportes y Reintentos Manuales

Esta sección documenta la auditoría histórica de descargas de reportes y el mecanismo del backend para volver a procesar (reintentar) trabajos fallidos.

---

## 🖥️ Interfaz de Usuario (Frontend)

El historial se gestiona en la pestaña **"Historial"** (estado `tab === 'historial'`) dentro de `ContenidoReportesAuto` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Tabla de Logs de Descarga (`cargarHistorial`)
* Al abrir la pestaña, se llama a `cargarHistorial()`, la cual realiza una llamada `GET` al endpoint:
  * **Endpoint:** `GET /api/scheduler/log`
* Muestra el listado de ejecuciones pasadas con columnas como:
  * **Fecha de Ejecución:** Día al que corresponden los datos del reporte.
  * **Reporte / Clave:** Nombre de la regla del reporte.
  * **Resultado:**
    * Si fue exitoso: chip verde con el total de registros e indicativo del nombre del archivo.
    * Si falló: chip rojo detallando el error.
  * **Acciones:** Si la descarga falló o no se generó el archivo, se habilita un botón `🔄 Reintentar` para forzar su recreación manual.

### 2. Disparar Reintento (`reintentarReporte`)
1. Al hacer clic en reintentar, se activa el estado de reintento (`reintentando(id_log) = true`).
2. Envía una petición `POST` al endpoint:
   * **URL:** `POST /api/scheduler/reintentar`
   * **Payload (JSON):** `{ "id_log": id_log }`
3. **Manejo de Respuesta:**
   * **Éxito:** Muestra una notificación exitosa (`toast.success`) indicando cuántos registros se obtuvieron, invoca de nuevo a `cargarHistorial()` para refrescar la tabla con el nuevo estado del log y registra una auditoría de soporte con tipo de acción `REINTENTAR`.
   * **Fallo:** Muestra notificación con la descripción del error.
4. Desactiva el estado `reintentando`.

---

## ⚙️ Backend y Reconstrucción del Reporte

La lógica para volver a ejecutar un reporte a partir de su ID de log se gestiona en Express en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### Endpoint de Reintento
* **Ruta:** `/api/scheduler/reintentar`
* **Método:** `POST`

### Flujo de Ejecución en el Servidor
1. **Búsqueda del Log Histórico:** Realiza una consulta `JOIN` entre la tabla de logs y la tabla de especificaciones del reporte para recuperar los parámetros con los que fue programado originalmente:
   ```sql
   SELECT L.*, D.TIPO_REPORTE, D.DB_KEY, D.ID_EMPRESA, D.CARPETA, D.NOMBRE,
          D.FORMATO, D.SKILLS, D.ID_BOTS, D.ID_BROADCASTS, 
          D.ID_FORMULARIO, D.TEXTO_BUSCAR, D.FLUJO
   FROM SCHEDULER_LOG L
   JOIN SCHEDULER_REPORTES_DETALLE D ON L.CLAVE = D.CLAVE
   WHERE L.ID_LOG = ?
   LIMIT 1
   ```
2. **Reconstrucción de Parámetros:**
   * Extrae la fecha del reporte original `FECHA_EJECUCION`.
   * Parsea los campos guardados en formato JSON (como `SKILLS`, `ID_BOTS`, `ID_BROADCASTS`).
3. **Petición al Endpoint de Reportes:**
   * Determina a qué ruta interna de la API redirigir la consulta según el tipo de reporte (ej: `/api/reportes/detallado`, `/api/reportes/resumido`, `/api/reportes/grupoq`, etc.).
   * Realiza una llamada HTTP `POST` a dicho endpoint inyectando la base de datos de origen, ID de empresa, rango de fechas (el cual se establece como la fecha original del reporte para mantener la fidelidad histórica) y filtros específicos.
4. **Generación de Archivo y Log:**
   * Si la llamada devuelve datos (`rows.length > 0`), invoca `guardarArchivo()` para escribir el nuevo libro de Excel o CSV en la carpeta destino original del disco duro.
   * Inserta un nuevo log en `SCHEDULER_LOG` marcándolo con la bandera de reintento (`reintento: true`) y vinculándolo con el ID de log original (`id_log_original`).
5. Devuelve la confirmación exitosa con la cantidad de registros recuperados y el nombre de archivo generado.
