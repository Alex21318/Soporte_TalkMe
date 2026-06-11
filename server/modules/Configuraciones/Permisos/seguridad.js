const express = require('express');
const router = express.Router();
const pools = require('../db');
const { authMiddleware } = require('../auth');

// Referencia al módulo de auditoría (se inicializa desde index.js)
let auditoriaModulo = null;

function initAuditoriaSeguridad(auditoria) {
    auditoriaModulo = auditoria;
}

// Helper: registrar auditoría
async function registrarAuditoriaSeguridad(datos) {
    try {
        if (auditoriaModulo && auditoriaModulo.registrarLogInterno) {
            return await auditoriaModulo.registrarLogInterno(datos);
        }
    } catch (err) {
        console.error('[Auditoria Seguridad] Error:', err.message);
    }
    return null;
}

// Helper: obtener pool de seguridad según db_key
const getPoolSeg = (db_key) => {
    const esFicohsa = db_key === 'db_6' || db_key === 'db_7' || db_key === 'db_8' || db_key === 'db_10';
    const dbSeg = esFicohsa ? 'db_10' : 'db_9';
    return { pool: pools[dbSeg], dbSeg };
};

// Helper: construir árbol jerárquico de elementos
const buildTree = (elementos, permisoMap) => {
    const map = {};
    elementos.forEach(e => {
        map[e.SECELEMENTOID] = {
            id: e.SECELEMENTOID,
            etiqueta: (e.ETIQUETA || e.NOMBRE || String(e.SECELEMENTOID)) || '(sin etiqueta)',
            parentId: e.SECELEMENTOID_PADRE || null,
            permiso: permisoMap[e.SECELEMENTOID] || null,
            hijos: []
        };
    });
    const roots = [];
    Object.values(map).forEach(node => {
        if (node.parentId && map[node.parentId]) {
            map[node.parentId].hijos.push(node);
        } else {
            roots.push(node);
        }
    });
    const sortNodes = (nodes) => {
        nodes.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta));
        nodes.forEach(n => sortNodes(n.hijos));
    };
    sortNodes(roots);
    return roots;
};

// Sort comparator dentro de buildTree usa node.orden — definir helper sin orden
// (ordena alfabéticamente)

