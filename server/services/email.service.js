/**
 * ============================================================================
 * SERVICIO DE ENVÍO DE CORREOS PARA REPORTES AUTOMÁTICOS
 * ============================================================================
 * Envía reportes automáticos por correo electrónico usando nodemailer.
 * Soporta "Send As" para enviar como soporte@talkme.pro desde la cuenta
 * alex.carrera@consystec-corp.com (requiere permisos en Exchange/Office365)
 */

const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const pools = require('./db');

const db = pools.control;

// ==========================================================================
// CONFIGURACIÓN SMTP
// ==========================================================================
async function getEmailConfig() {
    try {
        const [[config]] = await db.query('SELECT * FROM EMAIL_CONFIG WHERE ACTIVO = 1 LIMIT 1');
        if (!config) return getDefaultConfig();
        return {
            smtpHost: config.SMTP_HOST,
            smtpPort: config.SMTP_PORT,
            smtpSecure: !!config.SMTP_SECURE,
            authUser: config.AUTH_USER,
            authPass: config.AUTH_PASS || process.env.EMAIL_PASSWORD || '',
            fromEmail: config.FROM_EMAIL,
            fromName: config.FROM_NAME,
            replyTo: config.REPLY_TO,
            asuntoTemplate: config.ASUNTO_TEMPLATE || 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}',
            firmaHtml: config.FIRMA_HTML || '',
            imagenFirmaPath: config.IMAGEN_FIRMA_PATH || null
        };
    } catch (err) {
        console.error('[EmailService] Error leyendo config:', err.message);
        return getDefaultConfig();
    }
}

// ==========================================================================
// GENERAR ASUNTO PERSONALIZADO
// ==========================================================================
function generarAsunto(template, variables) {
    let asunto = template;
    for (const [key, value] of Object.entries(variables)) {
        asunto = asunto.replace(new RegExp(`{${key}}`, 'g'), value || '');
    }
    return asunto;
}

