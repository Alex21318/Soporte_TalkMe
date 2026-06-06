# Gestión de Destinatarios de Reportes

Esta funcionalidad permite configurar la lista global de correos electrónicos a los cuales se les deben hacer llegar los reportes descargados automáticamente, especificando para qué reporte aplica cada correo y su tipo de destinatario (Para, CC, CCO).

---

## 🖥️ Interfaz de Usuario (Frontend)

La administración de destinatarios se ubica en la pestaña **"Correo y Plantillas"** (estado `tab === 'email'`) en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Visualización y Carga de Destinatarios (`cargarDestinatarios`)
Al abrir la pestaña, se llama automáticamente a `cargarDestinatarios()` para obtener los destinatarios asociados al ID del trabajo (`config.id_job`):
* **Endpoint:** `GET /api/scheduler/destinatarios?id_job={id_job}`
* Mapea y renderiza una tabla con la lista de correos registrados.

### 2. Formulario para Agregar Destinatario (`agregarDestinatario`)
El administrador puede agregar un nuevo destinatario completando el formulario integrado:
* **Correo Electrónico:** Dirección de correo (campo de validación obligatorio).
* **Nombre:** Nombre del destinatario para personalizar el saludo.
* **Reporte Asociado:** Selección de la regla de reporte a la cual se debe adjuntar este correo.
* **Tipo:** Tipo de destinatario de correo:
  * `PARA` (Destinatario principal)
  * `CC` (Con copia)
  * `CCO` (Con copia oculta)
* **Acción:** El botón **"Agregar"** realiza una petición `POST` al endpoint `POST /api/scheduler/destinatarios` con la información del formulario. Al finalizar, limpia los campos y vuelve a invocar `cargarDestinatarios()`.

### 3. Eliminar Destinatario (`eliminarDestinatario`)
* Cada fila del listado tiene un botón de eliminación (icono 🗑).
* Al hacer clic, se abre una confirmación nativa del navegador.
* Si el usuario acepta, se realiza una petición HTTP `DELETE` al endpoint:
  * **URL:** `DELETE /api/scheduler/destinatarios/{id_email}`
* El servidor elimina físicamente el registro de la base de datos y el cliente recarga la tabla de destinatarios en pantalla.

---

## ⚙️ Backend y Base de Datos

El procesamiento de destinatarios reside en el backend NodeJS en [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### Endpoints
* **`GET /api/scheduler/destinatarios`**: Retorna el listado llamando a la función del servicio de emails `emailService.listarDestinatarios(id_job)`.
* **`POST /api/scheduler/destinatarios`**: Inserta un destinatario invocando `emailService.guardarDestinatario(payload)`.
* **`DELETE /api/scheduler/destinatarios/:id_email`**: Elimina físicamente el destinatario por su ID llamando a `emailService.eliminarDestinatario(id_email)`.
