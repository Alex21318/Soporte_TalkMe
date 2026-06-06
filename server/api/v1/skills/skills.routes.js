const express = require('express');
const path = require('path');
const cron = require('node-cron');
const { fork } = require('child_process');

// Apunta al archivo .env en la raiz del proyecto
require('dotenv').config({ 
  path: path.join(__dirname, '.env'),
  quiet: true 
});

const pools = require('./db');
const { authMiddleware } = require('../../auth');

// Función helper para registrar auditoría usando el módulo interno
let auditoriaModulo = null;
let poolControl = null;

// Inicializar referencias (se llama desde index.js)
function initAuditoriaSkills(auditoria, pool) {
    auditoriaModulo = auditoria;
    poolControl = pool;
}

async function registrarAuditoria(datos) {
    try {
        // Intentar usar la función interna primero
        if (auditoriaModulo && auditoriaModulo.registrarLogInterno) {
            const id = await auditoriaModulo.registrarLogInterno(datos);
            if (id) {
                return id;
            }
        }
        
        // Fallback: usar HTTP si el módulo no está disponible
        const http = require('http');
        const body = JSON.stringify(datos);
        
        const options = {
            hostname: 'localhost',
            port: 3001,
            path: '/api/auditoria/log',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body)
            }
        };

        await new Promise((resolve, reject) => {
            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => {
                    if (res.statusCode >= 400) {
                        reject(new Error(`HTTP ${res.statusCode}: ${data}`));
                    } else {
                        resolve(data);
                    }
                });
            });
            
            req.on('error', reject);
            req.write(body);
            req.end();
        });
        
    } catch (error) {
        // Silenciar errores de auditoría para no afectar operaciones principales
    }
}

// 🔴 CAMBIO PRINCIPAL: Usamos express.Router() en lugar de express()
const router = express.Router();

// Funciones de utilidad para conversion de zona horaria (UTC-6 Guatemala)
const sumar6Horas = (hora) => {
    if (!hora) return null;
    let [h, m, s] = hora.split(':').map(Number);
    h = (h + 6) % 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
};

const restar6Horas = (hora) => {
    if (!hora) return null;
    let [h, m, s] = hora.split(':').map(Number);
    h = (h - 6 + 24) % 24;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s || 0).padStart(2, '0')}`;
};

const mapDBName = (key) => key ? key.replace('db_', 'S') : 'Desconocido';

const formatearDias = (diasBin) => {
    if (!diasBin) return '—';
    const labels = ['L','M','M','J','V','S','D'];
    return diasBin.split('').map((d, i) => d === '1' ? labels[i] : '-').join(' ');
};

const formatearFecha = (fechaObj) => {
    if (!fechaObj) return '--';
    const d = new Date(fechaObj);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
};

// ==========================================================================
// NUEVO: Obtener lista de empresas activas por segmento
// ==========================================================================
router.get('/api/empresas', async (req, res) => {
    const { db_key } = req.query;
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        const [rows] = await pools[db_key].query(
            "SELECT ID_EMPRESA, NOMBRE FROM EMPRESAS WHERE ESTADO = 1 ORDER BY NOMBRE ASC"
        );
        res.json(rows);
    } catch (err) {
        console.error("Error en GET /api/empresas:", err);
        res.status(500).json({ error: "Error al consultar empresas." });
    }
});

// ==========================================================================
// NUEVO: Obtener lista de usuarios por empresa con paginación
// ==========================================================================
router.get('/api/usuarios', async (req, res) => {
    const { db_key, id_empresa, search, page = 1, limit = 10 } = req.query;
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    if (!id_empresa) {
        return res.status(400).json({ error: "ID de empresa es requerido." });
    }

    // Determinar BD de seguridad
    const dbSeguridad = db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10'
        ? 'db_10' : 'db_9';
    const poolSeg = pools[dbSeguridad];

    try {
        let baseQuery = "SELECT ID_USUARIO, NOMBRE_USUARIO, ESTADO FROM USUARIOS WHERE ID_EMPRESA = ? AND TIPO_USUARIO = 0";
        let countQuery = "SELECT COUNT(*) as total FROM USUARIOS WHERE ID_EMPRESA = ? AND TIPO_USUARIO = 0";
        const params = [id_empresa];
        const countParams = [id_empresa];

        if (search) {
            baseQuery += " AND NOMBRE_USUARIO LIKE ?";
            countQuery += " AND NOMBRE_USUARIO LIKE ?";
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        // Obtener total
        const [countResult] = await pools[db_key].query(countQuery, countParams);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        baseQuery += " ORDER BY NOMBRE_USUARIO ASC LIMIT ? OFFSET ?";
        params.push(parseInt(limit), offset);

        const [rows] = await pools[db_key].query(baseQuery, params);

        // Enriquecer con datos de seguridad si hay pool disponible
        if (poolSeg && rows.length > 0) {
            const nombres = rows.map(u => u.NOMBRE_USUARIO);
            const placeholders = nombres.map(() => '?').join(',');
            const [segRows] = await poolSeg.query(
                `SELECT U.USUARIO, U.ESTADO, U.CONECTADO, U.BLOQUEADO,
                        GROUP_CONCAT(DISTINCT P.NOMBRE ORDER BY P.NOMBRE SEPARATOR ', ') AS PERFILES
                 FROM SEG_USUARIO U
                 LEFT JOIN SEG_PERMISO_USUARIO PU ON U.SECUSUARIOID = PU.SECUSUARIOID AND PU.SECPERFILID_PERMISO IS NOT NULL
                 LEFT JOIN SEG_PERFIL P ON PU.SECPERFILID_PERMISO = P.SECPERFILID
                 WHERE U.USUARIO IN (${placeholders})
                 GROUP BY U.USUARIO, U.ESTADO, U.CONECTADO, U.BLOQUEADO`,
                nombres
            );
            const segMap = {};
            segRows.forEach(s => { segMap[s.USUARIO] = s; });

            console.log(`[/api/usuarios] DB=${db_key} segDB=${dbSeguridad} | Usuarios principales: ${nombres.length} | Encontrados en SEG_USUARIO: ${segRows.length}`);
            if (segRows.length === 0 && nombres.length > 0) {
                console.log('[/api/usuarios] Primeros 5 nombres buscados:', nombres.slice(0, 5));
            }

            // Helper: convierte BIT(1), boolean, Buffer, string a boolean
            const toBool = (val) => {
                if (val === null || val === undefined) return null;
                if (Buffer.isBuffer(val)) return val[0] === 1;
                return val === 1 || val === '1' || val === true;
            };

            rows.forEach(u => {
                const seg = segMap[u.NOMBRE_USUARIO];
                u.ESTADO_SEG = seg ? seg.ESTADO : null;
                u.CONECTADO  = seg ? toBool(seg.CONECTADO)  : null;
                u.BLOQUEADO  = seg ? toBool(seg.BLOQUEADO)  : null;
                u.PERFILES   = seg ? (seg.PERFILES || null) : null;
            });
        }

        res.json({
            usuarios: rows,
            page: parseInt(page),
            totalPages,
            total,
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Error en GET /api/usuarios:", err);
        res.status(500).json({ error: "Error al consultar usuarios." });
    }
});

// ==========================================================================
// NUEVO: Obtener lista de skills por empresa con paginación
// ==========================================================================
router.get('/api/skills/lista', async (req, res) => {
    const { db_key, id_empresa, search, page = 1, limit = 10 } = req.query;
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    if (!id_empresa) {
        return res.status(400).json({ error: "ID de empresa es requerido." });
    }

    try {
        let query = "SELECT ID_SKILL, NOMBRE_SKILL FROM SKILLS WHERE ID_EMPRESA = ? AND ESTADO = 1 AND ELIMINADO = 0";
        let countQuery = "SELECT COUNT(*) as total FROM SKILLS WHERE ID_EMPRESA = ? AND ESTADO = 1 AND ELIMINADO = 0";
        const params = [id_empresa];
        const countParams = [id_empresa];

        if (search) {
            query += " AND NOMBRE_SKILL LIKE ?";
            countQuery += " AND NOMBRE_SKILL LIKE ?";
            params.push(`%${search}%`);
            countParams.push(`%${search}%`);
        }

        // Obtener total
        const [countResult] = await pools[db_key].query(countQuery, countParams);
        const total = countResult[0].total;
        const totalPages = Math.ceil(total / limit);
        const offset = (page - 1) * limit;

        query += " ORDER BY NOMBRE_SKILL ASC LIMIT ? OFFSET ?";
        params.push(parseInt(limit), offset);

        const [rows] = await pools[db_key].query(query, params);
        
        res.json({
            skills: rows,
            page: parseInt(page),
            totalPages,
            total,
            limit: parseInt(limit)
        });
    } catch (err) {
        console.error("Error en GET /api/skills/lista:", err);
        res.status(500).json({ error: "Error al consultar lista de skills." });
    }
});

// ==========================================================================
// 1. Obtener skills y sus horarios (MODIFICADO)
// ==========================================================================
router.get('/api/skills', async (req, res) => {
    const { db_key, id_empresa, ids_skill, ids_usuario, estado, eliminado } = req.query;
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        // Si hay ids_usuario, buscar skills de múltiples usuarios
        if (ids_usuario) {
            const usuarioIds = ids_usuario.split(',').map(id => parseInt(id));
            const placeholders = usuarioIds.map(() => '?').join(',');
            
            // Construir condiciones dinámicas para ESTADO y ELIMINADO
            let estadoCondicion = ' AND S.ESTADO = 1';
            let eliminadoCondicion = ' AND S.ELIMINADO = 0';
            if (estado !== undefined && estado !== '') {
                estadoCondicion = ` AND S.ESTADO = ${parseInt(estado)}`;
            }
            if (eliminado !== undefined && eliminado !== '') {
                eliminadoCondicion = ` AND S.ELIMINADO = ${parseInt(eliminado)}`;
            }

            const query = `
                SELECT DISTINCT
                    S.ID_SKILL, S.NOMBRE_SKILL, E.NOMBRE AS NOMBRE_EMPRESA,
                    S.MENSAJE, H.ID_HORARIO_SKILL, H.DESDE, H.HASTA, H.DIAS,
                    H.CREADO_POR, H.CREADO_EL, H.MODIFICADO_POR, H.MODIFICADO_EL 
                FROM PERMISOS_USUARIOS_SKILLS PUS
                INNER JOIN SKILLS S ON PUS.ID_SKILL = S.ID_SKILL
                INNER JOIN EMPRESAS E ON S.ID_EMPRESA = E.ID_EMPRESA
                LEFT JOIN HORARIO_SKILL H ON S.ID_SKILL = H.ID_SKILL 
                WHERE PUS.ID_USUARIO IN (${placeholders}) 
                  AND S.ID_EMPRESA = ? 
                  ${estadoCondicion}
                  ${eliminadoCondicion}
            `;
            const params = [...usuarioIds, id_empresa];

            const [rows] = await pools[db_key].query(query, params);

            const data = rows.map(skill => ({
                ...skill,
                DESDE_GUATE: skill.DESDE ? restar6Horas(skill.DESDE) : null,
                HASTA_GUATE: skill.HASTA ? restar6Horas(skill.HASTA) : null,
                DESDE: skill.DESDE,
                HASTA: skill.HASTA,
                DB_VISUAL: mapDBName(db_key)
            }));

            return res.json(data);
        }

        // Si hay ids_skill, buscar skills específicos
        if (ids_skill) {
            const skillIds = ids_skill.split(',').map(id => parseInt(id));
            const placeholders = skillIds.map(() => '?').join(',');
            
            // Construir condiciones dinámicas para ESTADO y ELIMINADO
            let estadoCondicion2 = ' AND S.ESTADO = 1';
            let eliminadoCondicion2 = ' AND S.ELIMINADO = 0';
            if (estado !== undefined && estado !== '') {
                estadoCondicion2 = ` AND S.ESTADO = ${parseInt(estado)}`;
            }
            if (eliminado !== undefined && eliminado !== '') {
                eliminadoCondicion2 = ` AND S.ELIMINADO = ${parseInt(eliminado)}`;
            }

            let query = `
                SELECT 
                    S.ID_SKILL, S.NOMBRE_SKILL, E.NOMBRE AS NOMBRE_EMPRESA,
                    S.MENSAJE, H.ID_HORARIO_SKILL, H.DESDE, H.HASTA, H.DIAS,
                    H.CREADO_POR, H.CREADO_EL, H.MODIFICADO_POR, H.MODIFICADO_EL
                FROM SKILLS S 
                INNER JOIN EMPRESAS E ON S.ID_EMPRESA = E.ID_EMPRESA
                LEFT JOIN HORARIO_SKILL H ON S.ID_SKILL = H.ID_SKILL 
                WHERE S.ID_SKILL IN (${placeholders}) 
                  AND S.ID_EMPRESA = ? 
                  ${estadoCondicion2}
                  ${eliminadoCondicion2}
            `;
            const params = [...skillIds, id_empresa];

            const [rows] = await pools[db_key].query(query, params);

            const data = rows.map(skill => ({
                ...skill,
                DESDE_GUATE: skill.DESDE ? restar6Horas(skill.DESDE) : null,
                HASTA_GUATE: skill.HASTA ? restar6Horas(skill.HASTA) : null,
                DESDE: skill.DESDE,
                HASTA: skill.HASTA,
                DB_VISUAL: mapDBName(db_key)
            }));

            return res.json(data);
        }

        // Búsqueda normal por empresa
        // Construir condiciones dinámicas para ESTADO y ELIMINADO
        let estadoCondicion3 = ' AND S.ESTADO = 1';
        let eliminadoCondicion3 = ' AND S.ELIMINADO = 0';
        if (estado !== undefined && estado !== '') {
            estadoCondicion3 = ` AND S.ESTADO = ${parseInt(estado)}`;
        }
        if (eliminado !== undefined && eliminado !== '') {
            eliminadoCondicion3 = ` AND S.ELIMINADO = ${parseInt(eliminado)}`;
        }

        let query = `
            SELECT 
                S.ID_SKILL, S.NOMBRE_SKILL, E.NOMBRE AS NOMBRE_EMPRESA,
                S.MENSAJE, H.ID_HORARIO_SKILL, H.DESDE, H.HASTA, H.DIAS,
                H.CREADO_POR, H.CREADO_EL, H.MODIFICADO_POR, H.MODIFICADO_EL
            FROM SKILLS S 
            INNER JOIN EMPRESAS E ON S.ID_EMPRESA = E.ID_EMPRESA
            LEFT JOIN HORARIO_SKILL H ON S.ID_SKILL = H.ID_SKILL 
            WHERE S.ID_EMPRESA = ? ${estadoCondicion3} ${eliminadoCondicion3}
        `;
        const params = [id_empresa];

        const [rows] = await pools[db_key].query(query, params);

        const data = rows.map(skill => ({
            ...skill,
            DESDE_GUATE: skill.DESDE ? restar6Horas(skill.DESDE) : null,
            HASTA_GUATE: skill.HASTA ? restar6Horas(skill.HASTA) : null,
            DESDE: skill.DESDE,
            HASTA: skill.HASTA,
            DB_VISUAL: mapDBName(db_key)
        }));

        res.json(data);
    } catch (err) {
        console.error("Error en GET /api/skills:", err);
        res.status(500).json({ error: "Error interno al consultar skills." });
    }
});

// ==========================================================================
// 1.5 Obtener skills de un usuario específico
// ==========================================================================
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

// ==========================================================================
// 1.6 Agregar permiso de skill a usuario
// ==========================================================================
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

        // Obtener información del usuario y skill para auditoría
        const [userInfo] = await pools[db_key].query(
            "SELECT ID_EMPRESA, NOMBRE_USUARIO FROM USUARIOS WHERE ID_USUARIO = ?",
            [id_usuario]
        );
        
        const [skillInfo] = await pools[db_key].query(
            "SELECT NOMBRE_SKILL, ID_EMPRESA FROM SKILLS WHERE ID_SKILL = ?",
            [id_skill]
        );

        const [empresaInfo] = await pools[db_key].query(
            "SELECT NOMBRE FROM EMPRESAS WHERE ID_EMPRESA = ?",
            [userInfo[0]?.ID_EMPRESA || skillInfo[0]?.ID_EMPRESA]
        );

        await pools[db_key].query(
            "INSERT INTO PERMISOS_USUARIOS_SKILLS (ID_USUARIO, ID_SKILL, CREADO_EL, CREADO_POR) VALUES (?, ?, NOW(), ?)",
            [id_usuario, id_skill, creado_por]
        );

        // Registrar auditoría
        await registrarAuditoria({
            tipo_accion: 'PERMISO_AGREGAR',
            entidad: 'PERMISOS',
            id_entidad: `${id_usuario}-${id_skill}`,
            id_usuario_sistema: null, // Se puede obtener de auth si está disponible
            nombre_usuario: creado_por,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            db_key: db_key,
            db_nombre: mapDBName(db_key),
            id_empresa: userInfo[0]?.ID_EMPRESA || skillInfo[0]?.ID_EMPRESA,
            nombre_empresa: empresaInfo[0]?.NOMBRE,
            id_usuario_afectado: id_usuario,
            nombre_usuario_afec: userInfo[0]?.NOMBRE_USUARIO,
            id_skill: id_skill,
            nombre_skill: skillInfo[0]?.NOMBRE_SKILL,
            descripcion: `Se agregó permiso del skill "${skillInfo[0]?.NOMBRE_SKILL}" al usuario "${userInfo[0]?.NOMBRE_USUARIO}"`,
            exito: true
        });

        res.json({ success: true, message: "Permiso agregado correctamente." });
    } catch (err) {
        console.error("Error en POST /api/skills/usuario/permiso:", err);
        
        // Registrar auditoría del error
        await registrarAuditoria({
            tipo_accion: 'PERMISO_AGREGAR',
            entidad: 'PERMISOS',
            id_entidad: `${id_usuario}-${id_skill}`,
            nombre_usuario: creado_por,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            db_key: db_key,
            descripcion: `Error al agregar permiso del skill ${id_skill} al usuario ${id_usuario}: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        
        res.status(500).json({ error: "No se pudo agregar el permiso." });
    }
});

