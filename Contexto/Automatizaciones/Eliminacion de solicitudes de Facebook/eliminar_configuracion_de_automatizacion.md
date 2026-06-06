# Eliminar Configuración de Automatización (Facebook)

Esta funcionalidad permite eliminar por completo la tarea diaria programada encargada de limpiar y marcar las solicitudes de eliminación de Facebook.

---

## 🖥️ Interfaz de Usuario (Frontend)

El flujo de borrado se desencadena en el panel lateral de configuración `PanelTareaProgramada` con la propiedad `tipo="facebook"` en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### Flujo de Borrado
1. **Click en Eliminar:** El botón **"Eliminar"** (icono 🗑) se encuentra disponible si existe una tarea guardada en el estado (`tarea !== null`).
2. **Confirmación:** Despliega el modal `ConfirmModal` de advertencia.
3. **Petición DELETE:** Al confirmar, se ejecuta `confirmEliminar`, el cual:
   * Cierra el modal (`showEliminarModal = false`).
   * Envía la petición `DELETE` a la API:
     * **URL:** `DELETE /api/tareas/facebook/{dbKey}`
4. **Respuesta:** Muestra una notificación de éxito, limpia el estado local de la tarea y reactiva la vista inicial del panel.

---

## ⚙️ Backend y Limpieza de Recursos (Scheduler)

La limpieza se ejecuta en el servidor Express en el módulo [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### Lógica del Servidor
1. **Borrado Físico:** Remueve el registro de la tabla:
   ```sql
   DELETE FROM SCHEDULER_TAREAS 
   WHERE TIPO = 'facebook' AND DB_KEY = ?
   ```
2. **Desprogramación en Memoria:** Llama a la función `programarCronTareas()` la cual detiene todos los disparadores cargados en el hilo de NodeJS y vuelve a programar únicamente los que se conserven activos en la base de datos. Como la tarea fue eliminada, el cron de Facebook correspondiente se remueve definitivamente de la memoria activa del servidor.
3. Devuelve la confirmación `{ ok: true }`.
