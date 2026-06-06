# Botón de Ejecutar Manualmente

El sistema proporciona dos modalidades diferentes para ejecutar manualmente el cierre de conversaciones que tienen más de 30 días abiertas. Esta sección documenta detalladamente el flujo de control, los endpoints implicados y el comportamiento de las consultas a base de datos para cada modalidad.

---

## 1. Ejecutar Cierre Masivo desde el Listado (Visualización)

Esta modalidad se ejecuta directamente desde la lista de previsualización de conversaciones encontradas, permitiendo cerrar de forma masiva únicamente las conversaciones identificadas para la base de datos seleccionada.

### Flujo en el Frontend
1. **Disponibilidad:** El botón `⚡ Ejecutar cierre (X)` se despliega en la barra superior del listado de conversaciones (`ContenidoConversaciones` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx)) solo cuando la previsualización de conversaciones ya ha sido consultada y contiene al menos un elemento (`previewConv.length > 0`).
2. **Confirmación:** Al hacer clic, se activa el modal de confirmación (`showEjecutarConvModal = true`).
3. **Petición HTTP:** Al confirmar, se invoca `confirmEjecutarConv` la cual:
   * Activa el estado de carga (`loadingExecConv = true`).
   * Envía una petición `POST` al endpoint:
     * **URL:** `POST /api/cierres/ejecutar`
     * **Payload (JSON):** `{ "db_key": dbKey }`
4. **Manejo de Respuesta:**
   * **Éxito:** Muestra una notificación exitosa (`toast.success`) indicando la cantidad de conversaciones cerradas, actualiza el estado de resultado (`resultadoConv`) y limpia la previsualización (`previewConv = null`), transicionando la vista a la pantalla de "Cierre completado".
   * Además, importa dinámicamente `auditoriaService` y registra la acción en el log del sistema bajo la clave `CIERRE_MANUAL`.

### Transacción en el Backend
La petición se recibe en el controlador de Express mapeado en [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js). Todo el proceso se ejecuta dentro de una transacción SQL para garantizar la consistencia de los datos en los siguientes pasos:

#### Paso 1: Inicialización de la Resolución por Defecto
Crea el tipo de resolución "Conversación en atención" para todas las empresas asociadas a conversaciones candidatas al cierre que aún no lo tengan registrado:
```sql
INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR, CREADO_EL)
SELECT DISTINCT C.ID_EMPRESA,
       'Conversación en atención',
       1, 0, 1,
       'Sistema.TalkMe',
       ?
FROM CONVERSACIONES_VW C
LEFT JOIN TIPOS_RESOLUCIONES TR
    ON TR.ID_EMPRESA = C.ID_EMPRESA
   AND TR.RESOLUCION = 'Conversación en atención'
WHERE C.ESTADO_CONVERSACION != 3
  AND DATEDIFF(?, C.FECHA_CONVERSACION) >= 30
  AND TR.ID_TIPO_RESOLUCION IS NULL
```

#### Paso 2: Recopilación de Detalles de Conversación
Busca los detalles de las conversaciones que van a ser cerradas para auditoría interna y construcción del log antes de la actualización:
```sql
SELECT 
    C.ID_CONVERSACION,
    E.NOMBRE AS EMPRESA,
    CV.FECHA_CONVERSACION AS FECHA_INICIO,
    DATEDIFF(?, CV.FECHA_CONVERSACION) AS DIAS_ABIERTA,
    'Abierta' AS ESTADO
FROM CONVERSACIONES C
JOIN CONVERSACIONES_VW CV ON CV.ID_CONVERSACION = C.ID_CONVERSACION
JOIN EMPRESAS E ON E.ID_EMPRESA = CV.ID_EMPRESA
WHERE CV.ESTADO_CONVERSACION != 3
  AND DATEDIFF(?, CV.FECHA_CONVERSACION) >= 30
  AND EXISTS (
      SELECT 1 FROM USUARIOS U
      WHERE U.ID_EMPRESA = CV.ID_EMPRESA
        AND U.NOMBRE_USUARIO LIKE '%Bot%'
  )
  AND EXISTS (
      SELECT 1 FROM TIPOS_GESTION TG
      WHERE TG.ID_EMPRESA = CV.ID_EMPRESA
        AND TG.GESTION LIKE '%Consultas%'
  )
GROUP BY C.ID_CONVERSACION, E.NOMBRE, CV.FECHA_CONVERSACION
```

