# 📡 Integración WhatsApp (API Oficial Gupshup)

## Descripción General
Pestaña que permite configurar la integración de WhatsApp con la API Oficial de Gupshup para una empresa/bot existente. Ejecuta un conjunto de INSERTs en `BOT_RED_CONF_VALORES`, crea la tabla de mensajes en la BD de WhatsApp y actualiza parámetros del bot. La ejecución es **idempotente**.

## Código Fuente
- **Frontend:** [IntegracionWhatsapp.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/IntegracionWhatsapp.jsx)

---

## Flujo de Selección en Cascada
```
Base de Datos → Empresa → Bot → Bot Redes (ID_BOT_REDES de red WhatsApp)
```

## Campos del Formulario

| Campo                  | Descripción                                                        | Notas                                               |
|------------------------|--------------------------------------------------------------------|-----------------------------------------------------|
| Base de Datos          | BD de origen (db_1 a db_5, solo Talkme)                          | Cambia URLs predeterminadas automáticamente         |
| Empresa                | Empresa en la que está el bot                                     | Select en cascada, se carga desde `/api/creaciones/empresas/{db}` |
| Bot                    | Bot a configurar                                                  | Select en cascada                                    |
| ID Bot Redes           | ID del registro de WhatsApp en BOT_REDES                         | Select en cascada, filtrado a red WhatsApp           |
| Nombre App             | Nombre de la aplicación Gupshup                                   | Obligatorio                                          |
| Número                 | Número de teléfono WhatsApp                                      | Obligatorio                                          |
| App ID                 | Identificador único de la app en Gupshup                         | Obligatorio                                          |
| Auth Code              | Código de autenticación de la app Gupshup                        | Obligatorio                                          |
| Creado por             | Usuario que registra la integración                               | Default: `USUARIO_SESION`                           |
| URLs Configuración 4   | Lista de URLs de socket a registrar en config ID 4               | Se agregan/eliminan dinámicamente; pre-cargadas según BD |
| Número Demo (opcional) | Buscador de números en `NUMEROS_DEMOS` para autocompletar        | Si se selecciona, el número se marca como OCUPADO   |

---

## Funcionalidades Principales

### 1. Selector de Número Demo
- Buscador typeahead con paginación (5 por página) de la tabla de números demos disponibles.
- Al seleccionar uno, autocompleta: `NOMBRE_APP`, `NUMERO`, `APP_ID`, `AUTH_CODE`.
- Al ejecutar exitosamente, el número se marca automáticamente como **OCUPADO** con la empresa e ID_BOT_REDES asociados (`/api/numeros-demos/{id}/ocupar`).

### 2. Vista SQL Preview
- Botón **👁️ Vista SQL**: genera el SQL que se ejecutará con resaltado de sintaxis.

### 3. Probar SQL (Dry Run)
- Botón **🧪 Probar**: envía al backend con flag `probar: true` para validar sin ejecutar cambios.

### 4. Ejecutar Integración
- Botón **⚡ Ejecutar Integración**: requiere confirmación modal.
- Envía a `POST /api/creaciones/whatsapp`.

---

## SQL Generado (Resumen)
La ejecución inserta en `BOT_RED_CONF_VALORES`:

| ID Config | Descripción                                  |
|-----------|----------------------------------------------|
| 18        | Versión API: `3`                             |
| 19        | URL Partner API (Gupshup v3)                 |
| 20        | Auth Code                                    |
| 21        | App ID                                       |
| 22        | Flag habilitado: `1`                         |
| 23        | URL de marketing                             |
| 1         | Número de teléfono                           |
| 10        | API Key interna fija                         |
| 9         | URL base API Gupshup                         |
| 13        | Proveedor: `GUPSHUP`                         |
| 4 (x N)  | Una fila por cada URL de socket configurada  |
| 14        | Nombre App                                   |
| 17        | Token de Facebook fijo (para broadcasts)     |

Además:
- INSERT en `APLICACION_PLANTILLAS_WHATSAPP`
- INSERT en `BROADCAST_PROCESOS_DETALLE`
- UPDATE en `BOT_REDES` (API=1, BAJO_DEMANDA=1)
- CREATE TABLE `whatsapp.WA_{idBot}_MESSAGES`
- ALTER TABLE (índices)
- UPDATE `PARAMETROS` (habilitar menú interactivo, optin, suscripción)

---

## Endpoints Backend

| Método | Endpoint                              | Descripción                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/creaciones/empresas/{dbKey}`    | Lista de empresas de la BD               |
| GET    | `/api/creaciones/bots/{dbKey}/{idEmp}`| Lista de bots de la empresa              |
| GET    | `/api/creaciones/bot-redes/{dbKey}/{idBot}` | Lista de bot_redes del bot         |
| GET    | `/api/numeros-demos/disponibles`      | Lista de números demos disponibles       |
| POST   | `/api/creaciones/whatsapp`            | Ejecuta la integración                   |
| POST   | `/api/numeros-demos/{id}/ocupar`      | Marca un número demo como OCUPADO        |

---

## Notas para Desarrolladores
- La tabla `whatsapp.WA_{idBot}_MESSAGES` se crea con `CREATE TABLE` — si ya existe, el backend la maneja como idempotente.
- Si se modifica la lógica de integración, actualizar este documento.
- Ver `.windsurfrules` para las reglas de actualización de documentación.
