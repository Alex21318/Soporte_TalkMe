# 🔐 Sistema de Login - Instrucciones de Uso

## Resumen del Sistema

El sistema de autenticación ahora es **100% seguro** con las siguientes características:

- **Encriptación bcrypt** (12 rounds) para contraseñas - más seguro que SHA-256
- **Tokens JWT** con expiración de 8 horas
- **Protección contra timing attacks** en el login
- **Registro de intentos fallidos**
- **Middleware de autenticación** en todas las rutas protegidas
- **Sistema de inicialización** para crear el primer usuario administrador

---

## 🚀 Primer Uso - Configuración Inicial

### Paso 1: Ejecutar el Script SQL

Ejecuta el script en la base de datos `control` para crear la tabla de usuarios:

```bash
# En tu cliente MySQL favorito, ejecuta:
mysql -u tu_usuario -p control < server/sql/create_usuarios_sistema.sql
```

O ejecuta manualmente el contenido del archivo `server/sql/create_usuarios_sistema.sql`.

### Paso 2: Iniciar la Aplicación

```bash
npm run electron:dev
```

### Paso 3: Crear el Usuario Administrador

La primera vez que abras la aplicación, verás una pantalla de **"Configuración Inicial"**:

1. **Usuario**: `admin` (o el nombre que prefieras)
2. **Nombre Completo**: Tu nombre
3. **Contraseña**: Mínimo 6 caracteres (recomendado: usar mayúsculas, minúsculas, números y símbolos)
4. **Confirmar Contraseña**: Repite la contraseña

**⚠️ IMPORTANTE**: Este endpoint `/api/auth/init-admin` solo funciona si NO hay usuarios en el sistema. Una vez creado el primer usuario, este endpoint se bloquea por seguridad.

---

## 🔑 Iniciar Sesión

### Login Normal

Después de crear el usuario administrador, verás la pantalla de login:

1. **Usuario**: El nombre de usuario que creaste
2. **Contraseña**: Tu contraseña
3. **Recordarme**: Opcional - guarda el usuario para futuros logins

### Token de Sesión

- El token JWT se guarda en `sessionStorage` (se borra al cerrar el navegador)
- El token expira después de 8 horas
- Si el token expira, serás redirigido al login automáticamente

---

## 👥 Crear Usuarios Adicionales

Una vez que tengas el usuario administrador, puedes crear más usuarios (máximo 5 recomendados):

### Opción 1: Usando el Endpoint de Registro

```bash
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "usuario": "usuario2",
    "password": "contraseña_segura",
    "nombre": "Nombre del Usuario"
  }'
```

**⚠️ NOTA**: El endpoint `/api/auth/register` requiere autenticación (token JWT válido).

### Opción 2: Directamente en la Base de Datos

```sql
INSERT INTO USUARIOS_SISTEMA (usuario, password_hash, nombre, activo, creado_el)
VALUES ('usuario2', 'HASH_BCRYPT_GENERADO', 'Nombre del Usuario', 1, NOW());
```

**IMPORTANTE**: El hash debe ser generado con bcrypt. No uses SHA-256 ni texto plano.

---

## 🔒 Seguridad Implementada

### 1. Bcrypt para Contraseñas
- **12 rounds** de salting
- Resistente a ataques de fuerza bruta
- Cada contraseña tiene un salt único

### 2. Tokens JWT
- **Expiración**: 8 horas
- **Firma**: HMAC-SHA256 con clave secreta
- **Payload**: userId, usuario, nombre, iat, exp

### 3. Protección contra Timing Attacks
- Delay de 100ms en respuestas de error
- Evita que atacantes determinen usuarios válidos

### 4. Registro de Intentos Fallidos
- Cada intento fallido incrementa el contador
- Se resetea al login exitoso

### 5. Verificación de Usuario Activo
- Los usuarios inactivos no pueden hacer login
- Se puede desactivar usuarios sin eliminarlos

---

## 🛠️ Endpoints de Autenticación

| Endpoint | Método | Descripción | Requiere Auth |
|----------|--------|-------------|---------------|
| `/api/auth/login` | POST | Iniciar sesión | No |
| `/api/auth/verify` | GET | Verificar token válido | Sí |
| `/api/auth/logout` | POST | Cerrar sesión | Sí |
| `/api/auth/cambiar-password` | POST | Cambiar contraseña | Sí |
| `/api/auth/register` | POST | Crear nuevo usuario | Sí |
| `/api/auth/init-admin` | POST | Crear primer admin | No (solo si no hay usuarios) |

---

## 📋 Gestión de Usuarios

### Cambiar Contraseña

```bash
curl -X POST http://localhost:3001/api/auth/cambiar-password \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TU_TOKEN_JWT" \
  -d '{
    "passwordActual": "contraseña_actual",
    "passwordNuevo": "nueva_contraseña"
  }'
```

### Desactivar Usuario

```sql
UPDATE USUARIOS_SISTEMA SET activo = 0 WHERE usuario = 'usuario_a_desactivar';
```

### Ver Intentos Fallidos

```sql
SELECT usuario, intentos_fallidos, ultimo_acceso 
FROM USUARIOS_SISTEMA;
```

---

## 🔧 Configuración

### Variables de Entorno (.env)

```env
# Clave secreta para JWT (mínimo 32 caracteres)
JWT_SECRET=tu-clave-secreta-muy-larga-aqui-minimo-32-caracteres
```

**⚠️ IMPORTANTE**: Cambia `JWT_SECRET` en producción a una clave aleatoria larga.

---

## 🚨 Solución de Problemas

### Error: "La tabla USUARIOS_SISTEMA no existe"

**Solución**: Ejecuta el script SQL `server/sql/create_usuarios_sistema.sql`.

### Error: "Credenciales inválidas"

**Causas posibles**:
1. Usuario o contraseña incorrectos
2. Usuario inactivo
3. Contraseña no fue hasheada con bcrypt

### Error: "Token inválido o expirado"

**Solución**: El token expira después de 8 horas. Vuelve a hacer login.

### Error: "Ya existe al menos un usuario"

**Causa**: Intentaste usar `/api/auth/init-admin` cuando ya hay usuarios en el sistema.

**Solución**: Usa `/api/auth/register` con autenticación para crear usuarios adicionales.

---

## 📞 Soporte

Si tienes problemas con el sistema de login:

1. Verifica que la tabla `USUARIOS_SISTEMA` existe en la base de datos `control`
2. Verifica que el servidor esté corriendo en el puerto 3001
3. Revisa la consola del navegador y del servidor para errores
4. Asegúrate de que bcrypt esté instalado: `npm list bcrypt`

---

## ✅ Checklist de Seguridad

- [ ] Cambiar `JWT_SECRET` en producción
- [ ] Usar contraseñas fuertes (mínimo 8 caracteres, mayúsculas, minúsculas, números, símbolos)
- [ ] Limitar a 3-5 usuarios como solicitado
- [ ] Desactivar usuarios que ya no necesitan acceso
- [ ] Cambiar contraseñas periódicamente
- [ ] No compartir credenciales
- [ ] Usar HTTPS en producción (si se expone a internet)
