# 🏢 Creación de Instancia

## Descripción General
Pantalla que permite al equipo de soporte crear una nueva empresa/instancia completa en el sistema TalkMe. Genera y ejecuta un script SQL parametrizado que inserta todos los registros necesarios: empresa, bot, horarios, skills, tipos de gestión, estados, etc.

## Código Fuente
- **Frontend:** [CreacionInstancia.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/CreacionInstancia.jsx)
- **Plantilla SQL:** [Creacion_nueva_instancia.sql](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/Creacion_nueva_instancia.sql)
- **Estilos:** [Creaciones.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/Creaciones.css)

---

## Bases de Datos Soportadas
Solo bases Talkme (no Ficohsa):

| DB Key | Nombre         | Socket URL                        |
|--------|----------------|-----------------------------------|
| db_1   | Talkme S1      | https://wss.talkme.pro            |
| db_2   | Talkme S2      | https://cloud-s2.talkme.pro       |
| db_3   | Talkme S3      | https://cloud-s3.talkme.pro       |
| db_4   | Talkme S4      | https://cloud-s4.talkme.pro       |
| db_5   | Talkme MDD     | https://cloud-mdd.talkme.pro      |

---

## Campos del Formulario

| Campo                  | Descripción                                                     | Notas                                   |
|------------------------|-----------------------------------------------------------------|-----------------------------------------|
| Base de datos          | Selección de instancia (db_1 a db_5)                           | Cambia Socket URL automáticamente       |
| Nombre Empresa         | Nombre legal de la empresa                                      | Obligatorio                             |
| Nombre BOT             | Nombre del bot conversacional                                   | Obligatorio                             |
| País                   | País de operación                                               | Cambia moneda automáticamente           |
| Token Empresa          | Token único de 50 chars para autenticar la empresa             | Obligatorio. Se puede auto-generar      |
| Token Consystec        | Token interno de Consystec                                      | Default: `token_consystec`              |
| Socket URL             | URL del servidor de sockets                                     | Se actualiza sola al cambiar DB         |
| URL Notificaciones     | URL del servidor de notificaciones push                        | Se actualiza sola al cambiar DB         |
| Fecha Inicio Paquete   | Inicio del período de servicio contratado (UTC)                | Auto-calculado: día 1 del mes actual   |
| Fecha Fin Paquete      | Fin del período de servicio contratado (UTC)                   | Auto-calculado: último día del mes      |
| Nombre Contacto        | Nombre del contacto principal del cliente                      | Genera Correo_cliente automáticamente   |
| Teléfono Contacto      | Teléfono del contacto                                           |                                         |
| Teléfono WA/WebChat    | Número de WhatsApp o WebChat                                   |                                         |
| Correo Cliente         | Email del cliente (se sincroniza con correos internos)         | Auto-generado desde nombre contacto     |
| Correo Interno         | Lista de correos internos de Consystec                         | Incluye correo cliente al salir del campo|
| Correo Paquetes        | Lista de correos para notificaciones de paquetes               | Incluye correo cliente al salir del campo|
| Folder Files           | Carpeta de archivos (auto-generada)                            | `empresa/bot` normalizado               |
| Redes Sociales         | Selección de canales a crear                                   | WhatsApp activado por defecto           |

---

## Redes Sociales Disponibles

| ID | Canal                  | Color Hex |
|----|------------------------|-----------|
| 1  | WhatsApp               | #25D366   |
| 2  | Facebook               | #1877F2   |
| 5  | Broadcast WhatsApp     | #128C7E   |
| 6  | Broadcast SMS          | #FF6B6B   |
| 7  | WebChat                | #6366F1   |
| 9  | Web Catálogo           | #F59E0B   |
| 10 | Instagram              | #E4405F   |
| 11 | FB Comentarios         | #1877F2   |
| 12 | IG Comentarios         | #E4405F   |

---

## Funcionalidades Principales

### 1. Generación y Vista Previa del SQL
- Botón **👁️ Vista SQL**: genera el SQL final con todas las variables interpoladas y lo muestra en un panel con resaltado de sintaxis.
- El SQL destaca: keywords (`SET`, `INSERT`, `SELECT`...), tablas, variables `@var` y strings.

