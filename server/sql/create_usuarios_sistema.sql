-- ============================================
-- TABLA USUARIOS_SISTEMA
-- Sistema de autenticación para el panel de administración
-- ============================================

CREATE TABLE IF NOT EXISTS USUARIOS_SISTEMA (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    intentos_fallidos INT DEFAULT 0,
    ultimo_acceso DATETIME,
    cambio_password DATETIME,
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_usuario (usuario),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- USUARIO ADMINISTRADOR POR DEFECTO
-- Usuario: admin
-- Contraseña: admin123 (CAMBIAR DESPUÉS DEL PRIMER LOGIN)
-- ============================================

-- Nota: El hash se generará con bcrypt desde el backend
-- Para crear el usuario administrador, usa el endpoint POST /api/auth/register
-- o ejecuta el siguiente script después de que el backend esté corriendo
