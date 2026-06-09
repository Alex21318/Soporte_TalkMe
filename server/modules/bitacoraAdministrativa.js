/**
 * ==========================================================================
 * BITÁCORA ADMINISTRATIVA - Historial de cambios de permisos
 * ==========================================================================
 * Endpoints para consultar la vista CONS_BITACORA_ADMINISTRATIVA_VW
 */

const express = require('express');
const router = express.Router();

let pools = null;

function initBitacoraAdministrativa(poolsConfig) {
    pools = poolsConfig;
}

// ==========================================================================
// CONSULTAR BITÁCORA ADMINISTRATIVA (con filtros)
// ==========================================================================
router.get('/api/bitacora-administrativa', async (req, res) => {
    if (!pools) {
        return res.status(500).json({ error: "Pools de base de datos no inicializados" });
    }

    const {
        db_key = 'db_1',
        id_empresa,
        empresa,
        subgrupo,
        categoria,
        descripcion,
        creado_por,
        fecha_inicio,
        fecha_fin,
        limit = 100,
        offset = 0
    } = req.query;

    // Validar que db_key existe
    if (!pools[db_key]) {
        return res.status(400).json({ error: `db_key ${db_key} no válido` });
    }

    const pool = pools[db_key];

    try {
        let whereConditions = [];
        let params = [];

        if (id_empresa) {
            whereConditions.push("ID_EMPRESA = ?");
            params.push(parseInt(id_empresa));
        }
        if (empresa) {
            whereConditions.push("EMPRESA LIKE ?");
            params.push(`%${empresa}%`);
        }
        if (subgrupo) {
            whereConditions.push("SUBGRUPO LIKE ?");
            params.push(`%${subgrupo}%`);
        }
        if (categoria) {
            whereConditions.push("CATEGORIA LIKE ?");
            params.push(`%${categoria}%`);
        }
        if (descripcion) {
            whereConditions.push("DESCRIPCION LIKE ?");
            params.push(`%${descripcion}%`);
        }
        if (creado_por) {
            whereConditions.push("CREADO_POR LIKE ?");
            params.push(`%${creado_por}%`);
        }
        if (fecha_inicio) {
            whereConditions.push("CREADO_EL >= ?");
            params.push(fecha_inicio);
        }
        if (fecha_fin) {
            whereConditions.push("CREADO_EL <= ?");
            params.push(fecha_fin);
        }

        const whereClause = whereConditions.length > 0 
            ? "WHERE " + whereConditions.join(" AND ") 
            : "";

        // Query para obtener los registros
        const query = `
            SELECT 
                ID_LOG, ID_EMPRESA, ID_CATEGORIA, EMPRESA, SUBGRUPO,
                CATEGORIA, DESCRIPCION, GRUPO, ID_USUARIO, NOMBRE_USUARIO,
                VALOR_ANTERIOR, VALOR_ACTUAL, CREADO_EL, CREADO_POR
            FROM CONS_BITACORA_ADMINISTRATIVA_VW
            ${whereClause}
            ORDER BY CREADO_EL DESC
            LIMIT ? OFFSET ?
        `;

        params.push(parseInt(limit), parseInt(offset));

        const [rows] = await pool.query(query, params);

        // Query para contar total
        const countQuery = `
            SELECT COUNT(*) as total 
            FROM CONS_BITACORA_ADMINISTRATIVA_VW 
            ${whereClause}
        `;
        const countParams = params.slice(0, -2); // Remover limit y offset
        const [countResult] = await pool.query(countQuery, countParams);

        res.json({
            registros: rows,
            total: countResult[0].total,
            limit: parseInt(limit),
            offset: parseInt(offset)
        });

    } catch (err) {
        console.error("Error al consultar bitácora administrativa:", err);
        res.status(500).json({ 
            error: "Error al consultar bitácora administrativa", 
            details: err.message 
        });
    }
});

// ==========================================================================
// OBTENER VALORES ÚNICOS PARA FILTROS
// ==========================================================================
router.get('/api/bitacora-administrativa/filtros', async (req, res) => {
    if (!pools) {
        return res.status(500).json({ error: "Pools de base de datos no inicializados" });
    }

    const { db_key = 'db_1' } = req.query;

    if (!pools[db_key]) {
        return res.status(400).json({ error: `db_key ${db_key} no válido` });
    }

    const pool = pools[db_key];

    try {
        // Obtener valores únicos para cada filtro
        const [empresas] = await pool.query(`
            SELECT DISTINCT EMPRESA 
            FROM CONS_BITACORA_ADMINISTRATIVA_VW 
            WHERE EMPRESA IS NOT NULL 
            ORDER BY EMPRESA
            LIMIT 500
        `);

        const [subgrupos] = await pool.query(`
            SELECT DISTINCT SUBGRUPO 
            FROM CONS_BITACORA_ADMINISTRATIVA_VW 
            WHERE SUBGRUPO IS NOT NULL 
            ORDER BY SUBGRUPO
            LIMIT 100
        `);

        const [categorias] = await pool.query(`
            SELECT DISTINCT CATEGORIA 
            FROM CONS_BITACORA_ADMINISTRATIVA_VW 
            WHERE CATEGORIA IS NOT NULL 
            ORDER BY CATEGORIA
            LIMIT 100
        `);

        const [creadoPor] = await pool.query(`
            SELECT DISTINCT CREADO_POR 
            FROM CONS_BITACORA_ADMINISTRATIVA_VW 
            WHERE CREADO_POR IS NOT NULL 
            ORDER BY CREADO_POR
            LIMIT 500
        `);

        res.json({
            empresas: empresas.map(r => r.EMPRESA),
            subgrupos: subgrupos.map(r => r.SUBGRUPO),
            categorias: categorias.map(r => r.CATEGORIA),
            creado_por: creadoPor.map(r => r.CREADO_POR)
        });

    } catch (err) {
        console.error("Error al obtener filtros de bitácora administrativa:", err);
        res.status(500).json({ 
            error: "Error al obtener filtros", 
            details: err.message 
        });
    }
});

module.exports = { router, initBitacoraAdministrativa };
