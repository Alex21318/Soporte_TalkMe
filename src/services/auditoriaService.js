/**
 * ==========================================================================
 * SERVICIO DE AUDITORÍA - Frontend
 * ==========================================================================
 * Servicio para registrar y consultar logs de auditoría
 */

import { API_URLS } from '../config/api';
import { fetchWithAuth } from '../utils/fetchWithAuth';

// Información del usuario actual (se obtiene del sessionStorage o similar)
const getUsuarioActual = () => {
    try {
        const usuarioData = sessionStorage.getItem('user_info');
        return usuarioData ? JSON.parse(usuarioData) : { 
            id: null, 
            nombre: 'SISTEMA',
            usuario: 'SISTEMA'
        };
    } catch {
        return { id: null, nombre: 'SISTEMA', usuario: 'SISTEMA' };
    }
};

// Obtener información de IP y navegador
const getClientInfo = () => {
    return {
        userAgent: navigator.userAgent,
        // La IP se captura en el servidor
    };
};

/**
 * Registrar una acción en el log de auditoría
 * @param {Object} data - Datos de la acción
 */
export const registrarLog = async (data) => {
    try {
        const usuario = getUsuarioActual();
        const clientInfo = getClientInfo();

        const payload = {
            tipo_accion: data.tipo_accion,
            entidad: data.entidad,
            id_entidad: data.id_entidad,
            
            // Usuario que realiza la acción
            id_usuario_sistema: data.id_usuario_sistema || usuario.id,
            nombre_usuario: data.nombre_usuario || usuario.nombre || usuario.usuario,
            user_agent: clientInfo.userAgent,
            
            // Base de datos y empresa
            db_key: data.db_key,
            db_nombre: data.db_nombre,
            id_empresa: data.id_empresa,
            nombre_empresa: data.nombre_empresa,
            
            // Usuario afectado (para permisos)
            id_usuario_afectado: data.id_usuario_afectado,
            nombre_usuario_afec: data.nombre_usuario_afec,
            
            // Skills
            id_skill: data.id_skill,
            nombre_skill: data.nombre_skill,
            
            // Bot redes
            id_bot_red: data.id_bot_red,
            nombre_bot_red: data.nombre_bot_red,
            
            // Tipos de cliente
            id_tipo_cliente: data.id_tipo_cliente,
            nombre_tipo_cliente: data.nombre_tipo_cliente,
            
            // Valores antes/después
            valor_anterior: data.valor_anterior,
            valor_nuevo: data.valor_nuevo,
            metadata: data.metadata,
            
            // Descripción y resultado
            descripcion: data.descripcion,
            exito: data.exito !== false, // Default true
            mensaje_error: data.mensaje_error
        };

        const response = await fetchWithAuth(API_URLS.baseUrl + '/api/auditoria/log', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error al registrar log:', errorText);
            return { success: false, error: errorText };
        }

        return await response.json();
    } catch (error) {
        console.error('Error en registrarLog:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Helper para registrar permisos agregados
 */
export const logPermisoAgregado = async (data) => {
    const descripcion = `Agregado permiso ${data.entidad} (${data.nombre_skill || data.nombre_bot_red || data.nombre_tipo_cliente}) ` +
                       `al usuario ${data.nombre_usuario_afec}`;
    
    return await registrarLog({
        tipo_accion: 'PERMISO_AGREGAR',
        entidad: data.entidad, // 'SKILL', 'BOT_RED', 'TIPO_CLIENTE'
        ...data,
        descripcion: data.descripcion || descripcion,
        exito: true
    });
};

/**
 * Helper para registrar permisos eliminados
 */
export const logPermisoEliminado = async (data) => {
    const descripcion = `Eliminado permiso ${data.entidad} (${data.nombre_skill || data.nombre_bot_red || data.nombre_tipo_cliente}) ` +
                       `del usuario ${data.nombre_usuario_afec}`;
    
    return await registrarLog({
        tipo_accion: 'PERMISO_ELIMINAR',
        entidad: data.entidad,
        ...data,
        descripcion: data.descripcion || descripcion,
        exito: true
    });
};

/**
 * Helper para registrar permisos masivos
 */
export const logPermisoMasivo = async (data) => {
    const descripcion = `Acción masiva: ${data.tipo_accion} ${data.cantidad} permisos ` +
                       `a ${data.cantidad_usuarios} usuarios`;
    
    return await registrarLog({
        tipo_accion: 'PERMISO_MASIVO',
        entidad: data.entidad,
        ...data,
        descripcion: data.descripcion || descripcion,
        exito: true
    });
};

/**
 * Consultar logs de auditoría
 * @param {Object} filtros - Filtros para la consulta
 */
export const consultarLogs = async (filtros = {}) => {
    try {
        const queryParams = new URLSearchParams();
        
        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });

        const url = `${API_URLS.baseUrl}/api/auditoria/logs?${queryParams.toString()}`;
        
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Error al consultar logs');
        
        return await response.json();
    } catch (error) {
        console.error('Error en consultarLogs:', error);
        return { logs: [], total: 0 };
    }
};

/**
 * Obtener estadísticas de auditoría
 */
export const obtenerStats = async (filtros = {}) => {
    try {
        const queryParams = new URLSearchParams();
        
        Object.entries(filtros).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                queryParams.append(key, value);
            }
        });

        const url = `${API_URLS.baseUrl}/api/auditoria/stats?${queryParams.toString()}`;
        
        const response = await fetchWithAuth(url);
        if (!response.ok) throw new Error('Error al obtener estadísticas');
        
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerStats:', error);
        return null;
    }
};

/**
 * Obtener tipos de acción disponibles
 */
export const obtenerTiposAccion = async () => {
    try {
        const response = await fetchWithAuth(`${API_URLS.baseUrl}/api/auditoria/tipos-accion`);
        if (!response.ok) throw new Error('Error al obtener tipos de acción');
        return await response.json();
    } catch (error) {
        console.error('Error en obtenerTiposAccion:', error);
        return [];
    }
};
