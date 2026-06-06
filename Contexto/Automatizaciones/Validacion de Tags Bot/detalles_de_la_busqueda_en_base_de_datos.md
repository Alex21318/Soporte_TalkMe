# Detalles de Búsqueda en Base de Datos (Tags)

Esta sección documenta la implementación en el lado del servidor y el comportamiento del motor de base de datos MySQL para realizar la validación de coincidencia de tags.

---

## ⚙️ Implementación del Servidor (Backend)

La petición es recibida por Express en el archivo de rutas [skills.js](file:///d:/Proyectos/Soporte_TalkMe/server/modules/skills.js).

### Controlador
* **Ruta:** `/api/bot-tags/buscar`
* **Método:** `GET`
* **Parámetros de Consulta (Query):**
  * `db_key`: Clave de la base de datos a consultar.
  * `id_bot`: ID numérico del bot.
  * `tag`: Término o palabra clave a validar.
* **Flujo:**
  1. Valida que los tres parámetros estén presentes; si falta alguno, devuelve `400 Bad Request`.
  2. Obtiene el pool de conexiones de la base de datos correspondiente.
  3. Ejecuta la consulta SQL con los parámetros proporcionados.
  4. Devuelve el array de coincidencias encontradas en formato JSON.

---

## 🗄️ Consulta SQL y Búsqueda Full-Text

La consulta SQL es la siguiente:
```sql
SELECT
    ID_BOT_MENU,
    NOMBRE,
    PALABRA_CLAVE,
    NOMBRE_RED_SOCIAL,
    TAGS
FROM BOT_MENU_PALABRAS_VW
WHERE ID_BOT = ?
  AND MATCH(TAGS) AGAINST (? IN NATURAL LANGUAGE MODE)
```

### 1. Vista `BOT_MENU_PALABRAS_VW`
La consulta se realiza sobre una vista de base de datos (`VW`) que consolida y mapea la información de menús de los bots, canales de redes sociales vinculadas a dicho bot y agrupa los tags configurados para cada nodo de menú.

### 2. Función `MATCH() AGAINST()`
Para optimizar y flexibilizar la búsqueda, el sistema no utiliza operadores simples de comparación como `LIKE '%palabra%'`. En su lugar, implementa la búsqueda **Full-Text** nativa de MySQL:
* **Columna Objetivo:** `TAGS` (debe estar indexada con un índice de tipo `FULLTEXT` en la tabla subyacente).
* **Modo:** `IN NATURAL LANGUAGE MODE`.
  * *Comportamiento:* MySQL interpreta la palabra de búsqueda como una frase de lenguaje natural e intenta encontrar coincidencias completas de palabras dentro de la lista de tags. Esto permite búsquedas rápidas incluso si la columna contiene una cadena larga de texto separado por comas o espacios.
  * *Sensibilidad:* Las búsquedas Full-Text en este modo por defecto no distinguen entre mayúsculas y minúsculas (case-insensitive) y omiten automáticamente las palabras de parada (*stopwords* como "de", "con", "el" si el diccionario de MySQL está cargado, lo cual no suele afectar a los tags ya que son palabras clave directas).
* **Filtro del Bot:** El filtro `ID_BOT = ?` restringe la búsqueda Full-Text únicamente a los nodos pertenecientes al bot conversacional que se está validando.
