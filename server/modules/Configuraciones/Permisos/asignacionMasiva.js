const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');

// Pools de conexión (se inicializan desde index.js)
let pools = null;

function initPools(p) {
    pools = p;
}

// Función helper para obtener nombre de DB
const mapDBName = (key) => key ? key.replace('db_', 'S') : 'Desconocido';

// ==========================================================================
// ASIGNACIÓN MASIVA - Gestión masiva de permisos por usuario ejemplo
// ==========================================================================

// 🔹 USUARIOS QUE TIENEN PERMISO A SKILLS ESPECÍFICAS
router.get('/api/usuarios/con-skills', async (req, res) => {
    const { db_key, id_empresa, ids_skill } = req.query;

    if (!db_key || !ids_skill) {
        return res.status(400).json({ error: "Faltan parametros db_key o ids_skill" });
    }

    try {
        const pool = pools[db_key];
        if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

        const skillIds = ids_skill.split(',').map(id => parseInt(id)).filter(Boolean);
        if (skillIds.length === 0) return res.json([]);

        const placeholders = skillIds.map(() => '?').join(',');
        let query, params;

        if (id_empresa) {
            query = `
                SELECT DISTINCT pus.ID_USUARIO
                FROM PERMISOS_USUARIOS_SKILLS pus
                INNER JOIN SKILLS s ON pus.ID_SKILL = s.ID_SKILL
                WHERE pus.ID_SKILL IN (${placeholders})
                AND s.ID_EMPRESA = ?
            `;
            params = [...skillIds, id_empresa];
        } else {
            query = `
                SELECT DISTINCT pus.ID_USUARIO
                FROM PERMISOS_USUARIOS_SKILLS pus
                WHERE pus.ID_SKILL IN (${placeholders})
            `;
            params = skillIds;
        }

        // Reemplazar SELECT DISTINCT ID_USUARIO por ID_USUARIO + ID_SKILL
        const queryDetalle = query.replace('SELECT DISTINCT pus.ID_USUARIO', 'SELECT pus.ID_USUARIO, pus.ID_SKILL');
        const [rows] = await pool.query(queryDetalle, params);

        // Construir mapa { id_usuario: [id_skill, ...] }
        const mapa = {};
        for (const r of rows) {
            if (!mapa[r.ID_USUARIO]) mapa[r.ID_USUARIO] = [];
            mapa[r.ID_USUARIO].push(r.ID_SKILL);
        }
        res.json(mapa);
    } catch (err) {
        console.error("Error al consultar usuarios con skills:", err);
        res.status(500).json({ error: "Error al consultar usuarios con skills" });
    }
});

// 🔹 USUARIOS QUE TIENEN PERMISO A BOT REDES ESPECÍFICAS
router.get('/api/usuarios/con-bot-redes', async (req, res) => {
    const { db_key, id_empresa, ids_bot_red } = req.query;

    if (!db_key || !ids_bot_red) {
        return res.status(400).json({ error: "Faltan parametros db_key o ids_bot_red" });
    }

    try {
        const pool = pools[db_key];
        if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

        const botRedIds = ids_bot_red.split(',').map(id => parseInt(id)).filter(Boolean);
        if (botRedIds.length === 0) return res.json([]);

        const placeholders = botRedIds.map(() => '?').join(',');
        let query, params;

        if (id_empresa) {
            query = `
                SELECT DISTINCT pubr.ID_USUARIO
                FROM PERMISOS_USUARIOS_BOT_REDES pubr
                INNER JOIN BOT_REDES br ON pubr.ID_BOT_REDES = br.ID_BOT_REDES
                INNER JOIN BOT b ON br.ID_BOT = b.ID_BOT
                WHERE pubr.ID_BOT_REDES IN (${placeholders})
                AND b.ID_EMPRESA = ?
            `;
            params = [...botRedIds, id_empresa];
        } else {
            query = `
                SELECT DISTINCT pubr.ID_USUARIO
                FROM PERMISOS_USUARIOS_BOT_REDES pubr
                WHERE pubr.ID_BOT_REDES IN (${placeholders})
            `;
            params = botRedIds;
        }

        // Reemplazar SELECT DISTINCT ID_USUARIO por ID_USUARIO + ID_BOT_REDES
        const queryDetalle = query.replace('SELECT DISTINCT pubr.ID_USUARIO', 'SELECT pubr.ID_USUARIO, pubr.ID_BOT_REDES');
        const [rows] = await pool.query(queryDetalle, params);

        // Construir mapa { id_usuario: [id_bot_red, ...] }
        const mapa = {};
        for (const r of rows) {
            if (!mapa[r.ID_USUARIO]) mapa[r.ID_USUARIO] = [];
            mapa[r.ID_USUARIO].push(r.ID_BOT_REDES);
        }
        res.json(mapa);
    } catch (err) {
        console.error("Error al consultar usuarios con bot redes:", err);
        res.status(500).json({ error: "Error al consultar usuarios con bot redes" });
    }
});

