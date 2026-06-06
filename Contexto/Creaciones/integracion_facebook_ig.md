# 📘📷 Integración Facebook / Instagram

## Descripción General
Pestaña que configura la integración de Facebook (Mensajes y Comentarios) e Instagram (Mensajes y Comentarios) para una empresa/bot existente. Detecta automáticamente qué redes tiene disponibles el bot seleccionado, rellena los `ID_BOT_REDES` y genera el SQL de forma idempotente.

## Código Fuente
- **Frontend:** [IntegracionFBIG.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/IntegracionFBIG.jsx)
- **Componente reutilizable:** `LogIntegracion` exportado desde [IntegracionWhatsapp.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Creaciones/IntegracionWhatsapp.jsx)

---

## Flujo de Selección en Cascada
```
Base de Datos → Empresa → Bot → BOT_REDES detectados → Redes activas (FB/IG)
```

Al seleccionar el bot, el sistema consulta los `BOT_REDES` y:
1. Activa automáticamente las redes que detecta por nombre (`NOMBRE_RED`).
2. Pre-llena el `ID_BOT_REDES` correspondiente por red.
3. Muestra solo las redes detectadas como habilitables.

---

## Redes Configurables

| ID | Nombre              | Plataforma | Detección por NOMBRE_RED          |
|----|---------------------|------------|-----------------------------------|
| 1  | FB Mensajes         | fb         | Contiene "facebook", no "coment"  |
| 2  | FB Comentarios      | fb         | Contiene "facebook" y "coment"    |
| 3  | IG Mensajes         | ig         | Contiene "instagram", no "coment" |
| 4  | IG Comentarios      | ig         | Contiene "instagram" y "coment"   |

---

## Campos del Formulario

### Filtros Generales
| Campo       | Descripción                          |
|-------------|--------------------------------------|
| Base de Datos | BD origen (db_1 a db_5)           |
| Empresa     | Empresa con el bot                  |
| Bot         | Bot a configurar                    |
| Creado por  | Usuario de registro                 |

### Token de Acceso (se muestra si hay al menos una red activa)
| Campo | Descripción                     |
|-------|---------------------------------|
| Token | Token compartido para todas las redes FB/IG activas |

### Facebook (si hay FB activo)
| Campo        | Descripción                                 |
|--------------|---------------------------------------------|
| ID_BOT_REDES | Por red (mensajes / comentarios)           |
| ID Página FB | ID de la página de Facebook (compartido entre ambas redes FB) |

### Instagram (si hay IG activo)
| Campo            | Descripción                                |
|------------------|--------------------------------------------|
| ID_BOT_REDES     | Por red (mensajes / comentarios)           |
| ID Página IG     | ID de la página de IG (compartido entre ambas redes IG) |
| Cuenta Instagram | Nombre de usuario de Instagram             |

---

## Funcionalidades Principales

### 1. Auto-detección de Redes
- Al cargar `BOT_REDES` del bot seleccionado, el componente automáticamente activa las redes detectadas y pre-llena sus IDs.

### 2. Vista SQL Preview
- Botón **🔍 Ver SQL**: genera el script completo que se ejecutará.

### 3. Probar Integración (Dry Run)
- Botón **🧪 Probar**: POST al backend con `probar: true`, valida sin ejecutar.

### 4. Ejecutar Integración
- Botón **⚡ Ejecutar**: requiere confirmación modal. POST a `/api/creaciones/facebook-instagram`.
- Muestra log de resultado con resumen (creados, actualizados, ya_existia, sin_cambios).

---

## SQL Generado (Resumen)

Para cada red activa, inserta en `BOT_RED_CONF_VALORES`:

| Config ID | Descripción              |
|-----------|--------------------------|
| 6         | Token de acceso          |
| 3         | ID de Página (FB)        |
| 11        | ID de Página IG          |
| 7         | Cuenta de Instagram      |

Además para **Facebook** (si activo):
- CREATE TABLE `facebook.FB_{idBot}_COMMENTS`
- CREATE TABLE `facebook.FB_{idBot}_POSTS`
- CREATE TABLE `facebook.FB_{idBot}_MESSAGES` (+ índices)
- INSERT en `facebook.FB_INFOBOT` con valores predeterminados (verif_token, page_access_token, app_secret, app_id)

Para **Instagram** (si activo):
- CREATE TABLE `instagram.IG_{idBot}_MESSAGES`
- INSERT en `instagram.IG_INFOBOT` con valores predeterminados

---

## Valores Predeterminados en FB_INFOBOT / IG_INFOBOT
Estos valores son constantes en el código — **no se editan por el usuario**:

| Campo            | Valor                             |
|------------------|-----------------------------------|
| verifToken       | `TBwQhXjUgbuybb2n`               |
| pageAccessToken  | (token largo fijo)                |
| appSecret        | `9b6b13127c2a3b14cd454cadaa37eee4`|
| appId            | `202007725201740`                 |

---

## Endpoints Backend

| Método | Endpoint                                         | Descripción                        |
|--------|--------------------------------------------------|------------------------------------|
| GET    | `/api/creaciones/empresas/{dbKey}`               | Lista de empresas                  |
| GET    | `/api/creaciones/bots/{dbKey}/{idEmp}`           | Lista de bots                      |
| GET    | `/api/creaciones/bot-redes/{dbKey}/{idBot}`      | Lista de bot_redes del bot         |
| POST   | `/api/creaciones/facebook-instagram`             | Ejecuta o prueba la integración    |

---

## Notas para Desarrolladores
- Si se agregan más redes FB/IG, actualizar el array `REDES_DEF` y la función `matchRed()`.
- La ejecución es idempotente: duplicados se ignoran con resultados tipo `ya_existia`.
- Ver `.windsurfrules` para las reglas de actualización de documentación.
