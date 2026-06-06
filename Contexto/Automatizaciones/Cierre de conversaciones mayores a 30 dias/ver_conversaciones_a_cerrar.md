# Ver Conversaciones a Cerrar (+30 días)

Esta funcionalidad permite al usuario consultar y previsualizar en tiempo real qué conversaciones de la base de datos seleccionada llevan abiertas más de 30 días y son candidatas para el cierre automático.

---

## 🖥️ Interfaz de Usuario (Frontend)

La interfaz se gestiona en el archivo del frontend [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx) a través del componente secundario `ContenidoConversaciones`.

### 1. Estado Inicial y Acción del Usuario
Cuando no hay datos cargados en el estado (`preview === null`), se muestra una tarjeta de bienvenida con el botón:
* **Botón:** `🔍 Ver conversaciones a cerrar`
* **Acción:** Llama a la función `cargar()` (la cual ejecuta la función principal `cargarPreviewConv`).

### 2. Flujo de Control en React (`cargarPreviewConv`)
La función `cargarPreviewConv` gestiona el estado de carga y obtención de datos de la siguiente manera:
1. Activa el estado de carga (`loadingConv = true`) y limpia previsualizaciones previas y estados de resultados (`previewConv = null`, `resultadoConv = null`).
2. Llama al servicio de autenticación y realiza una petición HTTP `GET` al endpoint configurado en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
   * **URL:** `GET /api/cierres/preview?db_key={dbKey}`
3. **Manejo de Respuesta:**
   * **Si se encuentran registros (length > 0):** Almacena el listado en `previewConv` y muestra una notificación de éxito (`toast.success`) indicando el número de conversaciones encontradas.
   * **Si no se encuentran registros (length === 0):** Muestra una notificación informativa (`toast.info`) avisando que no hay conversaciones por cerrar.
   * **En caso de error:** Captura la excepción, muestra una alerta de error (`toast.error`) y establece el estado `previewConv` como un array vacío `[]`.
4. Finalmente, desactiva el estado de carga (`loadingConv = false`).

### 3. Visualización y Filtrado de los Datos
Una vez cargados los datos, se renderiza lo siguiente:
* **Barra de resumen:** Muestra el número total de conversaciones identificadas y la cantidad de empresas únicas involucradas (`empresasUnicas`).
* **Selector de Filtro por Empresa:** Un elemento `<select>` que permite filtrar las filas de la tabla según la columna `NOMBRE_EMPRESA`.
  * *Lógica:* Al seleccionar una empresa, se actualiza el estado local y se renderizan únicamente las conversaciones que coincidan con dicho filtro (`previewFiltrado`).
* **Tabla de Resultados:** Muestra las siguientes columnas:
  * **ID Conversación:** Identificador único con estilo de tag.
  * **Empresa:** Nombre de la empresa a la que pertenece la conversación.
  * **Fecha Inicio:** Fecha de inicio de la conversación formateada con `toLocaleDateString` en formato local (`es-GT`).
  * **Días Abierta:** Badge con colores condicionales según la antigüedad en [Cierres.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.css):
    * `>= 90 días` 🔴 Clase `critico` (Urgencia crítica).
    * `>= 60 días` 🟠 Clase `alto` (Urgencia alta).
    * `< 60 días` 🟡 Clase `medio` (Urgencia media).
  * **Estado:** Etiqueta estática con el texto **"Abierta"**.

---

## ⚙️ Backend y Acceso a Datos

La petición de previsualización es recibida en el backend por el router express definido en [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js).

### Endpoint
* **Ruta:** `/api/cierres/preview`
* **Método:** `GET`
* **Controlador:**
  ```javascript
  router.get('/api/cierres/preview', async (req, res) => { ... })
  ```

### Lógica de Ejecución en el Servidor
1. Extrae el parámetro `db_key` de la consulta (`req.query`). Si no está presente, devuelve un código `400 Bad Request`.
2. Obtiene la conexión correspondiente a la base de datos indicada por `db_key` desde el pool de conexiones (`pools[db_key]`).
3. Ejecuta la consulta SQL para recuperar las conversaciones que cumplen con las condiciones de vencimiento.

### Consulta SQL Detallada
La consulta ejecutada en la base de datos es la siguiente:
```sql
SELECT
    CV.ID_CONVERSACION,
    CV.ID_EMPRESA,
    E.NOMBRE AS NOMBRE_EMPRESA,
    CV.FECHA_CONVERSACION,
    DATEDIFF(NOW(), CV.FECHA_CONVERSACION) AS DIAS_ABIERTA,
    CV.ESTADO_CONVERSACION
FROM CONVERSACIONES_VW CV
JOIN EMPRESAS E ON E.ID_EMPRESA = CV.ID_EMPRESA
WHERE CV.ESTADO_CONVERSACION != 3
  AND DATEDIFF(NOW(), CV.FECHA_CONVERSACION) >= 30
ORDER BY DIAS_ABIERTA DESC
```

#### Detalles de la Consulta:
* **`CONVERSACIONES_VW CV`**: Se consulta una vista consolidada de conversaciones en lugar de la tabla base para obtener datos precalculados y de mejor rendimiento.
* **`JOIN EMPRESAS E`**: Permite asociar el `ID_EMPRESA` de la conversación con el nombre real de la empresa para desplegarlo en el frontend.
* **`WHERE CV.ESTADO_CONVERSACION != 3`**: El estado `3` corresponde a conversaciones finalizadas (cerradas). Se filtran para incluir únicamente las que siguen abiertas/activas en atención.
* **`DATEDIFF(NOW(), CV.FECHA_CONVERSACION) >= 30`**: Calcula la diferencia en días entre la fecha y hora actual y la fecha de creación de la conversación. Solo se seleccionan aquellas cuya diferencia sea mayor o igual a 30 días.
* **`ORDER BY DIAS_ABIERTA DESC`**: Ordena el resultado de mayor a menor antigüedad para priorizar visualmente las conversaciones más críticas.
