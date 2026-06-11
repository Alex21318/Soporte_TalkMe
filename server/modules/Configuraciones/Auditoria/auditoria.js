/**
 * ==========================================================================
 * AUDITORÍA - Sistema de Logs
 * ==========================================================================
 * Endpoints para registrar y consultar acciones del sistema
 */

const express = require('express');
const router = express.Router();

// Obtener pool de conexiones del archivo principal
let poolControl = null;

// Inicializar con el pool de la base de datos de control
function initAuditoria(pool) {
    poolControl = pool;
}

// ==========================================================================
// 1. REGISTRAR UNA ACCIÓN EN EL LOG
// ==========================================================================
router.post('/api/auditoria/log', async (req, res) => {
    if (!poolControl) {
        return res.status(500).json({ error: "Pool de base de datos no inicializado" });
    }

    const {
        tipo_accion,
        entidad,
        id_entidad,
        id_usuario_sistema,
        nombre_usuario,
        ip_address,
        user_agent,
        db_key,
        db_nombre,
        id_empresa,
        nombre_empresa,
        id_usuario_afectado,
        nombre_usuario_afec,
        id_skill,
        nombre_skill,
        id_bot_red,
        nombre_bot_red,
        id_tipo_cliente,
        nombre_tipo_cliente,
        valor_anterior,
        valor_nuevo,
        metadata,
        descripcion,
        exito = true,
        mensaje_error
    } = req.body;

    if (!tipo_accion || !entidad) {
        return res.status(400).json({ 
            error: "Campos requeridos: tipo_accion, entidad" 
        });
    }

    try {
        // Calcular hora de Guatemala (UTC-6)
        const now = new Date();
        const gtTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // Restar 6 horas para UTC-6
        const fechaHoraGT = gtTime.toISOString().slice(0, 19).replace('T', ' ');
        
        const query = `
            INSERT INTO AUDITORIA_LOGS (
                FECHA_HORA, TIPO_ACCION, ENTIDAD, ID_ENTIDAD,
                ID_USUARIO_SISTEMA, NOMBRE_USUARIO, IP_ADDRESS, USER_AGENT,
                DB_KEY, DB_NOMBRE, ID_EMPRESA, NOMBRE_EMPRESA,
                ID_USUARIO_AFECTADO, NOMBRE_USUARIO_AFEC,
                ID_SKILL, NOMBRE_SKILL,
                ID_BOT_RED, NOMBRE_BOT_RED,
                ID_TIPO_CLIENTE, NOMBRE_TIPO_CLIENTE,
                VALOR_ANTERIOR, VALOR_NUEVO, METADATA, DESCRIPCION,
                EXITO, MENSAJE_ERROR
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            fechaHoraGT,
            tipo_accion,
            entidad,
            id_entidad || null,
            id_usuario_sistema || null,
            nombre_usuario || 'SISTEMA',
            ip_address || req.ip || req.connection.remoteAddress,
            user_agent || req.headers['user-agent'],
            db_key || null,
            db_nombre || null,
            id_empresa || null,
            nombre_empresa || null,
            id_usuario_afectado || null,
            nombre_usuario_afec || null,
            id_skill || null,
            nombre_skill || null,
            id_bot_red || null,
            nombre_bot_red || null,
            id_tipo_cliente || null,
            nombre_tipo_cliente || null,
            valor_anterior ? (typeof valor_anterior === 'string' ? valor_anterior : JSON.stringify(valor_anterior)) : null,
            valor_nuevo ? (typeof valor_nuevo === 'string' ? valor_nuevo : JSON.stringify(valor_nuevo)) : null,
            metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null,
            descripcion || null,
            exito ? 1 : 0,
            mensaje_error || null
        ];

        const [result] = await poolControl.query(query, params);

        res.json({
            success: true,
            id_log: result.insertId,
            message: "Log registrado correctamente"
        });

    } catch (err) {
        console.error('[AUDITORIA] Error:', err.message);
        res.status(500).json({ 
            error: "Error al registrar log", 
            details: err.message 
        });
    }
});

// ==========================================================================
// 2. CONSULTAR LOGS (con filtros)
// ==========================================================================
router.get('/api/auditoria/logs', async (req, res) => {
    if (!poolControl) {
        return res.status(500).json({ error: "Pool de base de datos no inicializado" });
    }

    const {
        fecha_desde,
        fecha_hasta,
        tipo_accion,
        entidad,
        db_key,
        id_empresa,
        id_usuario_sistema,
        nombre_usuario,
        limit = 100,
        offset = 0
    } = req.query;

    try {
        let whereConditions = [];
        let params = [];

        if (fecha_desde) {
            whereConditions.push("FECHA_HORA >= ?");
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            whereConditions.push("FECHA_HORA <= ?");
            params.push(fecha_hasta);
        }
        if (tipo_accion) {
            whereConditions.push("TIPO_ACCION = ?");
            params.push(tipo_accion);
        }
        if (entidad) {
            whereConditions.push("ENTIDAD = ?");
            params.push(entidad);
        }
        if (db_key) {
            whereConditions.push("DB_KEY = ?");
            params.push(db_key);
        }
        if (id_empresa) {
            whereConditions.push("ID_EMPRESA = ?");
            params.push(parseInt(id_empresa));
        }
        if (id_usuario_sistema) {
            whereConditions.push("ID_USUARIO_SISTEMA = ?");
            params.push(parseInt(id_usuario_sistema));
        }
        if (nombre_usuario) {
            whereConditions.push("NOMBRE_USUARIO LIKE ?");
            params.push(`%${nombre_usuario}%`);
        }

        const whereClause = whereConditions.length > 0 
            ? "WHERE " + whereConditions.join(" AND ") 
            : "";

        // Query para obtener los registros
        const query = `
            SELECT 
                ID_LOG, FECHA_HORA, TIPO_ACCION, ENTIDAD, ID_ENTIDAD,
                ID_USUARIO_SISTEMA, NOMBRE_USUARIO, IP_ADDRESS,
                DB_KEY, DB_NOMBRE, ID_EMPRESA, NOMBRE_EMPRESA,
                ID_USUARIO_AFECTADO, NOMBRE_USUARIO_AFEC,
                ID_SKILL, NOMBRE_SKILL,
                ID_BOT_RED, NOMBRE_BOT_RED,
                ID_TIPO_CLIENTE, NOMBRE_TIPO_CLIENTE,
                VALOR_ANTERIOR, VALOR_NUEVO, DESCRIPCION,
                EXITO, MENSAJE_ERROR
            FROM AUDITORIA_LOGS
            ${whereClause}
            ORDER BY FECHA_HORA DESC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await poolControl.query(query, params);

        // Query para contar total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM AUDITORIA_LOGS 
            ${whereClause}
        `;
        const countParams = params.slice(0, -2); // Remover limit y offset
        const [countResult] = await poolControl.query(countQuery, countParams);

        res.json({
            logs: rows,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (err) {
        console.error("Error al consultar logs de auditoría:", err);
        res.status(500).json({ 
            error: "Error al consultar logs", 
            details: err.message 
        });
    }
});

// ==========================================================================
// 3. OBTENER ESTADÍSTICAS DE AUDITORÍA
// ==========================================================================
router.get('/api/auditoria/stats', async (req, res) => {
    if (!poolControl) {
        return res.status(500).json({ error: "Pool de base de datos no inicializado" });
    }

    const { db_key, fecha_desde, fecha_hasta } = req.query;

    try {
        let whereConditions = [];
        let params = [];

        if (db_key) {
            whereConditions.push("DB_KEY = ?");
            params.push(db_key);
        }
        if (fecha_desde) {
            whereConditions.push("FECHA_HORA >= ?");
            params.push(fecha_desde);
        }
        if (fecha_hasta) {
            whereConditions.push("FECHA_HORA <= ?");
            params.push(fecha_hasta);
        }

        const whereClause = whereConditions.length > 0 
            ? "WHERE " + whereConditions.join(" AND ") 
            : "";

        // Estadísticas por tipo de acción
        const [acciones] = await poolControl.query(`
            SELECT TIPO_ACCION, COUNT(*) as cantidad
            FROM AUDITORIA_LOGS
            ${whereClause}
            GROUP BY TIPO_ACCION
            ORDER BY cantidad DESC
        `, params);

        // Estadísticas por entidad
        const [entidades] = await poolControl.query(`
            SELECT ENTIDAD, COUNT(*) as cantidad
            FROM AUDITORIA_LOGS
            ${whereClause}
            GROUP BY ENTIDAD
            ORDER BY cantidad DESC
        `, params);

        // Estadísticas por usuario
        const [usuarios] = await poolControl.query(`
            SELECT NOMBRE_USUARIO, COUNT(*) as cantidad
            FROM AUDITORIA_LOGS
            ${whereClause}
            GROUP BY NOMBRE_USUARIO
            ORDER BY cantidad DESC
            LIMIT 10
        `, params);

        // Total de logs y éxitos vs errores
        const [resumen] = await poolControl.query(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN EXITO = 1 THEN 1 ELSE 0 END) as exitosos,
                SUM(CASE WHEN EXITO = 0 THEN 1 ELSE 0 END) as errores
            FROM AUDITORIA_LOGS
            ${whereClause}
        `, params);

        res.json({
            por_accion: acciones,
            por_entidad: entidades,
            top_usuarios: usuarios,
            resumen: resumen[0]
        });

    } catch (err) {
        console.error("Error al obtener estadísticas de auditoría:", err);
        res.status(500).json({ 
            error: "Error al obtener estadísticas", 
            details: err.message 
        });
    }
});

