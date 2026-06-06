const express = require('express');
const router = express.Router();

// Pools de conexión (se inicializan desde index.js)
let pools = null;

function initPools(p) {
    pools = p;
}

// ==========================================================================
// HISTORIAL DE ESTADOS - Gestión de estados de usuarios
// ==========================================================================

// 🔹 ESTADOS ACTUALES DE USUARIOS
router.get('/api/usuarios/estados-actuales', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    if (!db_key || !id_empresa) {
        return res.status(400).json({ error: "Faltan parametros db_key o id_empresa" });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

    try {
        // Obtener IDs de estados de la empresa primero
        const [estadosEmp] = await pool.query(
            `SELECT ID_ESTADO FROM ESTADOS WHERE ID_EMPRESA = ? AND ELIMINADO = 0`,
            [id_empresa]
        );
        if (estadosEmp.length === 0) { return res.json({}); }
        const idsEstados = estadosEmp.map(r => r.ID_ESTADO);
        const placeholders = idsEstados.map(() => '?').join(',');

        // Estado actual: filtrar por IDs de estados conocidos, sesión abierta
        const [rows] = await pool.query(`
            SELECT eu.ID_USUARIO, e.ID_ESTADO, e.NOMBRE, e.COLOR_PATH, e.ACTIVO, e.PAUSA, eu.MOVIL, eu.HORA_INICIO
            FROM ESTADOS_USUARIOS eu
            INNER JOIN ESTADOS e ON eu.ID_ESTADO = e.ID_ESTADO
            WHERE eu.ID_ESTADO IN (${placeholders})
              AND eu.HORA_FIN IS NULL
        `, idsEstados);

        // Mapa { id_usuario: { id_estado, nombre, color, activo, pausa, movil } }
        // Si hay duplicados por usuario, quedarse con el de HORA_INICIO más reciente
        const toBoolEst = (val) => {
            if (val === null || val === undefined) return false;
            if (Buffer.isBuffer(val)) return val[0] === 1;
            return val === 1 || val === '1' || val === true;
        };
        const mapaRaw = {};
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

// 🔹 ESTADOS DISPONIBLES DE LA EMPRESA
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

// 🔹 HISTORIAL DE ESTADOS DE USUARIOS
router.get('/api/usuarios/historial-estados', async (req, res) => {
    const { db_key, fecha_inicio, fecha_fin, id_empresa, perfil, estado, id_usuario, skills, bot_redes } = req.query;
    
    if (!db_key || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: "Faltan parametros db_key, fecha_inicio o fecha_fin" });
    }
    
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: "Base de datos no configurada" });

    try {
        // Verificar si existe base de datos de seguridad
        const dbKeySeg = (db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10') ? 'db_10' : 'db_9';
        const poolSeg = pools[dbKeySeg];
        
        // Query base: historial de estados con info de usuarios
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
        
        if (historialRows.length === 0) {
            return res.json([]);
        }
        
        // Obtener IDs de usuarios para consultar permisos
        const idsUsuarios = [...new Set(historialRows.map(r => r.ID_USUARIO))];
        
        // Consultar skills de los usuarios
        let usuariosSkillsMap = {};
        const [skillsRows] = await pool.query(`
            SELECT pus.ID_USUARIO, s.NOMBRE_SKILL
            FROM PERMISOS_USUARIOS_SKILLS pus
            INNER JOIN SKILLS s ON pus.ID_SKILL = s.ID_SKILL
            WHERE pus.ID_USUARIO IN (${idsUsuarios.map(() => '?').join(',')})
            AND s.ESTADO = 1
        `, idsUsuarios);
        
        for (const r of skillsRows) {
            if (!usuariosSkillsMap[r.ID_USUARIO]) usuariosSkillsMap[r.ID_USUARIO] = [];
            usuariosSkillsMap[r.ID_USUARIO].push(r.NOMBRE_SKILL);
        }
        
        // Si hay filtro de skills, filtrar usuarios
        let idsUsuariosFiltrados = idsUsuarios;
        if (skills && skills !== '') {
            const skillsFiltro = skills.split(',').map(s => s.trim().toLowerCase());
            idsUsuariosFiltrados = idsUsuarios.filter(id => {
                const userSkills = usuariosSkillsMap[id] || [];
                return skillsFiltro.some(f => userSkills.some(us => us.toLowerCase().includes(f)));
            });
        }
        
        // Consultar bot_redes de los usuarios
        let usuariosBotRedesMap = {};
        const [botRedesRows] = await pool.query(`
            SELECT pubr.ID_USUARIO, br.ID_BOT_REDES, b.DESCRIPCION as NOMBRE_BOT, rs.NOMBRE as NOMBRE_RED_SOCIAL
            FROM PERMISOS_USUARIOS_BOT_REDES pubr
            INNER JOIN BOT_REDES br ON pubr.ID_BOT_REDES = br.ID_BOT_REDES
            INNER JOIN BOT b ON br.ID_BOT = b.ID_BOT
            INNER JOIN REDES_SOCIALES rs ON br.ID_RED_SOCIAL = rs.ID_RED_SOCIAL
            WHERE pubr.ID_USUARIO IN (${idsUsuarios.map(() => '?').join(',')})
            AND br.ESTADO = 1
        `, idsUsuarios);
        
        for (const r of botRedesRows) {
            if (!usuariosBotRedesMap[r.ID_USUARIO]) usuariosBotRedesMap[r.ID_USUARIO] = [];
            usuariosBotRedesMap[r.ID_USUARIO].push(`${r.NOMBRE_BOT} (${r.NOMBRE_RED_SOCIAL})`);
        }
        
        // Si hay filtro de bot_redes, aplicar filtro adicional
        if (bot_redes && bot_redes !== '') {
            const botRedesFiltro = bot_redes.split(',').map(s => s.trim().toLowerCase());
            idsUsuariosFiltrados = idsUsuariosFiltrados.filter(id => {
                const userBotRedes = usuariosBotRedesMap[id] || [];
                return botRedesFiltro.some(f => userBotRedes.some(ub => ub.toLowerCase().includes(f)));
            });
        }
        
        // Obtener información de seguridad (perfiles) si está disponible
        let usuariosPerfilesMap = {};
        if (poolSeg) {
            try {
                const nombresUsuarios = historialRows.map(r => r.LOGIN_USUARIO);
                const [segRows] = await poolSeg.query(`
                    SELECT U.USUARIO, GROUP_CONCAT(DISTINCT P.NOMBRE ORDER BY P.NOMBRE SEPARATOR ', ') AS PERFILES
                    FROM SEG_USUARIO U
                    LEFT JOIN SEG_PERMISO_USUARIO PU ON U.SECUSUARIOID = PU.SECUSUARIOID AND PU.SECPERFILID_PERMISO IS NOT NULL
                    LEFT JOIN SEG_PERFIL P ON PU.SECPERFILID_PERMISO = P.SECPERFILID
                    WHERE U.USUARIO IN (${nombresUsuarios.map(() => '?').join(',')})
                    GROUP BY U.USUARIO
                `, nombresUsuarios);
                
                for (const r of segRows) {
                    usuariosPerfilesMap[r.USUARIO] = r.PERFILES;
                }
            } catch (segErr) {
                console.log('No se pudo obtener info de seguridad:', segErr.message);
            }
        }
        
        // Filtrar por perfil si se especificó
        if (perfil && perfil !== '' && poolSeg) {
            const perfilLower = perfil.toLowerCase();
            idsUsuariosFiltrados = idsUsuariosFiltrados.filter(id => {
                const row = historialRows.find(r => r.ID_USUARIO === id);
                if (!row) return false;
                const perfilesUsuario = (usuariosPerfilesMap[row.LOGIN_USUARIO] || '').toLowerCase();
                return perfilesUsuario.includes(perfilLower);
            });
        }
        
        // Filtrar historialRows por los usuarios que pasaron todos los filtros
        const historialFiltrado = historialRows.filter(r => idsUsuariosFiltrados.includes(r.ID_USUARIO));
        
        // Enriquecer datos
        const resultado = historialFiltrado.map(r => ({
            ...r,
            PERFILES: usuariosPerfilesMap[r.LOGIN_USUARIO] || null,
            SKILLS: usuariosSkillsMap[r.ID_USUARIO] || [],
            BOT_REDES: usuariosBotRedesMap[r.ID_USUARIO] || []
        }));
        
        res.json(resultado);
    } catch (err) {
        console.error("Error al consultar historial de estados:", err);
        res.status(500).json({ error: "Error al consultar historial de estados", detalle: err.message });
    }
});

// Exportar el router y la función de inicialización
module.exports = { router, initPools };