// ==========================================================================
// 1. GET /api/seguridad/empresas — Empresas del módulo de seguridad
// ==========================================================================
router.get('/api/seguridad/empresas', async (req, res) => {
    const { db_key } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });
    try {
        const [rows] = await pool.query(
            'SELECT SECEMPRESAID, NOMBRE FROM SEG_EMPRESA ORDER BY NOMBRE'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 2. GET /api/seguridad/perfiles-lista — Perfiles del módulo de seguridad
// ==========================================================================
router.get('/api/seguridad/perfiles-lista', async (req, res) => {
    const { db_key } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });
    try {
        const [rows] = await pool.query(
            'SELECT SECPERFILID, NOMBRE FROM SEG_PERFIL ORDER BY NOMBRE'
        );
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 2b. GET /api/seguridad/perfiles-por-empresa — Perfiles que tienen usuarios en la empresa
// ==========================================================================
router.get('/api/seguridad/perfiles-por-empresa', async (req, res) => {
    const { db_key, secempresaid } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    if (!secempresaid) return res.status(400).json({ error: 'Falta secempresaid' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT P.SECPERFILID, P.NOMBRE
            FROM SEG_PERFIL P
            JOIN SEG_PERMISO_USUARIO PU ON PU.SECPERFILID_PERMISO = P.SECPERFILID
            JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = PU.SECUSUARIOID
            WHERE UE.SECEMPRESAID = ?
            ORDER BY P.NOMBRE
        `, [parseInt(secempresaid)]);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 3. GET /api/seguridad/elementos-lista — Todos los elementos (pantallas)
// ==========================================================================
router.get('/api/seguridad/elementos-lista', async (req, res) => {
    const { db_key } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });
    try {
        const [rows] = await pool.query(`
            SELECT E.SECELEMENTOID,
                   COALESCE(E.ETIQUETA, E.NOMBRE, CAST(E.SECELEMENTOID AS CHAR)) AS ETIQUETA,
                   E.SECELEMENTOID_PADRE,
                   E.SECAPLICACIONID,
                   COALESCE(A.NOMBRE, CAST(E.SECAPLICACIONID AS CHAR)) AS APLICACION_NOMBRE
            FROM SEG_ELEMENTO E
            LEFT JOIN SEG_APLICACION A ON A.SECAPLICACIONID = E.SECAPLICACIONID
            ORDER BY A.NOMBRE, E.ETIQUETA ASC
        `);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 3b. GET /api/seguridad/elementos-por-empresa — Elementos de las aplicaciones de los perfiles de la empresa
// ==========================================================================
router.get('/api/seguridad/elementos-por-empresa', async (req, res) => {
    const { db_key, secempresaid } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    if (!secempresaid) return res.status(400).json({ error: 'Falta secempresaid' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });
    try {
        // Obtener aplicaciones de los perfiles que tienen usuarios en esta empresa
        const [appRows] = await pool.query(`
            SELECT DISTINCT P.SECAPLICACIONID
            FROM SEG_PERFIL P
            JOIN SEG_PERMISO_USUARIO PU ON PU.SECPERFILID_PERMISO = P.SECPERFILID
            JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = PU.SECUSUARIOID
            WHERE UE.SECEMPRESAID = ? AND P.SECAPLICACIONID IS NOT NULL
        `, [parseInt(secempresaid)]);

        const aplicaciones = appRows.map(r => r.SECAPLICACIONID);
        if (aplicaciones.length === 0) return res.json([]);

        const placeholders = aplicaciones.map(() => '?').join(',');
        // Obtener elementos con su aplicación
        const [rows] = await pool.query(`
            SELECT E.SECELEMENTOID,
                   COALESCE(E.ETIQUETA, E.NOMBRE, CAST(E.SECELEMENTOID AS CHAR)) AS ETIQUETA,
                   E.SECELEMENTOID_PADRE,
                   E.SECAPLICACIONID,
                   COALESCE(A.NOMBRE, CAST(E.SECAPLICACIONID AS CHAR)) AS APLICACION_NOMBRE
            FROM SEG_ELEMENTO E
            LEFT JOIN SEG_APLICACION A ON A.SECAPLICACIONID = E.SECAPLICACIONID
            WHERE E.SECAPLICACIONID IN (${placeholders})
            ORDER BY A.NOMBRE, E.ETIQUETA ASC
        `, aplicaciones);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 4. GET /api/seguridad/permisos-usuarios — Usuarios con sus permisos completos
//    Devuelve para cada usuario:
//    - perfiles asignados (con árbol de permisos del perfil)
//    - permisos manuales (con árbol)
//    - mapa plano: permisoMap[secelementoid] = 'HABILITADO_PERFIL'|'HABILITADO_MANUAL'|'DENEGADO_MANUAL'
// ==========================================================================
router.get('/api/seguridad/permisos-usuarios', async (req, res) => {
    const { db_key, secempresaid, estado } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    try {
        // 1. Cargar todos los elementos una sola vez
        const [elementos] = await pool.query(`
            SELECT SECELEMENTOID,
                   COALESCE(ETIQUETA, NOMBRE, CAST(SECELEMENTOID AS CHAR)) AS ETIQUETA,
                   SECELEMENTOID_PADRE
            FROM SEG_ELEMENTO
            ORDER BY ETIQUETA ASC
        `);

        // 2. Construir WHERE de usuarios
        let whereUsuario = `U.ESTADO != 'BAJA'`;
        const paramsU = [];
        if (estado) {
            if (estado === 'BLOQUEADO') {
                whereUsuario += ` AND U.BLOQUEADO = 1`;
            } else {
                whereUsuario += ` AND U.ESTADO = ?`;
                paramsU.push(estado);
            }
        }
        if (secempresaid) { whereUsuario += ` AND UE.SECEMPRESAID = ?`; paramsU.push(secempresaid); }

        const joinEmpresa = secempresaid
            ? `JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = U.SECUSUARIOID`
            : `LEFT JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = U.SECUSUARIOID`;

        const [usuarios] = await pool.query(`
            SELECT DISTINCT U.SECUSUARIOID, U.USUARIO, U.ESTADO, U.BLOQUEADO
            FROM SEG_USUARIO U
            ${joinEmpresa}
            WHERE ${whereUsuario}
            ORDER BY U.USUARIO
            LIMIT 500
        `, paramsU);

        if (usuarios.length === 0) return res.json([]);

        const usuarioIds = usuarios.map(u => u.SECUSUARIOID);
        const placeholders = usuarioIds.map(() => '?').join(',');

        // 3. Perfiles asignados a cada usuario (SEG_PERMISO_USUARIO con SECPERFILID_PERMISO IS NOT NULL)
        const [permisosPerfilRows] = await pool.query(`
            SELECT PU.SECUSUARIOID, PU.SECPERFILID_PERMISO, P.NOMBRE AS PERFIL_NOMBRE
            FROM SEG_PERMISO_USUARIO PU
            JOIN SEG_PERFIL P ON P.SECPERFILID = PU.SECPERFILID_PERMISO
            WHERE PU.SECUSUARIOID IN (${placeholders})
              AND PU.SECPERFILID_PERMISO IS NOT NULL
        `, usuarioIds);

        // 4. Permisos manuales por usuario (SEG_PERMISO_USUARIO con SECELEMENTOID IS NOT NULL)
        const [permisosManualRows] = await pool.query(`
            SELECT SECUSUARIOID, SECELEMENTOID, PERMISO
            FROM SEG_PERMISO_USUARIO
            WHERE SECUSUARIOID IN (${placeholders})
              AND SECELEMENTOID IS NOT NULL
        `, usuarioIds);

        // 5. Permisos de cada perfil (SEG_PERMISO_PERFIL)
        const perfilIds = [...new Set(permisosPerfilRows.map(r => r.SECPERFILID_PERMISO))];
        let perfilPermMap = {}; // perfilId → Set de secelementoids habilitados
        if (perfilIds.length > 0) {
            const pfPlaceholders = perfilIds.map(() => '?').join(',');
            const [ppRows] = await pool.query(`
                SELECT SECPERFILID, SECELEMENTOID
                FROM SEG_PERMISO_PERFIL
                WHERE SECPERFILID IN (${pfPlaceholders})
            `, perfilIds);
            ppRows.forEach(pp => {
                if (!perfilPermMap[pp.SECPERFILID]) perfilPermMap[pp.SECPERFILID] = new Set();
                perfilPermMap[pp.SECPERFILID].add(pp.SECELEMENTOID);
            });
        }

        // 6. Estructuras por usuario
        const perfilesPorUsuario = {};
        const manualesPorUsuario = {};
        usuarioIds.forEach(id => {
            perfilesPorUsuario[id] = [];
            manualesPorUsuario[id] = { habilitados: new Set(), denegados: new Set() };
        });

        permisosPerfilRows.forEach(r => {
            const arr = perfilesPorUsuario[r.SECUSUARIOID];
            if (arr && !arr.find(p => p.id === r.SECPERFILID_PERMISO)) {
                arr.push({ id: r.SECPERFILID_PERMISO, nombre: r.PERFIL_NOMBRE });
            }
        });

        permisosManualRows.forEach(r => {
            const m = manualesPorUsuario[r.SECUSUARIOID];
            if (!m) return;
            if (r.PERMISO === 'H') m.habilitados.add(r.SECELEMENTOID);
            else if (r.PERMISO === 'D' || r.PERMISO === 'N') m.denegados.add(r.SECELEMENTOID);
        });

        // 7. Construir respuesta para cada usuario
        const resultado = usuarios.map(u => {
            const perfilesInfo = perfilesPorUsuario[u.SECUSUARIOID] || [];
            const manuales = manualesPorUsuario[u.SECUSUARIOID] || { habilitados: new Set(), denegados: new Set() };

            // Unión de elementos habilitados por perfil
            const elemsPerfilSet = new Set();
            perfilesInfo.forEach(p => {
                const elems = perfilPermMap[p.id];
                if (elems) elems.forEach(eid => elemsPerfilSet.add(eid));
            });

            // Mapa plano de permisos efectivos
            const permisos = {};
            elementos.forEach(e => {
                const eid = e.SECELEMENTOID;
                if (manuales.habilitados.has(eid)) {
                    permisos[eid] = 'HABILITADO_MANUAL';
                } else if (manuales.denegados.has(eid)) {
                    permisos[eid] = 'DENEGADO_MANUAL';
                } else if (elemsPerfilSet.has(eid)) {
                    permisos[eid] = 'HABILITADO_PERFIL';
                }
            });

            return {
                secusuarioid: u.SECUSUARIOID,
                usuario: u.USUARIO,
                estado: u.ESTADO,
                bloqueado: u.BLOQUEADO === 1 || u.BLOQUEADO === '1',
                perfiles: perfilesInfo,
                permisos,  // mapa plano: { [secelementoid]: 'HABILITADO_PERFIL'|'HABILITADO_MANUAL'|'DENEGADO_MANUAL' }
            };
        });

        res.json(resultado);
    } catch (err) {
        console.error('[/api/seguridad/permisos-usuarios]', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 5. GET /api/seguridad/arbol-usuario — Árbol completo de UN usuario (lazy load)
// ==========================================================================
router.get('/api/seguridad/arbol-usuario', async (req, res) => {
    const { db_key, secusuarioid } = req.query;
    if (!db_key || !secusuarioid) return res.status(400).json({ error: 'Faltan db_key o secusuarioid' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    const uid = parseInt(secusuarioid);

    try {
        // 1. Perfiles del usuario (con su SECAPLICACIONID)
        const [perfilRows] = await pool.query(`
            SELECT PU.SECPERFILID_PERMISO, P.NOMBRE AS PERFIL_NOMBRE, P.SECAPLICACIONID
            FROM SEG_PERMISO_USUARIO PU
            JOIN SEG_PERFIL P ON P.SECPERFILID = PU.SECPERFILID_PERMISO
            WHERE PU.SECUSUARIOID = ? AND PU.SECPERFILID_PERMISO IS NOT NULL
        `, [uid]);

        // 2. Permisos manuales del usuario
        const [manualRows] = await pool.query(`
            SELECT SECELEMENTOID, PERMISO
            FROM SEG_PERMISO_USUARIO
            WHERE SECUSUARIOID = ? AND SECELEMENTOID IS NOT NULL
        `, [uid]);

        // 3. Aplicaciones de los perfiles del usuario
        const aplicaciones = [...new Set(perfilRows.map(r => r.SECAPLICACIONID).filter(Boolean))];

        // 4. Permisos definidos en SEG_PERMISO_PERFIL (qué elementos habilita cada perfil)
        const perfilIds = [...new Set(perfilRows.map(r => r.SECPERFILID_PERMISO))];
        const elemsPerfilSet = new Set();  // habilitados por perfil (PERMISO='H')
        if (perfilIds.length > 0) {
            const pfp = perfilIds.map(() => '?').join(',');
            const [ppRows] = await pool.query(
                `SELECT SECELEMENTOID, PERMISO FROM SEG_PERMISO_PERFIL WHERE SECPERFILID IN (${pfp})`,
                perfilIds
            );
            ppRows.forEach(pp => {
                if (pp.PERMISO === 'H') elemsPerfilSet.add(pp.SECELEMENTOID);
            });
        }

        const habilitados = new Set();
        const denegados = new Set();
        manualRows.forEach(r => {
            if (r.PERMISO === 'H') habilitados.add(r.SECELEMENTOID);
            else if (r.PERMISO === 'D' || r.PERMISO === 'N') denegados.add(r.SECELEMENTOID);
        });

        // 5. Cargar TODOS los elementos de las aplicaciones del usuario
        //    (todos los perfiles de una misma aplicación comparten el mismo conjunto
        //     de SEG_ELEMENTO; lo que cambia es qué tienen habilitado cada uno)
        let elementos = [];
        if (aplicaciones.length > 0) {
            const ap = aplicaciones.map(() => '?').join(',');
            const [rows] = await pool.query(`
                SELECT SECELEMENTOID,
                       COALESCE(ETIQUETA, NOMBRE, CAST(SECELEMENTOID AS CHAR)) AS ETIQUETA,
                       SECELEMENTOID_PADRE
                FROM SEG_ELEMENTO
                WHERE SECAPLICACIONID IN (${ap})
                ORDER BY ETIQUETA ASC
            `, aplicaciones);
            elementos = rows;
        }

        // 6. Mapa plano de permisos
        const permisos = {};
        elementos.forEach(e => {
            const eid = e.SECELEMENTOID;
            if (habilitados.has(eid)) permisos[eid] = 'HABILITADO_MANUAL';
            else if (denegados.has(eid)) permisos[eid] = 'DENEGADO_MANUAL';
            else if (elemsPerfilSet.has(eid)) permisos[eid] = 'HABILITADO_PERFIL';
        });

        // 7. Árbol
        const permisoMapArbol = {};
        elementos.forEach(e => {
            permisoMapArbol[e.SECELEMENTOID] = permisos[e.SECELEMENTOID] || 'SIN_PERMISO';
        });

        res.json({
            arbol_completo: buildTree(elementos, permisoMapArbol),
            permisos,
        });
    } catch (err) {
        console.error('[/api/seguridad/arbol-usuario]', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 6. POST /api/seguridad/permisos-actualizar — Agregar/quitar permisos
//    Body: { db_key, secusuarioid, cambios: [{ secelementoid, accion }] }
//    accion: 'habilitar' | 'denegar' | 'restaurar'
// ==========================================================================
router.post('/api/seguridad/permisos-actualizar', authMiddleware, async (req, res) => {
    const { db_key, secusuarioid, cambios } = req.body;
    const modificado_por = req.user?.usuario || 'sistema';
    if (!db_key || !secusuarioid || !Array.isArray(cambios) || cambios.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros: db_key, secusuarioid, cambios[]' });
    }
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();

        for (const cambio of cambios) {
            const { secelementoid, accion } = cambio;
            if (!secelementoid) continue;

            if (accion === 'restaurar') {
                // Eliminar registro manual (vuelve a depender solo del perfil)
                await conn.query(
                    `DELETE FROM SEG_PERMISO_USUARIO
                     WHERE SECUSUARIOID = ? AND SECELEMENTOID = ?`,
                    [secusuarioid, secelementoid]
                );
            } else if (accion === 'habilitar' || accion === 'denegar') {
                const permiso = accion === 'habilitar' ? 'H' : 'N';
                // Upsert: si ya existe actualizar, si no insertar
                const [existing] = await conn.query(
                    `SELECT SECPERMISOUSUARIOID FROM SEG_PERMISO_USUARIO
                     WHERE SECUSUARIOID = ? AND SECELEMENTOID = ?`,
                    [secusuarioid, secelementoid]
                );
                if (existing.length > 0) {
                    await conn.query(
                        `UPDATE SEG_PERMISO_USUARIO
                         SET PERMISO = ?, MODIFICADO_EL = NOW(), MODIFICADO_POR = ?
                         WHERE SECUSUARIOID = ? AND SECELEMENTOID = ?`,
                        [permiso, modificado_por, secusuarioid, secelementoid]
                    );
                } else {
                    // Obtener la empresa principal del usuario para insertar SECEMPRESAID
                    const [empresaRows] = await conn.query(
                        `SELECT SECEMPRESAID FROM SEG_USUARIO_EMPRESA
                         WHERE SECUSUARIOID = ?
                         ORDER BY SECEMPRESAID ASC LIMIT 1`,
                        [secusuarioid]
                    );
                    const secempresaid = empresaRows.length > 0 ? empresaRows[0].SECEMPRESAID : null;
                    
                    await conn.query(
                        `INSERT INTO SEG_PERMISO_USUARIO
                         (SECUSUARIOID, SECEMPRESAID, SECELEMENTOID, SECPERFILID_PERMISO, PERMISO, CREADO_POR)
                         VALUES (?, ?, ?, NULL, ?, 'alex.carrera')`,
                        [secusuarioid, secempresaid, secelementoid, permiso]
                    );
                }
            }
        }

        await conn.commit();
        res.json({ ok: true, procesados: cambios.length });
    } catch (err) {
        await conn.rollback();
        console.error('[/api/seguridad/permisos-actualizar]', err);
        res.status(500).json({ error: err.message });
    } finally {
        conn.release();
    }
});

// ==========================================================================
// 7. GET /api/seguridad/usuarios-lista — Lista ligera de usuarios (sin mapa de permisos)
//    Params: db_key, secempresaid?, estado?, perfilid?
// ==========================================================================
router.get('/api/seguridad/usuarios-lista', async (req, res) => {
    const { db_key, secempresaid, estado, perfilid } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Falta db_key' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    try {
        let whereUsuario = `U.ESTADO != 'BAJA'`;
        const params = [];
        if (estado) { whereUsuario += ` AND U.ESTADO = ?`; params.push(estado); }
        if (secempresaid) { whereUsuario += ` AND UE.SECEMPRESAID = ?`; params.push(parseInt(secempresaid)); }

        const joinEmpresa = secempresaid
            ? `JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = U.SECUSUARIOID`
            : `LEFT JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = U.SECUSUARIOID`;

        let sql = `SELECT DISTINCT U.SECUSUARIOID, U.USUARIO, U.ESTADO FROM SEG_USUARIO U ${joinEmpresa} WHERE ${whereUsuario}`;
        if (perfilid) {
            sql += ` AND EXISTS (SELECT 1 FROM SEG_PERMISO_USUARIO PU WHERE PU.SECUSUARIOID = U.SECUSUARIOID AND PU.SECPERFILID_PERMISO = ?)`;
            params.push(parseInt(perfilid));
        }
        sql += ' ORDER BY U.USUARIO';

        const [rows] = await pool.query(sql, params);
        if (!rows.length) return res.json([]);

        const uids = rows.map(r => r.SECUSUARIOID);
        const ph = uids.map(() => '?').join(',');
        const [perfilRows] = await pool.query(`
            SELECT PU.SECUSUARIOID, P.SECPERFILID, P.NOMBRE
            FROM SEG_PERMISO_USUARIO PU
            JOIN SEG_PERFIL P ON P.SECPERFILID = PU.SECPERFILID_PERMISO
            WHERE PU.SECUSUARIOID IN (${ph}) AND PU.SECPERFILID_PERMISO IS NOT NULL
        `, uids);

        const perfilesMap = {};
        perfilRows.forEach(r => {
            if (!perfilesMap[r.SECUSUARIOID]) perfilesMap[r.SECUSUARIOID] = [];
            if (!perfilesMap[r.SECUSUARIOID].some(p => p.id === r.SECPERFILID))
                perfilesMap[r.SECUSUARIOID].push({ id: r.SECPERFILID, nombre: r.NOMBRE });
        });

        res.json(rows.map(r => ({
            secusuarioid: r.SECUSUARIOID,
            usuario: r.USUARIO,
            estado: r.ESTADO,
            perfiles: perfilesMap[r.SECUSUARIOID] || [],
        })));
    } catch (err) {
        console.error('[/api/seguridad/usuarios-lista]', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 8. GET /api/seguridad/usuarios-con-elemento — Usuarios que tienen un elemento concreto
//    Params: db_key, secelementoid, secempresaid?, estado?, perfilid?
// ==========================================================================
router.get('/api/seguridad/usuarios-con-elemento', async (req, res) => {
    const { db_key, secelementoid, secempresaid, estado, perfilid } = req.query;
    if (!db_key || !secelementoid) return res.status(400).json({ error: 'Faltan db_key o secelementoid' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    const eid = parseInt(secelementoid);
    try {
        let whereUsuario = `U.ESTADO != 'BAJA'`;
        const params = [];
        if (estado) { whereUsuario += ` AND U.ESTADO = ?`; params.push(estado); }
        if (secempresaid) { whereUsuario += ` AND UE.SECEMPRESAID = ?`; params.push(parseInt(secempresaid)); }

        const joinEmpresa = secempresaid
            ? `JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = U.SECUSUARIOID`
            : `LEFT JOIN SEG_USUARIO_EMPRESA UE ON UE.SECUSUARIOID = U.SECUSUARIOID`;

        let sql = `
            SELECT DISTINCT U.SECUSUARIOID, U.USUARIO, U.ESTADO
            FROM SEG_USUARIO U
            ${joinEmpresa}
            WHERE ${whereUsuario}
              AND (
                EXISTS (
                    SELECT 1 FROM SEG_PERMISO_USUARIO PUM
                    WHERE PUM.SECUSUARIOID = U.SECUSUARIOID AND PUM.SECELEMENTOID = ? AND PUM.PERMISO = 'H'
                )
                OR (
                    EXISTS (
                        SELECT 1 FROM SEG_PERMISO_USUARIO PUP
                        JOIN SEG_PERMISO_PERFIL PP ON PP.SECPERFILID = PUP.SECPERFILID_PERMISO
                        WHERE PUP.SECUSUARIOID = U.SECUSUARIOID AND PP.SECELEMENTOID = ? AND PP.PERMISO = 'H'
                    )
                    AND NOT EXISTS (
                        SELECT 1 FROM SEG_PERMISO_USUARIO PUD
                        WHERE PUD.SECUSUARIOID = U.SECUSUARIOID AND PUD.SECELEMENTOID = ? AND PUD.PERMISO = 'D'
                    )
                )
              )`;
        params.push(eid, eid, eid);
        if (perfilid) {
            sql += ` AND EXISTS (SELECT 1 FROM SEG_PERMISO_USUARIO PUF WHERE PUF.SECUSUARIOID = U.SECUSUARIOID AND PUF.SECPERFILID_PERMISO = ?)`;
            params.push(parseInt(perfilid));
        }
        sql += ' ORDER BY U.USUARIO';

        const [rows] = await pool.query(sql, params);
        if (!rows.length) return res.json([]);

        const uids = rows.map(r => r.SECUSUARIOID);
        const ph = uids.map(() => '?').join(',');
        const [manualRows] = await pool.query(
            `SELECT SECUSUARIOID FROM SEG_PERMISO_USUARIO WHERE SECUSUARIOID IN (${ph}) AND SECELEMENTOID = ? AND PERMISO = 'H'`,
            [...uids, eid]
        );
        const manualSet = new Set(manualRows.map(r => r.SECUSUARIOID));

        res.json(rows.map(r => ({
            secusuarioid: r.SECUSUARIOID,
            usuario: r.USUARIO,
            estado: r.ESTADO,
            tipo_permiso: manualSet.has(r.SECUSUARIOID) ? 'MANUAL' : 'PERFIL',
        })));
    } catch (err) {
        console.error('[/api/seguridad/usuarios-con-elemento]', err);
        res.status(500).json({ error: err.message });
    }
});

// ==========================================================================
// 9. POST /api/seguridad/asignar-masivo — Asignar un elemento a varios usuarios
//    Body: { db_key, secelementoid, secusuarioids: [] }
// ==========================================================================
router.post('/api/seguridad/asignar-masivo', authMiddleware, async (req, res) => {
    const { db_key, secelementoid, secusuarioids } = req.body;
    const modificado_por = req.user?.usuario || 'sistema';
    if (!db_key || !secelementoid || !Array.isArray(secusuarioids) || !secusuarioids.length)
        return res.status(400).json({ error: 'Faltan parámetros: db_key, secelementoid, secusuarioids[]' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    const eid = parseInt(secelementoid);
    const uids = secusuarioids.map(Number);
    const ph = uids.map(() => '?').join(',');
    const log = [];
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [userRows] = await conn.query(
            `SELECT SECUSUARIOID, USUARIO FROM SEG_USUARIO WHERE SECUSUARIOID IN (${ph})`, uids);
        const userMap = {};
        userRows.forEach(r => { userMap[r.SECUSUARIOID] = r.USUARIO; });

        // Obtener la empresa principal de cada usuario
        const [empresaRows] = await conn.query(
            `SELECT SECUSUARIOID, SECEMPRESAID FROM SEG_USUARIO_EMPRESA WHERE SECUSUARIOID IN (${ph})`,
            uids);
        const empresaMap = {};
        empresaRows.forEach(r => {
            if (!empresaMap[r.SECUSUARIOID]) empresaMap[r.SECUSUARIOID] = r.SECEMPRESAID;
        });

        const [manualRows] = await conn.query(
            `SELECT SECUSUARIOID, PERMISO FROM SEG_PERMISO_USUARIO WHERE SECUSUARIOID IN (${ph}) AND SECELEMENTOID = ?`,
            [...uids, eid]);
        const manualMap = {};
        manualRows.forEach(r => { manualMap[r.SECUSUARIOID] = r.PERMISO; });

        const [perfilRows] = await conn.query(`
            SELECT DISTINCT PU.SECUSUARIOID
            FROM SEG_PERMISO_USUARIO PU
            JOIN SEG_PERMISO_PERFIL PP ON PP.SECPERFILID = PU.SECPERFILID_PERMISO
            WHERE PU.SECUSUARIOID IN (${ph}) AND PP.SECELEMENTOID = ? AND PP.PERMISO = 'H'
        `, [...uids, eid]);
        const perfilSet = new Set(perfilRows.map(r => r.SECUSUARIOID));

        const toInsert = [];
        const toUpdate = [];
        const toDelete = []; // Para eliminar registros con N (negado) y dejar que aplique el perfil

        for (const uid of uids) {
            const usuario = userMap[uid] || `ID ${uid}`;
            const mp = manualMap[uid];
            const empId = empresaMap[uid] || null;
            if (mp === 'H') {
                log.push({ secusuarioid: uid, usuario, resultado: 'ya_existia_manual' });
            } else if (mp === 'D') {
                toUpdate.push(uid);
                log.push({ secusuarioid: uid, usuario, resultado: 'reactivado' });
            } else if (mp === 'N') {
                // Si está negado manualmente (N), eliminar el registro para que aplique el permiso del perfil
                toDelete.push(uid);
                log.push({ secusuarioid: uid, usuario, resultado: 'negacion_eliminada_perfil_activo' });
            } else if (perfilSet.has(uid)) {
                log.push({ secusuarioid: uid, usuario, resultado: 'ya_existia_perfil' });
            } else {
                toInsert.push({ uid, empId });
                log.push({ secusuarioid: uid, usuario, resultado: 'asignado' });
            }
        }

        if (toUpdate.length) {
            const pu = toUpdate.map(() => '?').join(',');
            await conn.query(
                `UPDATE SEG_PERMISO_USUARIO SET PERMISO = 'H', MODIFICADO_EL = NOW(), MODIFICADO_POR = ?
                 WHERE SECELEMENTOID = ? AND SECUSUARIOID IN (${pu})`,
                [modificado_por, eid, ...toUpdate]);
        }
        if (toDelete.length) {
            const pd = toDelete.map(() => '?').join(',');
            await conn.query(
                `DELETE FROM SEG_PERMISO_USUARIO WHERE SECELEMENTOID = ? AND SECUSUARIOID IN (${pd})`,
                [eid, ...toDelete]);
        }
        if (toInsert.length) {
            const values = toInsert.map(x => [x.uid, eid, null, 'H', modificado_por, x.empId]);
            await conn.query(
                `INSERT INTO SEG_PERMISO_USUARIO (SECUSUARIOID, SECELEMENTOID, SECPERFILID_PERMISO, PERMISO, CREADO_POR, SECEMPRESAID) VALUES ?`,
                [values]);
        }

        await conn.commit();

        // Registrar auditoría
        const cambiosEfectivos = log.filter(l =>
            ['asignado','reactivado','negacion_eliminada_perfil_activo'].includes(l.resultado)
        );
        if (cambiosEfectivos.length > 0) {
            const usuariosIds = cambiosEfectivos.map(l => l.secusuarioid).join(', ');
            await registrarAuditoriaSeguridad({
                tipo_accion: 'PERMISO_MASIVO',
                entidad: 'SEGURIDAD',
                id_entidad: String(eid),
                id_usuario_sistema: 'alex.carrera',
                nombre_usuario: 'alex.carrera',
                db_key: db_key,
                descripcion: `Asignó permiso elemento ${eid} a usuarios: ${usuariosIds}`,
                valor_nuevo: JSON.stringify({
                    accion: 'ASIGNAR',
                    secelementoid: eid,
                    usuarios_afectados: cambiosEfectivos.length,
                    usuarios_ids: cambiosEfectivos.map(l => l.secusuarioid),
                    usuarios_nombres: cambiosEfectivos.map(l => l.usuario),
                    detalle: cambiosEfectivos
                }),
                exito: true
            });
        }

        res.json({ ok: true, log, cambios: cambiosEfectivos.length });
    } catch (err) {
        await conn.rollback();
        console.error('[/api/seguridad/asignar-masivo]', err);
        // Registrar error en auditoría
        await registrarAuditoriaSeguridad({
            tipo_accion: 'PERMISO_MASIVO',
            entidad: 'SEGURIDAD',
            id_entidad: String(eid),
            id_usuario_sistema: 'alex.carrera',
            nombre_usuario: 'alex.carrera',
            db_key: db_key,
            descripcion: `Error al asignar permiso elemento ${eid}`,
            exito: false,
            mensaje_error: err.message
        });
        res.status(500).json({ error: err.message, log });
    } finally {
        conn.release();
    }
});

// ==========================================================================
// 10. POST /api/seguridad/quitar-masivo — Quitar/denegar elemento a varios usuarios
//     Body: { db_key, secelementoid, secusuarioids: [], secempresaid }
// ==========================================================================
router.post('/api/seguridad/quitar-masivo', authMiddleware, async (req, res) => {
    const { db_key, secelementoid, secusuarioids, secempresaid } = req.body;
    const modificado_por = req.user?.usuario || 'sistema';
    if (!db_key || !secelementoid || !Array.isArray(secusuarioids) || !secusuarioids.length)
        return res.status(400).json({ error: 'Faltan parámetros: db_key, secelementoid, secusuarioids[]' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    const eid = parseInt(secelementoid);
    const uids = secusuarioids.map(Number);
    const ph = uids.map(() => '?').join(',');
    const log = [];
    const conn = await pool.getConnection();

    try {
        await conn.beginTransaction();

        const [userRows] = await conn.query(
            `SELECT SECUSUARIOID, USUARIO FROM SEG_USUARIO WHERE SECUSUARIOID IN (${ph})`, uids);
        const userMap = {};
        userRows.forEach(r => { userMap[r.SECUSUARIOID] = r.USUARIO; });

        const [manualRows] = await conn.query(
            `SELECT SECUSUARIOID, PERMISO FROM SEG_PERMISO_USUARIO WHERE SECUSUARIOID IN (${ph}) AND SECELEMENTOID = ?`,
            [...uids, eid]);
        const manualMap = {};
        manualRows.forEach(r => { manualMap[r.SECUSUARIOID] = r.PERMISO; });

        const [perfilRows] = await conn.query(`
            SELECT DISTINCT PU.SECUSUARIOID
            FROM SEG_PERMISO_USUARIO PU
            JOIN SEG_PERMISO_PERFIL PP ON PP.SECPERFILID = PU.SECPERFILID_PERMISO
            WHERE PU.SECUSUARIOID IN (${ph}) AND PP.SECELEMENTOID = ? AND PP.PERMISO = 'H'
        `, [...uids, eid]);
        const perfilSet = new Set(perfilRows.map(r => r.SECUSUARIOID));

        const toDelete = [];
        const toNegar = []; // Para insertar N (negar/quitar permiso del perfil)

        for (const uid of uids) {
            const usuario = userMap[uid] || `ID ${uid}`;
            const mp = manualMap[uid];
            if (mp === 'N') {
                log.push({ secusuarioid: uid, usuario, resultado: 'ya_negado' });
            } else if (mp === 'H' || mp === 'D') {
                // Si tiene H o D manual, actualizar a N (negar)
                toNegar.push(uid);
                log.push({ secusuarioid: uid, usuario, resultado: 'negado' });
            } else if (perfilSet.has(uid)) {
                // Si tiene por perfil, insertar N para negar el permiso del perfil
                toNegar.push(uid);
                log.push({ secusuarioid: uid, usuario, resultado: 'negado' });
            } else {
                log.push({ secusuarioid: uid, usuario, resultado: 'sin_permiso' });
            }
        }

        if (toDelete.length) {
            const pd = toDelete.map(() => '?').join(',');
            await conn.query(
                `DELETE FROM SEG_PERMISO_USUARIO WHERE SECELEMENTOID = ? AND SECUSUARIOID IN (${pd})`,
                [eid, ...toDelete]);
        }
        if (toNegar.length) {
            // Upsert: actualizar si existe, insertar si no
            const pu = toNegar.map(() => '?').join(',');
            // Primero actualizar los que ya existen
            await conn.query(
                `UPDATE SEG_PERMISO_USUARIO SET PERMISO = 'N', MODIFICADO_EL = NOW(), MODIFICADO_POR = ?
                 WHERE SECELEMENTOID = ? AND SECUSUARIOID IN (${pu})`,
                [modificado_por, eid, ...toNegar]);
            // Luego insertar los que no existen (usando INSERT IGNORE o verificar)
            // Buscar cuáles no existen
            const [existingRows] = await conn.query(
                `SELECT SECUSUARIOID FROM SEG_PERMISO_USUARIO WHERE SECELEMENTOID = ? AND SECUSUARIOID IN (${pu})`,
                [eid, ...toNegar]);
            const existingSet = new Set(existingRows.map(r => r.SECUSUARIOID));
            const toInsert = toNegar.filter(uid => !existingSet.has(uid));
            if (toInsert.length) {
                const values = toInsert.map(uid => [uid, eid, null, 'N', modificado_por, secempresaid || null]);
                await conn.query(
                    `INSERT INTO SEG_PERMISO_USUARIO (SECUSUARIOID, SECELEMENTOID, SECPERFILID_PERMISO, PERMISO, CREADO_POR, SECEMPRESAID) VALUES ?`,
                    [values]);
            }
        }

        await conn.commit();

        // Registrar auditoría
        const cambiosEfectivos = log.filter(l => l.resultado === 'negado');
        if (cambiosEfectivos.length > 0) {
            const usuariosIds = cambiosEfectivos.map(l => l.secusuarioid).join(', ');
            await registrarAuditoriaSeguridad({
                tipo_accion: 'PERMISO_MASIVO',
                entidad: 'SEGURIDAD',
                id_entidad: String(eid),
                id_usuario_sistema: 'alex.carrera',
                nombre_usuario: 'alex.carrera',
                db_key: db_key,
                descripcion: `Quitó permiso elemento ${eid} a usuarios: ${usuariosIds}`,
                valor_nuevo: JSON.stringify({
                    accion: 'QUITAR',
                    secelementoid: eid,
                    usuarios_afectados: cambiosEfectivos.length,
                    usuarios_ids: cambiosEfectivos.map(l => l.secusuarioid),
                    usuarios_nombres: cambiosEfectivos.map(l => l.usuario),
                    detalle: cambiosEfectivos
                }),
                exito: true
            });
        }

        res.json({ ok: true, log, cambios: cambiosEfectivos.length });
    } catch (err) {
        await conn.rollback();
        console.error('[/api/seguridad/quitar-masivo]', err);
        // Registrar error en auditoría
        await registrarAuditoriaSeguridad({
            tipo_accion: 'PERMISO_MASIVO',
            entidad: 'SEGURIDAD',
            id_entidad: String(eid),
            id_usuario_sistema: 'alex.carrera',
            nombre_usuario: 'alex.carrera',
            db_key: db_key,
            descripcion: `Error al quitar permiso elemento ${eid}`,
            exito: false,
            mensaje_error: err.message
        });
        res.status(500).json({ error: err.message, log });
    } finally {
        conn.release();
    }
});

// ==========================================================================
// 9. POST /api/seguridad/desbloquear-usuario — Desbloquear usuario (BLOQUEADO=0)
// ==========================================================================
router.post('/api/seguridad/desbloquear-usuario', async (req, res) => {
    const { db_key, secusuarioid } = req.body;
    if (!db_key || !secusuarioid) return res.status(400).json({ error: 'Faltan db_key o secusuarioid' });
    const { pool } = getPoolSeg(db_key);
    if (!pool) return res.status(400).json({ error: 'Base de datos de seguridad no configurada' });

    try {
        await pool.query(
            `UPDATE SEG_USUARIO SET BLOQUEADO = 0 WHERE SECUSUARIOID = ?`,
            [secusuarioid]
        );
        res.json({ ok: true, mensaje: 'Usuario desbloqueado' });
    } catch (err) {
        console.error('[/api/seguridad/desbloquear-usuario]', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = { router, initAuditoriaSeguridad };
