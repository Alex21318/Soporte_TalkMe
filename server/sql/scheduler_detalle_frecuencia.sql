-- ============================================================================
-- MIGRACIÓN: Agregar columnas de frecuencia a SCHEDULER_REPORTES_DETALLE
-- Cada reporte puede tener su propia frecuencia (diario, semanal, mensual)
-- Ejecutar en la base de datos de CONTROL (skillstalkme_db)
-- ============================================================================

-- Agregar columna FRECUENCIA si no existe
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'SCHEDULER_REPORTES_DETALLE' 
    AND COLUMN_NAME = 'FRECUENCIA'
    AND TABLE_SCHEMA = DATABASE()
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE SCHEDULER_REPORTES_DETALLE ADD COLUMN FRECUENCIA ENUM("diario", "semanal", "mensual") NULL DEFAULT NULL COMMENT "Frecuencia: diario, semanal, mensual. NULL hereda la del job padre" AFTER FLUJO',
    'SELECT "Columna FRECUENCIA ya existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna DIA_SEMANA si no existe (1=Lunes, 7=Domingo)
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'SCHEDULER_REPORTES_DETALLE' 
    AND COLUMN_NAME = 'DIA_SEMANA'
    AND TABLE_SCHEMA = DATABASE()
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE SCHEDULER_REPORTES_DETALLE ADD COLUMN DIA_SEMANA TINYINT UNSIGNED NULL COMMENT "Dia de la semana (1=Lunes, 7=Domingo) para frecuencia semanal" AFTER FRECUENCIA',
    'SELECT "Columna DIA_SEMANA ya existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Agregar columna DIA_MES si no existe (1-31)
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'SCHEDULER_REPORTES_DETALLE' 
    AND COLUMN_NAME = 'DIA_MES'
    AND TABLE_SCHEMA = DATABASE()
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE SCHEDULER_REPORTES_DETALLE ADD COLUMN DIA_MES TINYINT UNSIGNED NULL COMMENT "Dia del mes (1-31) para frecuencia mensual" AFTER DIA_SEMANA',
    'SELECT "Columna DIA_MES ya existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar columnas
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_COMMENT,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'SCHEDULER_REPORTES_DETALLE' 
AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;