// 🔹 OBTENER SKILLS DISPONIBLES PARA ASIGNACIÓN MASIVA
router.get('/api/skills/disponibles', async (req, res) => {
    const { db_key, id_empresa, search = '', limit = 50 } = req.query;

    if (!db_key) {
        return res.status(400).json({ error: "Falta parametro db_key" });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: "Base de datos no configurada" });
    }

    try {
        let query = `
            SELECT s.ID_SKILL, s.NOMBRE_SKILL, s.ESTADO
            FROM SKILLS s
            WHERE s.ESTADO = 1 AND s.ELIMINADO = 0
        `;

        const params = [];

        if (id_empresa && id_empresa !== 'null' && id_empresa !== '') {
            query += ` AND s.ID_EMPRESA = ?`;
            params.push(parseInt(id_empresa));
        }

        if (search) {
            query += ` AND s.NOMBRE_SKILL LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY s.NOMBRE_SKILL LIMIT ?`;
        params.push(parseInt(limit));

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener skills disponibles:", err);
        res.status(500).json({ error: "Error al obtener skills" });
    }
});

// 🔹 OBTENER TIPOS DE CLIENTE DISPONIBLES
router.get('/api/tipos-cliente/disponibles', async (req, res) => {
    const { db_key, id_empresa, search = '', limit = 50 } = req.query;

    if (!db_key) {
        return res.status(400).json({ error: "Falta parametro db_key" });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: "Base de datos no configurada" });
    }

    try {
        let query = `
            SELECT DISTINCT tc.ID_TIPO, tc.NOMBRE_TIPO, tc.SISTEMA, tc.ESTADO
            FROM TIPO_CLIENTE tc
            WHERE tc.ESTADO = 1
        `;

        const params = [];

        if (id_empresa && id_empresa !== 'null' && id_empresa !== '') {
            query += ` AND EXISTS (
                SELECT 1 FROM PERMISOS_USUARIOS_CLIENTES puc 
                JOIN USUARIOS u ON puc.ID_USUARIO = u.ID_USUARIO 
                WHERE puc.ID_TIPO_CLIENTE = tc.ID_TIPO AND u.ID_EMPRESA = ?
            )`;
            params.push(parseInt(id_empresa));
        }

        if (search) {
            query += ` AND tc.NOMBRE_TIPO LIKE ?`;
            params.push(`%${search}%`);
        }

        query += ` ORDER BY tc.NOMBRE_TIPO LIMIT ?`;
        params.push(parseInt(limit));

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener tipos de cliente:", err);
        res.status(500).json({ error: "Error al obtener tipos de cliente" });
    }
});