// ==========================================================================
// GENERAR CUERPO DEL CORREO CON FIRMA
// ==========================================================================
async function generarCuerpoEmail(config, fechaFormateada, attachmentsInfo) {
    const listaArchivos = attachmentsInfo.map(a => 
        `<li>📊 ${a.nombreReporte} (${a.tipoReporte})</li>`
    ).join('');
    
    let firma = config.firmaHtml || '';
    
    // Reemplazar {FECHA} en la firma
    firma = firma.replace(/{FECHA}/g, fechaFormateada);
    
    // Si hay imagen de firma, agregarla
    let imagenHtml = '';
    if (config.imagenFirmaPath) {
        // Detectar si es una URL (http/https) o una ruta local
        const esUrl = config.imagenFirmaPath.startsWith('http://') || config.imagenFirmaPath.startsWith('https://');
        
        if (esUrl) {
            // Usar URL directamente en el HTML
            imagenHtml = `<div style="margin-top:10px;"><img src="${config.imagenFirmaPath}" style="max-width:600px;" /></div>`;
        } else if (fs.existsSync(config.imagenFirmaPath)) {
            // Usar archivo local como attachment con CID
            imagenHtml = `<div style="margin-top:10px;"><img src="cid:firma-image" style="max-width:600px;" /></div>`;
        }
    }
    
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reportes TalkMe</title>
</head>
<body>
    <div style="font-family:Arial,sans-serif;color:#333;">
        <p>Buenos días Estimados,</p>
        <p>Adjuntamos los siguientes reportes correspondientes al día <strong>${fechaFormateada}</strong>:</p>
        <ul style="line-height:1.8;">
            ${listaArchivos}
        </ul>
        <p>Quedamos atentos a sus comentarios o dudas.</p>
        <p>Saludos cordiales</p>
        <br/>
        ${firma}
        ${imagenHtml}
    </div>
</body>
</html>`;
}

function getDefaultConfig() {
    return {
        smtpHost: 'smtp.office365.com',
        smtpPort: 587,
        smtpSecure: false,
        authUser: 'alex.carrera@consystec-corp.com',
        authPass: process.env.EMAIL_PASSWORD || '',
        fromEmail: 'soporte@talkme.pro',
        fromName: 'Soporte TalkMe',
        replyTo: 'soporte@talkme.pro',
        asuntoTemplate: 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}',
        firmaHtml: '',
        imagenFirmaPath: null
    };
}

// ==========================================================================
// CREAR TRANSPORTER SMTP
// ==========================================================================
async function createTransporter() {
    const config = await getEmailConfig();
    
    return nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        auth: {
            user: config.authUser,
            pass: config.authPass
        },
        tls: {
            ciphers: 'SSLv3',
            rejectUnauthorized: false
        },
        debug: false,
        logger: false,
        encoding: 'utf-8'
    });
}

// ==========================================================================
// ENVIAR REPORTE POR CORREO (SOPORTA MÚLTIPLES ADJUNTOS Y PARA/CC)
// ==========================================================================
async function enviarReportePorEmail({ destinatarios, asunto, mensaje, attachments, idJob, claveReporte, fechaReporte }) {
    const resultados = [];
    
    try {
        // Validar attachments
        if (!attachments || attachments.length === 0) {
            throw new Error('No hay archivos adjuntos para enviar');
        }
        
        // Verificar que todos los archivos existen
        for (const att of attachments) {
            if (!fs.existsSync(att.path)) {
                throw new Error(`Archivo no encontrado: ${att.path}`);
            }
        }
        
        const transporter = await createTransporter();
        const config = await getEmailConfig();
        
        // Validar destinatarios
        if (!destinatarios || destinatarios.length === 0) {
            console.log('[EmailService] ℹ️ No hay destinatarios configurados');
            return { ok: true, enviados: 0, mensaje: 'No hay destinatarios' };
        }
        
        // Separar destinatarios entre Para, CC y CCO (BCC)
        const destinatariosPara = destinatarios.filter(d => !d.tipo || d.tipo === 'PARA').map(d => d.email);
        const destinatariosCC = destinatarios.filter(d => d.tipo === 'CC').map(d => d.email);
        const destinatariosCCO = destinatarios.filter(d => d.tipo === 'CCO').map(d => d.email);

        // Preparar attachments para nodemailer
        // IMPORTANTE: Excel (.xlsx) es binario, NO debe tener encoding UTF-8
        // Solo CSV es texto y puede especificar charset
        const emailAttachments = attachments.map(att => {
            const isCsv = att.nombre.endsWith('.csv');
            const attachment = {
                filename: att.nombre,
                path: att.path,
                contentType: isCsv
                    ? 'text/csv; charset=utf-8'
                    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            };
            // Solo agregar encoding para archivos de texto (CSV)
            // Los archivos binarios (Excel) no deben tener encoding especificado
            if (isCsv) {
                attachment.encoding = 'utf-8';
            }
            return attachment;
        });

        // Agregar imagen de firma si existe y es un archivo local (no URL)
        if (config.imagenFirmaPath) {
            const esUrl = config.imagenFirmaPath.startsWith('http://') || config.imagenFirmaPath.startsWith('https://');
            if (!esUrl && fs.existsSync(config.imagenFirmaPath)) {
                emailAttachments.push({
                    filename: 'firma.png',
                    path: config.imagenFirmaPath,
                    cid: 'firma-image'
                });
            }
        }

        // Construir direcciones para envío
        const toAddress = destinatariosPara.length > 0 ? destinatariosPara.join(', ') : destinatarios[0].email;
        const ccAddress = destinatariosCC.length > 0 ? destinatariosCC.join(', ') : undefined;
        const bccAddress = destinatariosCCO.length > 0 ? destinatariosCCO.join(', ') : undefined;

        try {
            const info = await transporter.sendMail({
                from: {
                    name: config.fromName,
                    address: config.fromEmail
                },
                to: toAddress,
                cc: ccAddress,
                bcc: bccAddress,
                replyTo: config.replyTo,
                subject: asunto,
                html: mensaje,
                attachments: emailAttachments
            });
            
            const destinatariosStr = destinatarios.map(d => {
                if (d.tipo === 'CC') return `${d.email} (CC)`;
                if (d.tipo === 'CCO') return `${d.email} (CCO)`;
                return d.email;
            }).join(', ');
            
            console.log(`[EmailService] ✅ Enviado a ${destinatariosStr}: ${info.messageId}`);
            resultados.push({ 
                emails: destinatarios.map(d => d.email), 
                ok: true, 
                messageId: info.messageId 
            });
            
            // Guardar log en BD
            if (idJob && claveReporte) {
                await guardarLogEnvio({
                    idJob,
                    claveReporte: Array.isArray(claveReporte) ? claveReporte.join(',') : claveReporte,
                    fechaReporte,
                    emailDestinatario: destinatariosStr,
                    asunto,
                    ok: true,
                    messageId: info.messageId
                });
            }
        } catch (err) {
            console.error(`[EmailService] ❌ Error enviando: ${err.message}`);
            resultados.push({ 
                emails: destinatarios.map(d => d.email), 
                ok: false, 
                error: err.message 
            });
            
            if (idJob && claveReporte) {
                await guardarLogEnvio({
                    idJob,
                    claveReporte: Array.isArray(claveReporte) ? claveReporte.join(',') : claveReporte,
                    fechaReporte,
                    emailDestinatario: destinatarios.map(d => d.email).join(', '),
                    asunto,
                    ok: false,
                    error: err.message
                });
            }
        }
        
        const exitosos = resultados.filter(r => r.ok).length;
        return { 
            ok: exitosos > 0, 
            enviados: exitosos,
            total: resultados.length,
            detalle: resultados
        };
        
    } catch (err) {
        console.error(`[EmailService] ❌ Error general: ${err.message}`);
        return { ok: false, error: err.message, enviados: 0 };
    }
}

// ==========================================================================
// GUARDAR LOG DE ENVÍO EN BD
// ==========================================================================
async function guardarLogEnvio({ idJob, claveReporte, fechaReporte, emailDestinatario, asunto, ok, error, messageId }) {
    try {
        await db.query(`
            INSERT INTO SCHEDULER_EMAIL_LOG 
                (ID_JOB, CLAVE_REPORTE, FECHA_REPORTE, EMAIL_DESTINATARIO, ASUNTO, OK, ERROR, MESSAGE_ID)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [idJob, claveReporte, fechaReporte, emailDestinatario, asunto, ok ? 1 : 0, error || null, messageId || null]);
    } catch (err) {
        console.error('[EmailService] Error guardando log:', err.message);
    }
}

