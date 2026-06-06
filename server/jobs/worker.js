const pools = require('./db');

// Helper: Obtener fecha/hora actual en Guatemala (UTC-6) en formato MySQL
function getNowGuatemala() {
    const now = new Date();
    // Convertir a string en formato Guatemala (UTC-6)
    const gtString = now.toLocaleString('en-US', {
        timeZone: 'America/Guatemala',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });
    // Formato: MM/DD/YYYY, HH:mm:ss → YYYY-MM-DD HH:mm:ss
    const [datePart, timePart] = gtString.split(', ');
    const [mm, dd, yyyy] = datePart.split('/');
    return `${yyyy}-${mm}-${dd} ${timePart}`;
}

async function ejecutarAutomatizacion() {
    const dbControl = pools['control'];
    
    // Hora actual en Guatemala calculada en Node.js (confiable)
    const nowGT = getNowGuatemala();

    try {
        // FASE 1: Aplicar pendientes
        // Usamos la hora GT calculada en Node.js en lugar de CONVERT_TZ
        const [pendientes] = await dbControl.query(
            "SELECT * FROM PROGRAMACION_HORARIOS WHERE fecha_aplicacion <= ? AND estado = 'PENDIENTE'",
            [nowGT]
        );

        for (let t of pendientes) {
            const dbDestino = pools[t.db_key];
            const usuarioProgramacion = t.creado_por || 'sistema';
            
            if (t.id_original_horario) {
                // Actualiza registro existente
                await dbDestino.query(
                    "UPDATE HORARIO_SKILL SET DESDE = ?, HASTA = ?, DIAS = ?, MODIFICADO_POR = ? WHERE ID_HORARIO_SKILL = ?",
                    [t.nuevo_desde, t.nuevo_hasta, t.nuevos_dias, usuarioProgramacion, t.id_original_horario]
                );
            } else {
                // Crea registro nuevo - GUARDAR EL ID CREADO
                const [result] = await dbDestino.query(
                    "INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_POR) VALUES (?, ?, ?, ?, ?)",
                    [t.id_skill, t.nuevo_desde, t.nuevo_hasta, t.nuevos_dias, usuarioProgramacion]
                );
                const nuevoIdHorario = result.insertId;
                
                // GUARDAR el ID del horario creado para poder eliminarlo específicamente luego
                await dbControl.query(
                    "UPDATE PROGRAMACION_HORARIOS SET id_horario_creado = ? WHERE id = ?",
                    [nuevoIdHorario, t.id]
                );
            }
            // Marca como aplicado usando la hora Guatemala calculada en Node.js
            await dbControl.query(
                "UPDATE PROGRAMACION_HORARIOS SET estado = 'APLICADO', aplicado_el = ? WHERE id = ?",
                [nowGT, t.id]
            );
        }

        // FASE 2: Revertir aplicados
        // NOTA: Se usa aplicado_el para verificar que el registro fue aplicado hace al menos
        // 2 minutos, evitando que un registro recien aplicado en FASE 1 sea revertido
        // inmediatamente en la misma ejecucion del worker
        const [reversiones] = await dbControl.query(
            `SELECT * FROM PROGRAMACION_HORARIOS 
             WHERE fecha_reversion <= ? 
             AND estado = 'APLICADO' 
             AND (aplicado_el IS NULL OR aplicado_el <= DATE_SUB(?, INTERVAL 2 MINUTE))`,
            [nowGT, nowGT]
        );

        for (let r of reversiones) {
            const dbDestino = pools[r.db_key];
            const usuarioProgramacion = r.creado_por || 'sistema';
            
            if (r.id_original_horario) {
                // Restaura horario original
                await dbDestino.query(
                    "UPDATE HORARIO_SKILL SET DESDE = ?, HASTA = ?, DIAS = ?, MODIFICADO_POR = ? WHERE ID_HORARIO_SKILL = ?",
                    [r.original_desde, r.original_hasta, r.original_dias, usuarioProgramacion, r.id_original_horario]
                );
            } else {
                // Elimina registro temporal - USAR ID ESPECIFICO SI EXISTE
                if (r.id_horario_creado) {
                    await dbDestino.query(
                        "DELETE FROM HORARIO_SKILL WHERE ID_HORARIO_SKILL = ?",
                        [r.id_horario_creado]
                    );
                } else {
                    // Fallback: buscar por skill + horario específico (más seguro)
                    
                    // Primero verificar cuántos horarios existen para este skill
                    const [existentes] = await dbDestino.query(
                        "SELECT ID_HORARIO_SKILL, DESDE, HASTA, DIAS, CREADO_POR FROM HORARIO_SKILL WHERE ID_SKILL = ?",
                        [r.id_skill]
                    );
                    
                    // Eliminar solo el que coincide exactamente con los datos del temporal
                    const [deleteResult] = await dbDestino.query(
                        "DELETE FROM HORARIO_SKILL WHERE ID_SKILL = ? AND DESDE = ? AND HASTA = ? AND DIAS = ? AND CREADO_POR = ?",
                        [r.id_skill, r.nuevo_desde, r.nuevo_hasta, r.nuevos_dias, usuarioProgramacion]
                    );
                }
            }
            // Marca como revertido para guardarlo en el historial
            await dbControl.query("UPDATE PROGRAMACION_HORARIOS SET estado = 'REVERTIDO' WHERE id = ?", [r.id]);
        }

        // FASE 3: Aplicar mensajes programados pendientes
        const [mensajesPendientes] = await dbControl.query(
            "SELECT * FROM PROGRAMACION_MENSAJES WHERE fecha_aplicacion <= ? AND estado = 'PENDIENTE'",
            [nowGT]
        );

        for (let m of mensajesPendientes) {
            const dbDestino = pools[m.db_key];
            if (dbDestino) {
                // Guardar el mensaje actual antes de aplicar (si no se guardó original)
                if (!m.original_mensaje) {
                    const [skillActual] = await dbDestino.query(
                        "SELECT MENSAJE FROM SKILLS WHERE ID_SKILL = ?",
                        [m.id_skill]
                    );
                    if (skillActual.length > 0) {
                        await dbControl.query(
                            "UPDATE PROGRAMACION_MENSAJES SET original_mensaje = ? WHERE id = ?",
                            [skillActual[0].MENSAJE, m.id]
                        );
                    }
                }
                
                // Aplicar nuevo mensaje
                await dbDestino.query(
                    "UPDATE SKILLS SET MENSAJE = ? WHERE ID_SKILL = ?",
                    [m.nuevo_mensaje, m.id_skill]
                );
                
                // Marcar como aplicado
                await dbControl.query(
                    "UPDATE PROGRAMACION_MENSAJES SET estado = 'APLICADO', aplicado_el = ? WHERE id = ?",
                    [nowGT, m.id]
                );
            }
        }

        // FASE 4: Revertir mensajes aplicados
        const [mensajesReversion] = await dbControl.query(
            `SELECT * FROM PROGRAMACION_MENSAJES 
             WHERE fecha_reversion IS NOT NULL 
             AND fecha_reversion <= ? 
             AND estado = 'APLICADO' 
             AND (aplicado_el IS NULL OR aplicado_el <= DATE_SUB(?, INTERVAL 2 MINUTE))`,
            [nowGT, nowGT]
        );

        for (let m of mensajesReversion) {
            const dbDestino = pools[m.db_key];
            if (dbDestino && m.original_mensaje !== null) {
                // Revertir al mensaje original
                await dbDestino.query(
                    "UPDATE SKILLS SET MENSAJE = ? WHERE ID_SKILL = ?",
                    [m.original_mensaje, m.id_skill]
                );
                
                // Marcar como revertido
                await dbControl.query(
                    "UPDATE PROGRAMACION_MENSAJES SET estado = 'REVERTIDO' WHERE id = ?",
                    [m.id]
                );
            }
        }

    } catch (error) {
        // Silencioso: no loggear para evitar ruido
    } finally {
        // Cierra el proceso para liberar memoria
        process.exit();
    }
}

ejecutarAutomatizacion();