// 🔹 OBTENER BOT_REDES DISPONIBLES
router.get('/api/bot-redes/disponibles', async (req, res) => {
    const { db_key, id_empresa, search = '', limit = 50 } = req.query;

    if (!db_key) {
        return res.status(400).json({ error: "Falta parametro db_key" });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: "Base de datos no configurada" });
    }

    try {
        let query = `
            SELECT DISTINCT
                br.ID_BOT_REDES,
                b.ID_BOT,
                b.DESCRIPCION as NOMBRE_BOT,
                rs.ID_RED_SOCIAL,
                rs.NOMBRE as NOMBRE_RED_SOCIAL,
                p.NOMBRE as NOMBRE_PAIS,
                br.ESTADO,
                br.MANTENIMIENTO
            FROM BOT_REDES br
            INNER JOIN BOT b ON br.ID_BOT = b.ID_BOT AND b.ESTADO = 1
            INNER JOIN REDES_SOCIALES rs ON br.ID_RED_SOCIAL = rs.ID_RED_SOCIAL
            LEFT JOIN PAISES p ON br.ID_PAIS = p.ID_PAIS
            WHERE br.ESTADO = 1
        `;

        const params = [];

        if (id_empresa && id_empresa !== 'null' && id_empresa !== '') {
            query += ` AND b.ID_EMPRESA = ?`;
            params.push(parseInt(id_empresa));
        }

        if (search) {
            query += ` AND (b.DESCRIPCION LIKE ? OR rs.NOMBRE LIKE ?)`;
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ` ORDER BY b.DESCRIPCION, rs.NOMBRE LIMIT ?`;
        params.push(parseInt(limit));

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener bot redes:", err);
        res.status(500).json({ error: "Error al obtener bot redes" });
    }
});

// 🔹 GESTIÓN MASIVA DE PERMISOS - Agregar permisos a múltiples usuarios
router.post('/api/permisos/masivo/agregar', authMiddleware, async (req, res) => {
    const { db_key, usuarios, permisos } = req.body;
    const creado_por = req.user?.usuario || 'sistema';

    // Validaciones
    if (!db_key || !Array.isArray(usuarios) || usuarios.length === 0 || !permisos) {
        return res.status(400).json({ error: "Faltan parametros requeridos: db_key, usuarios[], permisos{}" });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: "Base de datos no configurada" });
    }

    const resultados = {
        exitosos: [],
        errores: [],
        duplicados: []
    };

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
        // Procesar permisos de SKILLS
        if (permisos.skills && Array.isArray(permisos.skills) && permisos.skills.length > 0) {
            for (const id_usuario of usuarios) {
                for (const id_skill of permisos.skills) {
                    try {
                        // Verificar si ya existe
                        const [existente] = await conn.query(
                            "SELECT 1 FROM PERMISOS_USUARIOS_SKILLS WHERE ID_USUARIO = ? AND ID_SKILL = ? LIMIT 1",
                            [id_usuario, id_skill]
                        );

                        if (existente.length > 0) {
                            resultados.duplicados.push({ tipo: 'SKILL', id_usuario, id_skill });
                            continue;
                        }

                        // Insertar permiso
                        await conn.query(
                            "INSERT INTO PERMISOS_USUARIOS_SKILLS (ID_USUARIO, ID_SKILL, CREADO_EL, CREADO_POR) VALUES (?, ?, NOW(), ?)",
                            [id_usuario, id_skill, creado_por]
                        );
                        resultados.exitosos.push({ tipo: 'SKILL', id_usuario, id_skill });
                    } catch (err) {
                        resultados.errores.push({ tipo: 'SKILL', id_usuario, id_skill, error: err.message });
                    }
                }
            }
        }

        // Procesar permisos de TIPOS DE CLIENTE
        if (permisos.tipos_cliente && Array.isArray(permisos.tipos_cliente) && permisos.tipos_cliente.length > 0) {
            for (const id_usuario of usuarios) {
                for (const id_tipo of permisos.tipos_cliente) {
                    try {
                        // Verificar si ya existe
                        const [existente] = await conn.query(
                            "SELECT 1 FROM PERMISOS_USUARIOS_CLIENTES WHERE ID_USUARIO = ? AND ID_TIPO_CLIENTE = ? LIMIT 1",
                            [id_usuario, id_tipo]
                        );

                        if (existente.length > 0) {
                            resultados.duplicados.push({ tipo: 'TIPO_CLIENTE', id_usuario, id_tipo });
                            continue;
                        }

                        // Insertar permiso
                        await conn.query(
                            "INSERT INTO PERMISOS_USUARIOS_CLIENTES (ID_USUARIO, ID_TIPO_CLIENTE, CREADO_EL, CREADO_POR) VALUES (?, ?, NOW(), ?)",
                            [id_usuario, id_tipo, creado_por]
                        );
                        resultados.exitosos.push({ tipo: 'TIPO_CLIENTE', id_usuario, id_tipo });
                    } catch (err) {
                        resultados.errores.push({ tipo: 'TIPO_CLIENTE', id_usuario, id_tipo, error: err.message });
                    }
                }
            }
        }

        // Procesar permisos de BOT_REDES
        if (permisos.bot_redes && Array.isArray(permisos.bot_redes) && permisos.bot_redes.length > 0) {
            for (const id_usuario of usuarios) {
                for (const id_bot_red of permisos.bot_redes) {
                    try {
                        // Verificar si ya existe
                        const [existente] = await conn.query(
                            "SELECT 1 FROM PERMISOS_USUARIOS_BOT_REDES WHERE ID_USUARIO = ? AND ID_BOT_REDES = ? LIMIT 1",
                            [id_usuario, id_bot_red]
                        );

                        if (existente.length > 0) {
                            resultados.duplicados.push({ tipo: 'BOT_RED', id_usuario, id_bot_red });
                            continue;
                        }

                        // Insertar permiso
                        await conn.query(
                            "INSERT INTO PERMISOS_USUARIOS_BOT_REDES (ID_USUARIO, ID_BOT_REDES, CREADO_EL, CREADO_POR) VALUES (?, ?, NOW(), ?)",
                            [id_usuario, id_bot_red, creado_por]
                        );
                        resultados.exitosos.push({ tipo: 'BOT_RED', id_usuario, id_bot_red });
                    } catch (err) {
                        resultados.errores.push({ tipo: 'BOT_RED', id_usuario, id_bot_red, error: err.message });
                    }
                }
            }
        }

        await conn.commit();

        res.json({
            success: true,
            mensaje: `Proceso completado: ${resultados.exitosos.length} exitosos, ${resultados.duplicados.length} duplicados, ${resultados.errores.length} errores`,
            resultados
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error en permisos masivos:", err);
        res.status(500).json({ error: "Error al procesar permisos masivos", detalle: err.message });
    } finally {
        conn.release();
    }
});

