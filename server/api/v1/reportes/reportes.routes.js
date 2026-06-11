const express = require('express');
const router = express.Router();
const pools = require('../../../../db');

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

// Endpoint para obtener empresas (igual que en aSkills.js)
router.get('/api/empresas', async (req, res) => {
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
        console.error("Error en GET /api/empresas:", err);
        res.status(500).json({ error: "Error al consultar empresas." });
    }
});

// Endpoint para obtener skills (igual que en aSkills.js)
router.get('/api/skills', async (req, res) => {
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
        console.error("Error en GET /api/skills:", err);
        res.status(500).json({ error: "Error al consultar skills." });
    }
});

// Helper: convertir fechas a rango datetime completo
function buildDateRange(fecha_inicio, fecha_fin) {
    // Si la fecha viene como YYYY-MM-DD, agregar tiempos
    const inicio = fecha_inicio.includes(' ') ? fecha_inicio : `${fecha_inicio} 00:00:00`;
    const fin = fecha_fin.includes(' ') ? fecha_fin : `${fecha_fin} 23:59:59`;
    return { inicio, fin };
}

// Helper: Formatear fecha de YYYY-MM-DD a DD/MM/YYYY
function formatearFechaDDMMYYYY(fechaStr) {
    if (!fechaStr || typeof fechaStr !== 'string') return fechaStr;
    // Si ya viene como DD/MM/YYYY, retornar igual
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(fechaStr)) return fechaStr;
    // Convertir de YYYY-MM-DD a DD/MM/YYYY
    const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        return `${match[3]}/${match[2]}/${match[1]}`;
    }
    return fechaStr;
}

// Helper: Formatear hora de HH:MM:SS a hh:mm:ss a. m./p. m.
function formatearHoraAMPM(horaStr) {
    if (!horaStr || typeof horaStr !== 'string') return horaStr;
    // Parsear HH:MM:SS
    const match = horaStr.match(/^(\d{2}):(\d{2}):(\d{2})$/);
    if (!match) return horaStr;
    
    let horas = parseInt(match[1], 10);
    const minutos = match[2];
    const segundos = match[3];
    
    // Determinar AM/PM
    const periodo = horas >= 12 ? 'p. m.' : 'a. m.';
    
    // Convertir a formato 12 horas
    if (horas === 0) {
        horas = 12; // 00:00 = 12 a. m.
    } else if (horas > 12) {
        horas = horas - 12;
    }
    
    // Formatear horas con padding
    const horasStr = horas.toString().padStart(2, '0');
    
    return `${horasStr}:${minutos}:${segundos} ${periodo}`;
}

// Helper: Aplicar formato de fechas y horas a una fila del reporte detallado
function formatearFilaReporteDetallado(row) {
    const formateado = { ...row };
    
    // Columnas de fecha a formatear
    const columnasFecha = [
        'FECHA 1ER MENSAJE CLIENTE',
        'FECHA_INGRESO_CONSOLA',
        'FECHA_ASIGNACION',
        'FECHA 1ER RESPUESTA OPERADOR',
        'FECHA_FINALIZACION'
    ];
    
    // Columnas de hora a formatear
    const columnasHora = [
        'HORA 1ER MENSAJE CLIENTE',
        'HORA_INGRESO_CONSOLA',
        'HORA_ASIGNACION',
        'HORA 1ER RESPUESTA OPERADOR',
        'HORA_FINALIZACION'
    ];
    
    // Aplicar formato de fecha
    for (const col of columnasFecha) {
        if (formateado[col]) {
            formateado[col] = formatearFechaDDMMYYYY(formateado[col]);
        }
    }
    
    // Aplicar formato de hora
    for (const col of columnasHora) {
        if (formateado[col]) {
            formateado[col] = formatearHoraAMPM(formateado[col]);
        }
    }
    
    return formateado;
}

// Endpoint para reporte detallado (Operaciones)
router.post('/api/reportes/detallado', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, skills, id_bots } = req.body;
    
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        const skillsFilter = skills && skills.length > 0 ? skills.join(',') : '9,26,39,43,71,102';
        const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
        const botsArr = Array.isArray(id_bots) ? id_bots.map(n => parseInt(n, 10)).filter(Number.isFinite) : [];
        const filtroBots = botsArr.length > 0 ? `AND BR.ID_BOT IN (${botsArr.join(',')})` : '';
        // Bases de datos Ficohsa (tienen la columna TEP)
        const esFicohsa = ['db_6', 'db_7', 'db_8'].includes(db_key);
        console.log(`[Reporte Operaciones] db=${db_key} ficohsa=${esFicohsa} empresa=${id_empresa} skills=[${skillsFilter}] bots=[${botsArr.join(',') || 'todos'}] rango=${inicio} -> ${fin}`);

        // Columna TEP solo para Ficohsa
        const columnaTEP = esFicohsa ? `, STATS.TEP AS 'TIEMPO ESPERA OPERADOR'` : '';

        const query = `
            SELECT 
              C.ID_CONVERSACION,
              U1.NOMBRE_USUARIO AS OPERADOR_INICIA,
              U2.NOMBRE_USUARIO AS OPERADOR_FINALIZA,
              B.DESCRIPCION AS CANAL,
              RS.NOMBRE AS RED_SOCIAL,
              S.NOMBRE_SKILL AS SKILL,
              FCRS.ID_RRSS_EXTERNO AS CLIENTE,
              COALESCE(FA_AGG.VALOR_MAX, FC.NOMBRE_CLIENTE) AS NOMBRE,
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
              R.OPCION_BOT AS OPCION_MENU_BOT
              ${columnaTEP}
            FROM CONVERSACIONES C
              JOIN BOT_REDES BR ON BR.ID_BOT_REDES = C.ID_BOT_REDES
              JOIN BOT B ON B.ID_BOT = BR.ID_BOT AND B.ID_EMPRESA = ?
              JOIN REDES_SOCIALES RS ON RS.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
              JOIN SKILLS S ON S.ID_SKILL = C.ID_SKILL
              JOIN METRICAS_CONVERSACION STATS ON STATS.ID_CONVERSACION = C.ID_CONVERSACION
              JOIN FICHA_CLIENTE FC ON FC.ID_FICHA = C.ID_FICHA
              JOIN FICHA_CLIENTE_RED_SOCIAL FCRS ON FCRS.ID_FICHA = FC.ID_FICHA
              JOIN RESOLUCIONES R ON R.ID_CONVERSACION = C.ID_CONVERSACION
              JOIN TIPOS_RESOLUCIONES TR ON TR.ID_TIPO_RESOLUCION = R.TIPO_RESOLUCION
              LEFT JOIN USUARIOS U1 ON U1.ID_USUARIO = C.ID_USUARIO_INICIO
              LEFT JOIN USUARIOS U2 ON U2.ID_USUARIO = C.ID_USUARIO
              LEFT JOIN TIPOS_GESTION TG ON TG.ID_TIPO_GESTION = C.ID_GESTION
              LEFT JOIN (
                SELECT ID_FICHA_UNICA, MAX(VALOR) AS VALOR_MAX
                FROM FICHA_ATRIBUTO
                GROUP BY ID_FICHA_UNICA
              ) FA_AGG ON FA_AGG.ID_FICHA_UNICA = FCRS.ID_FICHA_UNICA
            WHERE
              C.ESTADO = 3
              AND S.ID_SKILL IN (${skillsFilter})
              ${filtroBots}
              AND STATS.CANTIDAD_MENSAJES > 0
              AND CONVERT_TZ(C.FECHA_FINALIZACION, 'UTC', 'America/Guatemala') BETWEEN '${inicio}' AND '${fin}'
            ORDER BY C.FECHA_FINALIZACION DESC
        `;

        const t0 = Date.now();
        const [results] = await pool.query(query, [id_empresa]);
        console.log(`[Reporte Operaciones] ${results.length} registros en ${Date.now() - t0}ms`);
        
        // Registrar auditoría
        try {
            const auditoria = require('../../modules/Configuraciones/Auditoria/auditoria');
            const { registrarLogInterno } = auditoria;
            if (registrarLogInterno) {
                await registrarLogInterno({
                    tipo_accion: 'REPORTE_GENERA',
                    entidad: 'REPORTES',
                    db_key: db_key,
                    id_empresa: id_empresa,
                    metadata: { 
                        tipo_reporte: 'DETALLADO_OPERACIONES', 
                        fecha_inicio, 
                        fecha_fin, 
                        skills, 
                        id_bots,
                        registros: results.length 
                    },
                    descripcion: `Se generó reporte detallado de operaciones (${results.length} registros)`,
                    exito: true
                });
            }
        } catch (audError) {
            console.error('Error al registrar auditoría de reporte:', audError);
        }

        // Aplicar limpieza de caracteres y formato de fechas/horas
        const resultsFormateados = results
            .map(limpiarFila)
            .map(formatearFilaReporteDetallado);
        
        res.json(resultsFormateados);

    } catch (error) {
        console.error('Error en reporte detallado:', error);
        res.status(500).json({ error: 'Error al generar reporte detallado: ' + error.message });
    }
});

