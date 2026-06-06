-- ============================================================================
-- Agregar campo creado_por a PROGRAMACION_HORARIOS
-- Este campo guardará el usuario que creó la programación de horarios
-- para que el worker use ese usuario cuando aplique/revierta la programación
-- ============================================================================

ALTER TABLE PROGRAMACION_HORARIOS 
ADD COLUMN creado_por VARCHAR(100) DEFAULT 'sistema' AFTER estado;

-- ============================================================================
-- Agregar índice para optimizar consultas por usuario (opcional)
-- ============================================================================
CREATE INDEX idx_programacion_usuario ON PROGRAMACION_HORARIOS (creado_por);
