# Editor de Plantillas de Correo (Outlook/Gmail)

El sistema incluye un editor de plantillas de correo electrónico interactivo estilo Outlook. Esto permite a los administradores diseñar la presentación visual del correo (asunto, cuerpo HTML, firma y logotipo adjunto) que acompaña al envío automático diario de los reportes.

---

## 🖥️ Interfaz de Usuario (Frontend)

El editor se ubica en el lateral derecho de la pestaña **"Correo y Plantillas"** en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx).

### 1. Carga y Selección de Plantilla (`seleccionarPlantilla`)
* El listado de plantillas disponibles se carga desde el backend. Al seleccionar una, se dispara `seleccionarPlantilla()`, la cual realiza una llamada HTTP:
  * **Endpoint:** `GET /api/scheduler/templates/{id_template}`
* Esto recupera la estructura completa (incluyendo adjuntos y destinatarios locales) y la carga en los estados del editor.
* Si el usuario desea crear una plantilla desde cero, el botón **"Nueva Plantilla"** llama a `nuevaPlantillaInline()`, precargando un asunto y cuerpo HTML base de ejemplo.

### 2. Campos del Editor Técnico
* **Nombre de la Plantilla:** Nombre descriptivo interno (ej: "Reporte Diario Ficohsa").
* **Asunto del Correo:** Asunto del mensaje. Permite la interpolación de variables encerradas entre llaves (ej: `Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}`).
* **Cuerpo HTML:** Editor de texto plano que interpreta marcas HTML para estructurar el contenido (negritas, listas, párrafos).
* **Firma HTML:** Sección inferior para añadir el nombre del equipo de soporte o información legal en HTML.
* **Logotipo o Imagen de Firma:** Selector de archivo de imagen local. La función `cargarImagenFirma` lee el archivo en el navegador, valida que no supere los 5 MB de tamaño, lo convierte a un string base64 (`DataURL`) y lo asigna al estado para enviarlo al servidor.
* **Adjuntos (Reportes):** Lista de checkboxes que mapea las reglas de descarga configuradas. El usuario marca qué reportes de la base de datos se deben adjuntar a esta plantilla de correo.
* **Destinatarios Locales:** Tabla para agregar correos (`PARA`, `CC`, `CCO`) específicos para esta plantilla de correo, almacenándolos en memoria en el estado `editandoDestinatarios` antes de persistir los cambios.

### 3. Vista Previa en Tiempo Real (`generarVistaPrevia`)
En el lateral del editor se renderiza un buzón simulado que emula exactamente la apariencia que tendrá el correo en clientes de correo como Outlook o Gmail:
* Mapea los campos de Remitente, Para, CC, Asunto y un listado de los nombres reales de los archivos XLSX adjuntos.
* Reemplaza dinámicamente las variables `{FECHA}`, `{TIPO_REPORTE}` y `{EMPRESA}` por sus valores reales correspondientes a la fecha actual y reportes seleccionados.
* Renderiza el cuerpo HTML del mensaje, la firma y la imagen de firma en base64.

### 4. Guardar Cambios (`guardarCambiosPlantilla`)
* **Validación:** Comprueba que se haya ingresado el nombre de la plantilla.
* **Petición HTTP:**
  * **Creación (Nueva):** `POST /api/scheduler/templates`
  * **Edición (Existente):** `PUT /api/scheduler/templates/{id_template}`
  * **Cuerpo de Petición:** Envía toda la información del editor (incluyendo la lista de reportes asociados, destinatarios locales y el string base64 de la imagen).
* Al finalizar con éxito, recarga la lista de plantillas y selecciona la plantilla guardada.

---

## ⚙️ Backend y Base de Datos

Las operaciones se gestionan en NodeJS en el archivo [scheduler.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/scheduler.js).

### Endpoints
* **`GET /api/scheduler/templates`**: Retorna el listado de plantillas de un trabajo.
* **`GET /api/scheduler/templates/:id`**: Retorna la información completa de una plantilla detallada (destinatarios y reportes vinculados).
* **`POST /api/scheduler/templates`**: Inserta la nueva plantilla en las tablas del scheduler.
* **`PUT /api/scheduler/templates/:id`**: Actualiza el registro de la plantilla por su ID.
* **`DELETE /api/scheduler/templates/:id`**: Elimina la plantilla y limpia sus dependencias de destinatarios y adjuntos.