// 🔹 GESTIÓN MASIVA DE PERMISOS - Eliminar permisos a múltiples usuarios
router.post('/api/permisos/masivo/eliminar', authMiddleware, async (req, res) => {
    const { db_key, usuarios, permisos } = req.body;

    // Validaciones
    if (!db_key || !Array.isArray(usuarios) || usuarios.length === 0 || !permisos) {
        return res.status(400).json({ error: "Faltan parametros requeridos: db_key, usuarios[], permisos{}" });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: "Base de datos no configurada" });
    }

    const resultados = {
        exitosos: [],
        no_encontrados: [],
        errores: []
    };

    const conn = await pool.getConnection();
    await conn.beginTransaction();

    try {
        // Eliminar permisos de SKILLS
        if (permisos.skills && Array.isArray(permisos.skills) && permisos.skills.length > 0) {
            for (const id_usuario of usuarios) {
                for (const id_skill of permisos.skills) {
                    try {
                        const [result] = await conn.query(
                            "DELETE FROM PERMISOS_USUARIOS_SKILLS WHERE ID_USUARIO = ? AND ID_SKILL = ?",
                            [id_usuario, id_skill]
                        );

                        if (result.affectedRows > 0) {
                            resultados.exitosos.push({ tipo: 'SKILL', id_usuario, id_skill });
                        } else {
                            resultados.no_encontrados.push({ tipo: 'SKILL', id_usuario, id_skill });
                        }
                    } catch (err) {
                        resultados.errores.push({ tipo: 'SKILL', id_usuario, id_skill, error: err.message });
                    }
                }
            }
        }

        // Eliminar permisos de TIPOS DE CLIENTE
        if (permisos.tipos_cliente && Array.isArray(permisos.tipos_cliente) && permisos.tipos_cliente.length > 0) {
            for (const id_usuario of usuarios) {
                for (const id_tipo of permisos.tipos_cliente) {
                    try {
                        const [result] = await conn.query(
                            "DELETE FROM PERMISOS_USUARIOS_CLIENTES WHERE ID_USUARIO = ? AND ID_TIPO_CLIENTE = ?",
                            [id_usuario, id_tipo]
                        );

                        if (result.affectedRows > 0) {
                            resultados.exitosos.push({ tipo: 'TIPO_CLIENTE', id_usuario, id_tipo });
                        } else {
                            resultados.no_encontrados.push({ tipo: 'TIPO_CLIENTE', id_usuario, id_tipo });
                        }
                    } catch (err) {
                        resultados.errores.push({ tipo: 'TIPO_CLIENTE', id_usuario, id_tipo, error: err.message });
                    }
                }
            }
        }

        // Eliminar permisos de BOT_REDES
        if (permisos.bot_redes && Array.isArray(permisos.bot_redes) && permisos.bot_redes.length > 0) {
            for (const id_usuario of usuarios) {
                for (const id_bot_red of permisos.bot_redes) {
                    try {
                        const [result] = await conn.query(
                            "DELETE FROM PERMISOS_USUARIOS_BOT_REDES WHERE ID_USUARIO = ? AND ID_BOT_REDES = ?",
                            [id_usuario, id_bot_red]
                        );

                        if (result.affectedRows > 0) {
                            resultados.exitosos.push({ tipo: 'BOT_RED', id_usuario, id_bot_red });
                        } else {
                            resultados.no_encontrados.push({ tipo: 'BOT_RED', id_usuario, id_bot_red });
                        }
                    } catch (err) {
                        resultados.errores.push({ tipo: 'BOT_RED', id_usuario, id_bot_red, error: err.message });
                    }
                }
            }
        }

        await conn.commit();

        res.json({
            success: true,
            mensaje: `Proceso completado: ${resultados.exitosos.length} eliminados, ${resultados.no_encontrados.length} no encontrados, ${resultados.errores.length} errores`,
            resultados
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error en eliminacion masiva:", err);
        res.status(500).json({ error: "Error al eliminar permisos masivos", detalle: err.message });
    } finally {
        conn.release();
    }
});

