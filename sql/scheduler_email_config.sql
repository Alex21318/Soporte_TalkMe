-- ============================================================================
-- TABLAS PARA CONFIGURACIÓN DE CORREOS AUTOMÁTICOS DE REPORTES
-- Ejecutar en la base de datos de CONTROL (skillstalkme_db)
-- ============================================================================

-- Tabla para configuración SMTP y cuenta de envío
CREATE TABLE IF NOT EXISTS EMAIL_CONFIG (
    ID_CONFIG INT PRIMARY KEY DEFAULT 1,
    SMTP_HOST VARCHAR(100) DEFAULT 'smtp.office365.com',
    SMTP_PORT INT DEFAULT 587,
    SMTP_SECURE TINYINT DEFAULT 0,
    AUTH_USER VARCHAR(255) DEFAULT 'alex.carrera@consystec-corp.com',
    AUTH_PASS VARCHAR(255),
    FROM_EMAIL VARCHAR(255) DEFAULT 'soporte@talkme.pro',
    FROM_NAME VARCHAR(100) DEFAULT 'Soporte TalkMe',
    REPLY_TO VARCHAR(255) DEFAULT 'soporte@talkme.pro',
    ACTIVO TINYINT DEFAULT 1,
    MODIFICADO_EL TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO EMAIL_CONFIG (ID_CONFIG) VALUES (1) 
ON DUPLICATE KEY UPDATE ID_CONFIG=ID_CONFIG;

-- Tabla para destinatarios de reportes automáticos
CREATE TABLE IF NOT EXISTS SCHEDULER_REPORTES_EMAIL (
    ID_EMAIL INT AUTO_INCREMENT PRIMARY KEY,
    ID_JOB INT NOT NULL,
    CLAVE_REPORTE VARCHAR(50) NOT NULL,
    EMAIL_DESTINATARIO VARCHAR(255) NOT NULL,
    NOMBRE_DESTINATARIO VARCHAR(100),
    TIPO VARCHAR(10) DEFAULT 'PARA', -- PARA, CC
    ACTIVO TINYINT DEFAULT 1,
    CREADO_EL TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CREADO_POR VARCHAR(50),
    UNIQUE KEY uk_email_reporte (ID_JOB, CLAVE_REPORTE, EMAIL_DESTINATARIO, TIPO),
    INDEX idx_id_job (ID_JOB)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para log de envíos de correo
CREATE TABLE IF NOT EXISTS SCHEDULER_EMAIL_LOG (
    ID_LOG INT AUTO_INCREMENT PRIMARY KEY,
    ID_JOB INT NOT NULL,
    CLAVE_REPORTE VARCHAR(500) NOT NULL, -- Ahora soporta múltiples claves separadas por coma
    FECHA_REPORTE DATE NOT NULL,
    EMAIL_DESTINATARIO VARCHAR(500), -- Para + CC concatenados
    ASUNTO VARCHAR(500),
    OK TINYINT DEFAULT 0,
    ERROR TEXT,
    MESSAGE_ID VARCHAR(100),
    ENVIADO_EL TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fecha (FECHA_REPORTE),
    INDEX idx_job_clave (ID_JOB, CLAVE_REPORTE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- ALTERACIONES PARA NUEVOS CAMPOS (ejecutar si ya existen las tablas)
-- ============================================================================

-- Agregar columna TIPO a destinatarios si no existe
ALTER TABLE SCHEDULER_REPORTES_EMAIL 
    ADD COLUMN IF NOT EXISTS TIPO VARCHAR(10) DEFAULT 'PARA' AFTER NOMBRE_DESTINATARIO;

-- Agregar columnas de configuración de email si no existen
ALTER TABLE EMAIL_CONFIG 
    ADD COLUMN IF NOT EXISTS ASUNTO_TEMPLATE VARCHAR(500) DEFAULT 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}' AFTER REPLY_TO,
    ADD COLUMN IF NOT EXISTS FIRMA_HTML TEXT AFTER ASUNTO_TEMPLATE,
    ADD COLUMN IF NOT EXISTS IMAGEN_FIRMA_PATH VARCHAR(500) AFTER FIRMA_HTML;

-- Actualizar firma por defecto (usando clave primaria para safe mode)
UPDATE EMAIL_CONFIG SET 
    FIRMA_HTML = '<div style="margin-top:30px;font-family:Arial,sans-serif;"><p>Buenos días Estimados,</p><p>Adjuntamos reporte correspondiente al día {FECHA}.</p><p>Quedamos atentos a sus comentarios o dudas.</p><p>Saludos cordiales</p></div>'
WHERE ID_CONFIG = 1 AND FIRMA_HTML IS NULL;

-- ============================================================================
-- TABLA PARA PLANTILLAS DE CORREO (CONFIGURACIÓN TIPO OUTLOOK)
-- ============================================================================

CREATE TABLE IF NOT EXISTS SCHEDULER_EMAIL_TEMPLATES (
    ID_TEMPLATE INT AUTO_INCREMENT PRIMARY KEY,
    ID_JOB INT NOT NULL,
    NOMBRE_TEMPLATE VARCHAR(100) NOT NULL, -- Ej: "Reportes Diarios Ficohsa"
    ASUNTO VARCHAR(500) NOT NULL,
    CUERPO_HTML TEXT, -- Cuerpo del correo en HTML
    FIRMA_HTML TEXT, -- Firma personalizada
    IMAGEN_FIRMA_PATH VARCHAR(500), -- Ruta a imagen de firma
    ACTIVO TINYINT DEFAULT 1,
    CREADO_EL TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    MODIFICADO_EL TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CREADO_POR VARCHAR(50),
    INDEX idx_id_job (ID_JOB)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para relacionar plantillas con reportes (muchos a muchos)
CREATE TABLE IF NOT EXISTS SCHEDULER_TEMPLATE_REPORTES (
    ID_REL INT AUTO_INCREMENT PRIMARY KEY,
    ID_TEMPLATE INT NOT NULL,
    CLAVE_REPORTE VARCHAR(50) NOT NULL,
    ORDEN INT DEFAULT 0, -- Para ordenar los reportes en el correo
    FOREIGN KEY (ID_TEMPLATE) REFERENCES SCHEDULER_EMAIL_TEMPLATES(ID_TEMPLATE) ON DELETE CASCADE,
    UNIQUE KEY uk_template_reporte (ID_TEMPLATE, CLAVE_REPORTE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla para destinatarios de plantillas (Para/CC separados)
CREATE TABLE IF NOT EXISTS SCHEDULER_TEMPLATE_DESTINATARIOS (
    ID_DEST INT AUTO_INCREMENT PRIMARY KEY,
    ID_TEMPLATE INT NOT NULL,
    EMAIL VARCHAR(255) NOT NULL,
    NOMBRE VARCHAR(100),
    TIPO VARCHAR(10) DEFAULT 'PARA', -- PARA, CC
    ACTIVO TINYINT DEFAULT 1,
    FOREIGN KEY (ID_TEMPLATE) REFERENCES SCHEDULER_EMAIL_TEMPLATES(ID_TEMPLATE) ON DELETE CASCADE,
    INDEX idx_id_template (ID_TEMPLATE)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de destinatarios activos con info del reporte
CREATE OR REPLACE VIEW V_SCHEDULER_DESTINATARIOS AS
SELECT 
    e.ID_EMAIL,
    e.ID_JOB,
    e.CLAVE_REPORTE,
    e.EMAIL_DESTINATARIO,
    e.NOMBRE_DESTINATARIO,
    e.TIPO,
    e.ACTIVO,
    e.CREADO_EL,
    r.NOMBRE AS NOMBRE_REPORTE,
    r.TIPO_REPORTE,
    r.DB_KEY
FROM SCHEDULER_REPORTES_EMAIL e
JOIN SCHEDULER_REPORTES_DETALLE r 
    ON e.ID_JOB = r.ID_JOB 
    AND e.CLAVE_REPORTE = r.CLAVE COLLATE utf8mb4_unicode_ci
WHERE e.ACTIVO = 1;

-- ============================================================================
-- DATOS DE EJEMPLO (opcional, eliminar si no se desea)
-- ============================================================================

-- Ejemplo: agregar destinatarios de prueba (ajustar según necesidad)
-- INSERT INTO SCHEDULER_REPORTES_EMAIL (ID_JOB, CLAVE_REPORTE, EMAIL_DESTINATARIO, NOMBRE_DESTINATARIO, TIPO, CREADO_POR)
-- SELECT ID_JOB, 'detallado', 'ejemplo@empresa.com', 'Usuario Ejemplo', 'PARA', 'sistema'
-- FROM SCHEDULER_REPORTES LIMIT 1;
