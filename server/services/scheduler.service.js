const express = require('express');
const fs = require('fs');
const path = require('path');
const cron = require('node-cron');
const ExcelJS = require('exceljs');
const pools = require('./db');
const emailService = require('./email.service');
const router = express.Router();

const db = pools.control;

// ==========================================================================
//   DB: leer y guardar configuracion
// ==========================================================================
function tryParseJSON(val, def) {
    if (!val) return def;
    try { return JSON.parse(val); } catch { return def; }
}

async function leerConfig() {
    const [[job]] = await db.query(`
        SELECT ID_JOB, NOMBRE, TIME_FORMAT(HORA_GT,'%H:%i') AS hora, ACTIVO AS activo
        FROM SCHEDULER_REPORTES LIMIT 1
    `);
    if (!job) return { id_job: null, hora: '07:00', activo: false, reportes: [] };

    const [detalles] = await db.query(`
        SELECT CLAVE AS clave, NOMBRE AS nombre, TIPO_REPORTE AS tipo_reporte,
               DB_KEY AS db_key, ID_EMPRESA AS id_empresa, CARPETA AS carpeta,
               ACTIVO AS activo,
               IFNULL(FORMATO,'xlsx') AS formato,
               SKILLS AS skills, ID_BOTS AS id_bots,
               ID_BROADCASTS AS id_broadcasts,
               ID_FORMULARIO AS id_formulario,
               TEXTO_BUSCAR AS texto_buscar, FLUJO AS flujo
        FROM SCHEDULER_REPORTES_DETALLE WHERE ID_JOB = ?
    `, [job.ID_JOB]);

    return {
        id_job: job.ID_JOB,
        hora: job.hora,
        activo: !!job.activo,
        reportes: detalles.map(d => ({
            ...d,
            activo: !!d.activo,
            skills:        tryParseJSON(d.skills, []),
            id_bots:       tryParseJSON(d.id_bots, []),
            id_broadcasts: tryParseJSON(d.id_broadcasts, []),
        }))
    };
}

async function guardarConfig(config) {
    const { id_job, hora, activo, reportes } = config;
    await db.query(
        `UPDATE SCHEDULER_REPORTES SET HORA_GT = ?, ACTIVO = ? WHERE ID_JOB = ?`,
        [hora + ':00', activo ? 1 : 0, id_job]
    );
    for (const r of reportes) {
        await db.query(`
            UPDATE SCHEDULER_REPORTES_DETALLE
            SET CARPETA = ?, ACTIVO = ?, FORMATO = ?,
                SKILLS = ?, ID_BOTS = ?, ID_BROADCASTS = ?,
                ID_FORMULARIO = ?, TEXTO_BUSCAR = ?, FLUJO = ?
            WHERE ID_JOB = ? AND CLAVE = ?
        `, [
            r.carpeta, r.activo ? 1 : 0, r.formato || 'xlsx',
            r.skills?.length        ? JSON.stringify(r.skills)        : null,
            r.id_bots?.length       ? JSON.stringify(r.id_bots)       : null,
            r.id_broadcasts?.length ? JSON.stringify(r.id_broadcasts) : null,
            r.id_formulario || null, r.texto_buscar || null, r.flujo || null,
            id_job, r.clave
        ]);
    }
}

async function guardarLog(id_job, fechaEjecucion, entrada) {
    try {
        await db.query(`
            INSERT INTO SCHEDULER_LOG 
                (ID_JOB, FECHA_EJECUCION, CLAVE, REPORTE, TIPO_REPORTE, OK, REGISTROS, ARCHIVO, ERROR)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                REPORTE = VALUES(REPORTE),
                TIPO_REPORTE = VALUES(TIPO_REPORTE),
                OK = VALUES(OK),
                REGISTROS = VALUES(REGISTROS),
                ARCHIVO = VALUES(ARCHIVO),
                ERROR = VALUES(ERROR)
        `, [
            id_job, 
            fechaEjecucion, 
            entrada.clave, 
            entrada.reporte || null,
            entrada.tipo_reporte || null,
            entrada.ok ? 1 : 0,
            entrada.registros || null, 
            entrada.archivo || null, 
            entrada.error || null
        ]);
    } catch (e) {
        console.error('[Scheduler] Error guardando log:', e.message);
    }
}

// ==========================================================================
//   Cron job
// ==========================================================================
let cronJob = null;

async function programarCron() {
    if (cronJob) { cronJob.stop(); cronJob = null; }
    try {
        const config = await leerConfig();
        if (!config.activo || !config.hora) {
            console.log('[Scheduler] Desactivado o sin hora configurada');
            return;
        }
        const [hh, mm] = config.hora.split(':').map(Number);
        const hhUTC = (hh + 6) % 24;
        const expresion = `${mm} ${hhUTC} * * *`;

        cronJob = cron.schedule(expresion, async () => {
            console.log(`[Scheduler] ⏰ Ejecutando reportes (${config.hora} GT)...`);
            try {
                const cfg = await leerConfig();
                const resultado = await ejecutarReportesScheduled(cfg);
                console.log('[Scheduler] ✅ Completado:', JSON.stringify(resultado.log));
            } catch (e) {
                console.error('[Scheduler] ❌ Error:', e.message);
            }
        }, { timezone: 'UTC' });

        console.log(`[Scheduler] ✅ Programado para las ${config.hora} GT → cron: ${expresion} UTC`);
    } catch (e) {
        console.error('[Scheduler] Error programando cron:', e.message);
    }
}

