# Historial de Ejecuciones (Facebook)

Esta funcionalidad permite consultar las ejecuciones anteriores del proceso de eliminación de solicitudes de Facebook y auditar en detalle qué solicitudes de borrado fueron actualizadas.

---

## 🖥️ Interfaz de Usuario (Frontend)

El historial se muestra en la pestaña **"Historial"** dentro de `PanelTareaProgramada` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Obtención de Datos (`cargarLog`)
* Realiza una llamada `GET` al endpoint:
  * **URL:** `GET /api/tareas/log?tipo=facebook&db_key={dbKey}`
* Almacena los resultados en el estado `log`.
* **Auto-expansión:** Identifica el último log que contenga solicitudes modificadas (verificando la estructura en `DETALLE_IDS`) y establece `logExpandido = ID_LOG`.

### 2. Tabla de Ejecuciones y Detalle Expandido
Muestra los últimos 5 logs:
* Si la tarea terminó con éxito (`OK = 1`), muestra un chip verde con el número de solicitudes actualizadas a "completado" (`{afectados} cerradas`).
* Al hacer clic en **"Ver detalle"**, se parsea el campo JSON de logs `DETALLE_IDS` y se renderiza una tabla secundaria:
  * Columns:
    * `#` (Índice de fila)
    * `ID Solicitud` (Código de la solicitud)
    * `ID Usuario Facebook` (Código de Facebook del usuario)
    * `Fecha Solicitud` (Fecha formateada localmente en GT)
    * `Días Pendiente` (Antigüedad calculada en días)
    * `Estado` (Estado de la solicitud, e.g., "procesando" o "completado")

---

## ⚙️ Backend e Historial en Base de Datos

La consulta de logs históricos se extrae de la base de datos central a través del controlador Express en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### 1. Consulta SQL
El backend realiza una resta de 8 horas para formatear las marcas de tiempo UTC en hora local de Guatemala para la visualización del cliente:
```sql
SELECT L.ID_LOG, L.TIPO, L.DB_KEY, L.OK, L.AFECTADOS, L.DETALLE_IDS, L.ERROR,
       DATE_FORMAT(
           DATE_SUB(L.EJECUTADO_EL, INTERVAL 8 HOUR),
           '%Y-%m-%d %H:%i:%s'
       ) AS EJECUTADO_EL
FROM SCHEDULER_TAREAS_LOG L
WHERE L.TIPO = 'facebook' AND L.DB_KEY = ?
ORDER BY L.EJECUTADO_EL DESC
LIMIT 100
```

### 2. Formato de Logs de Afectados
El campo `DETALLE_IDS` contiene un array JSON de objetos serializados que representan las solicitudes antes de ser procesadas, lo que permite visualizar la trazabilidad de qué registros cambiaron exactamente de estado en cada corrida automática.
```json
[
  {
    "ID_SOLICITUD": "1234567890",
    "ID_USUARIO_FACEBOOK": "fb_user_999",
    "FECHA_SOLICITUD": "2026-06-01T12:00:00.000Z",
    "DIAS_PENDIENTE": 4,
    "ESTADO": "procesando"
  }
]
```
