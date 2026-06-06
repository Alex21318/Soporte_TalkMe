-- Tabla de configuración de tareas programadas (cierres y facebook)
CREATE TABLE IF NOT EXISTS SCHEDULER_TAREAS (
    ID_TAREA  INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    TIPO      VARCHAR(20)  NOT NULL COMMENT 'cierres | facebook',
    DB_KEY    VARCHAR(20)  NOT NULL,
    NOMBRE    VARCHAR(100) NOT NULL,
    HORA_GT   TIME         NOT NULL COMMENT 'Hora Guatemala HH:MM:SS',
    ACTIVO    TINYINT(1)   NOT NULL DEFAULT 1,
    CREADO_EL DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_tipo_db (TIPO, DB_KEY)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Tabla de historial de ejecuciones de tareas
CREATE TABLE IF NOT EXISTS SCHEDULER_TAREAS_LOG (
    ID_LOG       INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
    ID_TAREA     INT          NULL,
    TIPO         VARCHAR(20)  NOT NULL,
    DB_KEY       VARCHAR(20)  NOT NULL,
    OK           TINYINT(1)   NOT NULL DEFAULT 0,
    AFECTADOS    INT          NULL COMMENT 'Conversaciones cerradas o solicitudes actualizadas',
    DETALLE_IDS  JSON         NULL COMMENT 'Array de objetos con detalle completo: ID, Empresa, Fecha, Dias, Estado, etc.',
    ERROR        TEXT         NULL,
    EJECUTADO_EL DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
