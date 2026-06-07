-- Agregar columna para tracking de último intento fallido de login
-- Esto permite implementar bloqueo temporal por demasiados intentos

ALTER TABLE USUARIOS_SISTEMA 
ADD COLUMN ultimo_intento_fallido DATETIME NULL 
AFTER intentos_fallidos;

-- Agregar índice para mejor performance en consultas de login
CREATE INDEX idx_ultimo_intento_fallido ON USUARIOS_SISTEMA(ultimo_intento_fallido);
