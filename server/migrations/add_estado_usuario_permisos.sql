-- ============================================================================
-- MIGRACIÓN: Agregar columna ESTADO a USUARIO_PERMISOS
-- Permite negar permisos individuales (N) además de habilitarlos (H)
-- ============================================================================
-- H = Habilitado (el usuario tiene este permiso adicional)
-- N = Negado (el usuario NO tiene este permiso, aunque el rol lo conceda)
-- ============================================================================

ALTER TABLE USUARIO_PERMISOS
ADD COLUMN ESTADO CHAR(1) NOT NULL DEFAULT 'H'
COMMENT 'H=Habilitado, N=Negado'
AFTER permiso_id;

-- Los registros existentes quedan como 'H' (comportamiento anterior)
