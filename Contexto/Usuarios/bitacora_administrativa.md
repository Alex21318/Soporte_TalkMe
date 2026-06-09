# Bitácora Administrativa TalkMe

## Descripción
Pestaña dentro del módulo Usuarios que permite consultar el historial completo de cambios de permisos y configuraciones en el sistema. Esta vista consulta la vista `CONS_BITACORA_ADMINISTRATIVA_VW` que contiene todos los registros de asignaciones, modificaciones y eliminaciones de permisos por empresa.

## Ubicación
- **Módulo:** Usuarios
- **Pestaña:** Bitácora Admin (última opción del sidebar)
- **Componente Frontend:** `src/pages/Usuarios/BitacoraAdministrativa.jsx`
- **Estilos:** `src/pages/Usuarios/Usuarios.css` (clases `.usr-bitacora-*`)
- **Endpoint Backend:** `server/modules/bitacoraAdministrativa.js`

## Funcionalidades

### 1. Filtros de Búsqueda
La bitácora cuenta con los siguientes filtros para realizar búsquedas precisas:

- **Base de Datos:** Selector para elegir entre las bases de datos disponibles (Talkme S1-S4, Talkme MDD, Ficohsa S1-S3)
- **Empresa:** Dropdown con búsqueda autocompletada para filtrar por nombre de empresa
- **Subgrupo:** Dropdown para filtrar por subgrupo (Mantenimientos, Configuraciones, etc.)
- **Categoría:** Dropdown para filtrar por categoría (Creación de Registro, Modificación de Registro, Modificación de Parámetro, etc.)
- **Descripción:** Campo de texto para buscar palabras clave en la descripción del cambio
- **Creado Por:** Dropdown con búsqueda autocompletada para filtrar por usuario que realizó el cambio
- **Fecha Inicio:** Selector de fecha para el inicio del rango de búsqueda
- **Fecha Fin:** Selector de fecha para el fin del rango de búsqueda

### 2. Consulta de Registros
Al hacer clic en "🔍 Buscar", el sistema:
- Envía una petición GET al endpoint `/api/bitacora-administrativa` con los filtros aplicados
- Retorna los registros paginados (50 por página)
- Muestra el total de registros encontrados
- Permite navegar entre páginas con el paginador

### 3. Visualización de Resultados
La tabla de resultados muestra las siguientes columnas:

- **ID:** Identificador único del registro (ID_LOG)
- **Empresa:** Nombre de la empresa afectada
- **Subgrupo:** Área del sistema (Mantenimientos, Configuraciones, etc.)
- **Categoría:** Tipo de acción (Creación, Modificación, etc.)
- **Descripción:** Descripción detallada del cambio realizado
- **Usuario:** Usuario afectado por el cambio (NOMBRE_USUARIO)
- **Valor Anterior:** Estado anterior en formato JSON (cuando aplica)
- **Valor Actual:** Estado nuevo en formato JSON (cuando aplica)
- **Creado El:** Fecha y hora del registro
- **Creado Por:** Usuario que realizó el cambio

### 4. Exportación a Excel
Botón "Exportar Excel" que genera un archivo `.xlsx` con:
- Todos los registros filtrados actuales
- Formato de tabla con filtros en cada columna
- Columnas: ID_LOG, ID_EMPRESA, EMPRESA, SUBGRUPO, CATEGORIA, DESCRIPCION, GRUPO, ID_USUARIO, NOMBRE_USUARIO, VALOR_ANTERIOR, VALOR_ACTUAL, CREADO_EL, CREADO_POR
- Los campos JSON se exportan como texto formateado

### 5. Carga de Filtros Disponibles
Al cambiar la base de datos, el sistema carga automáticamente:
- Lista de empresas únicas en esa base de datos
- Lista de subgrupos únicos
- Lista de categorías únicas
- Lista de usuarios que han realizado cambios (CREADO_POR)

## Endpoints Backend

### GET /api/bitacora-administrativa
Consulta la vista `CONS_BITACORA_ADMINISTRATIVA_VW` con filtros opcionales.