### 2. Probar SQL (Dry Run)
- Botón **Probar SQL**: envía el SQL al backend para validar sintaxis y consistencia **sin ejecutar cambios reales** en la BD.
- Muestra resultado: éxito o error detallado con `errno`, `sqlMessage`, `sqlState`.

### 3. Actualizar Plantilla SQL
- Botón **🧩 Actualizar Plantilla SQL**: abre un editor de texto donde se puede pegar el query actualizado.
- Al guardar, el backend reemplaza el archivo `.sql` local y crea un respaldo `.bak` automáticamente.
- La plantilla se carga desde el servidor al iniciar; si falla, usa la versión embebida en el bundle.

### 4. Generar Token Automático
- Botón **Generar Token**: crea un token aleatorio de 50 caracteres alfanuméricos excluyendo caracteres ambiguos (`i`, `I`, `l`, `L`, `o`, `O`, `0`).

### 5. Crear Empresa
- Botón **✅ Crear Empresa**: valida campos obligatorios y ejecuta el SQL parametrizado en la BD seleccionada.
- Al completarse exitosamente, muestra el `ID_EMPRESA` generado y limpia el formulario.

### 6. Limpiar Formulario
- Botón **Limpiar**: restaura todos los campos a sus valores por defecto con confirmación modal.

---

## Lógica de Auto-completado
- **Folder Files**: se genera automáticamente como `{empresa_slug}/{bot_slug}` al escribir los nombres.
- **Correo Cliente**: se genera automáticamente desde `Nombre Contacto` → `nombre.apellido@talkme.pro`.
- **Correo Interno / Correo Paquetes**: al salir del campo Correo Cliente, se añade el correo al final de ambas listas.
- **Socket URL / URL Notificaciones**: se actualizan automáticamente al cambiar la base de datos.
- **Moneda / Código Moneda**: se actualizan automáticamente al cambiar el país.

---

## Flujo de Ejecución SQL
```
1. Se carga la plantilla SQL desde el servidor (o del bundle si falla).
2. Se reemplazan todas las variables (@Variable := 'valor') con los datos del formulario.
3. Se genera el bloque dinámico de BOT_REDES y BOT_REDES_BETA según redes seleccionadas.
4. Se genera el bloque de BOT_RED_CONF_VALORES con configuraciones de canal (teléfono, socketUrl).
5. El SQL final se envía al backend → POST /api/creaciones/instancia.
6. El backend ejecuta el script en la DB seleccionada y retorna el ID_EMPRESA creado.
```

---

## Tablas Afectadas en BD
`EMPRESAS`, `BOT`, `HORARIO_BOT`, `TIPO_CLIENTE`, `ESTADOS`, `TIPOS_GESTION`, `SKILLS`, `HORARIO_SKILL`, `TIPOS_RESOLUCIONES`, `ATRIBUTOS_FICHA_CLIENTE`, `PARAMETROS`, `USUARIOS`, `BOT_REDES`, `BOT_REDES_BETA`, `ACUMULADOR`, `PAQUETE_PROVISION`, `BOT_RED_CONF_VALORES`

---

## Endpoints Backend

| Método | Endpoint                              | Descripción                          |
|--------|---------------------------------------|--------------------------------------|
| GET    | `/api/creaciones/plantilla-sql`       | Carga la plantilla SQL actual        |
| POST   | `/api/creaciones/plantilla-sql`       | Guarda/actualiza la plantilla SQL    |
| POST   | `/api/creaciones/instancia/probar-sql`| Valida el SQL sin ejecutar           |
| POST   | `/api/creaciones/instancia`           | Ejecuta la creación completa         |

---

## Notas para Desarrolladores
- Si se modifica la plantilla SQL o el formulario, actualizar este documento.
- Los países están mapeados estáticamente en `PAISES_MAPEADOS` dentro del componente.
- Ver `.windsurfrules` para las reglas de actualización de documentación.
