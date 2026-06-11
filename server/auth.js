const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const path = require('path');

require('dotenv').config({
  path: path.join(__dirname, '.env'),
  quiet: true
});

const pools = require('./db');
const router = express.Router();

// Clave secreta para JWT (debe estar en .env)
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error('JWT_SECRET es requerido en .env. Genere uno con: openssl rand -hex 32');
}
const TOKEN_EXPIRY = '8h'; // Token válido por 8 horas
const SALT_ROUNDS = 12; // Número de rounds para bcrypt (más alto = más seguro pero más lento)

// Blacklist de tokens para logout (en producción usar Redis)
const tokenBlacklist = new Map();

// Limpiar tokens expirados de la blacklist cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [token, data] of tokenBlacklist.entries()) {
    if (now > data.expiresAt) {
      tokenBlacklist.delete(token);
    }
  }
}, 5 * 60 * 1000); // 5 minutos

// ==========================================
// UTILIDADES
// ==========================================

// Generar hash bcrypt de contraseña (más seguro que SHA-256)
const hashPassword = async (password) => {
    return await bcrypt.hash(password, SALT_ROUNDS);
};

// Verificar contraseña con bcrypt
const verifyPassword = async (password, hash) => {
    return await bcrypt.compare(password, hash);
};

// Generar token JWT simple (sin librería externa)
const generateToken = (payload) => {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (8 * 60 * 60); // 8 horas en segundos
    const body = Buffer.from(JSON.stringify({ ...payload, iat: now, exp })).toString('base64url');
    const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
    return `${header}.${body}.${signature}`;
};

// Verificar token JWT
const verifyToken = (token) => {
    try {
        // Verificar blacklist primero
        if (tokenBlacklist.has(token)) {
            const data = tokenBlacklist.get(token);
            if (Date.now() < data.expiresAt) {
                return null; // Token revocado
            } else {
                // Token expirado en blacklist, removerlo
                tokenBlacklist.delete(token);
            }
        }

        const [header, body, signature] = token.split('.');
        const expectedSignature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');

        if (signature !== expectedSignature) {
            return null;
        }

        const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
        const now = Math.floor(Date.now() / 1000);

        if (payload.exp < now) {
            return null; // Token expirado
        }

        return payload;
    } catch (error) {
        return null;
    }
};

// Middleware de autenticación
const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token de autenticación requerido' });
        }

        const token = authHeader.substring(7);
        const payload = verifyToken(token);

        if (!payload) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        // Verificar que el usuario sigue existiendo y activo
        const dbControl = pools['control'];
        const [users] = await dbControl.query(
            'SELECT id, usuario, nombre, activo, rol_id FROM USUARIOS_SISTEMA WHERE id = ? AND activo = 1',
            [payload.userId]
        );

        if (users.length === 0) {
            return res.status(401).json({ error: 'Usuario no encontrado o inactivo' });
        }

        req.user = users[0];
        next();
    } catch (error) {
        console.error('Error en auth middleware:', error);
        res.status(500).json({ error: 'Error de autenticación' });
    }
};