// ==========================================================================
// OBTENER DESTINATARIOS POR REPORTE
// ==========================================================================
async function getDestinatariosReporte(idJob, claveReporte) {
    try {
        const [rows] = await db.query(`
            SELECT EMAIL_DESTINATARIO as email, NOMBRE_DESTINATARIO as nombre, TIPO as tipo
            FROM SCHEDULER_REPORTES_EMAIL
            WHERE ID_JOB = ? AND CLAVE_REPORTE = ? AND ACTIVO = 1
            ORDER BY TIPO, NOMBRE_DESTINATARIO, EMAIL_DESTINATARIO
        `, [idJob, claveReporte]);
        return rows;
    } catch (err) {
        console.error('[EmailService] Error obteniendo destinatarios:', err.message);
        return [];
    }
}

// ==========================================================================
// OBTENER TODOS LOS DESTINATARIOS DE UN JOB (AGRUPADOS POR EMAIL)
// ==========================================================================
async function getDestinatariosAgrupados(idJob) {
    try {
        const [rows] = await db.query(`
            SELECT 
                e.EMAIL_DESTINATARIO,
                e.NOMBRE_DESTINATARIO,
                e.TIPO,
                e.CLAVE_REPORTE,
                r.NOMBRE as NOMBRE_REPORTE,
                r.TIPO_REPORTE,
                r.DB_KEY
            FROM SCHEDULER_REPORTES_EMAIL e
            JOIN SCHEDULER_REPORTES_DETALLE r 
                ON e.ID_JOB = r.ID_JOB 
                AND e.CLAVE_REPORTE = r.CLAVE COLLATE utf8mb4_unicode_ci
            WHERE e.ID_JOB = ? AND e.ACTIVO = 1
            ORDER BY e.EMAIL_DESTINATARIO, e.TIPO
        `, [idJob]);
        
        // Agrupar por email
        const agrupados = {};
        for (const row of rows) {
            const email = row.EMAIL_DESTINATARIO;
            if (!agrupados[email]) {
                agrupados[email] = {
                    email: email,
                    nombre: row.NOMBRE_DESTINATARIO,
                    tipo: row.TIPO || 'PARA',
                    reportes: []
                };
            }
            agrupados[email].reportes.push({
                clave: row.CLAVE_REPORTE,
                nombre: row.NOMBRE_REPORTE,
                tipoReporte: row.TIPO_REPORTE,
                dbKey: row.DB_KEY
            });
        }
        
        return Object.values(agrupados);
    } catch (err) {
        console.error('[EmailService] Error obteniendo destinatarios agrupados:', err.message);
        return [];
    }
}