#### Paso 3: Cierre de las Conversaciones en la Base de Datos
Actualiza el estado de las conversaciones vencidas.
* Asigna el propietario a un usuario de tipo **Bot** de la empresa (`NOMBRE_USUARIO LIKE '%Bot%'`).
* Asigna el tipo de gestión a **Consultas** (`GESTION LIKE '%Consultas%'`).
* Cambia el estado a **`3`** (Cerrado).
* Registra la fecha de finalización (`FECHA_FINALIZACION = ahora`).
```sql
UPDATE CONVERSACIONES C
JOIN CONVERSACIONES_VW CV ON CV.ID_CONVERSACION = C.ID_CONVERSACION
JOIN (
    SELECT U.ID_EMPRESA, U.ID_USUARIO
    FROM USUARIOS U
    WHERE U.NOMBRE_USUARIO LIKE '%Bot%'
) U ON U.ID_EMPRESA = CV.ID_EMPRESA
JOIN (
    SELECT TG.ID_EMPRESA, TG.ID_TIPO_GESTION
    FROM TIPOS_GESTION TG
    WHERE TG.GESTION LIKE '%Consultas%'
) TG ON TG.ID_EMPRESA = CV.ID_EMPRESA
SET
    C.ID_USUARIO = U.ID_USUARIO,
    C.ID_GESTION = TG.ID_TIPO_GESTION,
    C.ESTADO = 3,
    C.FECHA_FINALIZACION = ?
WHERE CV.ESTADO_CONVERSACION != 3
  AND DATEDIFF(?, CV.FECHA_CONVERSACION) >= 30
```

#### Paso 4: Inserción de Resoluciones de Cierre
Registra el justificante de cierre en la tabla `RESOLUCIONES` asociando el ID de la conversación con la resolución por defecto e indicando que fue finalizado por el bot:
```sql
INSERT INTO RESOLUCIONES (ID_CONVERSACION, TIPO_RESOLUCION, RESOLUCION, CREADO_POR, CREADO_EL)
SELECT
    C.ID_CONVERSACION,
    TR.ID_TIPO_RESOLUCION,
    'Cierre automático del sistema con más de 30 días en atención.',
    'BOT',
    ?
FROM CONVERSACIONES C
JOIN CONVERSACIONES_VW CV ON CV.ID_CONVERSACION = C.ID_CONVERSACION
JOIN TIPOS_RESOLUCIONES TR
    ON TR.ID_EMPRESA = CV.ID_EMPRESA
   AND TR.RESOLUCION = 'Conversación en atención'
LEFT JOIN RESOLUCIONES R
    ON R.ID_CONVERSACION = C.ID_CONVERSACION
WHERE C.ESTADO = 3
  AND C.FECHA_FINALIZACION = ?
  AND R.ID_CONVERSACION IS NULL
```

---

## 2. Ejecutar Ahora desde el Panel de Tareas Programadas

Esta opción permite forzar la simulación o el disparo inmediato de la tarea programada desde el backend de manera síncrona sin tener que esperar a que llegue la hora configurada en el cron job diario.

### Flujo en el Frontend
1. **Disponibilidad:** El botón `▶ Ejecutar ahora` se ubica en las acciones del panel `PanelTareaProgramada` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx), siempre y cuando el objeto `tarea` no sea nulo.
2. **Acción (`ejecutarAhora`):**
   * Activa el estado local de ejecución (`ejecutando = true`).
   * Envía una petición `POST` al endpoint:
     * **URL:** `POST /api/tareas/ejecutar-ahora`
     * **Payload (JSON):** `{ "tipo": "cierres", "db_key": dbKey }`
3. **Manejo de Respuesta:**
   * Muestra la notificación de éxito e invoca `cargarUltimoLog()` y `cargarLog()` para actualizar inmediatamente los indicadores del panel y la tabla de historial con la nueva entrada del log.
   * Guarda un log de auditoría local en el sistema con la acción `CIERRE_MANUAL` y la entidad `AUTOMATIZACIONES`.
   * Restablece el estado `ejecutando = false`.

### Comportamiento en el Backend (Scheduler)
La solicitud es administrada en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js):
1. **Endpoint REST:** `/api/tareas/ejecutar-ahora`
   * Busca la tarea registrada que coincide con el tipo `'cierres'` y la base de datos `db_key`. Si no existe, devuelve error `404`.
   * Invoca de forma asíncrona la función `ejecutarTarea(tarea)`.
2. **Ejecución de la Tarea (`ejecutarTarea`):**
   * Dispara una llamada HTTP `POST` a la API interna del servidor: `http://localhost:3001/api/cierres/ejecutar` pasando en el cuerpo `{ db_key: DB_KEY }`.
   * Configura un límite de tiempo de espera (Timeout) de 30 segundos.
   * **Manejo de Resultados:**
     * **Si la API responde con éxito:** Lee la cantidad de registros procesados, recupera los datos del array `detalle_conversaciones`, y genera un registro de log de ejecución exitosa en la tabla de historial invocando `guardarLogTarea` con `ok = true`.
     * **Si la API falla o excede el tiempo de espera:** Captura la excepción, la registra en la consola del servidor y guarda un log de error en `guardarLogTarea` con `ok = false` y el texto de la traza de error.