// Middleware de autorización por permiso
const requirePermission = (modulo, accion) => {
    return async (req, res, next) => {
        try {
            const dbControl = pools['control'];

            // Verificar permisos del rol
            let tienePermisoRol = false;
            if (req.user.rol_id) {
                const [permisosRol] = await dbControl.query(`
                    SELECT COUNT(*) as tiene_permiso
                    FROM ROL_PERMISOS rp
                    INNER JOIN PERMISOS p ON rp.permiso_id = p.id
                    WHERE rp.rol_id = ? AND p.modulo = ? AND p.accion = ?
                `, [req.user.rol_id, modulo, accion]);
                tienePermisoRol = permisosRol[0].tiene_permiso > 0;
            }

            // Verificar permisos individuales del usuario (con try-catch por si la tabla no existe)
            let tienePermisoUsuario = false;
            let tienePermisoNegado = false;
            try {
                const [permisosUsuario] = await dbControl.query(`
                    SELECT COUNT(*) as tiene_permiso
                    FROM USUARIO_PERMISOS up
                    INNER JOIN PERMISOS p ON up.permiso_id = p.id
                    WHERE up.usuario_id = ? AND p.modulo = ? AND p.accion = ? AND up.ESTADO = 'H'
                `, [req.user.id, modulo, accion]);
                tienePermisoUsuario = permisosUsuario[0].tiene_permiso > 0;

                // Verificar si el permiso está negado explícitamente
                const [permisosNegados] = await dbControl.query(`
                    SELECT COUNT(*) as tiene_permiso
                    FROM USUARIO_PERMISOS up
                    INNER JOIN PERMISOS p ON up.permiso_id = p.id
                    WHERE up.usuario_id = ? AND p.modulo = ? AND p.accion = ? AND up.ESTADO = 'N'
                `, [req.user.id, modulo, accion]);
                tienePermisoNegado = permisosNegados[0].tiene_permiso > 0;
            } catch (error) {
                console.log('[AUTH] Tabla USUARIO_PERMISOS no existe o error:', error.message);
                // Si la tabla no existe, continuar sin permisos individuales
            }

            // Si está negado explícitamente, no tiene permiso (aunque el rol lo conceda)
            if (tienePermisoNegado) {
                tienePermisoRol = false;
                tienePermisoUsuario = false;
            }

            // Tiene permiso si lo tiene por rol o individualmente
            if (!tienePermisoRol && !tienePermisoUsuario) {
                return res.status(403).json({ error: 'No tiene permisos para realizar esta acción' });
            }

            next();
        } catch (error) {
            console.error('Error en autorización:', error);
            res.status(500).json({ error: 'Error al verificar permisos' });
        }
    };
};

// Middleware para obtener permisos del usuario (opcional, para frontend)
const getUserPermissions = async (req, res, next) => {
    try {
        if (!req.user.rol_id) {
            req.user.permissions = [];
            return next();
        }

        const dbControl = pools['control'];
        const [permisos] = await dbControl.query(`
            SELECT p.modulo, p.accion
            FROM ROL_PERMISOS rp
            INNER JOIN PERMISOS p ON rp.permiso_id = p.id
            WHERE rp.rol_id = ?
        `, [req.user.rol_id]);

        req.user.permissions = permisos.map(p => `${p.modulo}:${p.accion}`);
        next();
    } catch (error) {
        console.error('Error al obtener permisos:', error);
        req.user.permissions = [];
        next();
    }
};

// ==========================================
// ENDPOINTS DE AUTENTICACIÓN
// ==========================================

