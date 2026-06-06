# Configuración de Automatización (Facebook)

Esta funcionalidad permite automatizar diariamente la limpieza de solicitudes de eliminación de datos de Facebook, programando una tarea que se ejecute diariamente a una hora designada.

---

## 🖥️ Interfaz de Usuario (Frontend)

La configuración utiliza el panel `PanelTareaProgramada` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx) con la propiedad `tipo="facebook"`.

### Flujo de Control al Guardar (`guardar`)
1. El usuario selecciona la **Hora de ejecución** y activa el control de **Ejecución automática**.
2. Al hacer clic en **"Guardar configuración"**, la función `guardar` envía una petición `POST` al endpoint de guardado en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
   * **Endpoint:** `POST /api/tareas`
   * **Payload (JSON):**
     ```json
     {
       "tipo": "facebook",
       "db_key": "db_X",
       "hora": "HH:MM",
       "activo": true,
       "nombre": "Elim. FB Talkme S1"
     }
     ```
3. Muestra una notificación de éxito (`toast.success`) y recarga la información del panel local.

---

## ⚙️ Backend y Motor de Programación (Scheduler)

La persistencia de la tarea programada y la lógica del disparador se gestionan en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### 1. Inserción o Actualización en Base de Datos (Upsert)
El servidor valida los parámetros y ejecuta la consulta SQL:
```sql
INSERT INTO SCHEDULER_TAREAS (TIPO, DB_KEY, HORA_GT, ACTIVO, NOMBRE)
VALUES (?, ?, ?, ?, ?)
ON DUPLICATE KEY UPDATE HORA_GT=VALUES(HORA_GT), ACTIVO=VALUES(ACTIVO), NOMBRE=VALUES(NOMBRE)
```
*Parámetros:* `['facebook', db_key, hora + ':00', activo ? 1 : 0, nombre || 'facebook']`.

### 2. Conversión Horaria y Registro del Cron Job
Al invocar `programarCronTareas()`, el scheduler realiza los siguientes pasos:
1. Revisa las tareas activas de tipo `'facebook'` en la tabla.
2. Agrupa por horas compartidas y convierte la hora de Guatemala a UTC sumando 6 horas:
   ```javascript
   const hhUTC = (hh + 6) % 24;
   const expr = `${mm} ${hhUTC} * * *`;
   ```
3. Registra el trabajo cron que ejecutará periódicamente el proceso de borrado:
   ```javascript
   const job = cron.schedule(expr, async () => {
       for (const t of grupo) {
           await ejecutarTarea(t); // Ejecuta la limpieza de logs de Facebook
       }
   }, { timezone: 'UTC' });
   ```