// 🔹 OBTENER PERFILES DISPONIBLES
router.get('/api/seguridad/perfiles', async (req, res) => {
    const { db_key } = req.query;

    if (!db_key) {
        return res.status(400).json({ error: "Falta parametro db_key" });
    }

    // Determinar qué base de datos de seguridad usar
    const dbSeguridad = db_key.includes('ficohsa') || db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10' 
        ? 'db_10'  // Ficohsa
        : 'db_9';   // Talkme por defecto

    const poolSeguridad = pools[dbSeguridad];
    if (!poolSeguridad) {
        return res.status(400).json({ error: `Base de datos de seguridad no configurada` });
    }

    try {
        const query = `
            SELECT 
                P.SECPERFILID,
                P.NOMBRE,
                P.DESCRIPCION,
                P.ESTADO
            FROM SEG_PERFIL P
            WHERE P.ESTADO = 'ALTA'
            ORDER BY P.NOMBRE
        `;

        const [rows] = await poolSeguridad.query(query);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener perfiles:", err);
        res.status(500).json({ error: "Error al obtener perfiles" });
    }
});

// 🔹 OBTENER USUARIOS POR PERFIL
router.get('/api/usuarios/por-perfil', async (req, res) => {
    const { db_key, id_empresa, perfil_id } = req.query;

    if (!db_key || !id_empresa || !perfil_id) {
        return res.status(400).json({ error: "Faltan parametros: db_key, id_empresa, perfil_id" });
    }

    // Determinar qué base de datos de seguridad usar
    const dbSeguridad = db_key.includes('ficohsa') || db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10' 
        ? 'db_10'  // Ficohsa
        : 'db_9';   // Talkme por defecto

    const pool = pools[db_key];
    const poolSeguridad = pools[dbSeguridad];

    if (!pool) {
        return res.status(400).json({ error: "Base de datos principal no configurada" });
    }

    if (!poolSeguridad) {
        return res.status(400).json({ error: "Base de datos de seguridad no configurada" });
    }

    try {
        // Buscar usuarios del perfil en seguridad
        const querySeguridad = `
            SELECT DISTINCT U.USUARIO, U.SECUSUARIOID, U.ESTADO
            FROM SEG_USUARIO U
            JOIN SEG_PERMISO_USUARIO PU ON U.SECUSUARIOID = PU.SECUSUARIOID AND PU.SECPERFILID_PERMISO = ?
            WHERE U.ESTADO = 1
        `;

        const [usuariosSeguridad] = await poolSeguridad.query(querySeguridad, [perfil_id]);
        
        if (usuariosSeguridad.length === 0) {
            return res.json([]);
        }

        // Buscar esos usuarios en la BD principal
        const nombresUsuarios = usuariosSeguridad.map(u => u.USUARIO);
        const placeholders = nombresUsuarios.map(() => '?').join(',');
        
        const queryPrincipal = `
            SELECT ID_USUARIO, NOMBRE_USUARIO, ID_EMPRESA, ESTADO, NOMBRE, APELLIDO
            FROM USUARIOS
            WHERE NOMBRE_USUARIO IN (${placeholders})
            AND ID_EMPRESA = ?
            ORDER BY NOMBRE_USUARIO
        `;
        const params = [...nombresUsuarios, id_empresa];

        const [usuarios] = await pool.query(queryPrincipal, params);
        
        res.json(usuarios);
    } catch (err) {
        console.error("Error al obtener usuarios por perfil:", err);
        res.status(500).json({ error: "Error al consultar usuarios por perfil", detalle: err.message });
    }
});