// LOGIN
router.post('/api/auth/login', async (req, res) => {
    const { usuario, password } = req.body;

    // Validaciones
    if (!usuario || !password) {
        return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Sanitizar entrada
    const usuarioClean = String(usuario).trim().toLowerCase().substring(0, 50);

    try {
        const dbControl = pools['control'];

        // Buscar usuario
        const [users] = await dbControl.query(
            'SELECT id, usuario, nombre, password_hash, activo, rol_id, ultimo_acceso, intentos_fallidos, ultimo_intento_fallido FROM USUARIOS_SISTEMA WHERE usuario = ?',
            [usuarioClean]
        );

        if (users.length === 0) {
            // Delay para prevenir timing attacks
            await new Promise(r => setTimeout(r, 100));
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = users[0];

        // Verificar que esté activo
        if (!user.activo) {
            return res.status(401).json({ error: 'Usuario inactivo. Contacte al administrador.' });
        }

        // Verificar bloqueo por demasiados intentos fallidos (5 intentos en 15 minutos)
        const MAX_FAILED_ATTEMPTS = 5;
        const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutos

        if (user.intentos_fallidos >= MAX_FAILED_ATTEMPTS && user.ultimo_intento_fallido) {
            const tiempoBloqueo = user.ultimo_intento_fallido.getTime() + LOCKOUT_TIME_MS;
            if (Date.now() < tiempoBloqueo) {
                const minutosRestantes = Math.ceil((tiempoBloqueo - Date.now()) / 60000);
                return res.status(429).json({
                    error: `Cuenta bloqueada temporalmente por demasiados intentos. Intente en ${minutosRestantes} minutos.`
                });
            }
        }

        // Verificar contraseña con bcrypt
        const passwordValid = await verifyPassword(password, user.password_hash);

        if (!passwordValid) {
            // Registrar intento fallido
            const nuevoIntento = (user.intentos_fallidos || 0) + 1;
            await dbControl.query(
                'UPDATE USUARIOS_SISTEMA SET intentos_fallidos = ?, ultimo_intento_fallido = NOW() WHERE id = ?',
                [nuevoIntento, user.id]
            );

            // Si alcanzó el máximo de intentos, informar al usuario
            if (nuevoIntento >= MAX_FAILED_ATTEMPTS) {
                return res.status(429).json({
                    error: 'Demasiados intentos fallidos. Cuenta bloqueada por 15 minutos.'
                });
            }

            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Resetear intentos fallidos y actualizar último acceso
        await dbControl.query(
            'UPDATE USUARIOS_SISTEMA SET intentos_fallidos = 0, ultimo_intento_fallido = NULL, ultimo_acceso = NOW() WHERE id = ?',
            [user.id]
        );

        // Generar token
        const token = generateToken({
            userId: user.id,
            usuario: user.usuario,
            nombre: user.nombre
        });

        // Obtener permisos del usuario (rol + individuales)
        let permissions = [];
        if (user.rol_id) {
            const [permisosRol] = await dbControl.query(`
                SELECT p.modulo, p.accion
                FROM ROL_PERMISOS rp
                INNER JOIN PERMISOS p ON rp.permiso_id = p.id
                WHERE rp.rol_id = ?
            `, [user.rol_id]);
            permissions = permisosRol.map(p => `${p.modulo}:${p.accion}`);
        }

        // Obtener permisos individuales del usuario (con try-catch por si la tabla no existe)
        let permisosH = [];
        let permisosN = [];
        try {
            const [permisosHResult] = await dbControl.query(`
                SELECT p.modulo, p.accion
                FROM USUARIO_PERMISOS up
                INNER JOIN PERMISOS p ON up.permiso_id = p.id
                WHERE up.usuario_id = ? AND up.ESTADO = 'H'
            `, [user.id]);
            permisosH = permisosHResult;
            const [permisosNResult] = await dbControl.query(`
                SELECT p.modulo, p.accion
                FROM USUARIO_PERMISOS up
                INNER JOIN PERMISOS p ON up.permiso_id = p.id
                WHERE up.usuario_id = ? AND up.ESTADO = 'N'
            `, [user.id]);
            permisosN = permisosNResult;
        } catch (error) {
            // Si la tabla no existe o no tiene columna ESTADO, continuar sin permisos individuales
        }

        const permisosHFormat = permisosH.map(p => `${p.modulo}:${p.accion}`);
        const permisosNFormat = permisosN.map(p => `${p.modulo}:${p.accion}`);

        // Combinar permisos: rol + habilitados - negados
        const permisosMap = new Map();
        permissions.forEach(p => permisosMap.set(p, p));
        permisosHFormat.forEach(p => permisosMap.set(p, p));
        permisosNFormat.forEach(p => permisosMap.delete(p));

        const finalPermissions = Array.from(permisosMap.values());

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre,
                rolId: user.rol_id,
                permissions: finalPermissions
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al procesar el login' });
    }
});

// VERIFICAR TOKEN (para validar sesión al cargar la app)
router.get('/api/auth/verify', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];

        // Obtener permisos del usuario (rol + individuales)
        let permissions = [];
        if (req.user.rol_id) {
            const [permisosRol] = await dbControl.query(`
                SELECT p.modulo, p.accion
                FROM ROL_PERMISOS rp
                INNER JOIN PERMISOS p ON rp.permiso_id = p.id
                WHERE rp.rol_id = ?
            `, [req.user.rol_id]);
            permissions = permisosRol.map(p => `${p.modulo}:${p.accion}`);
        }

        // Obtener permisos individuales del usuario (con try-catch por si la tabla no existe)
        let permisosH = [];
        let permisosN = [];
        try {
            const [permisosHResult] = await dbControl.query(`
                SELECT p.modulo, p.accion
                FROM USUARIO_PERMISOS up
                INNER JOIN PERMISOS p ON up.permiso_id = p.id
                WHERE up.usuario_id = ? AND up.ESTADO = 'H'
            `, [req.user.id]);
            permisosH = permisosHResult;
            const [permisosNResult] = await dbControl.query(`
                SELECT p.modulo, p.accion
                FROM USUARIO_PERMISOS up
                INNER JOIN PERMISOS p ON up.permiso_id = p.id
                WHERE up.usuario_id = ? AND up.ESTADO = 'N'
            `, [req.user.id]);
            permisosN = permisosNResult;
        } catch (error) {
            // Si la tabla no existe o no tiene columna ESTADO, continuar sin permisos individuales
        }

        const permisosHFormat = permisosH.map(p => `${p.modulo}:${p.accion}`);
        const permisosNFormat = permisosN.map(p => `${p.modulo}:${p.accion}`);

        // Combinar permisos: rol + habilitados - negados
        const permisosMap = new Map();
        permissions.forEach(p => permisosMap.set(p, p));
        permisosHFormat.forEach(p => permisosMap.set(p, p));
        permisosNFormat.forEach(p => permisosMap.delete(p));

        res.json({
            success: true,
            user: {
                id: req.user.id,
                usuario: req.user.usuario,
                nombre: req.user.nombre,
                rolId: req.user.rol_id,
                permissions: Array.from(permisosMap.values())
            }
        });
    } catch (error) {
        console.error('Error en verify:', error);
        res.status(500).json({ error: 'Error al verificar sesión' });
    }
});

