-- ============================================================================
-- ACTUALIZAR IMAGEN DE FIRMA DE SOPORTE A URL DE S3
-- ============================================================================
-- Este script actualiza la configuración de email para usar una URL de S3
-- en lugar de una ruta local para la imagen de firma de soporte.

-- Actualizar EMAIL_CONFIG con la URL de S3
UPDATE EMAIL_CONFIG 
SET IMAGEN_FIRMA_PATH = 'https://s3.us-east-1.amazonaws.com/com.talkme/talkme/archivos_bot/soporte_talkme/bot_soporte_talkme/Firma_Soporte.jpg',
    MODIFICADO_EL = CURRENT_TIMESTAMP
WHERE ID_CONFIG = 1;

-- Verificar el cambio
SELECT 
    ID_CONFIG,
    IMAGEN_FIRMA_PATH,
    MODIFICADO_EL
FROM EMAIL_CONFIG 
WHERE ID_CONFIG = 1;