**Parámetros Query:**
- `db_key`: Base de datos a consultar (default: 'db_1')
- `id_empresa`: ID de empresa (opcional)
- `empresa`: Nombre de empresa (búsqueda parcial, opcional)
- `subgrupo`: Subgrupo (búsqueda parcial, opcional)
- `categoria`: Categoría (búsqueda parcial, opcional)
- `descripcion`: Descripción (búsqueda parcial, opcional)
- `creado_por`: Usuario que realizó el cambio (búsqueda parcial, opcional)
- `fecha_inicio`: Fecha inicio del rango (YYYY-MM-DD, opcional)
- `fecha_fin`: Fecha fin del rango (YYYY-MM-DD, opcional)
- `limit`: Cantidad de registros por página (default: 100)
- `offset`: Desplazamiento para paginación (default: 0)

**Respuesta:**
```json
{
  "registros": [
    {
      "ID_LOG": 308446,
      "ID_EMPRESA": 213,
      "ID_CATEGORIA": 1,
      "EMPRESA": "Grupo Q",
      "SUBGRUPO": "Mantenimientos",
      "CATEGORIA": "Creación de Registro",
      "DESCRIPCION": "SKILLS: Se crea el skill.",
      "GRUPO": "Administrativos",
      "ID_USUARIO": 5013,
      "NOMBRE_USUARIO": "GrupoQ.mauricio",
      "VALOR_ANTERIOR": null,
      "VALOR_ACTUAL": "{\"orden\": 0, \"estado\": 1, ...}",
      "CREADO_EL": "2023-12-07 21:52:05",
      "CREADO_POR": "GrupoQ.mauricio"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### GET /api/bitacora-administrativa/filtros
Obtiene los valores únicos para los dropdowns de filtros.

**Parámetros Query:**
- `db_key`: Base de datos a consultar

**Respuesta:**
```json
{
  "empresas": ["Grupo Q", "Empresa A", "Empresa B"],
  "subgrupos": ["Mantenimientos", "Configuraciones"],
  "categorias": ["Creación de Registro", "Modificación de Registro", "Modificación de Parámetro"],
  "creado_por": ["GrupoQ.mauricio", "admin", "usuario1"]
}
```

## Comportamiento de VALOR_ANTERIOR y VALOR_ACTUAL

- **Creación de registros:** `VALOR_ANTERIOR` es `null` y `VALOR_ACTUAL` contiene el objeto JSON completo del nuevo registro
- **Modificación de registros:** `VALOR_ANTERIOR` contiene el estado antes del cambio y `VALOR_ACTUAL` contiene el estado después del cambio
- **Eliminación de registros:** `VALOR_ANTERIOR` contiene el estado antes de eliminar y `VALOR_ACTUAL` puede ser `null` o contener información de la eliminación

Los campos JSON se muestran formateados con indentación para facilitar la lectura de diferencias.

## Ejemplos de Uso

### Buscar cambios en una empresa específica
1. Seleccionar la base de datos correspondiente
2. En el filtro "Empresa", escribir el nombre de la empresa o seleccionarla del dropdown
3. Hacer clic en "🔍 Buscar"

### Buscar cambios realizados por un usuario
1. Seleccionar la base de datos
2. En el filtro "Creado Por", escribir el nombre del usuario
3. Hacer clic en "🔍 Buscar"

### Buscar cambios en un rango de fechas
1. Seleccionar la base de datos
2. Configurar "Fecha Inicio" y "Fecha Fin"
3. Hacer clic en "🔍 Buscar"

### Buscar cambios de un tipo específico
1. Seleccionar la base de datos
2. En el filtro "Categoría", seleccionar "Modificación de Parámetro"
3. Hacer clic en "🔍 Buscar"

## Notas Técnicas

- La vista `CONS_BITACORA_ADMINISTRATIVA_VW` está disponible en todas las bases de datos de Segmento 1 hasta Ficohsa S3 (db_1 a db_8)
- Los dropdowns de filtros cargan automáticamente los valores únicos de la base de datos seleccionada
- La paginación se realiza del lado del servidor (SQL LIMIT/OFFSET)
- Los campos JSON se muestran con scroll vertical si exceden 100px de altura
- La exportación a Excel utiliza la librería ExcelJS con formato de tabla
- No requiere selección de empresa previa (a diferencia de otras pestañas del módulo Usuarios)
