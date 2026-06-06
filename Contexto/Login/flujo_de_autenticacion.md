# 🔐 Flujo de Autenticación

## Descripción General
Pantalla de inicio de sesión del sistema de soporte TalkMe. Autentica a los usuarios del equipo de soporte contra el backend, gestiona el token JWT de sesión y ofrece la opción de recordar al usuario.

## Código Fuente
- **Frontend:** [Login.jsx](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Login/Login.jsx) | [Login.css](file:///d:/Proyectos/Soporte_TalkMe/src/pages/Login/Login.css)

---

## Campos del Formulario

| Campo        | Descripción                                    | Notas                                     |
|--------------|------------------------------------------------|-------------------------------------------|
| Usuario      | Nombre de usuario del soporte                 | Se carga desde `localStorage` si "Recordarme" estaba activo |
| Contraseña   | Contraseña del usuario                        | Toggle de visibilidad (ojo)               |
| Recordarme   | Checkbox para guardar el usuario en localStorage | Solo guarda el usuario, no la contraseña |

---

## Flujo de Autenticación

```
1. Usuario ingresa credenciales y presiona "Ingresar al Sistema".
2. POST /api/auth/login con { usuario, password }.
3. Si 401: muestra mensaje de error localizado (no redirige).
4. Si 200: 
   a. Guarda token JWT en sessionStorage ('auth_token').
   b. Guarda datos del usuario en sessionStorage ('user_info').
   c. Si "Recordarme" activado: guarda NOMBRE_USUARIO en localStorage ('remembered_user').
   d. Llama a onLoginSuccess(data.user) → App.jsx renderiza la pantalla principal.
```

---

## Gestión de Sesión

| Almacenamiento     | Clave           | Valor                    | Duración         |
|--------------------|-----------------|--------------------------|------------------|
| sessionStorage     | auth_token      | JWT token                | Hasta cerrar tab |
| sessionStorage     | user_info       | JSON del usuario         | Hasta cerrar tab |
| localStorage       | remembered_user | Nombre de usuario        | Persistente      |

---

## Estados Visuales

| Estado     | Descripción                                          |
|------------|------------------------------------------------------|
| Normal     | Formulario limpio                                    |
| Loading    | Botón con spinner "Iniciando sesión...", campos deshabilitados |
| Error      | Mensaje de error visible, campos con borde rojo     |

---

## Endpoint Backend

| Método | Endpoint        | Body                           | Respuesta                         |
|--------|-----------------|--------------------------------|-----------------------------------|
| POST   | `/api/auth/login` | `{ usuario, password }`      | `{ token, user }` o `{ error }` (401) |

---

## Notas para Desarrolladores
- El token JWT debe incluirse en todas las peticiones autenticadas vía `fetchWithAuth` (header `Authorization: Bearer {token}`).
- Si el token caduca, `fetchWithAuth` redirige automáticamente al login.
- El diseño usa orbes animados (`.gradient-orb`) y elementos flotantes decorativos.
- Ver `.windsurfrules` para las reglas de actualización de documentación.
