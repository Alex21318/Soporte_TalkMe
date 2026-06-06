# Buscar Coincidencias de Tags de Bots

Esta funcionalidad permite validar si una palabra clave o tag ya está siendo utilizado por algún submenú o flujo de los bots conversacionales de la empresa, evitando colisiones en las redirecciones automáticas de los clientes.

---

## 🖥️ Interfaz de Usuario (Frontend)

La búsqueda se gestiona en [Cierres.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Cierres/Cierres.jsx) a través del componente `ContenidoBotTags` y controles en la topbar.

### 1. Panel de Filtros (Topbar)
Cuando la pestaña de "Tags Bot" está activa, se despliegan dinámicamente tres filtros obligatorios en la barra de herramientas:
* **Empresa:** Un control de selección (`<select>`) que carga las empresas disponibles en la base de datos seleccionada mediante `cargarEmpresasTags()`.
* **Bot:** Un control que carga los bots de la empresa seleccionada. La carga es reactiva mediante un `useEffect` que escucha cambios en el ID de la empresa.
* **Palabra clave / tag:** Entrada de texto (`<input>`) donde el usuario escribe el tag a validar (ej: "AYUDA", "VENTAS"). Presionar Enter en este campo dispara la búsqueda.
* **Botón de Buscar:** `🔍 Buscar`

### 2. Flujo de Control de Búsqueda (`buscarTags`)
1. **Validaciones Previas:**
   * Si no hay empresa seleccionada: muestra advertencia (`toast.warning('Selecciona una empresa')`).
   * Si no hay bot seleccionado: muestra advertencia (`toast.warning('Selecciona un bot')`).
   * Si la palabra clave está vacía: muestra advertencia (`toast.warning('Ingresa una palabra clave o tag')`).
2. **Petición API:**
   * Activa el estado de carga (`loadingTags = true`) y limpia resultados previos (`resultadosTags = null`).
   * Invoca el endpoint:
     * **URL:** `GET /api/bot-tags/buscar?db_key={dbKey}&id_bot={idBotTags}&tag={tag}`
3. **Manejo de Resultados:**
   * **Con Coincidencias (length > 0):** Almacena el resultado y muestra una advertencia (`toast.warning('{X} coincidencia(s) encontradas')`) indicando las colisiones encontradas.
   * **Sin Coincidencias (length === 0):** Muestra notificación exitosa (`toast.success('No se encontraron coincidencias')`), indicando que la palabra clave está disponible para su uso.
   * **Log de Auditoría:** Llama dinámicamente al servicio de auditoría para registrar la búsqueda, guardando los parámetros de la consulta y el total de colisiones detectadas.
4. **Finalización:** Desactiva el estado de carga (`loadingTags = false`).

### 3. Renderizado de Contenido (`ContenidoBotTags`)
* **Estado Inicial (`resultados === null`):** Muestra una pantalla de bienvenida animando al usuario a realizar su primera consulta.
* **Sin Coincidencias (`resultados.length === 0`):** Muestra una tarjeta con un icono de éxito indicando que el tag está libre.
* **Con Coincidencias (`resultados.length > 0`):** Muestra una tabla con el listado detallado de conflictos detectados:
  * **ID Bot Menu:** Identificador único del nodo de menú del bot.
  * **Nombre:** Nombre identificador del menú.
  * **Palabra Clave:** Palabra clave principal de disparo del menú.
  * **Red Social:** Canal o red social asociada (WhatsApp, Facebook, etc.).
  * **Tags:** Conjunto de palabras clave alternativas (tags) configuradas para ese menú.