// ==========================================================================
// GESTIÓN DE DESTINATARIOS
// ==========================================================================
async function guardarDestinatario({ idJob, claveReporte, email, nombre, tipo, creadoPor }) {
    try {
        await db.query(`
            INSERT INTO SCHEDULER_REPORTES_EMAIL 
                (ID_JOB, CLAVE_REPORTE, EMAIL_DESTINATARIO, NOMBRE_DESTINATARIO, TIPO, ACTIVO, CREADO_POR)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            ON DUPLICATE KEY UPDATE 
                NOMBRE_DESTINATARIO = VALUES(NOMBRE_DESTINATARIO),
                TIPO = VALUES(TIPO),
                ACTIVO = 1,
                CREADO_POR = VALUES(CREADO_POR)
        `, [idJob, claveReporte, email.toLowerCase().trim(), nombre || '', tipo || 'PARA', creadoPor || 'sistema']);
        return { ok: true };
    } catch (err) {
        console.error('[EmailService] Error guardando destinatario:', err.message);
        throw err;
    }
}

async function eliminarDestinatario(idEmail) {
    try {
        await db.query('DELETE FROM SCHEDULER_REPORTES_EMAIL WHERE ID_EMAIL = ?', [idEmail]);
        return { ok: true };
    } catch (err) {
        console.error('[EmailService] Error eliminando destinatario:', err.message);
        throw err;
    }
}

async function listarDestinatarios(idJob) {
    try {
        const [rows] = await db.query(`
            SELECT 
                e.ID_EMAIL,
                e.ID_JOB,
                e.CLAVE_REPORTE,
                e.EMAIL_DESTINATARIO,
                e.NOMBRE_DESTINATARIO,
                e.TIPO,
                e.ACTIVO,
                e.CREADO_EL,
                r.NOMBRE as NOMBRE_REPORTE,
                r.TIPO_REPORTE
            FROM SCHEDULER_REPORTES_EMAIL e
            LEFT JOIN SCHEDULER_REPORTES_DETALLE r 
                ON e.ID_JOB = r.ID_JOB 
                AND e.CLAVE_REPORTE = r.CLAVE COLLATE utf8mb4_unicode_ci
            WHERE e.ID_JOB = ?
            ORDER BY e.TIPO, e.CREADO_EL DESC
        `, [idJob]);
        return rows;
    } catch (err) {
        console.error('[EmailService] Error listando destinatarios:', err.message);
        return [];
    }
}

async function listarDestinatariosPorReporte(idJob, claveReporte) {
    try {
        const [rows] = await db.query(`
            SELECT ID_EMAIL, EMAIL_DESTINATARIO, NOMBRE_DESTINATARIO, ACTIVO, CREADO_EL, CREADO_POR
            FROM SCHEDULER_REPORTES_EMAIL
            WHERE ID_JOB = ? AND CLAVE_REPORTE = ?
            ORDER BY EMAIL_DESTINATARIO
        `, [idJob, claveReporte]);
        return rows;
    } catch (err) {
        console.error('[EmailService] Error listando destinatarios:', err.message);
        return [];
    }
}

// ==========================================================================
// HISTORIAL DE ENVÍOS
// ==========================================================================
async function obtenerHistorialEnvios({ idJob, claveReporte, fechaDesde, fechaHasta, limit = 100 }) {
    try {
        let where = '1=1';
        const params = [];
        
        if (idJob) { where += ' AND ID_JOB = ?'; params.push(idJob); }
        if (claveReporte) { where += ' AND CLAVE_REPORTE = ?'; params.push(claveReporte); }
        if (fechaDesde) { where += ' AND FECHA_REPORTE >= ?'; params.push(fechaDesde); }
        if (fechaHasta) { where += ' AND FECHA_REPORTE <= ?'; params.push(fechaHasta); }
        
        const [rows] = await db.query(`
            SELECT 
                ID_LOG,
                ID_JOB,
                CLAVE_REPORTE,
                FECHA_REPORTE,
                EMAIL_DESTINATARIO,
                ASUNTO,
                OK,
                ERROR,
                MESSAGE_ID,
                DATE_FORMAT(ENVIADO_EL, '%Y-%m-%d %H:%i:%s') as ENVIADO_EL
            FROM SCHEDULER_EMAIL_LOG
            WHERE ${where}
            ORDER BY ENVIADO_EL DESC
            LIMIT ?
        `, [...params, limit]);
        return rows;
    } catch (err) {
        console.error('[EmailService] Error obteniendo historial:', err.message);
        return [];
    }
}

