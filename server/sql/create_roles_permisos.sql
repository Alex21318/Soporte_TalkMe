-- ============================================
-- SISTEMA DE ROLES Y PERMISOS
-- Para controlar el acceso de usuarios a diferentes módulos
-- ============================================

-- Tabla de Roles
CREATE TABLE IF NOT EXISTS ROLES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(50) NOT NULL UNIQUE,
    descripcion VARCHAR(255),
    creado_el DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_nombre (nombre)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de Permisos
CREATE TABLE IF NOT EXISTS PERMISOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    modulo VARCHAR(50) NOT NULL,  -- Ej: 'usuarios', 'skills', 'automatizaciones', etc.
    accion VARCHAR(50) NOT NULL,   -- Ej: 'ver', 'crear', 'editar', 'eliminar'
    descripcion VARCHAR(255),
    UNIQUE KEY unique_modulo_accion (modulo, accion),
    INDEX idx_modulo (modulo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de relación Rol-Permiso
CREATE TABLE IF NOT EXISTS ROL_PERMISOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rol_id INT NOT NULL,
    permiso_id INT NOT NULL,
    UNIQUE KEY unique_rol_permiso (rol_id, permiso_id),
    FOREIGN KEY (rol_id) REFERENCES ROLES(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES PERMISOS(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregar campo rol_id a USUARIOS_SISTEMA
ALTER TABLE USUARIOS_SISTEMA
ADD COLUMN rol_id INT NULL AFTER nombre,
ADD FOREIGN KEY (rol_id) REFERENCES ROLES(id) ON DELETE SET NULL,
ADD INDEX idx_rol (rol_id);

-- ============================================
-- INSERTAR ROLES POR DEFECTO
-- ============================================

-- Rol: Administrador (acceso total)
INSERT INTO ROLES (nombre, descripcion) VALUES
('admin', 'Administrador con acceso total al sistema');

-- Rol: Operador (acceso limitado a módulos específicos)
INSERT INTO ROLES (nombre, descripcion) VALUES
('operador', 'Operador con acceso limitado a módulos específicos');

-- Rol: Solo lectura (solo puede ver, no modificar)
INSERT INTO ROLES (nombre, descripcion) VALUES
('readonly', 'Solo lectura, sin permisos de modificación');

-- ============================================
-- INSERTAR PERMISOS POR MÓDULO
-- ============================================

-- Módulo: Usuarios del Sistema
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('usuarios_sistema', 'ver', 'Ver lista de usuarios del sistema'),
('usuarios_sistema', 'crear', 'Crear nuevos usuarios del sistema'),
('usuarios_sistema', 'editar', 'Editar usuarios del sistema'),
('usuarios_sistema', 'eliminar', 'Eliminar usuarios del sistema'),
('usuarios_sistema', 'cambiar_password', 'Cambiar contraseñas de usuarios');

-- Módulo: Skills
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('skills', 'ver', 'Ver lista de skills'),
('skills', 'crear', 'Crear nuevos skills'),
('skills', 'editar', 'Editar skills existentes'),
('skills', 'eliminar', 'Eliminar skills');

-- Módulo: Horarios
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('horarios', 'ver', 'Ver horarios'),
('horarios', 'crear', 'Crear horarios'),
('horarios', 'editar', 'Editar horarios'),
('horarios', 'eliminar', 'Eliminar horarios');

-- Módulo: Automatizaciones
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('automatizaciones', 'ver', 'Ver automatizaciones'),
('automatizaciones', 'crear', 'Crear automatizaciones'),
('automatizaciones', 'editar', 'Editar automatizaciones'),
('automatizaciones', 'eliminar', 'Eliminar automatizaciones');

-- Módulo: Cierres
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('cierres', 'ver', 'Ver cierres de conversaciones'),
('cierres', 'crear', 'Crear cierres'),
('cierres', 'editar', 'Editar cierres'),
('cierres', 'eliminar', 'Eliminar cierres');

-- Módulo: Diagramas
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('diagramas', 'ver', 'Ver diagramas'),
('diagramas', 'crear', 'Crear diagramas'),
('diagramas', 'editar', 'Editar diagramas'),
('diagramas', 'eliminar', 'Eliminar diagramas');

-- Módulo: Creaciones
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('creaciones', 'ver', 'Ver creaciones de instancias'),
('creaciones', 'crear', 'Crear nuevas instancias'),
('creaciones', 'editar', 'Editar creaciones'),
('creaciones', 'eliminar', 'Eliminar creaciones');

-- Módulo: Auditoría
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('auditoria', 'ver', 'Ver logs de auditoría');

-- Módulo: Configuraciones
INSERT INTO PERMISOS (modulo, accion, descripcion) VALUES
('configuraciones', 'ver', 'Ver configuraciones del sistema'),
('configuraciones', 'gestionar_roles', 'Gestionar roles y permisos'),
('configuraciones', 'asignar_roles', 'Asignar roles a usuarios');

-- ============================================
-- TABLA PARA PERMISOS INDIVIDUALES POR USUARIO
-- ============================================

CREATE TABLE IF NOT EXISTS USUARIO_PERMISOS (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    permiso_id INT NOT NULL,
    creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES USUARIOS_SISTEMA(id) ON DELETE CASCADE,
    FOREIGN KEY (permiso_id) REFERENCES PERMISOS(id) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_permiso (usuario_id, permiso_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ASIGNAR PERMISOS A ROLES
-- ============================================

-- Administrador: Todos los permisos
INSERT INTO ROL_PERMISOS (rol_id, permiso_id)
SELECT 1, id FROM PERMISOS;

-- Operador: Permisos limitados (ejemplo: skills, horarios, automatizaciones)
INSERT INTO ROL_PERMISOS (rol_id, permiso_id)
SELECT 2, id FROM PERMISOS 
WHERE modulo IN ('skills', 'horarios', 'automatizaciones');

-- Solo lectura: Solo permisos de ver
INSERT INTO ROL_PERMISOS (rol_id, permiso_id)
SELECT 3, id FROM PERMISOS 
WHERE accion = 'ver';

-- ============================================
-- ASIGNAR ROL POR DEFECTO A USUARIOS EXISTENTES
-- ============================================

-- Asignar rol 'admin' al usuario admin (si existe)
UPDATE USUARIOS_SISTEMA 
SET rol_id = 1 
WHERE usuario = 'admin' AND rol_id IS NULL;
