-- ==========================================
-- TABLA DE USUARIOS DEL SISTEMA (AlwaysData)
-- ==========================================
-- Ejecutar esto en la base de datos de control (skillstalkme_db)

CREATE TABLE IF NOT EXISTS USUARIOS_SISTEMA (
    id INT(11) NOT NULL AUTO_INCREMENT,
    usuario VARCHAR(50) NOT NULL,
    password_hash VARCHAR(64) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    activo TINYINT(1) DEFAULT 1,
    intentos_fallidos INT(11) DEFAULT 0,
    ultimo_acceso DATETIME NULL,
    cambio_password DATETIME NULL,
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    modificado_el DATETIME NULL ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uk_usuario (usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ==========================================
-- USUARIO ADMIN POR DEFECTO
-- Contraseña: admin123
-- ==========================================
-- Hash SHA-256 de 'admin123': 
-- 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

INSERT INTO USUARIOS_SISTEMA 
    (usuario, password_hash, nombre, activo, creado_el)
VALUES 
    ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'Administrador', 1, NOW())
ON DUPLICATE KEY UPDATE 
    nombre = 'Administrador',
    activo = 1;

-- ==========================================
-- CONSULTAS ÚTILES
-- ==========================================

-- Ver usuarios
-- SELECT * FROM USUARIOS_SISTEMA;

-- Cambiar contraseña de usuario
-- UPDATE USUARIOS_SISTEMA 
-- SET password_hash = SHA2('nueva_password', 256) 
-- WHERE usuario = 'admin';

-- Desactivar usuario
-- UPDATE USUARIOS_SISTEMA SET activo = 0 WHERE usuario = 'usuario_a_desactivar';

-- Resetear intentos fallidos
-- UPDATE USUARIOS_SISTEMA SET intentos_fallidos = 0 WHERE usuario = 'admin';