// ==========================================================================
// CONFIGURACIÓN SMTP
// ==========================================================================
async function actualizarConfig({ smtpHost, smtpPort, smtpSecure, authUser, authPass, fromEmail, fromName, replyTo }) {
    try {
        await db.query(`
            INSERT INTO EMAIL_CONFIG 
                (ID_CONFIG, SMTP_HOST, SMTP_PORT, SMTP_SECURE, AUTH_USER, AUTH_PASS, FROM_EMAIL, FROM_NAME, REPLY_TO, ACTIVO)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
                SMTP_HOST = VALUES(SMTP_HOST),
                SMTP_PORT = VALUES(SMTP_PORT),
                SMTP_SECURE = VALUES(SMTP_SECURE),
                AUTH_USER = VALUES(AUTH_USER),
                AUTH_PASS = IF(VALUES(AUTH_PASS) != '', VALUES(AUTH_PASS), AUTH_PASS),
                FROM_EMAIL = VALUES(FROM_EMAIL),
                FROM_NAME = VALUES(FROM_NAME),
                REPLY_TO = VALUES(REPLY_TO),
                MODIFICADO_EL = CURRENT_TIMESTAMP
        `, [
            smtpHost || 'smtp.office365.com',
            smtpPort || 587,
            smtpSecure ? 1 : 0,
            authUser || 'alex.carrera@consystec-corp.com',
            authPass || '',
            fromEmail || 'soporte@talkme.pro',
            fromName || 'Soporte TalkMe',
            replyTo || 'soporte@talkme.pro'
        ]);
        return { ok: true };
    } catch (err) {
        console.error('[EmailService] Error actualizando config:', err.message);
        throw err;
    }
}

async function obtenerConfig() {
    try {
        const [[config]] = await db.query('SELECT * FROM EMAIL_CONFIG WHERE ID_CONFIG = 1');
        if (!config) return getDefaultConfig();
        return {
            smtpHost: config.SMTP_HOST,
            smtpPort: config.SMTP_PORT,
            smtpSecure: !!config.SMTP_SECURE,
            authUser: config.AUTH_USER,
            fromEmail: config.FROM_EMAIL,
            fromName: config.FROM_NAME,
            replyTo: config.REPLY_TO,
            activo: !!config.ACTIVO,
            asuntoTemplate: config.ASUNTO_TEMPLATE || 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}',
            firmaHtml: config.FIRMA_HTML || '',
            imagenFirmaPath: config.IMAGEN_FIRMA_PATH || null
        };
    } catch (err) {
        return getDefaultConfig();
    }
}

async function actualizarConfigCompleta({ smtpHost, smtpPort, smtpSecure, authUser, authPass, fromEmail, fromName, replyTo, asuntoTemplate, firmaHtml, imagenFirmaPath }) {
    try {
        await db.query(`
            INSERT INTO EMAIL_CONFIG 
                (ID_CONFIG, SMTP_HOST, SMTP_PORT, SMTP_SECURE, AUTH_USER, AUTH_PASS, FROM_EMAIL, FROM_NAME, REPLY_TO, ASUNTO_TEMPLATE, FIRMA_HTML, IMAGEN_FIRMA_PATH, ACTIVO)
            VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
                SMTP_HOST = VALUES(SMTP_HOST),
                SMTP_PORT = VALUES(SMTP_PORT),
                SMTP_SECURE = VALUES(SMTP_SECURE),
                AUTH_USER = VALUES(AUTH_USER),
                AUTH_PASS = IF(VALUES(AUTH_PASS) != '', VALUES(AUTH_PASS), AUTH_PASS),
                FROM_EMAIL = VALUES(FROM_EMAIL),
                FROM_NAME = VALUES(FROM_NAME),
                REPLY_TO = VALUES(REPLY_TO),
                ASUNTO_TEMPLATE = VALUES(ASUNTO_TEMPLATE),
                FIRMA_HTML = VALUES(FIRMA_HTML),
                IMAGEN_FIRMA_PATH = VALUES(IMAGEN_FIRMA_PATH),
                MODIFICADO_EL = CURRENT_TIMESTAMP
        `, [
            smtpHost || 'smtp.office365.com',
            smtpPort || 587,
            smtpSecure ? 1 : 0,
            authUser || 'alex.carrera@consystec-corp.com',
            authPass || '',
            fromEmail || 'soporte@talkme.pro',
            fromName || 'Soporte TalkMe',
            replyTo || 'soporte@talkme.pro',
            asuntoTemplate || 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}',
            firmaHtml || '',
            imagenFirmaPath || null
        ]);
        return { ok: true };
    } catch (err) {
        console.error('[EmailService] Error actualizando config:', err.message);
        throw err;
    }
}

