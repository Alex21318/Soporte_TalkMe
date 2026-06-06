# Editar Plantilla de WhatsApp

Esta funcionalidad permite modificar la configuración local de una plantilla homologada de WhatsApp, específicamente actualizando su URL de archivo multimedia y los nombres de las pantallas de la aplicación vinculadas a ella.

---

## 🖥️ Interfaz de Usuario (Frontend)

El flujo de edición está disponible a través de dos disparadores en [ContenidoPlantillasWhatsApp.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/ContenidoPlantillasWhatsApp.jsx):
1. **Menú Contextual (Click Derecho):** Al hacer clic derecho sobre la tarjeta de una plantilla, se despliega un menú en las coordenadas del cursor que incluye la opción `✏️ Editar URL/Pantallas`.
2. **Botón de Edición del Panel:** Cuando una tarjeta de plantilla es expandida al hacer clic izquierdo sobre ella, se revela un botón `✏️ Editar` dentro de la sección de Configuración.

### 1. Formulario Modal de Edición (`ModalEditarPlantilla`)
Ambos disparadores abren un cuadro modal de edición en pantalla que expone:
* **Nombre de la plantilla:** Mapeado como campo informativo no-editable.
* **URL / Media URL:** Campo de texto (`<input type="text">`) inicializado con el valor actual de `plantilla.media_url` para ingresar la dirección del archivo (ej: imagen, video) asociado a la plantilla.
* **Pantallas:** Campo de texto para indicar el nombre de las pantallas mapeadas (`plantilla.pantallas`).

### 2. Flujo de Control al Guardar
1. Al hacer clic en **"Guardar"**, se activa el estado de carga (`guardando = true`).
2. Envía una petición `PUT` al servidor utilizando el endpoint definido:
   * **Endpoint:** `PUT /api/plantillas-whatsapp/{id_plantilla}?db_key={dbKey}`
   * **Payload (JSON):**
     ```json
     {
       "url": "https://servidor.com/nueva_imagen.png",
       "pantallas": "nombre_de_la_pantalla"
     }
     ```
3. **Manejo de Respuesta:**
   * **Éxito (OK):** Muestra una notificación de éxito (`toast.success`), dispara el callback de refresco `onGuardar()` (el cual vuelve a realizar la consulta general para actualizar la información de las tarjetas en pantalla) y cierra el modal.
   * **Fallo:** Muestra notificación de error y mantiene el modal abierto.
4. Desactiva el estado de carga (`guardando = false`).

---

## ⚙️ Backend y Persistencia en Base de Datos

La actualización se procesa en el backend en NodeJS dentro de [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js).

### Endpoint
* **Ruta:** `/api/plantillas-whatsapp/:id`
* **Método:** `PUT`

### Lógica de Ejecución en el Servidor
1. **Validación:** Comprueba que la base de datos (`db_key`) recibida en la URL exista en el pool de conexiones y que el identificador (`id`) no esté vacío.
2. **Construcción Dinámica del Query SQL:**
   Para optimizar y evitar sobreescribir información no enviada, el servidor revisa qué campos llegaron en el cuerpo de la petición (`req.body`):
   * Si llegó `url`, añade `URL = ?` a la lista de actualizaciones.
   * Si llegó `pantallas`, añade `PANTALLAS = ?` a la lista de actualizaciones.
3. Si la lista está vacía, responde con un código `400 Bad Request` indicando que no hay cambios.
4. **Ejecución SQL:**
   Construye y ejecuta la consulta dinámicamente inyectando los parámetros correspondientes para evitar vulnerabilidades de inyección SQL:
   ```sql
   UPDATE PLANTILLAS_WHATSAPP 
   SET URL = ?, PANTALLAS = ? 
   WHERE ID_PLANTILLA = ?
   ```
   *Parámetros:* `[url, pantallas, id_plantilla]`
5. Devuelve una confirmación JSON exitosa `{ success: true, message: 'Plantilla actualizada correctamente' }`.
