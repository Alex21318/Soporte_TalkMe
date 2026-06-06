# Eliminar Configuración de Automatización

Esta funcionalidad permite eliminar por completo la configuración de la tarea programada asociada al cierre de conversaciones para una base de datos específica, desactivando así las ejecuciones automáticas diarias y removiendo el programador en memoria.

---

## 🖥️ Interfaz de Usuario (Frontend)

El flujo de eliminación se inicia desde el panel de configuración de la tarea programada (`PanelTareaProgramada`) en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Disponibilidad del Botón
* El botón **"Eliminar"** (icono 🗑) solo se renderiza si el estado local `tarea` contiene datos de configuración existentes (es decir, la tarea está registrada en la base de datos).

### 2. Confirmación de Eliminación (`eliminar`)
Al hacer clic en el botón, se dispara la función `eliminar`, la cual abre un modal de seguridad:
* **Componente:** `ConfirmModal`
* **Configuración del Modal:**
  * **Título:** `"Eliminar Tarea Programada"`
  * **Mensaje:** `"¿Eliminar esta tarea programada?"`
  * **Variante de botón:** `danger` (Color rojo para indicar acción destructiva).
  * **Acciones:**
    * **Cancelar:** Cierra el modal estableciendo `showEliminarModal = false` sin realizar acciones adicionales.
    * **Confirmar:** Dispara la función `confirmEliminar`.

### 3. Petición de Borrado (`confirmEliminar`)
La función `confirmEliminar` realiza los siguientes pasos:
1. Cierra el modal de confirmación (`showEliminarModal = false`).
2. Envía una petición `DELETE` al servidor utilizando la ruta definida en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
   * **Endpoint:** `DELETE /api/tareas/cierres/{dbKey}`
3. **Manejo de Respuesta:**
   * **Si es exitosa (OK):** Muestra una notificación emergente de éxito (`toast.success('Tarea eliminada')`) y reinicia los estados del componente (`tarea = null` y `activo = false`), ocultando las acciones secundarias del panel y restaurando el formulario a su estado por defecto.
   * **Si falla:** Muestra una notificación con el error devuelto por la API.

---

## ⚙️ Backend y Limpieza de Recursos (Scheduler)

El backend de la aplicación gestiona la eliminación física en la base de datos y la recarga del programador cron en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### 1. Endpoint de Eliminación en Express
* **Ruta:** `/api/tareas/:tipo/:db_key`
* **Método:** `DELETE`
* **Controlador:**
  ```javascript
  router.delete('/api/tareas/:tipo/:db_key', async (req, res) => { ... })
  ```

### 2. Flujo de Ejecución en el Servidor
1. **Borrado Físico:** Ejecuta una sentencia SQL para eliminar el registro de la tabla de tareas:
   ```sql
   DELETE FROM SCHEDULER_TAREAS 
   WHERE TIPO = ? AND DB_KEY = ?
   ```
   *Parámetros:* `[req.params.tipo, req.params.db_key]` (en este caso, `'cierres'` y la clave de base de datos recibida).
2. **Re-programación del Cron (`programarCronTareas`):**
   * Una vez borrado el registro, se invoca de nuevo la función `programarCronTareas()`.
   * Esta función se encarga de detener todos los cron jobs de node-cron que están corriendo actualmente en la memoria del proceso NodeJS.
   * Al leer de nuevo la tabla `SCHEDULER_TAREAS`, la tarea borrada ya no existirá, por lo que únicamente se reprogramarán las tareas activas restantes.
   * Esto garantiza la liberación inmediata de los temporizadores de memoria del servidor para evitar ejecuciones huérfanas o no deseadas en el futuro.
3. **Respuesta al Cliente:** Devuelve una respuesta JSON exitosa `{ ok: true }`.
