-- Tabla para programar cambios de mensajes de fuera de horario en skills
-- Se ejecuta en la base de datos CONTROL

CREATE TABLE IF NOT EXISTS PROGRAMACION_MENSAJES (
    id INT AUTO_INCREMENT PRIMARY KEY,
    db_key VARCHAR(50) NOT NULL COMMENT 'Clave de la base de datos destino (db_1, db_2, etc.)',
    id_skill INT NOT NULL COMMENT 'ID del skill a modificar',
    nombre_skill VARCHAR(255) COMMENT 'Nombre del skill para referencia',
    nombre_empresa VARCHAR(255) COMMENT 'Nombre de la empresa para referencia',
    original_mensaje TEXT COMMENT 'Mensaje actual del skill',
    nuevo_mensaje TEXT NOT NULL COMMENT 'Nuevo mensaje a aplicar',
    fecha_aplicacion DATETIME NOT NULL COMMENT 'Fecha/hora cuando aplicar el cambio (hora Guatemala)',
    fecha_reversion DATETIME COMMENT 'Fecha/hora opcional para revertir al mensaje original',
    estado ENUM('PENDIENTE', 'APLICADO', 'REVERTIDO') DEFAULT 'PENDIENTE',
    aplicado_el DATETIME COMMENT 'Timestamp cuando se aplicó el cambio',
    creado_el TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_estado_fecha (estado, fecha_aplicacion),
    INDEX idx_db_skill (db_key, id_skill),
    INDEX idx_fecha_aplicacion (fecha_aplicacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
COMMENT='Programación de cambios de mensajes fuera de horario para skills';