// 🔹 OBTENER INFORMACIÓN DE USUARIOS DESDE SEGURIDAD
router.get('/api/usuarios/seguridad/info', async (req, res) => {
    const { db_key, nombre_usuario } = req.query;

    if (!db_key || !nombre_usuario) {
        return res.status(400).json({ error: "Faltan parametros: db_key y nombre_usuario" });
    }

    // Determinar qué base de datos de seguridad usar
    const dbSeguridad = db_key.includes('ficohsa') || db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10' 
        ? 'db_10'  // Ficohsa
        : 'db_9';   // Talkme por defecto

    const poolSeguridad = pools[dbSeguridad];
    if (!poolSeguridad) {
        return res.status(400).json({ error: `Base de datos de seguridad no configurada` });
    }

    try {
        const query = `
            SELECT 
                U.SECUSUARIOID,
                U.USUARIO,
                U.NOMBRE,
                U.APELLIDO,
                U.ESTADO,
                U.BLOQUEADO,
                U.CONECTADO,
                P.NOMBRE AS PERFIL,
                P.DESCRIPCION AS PERFIL_DESCRIPCION,
                UE.SECEMPRESAID
            FROM SEG_USUARIO U
            LEFT JOIN SEG_PERMISO_USUARIO PU ON U.SECUSUARIOID = PU.SECUSUARIOID AND PU.SECPERFILID_PERMISO IS NOT NULL
            LEFT JOIN SEG_PERFIL P ON PU.SECPERFILID_PERMISO = P.SECPERFILID
            LEFT JOIN SEG_USUARIO_EMPRESA UE ON U.SECUSUARIOID = UE.SECUSUARIOID
            WHERE U.USUARIO = ?
            ORDER BY P.NOMBRE
        `;

        const [rows] = await poolSeguridad.query(query, [nombre_usuario]);
        
        if (rows.length === 0) {
            return res.json({ 
                encontrado: false, 
                estado_alta: null,
                estado_conectado: null,
                perfiles: [] 
            });
        }

        // Agrupar perfiles
        const perfiles = [...new Set(rows.filter(r => r.PERFIL).map(r => r.PERFIL))];
        
        // Helper: convierte valores a boolean
        const toBool = (val) => {
            if (val === null || val === undefined) return null;
            if (Buffer.isBuffer(val)) return val[0] === 1;
            return val === 1 || val === '1' || val === true;
        };
        
        res.json({
            encontrado: true,
            secusuarioid: rows[0].SECUSUARIOID,
            usuario: rows[0].USUARIO,
            nombre_completo: `${rows[0].NOMBRE || ''} ${rows[0].APELLIDO || ''}`.trim(),
            estado_alta: rows[0].ESTADO === 'ALTA',
            estado_conectado: toBool(rows[0].CONECTADO),
            bloqueado: toBool(rows[0].BLOQUEADO),
            perfiles: perfiles,
            db_seguridad: dbSeguridad
        });
    } catch (err) {
        console.error("Error al obtener info de seguridad:", err);
        res.status(500).json({ error: "Error al consultar seguridad", detalle: err.message });
    }
});

// Exportar el router y la función de inicialización
module.exports = { router, initPools };