// Endpoint para reporte resumido (Resoluciones)
router.post('/api/reportes/resumido', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, skills, id_bots } = req.body;
    
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        const skillsFilter = skills && skills.length > 0 ? skills.join(',') : '9,26,39,43,71,102';
        const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
        const botsArr = Array.isArray(id_bots) ? id_bots.map(n => parseInt(n, 10)).filter(Number.isFinite) : [];
        const filtroBots = botsArr.length > 0 ? `AND BR.ID_BOT IN (${botsArr.join(',')})` : '';
        console.log(`[Reporte Resumido] db=${db_key} empresa=${id_empresa} skills=[${skillsFilter}] bots=[${botsArr.join(',') || 'todos'}] rango=${inicio} -> ${fin}`);
        
        const query = `
            SELECT
                RS.NOMBRE_USUARIO_INICIO AS 'Operador Abre',
                RS.NOMBRE_USUARIO_FINALIZA AS 'Operador Cierre',
                RS.NOMBRE_RED_SOCIAL AS 'Red Social',
                RS.NOMBRE_BOT AS 'Canal',
                RS.ORIGEN AS DESTINO,
                'Inicio Caso' AS 'Evento',
                DATE_FORMAT( CONVERT_TZ( RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala' ), '%d/%m/%Y' ) AS 'Fecha',
                DATE_FORMAT( CONVERT_TZ( RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala' ), '%H:%i:%s' ) AS 'Hora',
                'Fin Caso' AS 'Evento ',
                DATE_FORMAT( CONVERT_TZ( RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala' ), '%d/%m/%Y' ) AS 'Fecha ',
                DATE_FORMAT( CONVERT_TZ( RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala' ), '%H:%i:%s' ) AS 'Hora ',
                RS.DURACION AS 'Duracion',
                RS.TME_CLIENTE AS 'Tiempo 1er Respuesta',
                DATE_FORMAT( CONVERT_TZ( RS.PRIMER_RESPUESTA, 'UTC', 'America/Guatemala' ), '%d/%m/%Y %H:%i:%s' ) AS 'TS 1er Respuesta',
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
                AND CONVERT_TZ( RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala' ) BETWEEN '${inicio}' AND '${fin}'
                AND EXISTS (
                    SELECT 1 
                    FROM BOT_REDES BR
                    JOIN BOT B ON B.ID_BOT = BR.ID_BOT AND B.ESTADO = 1
                    JOIN REDES_SOCIALES RED ON RED.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
                    JOIN PERMISOS_USUARIOS_BOT_REDES PUBR ON PUBR.ID_BOT_REDES = BR.ID_BOT_REDES 
                    WHERE BR.ID_BOT_REDES = RS.ID_BOT_REDES 
                    AND B.ID_EMPRESA = RS.ID_EMPRESA 
                    AND ( RED.NOMBRE COLLATE utf8mb4_unicode_ci ) = RS.NOMBRE_RED_SOCIAL 
                    ${filtroBots}
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
            ORDER BY RS.FECHA_HORA_FINAL DESC
        `;

        const t0 = Date.now();
        const [results] = await pool.query(query, [id_empresa]);
        console.log(`[Reporte Resumido] ${results.length} registros en ${Date.now() - t0}ms`);
        
        // Registrar auditoría
        try {
            const auditoria = require('../../modules/Configuraciones/Auditoria/auditoria');
            const { registrarLogInterno } = auditoria;
            if (registrarLogInterno) {
                await registrarLogInterno({
                    tipo_accion: 'REPORTE_GENERA',
                    entidad: 'REPORTES',
                    db_key: db_key,
                    id_empresa: id_empresa,
                    metadata: { 
                        tipo_reporte: 'RESUMIDO_RESOLUCIONES', 
                        fecha_inicio, 
                        fecha_fin, 
                        skills, 
                        id_bots,
                        registros: results.length 
                    },
                    descripcion: `Se generó reporte resumido de resoluciones (${results.length} registros)`,
                    exito: true
                });
            }
        } catch (audError) {
            console.error('Error al registrar auditoría de reporte:', audError);
        }

        res.json(results.map(limpiarFila));

    } catch (error) {
        console.error('Error en reporte resumido:', error);
        res.status(500).json({ error: 'Error al generar reporte resumido: ' + error.message });
    }
});