// LOGOUT (invalidar token en blacklist)
router.post('/api/auth/logout', authMiddleware, async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7);
            const payload = verifyToken(token);

            if (payload) {
                // Agregar a blacklist hasta su expiración original
                tokenBlacklist.set(token, {
                    expiresAt: payload.exp * 1000,
                    userId: payload.userId
                });
            }
        }

        res.json({ success: true, message: 'Sesión cerrada correctamente' });
    } catch (error) {
        console.error('Error en logout:', error);
        res.status(500).json({ error: 'Error al cerrar sesión' });
    }
});

// Validador de fortaleza de contraseña
const validatePasswordStrength = (password) => {
    // Mínimo 12 caracteres, al menos una mayúscula, una minúscula, un número y un símbolo
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{12,}$/;
    return passwordRegex.test(password);
};

// CAMBIAR CONTRASEÑA
router.post('/api/auth/cambiar-password', authMiddleware, async (req, res) => {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
        return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (!validatePasswordStrength(passwordNuevo)) {
        return res.status(400).json({ 
            error: 'La contraseña debe tener al menos 12 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos (@$!%*?&)' 
        });
    }

    try {
        const dbControl = pools['control'];

        // Verificar contraseña actual
        const [users] = await dbControl.query(
            'SELECT password_hash FROM USUARIOS_SISTEMA WHERE id = ?',
            [req.user.id]
        );

        const passwordValid = await verifyPassword(passwordActual, users[0].password_hash);

        if (!passwordValid) {
            return res.status(401).json({ error: 'Contraseña actual incorrecta' });
        }

        // Actualizar contraseña
        const newHash = await hashPassword(passwordNuevo);
        await dbControl.query(
            'UPDATE USUARIOS_SISTEMA SET password_hash = ?, cambio_password = NOW() WHERE id = ?',
            [newHash, req.user.id]
        );

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });

    } catch (error) {
        console.error('Error cambiando password:', error);
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
});

