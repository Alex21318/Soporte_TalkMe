-- ============================================================================
-- MIGRACIÓN: Agregar columna DETALLE_IDS a SCHEDULER_TAREAS_LOG
-- ============================================================================
-- Ejecutar esto en la base de datos de control (skillstalkme_db)
-- para agregar la columna que almacena los IDs de conversaciones/solicitudes
-- ============================================================================

-- Agregar columna DETALLE_IDS si no existe
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME = 'SCHEDULER_TAREAS_LOG' 
    AND COLUMN_NAME = 'DETALLE_IDS'
    AND TABLE_SCHEMA = DATABASE()
);

SET @sql = IF(@column_exists = 0, 
    'ALTER TABLE SCHEDULER_TAREAS_LOG ADD COLUMN DETALLE_IDS JSON NULL COMMENT "Array con IDs de conversaciones o solicitudes procesadas" AFTER AFECTADOS',
    'SELECT "Columna DETALLE_IDS ya existe" AS mensaje'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verificar que la columna se agregó correctamente
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_NAME = 'SCHEDULER_TAREAS_LOG' 
AND TABLE_SCHEMA = DATABASE()
ORDER BY ORDINAL_POSITION;