// ==========================================================================
// PROBAR CONFIGURACIÓN
// ==========================================================================
async function probarConfiguracion(emailPrueba) {
    try {
        const transporter = await createTransporter();
        const config = await getEmailConfig();
        
        const info = await transporter.sendMail({
            from: {
                name: config.fromName,
                address: config.fromEmail
            },
            to: emailPrueba,
            replyTo: config.replyTo,
            subject: '✅ Prueba de configuración - TalkMe Reportes',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #16a34a;">✅ Configuración de correo exitosa</h2>
                    <p>Este es un correo de prueba para verificar la configuración de envío automático de reportes.</p>
                    
                    <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <p style="margin: 5px 0;"><strong>Configuración:</strong></p>
                        <ul style="margin: 5px 0;">
                            <li><strong>De:</strong> ${config.fromEmail} (${config.fromName})</li>
                            <li><strong>Reply-To:</strong> ${config.replyTo}</li>
                            <li><strong>SMTP:</strong> ${config.smtpHost}:${config.smtpPort}</li>
                            <li><strong>Usuario:</strong> ${config.authUser}</li>
                        </ul>
                    </div>
                    
                    <p style="color: #64748b; font-size: 13px;">
                        Si recibiste este correo, la configuración es correcta y los reportes automáticos funcionarán.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="color: #94a3b8; font-size: 12px;">
                        TalkMe - Sistema de Reportes Automáticos<br>
                        Para soporte: <a href="mailto:${config.replyTo}">${config.replyTo}</a>
                    </p>
                </div>
            `
        });
        
        console.log(`[EmailService] 📧 Prueba enviada a ${emailPrueba}: ${info.messageId}`);
        return { ok: true, messageId: info.messageId };
    } catch (err) {
        console.error('[EmailService] ❌ Error en prueba:', err.message);
        return { ok: false, error: err.message };
    }
}

// ==========================================================================
// PLANTILLAS DE CORREO (CONFIGURACIÓN TIPO OUTLOOK)
// ==========================================================================

async function crearTemplate({ idJob, nombre, asunto, cuerpoHtml, firmaHtml, imagenFirmaPath, reportes, destinatarios, creadoPor }) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // Crear template
        const [result] = await conn.query(`
            INSERT INTO SCHEDULER_EMAIL_TEMPLATES 
                (ID_JOB, NOMBRE_TEMPLATE, ASUNTO, CUERPO_HTML, FIRMA_HTML, IMAGEN_FIRMA_PATH, CREADO_POR)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [idJob, nombre, asunto, cuerpoHtml, firmaHtml, imagenFirmaPath, creadoPor]);
        
        const idTemplate = result.insertId;
        
        // Agregar reportes
        if (reportes && reportes.length > 0) {
            for (let i = 0; i < reportes.length; i++) {
                await conn.query(`
                    INSERT INTO SCHEDULER_TEMPLATE_REPORTES (ID_TEMPLATE, CLAVE_REPORTE, ORDEN)
                    VALUES (?, ?, ?)
                `, [idTemplate, reportes[i], i]);
            }
        }
        
        // Agregar destinatarios
        if (destinatarios && destinatarios.length > 0) {
            for (const dest of destinatarios) {
                await conn.query(`
                    INSERT INTO SCHEDULER_TEMPLATE_DESTINATARIOS (ID_TEMPLATE, EMAIL, NOMBRE, TIPO)
                    VALUES (?, ?, ?, ?)
                `, [idTemplate, dest.email, dest.nombre || '', dest.tipo || 'PARA']);
            }
        }
        
        await conn.commit();
        return { ok: true, idTemplate };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function actualizarTemplate(idTemplate, { nombre, asunto, cuerpoHtml, firmaHtml, imagenFirmaPath, reportes, destinatarios }) {
    const conn = await db.getConnection();
    try {
        await conn.beginTransaction();
        
        // Actualizar template
        await conn.query(`
            UPDATE SCHEDULER_EMAIL_TEMPLATES 
            SET NOMBRE_TEMPLATE = ?, ASUNTO = ?, CUERPO_HTML = ?, FIRMA_HTML = ?, IMAGEN_FIRMA_PATH = ?
            WHERE ID_TEMPLATE = ?
        `, [nombre, asunto, cuerpoHtml, firmaHtml, imagenFirmaPath, idTemplate]);
        
        // Eliminar y recrear reportes
        await conn.query('DELETE FROM SCHEDULER_TEMPLATE_REPORTES WHERE ID_TEMPLATE = ?', [idTemplate]);
        if (reportes && reportes.length > 0) {
            for (let i = 0; i < reportes.length; i++) {
                await conn.query(`
                    INSERT INTO SCHEDULER_TEMPLATE_REPORTES (ID_TEMPLATE, CLAVE_REPORTE, ORDEN)
                    VALUES (?, ?, ?)
                `, [idTemplate, reportes[i], i]);
            }
        }
        
        // Eliminar y recrear destinatarios
        await conn.query('DELETE FROM SCHEDULER_TEMPLATE_DESTINATARIOS WHERE ID_TEMPLATE = ?', [idTemplate]);
        if (destinatarios && destinatarios.length > 0) {
            for (const dest of destinatarios) {
                await conn.query(`
                    INSERT INTO SCHEDULER_TEMPLATE_DESTINATARIOS (ID_TEMPLATE, EMAIL, NOMBRE, TIPO)
                    VALUES (?, ?, ?, ?)
                `, [idTemplate, dest.email, dest.nombre || '', dest.tipo || 'PARA']);
            }
        }
        
        await conn.commit();
        return { ok: true };
    } catch (err) {
        await conn.rollback();
        throw err;
    } finally {
        conn.release();
    }
}

async function obtenerTemplate(idTemplate) {
    try {
        const [[template]] = await db.query(`
            SELECT * FROM SCHEDULER_EMAIL_TEMPLATES WHERE ID_TEMPLATE = ? AND ACTIVO = 1
        `, [idTemplate]);
        
        if (!template) return null;
        
        // Obtener reportes
        const [reportes] = await db.query(`
            SELECT CLAVE_REPORTE FROM SCHEDULER_TEMPLATE_REPORTES 
            WHERE ID_TEMPLATE = ? ORDER BY ORDEN
        `, [idTemplate]);
        
        // Obtener destinatarios
        const [destinatarios] = await db.query(`
            SELECT ID_DEST, EMAIL, NOMBRE, TIPO FROM SCHEDULER_TEMPLATE_DESTINATARIOS
            WHERE ID_TEMPLATE = ? AND ACTIVO = 1
        `, [idTemplate]);

        return {
            ...template,
            reportes: reportes.map(r => r.CLAVE_REPORTE),
            destinatarios: destinatarios.map(d => ({ id: d.ID_DEST, email: d.EMAIL, nombre: d.NOMBRE, tipo: d.TIPO }))
        };
    } catch (err) {
        console.error('[EmailService] Error obteniendo template:', err.message);
        return null;
    }
}

async function listarTemplates(idJob) {
    try {
        const [templates] = await db.query(`
            SELECT 
                t.ID_TEMPLATE,
                t.NOMBRE_TEMPLATE,
                t.ASUNTO,
                t.ACTIVO,
                t.CREADO_EL,
                COUNT(DISTINCT tr.CLAVE_REPORTE) as CANT_REPORTES,
                COUNT(DISTINCT td.ID_DEST) as CANT_DESTINATARIOS
            FROM SCHEDULER_EMAIL_TEMPLATES t
            LEFT JOIN SCHEDULER_TEMPLATE_REPORTES tr ON t.ID_TEMPLATE = tr.ID_TEMPLATE
            LEFT JOIN SCHEDULER_TEMPLATE_DESTINATARIOS td ON t.ID_TEMPLATE = td.ID_TEMPLATE AND td.ACTIVO = 1
            WHERE t.ID_JOB = ? AND t.ACTIVO = 1
            GROUP BY t.ID_TEMPLATE
            ORDER BY t.CREADO_EL DESC
        `, [idJob]);
        return templates;
    } catch (err) {
        console.error('[EmailService] Error listando templates:', err.message);
        return [];
    }
}

async function eliminarTemplate(idTemplate) {
    try {
        await db.query('UPDATE SCHEDULER_EMAIL_TEMPLATES SET ACTIVO = 0 WHERE ID_TEMPLATE = ?', [idTemplate]);
        return { ok: true };
    } catch (err) {
        console.error('[EmailService] Error eliminando template:', err.message);
        throw err;
    }
}

async function toggleTemplateActivo(idTemplate, activo) {
    try {
        await db.query('UPDATE SCHEDULER_EMAIL_TEMPLATES SET ACTIVO = ? WHERE ID_TEMPLATE = ?', [activo ? 1 : 0, idTemplate]);
        return { ok: true, activo };
    } catch (err) {
        console.error('[EmailService] Error cambiando estado de template:', err.message);
        throw err;
    }
}

// ==========================================================================
// OBTENER PLANTILLAS COMPLETAS PARA ENVÍO (con destinatarios y reportes)
// ==========================================================================
async function obtenerPlantillasParaEnvio(idJob) {
    try {
        // Obtener todas las plantillas activas del job
        const [templates] = await db.query(`
            SELECT ID_TEMPLATE, NOMBRE_TEMPLATE, ASUNTO, CUERPO_HTML, FIRMA_HTML, IMAGEN_FIRMA_PATH
            FROM SCHEDULER_EMAIL_TEMPLATES
            WHERE ID_JOB = ? AND ACTIVO = 1
        `, [idJob]);

        const plantillasCompletas = [];

        for (const template of templates) {
            // Obtener reportes de esta plantilla
            const [reportes] = await db.query(`
                SELECT CLAVE_REPORTE FROM SCHEDULER_TEMPLATE_REPORTES
                WHERE ID_TEMPLATE = ? ORDER BY ORDEN
            `, [template.ID_TEMPLATE]);

            // Obtener destinatarios de esta plantilla
            const [destinatarios] = await db.query(`
                SELECT EMAIL, NOMBRE, TIPO FROM SCHEDULER_TEMPLATE_DESTINATARIOS
                WHERE ID_TEMPLATE = ? AND ACTIVO = 1
            `, [template.ID_TEMPLATE]);

            plantillasCompletas.push({
                idTemplate: template.ID_TEMPLATE,
                nombre: template.NOMBRE_TEMPLATE,
                asunto: template.ASUNTO,
                cuerpoHtml: template.CUERPO_HTML,
                firmaHtml: template.FIRMA_HTML,
                imagenFirmaPath: template.IMAGEN_FIRMA_PATH,
                reportes: reportes.map(r => r.CLAVE_REPORTE),
                destinatarios: destinatarios.map(d => ({
                    email: d.EMAIL,
                    nombre: d.NOMBRE,
                    tipo: d.TIPO || 'PARA'
                }))
            });
        }

        return plantillasCompletas;
    } catch (err) {
        console.error('[EmailService] Error obteniendo plantillas para envío:', err.message);
        return [];
    }
}

// ==========================================================================
// EXPORTAR
// ==========================================================================
module.exports = {
    // Envío
    enviarReportePorEmail,
    getDestinatariosReporte,
    getDestinatariosAgrupados,
    generarAsunto,
    generarCuerpoEmail,
    
    // Gestión de destinatarios
    guardarDestinatario,
    eliminarDestinatario,
    listarDestinatarios,
    listarDestinatariosPorReporte,
    
    // Historial
    obtenerHistorialEnvios,
    guardarLogEnvio,
    
    // Configuración
    actualizarConfig,
    actualizarConfigCompleta,
    obtenerConfig,
    probarConfiguracion,
    getEmailConfig,
    
    // Plantillas
    crearTemplate,
    actualizarTemplate,
    obtenerTemplate,
    listarTemplates,
    eliminarTemplate,
    toggleTemplateActivo,
    obtenerPlantillasParaEnvio
};