// VERIFICAR SI SISTEMA NECESITA INICIALIZACIÓN
router.get('/api/auth/check-init', async (req, res) => {
    try {
        const dbControl = pools['control'];

        // Verificar si existe la tabla
        const [tableExists] = await dbControl.query(
            "SHOW TABLES LIKE 'USUARIOS_SISTEMA'"
        );

        if (tableExists.length === 0) {
            return res.json({ needsInit: true, reason: 'table_not_exists' });
        }

        // Verificar si hay usuarios
        const [users] = await dbControl.query('SELECT COUNT(*) as total FROM USUARIOS_SISTEMA');
        const totalUsers = users[0].total;

        res.json({ needsInit: totalUsers === 0, totalUsers });

    } catch (error) {
        console.error('Error verificando init:', error);
        // Si hay error (por ejemplo tabla no existe), asumimos que necesita init
        res.json({ needsInit: true, error: error.message });
    }
});

// INICIALIZAR USUARIO ADMIN (solo si no existe)
router.post('/api/auth/init-admin', async (req, res) => {
    const { usuario, password, nombre } = req.body;

    if (!usuario || !password || !nombre) {
        return res.status(400).json({ error: 'Usuario, contraseña y nombre son requeridos' });
    }

    if (!validatePasswordStrength(password)) {
        return res.status(400).json({ 
            error: 'La contraseña debe tener al menos 12 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos (@$!%*?&)' 
        });
    }

    try {
        const dbControl = pools['control'];

        // Verificar si ya existe algún usuario
        const [existingUsers] = await dbControl.query('SELECT COUNT(*) as total FROM USUARIOS_SISTEMA');
        const totalUsers = existingUsers[0].total;

        if (totalUsers > 0) {
            return res.status(403).json({ error: 'Ya existe al menos un usuario. Use el endpoint /api/auth/register con autenticación.' });
        }

        // Verificar si el usuario específico ya existe
        const [existing] = await dbControl.query(
            'SELECT id FROM USUARIOS_SISTEMA WHERE usuario = ?',
            [usuario.toLowerCase().trim()]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'El usuario ya existe' });
        }

        // Crear usuario administrador con bcrypt
        const passwordHash = await hashPassword(password);
        const [result] = await dbControl.query(
            `INSERT INTO USUARIOS_SISTEMA
             (usuario, password_hash, nombre, activo, creado_el)
             VALUES (?, ?, ?, 1, NOW())`,
            [usuario.toLowerCase().trim(), passwordHash, nombre.trim()]
        );

        res.json({
            success: true,
            message: 'Usuario administrador creado correctamente',
            userId: result.insertId,
            warning: 'Por seguridad, cambie la contraseña después del primer login'
        });

    } catch (error) {
        console.error('Error inicializando admin:', error);
        if (error.code === 'ER_NO_SUCH_TABLE') {
            return res.status(500).json({ error: 'La tabla USUARIOS_SISTEMA no existe. Ejecute el script SQL primero.' });
        }
        res.status(500).json({ error: 'Error al crear el usuario administrador' });
    }
});

// LISTAR USUARIOS DEL SISTEMA (requiere autenticación)
router.get('/api/auth/users', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];
        
        const [users] = await dbControl.query(`
            SELECT id, usuario, nombre, activo, creado_el, ultimo_acceso, intentos_fallidos
            FROM USUARIOS_SISTEMA
            ORDER BY creado_el DESC
        `);

        res.json({ users });

    } catch (error) {
        console.error('Error listando usuarios:', error);
        res.status(500).json({ error: 'Error al listar usuarios' });
    }
});