// Helper: convertir rango local a UTC sumando 6 horas (offset Guatemala)
// fecha_inicio local 00:00:00 -> UTC mismo dia 06:00:00
// fecha_fin local 23:59:59 -> UTC dia siguiente 05:59:59
function buildDateRangeUTC(fecha_inicio, fecha_fin) {
    // Asegurar que solo usamos la parte YYYY-MM-DD (por si llega con hora)
    const soloFechaInicio = fecha_inicio.split(' ')[0];
    const soloFechaFin    = fecha_fin.split(' ')[0];
    const inicio = `${soloFechaInicio} 06:00:00`;
    // Sumar 1 dia a fecha_fin para obtener el dia siguiente a las 05:59:59
    const finDate = new Date(`${soloFechaFin}T00:00:00Z`);
    finDate.setUTCDate(finDate.getUTCDate() + 1);
    const yyyy = finDate.getUTCFullYear();
    const mm = String(finDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(finDate.getUTCDate()).padStart(2, '0');
    const fin = `${yyyy}-${mm}-${dd} 05:59:59`;
    return { inicio, fin };
}

// Endpoint para reporte Grupo Q
router.post('/api/reportes/grupoq', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin } = req.body;

    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    if (db_key !== 'db_2' || String(id_empresa) !== '213') {
        return res.status(403).json({ error: 'El reporte Grupo Q solo está disponible en S2 para la empresa 213' });
    }

    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        const { inicio, fin } = buildDateRangeUTC(fecha_inicio, fecha_fin);
        console.log(`[Reporte GrupoQ] db=${db_key} empresa=${id_empresa} rango=${inicio} -> ${fin}`);

        const query = `
            SELECT 
              DATE_FORMAT(C.FECHA_FINALIZACION - INTERVAL 6 HOUR, '%d-%m-%Y') AS 'FECHA',
              CASE 
                WHEN B.DESCRIPCION = 'Grupo Q Repuestos Regional' THEN 'Regional'
                ELSE P.NOMBRE
              END AS 'Pais',
              C.ID_CONVERSACION AS 'ID Conversacion',
              REPLACE(REPLACE(U1.NOMBRE_USUARIO, ';', ':'), ',', '.') AS 'Operador Inicia',
              REPLACE(REPLACE(U2.NOMBRE_USUARIO, ';', ':'), ',', '.') AS 'Operador Finaliza',
              REPLACE(B.DESCRIPCION, ';', ':') AS Canal,
              REPLACE(RS.NOMBRE, ';', ':') AS 'Red Social',
              REPLACE(S.NOMBRE_SKILL, ';', ':') AS Skill,
              CAST(FCRS.ID_RRSS_EXTERNO AS CHAR) AS Cliente,
              REPLACE(REPLACE(
                CASE 
                  WHEN COALESCE(ATR.NOMBRE, FC.NOMBRE_CLIENTE) IN (',',';',':') THEN '.'
                  ELSE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(ATR.NOMBRE, FC.NOMBRE_CLIENTE), ';', ':'), '\\r', ''), '\\n', ''), '\\t', '')
                END
              , ';', ':'), ',', '.') AS Nombre,
              CASE 
                WHEN C2.ID_CONVERSACION IS NULL THEN 'Sí'
                ELSE 'No'
              END AS 'Cliente nuevo',
              STATS.ULTIMA_ETIQUETA AS 'Ultima Etiqueta',
              DATE(STATS.FECHA_HORA_PRIMER_MENSAJE_CLIENTE - INTERVAL 6 HOUR) AS 'Fecha 1er Mensaje Cliente',
              TIME(STATS.FECHA_HORA_PRIMER_MENSAJE_CLIENTE - INTERVAL 6 HOUR) AS 'Hora 1er Mensaje Cliente',
              DATE(C.FECHA_CONVERSACION - INTERVAL 6 HOUR) AS 'Fecha Ingreso Consola',
              TIME(C.FECHA_CONVERSACION - INTERVAL 6 HOUR) AS 'Hora Ingreso Consola',
              DATE(C.FECHA_ATENCION - INTERVAL 6 HOUR) AS 'Fecha Asignacion',
              TIME(C.FECHA_ATENCION - INTERVAL 6 HOUR) AS 'Hora Asignacion',
              DATE(STATS.FECHA_HORA_PRIMER_MENSAJE_OPERADOR - INTERVAL 6 HOUR) AS 'Fecha 1er Respuesta Operador',
              TIME(STATS.FECHA_HORA_PRIMER_MENSAJE_OPERADOR - INTERVAL 6 HOUR) AS 'Hora 1er Respuesta Operador',
              DATE(C.FECHA_FINALIZACION - INTERVAL 6 HOUR) AS 'Fecha Finalizacion',
              TIME(C.FECHA_FINALIZACION - INTERVAL 6 HOUR) AS 'Hora Finalizacion',
              STATS.DURACION,
              REPLACE(REPLACE(TG.GESTION, ';', ':'), ',', '.') AS Gestion,
              REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(R.RESOLUCION, ';', ':'), ',', '.'), '\\r', ''), '\\n', ''), '\\t', '') AS Resolucion,
              STATS.TIEMPO_BOT AS 'Tiempo Procesamiento Bot',
              STATS.TIEMPO_COLA,
              STATS.TME_CLIENTE,
              STATS.TME_OPERADOR,
              STATS.TIEMPO_PRIMERA_RESPUESTA,
              STATS.TMO,
              STATS.TMA,
              SEC_TO_TIME(ROUND(ABS(STATS.TMR), 0)) AS TMR,
              COALESCE(STATS.CIE, 0) AS \`Cantidad de Hits Entrantes\`,
              COALESCE(STATS.CIS, 0) AS \`Cantidad de Hits Salientes\`,
              COALESCE(STATS.CIE, 0) + COALESCE(STATS.CIS, 0) AS \`Total Hits\`,
              STATS.TPIE,
              STATS.TPIS,
              REPLACE(REPLACE(R.OPCION_BOT, ';', ':'), ',', '.') AS 'Opcion Menu Bot',
              REPLACE(REPLACE(CVW.NOMBRE_TIPO_CLIENTE, ';', ':'), ',', '.') AS 'Tipo cliente',
              REPLACE(REPLACE(
                CASE 
                  WHEN COALESCE(ATR.NOMBRE, FC.NOMBRE_CLIENTE) IN (',',';',':') THEN '.'
                  ELSE REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(ATR.NOMBRE, FC.NOMBRE_CLIENTE), ';', ':'), '\\r', ''), '\\n', ''), '\\t', '')
                END
              , ';', ':'), ',', '.') AS 'Nombre Completo',
              CAST(REPLACE(REPLACE(COALESCE(ATR.TELEFONO, FCRS.ID_RRSS_EXTERNO), ';', ':'), ',', '.') AS CHAR) AS 'Telefono Contacto',
              REPLACE(REPLACE(ATR.EMAIL, ';', ':'), ',', '.') AS Email,
              REPLACE(REPLACE(ATR.MARCA, ';', ':'), ',', '.') AS Marca,
              REPLACE(REPLACE(ATR.PLACA, ';', ':'), ',', '.') AS Placa,
              REPLACE(REPLACE(ATR.SUCURSAL, ';', ':'), ',', '.') AS Sucursal
            FROM CONVERSACIONES C
              JOIN BOT_REDES BR ON BR.ID_BOT_REDES = C.ID_BOT_REDES
              JOIN REDES_SOCIALES RS ON RS.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
              JOIN BOT B ON B.ID_BOT = BR.ID_BOT
              LEFT JOIN PAISES P ON P.COD_MONEDA = B.COD_MONEDA
              JOIN SKILLS S ON S.ID_SKILL = C.ID_SKILL
              JOIN FICHA_CLIENTE FC ON FC.ID_FICHA = C.ID_FICHA
              JOIN FICHA_CLIENTE_RED_SOCIAL FCRS ON FCRS.ID_FICHA = FC.ID_FICHA
              LEFT JOIN USUARIOS U1 ON U1.ID_USUARIO = C.ID_USUARIO_INICIO
              LEFT JOIN USUARIOS U2 ON U2.ID_USUARIO = C.ID_USUARIO
              JOIN RESOLUCIONES R ON R.ID_CONVERSACION = C.ID_CONVERSACION
              JOIN TIPOS_RESOLUCIONES TR ON TR.ID_TIPO_RESOLUCION = R.TIPO_RESOLUCION
              LEFT JOIN TIPOS_GESTION TG ON TG.ID_TIPO_GESTION = C.ID_GESTION
              JOIN METRICAS_CONVERSACION STATS ON STATS.ID_CONVERSACION = C.ID_CONVERSACION
              JOIN CONVERSACIONES_VW CVW ON C.ID_CONVERSACION = CVW.ID_CONVERSACION
              LEFT JOIN (
                SELECT 
                  FA.ID_FICHA_UNICA,
                  MAX(CASE WHEN AFC.ID_ATRIBUTO = 1876 THEN FA.VALOR END) AS NOMBRE,
                  MAX(CASE WHEN AFC.ID_ATRIBUTO = 1881 THEN FA.VALOR END) AS TELEFONO,
                  MAX(CASE WHEN AFC.ID_ATRIBUTO = 1880 THEN FA.VALOR END) AS EMAIL,
                  MAX(CASE WHEN AFC.ID_ATRIBUTO = 1903 THEN FA.VALOR END) AS MARCA,
                  MAX(CASE WHEN AFC.ID_ATRIBUTO = 2089 THEN FA.VALOR END) AS PLACA,
                  MAX(CASE WHEN AFC.ID_ATRIBUTO = 2090 THEN FA.VALOR END) AS SUCURSAL
                FROM ATRIBUTOS_FICHA_CLIENTE AFC
                JOIN FICHA_ATRIBUTO FA ON FA.ID_ATRIBUTO = AFC.ID_ATRIBUTO
                GROUP BY FA.ID_FICHA_UNICA
              ) ATR ON ATR.ID_FICHA_UNICA = FCRS.ID_FICHA_UNICA
              LEFT JOIN CONVERSACIONES C2 
                ON C2.ID_FICHA = C.ID_FICHA
                AND C2.FECHA_CONVERSACION < C.FECHA_CONVERSACION
            WHERE
              C.ESTADO = 3 
              AND B.ID_EMPRESA = ?
              AND STATS.CANTIDAD_MENSAJES > 0
              AND C.FECHA_FINALIZACION BETWEEN '${inicio}' AND '${fin}'
            GROUP BY C.ID_CONVERSACION
            ORDER BY C.ID_CONVERSACION
        `;

        const t0 = Date.now();
        const [rows] = await pool.query(query, [id_empresa]);
        console.log(`[Reporte GrupoQ] ${rows.length} registros en ${Date.now() - t0}ms`);
        
        // Registrar auditoría
        try {
            const auditoria = require('../../modules/Configuraciones/Auditoria/auditoria');
            const { registrarLogInterno } = auditoria;
            if (registrarLogInterno) {
                await registrarLogInterno({
                    tipo_accion: 'REPORTE_GENERA',
                    entidad: 'REPORTES',
                    db_key: db_key,
                    id_empresa: id_empresa,
                    metadata: { 
                        tipo_reporte: 'GRUPO_Q', 
                        fecha_inicio, 
                        fecha_fin, 
                        registros: rows.length 
                    },
                    descripcion: `Se generó reporte de Grupo Q (${rows.length} registros)`,
                    exito: true
                });
            }
        } catch (audError) {
            console.error('Error al registrar auditoría de reporte:', audError);
        }

        res.json(rows.map(limpiarFila));

    } catch (error) {
        console.error('Error en reporte GrupoQ:', error);
        res.status(500).json({ error: 'Error al generar reporte Grupo Q: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE BROADCAST
// ==========================================================================

// GET: Lista de bots de una empresa que tienen al menos un BOT_REDES con
// ID_RED_SOCIAL = 1 (WhatsApp), unicos para el dropdown del reporte Broadcast
router.get('/api/reportes/bots-broadcast', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    if (!db_key || !id_empresa) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT B.ID_BOT, B.DESCRIPCION AS NOMBRE_BOT
            FROM BOT B
            JOIN BOT_REDES BR ON BR.ID_BOT = B.ID_BOT AND BR.ID_RED_SOCIAL = 1
            WHERE B.ID_EMPRESA = ?
            ORDER BY B.DESCRIPCION
        `, [id_empresa]);
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error obteniendo bots broadcast:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Lista de campañas (broadcasts) de un bot en un rango de fechas
// BROADCAST tiene ID_EMPRESA y ID_BOT_REDES (no ID_BOT). Llegamos al BOT 
// via BOT_REDES.ID_BOT con ID_RED_SOCIAL = 1 (WhatsApp).
router.post('/api/reportes/campanias', async (req, res) => {
    const { db_key, id_empresa, id_bots, fecha_inicio, fecha_fin } = req.body;
    const botsArr = Array.isArray(id_bots) ? id_bots.map(n => parseInt(n, 10)).filter(Number.isFinite) : [];
    if (!db_key || botsArr.length === 0 || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    try {
        const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
        const filtroEmpresa = id_empresa ? 'AND B.ID_EMPRESA = ?' : '';
        const params = id_empresa ? [id_empresa] : [];

        const sql = `
            SELECT 
                B.ID_BROADCAST,
                B.TITULO,
                DATE_FORMAT(CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala'), '%d/%m/%Y %H:%i') AS FECHA_HORA,
                (SELECT COUNT(*) FROM NUMERO_BROADCAST NB WHERE NB.ID_BROADCAST = B.ID_BROADCAST) AS TOTAL_NUMEROS
            FROM BROADCAST B
            JOIN BOT_REDES BR ON BR.ID_BOT_REDES = B.ID_BOT_REDES AND BR.ID_RED_SOCIAL = 1
            WHERE BR.ID_BOT IN (${botsArr.join(',')})
              ${filtroEmpresa}
              AND CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala') BETWEEN '${inicio}' AND '${fin}'
            ORDER BY B.FECHA_CALENDARIZACION DESC
        `;
        const [rows] = await pool.query(sql, params);
        console.log(`[Campañas] db=${db_key} bots=[${botsArr.join(',')}] empresa=${id_empresa || '(sin filtro)'} -> ${rows.length} campañas`);
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error obteniendo campañas:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Reporte Broadcast
router.post('/api/reportes/broadcast', async (req, res) => {
    const { db_key, id_empresa, id_bots, fecha_inicio, fecha_fin, id_broadcasts } = req.body;
    const botsArr = Array.isArray(id_bots) ? id_bots.map(n => parseInt(n, 10)).filter(Number.isFinite) : [];
    if (!db_key || botsArr.length === 0 || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    try {
        const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
        // Filtro opcional por campañas seleccionadas
        const filtroBroadcasts = Array.isArray(id_broadcasts) && id_broadcasts.length > 0
            ? `AND B.ID_BROADCAST IN (${id_broadcasts.map(n => parseInt(n, 10)).filter(Number.isFinite).join(',')})`
            : '';
        const filtroEmpresa = id_empresa ? 'AND B.ID_EMPRESA = ?' : '';
        const params = id_empresa ? [id_empresa] : [];

        console.log(`[Reporte Broadcast] db=${db_key} empresa=${id_empresa || '-'} bots=[${botsArr.join(',')}] rango=${inicio} -> ${fin} campanias=${id_broadcasts?.length || 'todas'}`);

        const query = `
            SELECT
                BT.DESCRIPCION AS NOMBRE_BOT,
                B.TITULO, 
                DATE_FORMAT(CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala'), '%d/%m/%Y %H:%i') AS CALENDARIZACION,
                DATE_FORMAT(CONVERT_TZ(B.MODIFICADO_EL, 'UTC', 'America/Guatemala'), '%d/%m/%Y %H:%i') AS FINALIZACION,
                NB.ID_RSS_EXTERNO AS TELEFONO,
                DATE_FORMAT(CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala'), '%d/%m/%Y') AS FECHA,
                DATE_FORMAT(CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala'), '%H:%i') AS HORA,
                DATE_FORMAT(CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala'), '%d/%m/%Y %H:%i') AS FECHA_HORA,
                SFC.ID_SESION_FICHA,
                NB.ID_CONVERSACION,
                CASE 
                    WHEN SF.TIPO_SESION = 4 OR SF.TIPO_SESION IS NULL THEN 'BROADCAST SIN RESPUESTA'
                    ELSE 'BROADCAST CON RESPUESTA'
                END AS TIPO_SESION
            FROM BROADCAST B
            JOIN NUMERO_BROADCAST NB ON NB.ID_BROADCAST = B.ID_BROADCAST
            JOIN BOT_REDES BR ON BR.ID_BOT_REDES = B.ID_BOT_REDES AND BR.ID_RED_SOCIAL = 1
            LEFT JOIN BOT BT ON BT.ID_BOT = BR.ID_BOT
            LEFT JOIN SESION_FICHA_CONVERSACION SFC ON SFC.ID_CONVERSACION = NB.ID_CONVERSACION
            LEFT JOIN SESION_FICHA_CLIENTE SF ON SF.ID_SESION_FICHA = SFC.ID_SESION_FICHA
            WHERE BR.ID_BOT IN (${botsArr.join(',')})
              ${filtroEmpresa}
              AND CONVERT_TZ(B.FECHA_CALENDARIZACION, 'UTC', 'America/Guatemala') BETWEEN '${inicio}' AND '${fin}'
              ${filtroBroadcasts}
            ORDER BY B.FECHA_CALENDARIZACION DESC
        `;

        const t0 = Date.now();
        const [results] = await pool.query(query, params);
        console.log(`[Reporte Broadcast] ${results.length} registros en ${Date.now() - t0}ms`);
        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte broadcast:', error);
        res.status(500).json({ error: 'Error al generar reporte Broadcast: ' + error.message });
    }
});

// ==========================================================================
//   BOTS DE EMPRESA (todos, sin filtro de red social) - usado por
//   Operaciones, Resoluciones y API Notificaciones
// ==========================================================================
router.get('/api/reportes/bots-empresa', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    if (!db_key || !id_empresa) {
        return res.status(400).json({ error: 'Faltan parámetros' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    try {
        const [rows] = await pool.query(`
            SELECT B.ID_BOT, B.DESCRIPCION AS NOMBRE_BOT
            FROM BOT B
            WHERE B.ID_EMPRESA = ? AND B.ESTADO = 1
            ORDER BY B.DESCRIPCION
        `, [id_empresa]);
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error obteniendo bots empresa:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================================
//   REPORTE API DE NOTIFICACIONES
// ==========================================================================
router.post('/api/reportes/api-notificaciones', async (req, res) => {
    const { db_key, id_empresa, id_bots, fecha_inicio, fecha_fin } = req.body;
    const botsArr = Array.isArray(id_bots) ? id_bots.map(n => parseInt(n, 10)).filter(Number.isFinite) : [];
    if (!db_key || !id_empresa || botsArr.length === 0 || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    try {
        const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
        console.log(`[Reporte API Notif] db=${db_key} empresa=${id_empresa} bots=[${botsArr.join(',')}] rango=${inicio} -> ${fin}`);

        const query = `
            SELECT  
                (SELECT COUNT(*) 
                 FROM CONVERSACIONES C2 
                 JOIN MENSAJES_CONVERSACION M2 ON M2.ID_CONVERSACION = C2.ID_CONVERSACION 
                 JOIN TIPOS_MENSAJES TM ON TM.TIPO_MENSAJE = M2.TIPO_MENSAJE 
                 WHERE C2.ID_FICHA = C.ID_FICHA 
                   AND C2.ID_BOT_REDES = C.ID_BOT_REDES 
                   AND C2.ID_CONVERSACION >= C.ID_CONVERSACION 
                   AND M2.HORA_SERVER <= DATE_ADD(C.FECHA_CONVERSACION, INTERVAL 1 DAY)
                   AND TM.APLICAR_VALIDACION_SESION = 1
                   AND M2.FLUJO = 1 
                ) AS MENSAJES_CLIENTE, 
                C.ID_CONVERSACION, 
                U2.NOMBRE_USUARIO AS NOMBRE_USUARIO_INICIO,  
                U.NOMBRE_USUARIO AS NOMBRE_USUARIO,
                CVW.ID_RRSS_EXTERNO AS NUMERO_TELEFONO,
                C.ID_FICHA,
                TR.GESTION,                               
                S.NOMBRE_SKILL,                          
                CONVERT_TZ(C.FECHA_CONVERSACION, 'UTC', 'America/Guatemala') AS FECHA_CONVERSACION, 
                CONVERT_TZ(C.FECHA_ATENCION, 'UTC', 'America/Guatemala') AS FECHA_ATENCION, 
                CONVERT_TZ(C.FECHA_FINALIZACION, 'UTC', 'America/Guatemala') AS FECHA_FINALIZACION, 
                C.MODIFICADO_POR, 
                C.MODIFICADO_EL,
                BT.DESCRIPCION AS NOMBRE_BOT
            FROM CONVERSACIONES C
            JOIN BOT_REDES BR ON BR.ID_BOT_REDES = C.ID_BOT_REDES
            JOIN BOT BT ON BT.ID_BOT = BR.ID_BOT
            JOIN USUARIOS U ON C.ID_USUARIO = U.ID_USUARIO            
            JOIN USUARIOS U2 ON C.ID_USUARIO_INICIO = U2.ID_USUARIO  
            JOIN SKILLS S ON C.ID_SKILL = S.ID_SKILL                  
            JOIN TIPOS_GESTION TR ON C.ID_GESTION = TR.ID_TIPO_GESTION
            JOIN CONVERSACIONES_VW CVW ON C.ID_CONVERSACION = CVW.ID_CONVERSACION
            JOIN FICHA_CLIENTE_RED_SOCIAL_VW FCRS 
                ON CVW.ID_RRSS_EXTERNO = FCRS.ID_RRSS_EXTERNO 
                AND CVW.ID_EMPRESA = FCRS.ID_EMPRESA 
            WHERE BR.ID_BOT IN (${botsArr.join(',')})
              AND CVW.ID_EMPRESA = ?
              AND CONVERT_TZ(C.FECHA_CONVERSACION, 'UTC', 'America/Guatemala') BETWEEN '${inicio}' AND '${fin}'
              AND EXISTS (
                  SELECT 1 
                  FROM MENSAJES_CONVERSACION MC 
                  WHERE MC.ID_CONVERSACION = C.ID_CONVERSACION 
                    AND MC.TIPO_MENSAJE = 18 
                    AND MC.CREADO_POR = 'APINOTIFICACIONES'
              )
            ORDER BY C.FECHA_CONVERSACION DESC
        `;

        const t0 = Date.now();
        const [results] = await pool.query(query, [id_empresa]);
        console.log(`[Reporte API Notif] ${results.length} registros en ${Date.now() - t0}ms`);
        
        // Registrar auditoría
        try {
            const auditoria = require('../../modules/Configuraciones/Auditoria/auditoria');
            const { registrarLogInterno } = auditoria;
            if (registrarLogInterno) {
                await registrarLogInterno({
                    tipo_accion: 'REPORTE_GENERA',
                    entidad: 'REPORTES',
                    db_key: db_key,
                    id_empresa: id_empresa,
                    metadata: { 
                        tipo_reporte: 'API_NOTIFICACIONES', 
                        fecha_inicio, 
                        fecha_fin, 
                        id_bots,
                        registros: results.length 
                    },
                    descripcion: `Se generó reporte de API Notificaciones (${results.length} registros)`,
                    exito: true
                });
            }
        } catch (audError) {
            console.error('Error al registrar auditoría de reporte:', audError);
        }

        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte api-notificaciones:', error);
        res.status(500).json({ error: 'Error al generar reporte API Notificaciones: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE NÚMEROS ACTIVOS
// ==========================================================================
router.post('/api/reportes/numeros-activos', async (req, res) => {
    const { db_key, id_empresa } = req.body;
    if (!db_key) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    const empresaClause = id_empresa ? 'AND A.ID_EMPRESA = ?' : '';
    const params = id_empresa ? [id_empresa] : [];
    try {
        const [results] = await pool.query(`
            SELECT 
                A.ID_EMPRESA,
                A.NOMBRE AS NOMBRE_EMPRESA,
                B.ID_BOT,
                B.DESCRIPCION AS NOMBRE_BOT,
                C.ID_BOT_REDES,
                D.VALOR AS NUMERO_ASOCIADO,
                D2.VALOR AS NOMBRE_DEL_APP,
                D3.VALOR AS AUTH_CODE,
                D4.VALOR AS APP_ID,
                D5.VALOR AS ACCESS_TOKEN,
                D6.VALOR AS BUSINESS_ID,
                D7.VALOR AS VERSION
            FROM EMPRESAS A
            JOIN BOT B ON B.ID_EMPRESA = A.ID_EMPRESA
            JOIN BOT_REDES C ON B.ID_BOT = C.ID_BOT
            JOIN BOT_RED_CONF_VALORES D ON C.ID_BOT_REDES = D.ID_BOT_REDES AND D.ID_BOT_RED_CONFIGURACION = 1
            LEFT JOIN BOT_RED_CONF_VALORES D2 ON C.ID_BOT_REDES = D2.ID_BOT_REDES AND D2.ID_BOT_RED_CONFIGURACION = 14
            LEFT JOIN BOT_RED_CONF_VALORES D3 ON C.ID_BOT_REDES = D3.ID_BOT_REDES AND D3.ID_BOT_RED_CONFIGURACION = 20
            LEFT JOIN BOT_RED_CONF_VALORES D4 ON C.ID_BOT_REDES = D4.ID_BOT_REDES AND D4.ID_BOT_RED_CONFIGURACION = 21
            LEFT JOIN BOT_RED_CONF_VALORES D5 ON C.ID_BOT_REDES = D5.ID_BOT_REDES AND D5.ID_BOT_RED_CONFIGURACION = 19
            LEFT JOIN BOT_RED_CONF_VALORES D6 ON C.ID_BOT_REDES = D6.ID_BOT_REDES AND D6.ID_BOT_RED_CONFIGURACION = 23
            LEFT JOIN BOT_RED_CONF_VALORES D7 ON C.ID_BOT_REDES = D7.ID_BOT_REDES AND D7.ID_BOT_RED_CONFIGURACION = 18
            WHERE C.ID_RED_SOCIAL = 1
              AND A.ESTADO = 1
              AND B.ESTADO = 1
              ${empresaClause}
            ORDER BY A.NOMBRE, B.DESCRIPCION, D.VALOR
        `, params);
        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte numeros-activos:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE RESOLUCIONES POR PALABRA
//   Ficohsa: usa TEP (columna extra); ambas versiones comparten la misma query
//   flujo: 1=entrante, 2=saliente
// ==========================================================================
router.post('/api/reportes/resoluciones-palabra', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, texto_buscar, flujo } = req.body;
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin || !texto_buscar) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (db_key, id_empresa, fecha_inicio, fecha_fin, texto_buscar)' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    const flujoInt = flujo ? parseInt(flujo, 10) : null;
    if (flujoInt !== null && flujoInt !== 1 && flujoInt !== 2) {
        return res.status(400).json({ error: 'flujo debe ser 1 (entrante) o 2 (saliente)' });
    }

    const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
    const likeTexto = `%${texto_buscar}%`;
    const flujoClause = flujoInt !== null ? `AND FLUJO = ${flujoInt}` : '';

    try {
        // Paso 1: obtener el conjunto pequeño de conversaciones del periodo para la empresa
        const [convRows] = await pool.query(`
            SELECT RS.ID_CONVERSACION
            FROM REPORTE_RESOLUCIONES RS
            WHERE RS.ID_EMPRESA = ?
              AND RS.FECHA_HORA_INICIO BETWEEN
                CONVERT_TZ(?, 'America/Guatemala', 'UTC')
                AND CONVERT_TZ(?, 'America/Guatemala', 'UTC')
              AND EXISTS (SELECT 1 FROM PERMISOS_USUARIOS_SKILLS PUS WHERE PUS.ID_SKILL = RS.ID_SKILL)
              AND EXISTS (SELECT 1 FROM PERMISOS_USUARIOS_CLIENTES PUC WHERE PUC.ID_TIPO_CLIENTE = RS.ID_TIPO_CLIENTE)
        `, [id_empresa, inicio, fin]);

        if (convRows.length === 0) return res.json([]);

        const convIds = convRows.map(r => r.ID_CONVERSACION);
        const flujoFilter = flujoInt !== null ? `AND FLUJO = ${flujoInt}` : '';
        const CHUNK = 1000;

        // Helper: partir array en chunks
        const toChunks = (arr) => {
            const out = [];
            for (let i = 0; i < arr.length; i += CHUNK) out.push(arr.slice(i, i + CHUNK));
            return out;
        };

        // Paso 2: LIKE solo en las conversaciones del periodo — todos los chunks en paralelo
        const msgChunks = await Promise.all(
            toChunks(convIds).map(chunk => {
                const ph = chunk.map(() => '?').join(',');
                return pool.query(`
                    SELECT ID_CONVERSACION, MIN(MENSAJE) AS MENSAJE
                    FROM MENSAJES_CONVERSACION
                    WHERE ID_CONVERSACION IN (${ph})
                      AND MENSAJE LIKE ?
                      ${flujoFilter}
                    GROUP BY ID_CONVERSACION
                `, [...chunk, likeTexto]).then(([rows]) => rows);
            })
        );
        const msgRows = msgChunks.flat();

        if (msgRows.length === 0) return res.json([]);

        const matchedIds = msgRows.map(r => r.ID_CONVERSACION);
        const msgMap = Object.fromEntries(msgRows.map(r => [r.ID_CONVERSACION, r.MENSAJE]));

        // Paso 3: datos del reporte solo para matches — todos los chunks en paralelo
        const rsChunks = await Promise.all(
            toChunks(matchedIds).map(chunk => {
                const ph = chunk.map(() => '?').join(',');
                return pool.query(`
                    SELECT 
                        RS.ID_CONVERSACION,
                        RS.NOMBRE_USUARIO_INICIO AS 'Operador Abre',
                        RS.NOMBRE_USUARIO_FINALIZA AS 'Operador Cierre',
                        RS.NOMBRE_RED_SOCIAL AS 'Red Social',
                        RS.NOMBRE_BOT AS 'Canal',
                        RS.ORIGEN AS 'Destino',
                        'Inicio Caso' AS 'Evento',
                        DATE(CONVERT_TZ(RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala')) AS 'Fecha',
                        TIME(CONVERT_TZ(RS.FECHA_HORA_INICIO, 'UTC', 'America/Guatemala')) AS 'Hora',
                        'Fin Caso' AS 'Evento ',
                        DATE(CONVERT_TZ(RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala')) AS 'Fecha ',
                        TIME(CONVERT_TZ(RS.FECHA_HORA_FINAL, 'UTC', 'America/Guatemala')) AS 'Hora ',
                        RS.DURACION AS 'Duracion',
                        RS.TME_CLIENTE AS 'Tiempo 1er Respuesta',
                        CONVERT_TZ(RS.PRIMER_RESPUESTA, 'UTC', 'America/Guatemala') AS 'TS 1er Respuesta',
                        RS.TIEMPO_COLA AS 'Tiempo en Cola',
                        RS.TME,
                        RS.GESTION AS 'Gestion',
                        TR.RESOLUCION AS 'Tipo Resolucion',
                        R.RESOLUCION AS 'Resolucion',
                        R.OPCION_BOT AS 'Opcion Menu Bot',
                        SK.NOMBRE_SKILL AS 'Skill'
                    FROM REPORTE_RESOLUCIONES RS
                    INNER JOIN RESOLUCIONES R ON R.ID_RESOLUCION = RS.ID_RESOLUCION
                    INNER JOIN TIPOS_RESOLUCIONES TR ON TR.ID_TIPO_RESOLUCION = R.TIPO_RESOLUCION
                    INNER JOIN SKILLS SK ON SK.ID_SKILL = RS.ID_SKILL
                    WHERE RS.ID_CONVERSACION IN (${ph})
                `, chunk).then(([rows]) => rows);
            })
        );
        const rsRows = rsChunks.flat();

        // Paso 4: unir mensaje en Node y ordenar
        rsRows.sort((a, b) => new Date(a['Fecha Inicio'] + ' ' + a['Hora Inicio']) < new Date(b['Fecha Inicio'] + ' ' + b['Hora Inicio']) ? 1 : -1);
        const results = rsRows.map(row => {
            const r = { ...row };
            r['Mensaje'] = msgMap[row.ID_CONVERSACION] || '';
            delete r.ID_CONVERSACION;
            return r;
        });

        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte resoluciones-palabra:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE CAMPAÑAS
// ==========================================================================
router.post('/api/reportes/campanias-reporte', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, id_bots } = req.body;
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
    const botsArr = Array.isArray(id_bots) && id_bots.length > 0
        ? id_bots.map(n => parseInt(n, 10)).filter(Number.isFinite)
        : [];
    const botClause = botsArr.length > 0 ? `AND ID_BOT IN (${botsArr.join(',')})` : '';
    try {
        const [results] = await pool.query(`
            SELECT
                NOMBRE_CANAL AS CANAL,
                TITULO AS CAMPAÑA,
                CONVERT_TZ(FECHA, 'UTC', 'America/Guatemala') AS FECHA,
                CANAL AS TIPO,
                CONVERT_TZ(PROGRAMADO_FECHA, 'UTC', 'America/Guatemala') AS PROGRAMADO,
                ESTADO,
                NUMEROS,
                MENSAJES,
                ENTREGADOS AS ENVIADOS,
                CASE
                    WHEN NUMEROS > 0 THEN CONCAT(ROUND((ENTREGADOS / NUMEROS) * 100, 2), '%')
                    ELSE '0%'
                END AS ENTREGADO,
                CREADO_POR
            FROM REPORTE_EFECTIVIAD_BROADCAST
            WHERE ID_EMPRESA = ?
              AND CONVERT_TZ(PROGRAMADO_FECHA, 'UTC', 'America/Guatemala') BETWEEN ? AND ?
              ${botClause}
            ORDER BY PROGRAMADO_FECHA DESC
        `, [id_empresa, inicio, fin]);
        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte campanias-reporte:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

// ==========================================================================
//   HELPER: Formularios disponibles por bot (para Reporte Respuestas)
// ==========================================================================
router.get('/api/reportes/formularios-bot', async (req, res) => {
    const { db_key, id_bot, id_bots } = req.query;
    if (!db_key) return res.status(400).json({ error: 'Faltan parámetros' });
    // Soporta id_bots=1,2,3 o id_bot=1 (legacy)
    const botsRaw = id_bots ? id_bots.split(',') : (id_bot ? [id_bot] : []);
    const botsArr = botsRaw.map(n => parseInt(n, 10)).filter(Number.isFinite);
    if (botsArr.length === 0) return res.status(400).json({ error: 'Debe indicar al menos un bot' });
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    const placeholders = botsArr.map(() => '?').join(',');
    try {
        const [rows] = await pool.query(`
            SELECT DISTINCT BF.ID_BOT_FORMULARIO, BF.NOMBRE
            FROM BOT_FORMULARIO BF
            JOIN BOT_MENU BM ON BM.ID_BOT_MENU = BF.ID_BOT_MENU
            WHERE BM.ID_BOT IN (${placeholders})
              AND BF.ESTADO = 1
            ORDER BY BF.NOMBRE
        `, botsArr);
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error en formularios-bot:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==========================================================================
//   REPORTE RESPUESTAS (BOT_RESPUESTA_HIST)
// ==========================================================================
router.post('/api/reportes/respuestas', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin, id_bot, id_bots, id_formulario } = req.body;
    // Soporta id_bots[] (multi) o id_bot (legacy single)
    const botsRaw = Array.isArray(id_bots) && id_bots.length > 0 ? id_bots : (id_bot ? [id_bot] : []);
    const botsArr = botsRaw.map(n => parseInt(n, 10)).filter(Number.isFinite);
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin || botsArr.length === 0 || !id_formulario) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (db_key, id_empresa, fecha_inicio, fecha_fin, id_bot/id_bots, id_formulario)' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });
    const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);
    const botPlaceholders = botsArr.map(() => '?').join(',');
    try {
        const [results] = await pool.query(`
            SELECT
                FCRS.ID_RRSS_EXTERNO,
                GROUP_CONCAT(
                    CONCAT(REPLACE(BRH.PREGUNTA, ',', ' '), ',', REPLACE(BRH.RESPUESTA, ',', ' '))
                    ORDER BY BRH.CREADO_EL
                ) AS CONTENIDO,
                MAX(BRH.CREADO_EL) AS CREADO_EL,
                FCRS.ID_RED_SOCIAL,
                RED.NOMBRE AS NOMBRE_RED,
                FC.ID_EMPRESA,
                BRH.ID_FICHA,
                BRH.ID_BOT_FORMULARIO_REF AS ID_BOT_FORMULARIO,
                BRH.ID_CONVERSACION,
                (SELECT CV.ID_CONVERSACION
                 FROM CONVERSACIONES CV
                 JOIN CONS_BITACORA_OPERACIONAL_VW CBOV ON CBOV.ID_CONVERSACION = CV.ID_CONVERSACION
                 WHERE CV.ID_FICHA = BRH.ID_FICHA
                   AND CV.ID_BOT_REDES = C.ID_BOT_REDES
                   AND CV.ID_CONVERSACION = (
                       SELECT MAX(CV2.ID_CONVERSACION) FROM CONVERSACIONES CV2
                       WHERE CV2.ID_FICHA = BRH.ID_FICHA
                         AND CV2.ID_BOT_REDES = C.ID_BOT_REDES
                         AND CV2.ID_CONVERSACION < BRH.ID_CONVERSACION
                   )
                   AND CBOV.ID_CATEGORIA = 90
                ) AS ID_CONVERSACION_ORIGEN,
                (SELECT U.NOMBRE_USUARIO
                 FROM CONVERSACIONES CV
                 JOIN CONS_BITACORA_OPERACIONAL_VW CBOV ON CBOV.ID_CONVERSACION = CV.ID_CONVERSACION
                 JOIN USUARIOS U ON U.ID_USUARIO = CV.ID_USUARIO
                 WHERE CV.ID_FICHA = BRH.ID_FICHA
                   AND CV.ID_BOT_REDES = C.ID_BOT_REDES
                   AND CV.ID_CONVERSACION = (
                       SELECT MAX(CV2.ID_CONVERSACION) FROM CONVERSACIONES CV2
                       WHERE CV2.ID_FICHA = BRH.ID_FICHA
                         AND CV2.ID_BOT_REDES = C.ID_BOT_REDES
                         AND CV2.ID_CONVERSACION < BRH.ID_CONVERSACION
                   )
                   AND CBOV.ID_CATEGORIA = 90
                ) AS USUARIO_ORIGEN
            FROM BOT_RESPUESTA_HIST BRH
            JOIN CONVERSACIONES_VW C ON C.ID_CONVERSACION = BRH.ID_CONVERSACION
            JOIN BOT_REDES BR ON BR.ID_BOT_REDES = C.ID_BOT_REDES AND BR.ESTADO = 1
            JOIN BOT B ON B.ID_BOT = BR.ID_BOT AND B.ESTADO = 1
            JOIN FICHA_CLIENTE FC ON FC.ID_FICHA = BRH.ID_FICHA
            JOIN FICHA_CLIENTE_RED_SOCIAL FCRS ON FCRS.ID_FICHA = BRH.ID_FICHA AND FCRS.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
            JOIN REDES_SOCIALES RED ON RED.ID_RED_SOCIAL = FCRS.ID_RED_SOCIAL
            WHERE CONVERT_TZ(BRH.CREADO_EL, 'UTC', 'America/Guatemala') BETWEEN ? AND ?
              AND B.ID_BOT IN (${botPlaceholders})
              AND FC.ID_EMPRESA = ?
              AND BRH.ID_BOT_FORMULARIO_REF = ?
            GROUP BY FCRS.ID_RRSS_EXTERNO, FCRS.ID_RED_SOCIAL, RED.NOMBRE, FC.ID_EMPRESA,
                     BRH.ID_FICHA, BRH.ID_BOT_FORMULARIO_REF, BRH.ID_CONVERSACION
            ORDER BY MAX(BRH.CREADO_EL) DESC
        `, [inicio, fin, ...botsArr, id_empresa, id_formulario]);
        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte respuestas:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

// ==========================================================================
//   LISTAR NOTAS RÁPIDAS (para dropdown)
// ==========================================================================
router.get('/api/notas-rapidas', async (req, res) => {
    const { db_key, id_empresa } = req.query;
    
    if (!db_key) {
        return res.status(400).json({ error: 'Falta db_key' });
    }
    
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        let whereConditions = [];
        let params = [];
        
        if (id_empresa && id_empresa !== 'null' && id_empresa !== '') {
            whereConditions.push('A.ID_EMPRESA = ?');
            params.push(id_empresa);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        const [rows] = await pool.query(`
            SELECT 
                A.ID_NOTA_RAPIDA,
                A.NOMBRE,
                A.ESTADO
            FROM NOTAS_RAPIDAS A
            ${whereClause}
            ORDER BY A.NOMBRE
        `, params);
        
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error al listar notas rápidas:', error);
        res.status(500).json({ error: 'Error al obtener notas rápidas: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE NOTAS RÁPIDAS
// ==========================================================================
router.post('/api/reportes/notasrapidas', async (req, res) => {
    const { db_key, id_empresa, id_nota_rapida, estado } = req.body;
    
    if (!db_key) {
        return res.status(400).json({ error: 'Falta db_key' });
    }
    
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        let whereConditions = [];
        let params = [];
        
        if (id_empresa) {
            whereConditions.push('A.ID_EMPRESA = ?');
            params.push(id_empresa);
        }
        
        if (id_nota_rapida && id_nota_rapida !== '') {
            whereConditions.push('A.ID_NOTA_RAPIDA = ?');
            params.push(id_nota_rapida);
        }
        
        if (estado !== undefined && estado !== null && estado !== '') {
            whereConditions.push('A.ESTADO = ?');
            params.push(estado);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        const [rows] = await pool.query(`
            SELECT 
                B.NOMBRE AS NOMBRE_EMPRESA,
                A.NOMBRE AS NOMBRE_NOTA_RAPIDA,
                A.TEXTO,
                CASE 
                    WHEN A.ESTADO = 1 THEN 'ALTA'
                    WHEN A.ESTADO = 0 THEN 'BAJA'
                    ELSE 'DESCONOCIDO'
                END AS ESTADO
            FROM NOTAS_RAPIDAS A
            INNER JOIN EMPRESAS B ON A.ID_EMPRESA = B.ID_EMPRESA
            ${whereClause}
            ORDER BY B.NOMBRE, A.NOMBRE
        `, params);
        
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte notas rápidas:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE SKILLS (Maestro de Skills con Horarios)
// ==========================================================================
router.post('/api/reportes/skills', async (req, res) => {
    const { db_key, id_empresa, skills, estado, eliminado } = req.body;
    
    if (!db_key) {
        return res.status(400).json({ error: 'Falta db_key' });
    }
    
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    try {
        let whereConditions = [];
        let params = [];
        
        if (id_empresa) {
            whereConditions.push('A.ID_EMPRESA = ?');
            params.push(id_empresa);
        }
        
        if (skills && skills.length > 0) {
            const placeholders = skills.map(() => '?').join(',');
            whereConditions.push(`A.ID_SKILL IN (${placeholders})`);
            params.push(...skills);
        }
        
        if (estado !== undefined && estado !== null && estado !== '') {
            whereConditions.push('A.ESTADO = ?');
            params.push(estado);
        }
        
        if (eliminado !== undefined && eliminado !== null && eliminado !== '') {
            whereConditions.push('A.ELIMINADO = ?');
            params.push(eliminado);
        }
        
        const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';
        
        const [rows] = await pool.query(`
            SELECT
                B.NOMBRE AS NOMBRE_EMPRESA,
                A.ID_SKILL,
                A.NOMBRE_SKILL,
                CASE 
                    WHEN A.ESTADO = 1 THEN 'ALTA'
                    WHEN A.ESTADO = 0 THEN 'BAJA'
                    ELSE 'DESCONOCIDO'
                END AS ESTADO,
                A.MENSAJE AS MENSAJE_FUERA_HORARIO,
                CASE 
                    WHEN A.ELIMINADO = 0 THEN 'ACTIVO'
                    WHEN A.ELIMINADO = 1 THEN 'ELIMINADO'
                    ELSE 'DESCONOCIDO'
                END AS ELIMINADO,
                TIME_FORMAT(CONVERT_TZ(C.DESDE, '+00:00', '-06:00'), '%h:%i %p') AS DESDE,
                TIME_FORMAT(CONVERT_TZ(C.HASTA, '+00:00', '-06:00'), '%h:%i %p') AS HASTA,
                CONCAT(
                    CASE WHEN SUBSTRING(C.DIAS,1,1) = '1' THEN 'L ' ELSE '- ' END,
                    CASE WHEN SUBSTRING(C.DIAS,2,1) = '1' THEN 'M ' ELSE '- ' END,
                    CASE WHEN SUBSTRING(C.DIAS,3,1) = '1' THEN 'M ' ELSE '- ' END,
                    CASE WHEN SUBSTRING(C.DIAS,4,1) = '1' THEN 'J ' ELSE '- ' END,
                    CASE WHEN SUBSTRING(C.DIAS,5,1) = '1' THEN 'V ' ELSE '- ' END,
                    CASE WHEN SUBSTRING(C.DIAS,6,1) = '1' THEN 'S ' ELSE '- ' END,
                    CASE WHEN SUBSTRING(C.DIAS,7,1) = '1' THEN 'D' ELSE '-' END
                ) AS DIAS_ACTIVOS
            FROM SKILLS A
            INNER JOIN EMPRESAS B ON A.ID_EMPRESA = B.ID_EMPRESA
            LEFT JOIN HORARIO_SKILL C ON A.ID_SKILL = C.ID_SKILL
            ${whereClause}
            ORDER BY B.NOMBRE, A.NOMBRE_SKILL
        `, params);
        
        res.json(rows.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte skills:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

// ==========================================================================
//   REPORTE SESIONES
//   Segmento depende de la base de datos seleccionada
// ==========================================================================
router.post('/api/reportes/sesiones', async (req, res) => {
    const { db_key, id_empresa, fecha_inicio, fecha_fin } = req.body;
    if (!db_key || !id_empresa || !fecha_inicio || !fecha_fin) {
        return res.status(400).json({ error: 'Faltan parámetros requeridos (db_key, id_empresa, fecha_inicio, fecha_fin)' });
    }
    const pool = pools[db_key];
    if (!pool) return res.status(400).json({ error: 'Base de datos no válida' });

    const { inicio, fin } = buildDateRange(fecha_inicio, fecha_fin);

    // Mapeo de db_key a segmento
    const segmentoMap = {
        'db_1': 'S1',
        'db_2': 'S2',
        'db_3': 'S3',
        'db_4': 'S4',
        'db_5': 'MDD',
        'db_6': 'FS1',
        'db_7': 'FS2',
        'db_8': 'FS3',
        'db_9': 'MST',
        'db_10': 'MSF'
    };
    const segmento = segmentoMap[db_key] || db_key.toUpperCase();

    try {
        const [results] = await pool.query(`
            SELECT ? AS SEGMENTO, 
                   IFNULL(
                       (SELECT C.NOMBRE AS CORPORACION
                        FROM CORPORACIONES C,
                             CORPORACION_EMPRESAS CEC
                        WHERE C.ESTADO = 1
                          AND C.ID_CORPORACION = CEC.ID_CORPORACION
                          AND CEC.ID_EMPRESA = E.ID_EMPRESA
                          AND E.ESTADO = 1), 
                       E.NOMBRE) AS CORPORACION,
                   E.NOMBRE AS NOMBRE_EMPRESA, 
                   B.DESCRIPCION AS NOMBRE_BOT, 
                   RS.NOMBRE AS NOMBRE_RED_SOCIAL, 
                   SF.ID_SESION_FICHA,
                   CASE SF.TIPO_SESION 
                       WHEN 1 THEN 'INICIADA CLIENTE' 
                       WHEN 2 THEN 'INICIADA EMPRESA' 
                       WHEN 3 THEN 'INICIADA CLIENTE SIN RESPUESTA' 
                       WHEN 4 THEN 'BROADCAST SIN RESPUESTA' 
                       WHEN 5 THEN 'BROADCAST CON RESPUESTA' 
                   END AS TIPO_SESION,
                   FCRS.ID_RRSS_EXTERNO, 
                   (SELECT COUNT(MC.ID_MENSAJE)
                    FROM SESION_FICHA_CONVERSACION SFC 
                    JOIN MENSAJES_CONVERSACION MC ON MC.ID_CONVERSACION = SFC.ID_CONVERSACION
                    JOIN TIPOS_MENSAJES TM ON TM.TIPO_MENSAJE = MC.TIPO_MENSAJE
                    WHERE TM.APLICAR_VALIDACION_SESION = 1
                      AND SFC.ID_SESION_FICHA = SF.ID_SESION_FICHA) AS CNT_MENSAJES, 
                   DATE_ADD(SF.FECHA_INICIO, INTERVAL -6 HOUR) AS FECHA_INICIO, 
                   DATE_ADD(IFNULL(SF.FECHA_FIN, DATE_ADD(SF.FECHA_INICIO, INTERVAL 1 DAY)), INTERVAL -6 HOUR) AS FECHA_FIN,
                   SF.ID_ACUMULADOR, 
                   SF.ID_ACUMULADOR_OUTBOUND, 
                   B.ID_BOT
            FROM SESION_FICHA_CLIENTE SF 
            JOIN BOT_REDES BR ON BR.ID_BOT_REDES = SF.ID_BOT_REDES 
            JOIN REDES_SOCIALES RS ON RS.ID_RED_SOCIAL = BR.ID_RED_SOCIAL
            JOIN FICHA_CLIENTE_RED_SOCIAL FCRS ON FCRS.ID_FICHA = SF.ID_FICHA AND FCRS.ID_RED_SOCIAL = RS.ID_RED_SOCIAL
            JOIN BOT B ON B.ID_BOT = BR.ID_BOT 
            JOIN EMPRESAS E ON E.ID_EMPRESA = B.ID_EMPRESA 
            WHERE (
                (SF.ID_ACUMULADOR IN (
                     SELECT A.ID_ACUMULADOR 
                     FROM ACUMULADOR A 
                     WHERE DATE_FORMAT(CONVERT_TZ(A.FECHA_INICIO, 'UTC', 'America/Guatemala'), '%Y%m') 
                           BETWEEN DATE_FORMAT(?, '%Y%m') AND DATE_FORMAT(?, '%Y%m')
                 ) 
                 OR SF.ID_ACUMULADOR_OUTBOUND IN (
                     SELECT A.ID_ACUMULADOR 
                     FROM ACUMULADOR A 
                     WHERE DATE_FORMAT(CONVERT_TZ(A.FECHA_INICIO, 'UTC', 'America/Guatemala'), '%Y%m') 
                           BETWEEN DATE_FORMAT(?, '%Y%m') AND DATE_FORMAT(?, '%Y%m')
                 )) 
                OR (
                     DATE_FORMAT(CONVERT_TZ(SF.CREADO_EL, 'UTC', 'America/Guatemala'), '%Y%m') 
                     BETWEEN DATE_FORMAT(?, '%Y%m') AND DATE_FORMAT(?, '%Y%m')
                )
            )
            AND CONVERT_TZ(SF.CREADO_EL, 'UTC', 'America/Guatemala') BETWEEN ? AND ?
            AND RS.ID_RED_SOCIAL != 6
            AND E.ID_EMPRESA = ?
            ORDER BY E.ID_EMPRESA, SF.ID_SESION_FICHA
        `, [segmento, inicio, fin, inicio, fin, inicio, fin, inicio, fin, id_empresa]);
        res.json(results.map(limpiarFila));
    } catch (error) {
        console.error('Error en reporte sesiones:', error);
        res.status(500).json({ error: 'Error al generar reporte: ' + error.message });
    }
});

module.exports = router;