// ==========================================================================
// 1.7 Eliminar permiso de skill a usuario
// ==========================================================================
router.delete('/api/skills/usuario/permiso/:idUsuario/:idSkill', authMiddleware, async (req, res) => {
    const creado_por = req.user?.usuario || 'sistema';
    const { idUsuario, idSkill } = req.params;
    const { db_key } = req.query;

    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        // Obtener información del permiso antes de eliminar para auditoría
        const [permisoInfo] = await pools[db_key].query(`
            SELECT u.ID_EMPRESA, u.NOMBRE_USUARIO, s.NOMBRE_SKILL, s.ID_EMPRESA AS SKILL_EMPRESA
            FROM PERMISOS_USUARIOS_SKILLS p
            JOIN USUARIOS u ON p.ID_USUARIO = u.ID_USUARIO
            JOIN SKILLS s ON p.ID_SKILL = s.ID_SKILL
            WHERE p.ID_USUARIO = ? AND p.ID_SKILL = ?
        `, [idUsuario, idSkill]);

        if (permisoInfo.length === 0) {
            return res.status(404).json({ error: "No se encontró el permiso para eliminar." });
        }

        const [empresaInfo] = await pools[db_key].query(
            "SELECT NOMBRE FROM EMPRESAS WHERE ID_EMPRESA = ?",
            [permisoInfo[0].ID_EMPRESA || permisoInfo[0].SKILL_EMPRESA]
        );

        const [result] = await pools[db_key].query(
            "DELETE FROM PERMISOS_USUARIOS_SKILLS WHERE ID_USUARIO = ? AND ID_SKILL = ?",
            [idUsuario, idSkill]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "No se encontró el permiso para eliminar." });
        }

        // Registrar auditoría
        await registrarAuditoria({
            tipo_accion: 'PERMISO_ELIMINAR',
            entidad: 'PERMISOS',
            id_entidad: `${idUsuario}-${idSkill}`,
            id_usuario_sistema: null, // Se puede obtener de auth si está disponible
            nombre_usuario: creado_por,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            db_key: db_key,
            db_nombre: mapDBName(db_key),
            id_empresa: permisoInfo[0].ID_EMPRESA || permisoInfo[0].SKILL_EMPRESA,
            nombre_empresa: empresaInfo[0]?.NOMBRE,
            id_usuario_afectado: idUsuario,
            nombre_usuario_afec: permisoInfo[0].NOMBRE_USUARIO,
            id_skill: idSkill,
            nombre_skill: permisoInfo[0].NOMBRE_SKILL,
            descripcion: `Se eliminó permiso del skill "${permisoInfo[0].NOMBRE_SKILL}" al usuario "${permisoInfo[0].NOMBRE_USUARIO}"`,
            exito: true
        });

        res.json({ success: true, message: "Permiso eliminado correctamente." });
    } catch (err) {
        console.error("Error en DELETE /api/skills/usuario/permiso:", err);
        
        // Registrar auditoría del error
        await registrarAuditoria({
            tipo_accion: 'PERMISO_ELIMINAR',
            entidad: 'PERMISOS',
            id_entidad: `${idUsuario}-${idSkill}`,
            nombre_usuario: creado_por,
            ip_address: req.ip,
            user_agent: req.headers['user-agent'],
            db_key: db_key,
            descripcion: `Error al eliminar permiso del skill ${idSkill} al usuario ${idUsuario}: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        
        res.status(500).json({ error: "No se pudo eliminar el permiso." });
    }
});

// ==========================================================================
// 2. Crear nuevo horario
// ==========================================================================
router.post('/api/skills/horario', authMiddleware, async (req, res) => {
    const { db_key, id_skill, desde, hasta, dias } = req.body;
    const creado_por = req.user?.usuario || 'sistema';
    if (!pools[db_key]) return res.status(400).json({ error: "Base de datos invalida." });

    try {
        const [result] = await pools[db_key].query(
            "INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_POR) VALUES (?, ?, ?, ?, ?)",
            [id_skill, sumar6Horas(desde), sumar6Horas(hasta), dias, creado_por]
        );
        
        // Auditoría
        await registrarAuditoria({
            tipo_accion: 'INSERT',
            entidad: 'HORARIO_SKILL',
            id_entidad: result.insertId,
            db_key: db_key,
            metadata: { id_skill, desde, hasta, dias: formatearDias(dias) },
            descripcion: `Creado horario ${desde}-${hasta} (${formatearDias(dias)}) para skill ${id_skill}`,
            exito: true
        });
        
        res.json({ success: true, id_horario: result.insertId });
    } catch (err) {
        console.error("Error en POST /api/skills/horario:", err);
        
        // Auditoría del error
        await registrarAuditoria({
            tipo_accion: 'INSERT',
            entidad: 'HORARIO_SKILL',
            db_key: db_key,
            metadata: { id_skill, desde, hasta, dias },
            descripcion: `Error al crear horario para skill ${id_skill}: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        
        res.status(500).json({ error: "No se pudo agregar el horario." });
    }
});

// ==========================================================================
// 3. Editar horario existente
// ==========================================================================
router.put('/api/skills/horario/:db_key/:id_horario', authMiddleware, async (req, res) => {
    const { db_key, id_horario } = req.params;
    const { desde, hasta, dias } = req.body;
    const modificado_por = req.user?.usuario || 'sistema';
    if (!pools[db_key]) return res.status(400).json({ error: "Base de datos invalida." });

    try {
        await pools[db_key].query(
            "UPDATE HORARIO_SKILL SET DESDE = ?, HASTA = ?, DIAS = ?, MODIFICADO_POR = ? WHERE ID_HORARIO_SKILL = ?",
            [sumar6Horas(desde), sumar6Horas(hasta), dias, modificado_por, id_horario]
        );
        
        // Auditoría
        await registrarAuditoria({
            tipo_accion: 'UPDATE',
            entidad: 'HORARIO_SKILL',
            id_entidad: parseInt(id_horario),
            db_key: db_key,
            metadata: { desde, hasta, dias: formatearDias(dias) },
            descripcion: `Actualizado horario ${id_horario}: ${desde}-${hasta} (${formatearDias(dias)})`,
            exito: true
        });
        
        res.json({ success: true });
    } catch (err) {
        console.error("Error en PUT /api/skills/horario:", err);
        
        // Auditoría del error
        await registrarAuditoria({
            tipo_accion: 'UPDATE',
            entidad: 'HORARIO_SKILL',
            id_entidad: parseInt(id_horario),
            db_key: db_key,
            metadata: { desde, hasta, dias },
            descripcion: `Error al actualizar horario ${id_horario}: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        
        res.status(500).json({ error: "No se pudo actualizar el horario." });
    }
});

// ==========================================================================
// 4. Eliminar horario
// ==========================================================================
router.delete('/api/skills/horario/:db_key/:id_horario', authMiddleware, async (req, res) => {
    const { db_key, id_horario } = req.params;
    if (!pools[db_key]) return res.status(400).json({ error: "Base de datos invalida." });

    try {
        await pools[db_key].query("DELETE FROM HORARIO_SKILL WHERE ID_HORARIO_SKILL = ?", [id_horario]);
        
        // Auditoría
        await registrarAuditoria({
            tipo_accion: 'DELETE',
            entidad: 'HORARIO_SKILL',
            id_entidad: parseInt(id_horario),
            db_key: db_key,
            descripcion: `Eliminado horario ${id_horario}`,
            exito: true
        });
        
        res.json({ success: true });
    } catch (err) {
        console.error("Error eliminando horario:", err);
        
        // Auditoría del error
        await registrarAuditoria({
            tipo_accion: 'DELETE',
            entidad: 'HORARIO_SKILL',
            id_entidad: parseInt(id_horario),
            db_key: db_key,
            descripcion: `Error al eliminar horario ${id_horario}: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        res.status(500).json({ error: "No se pudo eliminar el horario." });
    }
});

// ==========================================================================
// 4.5. Actualizar horarios masivamente (sin fechas de aplicación/reversión)
// ==========================================================================
router.put('/api/horarios/masivo', authMiddleware, async (req, res) => {
    const { updates } = req.body;
    const modificado_por = req.user?.usuario || 'sistema';
    
    if (!updates || !Array.isArray(updates) || updates.length === 0) {
        return res.status(400).json({ error: "Se requiere array de updates" });
    }
    
    let actualizados = 0;
    let errores = [];
    
    try {
        for (const update of updates) {
            const { db_key, id_horario_skill, desde, hasta, dias } = update;
            
            if (!pools[db_key]) {
                errores.push(`DB invalida para horario ${id_horario_skill}`);
                continue;
            }
            
            if (!id_horario_skill || !desde || !hasta || !dias) {
                errores.push(`Datos incompletos para horario ${id_horario_skill}`);
                continue;
            }
            
            try {
                await pools[db_key].query(
                    "UPDATE HORARIO_SKILL SET DESDE = ?, HASTA = ?, DIAS = ?, MODIFICADO_POR = ? WHERE ID_HORARIO_SKILL = ?",
                    [sumar6Horas(desde), sumar6Horas(hasta), dias, modificado_por, id_horario_skill]
                );
                actualizados++;
            } catch (err) {
                console.error(`Error actualizando horario ${id_horario_skill}:`, err);
                errores.push(`Error en horario ${id_horario_skill}: ${err.message}`);
            }
        }
        
        res.json({ 
            success: true, 
            actualizados, 
            total: updates.length,
            errores: errores.length > 0 ? errores : undefined
        });
    } catch (err) {
        console.error("Error en actualización masiva:", err);
        res.status(500).json({ error: "Error procesando actualización masiva", detalle: err.message });
    }
});

// ==========================================================================
// 5. Programacion masiva automatizada
// ==========================================================================
router.post('/api/programar', authMiddleware, async (req, res) => {
    const { items } = req.body;
    const creado_por = req.user?.usuario || 'sistema';
    
    // Validaciones de entrada
    if (!items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de items para programar." });
    }
    
    // Limitar cantidad de items para evitar sobrecarga
    if (items.length > 500) {
        return res.status(400).json({ error: "Maximo 500 items permitidos por solicitud." });
    }
    
    try {
        // Validar cada item antes de procesar
        const valoresValidados = [];
        for (const item of items) {
            // Validar campos requeridos
            if (!item.db_key || !item.id_skill || !item.fecha_aplicacion || !item.fecha_reversion) {
                return res.status(400).json({ error: "Faltan campos requeridos en uno o mas items." });
            }
            
            // Validar que db_key sea uno permitido
            const dbKeysPermitidos = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5', 'db_6', 'db_7', 'db_8'];
            if (!dbKeysPermitidos.includes(item.db_key)) {
                return res.status(400).json({ error: `db_key invalido: ${item.db_key}` });
            }
            
            // Validar que id_skill sea numero
            if (isNaN(parseInt(item.id_skill))) {
                return res.status(400).json({ error: "id_skill debe ser un numero valido." });
            }
            
            // Sanitizar strings
            const nombreSkill = String(item.nombre_skill || '').substring(0, 100);
            const nombreEmpresa = String(item.nombre_empresa || '').substring(0, 100);
            const dbKey = String(item.db_key).substring(0, 50);
            
            valoresValidados.push([
                dbKey,
                parseInt(item.id_skill),
                item.id_horario_skill ? parseInt(item.id_horario_skill) : null,
                nombreSkill,
                nombreEmpresa,
                item.original_desde || null,
                item.original_hasta || null,
                item.original_dias || null,
                sumar6Horas(item.nuevo_desde),
                sumar6Horas(item.nuevo_hasta),
                item.nuevos_dias || null,
                item.fecha_aplicacion,
                item.fecha_reversion,
                'PENDIENTE',
                creado_por
            ]);
        }

        const query = `
            INSERT INTO PROGRAMACION_HORARIOS 
            (db_key, id_skill, id_original_horario, nombre_skill, nombre_empresa, original_desde, original_hasta, original_dias, 
             nuevo_desde, nuevo_hasta, nuevos_dias, fecha_aplicacion, fecha_reversion, estado, creado_por) 
            VALUES ?
        `;

        await pools['control'].query(query, [valoresValidados]);
        res.json({ success: true, count: valoresValidados.length });
    } catch (err) {
        console.error("Error en POST /api/programar:", err);
        res.status(500).json({ error: "Error al guardar programacion masiva." });
    }
});

// ==========================================================================
// 6. Obtener cola activa (con paginación)
// ==========================================================================
router.get('/api/programados', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;
        
        // Obtener total para paginación
        const [countRows] = await pools['control'].query(
            "SELECT COUNT(*) as total FROM PROGRAMACION_HORARIOS WHERE estado IN ('PENDIENTE', 'APLICADO')"
        );
        const total = countRows[0].total;
        
        // Obtener datos paginados
        const [rows] = await pools['control'].query(
            "SELECT * FROM PROGRAMACION_HORARIOS WHERE estado IN ('PENDIENTE', 'APLICADO') ORDER BY fecha_aplicacion DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );
        const data = rows.map(r => ({
            ...r,
            nuevo_desde_guate: restar6Horas(r.nuevo_desde),
            nuevo_hasta_guate: restar6Horas(r.nuevo_hasta),
            original_desde_guate: r.original_desde ? restar6Horas(r.original_desde) : null,
            original_hasta_guate: r.original_hasta ? restar6Horas(r.original_hasta) : null,
            nuevos_dias_str: formatearDias(r.nuevos_dias),
            original_dias_str: formatearDias(r.original_dias),
            fecha_aplicacion_str: formatearFecha(r.fecha_aplicacion),
            fecha_reversion_str: formatearFecha(r.fecha_reversion),
            DB_VISUAL: mapDBName(r.db_key)
        }));
        res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error("Error al consultar la cola activa:", err);
        res.status(500).json({ error: "Error al consultar la cola activa." });
    }
});

// ==========================================================================
// 7. Obtener historial completo de auditoria (con paginación)
// ==========================================================================
router.get('/api/historial', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const offset = (page - 1) * limit;
        
        // Obtener total para paginación
        const [countRows] = await pools['control'].query(
            "SELECT COUNT(*) as total FROM PROGRAMACION_HORARIOS WHERE estado = 'REVERTIDO'"
        );
        const total = countRows[0].total;
        
        // Obtener datos paginados
        const [rows] = await pools['control'].query(
            "SELECT * FROM PROGRAMACION_HORARIOS WHERE estado = 'REVERTIDO' ORDER BY fecha_reversion DESC LIMIT ? OFFSET ?",
            [limit, offset]
        );
        const data = rows.map(r => ({
            ...r,
            nuevo_desde_guate: restar6Horas(r.nuevo_desde),
            nuevo_hasta_guate: restar6Horas(r.nuevo_hasta),
            original_desde_guate: r.original_desde ? restar6Horas(r.original_desde) : null,
            original_hasta_guate: r.original_hasta ? restar6Horas(r.original_hasta) : null,
            nuevos_dias_str: formatearDias(r.nuevos_dias),
            original_dias_str: formatearDias(r.original_dias),
            fecha_aplicacion_str: formatearFecha(r.fecha_aplicacion),
            fecha_reversion_str: formatearFecha(r.fecha_reversion),
            DB_VISUAL: mapDBName(r.db_key)
        }));
        res.json({ data, total, page, totalPages: Math.ceil(total / limit) });
    } catch (err) {
        console.error("Error al consultar el historial:", err);
        res.status(500).json({ error: "Error al consultar el historial." });
    }
});