// CREAR USUARIO (solo para admins autenticados)
router.post('/api/auth/users', authMiddleware, async (req, res) => {
    const { usuario, password, nombre } = req.body;

    if (!usuario || !password || !nombre) {
        return res.status(400).json({ error: 'Usuario, contraseña y nombre son requeridos' });
    }

    if (!validatePasswordStrength(password)) {
        return res.status(400).json({ 
            error: 'La contraseña debe tener al menos 12 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos (@$!%*?&)' 
        });
    }

    try {
        const dbControl = pools['control'];

        // Verificar si el usuario ya existe
        const [existing] = await dbControl.query(
            'SELECT id FROM USUARIOS_SISTEMA WHERE usuario = ?',
            [usuario.toLowerCase().trim()]
        );

        if (existing.length > 0) {
            return res.status(409).json({ error: 'El usuario ya existe' });
        }

        // Crear usuario con bcrypt
        const passwordHash = await hashPassword(password);
        const [result] = await dbControl.query(
            `INSERT INTO USUARIOS_SISTEMA
             (usuario, password_hash, nombre, activo, creado_el)
             VALUES (?, ?, ?, 1, NOW())`,
            [usuario.toLowerCase().trim(), passwordHash, nombre.trim()]
        );

        res.json({
            success: true,
            message: 'Usuario creado correctamente',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Error creando usuario:', error);
        res.status(500).json({ error: 'Error al crear el usuario' });
    }
});

// ACTUALIZAR USUARIO (excepto campo usuario)
router.put('/api/auth/users/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { nombre, activo } = req.body;

    if (!nombre) {
        return res.status(400).json({ error: 'El nombre es requerido' });
    }

    try {
        const dbControl = pools['control'];

        const [result] = await dbControl.query(
            `UPDATE USUARIOS_SISTEMA
             SET nombre = ?, activo = ?
             WHERE id = ?`,
            [nombre.trim(), activo ? 1 : 0, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            message: 'Usuario actualizado correctamente'
        });

    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: 'Error al actualizar el usuario' });
    }
});

// CAMBIAR CONTRASEÑA COMO ADMIN
router.put('/api/auth/users/:id/password', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ error: 'La contraseña es requerida' });
    }

    if (!validatePasswordStrength(password)) {
        return res.status(400).json({ 
            error: 'La contraseña debe tener al menos 12 caracteres, incluyendo mayúsculas, minúsculas, números y símbolos (@$!%*?&)' 
        });
    }

    try {
        const dbControl = pools['control'];

        const passwordHash = await hashPassword(password);
        const [result] = await dbControl.query(
            `UPDATE USUARIOS_SISTEMA
             SET password_hash = ?, ultimo_cambio_password = NOW()
             WHERE id = ?`,
            [passwordHash, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({
            success: true,
            message: 'Contraseña actualizada correctamente'
        });

    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        res.status(500).json({ error: 'Error al cambiar la contraseña' });
    }
});

// ==========================================
// ENDPOINTS DE GESTIÓN DE ROLES Y PERMISOS
// ==========================================

// Obtener todos los roles
router.get('/api/auth/roles', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];
        const [roles] = await dbControl.query(`
            SELECT r.id, r.nombre, r.descripcion, r.creado_el,
                   COUNT(rp.id) as cantidad_permisos
            FROM ROLES r
            LEFT JOIN ROL_PERMISOS rp ON r.id = rp.rol_id
            GROUP BY r.id
            ORDER BY r.nombre
        `);
        res.json(roles);
    } catch (error) {
        console.error('Error obteniendo roles:', error);
        res.status(500).json({ error: 'Error al obtener roles' });
    }
});

// Obtener todos los permisos
router.get('/api/auth/permisos', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];
        const [permisos] = await dbControl.query(`
            SELECT p.id, p.modulo, p.accion, p.descripcion
            FROM PERMISOS p
            ORDER BY p.modulo, p.accion
        `);
        res.json(permisos);
    } catch (error) {
        console.error('Error obteniendo permisos:', error);
        res.status(500).json({ error: 'Error al obtener permisos' });
    }
});

// Obtener permisos de un rol específico
router.get('/api/auth/roles/:id/permisos', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];
        const [permisos] = await dbControl.query(`
            SELECT p.id, p.modulo, p.accion, p.descripcion
            FROM ROL_PERMISOS rp
            INNER JOIN PERMISOS p ON rp.permiso_id = p.id
            WHERE rp.rol_id = ?
            ORDER BY p.modulo, p.accion
        `, [req.params.id]);
        res.json(permisos);
    } catch (error) {
        console.error('Error obteniendo permisos del rol:', error);
        res.status(500).json({ error: 'Error al obtener permisos del rol' });
    }
});