// ==========================================================================
//   GET /api/scheduler/config
// ==========================================================================
router.get('/api/scheduler/config', async (req, res) => {
    try { res.json(await leerConfig()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================================================
//   POST /api/scheduler/config
// ==========================================================================
router.post('/api/scheduler/config', async (req, res) => {
    try {
        const config = req.body;
        await guardarConfig(config);
        await programarCron();
        const [hh, mm] = (config.hora || '07:00').split(':').map(Number);
        const hhUTC = (hh + 6) % 24;
        res.json({ ok: true, cron: `${mm} ${hhUTC} * * * UTC`, activo: config.activo });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================================================
//   GET /api/scheduler/log  — historial de ejecuciones
// ==========================================================================
router.get('/api/scheduler/log', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT L.ID_LOG, L.FECHA_EJECUCION, L.CLAVE,
                   DATE_FORMAT(
                       CONVERT_TZ(L.EJECUTADO_EL, @@session.time_zone, 'America/Guatemala'),
                       '%Y-%m-%d %H:%i:%s'
                   ) AS EJECUTADO_EL,
                   COALESCE(D.NOMBRE, L.REPORTE, L.CLAVE) AS NOMBRE,
                   COALESCE(D.TIPO_REPORTE, L.TIPO_REPORTE, 'desconocido') AS TIPO,
                   L.OK, L.REGISTROS, L.ARCHIVO, L.ERROR
            FROM SCHEDULER_LOG L
            LEFT JOIN SCHEDULER_REPORTES_DETALLE D ON D.ID_JOB = L.ID_JOB AND D.CLAVE = L.CLAVE
            ORDER BY L.EJECUTADO_EL DESC
            LIMIT 100
        `);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================================================
//   POST /api/scheduler/reporte/agregar  — añadir nuevo reporte al job
// ==========================================================================
router.post('/api/scheduler/reporte/agregar', async (req, res) => {
    try {
        const { clave, nombre, tipo_reporte, db_key, id_empresa, carpeta, formato } = req.body;
        const config = await leerConfig();
        if (!config.id_job) return res.status(400).json({ error: 'No existe un job configurado' });
        const { skills, id_bots, id_broadcasts, id_formulario, texto_buscar, flujo } = req.body;
        await db.query(`
            INSERT INTO SCHEDULER_REPORTES_DETALLE
                (ID_JOB, CLAVE, NOMBRE, TIPO_REPORTE, DB_KEY, ID_EMPRESA, CARPETA, ACTIVO,
                 FORMATO, SKILLS, ID_BOTS, ID_BROADCASTS, ID_FORMULARIO, TEXTO_BUSCAR, FLUJO)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                NOMBRE=VALUES(NOMBRE), TIPO_REPORTE=VALUES(TIPO_REPORTE),
                DB_KEY=VALUES(DB_KEY), ID_EMPRESA=VALUES(ID_EMPRESA),
                CARPETA=VALUES(CARPETA), FORMATO=VALUES(FORMATO),
                SKILLS=VALUES(SKILLS), ID_BOTS=VALUES(ID_BOTS),
                ID_BROADCASTS=VALUES(ID_BROADCASTS), ID_FORMULARIO=VALUES(ID_FORMULARIO),
                TEXTO_BUSCAR=VALUES(TEXTO_BUSCAR), FLUJO=VALUES(FLUJO), ACTIVO=1
        `, [
            config.id_job, clave, nombre, tipo_reporte, db_key, id_empresa, carpeta,
            formato || 'xlsx',
            skills?.length        ? JSON.stringify(skills)        : null,
            id_bots?.length       ? JSON.stringify(id_bots)       : null,
            id_broadcasts?.length ? JSON.stringify(id_broadcasts) : null,
            id_formulario || null, texto_buscar || null, flujo || null
        ]);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================================================
//   DELETE /api/scheduler/reporte/:clave  — eliminar reporte del job
// ==========================================================================
router.delete('/api/scheduler/reporte/:clave', async (req, res) => {
    try {
        const config = await leerConfig();
        await db.query(
            `DELETE FROM SCHEDULER_REPORTES_DETALLE WHERE ID_JOB = ? AND CLAVE = ?`,
            [config.id_job, req.params.clave]
        );
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================================================
//   POST /api/scheduler/ejecutar-ahora
// ==========================================================================
router.post('/api/scheduler/ejecutar-ahora', async (req, res) => {
    try {
        const config = await leerConfig();
        const resultado = await ejecutarReportesScheduled(config);
        res.json(resultado);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// ==========================================================================
//   POST /api/scheduler/reintentar  — reejecutar un reporte desde el historial
// ==========================================================================
router.post('/api/scheduler/reintentar', async (req, res) => {
    try {
        const { id_log } = req.body;
        if (!id_log) return res.status(400).json({ error: 'Falta id_log' });

        // Buscar el log en el historial
        const [[logRow]] = await db.query(`
            SELECT L.*, D.TIPO_REPORTE, D.DB_KEY, D.ID_EMPRESA, D.CARPETA, D.NOMBRE,
                   D.FORMATO, D.SKILLS, D.ID_BOTS, D.ID_BROADCASTS, 
                   D.ID_FORMULARIO, D.TEXTO_BUSCAR, D.FLUJO
            FROM SCHEDULER_LOG L
            JOIN SCHEDULER_REPORTES_DETALLE D ON L.CLAVE = D.CLAVE
            WHERE L.ID_LOG = ?
            LIMIT 1
        `, [id_log]);

        if (!logRow) {
            return res.status(404).json({ error: 'Reporte no encontrado en el historial' });
        }

        // Reconstruir el objeto reporte desde el log
        const rep = {
            clave: logRow.CLAVE,
            nombre: logRow.NOMBRE,
            tipo_reporte: logRow.TIPO_REPORTE,
            db_key: logRow.DB_KEY,
            id_empresa: logRow.ID_EMPRESA,
            carpeta: logRow.CARPETA,
            formato: logRow.FORMATO || (logRow.TIPO_REPORTE === 'grupoq' ? 'csv' : 'xlsx'),
            skills: tryParseJSON(logRow.SKILLS, []),
            id_bots: tryParseJSON(logRow.ID_BOTS, []),
            id_broadcasts: tryParseJSON(logRow.ID_BROADCASTS, []),
            id_formulario: logRow.ID_FORMULARIO,
            texto_buscar: logRow.TEXTO_BUSCAR,
            flujo: logRow.FLUJO,
            activo: true
        };

        // Fecha del reporte original
        const fechaReporte = logRow.FECHA_EJECUCION;

        // Endpoint según tipo
        const TIPO_ENDPOINT = {
            detallado:    'detallado',
            resumido:     'resumido',
            grupoq:       'grupoq',
            broadcast:    'broadcast',
            apinotif:     'api-notificaciones',
            respuestas:   'respuestas',
            campaniasrep: 'campanias',
            resolpalabra: 'resoluciones-palabra',
            numerosactivos: 'numeros-activos',
        };
        const endpointPath = TIPO_ENDPOINT[rep.tipo_reporte] || 'detallado';
        const url = `http://localhost:3001/api/reportes/${endpointPath}`;

        const payload = {
            db_key:       rep.db_key,
            id_empresa:   rep.id_empresa,
            fecha_inicio: fechaReporte,
            fecha_fin:    fechaReporte,
            skills:       rep.skills,
            id_bots:      rep.id_bots,
            id_broadcasts: rep.id_broadcasts,
            id_formulario: rep.id_formulario || '',
            texto_buscar: rep.texto_buscar || '',
            flujo:        rep.flujo || '',
        };

        const ext = rep.formato;
        const esCSV = ext === 'csv';
        const archivo = getNombreArchivo(rep, fechaReporte, ext);

        console.log(`[Reintentar] ▶ ${rep.nombre} | tipo=${rep.tipo_reporte} db=${rep.db_key} empresa=${rep.id_empresa} fecha=${fechaReporte}`);

        // Ejecutar el reporte
        const rows = await fetchReporte(url, payload);
        
        if (rows.length > 0) {
            await guardarArchivo(rows, rep.carpeta, archivo, esCSV, rep.nombre);
        }

        const entrada = {
            clave: rep.clave,
            reporte: rep.nombre,
            tipo_reporte: rep.tipo_reporte,
            ok: true,
            registros: rows.length,
            archivo: rows.length > 0 ? archivo : null
        };

        // Guardar nuevo log (como reintento exitoso)
        const cfg = await leerConfig();
        await guardarLog(cfg.id_job, fechaReporte, { ...entrada, reintento: true, id_log_original: id_log });

        console.log(`[Reintentar] ✅ ${rep.nombre}: ${rows.length} registros`);

        res.json({
            success: true,
            message: `Reporte reejecutado exitosamente: ${rows.length} registros`,
            registros: rows.length,
            archivo: rows.length > 0 ? archivo : null
        });

    } catch (e) {
        console.error(`[Reintentar] ❌ Error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

// ==========================================================================
//   Logica principal: generar y guardar los CSVs
// ==========================================================================
async function ejecutarReportesScheduled(config) {
    const logEntradas = [];
    const reportesGenerados = []; // Para envío agrupado por email
    const ahora = new Date();

    // Fecha del dia anterior en hora Guatemala (UTC-6)
    const ayer = new Date(ahora);
    ayer.setUTCHours(ayer.getUTCHours() - 6);
    ayer.setDate(ayer.getDate() - 1);
    const yyyy = ayer.getFullYear();
    const mmes = String(ayer.getMonth() + 1).padStart(2, '0');
    const dd = String(ayer.getDate()).padStart(2, '0');
    const fechaAyer = `${yyyy}-${mmes}-${dd}`;

    console.log(`[Scheduler] Generando reportes para fecha: ${fechaAyer}`);

    for (const rep of config.reportes) {
        if (!rep.activo) continue;

        // ── URL del endpoint según tipo ──
        const TIPO_ENDPOINT = {
            detallado:    'detallado',
            resumido:     'resumido',
            grupoq:       'grupoq',
            broadcast:    'broadcast',
            apinotif:     'api-notificaciones',
            respuestas:   'respuestas',
            campaniasrep: 'campanias',
            resolpalabra: 'resoluciones-palabra',
            numerosactivos: 'numeros-activos',
        };
        const endpointPath = TIPO_ENDPOINT[rep.tipo_reporte] || 'detallado';
        const url = `http://localhost:3001/api/reportes/${endpointPath}`;

        // ── Payload con filtros guardados ──
        // NOTA: fecha_inicio y fecha_fin van solo como fecha (YYYY-MM-DD)
        // porque cada endpoint aplica internamente el offset UTC de Guatemala
        const payload = {
            db_key:       rep.db_key,
            id_empresa:   rep.id_empresa,
            fecha_inicio: fechaAyer,
            fecha_fin:    fechaAyer,
            skills:       rep.skills       || [],
            id_bots:      rep.id_bots      || [],
            id_broadcasts:rep.id_broadcasts|| [],
            id_formulario:rep.id_formulario|| '',
            texto_buscar: rep.texto_buscar || '',
            flujo:        rep.flujo        || '',
        };

        const ext = rep.formato || (rep.tipo_reporte === 'grupoq' ? 'csv' : 'xlsx');
        const esCSV = ext === 'csv';
        const archivo = getNombreArchivo(rep, fechaAyer, ext);

        console.log(`[Scheduler] ▶ ${rep.nombre} | tipo=${rep.tipo_reporte} db=${rep.db_key} empresa=${rep.id_empresa} fecha=${fechaAyer} bots=${JSON.stringify(payload.id_bots)} skills=${JSON.stringify(payload.skills)}`);

        try {
            const rows = await fetchReporte(url, payload);
            if (rows.length === 0) {
                console.warn(`[Scheduler] ⚠️  ${rep.nombre}: 0 registros para ${fechaAyer}. Verifica filtros: empresa=${rep.id_empresa} db=${rep.db_key} skills=${JSON.stringify(payload.skills)} bots=${JSON.stringify(payload.id_bots)}`);
            } else {
                console.log(`[Scheduler] ✅ ${rep.nombre}: ${rows.length} registros`);
            }
            if (rows.length > 0) {
                await guardarArchivo(rows, rep.carpeta, archivo, esCSV, rep.nombre);
                
                // ── GUARDAR INFO PARA ENVÍO AGRUPADO POR EMAIL ──
                const adjuntoPath = path.join(rep.carpeta, archivo);
                reportesGenerados.push({
                    clave: rep.clave,
                    nombre: rep.nombre,
                    tipoReporte: getTipoLabel(rep.tipo_reporte),
                    dbKey: rep.db_key,
                    empresa: rep.id_empresa,
                    registros: rows.length,
                    archivoPath: adjuntoPath,
                    archivoNombre: archivo
                });
            }
            
            const entrada = { 
                clave: rep.clave, 
                reporte: rep.nombre, 
                tipo_reporte: rep.tipo_reporte,
                ok: true, 
                registros: rows.length, 
                archivo: rows.length > 0 ? archivo : null 
            };
            logEntradas.push(entrada);
            await guardarLog(config.id_job, fechaAyer, entrada);
        } catch (e) {
            console.error(`[Scheduler] ❌ ${rep.nombre}: ${e.message}`);
            console.error(`[Scheduler]    Payload enviado → url=${url} db=${rep.db_key} empresa=${rep.id_empresa} fecha=${fechaAyer}`);
            const entrada = { 
                clave: rep.clave, 
                reporte: rep.nombre, 
                tipo_reporte: rep.tipo_reporte,
                ok: false, 
                error: e.message 
            };
            logEntradas.push(entrada);
            await guardarLog(config.id_job, fechaAyer, entrada);
        }
    }

    // ── ENVIAR CORREOS USANDO PLANTILLAS CONFIGURADAS ──
    if (reportesGenerados.length > 0) {
        try {
            console.log(`[Scheduler] 📧 Iniciando envío usando plantillas configuradas`);

            const emailConfig = await emailService.obtenerConfig();
            const plantillas = await emailService.obtenerPlantillasParaEnvio(config.id_job);

            if (plantillas.length > 0) {
                const fechaFormateada = formatearFechaEs(fechaAyer);

                for (const plantilla of plantillas) {
                    try {
                        // Filtrar solo los reportes que esta plantilla debe incluir
                        const reportesParaPlantilla = [];
                        for (const clave of plantilla.reportes) {
                            const reporteGen = reportesGenerados.find(r => r.clave === clave);
                            if (reporteGen) {
                                reportesParaPlantilla.push(reporteGen);
                            }
                        }

                        if (reportesParaPlantilla.length === 0) {
                            console.log(`[Scheduler] ℹ️ Plantilla "${plantilla.nombre}": no tiene reportes generados para hoy`);
                            continue;
                        }

                        // Preparar destinatarios separando PARA, CC, CCO
                        const destinatariosPara = plantilla.destinatarios.filter(d => d.tipo === 'PARA');
                        const destinatariosCC = plantilla.destinatarios.filter(d => d.tipo === 'CC');
                        const destinatariosCCO = plantilla.destinatarios.filter(d => d.tipo === 'CCO');

                        if (destinatariosPara.length === 0 && destinatariosCC.length === 0 && destinatariosCCO.length === 0) {
                            console.log(`[Scheduler] ℹ️ Plantilla "${plantilla.nombre}": no tiene destinatarios configurados`);
                            continue;
                        }

                        // Construir destinatarios combinados para el envío
                        const todosDestinatarios = [
                            ...destinatariosPara.map(d => ({ ...d, tipo: 'PARA' })),
                            ...destinatariosCC.map(d => ({ ...d, tipo: 'CC' })),
                            ...destinatariosCCO.map(d => ({ ...d, tipo: 'CCO' }))
                        ];

                        // Generar asunto desde plantilla (con variables) o usar directo
                        let asunto = plantilla.asunto || '';
                        if (asunto.includes('{')) {
                            const tipoReporte = reportesParaPlantilla.length === 1
                                ? reportesParaPlantilla[0].tipoReporte
                                : 'Múltiples Reportes';
                            const empresa = reportesParaPlantilla[0].empresa || '';
                            asunto = emailService.generarAsunto(asunto, {
                                TIPO_REPORTE: tipoReporte,
                                EMPRESA: empresa,
                                FECHA: fechaFormateada
                            });
                        }

                        // Generar cuerpo del email usando plantilla
                        let mensajeHtml = '';

                        // Estilos base para todo el email con !important para que los clientes de email los respeten
                        const estilosBase = `font-family: 'Exo Medium', 'Exo', Arial, sans-serif !important; font-size: 11pt !important; line-height: 1.6 !important; color: #333333 !important;`;

                        // Cuerpo HTML de la plantilla
                        if (plantilla.cuerpoHtml) {
                            // Solo escapar & pero mantener tags HTML intactos
                            let cuerpo = plantilla.cuerpoHtml
                                .replace(/&/g, '&amp;')
                                .replace(/{FECHA}/g, fechaFormateada);

                            const tipoRep = reportesParaPlantilla.length === 1
                                ? reportesParaPlantilla[0].tipoReporte
                                : 'Múltiples Reportes';
                            cuerpo = cuerpo.replace(/{TIPO_REPORTE}/g, tipoRep);
                            cuerpo = cuerpo.replace(/{EMPRESA}/g, reportesParaPlantilla[0].empresa || '');

                            // Convertir saltos de línea a <br> tags
                            cuerpo = cuerpo.replace(/\n/g, '<br>');

                            mensajeHtml = `<div style="${estilosBase}">${cuerpo}</div>`;
                        } else {
                            // Cuerpo por defecto si no hay plantilla
                            mensajeHtml = `<div style="${estilosBase}">
                                <p style="${estilosBase}">Buenos días,</p>
                                <p style="${estilosBase}">Adjuntamos los reportes correspondientes al día ${fechaFormateada}.</p>
                                <p style="${estilosBase}">Quedamos atentos a sus comentarios.</p>
                            </div>`;
                        }

                        // Agregar firma HTML de la plantilla (NO escapar HTML, solo convertir saltos de línea)
                        if (plantilla.firmaHtml) {
                            let firma = plantilla.firmaHtml
                                .replace(/\n/g, '<br>');
                            mensajeHtml += `<div style="margin-top: 30px; ${estilosBase}">${firma}</div>`;
                        }

                        // Agregar imagen de firma si existe
                        if (plantilla.imagenFirmaPath) {
                            mensajeHtml += `<div style="margin-top: 10px;">
                                <img src="${plantilla.imagenFirmaPath}" style="max-width: 600px; max-height: 120px;" alt="Firma" />
                            </div>`;
                        }

                        // Preparar attachments
                        const attachments = reportesParaPlantilla.map(r => ({
                            path: r.archivoPath,
                            nombre: r.archivoNombre
                        }));

                        // Enviar correo
                        const resultadoEmail = await emailService.enviarReportePorEmail({
                            destinatarios: todosDestinatarios,
                            asunto,
                            mensaje: mensajeHtml,
                            attachments,
                            idJob: config.id_job,
                            claveReporte: reportesParaPlantilla.map(r => r.clave),
                            fechaReporte: fechaAyer
                        });

                        if (resultadoEmail.ok) {
                            const destLog = [];
                            if (destinatariosPara.length > 0) destLog.push(`${destinatariosPara.length} PARA`);
                            if (destinatariosCC.length > 0) destLog.push(`${destinatariosCC.length} CC`);
                            if (destinatariosCCO.length > 0) destLog.push(`${destinatariosCCO.length} CCO`);
                            console.log(`[Scheduler] 📧 Plantilla "${plantilla.nombre}": enviado a ${destLog.join(', ')} (${reportesParaPlantilla.length} reportes)`);
                        } else {
                            console.error(`[Scheduler] ❌ Error enviando plantilla "${plantilla.nombre}": ${resultadoEmail.error}`);
                        }
                    } catch (plantillaErr) {
                        console.error(`[Scheduler] ❌ Error procesando plantilla "${plantilla.nombre}": ${plantillaErr.message}`);
                    }
                }
            } else {
                console.log(`[Scheduler] ℹ️ No hay plantillas de email configuradas`);
            }
        } catch (emailErr) {
            console.error(`[Scheduler] ❌ Error en envío de correos: ${emailErr.message}`);
        }
    }

    return { fecha: fechaAyer, log: logEntradas };
}

// Llamar a un endpoint POST del propio servidor
async function fetchReporte(url, payload) {
    const http = require('http');
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const options = {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json; charset=utf-8', 
                'Accept': 'application/json',
                'Accept-Charset': 'utf-8',
                'Content-Length': Buffer.byteLength(body)
            }
        };
        const req = http.request(url, options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    if (res.statusCode >= 400) reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
                    else resolve(parsed);
                } catch (e) { reject(e); }
            });
        });
        req.on('error', reject);
        req.write(body);
        req.end();
    });
}

