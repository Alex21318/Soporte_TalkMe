-- ==========================================
-- TABLA DE AUDITORÍA / LOGS DE ACTIVIDAD
-- Ejecutar esto en la base de datos de control (skillstalkme_db)
-- ==========================================

CREATE TABLE IF NOT EXISTS AUDITORIA_LOGS (
    ID_LOG              INT             NOT NULL AUTO_INCREMENT PRIMARY KEY,
    FECHA_HORA          DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    TIPO_ACCION         VARCHAR(50)     NOT NULL COMMENT 'INSERT|UPDATE|DELETE|LOGIN|LOGOUT|PERMISO_AGREGAR|PERMISO_ELIMINAR|PERMISO_MASIVO',
    ENTIDAD             VARCHAR(50)     NOT NULL COMMENT 'USUARIOS|SKILLS|BOT_REDES|PERMISOS|TIPOS_CLIENTE',
    ID_ENTIDAD          VARCHAR(100)    NULL COMMENT 'ID del registro afectado',
    
    -- Información del usuario que realizó la acción
    ID_USUARIO_SISTEMA  INT             NULL COMMENT 'ID del usuario en el sistema de control',
    NOMBRE_USUARIO      VARCHAR(100)    NOT NULL COMMENT 'Nombre del usuario que realizó la acción',
    IP_ADDRESS          VARCHAR(45)     NULL COMMENT 'Dirección IP del usuario',
    USER_AGENT          VARCHAR(255)    NULL COMMENT 'Navegador/dispositivo utilizado',
    
    -- Información de la base de datos/empresa
    DB_KEY              VARCHAR(20)     NULL COMMENT 'db_1, db_2, etc.',
    DB_NOMBRE           VARCHAR(50)     NULL COMMENT 'Nombre descriptivo de la BD',
    ID_EMPRESA          INT             NULL,
    NOMBRE_EMPRESA      VARCHAR(100)    NULL,
    
    -- Información del permiso/usuario afectado
    ID_USUARIO_AFECTADO INT             NULL COMMENT 'ID del usuario al que se le modificó el permiso',
    NOMBRE_USUARIO_AFEC VARCHAR(100)    NULL,
    ID_SKILL            INT             NULL,
    NOMBRE_SKILL        VARCHAR(100)    NULL,
    ID_BOT_RED          INT             NULL,
    NOMBRE_BOT_RED      VARCHAR(100)    NULL,
    ID_TIPO_CLIENTE     INT             NULL,
    NOMBRE_TIPO_CLIENTE VARCHAR(100)    NULL,
    
    -- Detalles de la acción
    VALOR_ANTERIOR      JSON            NULL COMMENT 'Datos antes del cambio (para UPDATE/DELETE)',
    VALOR_NUEVO         JSON            NULL COMMENT 'Datos después del cambio (para INSERT/UPDATE)',
    DESCRIPCION         TEXT            NULL COMMENT 'Descripción legible de la acción',
    
    -- Resultado
    EXITO               TINYINT(1)      NOT NULL DEFAULT 1 COMMENT '1=Éxito, 0=Error',
    MENSAJE_ERROR       TEXT            NULL,
    
    INDEX idx_fecha (FECHA_HORA),
    INDEX idx_tipo_accion (TIPO_ACCION),
    INDEX idx_entidad (ENTIDAD),
    INDEX idx_usuario (ID_USUARIO_SISTEMA, NOMBRE_USUARIO),
    INDEX idx_db_empresa (DB_KEY, ID_EMPRESA),
    INDEX idx_usuario_afectado (ID_USUARIO_AFECTADO)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Tabla de auditoría para registrar todas las acciones del sistema';
