# Botón de Ejecutar Manualmente (Facebook)

El sistema ofrece dos vías para procesar manualmente y de forma inmediata las solicitudes de eliminación de Facebook pendientes.

---

## 1. Ejecutar Limpieza Masiva desde la Tabla de Previsualización

Permite procesar en el momento las solicitudes de previsualización que se han consultado en pantalla.

### Flujo en el Frontend
1. **Disponibilidad:** El botón `⚡ Marcar como completado (X)` en la barra superior se habilita cuando la previsualización tiene registros (`previewFb.length > 0`).
2. **Confirmación:** Abre el modal de confirmación `showEjecutarFbModal = true`.
3. **Petición HTTP:** Al confirmar, se invoca `confirmEjecutarFb`:
   * Activa el estado de carga (`loadingExecFb = true`).
   * Envía una petición `POST` al endpoint de ejecución:
     * **URL:** `POST /api/facebook/ejecutar`
     * **Payload:** `{ "db_key": dbKey }`
4. **Manejo de Respuesta:**
   * Muestra un toast indicando la cantidad de registros eliminados/actualizados.
   * Asigna el resultado a `resultadoFb`, limpia la previsualización (`previewFb = null`) y transiciona la vista a la pantalla de éxito.
   * Registra una auditoría de sistema `CIERRE_MANUAL` con el contador de registros eliminados.

### Ejecución en el Backend (Base de Datos)
El endpoint es procesado por el router Express en [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js):
1. **Recopilación Previa:** Antes de actualizar, consulta los registros candidatos para guardar los detalles de la auditoría:
   ```sql
   SELECT ID_SOLICITUD, ESTADO
   FROM FACEBOOK_SOLICITUDES_ELIMINACION_DATOS
   WHERE ESTADO = 'procesando'
   ```
2. **Actualización del Estado:** Marca las solicitudes encontradas como completadas:
   ```sql
   UPDATE FACEBOOK_SOLICITUDES_ELIMINACION_DATOS
   SET ESTADO = 'completado'
   WHERE ESTADO = 'procesando'
   ```
3. Retorna `{ ok: true, actualizados: result.affectedRows, ids_solicitudes, detalle_solicitudes }`.

---

## 2. Ejecutar Ahora desde el Panel de Configuración

Fuerza la simulación completa del cron job de Facebook de forma síncrona.

### Flujo en el Frontend
1. **Disponibilidad:** Botón `▶ Ejecutar ahora` en las opciones de `PanelTareaProgramada` si hay una tarea programada guardada.
2. **Acción (`ejecutarAhora`):**
   * Activa el estado `ejecutando = true`.
   * Realiza un `POST` al endpoint:
     * **URL:** `POST /api/tareas/ejecutar-ahora`
     * **Payload:** `{ "tipo": "facebook", "db_key": dbKey }`
3. **Respuesta:** Muestra el toast de éxito, refresca los logs del panel y registra la auditoría `CIERRE_MANUAL` para `AUTOMATIZACIONES`.

### Comportamiento del Scheduler (Backend)
1. El endpoint en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js) localiza la tarea de tipo `'facebook'` en base de datos.
2. Invoca `ejecutarTarea(tarea)`.
3. `ejecutarTarea` realiza una petición HTTP interna `POST http://localhost:3001/api/facebook/ejecutar` pasando la base de datos correspondiente.
4. Si la llamada es exitosa, registra la corrida en `SCHEDULER_TAREAS_LOG` con `ok = 1` y los detalles en formato JSON en `DETALLE_IDS`. Si falla, captura el error y registra en la tabla con `ok = 0` y la traza en `ERROR`.