// Helper: "05 de mayo 2026"
function formatearFechaEs(fechaStr) {
    const meses = ['enero','febrero','marzo','abril','mayo','junio',
                   'julio','agosto','septiembre','octubre','noviembre','diciembre'];
    const [yyyy, mm, dd] = fechaStr.split('-');
    return `${dd} de ${meses[parseInt(mm, 10) - 1]} ${yyyy}`;
}

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

// Helper: etiqueta legible por tipo de reporte
function getTipoLabel(tipo) {
    const MAP = {
        detallado:     'Operaciones',
        resumido:      'Resoluciones',
        grupoq:        'Grupo Q',
        broadcast:     'Broadcast',
        apinotif:      'API Notificaciones',
        respuestas:    'Respuestas',
        campaniasrep:  'Campañas',
        resolpalabra:  'Resoluciones por Palabra',
        numerosactivos:'Números Activos',
    };
    return MAP[tipo] || tipo;
}

// Helper: nombre de archivo
function getNombreArchivo(rep, fecha, ext) {
    const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '').trim();
    const fechaFmt = formatearFechaEs(fecha);
    if (rep.tipo_reporte === 'grupoq') {
        return sanitize(`Reporte de Operaciones - Grupo Q - ${fechaFmt}`) + `.${ext}`;
    }
    const tipoLabel = getTipoLabel(rep.tipo_reporte);
    const nombreLimpio = rep.nombre || '';
    const nombreLower = nombreLimpio.toLowerCase();
    const tipoLower = tipoLabel.toLowerCase();
    // Si el nombre ya comienza con el tipo (ej: "Resoluciones Ficohsa..."),
    // extraer el resto para formatear como "Reporte de [Tipo] - [Resto] - Fecha"
    if (nombreLower.startsWith(tipoLower)) {
        const resto = nombreLimpio.substring(tipoLabel.length).trim();
        return sanitize(`Reporte de ${tipoLabel} - ${resto} - ${fechaFmt}`) + `.${ext}`;
    }
    return sanitize(`Reporte de ${tipoLabel} - ${nombreLimpio} - ${fechaFmt}`) + `.${ext}`;
}

