-- Verificar el tipo de dato actual de la columna IMAGEN_FIRMA_PATH
-- Si es VARCHAR, cambiar a TEXT para soportar imágenes base64

-- MySQL/MariaDB
ALTER TABLE SCHEDULER_EMAIL_TEMPLATES 
MODIFY COLUMN IMAGEN_FIRMA_PATH TEXT NULL;

-- Verificar el cambio
DESCRIBE SCHEDULER_EMAIL_TEMPLATES;
