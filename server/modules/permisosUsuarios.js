const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../auth');

// Pools de conexión (se inicializan desde index.js)
let pools = null;

function initPools(p) {
    pools = p;
}

// ==========================================================================
// PERMISOS TALKME - Gestión de permisos individuales de usuarios
// ==========================================================================

// 🔹 OBTENER PERMISOS DE USUARIO - Redes Sociales (Bot Redes)
router.get('/api/usuarios/permisos/redes', async (req, res) => {
    const { db_key, id_usuario } = req.query;
    
    if (!db_key || !id_usuario) {
        return res.status(400).json({ error: "Faltan parametros db_key o id_usuario" });
    }

    try {
        const pool = pools[db_key];
        if (!pool) {
            return res.status(400).json({ error: "Base de datos no configurada" });
        }

        const query = `
            SELECT DISTINCT
                d.ID_BOT_REDES,
                bot.ID_BOT,
                bot.DESCRIPCION as NOMBRE_BOT,
                c.ID_RED_SOCIAL,
                c.NOMBRE as NOMBRE_RED_SOCIAL,
                d.ID_PAIS,
                p.NOMBRE as NOMBRE_PAIS,
                d.ESTADO,
                d.MANTENIMIENTO
            FROM USUARIOS a
            INNER JOIN PERMISOS_USUARIOS_BOT_REDES pubr ON a.ID_USUARIO = pubr.ID_USUARIO
            INNER JOIN BOT_REDES d ON pubr.ID_BOT_REDES = d.ID_BOT_REDES
            INNER JOIN BOT bot ON d.ID_BOT = bot.ID_BOT
            INNER JOIN REDES_SOCIALES c ON d.ID_RED_SOCIAL = c.ID_RED_SOCIAL
            LEFT JOIN PAISES p ON d.ID_PAIS = p.ID_PAIS
            WHERE a.ID_USUARIO = ?
            AND d.ESTADO = 1
            ORDER BY bot.DESCRIPCION, c.NOMBRE
        `;

        const [rows] = await pool.query(query, [id_usuario]);
        res.json(rows);
    } catch (err) {
        console.error("Error al consultar permisos de redes:", err);
        res.status(500).json({ error: "Error al consultar permisos de redes sociales" });
    }
});

// 🔹 OBTENER PERMISOS DE USUARIO - Skills
router.get('/api/usuarios/permisos/skills', async (req, res) => {
    const { db_key, id_usuario } = req.query;
    
    if (!db_key || !id_usuario) {
        return res.status(400).json({ error: "Faltan parametros db_key o id_usuario" });
    }

    try {
        const pool = pools[db_key];
        if (!pool) {
            return res.status(400).json({ error: "Base de datos no configurada" });
        }

        const query = `
            SELECT 
                s.ID_SKILL,
                s.NOMBRE_SKILL,
                s.ESTADO,
                pus.CREADO_EL,
                pus.CREADO_POR
            FROM PERMISOS_USUARIOS_SKILLS pus
            INNER JOIN SKILLS s ON pus.ID_SKILL = s.ID_SKILL
            WHERE pus.ID_USUARIO = ?
            AND s.ESTADO = 1
            ORDER BY s.NOMBRE_SKILL
        `;

        const [rows] = await pool.query(query, [id_usuario]);
        res.json(rows);
    } catch (err) {
        console.error("Error al consultar permisos de skills:", err);
        res.status(500).json({ error: "Error al consultar permisos de skills" });
    }
});

// 🔹 OBTENER PERMISOS DE USUARIO - Tipos de Cliente
router.get('/api/usuarios/permisos/tipos-cliente', async (req, res) => {
    const { db_key, id_usuario } = req.query;
    
    if (!db_key || !id_usuario) {
        return res.status(400).json({ error: "Faltan parametros db_key o id_usuario" });
    }

    try {
        const pool = pools[db_key];
        if (!pool) {
            return res.status(400).json({ error: "Base de datos no configurada" });
        }

        const query = `
            SELECT 
                tc.ID_TIPO,
                tc.NOMBRE_TIPO,
                tc.ESTADO,
                tc.SISTEMA,
                puc.CREADO_EL,
                puc.CREADO_POR
            FROM PERMISOS_USUARIOS_CLIENTES puc
            INNER JOIN TIPO_CLIENTE tc ON puc.ID_TIPO_CLIENTE = tc.ID_TIPO
            WHERE puc.ID_USUARIO = ?
            AND tc.ESTADO = 1
            ORDER BY tc.NOMBRE_TIPO
        `;

        const [rows] = await pool.query(query, [id_usuario]);
        res.json(rows);
    } catch (err) {
        console.error("Error al consultar permisos de tipos de cliente:", err);
        res.status(500).json({ error: "Error al consultar permisos de tipos de cliente" });
    }
});