// Asignar permisos a un rol
router.post('/api/auth/roles/:id/permisos', authMiddleware, async (req, res) => {
    try {
        const { permisoIds } = req.body;
        if (!Array.isArray(permisoIds)) {
            return res.status(400).json({ error: 'permisoIds debe ser un array' });
        }

        const dbControl = pools['control'];
        const rolId = req.params.id;

        // Eliminar permisos actuales del rol
        await dbControl.query('DELETE FROM ROL_PERMISOS WHERE rol_id = ?', [rolId]);

        // Insertar nuevos permisos
        if (permisoIds.length > 0) {
            const values = permisoIds.map(permisoId => `(${rolId}, ${permisoId})`).join(',');
            await dbControl.query(`INSERT INTO ROL_PERMISOS (rol_id, permiso_id) VALUES ${values}`);
        }

        res.json({ success: true, message: 'Permisos actualizados correctamente' });
    } catch (error) {
        console.error('Error actualizando permisos del rol:', error);
        res.status(500).json({ error: 'Error al actualizar permisos del rol' });
    }
});

// Obtener permisos de un usuario específico (combina permisos del rol + permisos individuales)
router.get('/api/auth/users/:id/permisos', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];
        const usuarioId = req.params.id;

        // Obtener permisos del rol del usuario
        const [usuario] = await dbControl.query(
            'SELECT rol_id FROM USUARIOS_SISTEMA WHERE id = ?',
            [usuarioId]
        );

        let permisosRol = [];
        if (usuario && usuario[0] && usuario[0].rol_id) {
            const [permisos] = await dbControl.query(`
                SELECT p.*
                FROM PERMISOS p
                INNER JOIN ROL_PERMISOS rp ON p.id = rp.permiso_id
                WHERE rp.rol_id = ?
            `, [usuario[0].rol_id]);
            permisosRol = permisos;
        }

        // Obtener permisos individuales del usuario (H=habilitado, N=negado)
        let permisosH = [];
        let permisosN = [];
        try {
            const [permisosHResult] = await dbControl.query(`
                SELECT p.*
                FROM PERMISOS p
                INNER JOIN USUARIO_PERMISOS up ON p.id = up.permiso_id
                WHERE up.usuario_id = ? AND up.ESTADO = 'H'
            `, [usuarioId]);
            permisosH = permisosHResult;
            const [permisosNResult] = await dbControl.query(`
                SELECT p.*
                FROM PERMISOS p
                INNER JOIN USUARIO_PERMISOS up ON p.id = up.permiso_id
                WHERE up.usuario_id = ? AND up.ESTADO = 'N'
            `, [usuarioId]);
            permisosN = permisosNResult;
        } catch (error) {
            // Si la tabla no existe o no tiene columna ESTADO
        }

        // Combinar permisos: rol + habilitados - negados
        const permisosMap = new Map();

        // Primero agregar permisos del rol
        permisosRol.forEach(p => permisosMap.set(p.id, p));

        // Luego agregar permisos individuales habilitados
        permisosH.forEach(p => permisosMap.set(p.id, p));

        // Finalmente, remover permisos negados
        permisosN.forEach(p => permisosMap.delete(p.id));

        const finalPermisos = Array.from(permisosMap.values());

        res.json(finalPermisos);
    } catch (error) {
        console.error('Error obteniendo permisos del usuario:', error);
        res.status(500).json({ error: 'Error al obtener permisos del usuario' });
    }
});

