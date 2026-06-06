const express = require('express');
const router = express.Router();

// Pools de conexión (se inicializan desde index.js)
let pools = null;

function initPools(p) {
    pools = p;
}

// ==========================================================================
// USUARIOS QRM - Módulo dedicado para gestión de usuarios QRM
// Separado de aSkills.js para mantener responsabilidad única
// ==========================================================================

// 🔹 USUARIOS QRM - Obtener sociedades disponibles basadas en permisos del usuario
router.get('/api/usuarios-qrm/config', async (req, res) => {
    const { db_key } = req.query;

    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }

    try {
        const dbDestino = pools[db_key];

        // Obtener info del usuario logueado (del sistema)
        const usuarioLogueado = req.session?.usuario || 'sistema';

        // Buscar ID_USUARIO del logueado
        const [usuarios] = await dbDestino.query(
            'SELECT ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = ? LIMIT 1',
            [usuarioLogueado]
        );

        if (usuarios.length === 0) {
            return res.json({ data: [] });
        }

        const idUsuario = usuarios[0].ID_USUARIO;

        // Obtener sociedades disponibles basadas en permisos de BOT_REDES
        // Lógica: PERMISOS_USUARIOS_BOT_REDES -> BOT_REDES (ID_BOT) -> GQ_QRM_BOT_SOCIEDAD (SOCIEDAD+MARCAS)
        const query = `
            SELECT DISTINCT
                QB.ID_BOT_SOCIEDAD,
                QS.SOCIEDAD,
                QM.MARCA,
                QB.ID_BOT,
                B.DESCRIPCION as NOMBRE_BOT
            FROM PERMISOS_USUARIOS_BOT_REDES PUBR
            INNER JOIN BOT_REDES BR ON PUBR.ID_BOT_REDES = BR.ID_BOT_REDES
            INNER JOIN BOT B ON BR.ID_BOT = B.ID_BOT
            INNER JOIN GQ_QRM_BOT_SOCIEDAD QB ON B.ID_BOT = QB.ID_BOT
            INNER JOIN GQ_QRM_SOCIEDADES QS ON QB.ID_SOCIEDAD = QS.ID_SOCIEDAD
            INNER JOIN GQ_QRM_MARCAS QM ON QB.ID_MARCA = QM.ID_MARCA
            WHERE PUBR.ID_USUARIO = ?
            ORDER BY QS.SOCIEDAD, QM.MARCA
        `;

        const [rows] = await dbDestino.query(query, [idUsuario]);
        res.json({ data: rows });

    } catch (err) {
        console.error('Error al obtener config QRM:', err);
        res.status(500).json({ error: 'Error al obtener configuración', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Obtener BOTs disponibles según permisos del usuario
// Si se proporciona id_usuario_target, se usan los permisos de ese usuario
router.get('/api/usuarios-qrm/bots', async (req, res) => {
    const { db_key, id_usuario_target } = req.query;

    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }

    try {
        const dbDestino = pools[db_key];
        
        // Determinar qué usuario usar: el target (si se proporciona) o el logueado
        let idUsuario;
        
        if (id_usuario_target) {
            // Usar el ID del usuario target directamente
            idUsuario = parseInt(id_usuario_target);
        } else {
            // Buscar ID_USUARIO del logueado
            const usuarioLogueado = req.session?.usuario || 'sistema';
            const [usuarios] = await dbDestino.query(
                'SELECT ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = ? LIMIT 1',
                [usuarioLogueado]
            );
            idUsuario = usuarios.length > 0 ? usuarios[0].ID_USUARIO : null;
        }

        let query;
        let params = [];

        if (!idUsuario) {
            // Sin filtro de permisos, mostrar todos los bots con configuración QRM
            query = `
                SELECT DISTINCT
                    B.ID_BOT,
                    B.DESCRIPCION as NOMBRE_BOT
                FROM BOT B
                INNER JOIN GQ_QRM_BOT_SOCIEDAD QB ON B.ID_BOT = QB.ID_BOT
                WHERE B.ESTADO = 1
                ORDER BY B.DESCRIPCION
            `;
        } else {
            // Obtener BOTs a los que tiene permiso el usuario
            query = `
                SELECT DISTINCT
                    B.ID_BOT,
                    B.DESCRIPCION as NOMBRE_BOT
                FROM PERMISOS_USUARIOS_BOT_REDES PUBR
                INNER JOIN BOT_REDES BR ON PUBR.ID_BOT_REDES = BR.ID_BOT_REDES
                INNER JOIN BOT B ON BR.ID_BOT = B.ID_BOT
                WHERE PUBR.ID_USUARIO = ? AND B.ESTADO = 1
                ORDER BY B.DESCRIPCION
            `;
            params = [idUsuario];
        }

        const [rows] = await dbDestino.query(query, params);
        res.json({ data: rows });

    } catch (err) {
        console.error('Error al obtener BOTs:', err);
        res.status(500).json({ error: 'Error al obtener BOTs', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Obtener canales (BOT_REDES) por BOT
// Si se proporciona id_usuario_target, se usan los permisos de ese usuario
router.get('/api/usuarios-qrm/canales', async (req, res) => {
    const { db_key, id_bot, id_usuario_target } = req.query;

    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_bot) {
        return res.status(400).json({ error: 'id_bot requerido' });
    }

    try {
        const dbDestino = pools[db_key];
        
        // Determinar qué usuario usar: el target (si se proporciona) o el logueado
        let idUsuario;
        
        if (id_usuario_target) {
            // Usar el ID del usuario target directamente
            idUsuario = parseInt(id_usuario_target);
        } else {
            // Buscar ID_USUARIO del logueado
            const usuarioLogueado = req.session?.usuario || 'sistema';
            const [usuarios] = await dbDestino.query(
                'SELECT ID_USUARIO FROM USUARIOS WHERE NOMBRE_USUARIO = ? LIMIT 1',
                [usuarioLogueado]
            );
            idUsuario = usuarios.length > 0 ? usuarios[0].ID_USUARIO : null;
        }

        let query;
        let params = [id_bot];

        if (!idUsuario) {
            // Sin filtro de permisos
            query = `
                SELECT
                    BR.ID_BOT_REDES,
                    RS.NOMBRE as NOMBRE_RED_SOCIAL,
                    P.NOMBRE as NOMBRE_PAIS,
                    BR.ESTADO
                FROM BOT_REDES BR
                INNER JOIN REDES_SOCIALES RS ON BR.ID_RED_SOCIAL = RS.ID_RED_SOCIAL
                LEFT JOIN PAISES P ON BR.ID_PAIS = P.ID_PAIS
                WHERE BR.ID_BOT = ? AND BR.ESTADO = 1
                ORDER BY RS.NOMBRE, P.NOMBRE
            `;
        } else {
            // Solo canales a los que tiene permiso el usuario
            query = `
                SELECT
                    BR.ID_BOT_REDES,
                    RS.NOMBRE as NOMBRE_RED_SOCIAL,
                    P.NOMBRE as NOMBRE_PAIS,
                    BR.ESTADO
                FROM PERMISOS_USUARIOS_BOT_REDES PUBR
                INNER JOIN BOT_REDES BR ON PUBR.ID_BOT_REDES = BR.ID_BOT_REDES
                INNER JOIN REDES_SOCIALES RS ON BR.ID_RED_SOCIAL = RS.ID_RED_SOCIAL
                LEFT JOIN PAISES P ON BR.ID_PAIS = P.ID_PAIS
                WHERE PUBR.ID_USUARIO = ? AND BR.ID_BOT = ? AND BR.ESTADO = 1
                ORDER BY RS.NOMBRE, P.NOMBRE
            `;
            params = [idUsuario, id_bot];
        }

        const [rows] = await dbDestino.query(query, params);
        res.json({ data: rows });

    } catch (err) {
        console.error('Error al obtener canales:', err);
        res.status(500).json({ error: 'Error al obtener canales', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Obtener sociedades/marcas por BOT
router.get('/api/usuarios-qrm/sociedades', async (req, res) => {
    const { db_key, id_bot } = req.query;

    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_bot) {
        return res.status(400).json({ error: 'id_bot requerido' });
    }

    try {
        const dbDestino = pools[db_key];

        const query = `
            SELECT
                QB.ID_BOT_SOCIEDAD,
                QS.SOCIEDAD,
                QM.MARCA,
                QB.ID_BOT
            FROM GQ_QRM_BOT_SOCIEDAD QB
            INNER JOIN GQ_QRM_SOCIEDADES QS ON QB.ID_SOCIEDAD = QS.ID_SOCIEDAD
            INNER JOIN GQ_QRM_MARCAS QM ON QB.ID_MARCA = QM.ID_MARCA
            WHERE QB.ID_BOT = ?
            ORDER BY QS.SOCIEDAD, QM.MARCA
        `;

        const [rows] = await dbDestino.query(query, [id_bot]);
        res.json({ data: rows });

    } catch (err) {
        console.error('Error al obtener sociedades:', err);
        res.status(500).json({ error: 'Error al obtener sociedades', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Obtener usuarios de una empresa
router.get('/api/usuarios-qrm', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_empresa) {
        return res.status(400).json({ error: 'id_empresa requerido' });
    }
    
    // Solo permitir S2
    if (db_key !== 'db_2') {
        return res.status(403).json({ error: 'Solo disponible para S2' });
    }
    
    try {
        const dbDestino = pools[db_key];
        
        // Query simplificada: primero solo usuarios
        const queryUsuarios = `
            SELECT 
                U.ID_USUARIO,
                U.NOMBRE_USUARIO,
                U.ESTADO,
                U.NOMBRE,
                U.APELLIDO
            FROM USUARIOS U
            WHERE U.ID_EMPRESA = ? AND U.ESTADO = 1
            ORDER BY U.NOMBRE_USUARIO
        `;
        
        const [usuarios] = await dbDestino.query(queryUsuarios, [id_empresa]);
        
        // Query de configuraciones QRM
        const queryConfigs = `
            SELECT 
                QIU.ID_USUARIO,
                QIU.ID_INFO_USUARIO,
                QIU.ID_BOT_SOCIEDAD,
                QIU.ID_DEPARTAMENTO,
                QIU.ID_SUCURSAL,
                QIU.ID_VENDEDOR,
                QIU.USUARIO_QRM,
                QS.SOCIEDAD,
                QM.MARCA
            FROM GQ_QRM_INFO_USUARIO QIU
            LEFT JOIN GQ_QRM_BOT_SOCIEDAD QB ON QIU.ID_BOT_SOCIEDAD = QB.ID_BOT_SOCIEDAD
            LEFT JOIN GQ_QRM_SOCIEDADES QS ON QB.ID_SOCIEDAD = QS.ID_SOCIEDAD
            LEFT JOIN GQ_QRM_MARCAS QM ON QB.ID_MARCA = QM.ID_MARCA
            WHERE QIU.ID_USUARIO IN (SELECT ID_USUARIO FROM USUARIOS WHERE ID_EMPRESA = ? AND ESTADO = 1)
              AND QIU.ELIMINADO = 0
        `;
        
        const [configs] = await dbDestino.query(queryConfigs, [id_empresa]);
        
        // Combinar datos
        const rows = [];
        usuarios.forEach(u => {
            const userConfigs = configs.filter(c => c.ID_USUARIO === u.ID_USUARIO);
            if (userConfigs.length === 0) {
                // Usuario sin config
                rows.push({
                    ...u,
                    ID_INFO_USUARIO: null,
                    ID_BOT_SOCIEDAD: null,
                    ID_DEPARTAMENTO: null,
                    ID_SUCURSAL: null,
                    ID_VENDEDOR: null,
                    USUARIO_QRM: null,
                    SOCIEDAD: null,
                    MARCA: null
                });
            } else {
                // Una fila por cada config
                userConfigs.forEach(c => {
                    rows.push({
                        ...u,
                        ID_INFO_USUARIO: c.ID_INFO_USUARIO,
                        ID_BOT_SOCIEDAD: c.ID_BOT_SOCIEDAD,
                        ID_DEPARTAMENTO: c.ID_DEPARTAMENTO,
                        ID_SUCURSAL: c.ID_SUCURSAL,
                        ID_VENDEDOR: c.ID_VENDEDOR,
                        USUARIO_QRM: c.USUARIO_QRM,
                        SOCIEDAD: c.SOCIEDAD,
                        MARCA: c.MARCA
                    });
                });
            }
        });
        
        res.json({ data: rows, total: rows.length });
        
    } catch (err) {
        console.error('Error al obtener usuarios QRM:', err);
        res.status(500).json({ error: 'Error al obtener usuarios', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Guardar/Actualizar configuración
router.post('/api/usuarios-qrm', async (req, res) => {
    const { db_key } = req.query;
    const { id_usuario, id_bot_sociedad, id_departamento, id_sucursal, id_vendedor, usuario_qrm } = req.body;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_usuario || !id_bot_sociedad) {
        return res.status(400).json({ error: 'id_usuario e id_bot_sociedad requeridos' });
    }
    
    try {
        const dbDestino = pools[db_key];
        const usuarioLogueado = 'alex.carrera';
        
        // Verificar si ya existe configuración para este usuario
        const [existente] = await dbDestino.query(
            'SELECT ID_INFO_USUARIO FROM GQ_QRM_INFO_USUARIO WHERE ID_USUARIO = ? AND ID_BOT_SOCIEDAD = ? AND ELIMINADO = 0',
            [id_usuario, id_bot_sociedad]
        );
        
        if (existente.length > 0) {
            // Actualizar
            await dbDestino.query(
                `UPDATE GQ_QRM_INFO_USUARIO 
                 SET ID_DEPARTAMENTO = ?, ID_SUCURSAL = ?, ID_VENDEDOR = ?, USUARIO_QRM = ?, 
                     MODIFICADO_POR = ?, MODIFICADO_EL = NOW()
                 WHERE ID_INFO_USUARIO = ?`,
                [id_departamento || 0, id_sucursal || 0, id_vendedor || 0, usuario_qrm || '', usuarioLogueado, existente[0].ID_INFO_USUARIO]
            );
        } else {
            // Insertar nuevo
            await dbDestino.query(
                `INSERT INTO GQ_QRM_INFO_USUARIO 
                 (ID_USUARIO, ID_BOT_SOCIEDAD, ID_DEPARTAMENTO, ID_SUCURSAL, ID_VENDEDOR, USUARIO_QRM, ELIMINADO, CREADO_POR, CREADO_EL)
                 VALUES (?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
                [id_usuario, id_bot_sociedad, id_departamento || 0, id_sucursal || 0, id_vendedor || 0, usuario_qrm || '', usuarioLogueado]
            );
        }
        
        res.json({ success: true, message: 'Configuración guardada' });
        
    } catch (err) {
        console.error('Error al guardar config QRM:', err);
        res.status(500).json({ error: 'Error al guardar configuración', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Configuración masiva
router.post('/api/usuarios-qrm/masivo', async (req, res) => {
    const { db_key } = req.query;
    const { ids_usuario, id_bot_sociedad, id_departamento, id_sucursal, id_vendedor, usuario_qrm } = req.body;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!ids_usuario || !Array.isArray(ids_usuario) || ids_usuario.length === 0) {
        return res.status(400).json({ error: 'ids_usuario requerido (array)' });
    }
    if (!id_bot_sociedad) {
        return res.status(400).json({ error: 'id_bot_sociedad requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        const usuarioLogueado = 'alex.carrera';
        
        let actualizados = 0;
        let insertados = 0;
        
        for (const id_usuario of ids_usuario) {
            // Verificar si ya existe
            const [existente] = await dbDestino.query(
                'SELECT ID_INFO_USUARIO FROM GQ_QRM_INFO_USUARIO WHERE ID_USUARIO = ? AND ID_BOT_SOCIEDAD = ? AND ELIMINADO = 0',
                [id_usuario, id_bot_sociedad]
            );
            
            if (existente.length > 0) {
                await dbDestino.query(
                    `UPDATE GQ_QRM_INFO_USUARIO 
                     SET ID_DEPARTAMENTO = ?, ID_SUCURSAL = ?, ID_VENDEDOR = ?, USUARIO_QRM = ?, 
                         MODIFICADO_POR = ?, MODIFICADO_EL = NOW()
                     WHERE ID_INFO_USUARIO = ?`,
                    [id_departamento || 0, id_sucursal || 0, id_vendedor || 0, usuario_qrm || '', usuarioLogueado, existente[0].ID_INFO_USUARIO]
                );
                actualizados++;
            } else {
                await dbDestino.query(
                    `INSERT INTO GQ_QRM_INFO_USUARIO 
                     (ID_USUARIO, ID_BOT_SOCIEDAD, ID_DEPARTAMENTO, ID_SUCURSAL, ID_VENDEDOR, USUARIO_QRM, ELIMINADO, CREADO_POR, CREADO_EL)
                     VALUES (?, ?, ?, ?, ?, ?, 0, ?, NOW())`,
                    [id_usuario, id_bot_sociedad, id_departamento || 0, id_sucursal || 0, id_vendedor || 0, usuario_qrm || '', usuarioLogueado]
                );
                insertados++;
            }
        }
        
        res.json({ success: true, message: `${insertados} insertados, ${actualizados} actualizados` });
        
    } catch (err) {
        console.error('Error al guardar masivo QRM:', err);
        res.status(500).json({ error: 'Error al guardar configuración', details: err.message });
    }
});

// 🔹 USUARIOS QRM - Eliminar configuración (soft delete: ELIMINADO = 1)
router.delete('/api/usuarios-qrm', async (req, res) => {
    const { db_key, id_info_usuario } = req.query;
    
    if (!db_key || !pools[db_key]) {
        return res.status(400).json({ error: 'db_key requerido' });
    }
    if (!id_info_usuario) {
        return res.status(400).json({ error: 'id_info_usuario requerido' });
    }
    
    try {
        const dbDestino = pools[db_key];
        const usuarioLogueado = 'alex.carrera';
        
        await dbDestino.query(
            `UPDATE GQ_QRM_INFO_USUARIO 
             SET ELIMINADO = 1, MODIFICADO_POR = ?, MODIFICADO_EL = NOW()
             WHERE ID_INFO_USUARIO = ?`,
            [usuarioLogueado, id_info_usuario]
        );
        
        res.json({ success: true, message: 'Configuración eliminada' });
        
    } catch (err) {
        console.error('Error al eliminar config QRM:', err);
        res.status(500).json({ error: 'Error al eliminar configuración', details: err.message });
    }
});

// Exportar el router y la función de inicialización
module.exports = { router, initPools };
