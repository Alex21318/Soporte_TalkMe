-- ============================================================================
-- ÍNDICE PARA OPTIMIZAR CONSULTA DE HISTORIAL
-- ============================================================================
-- Problema: La consulta del historial tarda mucho porque MySQL debe hacer
-- un full table scan y ordenar todos los registros REVERTIDOS por fecha.
-- 
-- Consulta original:
-- SELECT * FROM PROGRAMACION_HORARIOS 
-- WHERE estado = 'REVERTIDO' 
-- ORDER BY fecha_reversion DESC 
-- LIMIT 200
--
-- Solución: Índice compuesto (estado, fecha_reversion) que permite:
-- 1. Filtrar rápidamente solo los registros con estado = 'REVERTIDO'
-- 2. Tenerlos ya ordenados por fecha_reversion DESC
-- 3. Tomar los primeros 200 sin ordenar toda la tabla
-- ============================================================================

-- Crear índice compuesto para optimizar consulta de historial
CREATE INDEX idx_programacion_historial 
ON PROGRAMACION_HORARIOS (estado, fecha_reversion DESC);

-- También crear índice para la consulta de programados (estados PENDIENTE y APLICADO)
-- que usa ORDER BY fecha_aplicacion
CREATE INDEX idx_programacion_cola 
ON PROGRAMACION_HORARIOS (estado, fecha_aplicacion DESC);

-- ============================================================================
-- VISTA OPCIONAL (si prefieres encapsular la consulta)
-- ============================================================================
-- Si prefieres tener una vista para el historial:
/*
CREATE VIEW V_HISTORIAL_HORARIOS AS
SELECT 
    id,
    db_key,
    id_skill,
    id_original_horario,
    id_horario_creado,
    nombre_skill,
    nombre_empresa,
    original_desde,
    original_hasta,
    original_dias,
    nuevo_desde,
    nuevo_hasta,
    nuevos_dias,
    fecha_aplicacion,
    fecha_reversion,
    estado,
    aplicado_el,
    creado_el
FROM PROGRAMACION_HORARIOS
WHERE estado = 'REVERTIDO'
ORDER BY fecha_reversion DESC;

-- Luego la consulta en el backend sería:
-- SELECT * FROM V_HISTORIAL_HORARIOS LIMIT 200
*/

-- ============================================================================
-- INSTRUCCIONES DE USO
-- ============================================================================
-- 1. Ejecutar este script en tu base de datos de control:
--    mysql -u usuario -p control_db < add_index_historial.sql
--
-- 2. Verificar que los índices se crearon:
--    SHOW INDEX FROM PROGRAMACION_HORARIOS;
--
-- 3. El rendimiento debería mejorar significativamente, especialmente
--    si tienes miles de registros en la tabla.
-- ============================================================================
