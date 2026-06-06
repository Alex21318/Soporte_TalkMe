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
const JWT_SECRET = process.env.JWT_SECRET || 'tu-clave-secreta-muy-larga-aqui-minimo-32-caracteres';
const TOKEN_EXPIRY = '8h'; // Token válido por 8 horas
const SALT_ROUNDS = 12; // Número de rounds para bcrypt (más alto = más seguro pero más lento)

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
            'SELECT id, usuario, nombre, activo FROM USUARIOS_SISTEMA WHERE id = ? AND activo = 1',
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
            'SELECT id, usuario, nombre, password_hash, activo, ultimo_acceso FROM USUARIOS_SISTEMA WHERE usuario = ?',
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

        // Verificar contraseña con bcrypt
        const passwordValid = await verifyPassword(password, user.password_hash);

        if (!passwordValid) {
            // Registrar intento fallido
            await dbControl.query(
                'UPDATE USUARIOS_SISTEMA SET intentos_fallidos = intentos_fallidos + 1 WHERE id = ?',
                [user.id]
            );
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // Resetear intentos fallidos y actualizar último acceso
        await dbControl.query(
            'UPDATE USUARIOS_SISTEMA SET intentos_fallidos = 0, ultimo_acceso = NOW() WHERE id = ?',
            [user.id]
        );

        // Generar token
        const token = generateToken({
            userId: user.id,
            usuario: user.usuario,
            nombre: user.nombre
        });

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                usuario: user.usuario,
                nombre: user.nombre
            }
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: 'Error al procesar el login' });
    }
});

// VERIFICAR TOKEN (para validar sesión al cargar la app)
router.get('/api/auth/verify', authMiddleware, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            usuario: req.user.usuario,
            nombre: req.user.nombre
        }
    });
});

// LOGOUT (en el cliente se elimina el token, aquí podríamos invalidar en blacklist si fuera necesario)
router.post('/api/auth/logout', authMiddleware, async (req, res) => {
    // Aquí se podría agregar el token a una blacklist si se implementa
    res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

// CAMBIAR CONTRASEÑA
router.post('/api/auth/cambiar-password', authMiddleware, async (req, res) => {
    const { passwordActual, passwordNuevo } = req.body;

    if (!passwordActual || !passwordNuevo) {
        return res.status(400).json({ error: 'Contraseña actual y nueva son requeridas' });
    }

    if (passwordNuevo.length < 6) {
        return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
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

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
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

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
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

    if (password.length < 6) {
        return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
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

module.exports = { router, authMiddleware };