// ==========================================================================
// 4. OBTENER TIPOS DE ACCIÓN ÚNICOS (para filtros)
// ==========================================================================
router.get('/api/auditoria/tipos-accion', async (req, res) => {
    if (!poolControl) {
        return res.status(500).json({ error: "Pool de base de datos no inicializado" });
    }

    try {
        const [rows] = await poolControl.query(`
            SELECT DISTINCT TIPO_ACCION
            FROM AUDITORIA_LOGS
            ORDER BY TIPO_ACCION
        `);

        res.json(rows.map(r => r.TIPO_ACCION));

    } catch (err) {
        console.error("Error al obtener tipos de acción:", err);
        res.status(500).json({ 
            error: "Error al obtener tipos de acción", 
            details: err.message 
        });
    }
});

// Función interna para registrar logs desde el propio backend
async function registrarLogInterno(data) {
    if (!poolControl) {
        console.error("No se puede registrar log interno: poolControl no inicializado");
        return null;
    }

    try {
        // Calcular hora de Guatemala (UTC-6)
        const now = new Date();
        const gtTime = new Date(now.getTime() - (6 * 60 * 60 * 1000)); // Restar 6 horas para UTC-6
        const fechaHoraGT = gtTime.toISOString().slice(0, 19).replace('T', ' ');
        
        const query = `
            INSERT INTO AUDITORIA_LOGS (
                FECHA_HORA, TIPO_ACCION, ENTIDAD, ID_ENTIDAD,
                ID_USUARIO_SISTEMA, NOMBRE_USUARIO, IP_ADDRESS, USER_AGENT,
                DB_KEY, DB_NOMBRE, ID_EMPRESA, NOMBRE_EMPRESA,
                ID_USUARIO_AFECTADO, NOMBRE_USUARIO_AFEC,
                ID_SKILL, NOMBRE_SKILL,
                ID_BOT_RED, NOMBRE_BOT_RED,
                ID_TIPO_CLIENTE, NOMBRE_TIPO_CLIENTE,
                VALOR_ANTERIOR, VALOR_NUEVO, METADATA, DESCRIPCION,
                EXITO, MENSAJE_ERROR
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const params = [
            fechaHoraGT,
            data.tipo_accion,
            data.entidad,
            data.id_entidad || null,
            data.id_usuario_sistema || null,
            data.nombre_usuario || 'SISTEMA_INTERNO',
            data.ip_address || '127.0.0.1',
            data.user_agent || 'BACKEND_SOPORTE',
            data.db_key || null,
            data.db_nombre || null,
            data.id_empresa || null,
            data.nombre_empresa || null,
            data.id_usuario_afectado || null,
            data.nombre_usuario_afec || null,
            data.id_skill || null,
            data.nombre_skill || null,
            data.id_bot_red || null,
            data.nombre_bot_red || null,
            data.id_tipo_cliente || null,
            data.nombre_tipo_cliente || null,
            data.valor_anterior ? (typeof data.valor_anterior === 'string' ? data.valor_anterior : JSON.stringify(data.valor_anterior)) : null,
            data.valor_nuevo ? (typeof data.valor_nuevo === 'string' ? data.valor_nuevo : JSON.stringify(data.valor_nuevo)) : null,
            data.metadata ? (typeof data.metadata === 'string' ? data.metadata : JSON.stringify(data.metadata)) : null,
            data.descripcion || null,
            data.exito ? 1 : 0,
            data.mensaje_error || null
        ];

        const [result] = await poolControl.query(query, params);
        return result.insertId;
    } catch (err) {
        console.error("Error en registrarLogInterno:", err);
        return null;
    }
}

module.exports = { router, initAuditoria, registrarLogInterno };
