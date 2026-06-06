const express = require('express');
const router = express.Router();
const pools = require('../db');

// Helper: Limpiar caracteres corruptos por problemas de codificación UTF-8
// SOLO reemplaza patrones específicos conocidos que están corruptos
function limpiarTexto(texto) {
    if (texto === null || texto === undefined) return '';
    if (typeof texto !== 'string') return String(texto);
    
    // Reemplazo CONSERVATIVO: solo patrones específicos que sabemos están corruptos
    // Esto evita duplicar caracteres si el string ya está bien codificado
    const reemplazos = {
        'Conversacin ': 'Conversación ',
        'Conversacin.': 'Conversación.',
        'Conversacin,': 'Conversación,',
        'resolucin ': 'resolución ',
        'resolucin.': 'resolución.',
        'resolucin,': 'resolución,',
    };
    
    let limpio = texto;
    for (const [corrupto, correcto] of Object.entries(reemplazos)) {
        limpio = limpio.split(corrupto).join(correcto);
    }
    
    // Reemplazar uno o más caracteres de reemplazo UTF-8 (U+FFFD) consecutivos por una sola ó
    // El patrón \uFFFD+ captura una o más ocurrencias consecutivas
    limpio = limpio.replace(/\uFFFD+/g, 'ó');
    
    // Si quedó doble ó (caso borde), normalizar a una sola
    limpio = limpio.replace(/óó/g, 'ó');
    
    return limpio;
}

// Helper: Limpiar recursivamente todos los strings en un objeto/fila
function limpiarFila(row) {
    const limpio = {};
    for (const [key, val] of Object.entries(row)) {
        if (typeof val === 'string') {
            limpio[key] = limpiarTexto(val);
        } else {
            limpio[key] = val;
        }
    }
    return limpio;
}

// Endpoint para obtener empresas
router.get('/api/reportes/empresas', async (req, res) => {
    const { db_key } = req.query;
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        const [rows] = await pools[db_key].query(
            "SELECT ID_EMPRESA, NOMBRE FROM EMPRESAS WHERE ESTADO = 1 ORDER BY NOMBRE ASC"
        );
        res.json(rows.map(limpiarFila));
    } catch (err) {
        console.error("Error en GET /api/reportes/empresas:", err);
        res.status(500).json({ error: "Error al consultar empresas." });
    }
});

// Endpoint para obtener skills
router.get('/api/reportes/skills', async (req, res) => {
    const { db_key } = req.query;
    
    if (!pools[db_key]) {
        return res.status(400).json({ error: "Instancia de base de datos no configurada." });
    }

    try {
        const [rows] = await pools[db_key].query(
            "SELECT ID_SKILL, NOMBRE_SKILL FROM SKILLS WHERE ESTADO = 1 ORDER BY NOMBRE_SKILL ASC"
        );
        res.json(rows.map(limpiarFila));
    } catch (err) {
        console.error("Error en GET /api/reportes/skills:", err);
        res.status(500).json({ error: "Error al consultar skills." });
    }
});

// Endpoint para reporte detallado
router.post('/api/reportes/detallado', async (req, res) => {
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
        res.json(results.map(limpiarFila));

    } catch (error) {
        console.error('Error en reporte detallado:', error);
        res.status(500).json({ error: 'Error al generar reporte detallado' });
    }
});

// Endpoint para reporte resumido
router.post('/api/reportes/resumido', async (req, res) => {
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
        res.json(results.map(limpiarFila));

    } catch (error) {
        console.error('Error en reporte resumido:', error);
        res.status(500).json({ error: 'Error al generar reporte resumido' });
    }
});

module.exports = router;
