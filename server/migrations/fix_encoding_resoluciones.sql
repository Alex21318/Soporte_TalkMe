-- ============================================================================
-- DIAGNÓSTICO Y CORRECCIÓN DE CODIFICACIÓN EN RESOLUCIONES
-- ============================================================================
-- El problema: Algunos registros muestran "Conversacin" en lugar de "Conversación"
-- Causa: Conexión sin charset UTF-8 o datos insertados con codificación incorrecta
-- ============================================================================

-- 1. PRIMERO: Verificar el charset de la tabla y columna
-- ============================================================================
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CHARACTER_SET_NAME,
    COLLATION_NAME,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'RESOLUCIONES'
AND COLUMN_NAME = 'RESOLUCION';

-- 2. BUSCAR registros con caracteres corruptos ()
-- ============================================================================
-- Esto encontrará registros donde la 'ó' se convirtió en ''
SELECT 
    ID_RESOLUCION,
    ID_CONVERSACION,
    RESOLUCION,
    LENGTH(RESOLUCION) as longitud,
    HEX(RESOLUCION) as hex_content
FROM RESOLUCIONES
WHERE RESOLUCION LIKE '%Conversacin%'
   OR RESOLUCION LIKE '%%'
   OR RESOLUCION REGEXP '[^[:ascii:]]' -- Caracteres no-ASCII
ORDER BY ID_RESOLUCION DESC
LIMIT 100;

-- 3. CORREGIR registros específicos (ejemplo: cierre directo)
-- ============================================================================
-- Descomenta y modifica según los IDs que encuentres arriba:
-- UPDATE RESOLUCIONES 
-- SET RESOLUCION = REPLACE(RESOLUCION, 'Conversacin', 'Conversación')
-- WHERE RESOLUCION LIKE '%Conversacin%';

-- O más general, corregir cualquier por ó:
-- UPDATE RESOLUCIONES 
-- SET RESOLUCION = REPLACE(RESOLUCION, '', 'ó')
-- WHERE RESOLUCION LIKE '%%';

-- 4. VERIFICAR que la tabla usa utf8mb4 (SI NO, EJECUTAR ESTO):
-- ============================================================================
-- ALTER TABLE RESOLUCIONES 
-- CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 5. Script para corregir TODOS los registros de una empresa específica
-- ============================================================================
-- Si el problema es solo de cierta empresa, usa:
-- UPDATE RESOLUCIONES R
-- JOIN CONVERSACIONES C ON C.ID_CONVERSACION = R.ID_CONVERSACION
-- SET R.RESOLUCION = REPLACE(R.RESOLUCION, '', 'ó')
-- WHERE C.ID_EMPRESA = XXX  -- Reemplaza XXX con el ID de empresa
-- AND R.RESOLUCION LIKE '%%';

-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ejecuta el paso 1 para verificar el charset
-- 2. Ejecuta el paso 2 para encontrar registros corruptos
-- 3. Toma nota de los IDs encontrados
-- 4. Ejecuta el paso 3 o 5 con los IDs específicos
-- 5. Reinicia la aplicación (ya tiene charset utf8mb4 configurado)
-- ============================================================================