// ==========================================================================
// 8. Eliminar/Anular programacion de la cola
// ==========================================================================
router.delete('/api/programados/:id', async (req, res) => {
    try {
        await pools['control'].query("DELETE FROM PROGRAMACION_HORARIOS WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "No se pudo anular la programacion." });
    }
});

// ==========================================================================
// ENDPOINTS PARA PROGRAMACIÓN DE MENSAJES DE FUERA DE HORARIO
// ==========================================================================

// 1. Actualizar mensaje de skill directamente
router.put('/api/skills/mensaje', async (req, res) => {
    const { db_key, id_skill, mensaje } = req.body;
    
    if (!db_key || !id_skill) {
        return res.status(400).json({ error: "db_key e id_skill son requeridos." });
    }
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }
    
    try {
        await pools[db_key].query(
            "UPDATE SKILLS SET MENSAJE = ? WHERE ID_SKILL = ?",
            [mensaje || null, id_skill]
        );
        res.json({ success: true, message: "Mensaje actualizado correctamente." });
    } catch (err) {
        console.error("Error en PUT /api/skills/mensaje:", err);
        res.status(500).json({ error: "Error al actualizar el mensaje." });
    }
});

// 2. Programar cambio de mensaje
router.post('/api/programar-mensajes', async (req, res) => {
    const { items } = req.body;
    
    if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: "Se requiere un array de items." });
    }
    
    try {
        const valoresValidados = [];
        for (const item of items) {
            if (!item.db_key || !item.id_skill || !item.fecha_aplicacion) {
                return res.status(400).json({ error: "Faltan campos requeridos en uno o mas items." });
            }
            
            const dbKeysPermitidos = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5', 'db_6', 'db_7', 'db_8'];
            if (!dbKeysPermitidos.includes(item.db_key)) {
                return res.status(400).json({ error: `db_key invalido: ${item.db_key}` });
            }
            
            valoresValidados.push([
                item.db_key,
                parseInt(item.id_skill),
                String(item.nombre_skill || '').substring(0, 255),
                String(item.nombre_empresa || '').substring(0, 255),
                item.original_mensaje || null,
                item.nuevo_mensaje || '',
                item.fecha_aplicacion,
                item.fecha_reversion || null,
                'PENDIENTE'
            ]);
        }
        
        const query = `
            INSERT INTO PROGRAMACION_MENSAJES 
            (db_key, id_skill, nombre_skill, nombre_empresa, original_mensaje, 
             nuevo_mensaje, fecha_aplicacion, fecha_reversion, estado) 
            VALUES ?
        `;
        
        await pools['control'].query(query, [valoresValidados]);
        res.json({ success: true, count: valoresValidados.length });
    } catch (err) {
        console.error("Error en POST /api/programar-mensajes:", err);
        res.status(500).json({ error: "Error al guardar programacion de mensajes." });
    }
});

// 3. Obtener cola activa de mensajes programados
router.get('/api/programados-mensajes', async (req, res) => {
    try {
        const [rows] = await pools['control'].query(
            "SELECT * FROM PROGRAMACION_MENSAJES WHERE estado IN ('PENDIENTE', 'APLICADO') ORDER BY fecha_aplicacion DESC"
        );
        const data = rows.map(r => ({
            ...r,
            fecha_aplicacion_str: formatearFecha(r.fecha_aplicacion),
            fecha_reversion_str: formatearFecha(r.fecha_reversion),
            DB_VISUAL: mapDBName(r.db_key)
        }));
        res.json(data);
    } catch (err) {
        console.error("Error al consultar cola de mensajes:", err);
        res.status(500).json({ error: "Error al consultar la cola de mensajes." });
    }
});

// 4. Obtener historial de mensajes programados
router.get('/api/historial-mensajes', async (req, res) => {
    try {
        const [rows] = await pools['control'].query(
            "SELECT * FROM PROGRAMACION_MENSAJES WHERE estado = 'REVERTIDO' ORDER BY fecha_reversion DESC LIMIT 200"
        );
        const data = rows.map(r => ({
            ...r,
            fecha_aplicacion_str: formatearFecha(r.fecha_aplicacion),
            fecha_reversion_str: formatearFecha(r.fecha_reversion),
            DB_VISUAL: mapDBName(r.db_key)
        }));
        res.json(data);
    } catch (err) {
        console.error("Error al consultar historial de mensajes:", err);
        res.status(500).json({ error: "Error al consultar el historial de mensajes." });
    }
});

// 5. Eliminar/Anular programacion de mensaje
router.delete('/api/programados-mensajes/:id', async (req, res) => {
    try {
        await pools['control'].query("DELETE FROM PROGRAMACION_MENSAJES WHERE id = ?", [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: "No se pudo anular la programacion del mensaje." });
    }
});

