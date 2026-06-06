-- Migración: Agregar columna id_horario_creado a PROGRAMACION_HORARIOS
-- Esta columna almacena el ID del horario temporal creado para poder eliminarlo específicamente

ALTER TABLE PROGRAMACION_HORARIOS 
ADD COLUMN id_horario_creado INT NULL 
COMMENT 'ID del horario temporal creado en HORARIO_SKILL (para eliminarlo específicamente en reversión)' 
AFTER id_original_horario;
