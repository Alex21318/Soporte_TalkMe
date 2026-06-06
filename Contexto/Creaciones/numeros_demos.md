# 📱 Números Demos WhatsApp

## Descripción General
Catálogo de números de WhatsApp disponibles para demostraciones y pruebas. Permite registrar, editar, liberar y eliminar números demos. También incluye una funcionalidad de **validación en base de datos** para cruzar los números almacenados con los que realmente están activos en cada segmento de producción.

## Código Fuente
- **Frontend:** [NumerosDemos.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/NumerosDemos.jsx)

---

## Campos de un Número Demo

| Campo      | Descripción                                          | Notas                                       |
|------------|------------------------------------------------------|---------------------------------------------|
| Nombre App | Nombre de la aplicación Gupshup                     | Obligatorio. Ej: `DemosTalkme24`            |
| Número     | Número de teléfono                                  | Obligatorio. Ej: `50378248640`              |
| Auth Code  | Código de autenticación de Gupshup (`sk_...`)       | Opcional en registro                        |
| App ID     | UUID de la aplicación en Gupshup                    | Opcional en registro                        |
| Ambiente   | Tipo de demo                                        | `DEMO_TALKME` / `DEMO_PARNET` / `DEMO_IA_TALK` |
| Estado     | Estado del número                                   | `DISPONIBLE` / `OCUPADO` / `INACTIVO`       |
| Segmento   | Segmento en el que está activo (se llena por validación) | Ej: S1, S2, MDD, FS1                  |
| Empresa/Bot| Empresa y Bot que lo están usando (si OCUPADO)      | Se llena al ejecutar integración WhatsApp   |

---

## Funcionalidades Principales

### 1. Listado con Filtros y Paginación
- Filtros: **Búsqueda** (nombre/número/auth/appId), **Estado**, **Ambiente**.
- Paginación: 10 registros por página.
- Filas de números OCUPADOS se resaltan visualmente.

### 2. Crear / Editar Número
- Formulario inline: Nombre App*, Número*, Auth Code, App ID, Ambiente, Estado.
- Botón **➕ Nuevo Número**: abre formulario en modo creación.
- Ícono **✏️**: abre formulario precargado con los datos actuales.

### 3. Liberar Número (OCUPADO → DISPONIBLE)
- Botón **🔓** (visible solo en números OCUPADOS): cambia el estado a `DISPONIBLE` y limpia la referencia de empresa/bot.
- Requiere confirmación modal.
- Endpoint: `POST /api/numeros-demos/{id}/liberar`

### 4. Eliminar Número
- Botón **🗑️**: elimina el registro permanentemente.
- Requiere confirmación modal.
- Endpoint: `DELETE /api/numeros-demos/{id}`

### 5. Validar en Base de Datos
- Botón **🔍 Validar en DB**: abre panel de validación.
- Permite seleccionar una BD (db_1 a db_8, incluyendo Ficohsa).
- Ejecuta una consulta que compara los números del catálogo con los que están configurados en `BOT_RED_CONF_VALORES` de esa BD.
- Resultado: resumen de `totalConsultados`, `coincidenciasEncontradas`, `numerosActualizados` + tabla detallada con empresa, bot, ID_BOT_REDES y segmento de cada coincidencia.
- Endpoint: `POST /api/numeros-demos/validar`

---

## Estados del Sistema

| Estado       | Descripción                                      | Color (UI)  |
|--------------|--------------------------------------------------|-------------|
| DISPONIBLE   | Número libre para asignar a una demo             | Verde       |
| OCUPADO      | Número en uso por una empresa demo activa        | Amarillo/Naranja |
| INACTIVO     | Número desactivado temporalmente                 | Gris        |

## Ambientes

| Ambiente        | Descripción                           |
|-----------------|---------------------------------------|
| DEMO_TALKME     | Demo de la plataforma TalkMe         |
| DEMO_PARNET     | Demo para partner Parnet             |
| DEMO_IA_TALK    | Demo para módulo IA Talk             |

---

## Endpoints Backend

| Método | Endpoint                              | Descripción                              |
|--------|---------------------------------------|------------------------------------------|
| GET    | `/api/numeros-demos`                  | Lista todos los números demos            |
| GET    | `/api/numeros-demos/disponibles`      | Lista números con estado DISPONIBLE      |
| POST   | `/api/numeros-demos`                  | Crea un nuevo número demo                |
| PUT    | `/api/numeros-demos/{id}`             | Actualiza un número demo                 |
| DELETE | `/api/numeros-demos/{id}`             | Elimina un número demo                   |
| POST   | `/api/numeros-demos/{id}/liberar`     | Libera un número (OCUPADO → DISPONIBLE)  |
| POST   | `/api/numeros-demos/{id}/ocupar`      | Marca número como OCUPADO con empresa/bot|
| POST   | `/api/numeros-demos/validar`          | Valida números contra BD de producción  |

---

## Integración con Integración WhatsApp
Cuando se ejecuta una integración de WhatsApp usando un número demo:
1. El número se selecciona en el buscador de la pantalla de Integración WhatsApp.
2. Los datos se autocompletar en el formulario.
3. Al ejecutar exitosamente, el sistema llama automáticamente a `/api/numeros-demos/{id}/ocupar` con la empresa e `ID_BOT_REDES`.

---

## Notas para Desarrolladores
- El campo `SEGMENTO` (S1, S2, MDD, FS1, etc.) se actualiza automáticamente al ejecutar la validación.
- Los números OCUPADOS deben liberarse manualmente o cuando se elimine la empresa demo.
- Ver `.windsurfrules` para las reglas de actualización de documentación.