// ==========================================================================
// 12. GESTIÓN MASIVA DE PERMISOS - Agregar permisos a múltiples usuarios
// [MOVIDO a aAsignacionMasiva.js]
// ==========================================================================
router.post('/api/permisos/masivo/agregar', async (req, res) => {
    const { db_key, usuarios, permisos, creado_por = 'alex.carrrera' } = req.body;

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

        // Auditoría
        const skillsNombres = permisos.skills?.length > 0 
            ? permisos.skills.slice(0, 5).join(', ') + (permisos.skills.length > 5 ? ` y ${permisos.skills.length - 5} más` : '')
            : '';
        const tiposNombres = permisos.tipos_cliente?.length > 0
            ? permisos.tipos_cliente.slice(0, 5).join(', ') + (permisos.tipos_cliente.length > 5 ? ` y ${permisos.tipos_cliente.length - 5} más` : '')
            : '';
        const botRedesNombres = permisos.bot_redes?.length > 0
            ? permisos.bot_redes.slice(0, 5).join(', ') + (permisos.bot_redes.length > 5 ? ` y ${permisos.bot_redes.length - 5} más` : '')
            : '';
        
        const tiposPermisos = [];
        if (skillsNombres) tiposPermisos.push(`Skills: [${skillsNombres}]`);
        if (tiposNombres) tiposPermisos.push(`Tipos: [${tiposNombres}]`);
        if (botRedesNombres) tiposPermisos.push(`Bot Redes: [${botRedesNombres}]`);
        
        // Obtener lista de usuarios afectados con sus permisos específicos
        const usuariosAfectados = {};
        resultados.exitosos.forEach(r => {
            if (!usuariosAfectados[r.id_usuario]) {
                usuariosAfectados[r.id_usuario] = { skills: [], tipos: [], bot_redes: [] };
            }
            if (r.tipo === 'SKILL') usuariosAfectados[r.id_usuario].skills.push(r.id_skill);
            if (r.tipo === 'TIPO_CLIENTE') usuariosAfectados[r.id_usuario].tipos.push(r.id_tipo);
            if (r.tipo === 'BOT_RED') usuariosAfectados[r.id_usuario].bot_redes.push(r.id_bot_red);
        });
        
        // Formatear descripción de usuarios afectados
        const usuariosDesc = Object.entries(usuariosAfectados).slice(0, 5).map(([id, perms]) => {
            const permisosUsuario = [];
            if (perms.skills.length) permisosUsuario.push(`S:${perms.skills.join(',')}`);
            if (perms.tipos.length) permisosUsuario.push(`T:${perms.tipos.join(',')}`);
            if (perms.bot_redes.length) permisosUsuario.push(`B:${perms.bot_redes.join(',')}`);
            return `Usr${id}=[${permisosUsuario.join('|')}]`;
        }).join('; ');
        
        const masUsuarios = Object.keys(usuariosAfectados).length > 5 
            ? ` y ${Object.keys(usuariosAfectados).length - 5} usuarios más` 
            : '';
        
        await registrarAuditoria({
            tipo_accion: 'PERMISO_MASIVO',
            entidad: 'PERMISOS',
            db_key: db_key,
            db_nombre: mapDBName(db_key),
            metadata: { 
                accion: 'AGREGAR',
                usuarios_ids: usuarios.slice(0, 20),
                cantidad_usuarios: usuarios.length,
                cantidad_exitosos: resultados.exitosos.length,
                cantidad_duplicados: resultados.duplicados.length,
                cantidad_errores: resultados.errores.length,
                permisos: {
                    skills: permisos.skills || [],
                    tipos_cliente: permisos.tipos_cliente || [],
                    bot_redes: permisos.bot_redes || []
                },
                usuarios_afectados: usuariosAfectados,
                exitosos_detalle: resultados.exitosos,
                duplicados_detalle: resultados.duplicados.slice(0, 10),
                errores_detalle: resultados.errores.slice(0, 5)
            },
            descripcion: `PERMISO_MASIVO AGREGAR: ${resultados.exitosos.length} exitosos a ${usuarios.length} usuarios (${mapDBName(db_key)}). ${tiposPermisos.join(', ')}. Detalle: ${usuariosDesc}${masUsuarios}`,
            exito: resultados.errores.length === 0
        });

        res.json({
            success: true,
            mensaje: `Proceso completado: ${resultados.exitosos.length} exitosos, ${resultados.duplicados.length} duplicados, ${resultados.errores.length} errores`,
            resultados
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error en permisos masivos:", err);
        
        // Auditoría del error
        await registrarAuditoria({
            tipo_accion: 'PERMISO_MASIVO',
            entidad: 'PERMISOS',
            db_key: db_key,
            descripcion: `Error en permisos masivos agregar: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        
        res.status(500).json({ error: "Error al procesar permisos masivos", detalle: err.message });
    } finally {
        conn.release();
    }
});

// ==========================================================================
// 13. GESTIÓN MASIVA DE PERMISOS - Eliminar permisos a múltiples usuarios
// ==========================================================================
router.post('/api/permisos/masivo/eliminar', async (req, res) => {
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

        // Auditoría
        const skillsNombresDel = permisos.skills?.length > 0 
            ? permisos.skills.slice(0, 5).join(', ') + (permisos.skills.length > 5 ? ` y ${permisos.skills.length - 5} más` : '')
            : '';
        const tiposNombresDel = permisos.tipos_cliente?.length > 0
            ? permisos.tipos_cliente.slice(0, 5).join(', ') + (permisos.tipos_cliente.length > 5 ? ` y ${permisos.tipos_cliente.length - 5} más` : '')
            : '';
        const botRedesNombresDel = permisos.bot_redes?.length > 0
            ? permisos.bot_redes.slice(0, 5).join(', ') + (permisos.bot_redes.length > 5 ? ` y ${permisos.bot_redes.length - 5} más` : '')
            : '';
        
        const tiposPermisosDel = [];
        if (skillsNombresDel) tiposPermisosDel.push(`Skills: [${skillsNombresDel}]`);
        if (tiposNombresDel) tiposPermisosDel.push(`Tipos: [${tiposNombresDel}]`);
        if (botRedesNombresDel) tiposPermisosDel.push(`Bot Redes: [${botRedesNombresDel}]`);
        
        // Obtener lista de usuarios afectados con sus permisos específicos
        const usuariosAfectadosDel = {};
        resultados.exitosos.forEach(r => {
            if (!usuariosAfectadosDel[r.id_usuario]) {
                usuariosAfectadosDel[r.id_usuario] = { skills: [], tipos: [], bot_redes: [] };
            }
            if (r.tipo === 'SKILL') usuariosAfectadosDel[r.id_usuario].skills.push(r.id_skill);
            if (r.tipo === 'TIPO_CLIENTE') usuariosAfectadosDel[r.id_usuario].tipos.push(r.id_tipo);
            if (r.tipo === 'BOT_RED') usuariosAfectadosDel[r.id_usuario].bot_redes.push(r.id_bot_red);
        });
        
        // Formatear descripción de usuarios afectados
        const usuariosDescDel = Object.entries(usuariosAfectadosDel).slice(0, 5).map(([id, perms]) => {
            const permisosUsuario = [];
            if (perms.skills.length) permisosUsuario.push(`S:${perms.skills.join(',')}`);
            if (perms.tipos.length) permisosUsuario.push(`T:${perms.tipos.join(',')}`);
            if (perms.bot_redes.length) permisosUsuario.push(`B:${perms.bot_redes.join(',')}`);
            return `Usr${id}=[${permisosUsuario.join('|')}]`;
        }).join('; ');
        
        const masUsuariosDel = Object.keys(usuariosAfectadosDel).length > 5 
            ? ` y ${Object.keys(usuariosAfectadosDel).length - 5} usuarios más` 
            : '';
        
        await registrarAuditoria({
            tipo_accion: 'PERMISO_MASIVO',
            entidad: 'PERMISOS',
            db_key: db_key,
            db_nombre: mapDBName(db_key),
            metadata: { 
                accion: 'ELIMINAR',
                usuarios_ids: usuarios.slice(0, 20),
                cantidad_usuarios: usuarios.length,
                cantidad_exitosos: resultados.exitosos.length,
                cantidad_no_encontrados: resultados.no_encontrados.length,
                cantidad_errores: resultados.errores.length,
                permisos: {
                    skills: permisos.skills || [],
                    tipos_cliente: permisos.tipos_cliente || [],
                    bot_redes: permisos.bot_redes || []
                },
                usuarios_afectados: usuariosAfectadosDel,
                exitosos_detalle: resultados.exitosos,
                no_encontrados_detalle: resultados.no_encontrados.slice(0, 10),
                errores_detalle: resultados.errores.slice(0, 5)
            },
            descripcion: `PERMISO_MASIVO ELIMINAR: ${resultados.exitosos.length} eliminados de ${usuarios.length} usuarios (${mapDBName(db_key)}). ${tiposPermisosDel.join(', ')}. Detalle: ${usuariosDescDel}${masUsuariosDel}`,
            exito: resultados.errores.length === 0
        });

        res.json({
            success: true,
            mensaje: `Proceso completado: ${resultados.exitosos.length} eliminados, ${resultados.no_encontrados.length} no encontrados, ${resultados.errores.length} errores`,
            resultados
        });

    } catch (err) {
        await conn.rollback();
        console.error("Error en eliminacion masiva:", err);
        
        // Auditoría del error
        await registrarAuditoria({
            tipo_accion: 'PERMISO_MASIVO',
            entidad: 'PERMISOS',
            db_key: db_key,
            descripcion: `Error en permisos masivos eliminar: ${err.message}`,
            exito: false,
            mensaje_error: err.message
        });
        
        res.status(500).json({ error: "Error al eliminar permisos masivos", detalle: err.message });
    } finally {
        conn.release();
    }
});

// ==========================================================================
// 14. OBTENER SKILLS DISPONIBLES PARA ASIGNACIÓN MASIVA
// ==========================================================================
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

// ==========================================================================
// 15. OBTENER TIPOS DE CLIENTE DISPONIBLES (filtrados por empresa)
// ==========================================================================
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
        // Los tipos de cliente no tienen ID_EMPRESA directo, 
        // se obtienen los que están asignados a usuarios de la empresa seleccionada
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

// ==========================================================================
// 16. OBTENER BOT_REDES DISPONIBLES (filtrados por empresa y activos)
// ==========================================================================
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

// ==========================================================================
// 17. OBTENER INFORMACIÓN DE USUARIOS DESDE SEGURIDAD (Estado y Perfil)
// ==========================================================================
router.get('/api/usuarios/seguridad/info', async (req, res) => {
    const { db_key, nombre_usuario, id_empresa_nombre } = req.query;

    if (!db_key || !nombre_usuario) {
        return res.status(400).json({ error: "Faltan parametros: db_key y nombre_usuario" });
    }

    // Determinar qué base de datos de seguridad usar según la DB principal
    const dbSeguridad = db_key.includes('ficohsa') || db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10' 
        ? 'db_10'  // Ficohsa
        : 'db_9';   // Talkme por defecto

    const poolSeguridad = pools[dbSeguridad];
    if (!poolSeguridad) {
        return res.status(400).json({ error: `Base de datos de seguridad ${dbSeguridad} no configurada` });
    }

    try {
        // Query para obtener estado del usuario y sus perfiles
        // NOTA: U.ESTADO='ALTA' significa usuario activo, U.ESTADO='BAJA' es inactivo
        // U.CONECTADO=1 significa conectado, 0 desconectado
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
        
        res.json({
            encontrado: true,
            secusuarioid: rows[0].SECUSUARIOID,
            usuario: rows[0].USUARIO,
            nombre_completo: `${rows[0].NOMBRE || ''} ${rows[0].APELLIDO || ''}`.trim(),
            estado_alta: rows[0].ESTADO === 'ALTA', // true=ALTA, false=BAJA
            estado_conectado: rows[0].CONECTADO === 1 || rows[0].CONECTADO === '1', // true=conectado
            bloqueado: rows[0].BLOQUEADO === 1 || rows[0].BLOQUEADO === '1',
            perfiles: perfiles,
            db_seguridad: dbSeguridad
        });
    } catch (err) {
        console.error("Error al obtener info de seguridad:", err);
        res.status(500).json({ error: "Error al consultar seguridad", detalle: err.message });
    }
});

// ==========================================================================
// 18. OBTENER PERFILES DISPONIBLES (para filtro en asignación masiva)
// ==========================================================================
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

// ==========================================================================
// 19. OBTENER USUARIOS POR PERFIL (para asignación masiva filtrada)
// ==========================================================================
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
        // PRIMERO: Obtener el nombre de la empresa seleccionada para saber su SECEMPRESAID
        const [empresaInfo] = await pool.query(
            'SELECT NOMBRE FROM EMPRESAS WHERE ID_EMPRESA = ?',
            [id_empresa]
        );
        
        console.log('Buscando usuarios por perfil:', {
            db_key,
            id_empresa,
            perfil_id,
            empresa_nombre: empresaInfo[0]?.NOMBRE
        });

        // Buscar todos los usuarios de la empresa en SEG_USUARIO_EMPRESA
        // para mapear SECEMPRESAID correctamente
        const [empresasSeguridad] = await poolSeguridad.query(
            'SELECT DISTINCT SECEMPRESAID, SECEMPRESA FROM SEG_EMPRESA WHERE SECEMPRESA LIKE ?',
            [`%${empresaInfo[0]?.NOMBRE || ''}%`]
        );
        
        console.log('Empresas en seguridad:', empresasSeguridad);

        // Query flexible: buscar usuarios del perfil sin filtrar por empresa inicialmente
        // porque SECEMPRESAID puede no coincidir con ID_EMPRESA
        const querySeguridad = `
            SELECT DISTINCT U.USUARIO, U.SECUSUARIOID, U.ESTADO
            FROM SEG_USUARIO U
            JOIN SEG_PERMISO_USUARIO PU ON U.SECUSUARIOID = PU.SECUSUARIOID AND PU.SECPERFILID_PERMISO = ?
            WHERE U.ESTADO = 1
        `;

        const [usuariosSeguridad] = await poolSeguridad.query(querySeguridad, [perfil_id]);
        
        console.log('Usuarios encontrados en seguridad:', usuariosSeguridad.length, usuariosSeguridad.slice(0, 5));
        
        if (usuariosSeguridad.length === 0) {
            return res.json([]);
        }

        // Ahora buscar esos usuarios en la BD principal (match por nombre de usuario)
        const nombresUsuarios = usuariosSeguridad.map(u => u.USUARIO);
        
        // Usar LIKE para cada usuario para buscar coincidencias parciales si es necesario
        // o buscar exacto con IN
        let queryPrincipal;
        let params;
        
        if (nombresUsuarios.length > 0) {
            const placeholders = nombresUsuarios.map(() => '?').join(',');
            queryPrincipal = `
                SELECT ID_USUARIO, NOMBRE_USUARIO, ID_EMPRESA, ESTADO, NOMBRE, APELLIDO
                FROM USUARIOS
                WHERE NOMBRE_USUARIO IN (${placeholders})
                AND ID_EMPRESA = ?
                ORDER BY NOMBRE_USUARIO
            `;
            params = [...nombresUsuarios, id_empresa];
        } else {
            return res.json([]);
        }

        console.log('Query principal:', queryPrincipal);
        console.log('Params:', params);

        const [usuarios] = await pool.query(queryPrincipal, params);
        
        console.log('Usuarios encontrados en BD principal:', usuarios.length);
        
        res.json(usuarios);
    } catch (err) {
        console.error("Error al obtener usuarios por perfil:", err);
        res.status(500).json({ error: "Error al consultar usuarios por perfil", detalle: err.message });
    }
});

// ==========================================================================
// ESTADOS ACTUALES DE USUARIOS (ESTADOS_USUARIOS + ESTADOS)
// ==========================================================================
router.get('/api/usuarios/estados-actuales', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    if (!db_key || !id_empresa) {
        return res.status(400).json({ error: "Faltan parametros db_key o id_empresa" });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

    try {
        // Obtener IDs de estados de la empresa primero (lista pequeña)
        const [estadosEmp] = await pool.query(
            `SELECT ID_ESTADO FROM ESTADOS WHERE ID_EMPRESA = ? AND ELIMINADO = 0`,
            [id_empresa]
        );
        if (estadosEmp.length === 0) { return res.json({}); }
        const idsEstados = estadosEmp.map(r => r.ID_ESTADO);
        const placeholders = idsEstados.map(() => '?').join(',');

        // Estado actual: filtrar por IDs de estados conocidos, sesión abierta
        const [rows] = await pool.query(`
            SELECT eu.ID_USUARIO, e.ID_ESTADO, e.NOMBRE, e.COLOR_PATH, e.ACTIVO, e.PAUSA, eu.MOVIL
            FROM ESTADOS_USUARIOS eu
            INNER JOIN ESTADOS e ON eu.ID_ESTADO = e.ID_ESTADO
            WHERE eu.ID_ESTADO IN (${placeholders})
              AND eu.HORA_FIN IS NULL
        `, idsEstados);

        // Mapa { id_usuario: { id_estado, nombre, color, activo, pausa, movil } }
        // Si hay duplicados por usuario (raro), quedarse con el de HORA_INICIO más reciente
        const toBoolEst = (val) => {
            if (val === null || val === undefined) return false;
            if (Buffer.isBuffer(val)) return val[0] === 1;
            return val === 1 || val === '1' || val === true;
        };
        const mapaRaw = {}; // { id_usuario: { hora_inicio, datos } }
        for (const r of rows) {
            const prev = mapaRaw[r.ID_USUARIO];
            if (!prev || r.HORA_INICIO > prev.hora_inicio) {
                mapaRaw[r.ID_USUARIO] = {
                    hora_inicio: r.HORA_INICIO,
                    datos: {
                        id_estado: r.ID_ESTADO,
                        nombre: r.NOMBRE,
                        color: r.COLOR_PATH,
                        activo: toBoolEst(r.ACTIVO),
                        pausa: toBoolEst(r.PAUSA),
                        movil: toBoolEst(r.MOVIL)
                    }
                };
            }
        }
        const mapa = {};
        for (const [id, entry] of Object.entries(mapaRaw)) {
            mapa[id] = entry.datos;
        }
        res.json(mapa);
    } catch (err) {
        console.error("Error al consultar estados actuales:", err);
        res.status(500).json({ error: "Error al consultar estados actuales" });
    }
});

// Estados disponibles de la empresa
router.get('/api/estados/disponibles', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    if (!db_key || !id_empresa) {
        return res.status(400).json({ error: "Faltan parametros db_key o id_empresa" });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

    try {
        const [rows] = await pool.query(`
            SELECT ID_ESTADO, NOMBRE, COLOR_PATH, ACTIVO, PAUSA, ORDEN
            FROM ESTADOS
            WHERE ID_EMPRESA = ? AND ELIMINADO = 0 AND ESTADO = 1
            ORDER BY ORDEN ASC, NOMBRE ASC
        `, [id_empresa]);
        res.json(rows);
    } catch (err) {
        console.error("Error al obtener estados disponibles:", err);
        res.status(500).json({ error: "Error al obtener estados disponibles" });
    }
});

// ==========================================================================
// CIERRES AUTOMÁTICOS — Preview y Ejecución
// ==========================================================================

// GET /api/cierres/preview?db_key=
// Retorna las conversaciones que serían cerradas (>= 30 días, no cerradas)
router.get('/api/cierres/preview', async (req, res) => {
    const { db_key } = req.query;
    if (!db_key) return res.status(400).json({ error: "Falta db_key" });
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });
    try {
        const [rows] = await pool.query(`
            SELECT
                CV.ID_CONVERSACION,
                CV.ID_EMPRESA,
                E.NOMBRE AS NOMBRE_EMPRESA,
                CV.FECHA_CONVERSACION,
                DATEDIFF(NOW(), CV.FECHA_CONVERSACION) AS DIAS_ABIERTA,
                CV.ESTADO_CONVERSACION
            FROM CONVERSACIONES_VW CV
            JOIN EMPRESAS E ON E.ID_EMPRESA = CV.ID_EMPRESA
            WHERE CV.ESTADO_CONVERSACION != 3
              AND DATEDIFF(NOW(), CV.FECHA_CONVERSACION) >= 30
            ORDER BY DIAS_ABIERTA DESC
        `);
        res.json(rows);
    } catch (err) {
        console.error("[/api/cierres/preview] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/cierres/ejecutar
// Ejecuta el proceso completo de cierre: INSERT tipos, UPDATE conversaciones, INSERT resoluciones
router.post('/api/cierres/ejecutar', async (req, res) => {
    const { db_key } = req.body;
    if (!db_key) return res.status(400).json({ error: "Falta db_key" });
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        const ahora = new Date();

        // 1. Insertar TIPOS_RESOLUCIONES solo para empresas que no lo tengan
        await conn.query(`
            INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR, CREADO_EL)
            SELECT DISTINCT C.ID_EMPRESA,
                   'Conversación en atención',
                   1, 0, 1,
                   'Sistema.TalkMe',
                   ?
            FROM CONVERSACIONES_VW C
            LEFT JOIN TIPOS_RESOLUCIONES TR
                ON TR.ID_EMPRESA = C.ID_EMPRESA
               AND TR.RESOLUCION = 'Conversación en atención'
            WHERE C.ESTADO_CONVERSACION != 3
              AND DATEDIFF(?, C.FECHA_CONVERSACION) >= 30
              AND TR.ID_TIPO_RESOLUCION IS NULL
        `, [ahora, ahora]);

        // 2. Obtener información detallada de conversaciones que se van a cerrar (antes de actualizar)
        // IMPORTANTE: usamos EXISTS para evitar duplicados cuando hay múltiples usuarios "Bot"
        // o múltiples gestiones "Consultas" en la misma empresa (producto cartesiano).
        const [conversacionesPre] = await conn.query(`
            SELECT 
                C.ID_CONVERSACION,
                E.NOMBRE AS EMPRESA,
                CV.FECHA_CONVERSACION AS FECHA_INICIO,
                DATEDIFF(?, CV.FECHA_CONVERSACION) AS DIAS_ABIERTA,
                'Abierta' AS ESTADO
            FROM CONVERSACIONES C
            JOIN CONVERSACIONES_VW CV ON CV.ID_CONVERSACION = C.ID_CONVERSACION
            JOIN EMPRESAS E ON E.ID_EMPRESA = CV.ID_EMPRESA
            WHERE CV.ESTADO_CONVERSACION != 3
              AND DATEDIFF(?, CV.FECHA_CONVERSACION) >= 30
              AND EXISTS (
                  SELECT 1 FROM USUARIOS U
                  WHERE U.ID_EMPRESA = CV.ID_EMPRESA
                    AND U.NOMBRE_USUARIO LIKE '%Bot%'
              )
              AND EXISTS (
                  SELECT 1 FROM TIPOS_GESTION TG
                  WHERE TG.ID_EMPRESA = CV.ID_EMPRESA
                    AND TG.GESTION LIKE '%Consultas%'
              )
            GROUP BY C.ID_CONVERSACION, E.NOMBRE, CV.FECHA_CONVERSACION
        `, [ahora, ahora]);
        
        const idsConversaciones = conversacionesPre.map(c => c.ID_CONVERSACION);
        const detalleConversaciones = conversacionesPre;

        // 3. Actualizar las conversaciones vencidas
        const [updateResult] = await conn.query(`
            UPDATE CONVERSACIONES C
            JOIN CONVERSACIONES_VW CV ON CV.ID_CONVERSACION = C.ID_CONVERSACION
            JOIN (
                SELECT U.ID_EMPRESA, U.ID_USUARIO
                FROM USUARIOS U
                WHERE U.NOMBRE_USUARIO LIKE '%Bot%'
            ) U ON U.ID_EMPRESA = CV.ID_EMPRESA
            JOIN (
                SELECT TG.ID_EMPRESA, TG.ID_TIPO_GESTION
                FROM TIPOS_GESTION TG
                WHERE TG.GESTION LIKE '%Consultas%'
            ) TG ON TG.ID_EMPRESA = CV.ID_EMPRESA
            SET
                C.ID_USUARIO = U.ID_USUARIO,
                C.ID_GESTION = TG.ID_TIPO_GESTION,
                C.ESTADO = 3,
                C.FECHA_FINALIZACION = ?
            WHERE CV.ESTADO_CONVERSACION != 3
              AND DATEDIFF(?, CV.FECHA_CONVERSACION) >= 30
        `, [ahora, ahora]);

        // 3. Insertar resoluciones
        const [insertResult] = await conn.query(`
            INSERT INTO RESOLUCIONES (ID_CONVERSACION, TIPO_RESOLUCION, RESOLUCION, CREADO_POR, CREADO_EL)
            SELECT
                C.ID_CONVERSACION,
                TR.ID_TIPO_RESOLUCION,
                'Cierre automático del sistema con más de 30 días en atención.',
                'BOT',
                ?
            FROM CONVERSACIONES C
            JOIN CONVERSACIONES_VW CV ON CV.ID_CONVERSACION = C.ID_CONVERSACION
            JOIN TIPOS_RESOLUCIONES TR
                ON TR.ID_EMPRESA = CV.ID_EMPRESA
               AND TR.RESOLUCION = 'Conversación en atención'
            LEFT JOIN RESOLUCIONES R
                ON R.ID_CONVERSACION = C.ID_CONVERSACION
            WHERE C.ESTADO = 3
              AND C.FECHA_FINALIZACION = ?
              AND R.ID_CONVERSACION IS NULL
        `, [ahora, ahora]);

        await conn.commit();
        res.json({
            ok: true,
            conversaciones_cerradas: updateResult.affectedRows,
            ids_conversaciones: idsConversaciones,
            detalle_conversaciones: detalleConversaciones,
            resoluciones_insertadas: insertResult.affectedRows
        });
    } catch (err) {
        await conn.rollback();
        console.error("[/api/cierres/ejecutar] Error:", err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// ==========================================================================
// FACEBOOK — Solicitudes de eliminación de datos pendientes
// ==========================================================================

// GET /api/facebook/preview?db_key=
// Retorna registros con ESTADO='procesando'
router.get('/api/facebook/preview', async (req, res) => {
    const { db_key } = req.query;
    if (!db_key) return res.status(400).json({ error: "Falta db_key" });
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });
    try {
        const [rows] = await pool.query(`
            SELECT ID_ELIMINACION, ID_SOLICITUD, ESTADO, USUARIO_ID,
                   NOMBRE_APLICACION, ALCANCE_DATOS, FECHA_SOLICITO
            FROM FACEBOOK_SOLICITUDES_ELIMINACION_DATOS
            WHERE ESTADO = 'procesando'
            ORDER BY FECHA_SOLICITO ASC
        `);
        res.json(rows);
    } catch (err) {
        console.error("[/api/facebook/preview] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// POST /api/facebook/ejecutar
// Actualiza ESTADO='completado' donde ESTADO='procesando'
router.post('/api/facebook/ejecutar', async (req, res) => {
    const { db_key } = req.body;
    if (!db_key) return res.status(400).json({ error: "Falta db_key" });
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });
    try {
        // Obtener información detallada de solicitudes que se van a actualizar (antes de actualizar)
        const [solicitudesPre] = await pool.query(`
            SELECT 
                ID_SOLICITUD,
                ESTADO
            FROM FACEBOOK_SOLICITUDES_ELIMINACION_DATOS
            WHERE ESTADO = 'procesando'
        `);
        const idsSolicitudes = solicitudesPre.map(s => s.ID_SOLICITUD);
        const detalleSolicitudes = solicitudesPre;

        // Actualizar solicitudes
        const [result] = await pool.query(`
            UPDATE FACEBOOK_SOLICITUDES_ELIMINACION_DATOS
            SET ESTADO = 'completado'
            WHERE ESTADO = 'procesando'
        `);
        res.json({ 
            ok: true, 
            actualizados: result.affectedRows,
            ids_solicitudes: idsSolicitudes,
            detalle_solicitudes: detalleSolicitudes
        });
    } catch (err) {
        console.error("[/api/facebook/ejecutar] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get('/api/bot-tags/buscar', async (req, res) => {
    const { db_key, id_bot, tag } = req.query;
    if (!db_key || !id_bot || !tag) {
        return res.status(400).json({ error: "Faltan parametros db_key, id_bot o tag" });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });
    try {
        const [rows] = await pool.query(`
            SELECT
                ID_BOT_MENU,
                NOMBRE,
                PALABRA_CLAVE,
                NOMBRE_RED_SOCIAL,
                TAGS
            FROM BOT_MENU_PALABRAS_VW
            WHERE ID_BOT = ?
              AND MATCH(TAGS) AGAINST (? IN NATURAL LANGUAGE MODE)
        `, [id_bot, tag]);
        res.json(rows);
    } catch (err) {
        console.error("[/api/bot-tags/buscar] Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 22. PERMISOS DE SEGURIDAD — Consulta completa de permisos por usuario
// ==========================================================================
router.get('/api/seguridad/permisos-usuarios', async (req, res) => {
    const { db_key, secempresaid, estado, perfil_id } = req.query;

    const VALID_SEG_DBS = ['db_9', 'db_10'];
    if (!db_key || !VALID_SEG_DBS.includes(db_key)) {
        return res.status(400).json({ error: 'db_key debe ser db_9 o db_10' });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: `Base de datos ${db_key} no configurada` });
    }

    try {
        const whereClauses = [`U.ESTADO != 'BAJA'`];
        const params = [];

        if (secempresaid) {
            whereClauses.push('UE.SECEMPRESAID = ?');
            params.push(secempresaid);
        }
        if (estado && estado !== '') {
            whereClauses.push('U.ESTADO = ?');
            params.push(estado);
        }
        if (perfil_id && perfil_id !== '') {
            whereClauses.push('EXISTS (SELECT 1 FROM SEG_PERMISO_USUARIO PU2 JOIN SEG_PERFIL P2 ON PU2.SECPERFILID_PERMISO = P2.SECPERFILID WHERE PU2.SECUSUARIOID = U.SECUSUARIOID AND P2.SECPERFILID = ?)');
            params.push(perfil_id);
        }

        const whereSQL = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';

        // Query principal: elementos asignados al perfil del usuario (con jerarquía)
        const query = `
            SELECT
                U.SECUSUARIOID,
                U.USUARIO,
                U.ESTADO,
                EMP.NOMBRE AS EMPRESA,
                P.SECPERFILID,
                P.NOMBRE AS PERFIL_NOMBRE,
                E.SECELEMENTOID,
                E.NOMBRE AS ELEM_NOMBRE,
                E.ETIQUETA AS ELEM_ETIQUETA,
                E.DESCRIPCION AS ELEM_DESC,
                E.SECELEMENTOID_PADRE,
                PP.PERMISO AS ELEM_PERMISO
            FROM SEG_USUARIO U
            JOIN SEG_USUARIO_EMPRESA UE ON U.SECUSUARIOID = UE.SECUSUARIOID
            JOIN SEG_EMPRESA EMP ON UE.SECEMPRESAID = EMP.SECEMPRESAID
            JOIN SEG_PERMISO_USUARIO PU ON PU.SECUSUARIOID = U.SECUSUARIOID AND PU.SECPERFILID_PERMISO IS NOT NULL
            JOIN SEG_PERFIL P ON PU.SECPERFILID_PERMISO = P.SECPERFILID
            JOIN SEG_PERMISO_PERFIL PP ON PP.SECPERFILID = P.SECPERFILID
            JOIN SEG_ELEMENTO E ON PP.SECELEMENTOID = E.SECELEMENTOID
            ${whereSQL}
            ORDER BY U.USUARIO, P.NOMBRE, E.SECELEMENTOID_PADRE, E.NOMBRE
        `;

        // Query manuales: elementos directos al usuario (con jerarquía)
        const queryManual = `
            SELECT
                U.SECUSUARIOID,
                E.SECELEMENTOID,
                E.NOMBRE AS ELEM_NOMBRE,
                E.ETIQUETA AS ELEM_ETIQUETA,
                E.DESCRIPCION AS ELEM_DESC,
                E.SECELEMENTOID_PADRE
            FROM SEG_USUARIO U
            JOIN SEG_USUARIO_EMPRESA UE ON U.SECUSUARIOID = UE.SECUSUARIOID
            JOIN SEG_PERMISO_USUARIO PU ON PU.SECUSUARIOID = U.SECUSUARIOID AND PU.SECELEMENTOID IS NOT NULL
            JOIN SEG_ELEMENTO E ON PU.SECELEMENTOID = E.SECELEMENTOID
            ${whereSQL}
            ORDER BY U.USUARIO, E.SECELEMENTOID_PADRE, E.NOMBRE
        `;

        const [[rows], [rowsManual]] = await Promise.all([
            pool.query(query, params),
            pool.query(queryManual, params),
        ]);

        // ── Función: construir árbol padre→hijos a partir de lista plana ──
        const buildTree = (elements) => {
            const byId = {};
            const roots = [];
            elements.forEach(e => {
                byId[e.SECELEMENTOID] = { id: e.SECELEMENTOID, etiqueta: e.ELEM_ETIQUETA, desc: e.ELEM_DESC, permiso: e.ELEM_PERMISO || 'H', hijos: [] };
            });
            elements.forEach(e => {
                if (e.SECELEMENTOID_PADRE && byId[e.SECELEMENTOID_PADRE]) {
                    byId[e.SECELEMENTOID_PADRE].hijos.push(byId[e.SECELEMENTOID]);
                } else {
                    roots.push(byId[e.SECELEMENTOID]);
                }
            });
            return roots;
        };

        // ── Agrupar manuales por usuario ──
        const manualRaw = {};
        rowsManual.forEach(r => {
            if (!manualRaw[r.SECUSUARIOID]) manualRaw[r.SECUSUARIOID] = [];
            manualRaw[r.SECUSUARIOID].push(r);
        });

        // ── Agrupar perfiles por usuario ──
        const usuarioMap = {};
        rows.forEach(row => {
            if (!usuarioMap[row.SECUSUARIOID]) {
                usuarioMap[row.SECUSUARIOID] = {
                    secusuarioid: row.SECUSUARIOID,
                    usuario: row.USUARIO,
                    estado: row.ESTADO,
                    empresa: row.EMPRESA,
                    perfiles: {},
                };
            }
            const key = row.SECPERFILID;
            if (!usuarioMap[row.SECUSUARIOID].perfiles[key]) {
                usuarioMap[row.SECUSUARIOID].perfiles[key] = {
                    id: row.SECPERFILID,
                    nombre: row.PERFIL_NOMBRE,
                    elementos: [],
                };
            }
            usuarioMap[row.SECUSUARIOID].perfiles[key].elementos.push(row);
        });

        // ── Serializar: convertir perfiles a array y construir árbol por perfil ──
        const result = Object.values(usuarioMap).map(u => ({
            ...u,
            perfiles: Object.values(u.perfiles).map(p => ({
                id: p.id,
                nombre: p.nombre,
                tree: buildTree(p.elementos),
            })),
            pantallas_manual: buildTree(manualRaw[u.secusuarioid] || []),
        }));

        res.json(result);
    } catch (err) {
        console.error('[/api/seguridad/permisos-usuarios] Error:', err);
        res.status(500).json({ error: 'Error al consultar permisos', detalle: err.message });
    }
});

// ==========================================================================
// 23. SEGURIDAD — Obtener empresas disponibles en la BD de seguridad
// ==========================================================================
router.get('/api/seguridad/empresas', async (req, res) => {
    const { db_key } = req.query;

    const VALID_SEG_DBS = ['db_9', 'db_10'];
    if (!db_key || !VALID_SEG_DBS.includes(db_key)) {
        return res.status(400).json({ error: 'db_key debe ser db_9 o db_10' });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: `Base de datos ${db_key} no configurada` });
    }

    try {
        const [rows] = await pool.query(
            `SELECT SECEMPRESAID, NOMBRE FROM SEG_EMPRESA ORDER BY NOMBRE`
        );
        res.json(rows);
    } catch (err) {
        console.error('[/api/seguridad/empresas] Error:', err);
        res.status(500).json({ error: 'Error al obtener empresas de seguridad' });
    }
});

// ==========================================================================
// 24. SEGURIDAD — Obtener perfiles en la BD de seguridad
// ==========================================================================
router.get('/api/seguridad/perfiles-lista', async (req, res) => {
    const { db_key } = req.query;

    const VALID_SEG_DBS = ['db_9', 'db_10'];
    if (!db_key || !VALID_SEG_DBS.includes(db_key)) {
        return res.status(400).json({ error: 'db_key debe ser db_9 o db_10' });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: `Base de datos ${db_key} no configurada` });
    }

    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT P.SECPERFILID, P.NOMBRE
             FROM SEG_PERFIL P
             JOIN SEG_PERMISO_USUARIO PU ON PU.SECPERFILID_PERMISO = P.SECPERFILID
             JOIN SEG_USUARIO U ON PU.SECUSUARIOID = U.SECUSUARIOID
             WHERE P.ESTADO = 'ALTA'
             AND U.ESTADO != 'BAJA'
             ORDER BY P.NOMBRE`
        );
        res.json(rows);
    } catch (err) {
        console.error('[/api/seguridad/perfiles-lista] Error:', err);
        res.status(500).json({ error: 'Error al obtener perfiles de seguridad' });
    }
});

// ==========================================================================
// 25. SEGURIDAD — Obtener elementos (pantallas) habilitados en perfiles
// ==========================================================================
router.get('/api/seguridad/elementos-lista', async (req, res) => {
    const { db_key } = req.query;

    const VALID_SEG_DBS = ['db_9', 'db_10'];
    if (!db_key || !VALID_SEG_DBS.includes(db_key)) {
        return res.status(400).json({ error: 'db_key debe ser db_9 o db_10' });
    }

    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: `Base de datos ${db_key} no configurada` });
    }

    try {
        const [rows] = await pool.query(
            `SELECT DISTINCT E.SECELEMENTOID, E.ETIQUETA, E.DESCRIPCION
             FROM SEG_ELEMENTO E
             JOIN SEG_PERMISO_PERFIL PP ON PP.SECELEMENTOID = E.SECELEMENTOID AND PP.PERMISO = 'H'
             WHERE E.ESTADO = 'ALTA'
             ORDER BY E.ETIQUETA`
        );
        res.json(rows);
    } catch (err) {
        console.error('[/api/seguridad/elementos-lista] Error:', err);
        res.status(500).json({ error: 'Error al obtener elementos de seguridad' });
    }
});