// 🔹 OBTENER SKILLS DE UN USUARIO ESPECÍFICO
router.get('/api/skills/usuario/:idUsuario', async (req, res) => {
    const { idUsuario } = req.params;
    const { db_key } = req.query;

    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        const query = `
            SELECT 
                PUS.ID_PERMISO_USUARIO_SKILL,
                PUS.ID_USUARIO,
                S.ID_SKILL, 
                S.NOMBRE_SKILL,
                S.ID_EMPRESA,
                E.NOMBRE AS NOMBRE_EMPRESA,
                PUS.CREADO_EL,
                PUS.CREADO_POR
            FROM PERMISOS_USUARIOS_SKILLS PUS
            INNER JOIN SKILLS S ON PUS.ID_SKILL = S.ID_SKILL
            LEFT JOIN EMPRESAS E ON S.ID_EMPRESA = E.ID_EMPRESA
            WHERE PUS.ID_USUARIO = ?
            ORDER BY S.NOMBRE_SKILL ASC
        `;

        const [rows] = await pools[db_key].query(query, [idUsuario]);
        res.json(rows);
    } catch (err) {
        console.error("Error en GET /api/skills/usuario/:idUsuario:", err);
        res.status(500).json({ error: "Error interno al consultar skills del usuario." });
    }
});

// 🔹 AGREGAR PERMISO DE SKILL A USUARIO
router.post('/api/skills/usuario/permiso', authMiddleware, async (req, res) => {
    const { db_key, id_usuario, id_skill } = req.body;
    const creado_por = req.user?.usuario || 'sistema';

    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    if (!id_usuario || !id_skill) {
        return res.status(400).json({ error: "ID Usuario y ID Skill son requeridos." });
    }

    try {
        // Verificar si ya existe el permiso
        const [existing] = await pools[db_key].query(
            "SELECT ID_PERMISO_USUARIO_SKILL FROM PERMISOS_USUARIOS_SKILLS WHERE ID_USUARIO = ? AND ID_SKILL = ?",
            [id_usuario, id_skill]
        );

        if (existing.length > 0) {
            return res.status(400).json({ error: "El usuario ya tiene asignado este skill." });
        }

        await pools[db_key].query(
            "INSERT INTO PERMISOS_USUARIOS_SKILLS (ID_USUARIO, ID_SKILL, CREADO_EL, CREADO_POR) VALUES (?, ?, NOW(), ?)",
            [id_usuario, id_skill, creado_por]
        );

        res.json({ success: true, message: "Permiso agregado correctamente." });
    } catch (err) {
        console.error("Error en POST /api/skills/usuario/permiso:", err);
        res.status(500).json({ error: "No se pudo agregar el permiso." });
    }
});

// 🔹 ELIMINAR PERMISO DE SKILL A USUARIO
router.delete('/api/skills/usuario/permiso/:idUsuario/:idSkill', authMiddleware, async (req, res) => {
    const { idUsuario, idSkill } = req.params;
    const { db_key } = req.query;

    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        const [result] = await pools[db_key].query(
            "DELETE FROM PERMISOS_USUARIOS_SKILLS WHERE ID_USUARIO = ? AND ID_SKILL = ?",
            [idUsuario, idSkill]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "No se encontró el permiso para eliminar." });
        }

        res.json({ success: true, message: "Permiso eliminado correctamente." });
    } catch (err) {
        console.error("Error en DELETE /api/skills/usuario/permiso:", err);
        res.status(500).json({ error: "No se pudo eliminar el permiso." });
    }
});

// Exportar el router y la función de inicialización
module.exports = { router, initPools };
