# Exportar Plantillas de WhatsApp a Excel

Esta funcionalidad permite descargar de forma local un archivo de hoja de cálculo conteniendo toda la información de las plantillas consultadas, facilitando la auditoría masiva externa y el control administrativo.

---

## 🖥️ Interfaz de Usuario (Frontend)

La exportación se ejecuta en el archivo [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx) mediante el botón `📊 Exportar Excel` del panel de filtros.

### Flujo de Exportación (`exportarPlantillasExcel`)
1. **Validación:** Comprueba que la empresa esté seleccionada (`idEmpresaPlantillas !== ''`). Si no, detiene la acción y muestra un toast de advertencia.
2. **Petición HTTP:** Llama al endpoint de exportación definido en [api.js](file:///d:/Proyectos/Soporte_TalkMe/src/config/api.js):
   * **URL:** `GET /api/plantillas-whatsapp/export?db_key={dbKey}&id_empresa={idEmpresa}&id_bot={idBot}&estado={estado}`
3. **Generación de Hoja de Cálculo en Cliente:**
   El frontend genera directamente el archivo Excel formateado en HTML para dar una mejor presentación visual (colores y bordes) sin depender de librerías pesadas:
   * **Esquema de Plantilla HTML:**
     ```html
     <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
     <head>
       <meta charset="UTF-8">
       <style>
         table { border-collapse: collapse; }
         th { background-color: #00a884; color: white; font-weight: bold; padding: 8px; border: 1px solid #333; }
         td { padding: 6px; border: 1px solid #ccc; }
         tr:nth-child(even) { background-color: #f9fafb; }
       </style>
     </head>
     ```
   * **Mapeo de Filas:** Extrae las llaves de las columnas dinámicamente (`Object.keys(data.data[0])`) para rellenar las celdas del encabezado `<th>` y escribe los valores en las filas `<td>`, sanitizando caracteres especiales (reemplaza `<` por `&lt;` y `>` por `&gt;` para evitar que celdas de texto con etiquetas de variables corrompan la estructura HTML).
4. **Descarga del Archivo:**
   * Empaqueta el código HTML generado dentro de un objeto binario Blob con tipo MIME para Excel:
     ```javascript
     const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
     ```
   * Crea un elemento de enlace dinámico `<a>`, le asigna la URL local del Blob (`URL.createObjectURL(blob)`), configura el nombre del archivo de descarga:
     `plantillas_whatsapp_{dbKey}_{fecha_actual}.xls`
   * Activa automáticamente el clic del enlace mediante `.click()`.
   * Muestra notificación de éxito con la cantidad de plantillas exportadas.

---

## ⚙️ Backend y Consulta de Exportación

La petición se resuelve en el backend NodeJS en [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js).

### Endpoint
* **Ruta:** `/api/plantillas-whatsapp/export`
* **Método:** `GET`
* **Lógica:**
  * Recibe los filtros de base de datos, empresa, bot y estado.
  * Realiza una consulta SQL equivalente a la consulta de visualización pero adaptada para retornar la lista de campos crudos de las plantillas (categoría, estado, contenido del mensaje, URL de recursos multimedia, nombres de variables, botones adjuntos y fecha de creación).
  * Retorna los datos en formato JSON bajo la estructura `{ success: true, data: [...] }`.