// ==========================================================================
// 🔴 Iniciar el programador de tareas (cron) para ejecutar worker.js
// ==========================================================================

// NOTA: Los endpoints de reportes se manejan en aReportes2.js
// __DUPLICADO_INICIO__
router.post('/__deprecated_reportes_detallado', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, skills } = req.body;
    
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        const skillsFilter = skills && skills.length > 0 ? skills.join(',') : '9,26,39,43,71,102';
        
        const query = `
            SELECT 
              C.ID_CONVERSACION,
              (SELECT U.NOMBRE_USUARIO FROM USUARIOS U WHERE U.ID_USUARIO = C.ID_USUARIO_INICIO) AS OPERADOR_INICIA,
              (SELECT U.NOMBRE_USUARIO FROM USUARIOS U WHERE U.ID_USUARIO = C.ID_USUARIO) AS OPERADOR_FINALIZA,
              B.DESCRIPCION AS CANAL,
              RS.NOMBRE AS RED_SOCIAL,
              S.NOMBRE_SKILL AS SKILL,
              FCRS.ID_RRSS_EXTERNO AS CLIENTE,
              MAX(COALESCE(FA.VALOR, FC.NOMBRE_CLIENTE)) AS NOMBRE,  
              DATE(DATE_SUB(STATS.FECHA_HORA_PRIMER_MENSAJE_CLIENTE, INTERVAL 6 HOUR)) AS 'FECHA 1ER MENSAJE CLIENTE',
              TIME(DATE_SUB(STATS.FECHA_HORA_PRIMER_MENSAJE_CLIENTE, INTERVAL 6 HOUR)) AS 'HORA 1ER MENSAJE CLIENTE',
              DATE(DATE_SUB(C.FECHA_CONVERSACION, INTERVAL 6 HOUR)) AS FECHA_INGRESO_CONSOLA,
              TIME(DATE_SUB(C.FECHA_CONVERSACION, INTERVAL 6 HOUR)) AS HORA_INGRESO_CONSOLA,
              DATE(DATE_SUB(C.FECHA_ATENCION, INTERVAL 6 HOUR)) AS FECHA_ASIGNACION,
              TIME(DATE_SUB(C.FECHA_ATENCION, INTERVAL 6 HOUR)) AS HORA_ASIGNACION,
              DATE(DATE_SUB(STATS.FECHA_HORA_PRIMER_MENSAJE_OPERADOR, INTERVAL 6 HOUR)) AS 'FECHA 1ER RESPUESTA OPERADOR',
              TIME(DATE_SUB(STATS.FECHA_HORA_PRIMER_MENSAJE_OPERADOR, INTERVAL 6 HOUR)) AS 'HORA 1ER RESPUESTA OPERADOR',
              DATE(DATE_SUB(C.FECHA_FINALIZACION, INTERVAL 6 HOUR)) AS FECHA_FINALIZACION,
              TIME(DATE_SUB(C.FECHA_FINALIZACION, INTERVAL 6 HOUR)) AS HORA_FINALIZACION,
              STATS.DURACION,
              TG.GESTION,
              TR.RESOLUCION AS TIPO_RESOLUCION,
              R.RESOLUCION,
              STATS.TIEMPO_BOT AS 'TIEMPO PROCESAMIENTO BOT',
              STATS.TIEMPO_COLA,
              STATS.TME_CLIENTE,
              STATS.TME_OPERADOR,
              STATS.TIEMPO_PRIMERA_RESPUESTA AS 'TIEMPO 1ER RESPUESTA',
              STATS.TMO,
              STATS.TMA,
              SEC_TO_TIME(ROUND(ABS(STATS.TMR), 0)) AS TMR,
              STATS.CIE AS CANTIDAD_HITS_ENTRANTES,
              STATS.CIS AS CANTIDAD_HITS_SALIENTES,
              (STATS.CIE + STATS.CIS) AS TOTAL_HITS,
              STATS.TPIE AS TIEMPO_PROMEDIO_DE_HITS_ENTRANTES,
              STATS.TPIS AS TIEMPO_PROMEDIO_DE_HITS_SALIENTES,
              R.OPCION_BOT AS OPCION_MENU_BOT,
               STATS.TEP AS 'TIEMPO ESPERA OPERADOR'
            FROM 
              CONVERSACIONES C
              JOIN BOT_REDES BR ON BR.ID_BOT_REDES = C.ID_BOT_REDES
              JOIN REDES_SOCIALES RS ON RS.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
              JOIN BOT B ON B.ID_BOT = BR.ID_BOT
              JOIN SKILLS S ON S.ID_SKILL = C.ID_SKILL
              JOIN FICHA_CLIENTE FC ON FC.ID_FICHA = C.ID_FICHA
              JOIN FICHA_CLIENTE_RED_SOCIAL FCRS ON FCRS.ID_FICHA = FC.ID_FICHA
              JOIN RESOLUCIONES R ON R.ID_CONVERSACION = C.ID_CONVERSACION
              JOIN TIPOS_RESOLUCIONES TR ON TR.ID_TIPO_RESOLUCION = R.TIPO_RESOLUCION
              LEFT JOIN FICHA_ATRIBUTO FA ON FA.ID_FICHA_UNICA = FCRS.ID_FICHA_UNICA
              LEFT JOIN ATRIBUTOS_FICHA_CLIENTE AFC ON AFC.ID_ATRIBUTO = FA.ID_ATRIBUTO AND AFC.ID_EMPRESA = ?
              LEFT OUTER JOIN TIPOS_GESTION TG ON TG.ID_TIPO_GESTION = C.ID_GESTION
              JOIN METRICAS_CONVERSACION STATS ON STATS.ID_CONVERSACION = C.ID_CONVERSACION
            WHERE
              C.ESTADO = 3 
               AND B.ID_EMPRESA = ?
              AND S.ID_SKILL IN (${skillsFilter})
              AND STATS.CANTIDAD_MENSAJES > 0
              AND CONVERT_TZ(C.FECHA_CONVERSACION, 'UTC', 'America/Guatemala') BETWEEN ? AND ?
            GROUP BY C.ID_CONVERSACION, OPERADOR_INICIA,OPERADOR_FINALIZA,CANAL,
              RED_SOCIAL,
              SKILL,
              CLIENTE,
              FECHA_PRIMER_MENSAJE_CLIENTE,
              HORA_PRIMER_MENSAJE_CLIENTE,
              FECHA_INGRESO_CONSOLA,
              HORA_INGRESO_CONSOLA,
              FECHA_ASIGNACION,
              HORA_ASIGNACION,
              FECHA_PRIMER_MENSAJE_OPERADOR,
              HORA_PRIMER_MENSAJE_OPERADOR,
              FECHA_FINALIZACION,
              HORA_FINALIZACION,
              STATS.DURACION,
              TG.GESTION,
              TR.RESOLUCION,
              R.RESOLUCION,
              STATS.TIEMPO_BOT,
              STATS.TIEMPO_COLA,
              STATS.TME_CLIENTE,
              STATS.TME_OPERADOR,
              STATS.TIEMPO_PRIMERA_RESPUESTA,
              STATS.TMO,
              STATS.TMA,
              STATS.CIE,
              STATS.CIS,
              STATS.TPIE,
              STATS.TPIS,
              R.OPCION_BOT
            ORDER BY C.FECHA_CONVERSACION DESC
        `;

        const [results] = await pool.query(query, [id_empresa, id_empresa, fecha_inicio, fecha_fin]);
        res.json(results);

    } catch (error) {
        console.error('Error en reporte detallado:', error);
        res.status(500).json({ error: 'Error al generar reporte detallado' });
    }
});