// Asignar permisos directos a un usuario (sobrescribe permisos del rol)
router.post('/api/auth/users/:id/permisos', authMiddleware, async (req, res) => {
    try {
        const { permisoIds } = req.body;
        if (!Array.isArray(permisoIds)) {
            return res.status(400).json({ error: 'permisoIds debe ser un array' });
        }

        const dbControl = pools['control'];
        const usuarioId = req.params.id;

        // Obtener permisos del rol del usuario
        const [usuario] = await dbControl.query(
            'SELECT rol_id FROM USUARIOS_SISTEMA WHERE id = ?',
            [usuarioId]
        );

        let permisoIdsRol = [];
        if (usuario && usuario[0] && usuario[0].rol_id) {
            const [permisosRol] = await dbControl.query(
                'SELECT permiso_id FROM ROL_PERMISOS WHERE rol_id = ?',
                [usuario[0].rol_id]
            );
            permisoIdsRol = permisosRol.map(rp => rp.permiso_id);
        }

        // Calcular permisos habilitados (H) y negados (N):
        // H = permisos marcados que NO estan en el rol (son adicionales)
        // N = permisos del rol que NO estan marcados (se niegan explicitamente)
        const habilitaIds = permisoIds.filter(id => !permisoIdsRol.includes(id));
        const niegaIds = permisoIdsRol.filter(id => !permisoIds.includes(id));

        // Eliminar todos los permisos individuales actuales del usuario
        await dbControl.query('DELETE FROM USUARIO_PERMISOS WHERE usuario_id = ?', [usuarioId]);

        // Insertar permisos habilitados (H)
        if (habilitaIds.length > 0) {
            const valuesH = habilitaIds.map(permisoId => `(${usuarioId}, ${permisoId}, 'H')`).join(',');
            await dbControl.query(`INSERT INTO USUARIO_PERMISOS (usuario_id, permiso_id, ESTADO) VALUES ${valuesH}`);
        }

        // Insertar permisos negados (N)
        if (niegaIds.length > 0) {
            const valuesN = niegaIds.map(permisoId => `(${usuarioId}, ${permisoId}, 'N')`).join(',');
            await dbControl.query(`INSERT INTO USUARIO_PERMISOS (usuario_id, permiso_id, ESTADO) VALUES ${valuesN}`);
        }

        res.json({ success: true, message: 'Permisos del usuario actualizados correctamente' });
    } catch (error) {
        console.error('Error actualizando permisos del usuario:', error);
        res.status(500).json({ error: 'Error al actualizar permisos del usuario' });
    }
});

// Crear nuevo rol
router.post('/api/auth/roles', authMiddleware, async (req, res) => {
    try {
        const { nombre, descripcion } = req.body;
        if (!nombre || !nombre.trim()) {
            return res.status(400).json({ error: 'El nombre del rol es requerido' });
        }

        const dbControl = pools['control'];
        const [result] = await dbControl.query(
            'INSERT INTO ROLES (nombre, descripcion) VALUES (?, ?)',
            [nombre.trim(), descripcion || null]
        );

        res.json({ success: true, id: result.insertId, message: 'Rol creado correctamente' });
    } catch (error) {
        console.error('Error creando rol:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Ya existe un rol con ese nombre' });
        }
        res.status(500).json({ error: 'Error al crear rol' });
    }
});

// Actualizar rol de usuario
router.put('/api/auth/users/:id/rol', authMiddleware, async (req, res) => {
    try {
        const { rolId } = req.body;
        const userId = req.params.id;

        const dbControl = pools['control'];
        await dbControl.query(
            'UPDATE USUARIOS_SISTEMA SET rol_id = ? WHERE id = ?',
            [rolId || null, userId]
        );

        res.json({ success: true, message: 'Rol actualizado correctamente' });
    } catch (error) {
        console.error('Error actualizando rol de usuario:', error);
        res.status(500).json({ error: 'Error al actualizar rol de usuario' });
    }
});

// Listar usuarios (para gestión de roles)
router.get('/api/auth/users', authMiddleware, async (req, res) => {
    try {
        const dbControl = pools['control'];
        const [users] = await dbControl.query(`
            SELECT id, usuario, nombre, rol_id, activo
            FROM USUARIOS_SISTEMA
            ORDER BY nombre
        `);
        res.json(users);
    } catch (error) {
        console.error('Error obteniendo usuarios:', error);
        res.status(500).json({ error: 'Error al obtener usuarios' });
    }
});

module.exports = { router, authMiddleware, requirePermission, getUserPermissions };
