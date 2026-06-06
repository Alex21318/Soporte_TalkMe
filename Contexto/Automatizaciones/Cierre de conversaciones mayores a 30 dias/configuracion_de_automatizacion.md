# Configuración de Automatización (Tarea Programada)

Esta sección describe cómo el sistema permite configurar una tarea programada recurrente para que el proceso de cierre de conversaciones mayores a 30 días se ejecute de forma autónoma todos los días a una hora específica.

---

## 🖥️ Interfaz de Usuario (Frontend)

La configuración se realiza dentro del panel lateral de tareas programadas (`PanelTareaProgramada`) definido en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Elementos del Formulario
* **Hora de ejecución (GT):** Entrada de tipo hora (`<input type="time">`) que representa la hora en la que se desea ejecutar la tarea (en zona horaria de Guatemala).
* **Ejecución automática (Checkbox/Toggle):** Un switch que permite activar o desactivar la ejecución diaria automática.
* **Botón de Guardar:** `💾 Guardar configuración`

### 2. Flujo de Control al Guardar (`guardar`)
1. Valida que el campo de hora no esté vacío; de lo contrario, muestra una alerta (`toast.error('Selecciona una hora')`).
2. Cambia el estado a guardando (`guardando = true`).
3. Envía una petición `POST` al endpoint configurado en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
   * **Endpoint:** `POST /api/tareas`
   * **Payload (JSON):**
     ```json
     {
       "tipo": "cierres",
       "db_key": "db_X",
       "hora": "HH:MM",
       "activo": true,
       "nombre": "Cierre Conv. Talkme S1"
     }
     ```
4. **Manejo de Respuesta:**
   * **Si es exitosa (OK):** Muestra una notificación de éxito (`toast.success('Tarea guardada')`) y vuelve a cargar los datos de la tarea (`cargarTarea()`) para actualizar el panel de estado.
   * **Si falla:** Captura el error y lo muestra en una notificación de alerta.
5. Cambia el estado `guardando` a `false`.

### 3. Cargar Configuración Existente (`cargarTarea`)
Al renderizar el panel, se ejecuta automáticamente `cargarTarea` para comprobar si ya existe una tarea programada configurada:
* Realiza un `GET` a `/api/tareas` y busca una coincidencia con el `tipo === 'cierres'` y la base de datos `dbKey`.
* Si existe, rellena los campos del formulario con la hora y el estado de activación guardados.
* Registra una acción de búsqueda en el log de auditoría mediante `auditoriaService.registrarLog` bajo el tipo de acción `BUSQUEDA`.

---

## ⚙️ Backend y Motor de Programación (Scheduler)

El backend procesa la petición de guardado y administra el ciclo de vida del cron job en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### 1. Endpoint de Guardado (Upsert)
* **Ruta:** `/api/tareas`
* **Método:** `POST`
* **Lógica:**
  * Valida que los campos `tipo`, `db_key` y `hora` estén presentes.
  * Ejecuta una consulta de inserción con actualización duplicada (`UPSERT`) en la tabla `SCHEDULER_TAREAS`:
    ```sql
    INSERT INTO SCHEDULER_TAREAS (TIPO, DB_KEY, HORA_GT, ACTIVO, NOMBRE)
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE HORA_GT=VALUES(HORA_GT), ACTIVO=VALUES(ACTIVO), NOMBRE=VALUES(NOMBRE)
    ```
    *Parámetros:* `[tipo, db_key, hora + ':00', activo ? 1 : 0, nombre || tipo]`.
    *(La hora se almacena en formato completo HH:MM:SS).*
  * Llama a `programarCronTareas()` para reconstruir los disparadores de tareas en memoria.

### 2. Motor de Programación en Memoria (`programarCronTareas`)
El archivo [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js) utiliza el paquete `node-cron` para programar tareas. El proceso de programación sigue estos pasos:

1. **Limpieza:** Detiene todos los cron jobs de tareas que estén cargados actualmente en memoria ejecutando `.stop()` en cada uno de ellos y vacía el array de control `cronJobsTareas`.
2. **Consulta de Activas:** Consulta en la base de datos todas las tareas configuradas como activas y que tengan una hora de ejecución definida (`SELECT ... FROM SCHEDULER_TAREAS`).
3. **Agrupación por Hora:** Para evitar la sobrecarga de múltiples temporizadores, agrupa las tareas que comparten la misma hora exacta en un solo cron job.
4. **Conversión de Zona Horaria (GT a UTC):**
   * El usuario introduce la hora en formato de Guatemala (GT, UTC-6).
   * El servidor ejecuta los cron jobs en zona horaria UTC.
   * Por lo tanto, el backend realiza la conversión de hora sumando 6 horas a la hora ingresada:
     ```javascript
     const [hh, mm] = hora.split(':').map(Number);
     const hhUTC = (hh + 6) % 24; // Conversión GT a UTC
     const expr = `${mm} ${hhUTC} * * *`; // Expresión Cron
     ```
5. **Programación del Cron Job:** Crea el planificador diario con la expresión cron calculada:
   ```javascript
   const job = cron.schedule(expr, async () => {
       console.log(`[TareasScheduler] ⏰ Ejecutando ${grupo.length} tarea(s) a las ${hora} GT`);
       for (const t of grupo) {
           await ejecutarTarea(t); // Ejecuta el proceso de cierre automático
       }
   }, { timezone: 'UTC' });
   ```
6. Registra el trabajo recién creado en el array global `cronJobsTareas` para poder gestionarlo o detenerlo en el futuro.