// __DEPRECATED__ Endpoint manejado en aReportes2.js
router.post('/__deprecated_reportes_resumido', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, skills } = req.body;
    
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        const skillsFilter = skills && skills.length > 0 ? skills.join(',') : '9,26,39,43,71,102';
        
        const query = `
            SELECT
                RS.NOMBRE_USUARIO_INICIO AS 'Operador Abre',
                RS.NOMBRE_USUARIO_FINALIZA AS 'Operador Cierre',
                RS.NOMBRE_RED_SOCIAL AS 'Red Social',
                RS.NOMBRE_BOT AS 'Canal',
                RS.ORIGEN AS DESTINO,
                'Inicio Caso' AS 'Evento',
                DATE( CONVERT_TZ( RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala' ) ) AS 'Fecha',
                TIME( CONVERT_TZ( RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala' ) ) AS 'Hora',
                'Fin Caso' AS 'Evento',
                DATE( CONVERT_TZ( RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala' ) ) AS 'Fecha',
                TIME( CONVERT_TZ( RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala' ) ) AS 'Hora',
                RS.DURACION AS 'Duracion',
                RS.TME_CLIENTE AS 'Tiempo 1er Respuesta',
                CONVERT_TZ( RS.PRIMER_RESPUESTA, 'UTC', 'America/Guatemala' ) AS 'TS 1er Respuesta',
                RS.TIEMPO_COLA AS 'Tiempo en cola espera',
                RS.TME,
                RS.GESTION AS 'Gestion',
                TR.RESOLUCION AS 'Tipo Resolucion',
                R.RESOLUCION AS 'Resolucion',
                R.OPCION_BOT AS 'Opcion Menu Bot',
                SK.NOMBRE_SKILL AS 'Skill' 
            FROM
                REPORTE_RESOLUCIONES RS
                INNER JOIN RESOLUCIONES R ON R.ID_RESOLUCION = RS.ID_RESOLUCION
                INNER JOIN TIPOS_RESOLUCIONES TR ON TR.ID_TIPO_RESOLUCION = R.TIPO_RESOLUCION
                INNER JOIN SKILLS SK ON SK.ID_SKILL = RS.ID_SKILL
                INNER JOIN TIPO_CLIENTE TC ON TC.ID_TIPO = RS.ID_TIPO_CLIENTE 
            WHERE
                RS.ID_EMPRESA = ?
                AND CONVERT_TZ( RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala' ) BETWEEN ? AND ?
                AND EXISTS (
                    SELECT 1 
                    FROM BOT_REDES BR
                    JOIN BOT B ON B.ID_BOT = BR.ID_BOT AND B.ESTADO = 1
                    JOIN REDES_SOCIALES RED ON RED.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
                    JOIN PERMISOS_USUARIOS_BOT_REDES PUBR ON PUBR.ID_BOT_REDES = BR.ID_BOT_REDES 
                    WHERE BR.ID_BOT_REDES = RS.ID_BOT_REDES 
                    AND B.ID_EMPRESA = RS.ID_EMPRESA 
                    AND ( RED.NOMBRE COLLATE utf8mb4_unicode_ci ) = RS.NOMBRE_RED_SOCIAL 
                )
                AND EXISTS (
                    SELECT 1 
                    FROM PERMISOS_USUARIOS_SKILLS PUS 
                    WHERE PUS.ID_SKILL = RS.ID_SKILL
                    AND PUS.ID_SKILL IN (${skillsFilter})
                )
                AND EXISTS ( 
                    SELECT 1 FROM PERMISOS_USUARIOS_CLIENTES PUC 
                    WHERE PUC.ID_TIPO_CLIENTE = RS.ID_TIPO_CLIENTE 
                )
            ORDER BY RS.FECHA_HORA_INICIO DESC
        `;

        const [results] = await pool.query(query, [id_empresa, fecha_inicio, fecha_fin]);
        res.json(results);

    } catch (error) {
        console.error('Error en reporte resumido:', error);
        res.status(500).json({ error: 'Error al generar reporte resumido' });
    }
});