// Helper: Limpiar recursivamente todos los strings en un objeto/fila
function limpiarFila(row) {
    const limpio = {};
    for (const [key, val] of Object.entries(row)) {
        if (typeof val === 'string') {
            limpio[key] = limpiarTexto(val);
        } else if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
            limpio[key] = limpiarFila(val); // Recursivo para objetos anidados
        } else {
            limpio[key] = val;
        }
    }
    return limpio;
}

// Generar y guardar archivo en disco (XLSX para detallado/resumido, CSV para grupoq)
async function guardarArchivo(rows, carpeta, nombreArchivo, esGrupoQ, sheetName) {
    if (!rows || rows.length === 0) {
        console.warn(`[Scheduler] Sin datos para ${nombreArchivo}`);
        return;
    }
    
    // DEBUG: Verificar codificación de datos crudos
    const sampleRow = rows[0];
    const sampleKeys = Object.keys(sampleRow);
    const stringKey = sampleKeys.find(k => typeof sampleRow[k] === 'string' && sampleRow[k].length > 10);
    if (stringKey) {
        const rawValue = sampleRow[stringKey];
        const hasReplacementChar = rawValue.includes('\uFFFD');
        const hasDoubleFFFD = rawValue.includes('\uFFFD\uFFFD');
        console.log(`[Scheduler] DEBUG Campo ${stringKey}: has=`, hasReplacementChar, 'hasDouble=', hasDoubleFFFD, 'preview=', rawValue.substring(0, 50));
    }
    
    // LIMPIAR caracteres corruptos de todas las filas
    const rowsLimpios = rows.map(limpiarFila);
    
    // DEBUG: Verificar después de limpiar
    if (stringKey && rowsLimpios[0][stringKey] !== sampleRow[stringKey]) {
        console.log(`[Scheduler] DEBUG Limpio: `, rowsLimpios[0][stringKey].substring(0, 50));
    }
    
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
    const destino = path.join(carpeta, nombreArchivo);

    if (esGrupoQ) {
        const headers = Object.keys(rowsLimpios[0]);
        const escape = (val) => {
            if (val === null || val === undefined) return '';
            return String(val).replace(/[\r\n]+/g, ' ').replace(/;/g, ':').replace(/,/g, '.');
        };
        const csv = [
            headers.map(escape).join(';'),
            ...rowsLimpios.map(row => headers.map(h => escape(row[h])).join(';'))
        ].join('\r\n');
        fs.writeFileSync(destino, '\uFEFF' + csv, 'utf8');
    } else {
        const wb = new ExcelJS.Workbook();
        wb.creator = 'TalkMe Soporte';
        wb.created = new Date();
        const ws = wb.addWorksheet(sheetName);
        const headers = Object.keys(rowsLimpios[0]);

        // Función para convertir string DD/MM/YYYY HH:MM:SS a Excel Date Serial Number
        const parseToExcelDate = (str) => {
            if (!str || typeof str !== 'string') return str;
            const parts = str.split(' ');
            const datePart = parts[0];
            const timePart = parts[1] || '00:00:00';
            const [day, month, year] = datePart.split('/').map(Number);
            const [hour, minute, second] = timePart.split(':').map(Number);

            const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            const isLeapYear = (y) => ((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0);

            let totalDays = 0;
            for (let y = 1900; y < year; y++) {
                totalDays += isLeapYear(y) ? 366 : 365;
            }
            if (isLeapYear(year)) daysInMonth[1] = 29;
            for (let m = 0; m < month - 1; m++) {
                totalDays += daysInMonth[m];
            }
            totalDays += day - 1;
            const excelSerial = totalDays + 2;
            const timeFraction = (hour * 3600 + minute * 60 + second) / 86400;
            return excelSerial + timeFraction;
        };

        const dataRows = rowsLimpios.map(r => headers.map(h => {
            const v = r[h];
            if (v === null || v === undefined) return '';
            // Convertir TS 1er Respuesta a Excel Date Serial Number
            if (h === 'TS 1er Respuesta' && typeof v === 'string' && v.includes('/')) {
                return parseToExcelDate(v);
            }
            return v;
        }));

        ws.addTable({
            name: 'TablaReporte',
            ref: 'A1',
            headerRow: true,
            totalsRow: false,
            style: { theme: 'TableStyleMedium6', showRowStripes: true },
            columns: headers.map(h => ({ name: h, filterButton: true })),
            rows: dataRows
        });
        headers.forEach((h, i) => {
            const col = ws.getColumn(i + 1);
            let max = h.length;
            for (const row of dataRows) {
                const len = row[i] == null ? 0 : String(row[i]).length;
                if (len > max) max = len;
            }
            col.width = Math.min(Math.max(max + 2, 10), 50);
            // Aplicar formato de fecha a columna TS 1er Respuesta
            if (h === 'TS 1er Respuesta') {
                col.numFmt = 'dd/mm/yyyy hh:mm';
            }
        });
        ws.views = [{ state: 'frozen', ySplit: 1 }];
        await wb.xlsx.writeFile(destino);
    }

    console.log(`[Scheduler] Guardado: ${destino} (${rows.length} registros)`);
}

// Iniciar cron al cargar el modulo
programarCron();

// ==========================================================================
//   SCHEDULER DE TAREAS (Cierres + Facebook)
// ==========================================================================

// ── Helpers DB ──────────────────────────────────────────────────────────────

async function leerTareas() {
    const [rows] = await db.query(`
        SELECT ID_TAREA, TIPO, DB_KEY, TIME_FORMAT(HORA_GT,'%H:%i') AS hora,
               ACTIVO, NOMBRE
        FROM SCHEDULER_TAREAS
        ORDER BY TIPO, DB_KEY
    `);
    return rows.map(r => ({ ...r, activo: !!r.ACTIVO }));
}

async function guardarLogTarea(idTarea, entrada) {
    try {
        await db.query(`
            INSERT INTO SCHEDULER_TAREAS_LOG
                (ID_TAREA, TIPO, DB_KEY, OK, AFECTADOS, DETALLE_IDS, ERROR)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [idTarea, entrada.tipo, entrada.db_key,
            entrada.ok ? 1 : 0,
            entrada.afectados ?? null,
            entrada.detalle_ids ? JSON.stringify(entrada.detalle_ids) : null,
            entrada.error   ?? null]);
    } catch (e) {
        console.error('[TareasScheduler] Error guardando log:', e.message);
    }
}

// ── Cron de tareas ──────────────────────────────────────────────────────────

let cronJobsTareas = [];

async function programarCronTareas() {
    cronJobsTareas.forEach(j => j.stop());
    cronJobsTareas = [];
    try {
        const tareas = await leerTareas();
        const activas = tareas.filter(t => t.activo && t.hora);

        // Agrupar por hora para no crear un cron por tarea sino por hora única
        const porHora = {};
        for (const t of activas) {
            if (!porHora[t.hora]) porHora[t.hora] = [];
            porHora[t.hora].push(t);
        }

        for (const [hora, grupo] of Object.entries(porHora)) {
            const [hh, mm] = hora.split(':').map(Number);
            const hhUTC = (hh + 6) % 24;
            const expr = `${mm} ${hhUTC} * * *`;
            const job = cron.schedule(expr, async () => {
                console.log(`[TareasScheduler] ⏰ Ejecutando ${grupo.length} tarea(s) a las ${hora} GT`);
                for (const t of grupo) {
                    await ejecutarTarea(t);
                }
            }, { timezone: 'UTC' });
            cronJobsTareas.push(job);
            console.log(`[TareasScheduler] ✅ ${grupo.length} tarea(s) programadas para ${hora} GT → cron: ${expr} UTC`);
        }
    } catch (e) {
        console.error('[TareasScheduler] Error programando cron:', e.message);
    }
}

async function ejecutarTarea(tarea) {
    const { ID_TAREA, TIPO, DB_KEY, NOMBRE } = tarea;
    const url = TIPO === 'cierres'
        ? 'http://localhost:3001/api/cierres/ejecutar'
        : 'http://localhost:3001/api/facebook/ejecutar';

    console.log(`[TareasScheduler] ▶ ${NOMBRE || TIPO} | db=${DB_KEY}`);
    try {
        const http = require('http');
        const resultado = await new Promise((resolve, reject) => {
            const body = JSON.stringify({ db_key: DB_KEY });
            const req = http.request(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
            }, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        const parsed = JSON.parse(data);
                        if (res.statusCode >= 400) reject(new Error(parsed.error || `HTTP ${res.statusCode}`));
                        else resolve(parsed);
                    } catch (e) { reject(e); }
                });
            });
            req.on('error', reject);
            req.write(body);
            req.end();
        });

        const afectados = TIPO === 'cierres'
            ? (resultado.conversaciones_cerradas ?? 0)
            : (resultado.actualizados ?? 0);
        
        // Guardar detalles completos (objetos) según el tipo de tarea
        const detalleRaw = TIPO === 'cierres'
            ? (resultado.detalle_conversaciones ?? [])
            : (resultado.detalle_solicitudes ?? []);
        
        // Filtrar solo registros válidos con ID
        const detalleCompleto = detalleRaw.filter(d => d && (d.ID_CONVERSACION || d.ID_SOLICITUD));

        console.log(`[TareasScheduler] ✅ ${NOMBRE || TIPO}: ${afectados} afectados, ${detalleCompleto.length} detalles válidos`);
        await guardarLogTarea(ID_TAREA, { 
            tipo: TIPO, 
            db_key: DB_KEY, 
            ok: true, 
            afectados,
            detalle_ids: detalleCompleto  // Solo registros válidos con ID
        });
    } catch (e) {
        console.error(`[TareasScheduler] ❌ ${NOMBRE || TIPO}: ${e.message}`);
        await guardarLogTarea(ID_TAREA, { 
            tipo: TIPO, 
            db_key: DB_KEY, 
            ok: false, 
            error: e.message 
        });
    }
}

// ── Endpoints REST ──────────────────────────────────────────────────────────

// GET /api/tareas  — listar todas las tareas
router.get('/api/tareas', async (req, res) => {
    try { res.json(await leerTareas()); }
    catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tareas  — crear o actualizar tarea (upsert por TIPO+DB_KEY)
router.post('/api/tareas', async (req, res) => {
    try {
        const { tipo, db_key, hora, activo, nombre } = req.body;
        if (!tipo || !db_key || !hora) return res.status(400).json({ error: 'Faltan tipo, db_key u hora' });
        await db.query(`
            INSERT INTO SCHEDULER_TAREAS (TIPO, DB_KEY, HORA_GT, ACTIVO, NOMBRE)
            VALUES (?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE HORA_GT=VALUES(HORA_GT), ACTIVO=VALUES(ACTIVO), NOMBRE=VALUES(NOMBRE)
        `, [tipo, db_key, hora + ':00', activo ? 1 : 0, nombre || tipo]);
        await programarCronTareas();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/tareas/:tipo/:db_key  — eliminar tarea
router.delete('/api/tareas/:tipo/:db_key', async (req, res) => {
    try {
        await db.query(`DELETE FROM SCHEDULER_TAREAS WHERE TIPO=? AND DB_KEY=?`,
            [req.params.tipo, req.params.db_key]);
        await programarCronTareas();
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/tareas/ejecutar-ahora  — ejecutar manualmente
router.post('/api/tareas/ejecutar-ahora', async (req, res) => {
    try {
        const { tipo, db_key } = req.body;
        if (!tipo || !db_key) return res.status(400).json({ error: 'Faltan tipo y db_key' });
        const tareas = await leerTareas();
        const tarea = tareas.find(t => t.TIPO === tipo && t.DB_KEY === db_key);
        if (!tarea) return res.status(404).json({ error: 'Tarea no encontrada' });
        await ejecutarTarea(tarea);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/tareas/log?tipo=&db_key=  — historial de ejecuciones
router.get('/api/tareas/log', async (req, res) => {
    try {
        const { tipo, db_key } = req.query;
        let where = '1=1';
        const params = [];
        if (tipo)   { where += ' AND L.TIPO = ?';   params.push(tipo); }
        if (db_key) { where += ' AND L.DB_KEY = ?'; params.push(db_key); }
        const [rows] = await db.query(`
            SELECT L.ID_LOG, L.TIPO, L.DB_KEY, L.OK, L.AFECTADOS, L.DETALLE_IDS, L.ERROR,
                   DATE_FORMAT(
                       CONVERT_TZ(L.EJECUTADO_EL, @@session.time_zone, 'America/Guatemala'),
                       '%Y-%m-%d %H:%i:%s'
                   ) AS EJECUTADO_EL
            FROM SCHEDULER_TAREAS_LOG L
            WHERE ${where}
            ORDER BY L.EJECUTADO_EL DESC
            LIMIT 100
        `, params);
        res.json(rows);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// Iniciar cron de tareas al cargar el modulo
programarCronTareas();

// ==========================================================================
// ENDPOINTS PARA GESTIÓN DE DESTINATARIOS DE CORREO
// ==========================================================================

// GET /api/scheduler/destinatarios?id_job=
router.get('/api/scheduler/destinatarios', async (req, res) => {
    try {
        const { id_job } = req.query;
        if (!id_job) return res.status(400).json({ error: 'Falta id_job' });
        const destinatarios = await emailService.listarDestinatarios(id_job);
        res.json(destinatarios);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/scheduler/destinatarios/:clave?id_job=
router.get('/api/scheduler/destinatarios/:clave', async (req, res) => {
    try {
        const { id_job } = req.query;
        const { clave } = req.params;
        if (!id_job) return res.status(400).json({ error: 'Falta id_job' });
        const destinatarios = await emailService.listarDestinatariosPorReporte(id_job, clave);
        res.json(destinatarios);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/scheduler/destinatarios
router.post('/api/scheduler/destinatarios', async (req, res) => {
    try {
        const { id_job, clave_reporte, email, nombre, tipo, creado_por } = req.body;
        if (!id_job || !clave_reporte || !email) {
            return res.status(400).json({ error: 'Faltan campos requeridos: id_job, clave_reporte, email' });
        }
        await emailService.guardarDestinatario({
            idJob: id_job,
            claveReporte: clave_reporte,
            email: email,
            nombre: nombre || '',
            tipo: tipo || 'PARA',
            creadoPor: creado_por || 'sistema'
        });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/scheduler/destinatarios/:id_email
router.delete('/api/scheduler/destinatarios/:id_email', async (req, res) => {
    try {
        await emailService.eliminarDestinatario(req.params.id_email);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/scheduler/email/historial
router.get('/api/scheduler/email/historial', async (req, res) => {
    try {
        const { id_job, clave_reporte, fecha_desde, fecha_hasta, limit } = req.query;
        const historial = await emailService.obtenerHistorialEnvios({
            idJob: id_job,
            claveReporte: clave_reporte,
            fechaDesde: fecha_desde,
            fechaHasta: fecha_hasta,
            limit: parseInt(limit) || 100
        });
        res.json(historial);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/scheduler/email/config
router.get('/api/scheduler/email/config', async (req, res) => {
    try {
        const config = await emailService.obtenerConfig();
        // No devolver la contraseña por seguridad
        delete config.authPass;
        res.json(config);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/scheduler/email/config
router.put('/api/scheduler/email/config', async (req, res) => {
    try {
        const { smtpHost, smtpPort, smtpSecure, authUser, authPass, fromEmail, fromName, replyTo, asuntoTemplate, firmaHtml, imagenFirmaPath } = req.body;
        await emailService.actualizarConfigCompleta({
            smtpHost, smtpPort, smtpSecure, authUser, authPass, fromEmail, fromName, replyTo, asuntoTemplate, firmaHtml, imagenFirmaPath
        });
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/scheduler/email/probar
router.post('/api/scheduler/email/probar', async (req, res) => {
    try {
        const { email_prueba } = req.body;
        if (!email_prueba) return res.status(400).json({ error: 'Falta email_prueba' });
        const result = await emailService.probarConfiguracion(email_prueba);
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// ==========================================================================
// ENDPOINTS PARA PLANTILLAS DE CORREO (CONFIGURACIÓN TIPO OUTLOOK)
// ==========================================================================

// GET /api/scheduler/templates
router.get('/api/scheduler/templates', async (req, res) => {
    try {
        const { id_job } = req.query;
        if (!id_job) return res.status(400).json({ error: 'Falta id_job' });
        const templates = await emailService.listarTemplates(id_job);
        res.json(templates);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// GET /api/scheduler/templates/:id
router.get('/api/scheduler/templates/:id', async (req, res) => {
    try {
        const template = await emailService.obtenerTemplate(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template no encontrado' });
        res.json(template);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// POST /api/scheduler/templates
router.post('/api/scheduler/templates', async (req, res) => {
    try {
        const { id_job, nombre, asunto, cuerpo_html, firma_html, imagen_firma_path, reportes, destinatarios, creado_por } = req.body;
        console.log(`[Scheduler] POST /templates - Destinatarios recibidos:`, destinatarios?.length || 0, JSON.stringify(destinatarios));
        if (!id_job || !nombre || !asunto) {
            return res.status(400).json({ error: 'Faltan campos requeridos: id_job, nombre, asunto' });
        }
        const result = await emailService.crearTemplate({
            idJob: id_job,
            nombre,
            asunto,
            cuerpoHtml: cuerpo_html,
            firmaHtml: firma_html,
            imagenFirmaPath: imagen_firma_path,
            reportes: reportes || [],
            destinatarios: destinatarios || [],
            creadoPor: creado_por || 'sistema'
        });
        res.json(result);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/scheduler/templates/:id
router.put('/api/scheduler/templates/:id', async (req, res) => {
    try {
        const { nombre, asunto, cuerpo_html, firma_html, imagen_firma_path, reportes, destinatarios } = req.body;
        console.log(`[Scheduler] PUT /templates/${req.params.id} - Destinatarios:`, destinatarios?.length || 0);
        console.log(`[Scheduler] PUT /templates/${req.params.id} - Imagen firma:`, imagen_firma_path ? `${imagen_firma_path.substring(0, 50)}... (${imagen_firma_path.length} chars)` : 'null');
        const result = await emailService.actualizarTemplate(req.params.id, {
            nombre,
            asunto,
            cuerpoHtml: cuerpo_html,
            firmaHtml: firma_html,
            imagenFirmaPath: imagen_firma_path,
            reportes: reportes || [],
            destinatarios: destinatarios || []
        });
        console.log(`[Scheduler] PUT /templates/${req.params.id} - Resultado:`, result);
        res.json(result);
    } catch (e) { 
        console.error(`[Scheduler] PUT /templates/${req.params.id} - Error:`, e.message);
        res.status(500).json({ error: e.message }); 
    }
});

// DELETE /api/scheduler/templates/:id
router.delete('/api/scheduler/templates/:id', async (req, res) => {
    try {
        await emailService.eliminarTemplate(req.params.id);
        res.json({ ok: true });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

module.exports = { router, ejecutarReportesScheduled, leerConfig, programarCron };
