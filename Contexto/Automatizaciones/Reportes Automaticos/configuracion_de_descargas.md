# Configuración general de Reportes Automáticos

Esta sección documenta la pestaña de configuración del programador (Scheduler) que se encarga de generar los reportes periódicos en formatos Excel o CSV y guardarlos en directorios físicos locales.

---

## 🖥️ Interfaz de Usuario (Frontend)

La gestión se realiza dentro de la sub-pestaña **"Configurar"** del componente `ContenidoReportesAuto` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Panel de Configuración General
* **Hora de ejecución (GT):** Entrada de tiempo para indicar a qué hora local de Guatemala se debe disparar el scheduler diariamente.
* **Estado Activo (Checkbox/Toggle):** Activa o desactiva la ejecución programada diaria de los reportes.
* **Botón de Guardar:** `💾 Guardar configuración` que dispara la función `guardar()`.

### 2. Tabla de Reglas de Descarga
Muestra las reglas de reportes configurados para descargarse automáticamente:
* **Reporte:** Tipo de reporte a generar (Operaciones, Resoluciones, Grupo Q, etc.) de acuerdo al listado estático `TIPOS_REPORTE`.
* **Carpeta Destino:** Ruta física local del disco duro donde se guardará el archivo generado.
* **Formato:** Formato del archivo (XLSX o CSV) representado con un badge estilizado.
* **Estado:** Indica si esa descarga particular está activa.
* **Acciones:**
  * **Editar:** Habilita la edición de la regla.
  * **Eliminar:** Invoca `eliminarReporte(clave)` que envía una petición `DELETE` a la API (`DELETE /api/scheduler/reporte/:clave`) y vuelve a cargar la configuración en silencio.

### 3. Flujo al Guardar Configuración (`guardar`)
1. Envía la configuración en el cuerpo de una petición `POST` al endpoint:
   * **URL:** `POST /api/scheduler/config`
2. El servidor responde con el estado guardado, y muestra una notificación:
   * Si está activo: `"✅ Scheduler activo — {hora} hora Guatemala"`
   * Si está inactivo: `"💾 Configuración guardada. Scheduler desactivado."`

---

## ⚙️ Backend y Planificador (Scheduler)

La base de datos y la orquestación del tiempo se manejan en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### 1. Carga y Guardado de Configuración
* **`GET /api/scheduler/config`**: Lee la configuración actual.
* **`POST /api/scheduler/config`**: Actualiza los parámetros del scheduler en la base de datos y reconfigura los cron jobs en memoria.

### 2. Orquestación del Cron Job Diario
Al arrancar el servidor o actualizar la configuración, se invoca `programarCron()`:
1. Revisa si el scheduler está marcado como activo y tiene una hora configurada.
2. Detiene cualquier cron job previo en memoria para descargas de reportes.
3. Convierte la hora local de Guatemala a UTC (sumando 6 horas):
   ```javascript
   const hhUTC = (hh + 6) % 24;
   const expr = `${mm} ${hhUTC} * * *`;
   ```
4. Programa el trabajo cron diario para generar y enviar reportes automáticamente:
   ```javascript
   cron.schedule(expr, async () => {
       console.log(`[Scheduler] ⏰ Iniciando corrida programada...`);
       await ejecutarReportesScheduled(); // Genera los reportes, los guarda y envía emails
   }, { timezone: 'UTC' });
   ```
5. **Generación de Archivos:** `guardarArchivo()` se encarga de crear el libro de Excel utilizando la librería `exceljs` para reportes normales, o genera archivos planos formateados en CSV con codificación UTF-8 con BOM (`\uFEFF`) para reportes especiales de Grupo Q.