// ==========================================================================
// HISTORIAL DE ESTADOS DE USUARIOS (ESTADOS_USUARIOS + ESTADOS + USUARIOS)
// Con JOIN a tablas de seguridad para mostrar permisos actuales
// ==========================================================================
router.get('/api/usuarios/historial-estados', async (req, res) => {
    const { db_key, fecha_inicio, fecha_fin, id_empresa, perfil, estado, id_usuario, skills, bot_redes } = req.query;
    
    if (!db_key || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: "Faltan parametros db_key, fecha_inicio o fecha_fin" });
    }
    
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

    try {
        // Verificar si existe base de datos de seguridad (db_9 para talkme, db_10 para algunos entornos)
        // Usar la misma lógica que en /api/usuarios para evitar inconsistencias entre endpoints
        const dbKeySeg = (db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10') ? 'db_10' : 'db_9';
        const poolSeg = pools[dbKeySeg];
        
        // Query base: historial de estados con info de usuarios
        // Fechas convertidas de UTC a horario de Guatemala (America/Guatemala)
        let query = `
            SELECT 
                eu.ID_ESTADO_USUARIOS,
                eu.ID_USUARIO,
                eu.ID_ESTADO,
                CONVERT_TZ(eu.HORA_INICIO, 'UTC', 'America/Guatemala') AS HORA_INICIO_GT,
                CONVERT_TZ(eu.HORA_FIN, 'UTC', 'America/Guatemala') AS HORA_FIN_GT,
                eu.MOVIL,
                COALESCE(e.NOMBRE, CONCAT('Estado #', eu.ID_ESTADO)) AS NOMBRE_ESTADO,
                COALESCE(e.COLOR_PATH, '#999999') AS COLOR_PATH,
                COALESCE(e.ACTIVO, 0) AS ESTADO_ACTIVO,
                COALESCE(e.PAUSA, 0) AS ESTADO_PAUSA,
                u.NOMBRE_USUARIO AS LOGIN_USUARIO,
                u.NOMBRE,
                u.APELLIDO,
                u.ESTADO AS ESTADO_USUARIO,
                emp.ID_EMPRESA,
                emp.NOMBRE AS NOMBRE_EMPRESA
            FROM ESTADOS_USUARIOS eu
            LEFT JOIN ESTADOS e ON eu.ID_ESTADO = e.ID_ESTADO
            INNER JOIN USUARIOS u ON eu.ID_USUARIO = u.ID_USUARIO
            INNER JOIN EMPRESAS emp ON u.ID_EMPRESA = emp.ID_EMPRESA
            WHERE CONVERT_TZ(eu.HORA_INICIO, 'UTC', 'America/Guatemala') >= ? 
              AND CONVERT_TZ(eu.HORA_INICIO, 'UTC', 'America/Guatemala') <= ?
        `;
        
        const params = [fecha_inicio + ' 00:00:00', fecha_fin + ' 23:59:59'];
        
        // Filtros adicionales
        if (id_empresa && id_empresa !== '') {
            query += ` AND emp.ID_EMPRESA = ?`;
            params.push(id_empresa);
        }
        
        if (estado && estado !== '') {
            query += ` AND eu.ID_ESTADO = ?`;
            params.push(estado);
        }
        
        if (id_usuario && id_usuario !== '') {
            query += ` AND eu.ID_USUARIO = ?`;
            params.push(id_usuario);
        }
        
        query += ` ORDER BY eu.HORA_INICIO DESC`;
        
        const [historialRows] = await pool.query(query, params);
        
        console.log(`[HistorialEstados] Query ejecutada. Registros encontrados: ${historialRows.length}`);
        if (historialRows.length > 0) {
            console.log(`[HistorialEstados] Primer registro:`, {
                id: historialRows[0].ID_ESTADO_USUARIOS,
                id_estado: historialRows[0].ID_ESTADO,
                nombre_estado: historialRows[0].NOMBRE_ESTADO,
                color: historialRows[0].COLOR_PATH
            });
        }
        
        if (historialRows.length === 0) {
            return res.json([]);
        }
        
        // Obtener IDs de usuarios para consultar permisos
        const idsUsuarios = [...new Set(historialRows.map(r => r.ID_USUARIO))];
        
        // Consultar skills de los usuarios - usando misma lógica que /api/usuarios/permisos/skills
        let usuariosSkillsMap = {};
        const [skillsRows] = await pool.query(`
            SELECT pus.ID_USUARIO, s.NOMBRE_SKILL
            FROM PERMISOS_USUARIOS_SKILLS pus
            INNER JOIN SKILLS s ON pus.ID_SKILL = s.ID_SKILL
            WHERE pus.ID_USUARIO IN (${idsUsuarios.map(() => '?').join(',')})
            AND s.ESTADO = 1
        `, idsUsuarios);
        
        skillsRows.forEach(r => {
            if (!usuariosSkillsMap[r.ID_USUARIO]) usuariosSkillsMap[r.ID_USUARIO] = [];
            usuariosSkillsMap[r.ID_USUARIO].push(r.NOMBRE_SKILL);
        });
        
        // Consultar bot redes de los usuarios - usando misma lógica que /api/usuarios/con-bot-redes
        let usuariosBotRedesMap = {};
        const [botRedesRows] = await pool.query(`
            SELECT pubr.ID_USUARIO, bot.DESCRIPCION AS BOT_REDES_NOMBRE, c.NOMBRE AS RED_SOCIAL
            FROM PERMISOS_USUARIOS_BOT_REDES pubr
            INNER JOIN BOT_REDES d ON pubr.ID_BOT_REDES = d.ID_BOT_REDES
            INNER JOIN BOT bot ON d.ID_BOT = bot.ID_BOT
            INNER JOIN REDES_SOCIALES c ON d.ID_RED_SOCIAL = c.ID_RED_SOCIAL
            WHERE pubr.ID_USUARIO IN (${idsUsuarios.map(() => '?').join(',')})
              AND d.ESTADO = 1
        `, idsUsuarios);
        
        botRedesRows.forEach(r => {
            if (!usuariosBotRedesMap[r.ID_USUARIO]) usuariosBotRedesMap[r.ID_USUARIO] = [];
            usuariosBotRedesMap[r.ID_USUARIO].push(`${r.BOT_REDES_NOMBRE} (${r.RED_SOCIAL})`);
        });
        
        // Consultar perfiles de seguridad - MISMA LÓGICA QUE /api/usuarios
        // Vinculamos por LOGIN_USUARIO (productiva) = USUARIO (seguridad)
        let usuariosPerfilesMap = {};
        try {
            const dbKeySeg = (db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10') ? 'db_10' : 'db_9';
            const poolSeg = pools[dbKeySeg];
            
            if (poolSeg) {
                // Obtener nombres de usuario únicos del historial
                const nombresUsuarios = [...new Set(historialRows.map(r => r.LOGIN_USUARIO))];
                console.log(`[HistorialEstados] Buscando ${nombresUsuarios.length} usuarios en seguridad...`);
                
                // DEBUG: Ver qué usuarios existen en SEG_USUARIO
                const [allSegUsers] = await poolSeg.query(
                    `SELECT USUARIO FROM SEG_USUARIO LIMIT 10`
                );
                console.log(`[HistorialEstados] Primeros 10 usuarios en SEG_USUARIO:`, allSegUsers.map(u => u.USUARIO));
                
                if (nombresUsuarios.length > 0) {
                    const placeholders = nombresUsuarios.map(() => '?').join(',');
                    const [segRows] = await poolSeg.query(
                        `SELECT U.USUARIO, 
                                GROUP_CONCAT(DISTINCT P.NOMBRE ORDER BY P.NOMBRE SEPARATOR ', ') AS PERFILES
                         FROM SEG_USUARIO U
                         LEFT JOIN SEG_PERMISO_USUARIO PU ON U.SECUSUARIOID = PU.SECUSUARIOID AND PU.SECPERFILID_PERMISO IS NOT NULL
                         LEFT JOIN SEG_PERFIL P ON PU.SECPERFILID_PERMISO = P.SECPERFILID
                         WHERE U.USUARIO IN (${placeholders})
                         GROUP BY U.USUARIO`,
                        nombresUsuarios
                    );
                    
                    console.log(`[HistorialEstados] Encontrados ${segRows.length} usuarios con perfiles en seguridad`);
                    
                    // DEBUG: Mostrar algunos ejemplos
                    if (segRows.length > 0) {
                        console.log(`[HistorialEstados] Ejemplo - Primer usuario encontrado:`, segRows[0]);
                    }
                    
                    // Crear mapa: USUARIO -> PERFILES
                    const segMap = {};
                    segRows.forEach(s => { 
                        segMap[s.USUARIO] = s.PERFILES; 
                        console.log(`[HistorialEstados] MAPA: ${s.USUARIO} -> ${s.PERFILES}`);
                    });
                    
                    // DEBUG: Mostrar primeros 5 nombres buscados vs encontrados
                    console.log(`[HistorialEstados] Primeros 5 nombres buscados en productiva:`, nombresUsuarios.slice(0, 5));
                    console.log(`[HistorialEstados] Primeros 5 nombres encontrados en seguridad:`, segRows.slice(0, 5).map(s => s.USUARIO));
                    
                    // Mapear por ID_USUARIO de la tabla productiva
                    let conPerfil = 0;
                    let sinPerfil = 0;
                    historialRows.forEach(r => {
                        const perfiles = segMap[r.LOGIN_USUARIO];
                        if (perfiles) {
                            usuariosPerfilesMap[r.ID_USUARIO] = perfiles;
                            conPerfil++;
                        } else {
                            usuariosPerfilesMap[r.ID_USUARIO] = 'Sin perfil';
                            sinPerfil++;
                        }
                    });
                    
                    console.log(`[HistorialEstados] Resumen: ${conPerfil} con perfil, ${sinPerfil} sin perfil`);
                }
            }
        } catch (err) {
            console.log('[HistorialEstados] Error consultando perfiles de seguridad:', err.message);
        }
        
        // Construir resultado final con todos los datos
        let resultados = historialRows.map(h => ({
            id_estado_usuarios: h.ID_ESTADO_USUARIOS,
            id_usuario: h.ID_USUARIO,
            login_usuario: h.LOGIN_USUARIO,
            nombre_usuario: `${h.NOMBRE || ''} ${h.APELLIDO || ''}`.trim(),
            id_estado: h.ID_ESTADO,
            nombre_estado: h.NOMBRE_ESTADO,
            color_estado: h.COLOR_PATH,
            estado_activo: h.ESTADO_ACTIVO === 1 || h.ESTADO_ACTIVO === '1',
            estado_pausa: h.ESTADO_PAUSA === 1 || h.ESTADO_PAUSA === '1',
            hora_inicio: h.HORA_INICIO_GT,
            hora_fin: h.HORA_FIN_GT,
            movil: h.MOVIL === 1 || h.MOVIL === '1',
            id_empresa: h.ID_EMPRESA,
            nombre_empresa: h.NOMBRE_EMPRESA,
            estado_usuario: h.ESTADO_USUARIO,
            // Permisos actuales
            perfiles: usuariosPerfilesMap[h.ID_USUARIO] || 'Sin perfil',
            skills: usuariosSkillsMap[h.ID_USUARIO] || [],
            bot_redes: usuariosBotRedesMap[h.ID_USUARIO] || []
        }));
        
        // Aplicar filtros de skills y bot_redes si se especificaron
        if (skills && skills !== '') {
            const skillsFiltro = skills.toLowerCase().split(',').map(s => s.trim()).filter(s => s);
            resultados = resultados.filter(r => 
                skillsFiltro.some(sf => r.skills.some(s => s.toLowerCase().includes(sf)))
            );
        }
        
        if (bot_redes && bot_redes !== '') {
            const botRedesFiltro = bot_redes.toLowerCase().split(',').map(b => b.trim()).filter(b => b);
            resultados = resultados.filter(r => 
                botRedesFiltro.some(bf => r.bot_redes.some(b => b.toLowerCase().includes(bf)))
            );
        }
        
        // Aplicar filtro de perfil si se especificó
        if (perfil && perfil !== '') {
            resultados = resultados.filter(r => 
                r.perfiles.toLowerCase().includes(perfil.toLowerCase())
            );
        }
        
        res.json(resultados);
        
    } catch (err) {
        console.error("Error al consultar historial de estados:", err);
        res.status(500).json({ error: "Error al consultar historial de estados", details: err.message });
    }
});

