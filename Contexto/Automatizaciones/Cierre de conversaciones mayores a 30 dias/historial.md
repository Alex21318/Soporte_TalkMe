# Historial de Ejecuciones

Esta funcionalidad permite al administrador visualizar los resultados históricos de las ejecuciones diarias (tanto automáticas como manuales) de la tarea programada de cierre de conversaciones.

---

## 🖥️ Interfaz de Usuario (Frontend)

El historial se muestra en la pestaña **"Historial"** dentro del panel lateral `PanelTareaProgramada` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Carga de Datos (`cargarLog`)
Cuando el usuario activa la pestaña "Historial", un efecto (`useEffect`) dispara la función `cargarLog`:
1. Activa el estado de carga (`loadingLog = true`).
2. Solicita el historial llamando al endpoint:
   * **Endpoint:** `GET /api/tareas/log?tipo=cierres&db_key={dbKey}`
3. Al recibir los datos, se almacenan en el estado `log`.
4. **Auto-expansión inteligente:** La interfaz busca automáticamente la ejecución más reciente en la lista que contenga registros válidos en su detalle de afectación (comprobando que existan elementos válidos en `DETALLE_IDS`) y la expande por defecto estableciendo el estado `logExpandido = ID_LOG`.
5. Desactiva el estado de carga (`loadingLog = false`).

### 2. Tabla de Ejecuciones Recientes
Muestra las últimas 5 ejecuciones registradas. La tabla contiene tres columnas:
* **Fecha:** Fecha y hora en la que se inició el proceso, formateada en hora local de Guatemala (`YYYY-MM-DD HH:MM:SS`).
* **Resultado:**
  * **Caso de Éxito (OK = 1):** Muestra un chip verde con el número de conversaciones cerradas exitosamente (`{afectados} cerradas`). Si el número de conversaciones detectadas inicialmente difiere del número final de conversaciones cerradas, muestra un indicador de apoyo (`{detectadas} detect.`).
  * **Caso de Error (OK = 0):** Muestra un chip rojo que contiene las primeras 40 letras del mensaje de error (`Error: {mensaje}`). Al posicionar el cursor encima se muestra el error completo en un tooltip.
* **Acciones:** Si la ejecución cerró o detectó conversaciones, se muestra el botón **"Ver detalle"** (u **"Ocultar"** si ya está expandida).

### 3. Panel de Detalles Expandido
Al hacer clic en "Ver detalle", se abre una tabla secundaria inmediatamente debajo de la fila correspondiente que expone el contenido del campo `DETALLE_IDS` (el cual es guardado como un objeto JSON en base de datos):
* **Columnas del Detalle:**
  * `#` (Índice de fila)
  * `ID Conversación`
  * `Empresa`
  * `Fecha Inicio` (Formateada a formato de fecha local `DD/MM/YYYY`)
  * `Días Abierta` (Antigüedad calculada en días)
  * `Estado` (Badge con el estado registrado, e.g., "Abierta")

---

## ⚙️ Backend e Historial en Base de Datos

Las consultas de logs se administran desde el servidor Express en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### 1. Estructura de la Tabla `SCHEDULER_TAREAS_LOG`
Cada vez que finaliza una tarea (ya sea por el programador automático o forzada manualmente), se crea un registro en esta tabla con las siguientes columnas:
* `ID_LOG`: Identificador autonumérico incremental.
* `ID_TAREA`: Referencia a la tarea programada asociada en `SCHEDULER_TAREAS`.
* `TIPO`: Tipo de tarea (`'cierres'`).
* `DB_KEY`: Clave de la base de datos objetivo.
* `OK`: Indicador de éxito (`1` para éxito, `0` para error).
* `AFECTADOS`: Total de registros actualizados en la base de datos.
* `DETALLE_IDS`: Contenido de tipo `TEXT` que almacena un string JSON con el listado detallado de los objetos previsualizados antes de la ejecución.
* `ERROR`: Texto con la traza de excepción si `OK = 0`.
* `EJECUTADO_EL`: Timestamp con fecha y hora UTC de la ejecución.

### 2. Endpoint del Servidor
* **Ruta:** `/api/tareas/log`
* **Método:** `GET`
* **Parámetros:** `tipo` y `db_key`
* **Lógica del Query SQL:**
  La consulta recupera los últimos 100 registros aplicando filtros por tipo de tarea y base de datos, convirtiendo la hora UTC del servidor a hora local:
  ```sql
  SELECT L.ID_LOG, L.TIPO, L.DB_KEY, L.OK, L.AFECTADOS, L.DETALLE_IDS, L.ERROR,
         DATE_FORMAT(
             DATE_SUB(L.EJECUTADO_EL, INTERVAL 8 HOUR),
             '%Y-%m-%d %H:%i:%s'
         ) AS EJECUTADO_EL
  FROM SCHEDULER_TAREAS_LOG L
  WHERE L.TIPO = ? AND L.DB_KEY = ?
  ORDER BY L.EJECUTADO_EL DESC
  LIMIT 100
  ```

> [!WARNING]
> **Ajuste de Zona Horaria:** Obsérvese que en el SQL se resta un intervalo de 8 horas (`DATE_SUB(..., INTERVAL 8 HOUR)`) a la columna `EJECUTADO_EL`. Esto se utiliza para convertir la zona horaria del servidor de base de datos a la zona horaria local de visualización correspondiente al cliente.