// 🔹 PLANTILLAS WHATSAPP — Obtener plantillas por empresa/bot
router.get('/api/plantillas-whatsapp', async (req, res) => {
    const { db_key, id_empresa, id_bot, estado } = req.query;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido o invalido' });
    }
    
    if (!id_empresa) {
        return res.status(400).json({ error: 'id_empresa requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        
        // Query de plantillas con botones y parametros mapeados
        const query = `
            SELECT 
                E.ID_EMPRESA,
                E.NOMBRE AS NOMBRE_EMPRESA,
                B.ID_BOT,
                B.DESCRIPCION AS NOMBRE_BOT,
                PW.ID_PLANTILLA_CATEGORIA,
                PC.CATEGORIA AS NOMBRE_CATEGORIA,
                PC.ETIQUETA AS ETIQUETA_CATEGORIA,
                PW.ID_PLANTILLA,
                PW.ID_INTERNO,
                PW.NOMBRE AS NOMBRE_PLANTILLA,
                PW.MENSAJE AS MENSAJE_ORIGINAL,
                PW.ESTADO,
                PW.ESTADO_GUPSHUP,
                PW.TIPO_PLANTILLA,
                PW.MEDIA,
                PW.URL AS MEDIA_URL,
                PW.PANTALLAS,
                D.VALOR AS NUMERO_ASOCIADO,
                D2.VALOR AS NOMBRE_DEL_APP,
                -- Parametros mapeados
                GROUP_CONCAT(DISTINCT 
                    CASE WHEN P0.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 1, 'nombre', P0.NOMBRE) END,
                    CASE WHEN P1.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 2, 'nombre', P1.NOMBRE) END,
                    CASE WHEN P2.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 3, 'nombre', P2.NOMBRE) END,
                    CASE WHEN P3.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 4, 'nombre', P3.NOMBRE) END,
                    CASE WHEN P4.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 5, 'nombre', P4.NOMBRE) END,
                    CASE WHEN P5.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 6, 'nombre', P5.NOMBRE) END,
                    CASE WHEN P6.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 7, 'nombre', P6.NOMBRE) END,
                    CASE WHEN P7.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 8, 'nombre', P7.NOMBRE) END,
                    CASE WHEN P8.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 9, 'nombre', P8.NOMBRE) END,
                    CASE WHEN P9.NOMBRE IS NOT NULL THEN JSON_OBJECT('orden', 10, 'nombre', P9.NOMBRE) END
                SEPARATOR ',') AS PARAMETROS_JSON,
                -- Botones agregados
                GROUP_CONCAT(DISTINCT JSON_OBJECT(
                    'tipo', PWB.TIPO,
                    'titulo', PWB.TITULO,
                    'url', PWB.URL,
                    'telefono', PWB.TELEFONO
                ) SEPARATOR '|||') AS BOTONES_JSON
            FROM PLANTILLAS_WHATSAPP PW
            JOIN BOT_REDES BR ON PW.ID_BOT_REDES = BR.ID_BOT_REDES
            JOIN BOT B ON BR.ID_BOT = B.ID_BOT
            JOIN EMPRESAS E ON B.ID_EMPRESA = E.ID_EMPRESA
            LEFT JOIN PLANTILLA_CATEGORIA PC ON PW.ID_PLANTILLA_CATEGORIA = PC.ID_PLANTILLA_CATEGORIA
            LEFT JOIN BOT_RED_CONF_VALORES D ON BR.ID_BOT_REDES = D.ID_BOT_REDES AND D.ID_BOT_RED_CONFIGURACION = 1
            LEFT JOIN BOT_RED_CONF_VALORES D2 ON BR.ID_BOT_REDES = D2.ID_BOT_REDES AND D2.ID_BOT_RED_CONFIGURACION = 14
            LEFT JOIN PLANTILLA_WHATSAPP_BOTONES PWB ON PW.ID_PLANTILLA = PWB.ID_PLANTILLA
            -- Parametros (0-9)
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P0 ON PW.ID_PLANTILLA = P0.ID_PLANTILLA AND P0.ORDEN = 1
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P1 ON PW.ID_PLANTILLA = P1.ID_PLANTILLA AND P1.ORDEN = 2
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P2 ON PW.ID_PLANTILLA = P2.ID_PLANTILLA AND P2.ORDEN = 3
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P3 ON PW.ID_PLANTILLA = P3.ID_PLANTILLA AND P3.ORDEN = 4
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P4 ON PW.ID_PLANTILLA = P4.ID_PLANTILLA AND P4.ORDEN = 5
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P5 ON PW.ID_PLANTILLA = P5.ID_PLANTILLA AND P5.ORDEN = 6
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P6 ON PW.ID_PLANTILLA = P6.ID_PLANTILLA AND P6.ORDEN = 7
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P7 ON PW.ID_PLANTILLA = P7.ID_PLANTILLA AND P7.ORDEN = 8
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P8 ON PW.ID_PLANTILLA = P8.ID_PLANTILLA AND P8.ORDEN = 9
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS P9 ON PW.ID_PLANTILLA = P9.ID_PLANTILLA AND P9.ORDEN = 10
            WHERE E.ESTADO = 1 AND B.ESTADO = 1 AND BR.ID_RED_SOCIAL = 1 AND PW.ELIMINADO = 0
                AND E.ID_EMPRESA = ?
                ${id_bot ? 'AND B.ID_BOT = ?' : ''}
                ${estado !== undefined && estado !== '' ? 'AND PW.ESTADO = ?' : ''}
            GROUP BY PW.ID_PLANTILLA
            ORDER BY PW.ID_PLANTILLA_CATEGORIA, PW.NOMBRE
        `;
        
        const params = [id_empresa];
        if (id_bot) params.push(id_bot);
        if (estado !== undefined && estado !== '') params.push(parseInt(estado));
        
        const [rows] = await dbDestino.query(query, params);
        
        // Procesar resultados
        const plantillas = rows.map(row => {
            // Parsear parametros
            let parametros = [];
            if (row.PARAMETROS_JSON) {
                try {
                    const cleanJson = '[' + row.PARAMETROS_JSON.split(',').filter(p => p).join(',') + ']';
                    parametros = JSON.parse(cleanJson);
                } catch (e) {
                    parametros = [];
                }
            }
            
            // Parsear botones
            let botones = [];
            if (row.BOTONES_JSON) {
                try {
                    botones = row.BOTONES_JSON.split('|||').map(b => JSON.parse(b)).filter(b => b.tipo);
                } catch (e) {
                    botones = [];
                }
            }
            
            // Crear mensaje mapeado reemplazando {{0}}, {{1}}, etc
            let mensaje_mapeado = row.MENSAJE_ORIGINAL || '';
            parametros.forEach(p => {
                if (p.nombre) {
                    mensaje_mapeado = mensaje_mapeado.replace(
                        new RegExp('\\{\\{' + (p.orden - 1) + '\\}\\}', 'g'),
                        `{{${p.nombre}}}`
                    );
                }
            });
            
            return {
                id_empresa: row.ID_EMPRESA,
                nombre_empresa: row.NOMBRE_EMPRESA,
                id_bot: row.ID_BOT,
                nombre_bot: row.NOMBRE_BOT,
                id_plantilla: row.ID_PLANTILLA,
                id_interno: row.ID_INTERNO,
                id_categoria: row.ID_PLANTILLA_CATEGORIA,
                nombre_categoria: row.NOMBRE_CATEGORIA,
                etiqueta_categoria: row.ETIQUETA_CATEGORIA,
                nombre: row.NOMBRE_PLANTILLA,
                mensaje_original: row.MENSAJE_ORIGINAL,
                mensaje_mapeado: mensaje_mapeado,
                estado: row.ESTADO,
                estado_gupshup: row.ESTADO_GUPSHUP,
                tipo_plantilla: row.TIPO_PLANTILLA,
                media: row.MEDIA,
                media_url: row.MEDIA_URL,
                pantallas: row.PANTALLAS,
                numero_asociado: row.NUMERO_ASOCIADO,
                nombre_app: row.NOMBRE_DEL_APP,
                parametros: parametros,
                botones: botones
            };
        });
        
        res.json({ data: plantillas, total: plantillas.length });
        
    } catch (err) {
        console.error('Error al consultar plantillas:', err);
        res.status(500).json({ error: 'Error al consultar plantillas', details: err.message });
    }
});

// 🔹 EXPORTAR PLANTILLAS A EXCEL
router.get('/api/plantillas-whatsapp/export', async (req, res) => {
    const { db_key, id_empresa, id_bot, estado } = req.query;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_empresa) {
        return res.status(400).json({ error: 'id_empresa requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        
        const query = `
            SELECT 
                PW.ID_PLANTILLA,
                PW.ID_INTERNO,
                PW.NOMBRE AS NOMBRE_PLANTILLA,
                PC.CATEGORIA AS CATEGORIA,
                PW.ESTADO,
                PW.ESTADO_GUPSHUP,
                PW.TIPO_PLANTILLA,
                PW.MEDIA,
                PW.URL,
                PW.PANTALLAS AS PANTALLAS,
                E.NOMBRE AS EMPRESA,
                B.DESCRIPCION AS BOT,
                PW.MENSAJE,
                COUNT(DISTINCT PWB.ID_BOTON) AS TOTAL_BOTONES,
                COUNT(DISTINCT PWP.ORDEN) AS TOTAL_PARAMETROS
            FROM PLANTILLAS_WHATSAPP PW
            JOIN BOT_REDES BR ON PW.ID_BOT_REDES = BR.ID_BOT_REDES
            JOIN BOT B ON BR.ID_BOT = B.ID_BOT
            JOIN EMPRESAS E ON B.ID_EMPRESA = E.ID_EMPRESA
            LEFT JOIN PLANTILLA_CATEGORIA PC ON PW.ID_PLANTILLA_CATEGORIA = PC.ID_PLANTILLA_CATEGORIA
            LEFT JOIN PLANTILLA_WHATSAPP_BOTONES PWB ON PW.ID_PLANTILLA = PWB.ID_PLANTILLA
            LEFT JOIN PLANTILLA_WHATSAPP_PARAMETROS PWP ON PW.ID_PLANTILLA = PWP.ID_PLANTILLA
            WHERE E.ESTADO = 1 AND B.ESTADO = 1 AND BR.ID_RED_SOCIAL = 1 AND PW.ELIMINADO = 0
                AND E.ID_EMPRESA = ?
                ${id_bot ? 'AND B.ID_BOT = ?' : ''}
                ${estado !== undefined && estado !== '' ? 'AND PW.ESTADO = ?' : ''}
            GROUP BY PW.ID_PLANTILLA
            ORDER BY PC.CATEGORIA, PW.NOMBRE
        `;
        
        const params = [id_empresa];
        if (id_bot) params.push(id_bot);
        if (estado !== undefined && estado !== '') params.push(parseInt(estado));
        
        const [rows] = await dbDestino.query(query, params);
        
        // Formatear para Excel
        const data = rows.map(r => ({
            'ID Plantilla': r.ID_PLANTILLA,
            'ID Interno': r.ID_INTERNO,
            'Nombre': r.NOMBRE_PLANTILLA,
            'Categoría': r.CATEGORIA,
            'Estado': r.ESTADO === 1 ? 'Activo' : 'Inactivo',
            'Estado Gupshup': ['DELETED', 'APPROVED', 'PENDING', 'REJECTED', 'FAILED'][r.ESTADO_GUPSHUP] || 'UNKNOWN',
            'Tipo': r.TIPO_PLANTILLA === 1 ? 'CAROUSEL' : 'ESTANDAR',
            'Media': r.MEDIA || '',
            'URL': r.URL || '',
            'Pantallas': r.PANTALLAS || '',
            'Empresa': r.EMPRESA,
            'Bot': r.BOT,
            'Total Botones': r.TOTAL_BOTONES,
            'Total Parámetros': r.TOTAL_PARAMETROS,
            'Mensaje': r.MENSAJE
        }));
        
        res.json({ data, total: data.length });
        
    } catch (err) {
        console.error('Error al exportar plantillas:', err);
        res.status(500).json({ error: 'Error al exportar plantillas', details: err.message });
    }
});

// 🔹 ACTUALIZAR PLANTILLA (URL, PANTALLAS)
router.put('/api/plantillas-whatsapp/:id', async (req, res) => {
    const { db_key } = req.query;
    const { id } = req.params;
    const { url, pantallas } = req.body;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id) {
        return res.status(400).json({ error: 'id_plantilla requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        
        // Construir query dinámica
        const updates = [];
        const params = [];
        
        if (url !== undefined) {
            updates.push('URL = ?');
            params.push(url);
        }
        if (pantallas !== undefined) {
            updates.push('PANTALLAS = ?');
            params.push(pantallas);
        }
        
        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }
        
        params.push(id);
        
        const query = `UPDATE PLANTILLAS_WHATSAPP SET ${updates.join(', ')} WHERE ID_PLANTILLA = ?`;
        
        await dbDestino.query(query, params);
        
        res.json({ success: true, message: 'Plantilla actualizada correctamente' });
        
    } catch (err) {
        console.error('Error al actualizar plantilla:', err);
        res.status(500).json({ error: 'Error al actualizar plantilla', details: err.message });
    }
});

// 🔹 OBTENER EMPRESAS para selector de plantillas
router.get('/api/empresas-plantillas', async (req, res) => {
    const { db_key } = req.query;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        const [rows] = await dbDestino.query(
            `SELECT E.ID_EMPRESA, E.NOMBRE 
             FROM EMPRESAS E 
             WHERE E.ESTADO = 1 
             ORDER BY E.NOMBRE`
        );
        res.json(rows.map(r => ({ id: r.ID_EMPRESA, nombre: r.NOMBRE })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 🔹 OBTENER BOTS por empresa para selector de plantillas
router.get('/api/bots-plantillas', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_empresa) {
        return res.status(400).json({ error: 'id_empresa requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        const [rows] = await dbDestino.query(
            `SELECT B.ID_BOT, B.DESCRIPCION 
             FROM BOT B 
             WHERE B.ID_EMPRESA = ? AND B.ESTADO = 1 
             ORDER BY B.DESCRIPCION`,
            [id_empresa]
        );
        res.json(rows.map(r => ({ id: r.ID_BOT, nombre: r.DESCRIPCION })));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

cron.schedule('* * * * *', () => {
    const workerPath = path.join(__dirname, '..', '..', '..', 'worker.js');
    const workerProcess = fork(workerPath);

    workerProcess.on('exit', (code) => {
        if (code !== 0) {
            console.error(`Advertencia: El worker finalizo con codigo de error ${code}`);
        }
    });
});

// 🔴 EXPORTAR EL ROUTER y funciones de auditoría
module.exports = { router, initAuditoriaSkills };