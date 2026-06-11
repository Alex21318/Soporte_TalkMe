import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { consultarLogs, obtenerStats, obtenerTiposAccion } from '../../services/auditoriaService';
import './Auditoria.css';

// Mapeo de DB keys a nombres descriptivos
const getNombreDB = (dbKey) => {
  const nombres = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2', 
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
    'db_6': 'Ficohsa S1',
    'db_7': 'Ficohsa S2',
    'db_8': 'Ficohsa S3',
    'db_9': 'Ficohsa S4'
  };
  return nombres[dbKey] || dbKey || 'Desconocida';
};

// Mapeo de entidades a nombres de ventanas
const getNombreVentana = (entidad) => {
  const ventanas = {
    'SKILL': 'Skills',
    'BOT_RED': 'Skills',
    'TIPO_CLIENTE': 'Usuarios',
    'USUARIO': 'Usuarios',
    'PERMISO': 'Seguridad',
    'PROGRAMACION_HORARIOS': 'Skills',
    'HORARIO_SKILL': 'Skills',
    'EMPRESA': 'Creaciones',
    'BOT': 'Creaciones',
    'CREACION': 'Creaciones'
  };
  return ventanas[entidad] || entidad || 'General';
};

// Función para formatear detalles según tipo de acción
const formatearDetalle = (log) => {
  if (log.TIPO_ACCION === 'PROGRAMACION_HORARIO' || log.ENTIDAD === 'PROGRAMACION_HORARIOS') {
    return (
      <div className="detalle-programacion">
        <div className="detalle-header">
          <strong>📅 Programación de Horario</strong>
        </div>
        {log.metadata && (
          <div className="detalle-grid">
            <div className="detalle-item">
              <span className="detalle-label">Skill:</span>
              <span className="detalle-value">{log.metadata.nombre_skill || log.NOMBRE_SKILL || '-'}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Empresa:</span>
              <span className="detalle-value">{log.metadata.nombre_empresa || log.NOMBRE_EMPRESA || '-'}</span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Horario Original:</span>
              <span className="detalle-value">
                {log.metadata.original_desde && log.metadata.original_hasta 
                  ? `${log.metadata.original_desde} - ${log.metadata.original_hasta}`
                  : '-'}
              </span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Horario Programado:</span>
              <span className="detalle-value">
                {log.metadata.nuevo_desde && log.metadata.nuevo_hasta
                  ? `${log.metadata.nuevo_desde} - ${log.metadata.nuevo_hasta}`
                  : '-'}
              </span>
            </div>
            <div className="detalle-item">
              <span className="detalle-label">Fecha Aplicación:</span>
              <span className="detalle-value">{log.metadata.fecha_aplicacion || '-'}</span>
            </div>
            {log.metadata.id_horario && (
              <div className="detalle-item">
                <span className="detalle-label">ID Horario:</span>
                <span className="detalle-value">{log.metadata.id_horario}</span>
              </div>
            )}
            {log.metadata.id_skill && (
              <div className="detalle-item">
                <span className="detalle-label">ID Skill:</span>
                <span className="detalle-value">{log.metadata.id_skill}</span>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Detalle por defecto para otros tipos
  return (
    <div className="detalle-default">
      {log.DESCRIPCION && (
        <p className="detalle-descripcion">{log.DESCRIPCION}</p>
      )}
      {log.NOMBRE_USUARIO_AFEC && (
        <p className="detalle-afectado">
          👤 Usuario afectado: <strong>{log.NOMBRE_USUARIO_AFEC}</strong>
        </p>
      )}
      {log.NOMBRE_SKILL && (
        <p className="detalle-skill">
          🎯 Skill: <strong>{log.NOMBRE_SKILL}</strong>
        </p>
      )}
      {log.NOMBRE_BOT_RED && (
        <p className="detalle-bot">
          🤖 Bot: <strong>{log.NOMBRE_BOT_RED}</strong>
        </p>
      )}
    </div>
  );
};
const getIconoAccion = (tipoAccion) => {
  const iconos = {
    'PERMISO_AGREGAR': '✅',
    'PERMISO_ELIMINAR': '❌',
    'PERMISO_MASIVO': '📊',
    'LOGIN': '🔑',
    'LOGOUT': '🚪',
    'INSERT': '➕',
    'UPDATE': '✏️',
    'DELETE': '🗑️'
  };
  return iconos[tipoAccion] || '📝';
};

// Colores para tipos de acción
const getColorAccion = (tipoAccion) => {
  const colores = {
    'PERMISO_AGREGAR': '#22c55e',
    'PERMISO_ELIMINAR': '#ef4444',
    'PERMISO_MASIVO': '#3b82f6',
    'LOGIN': '#10b981',
    'LOGOUT': '#6b7280',
    'INSERT': '#22c55e',
    'UPDATE': '#f59e0b',
    'DELETE': '#dc2626'
  };
  return colores[tipoAccion] || '#6366f1';
};

function Auditoria() {
  // Estados
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [tiposAccion, setTiposAccion] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    fecha_desde: '',
    fecha_hasta: '',
    tipo_accion: '',
    entidad: '',
    nombre_usuario: '',
    limit: 50,
    offset: 0
  });
  
  const [currentPage, setCurrentPage] = useState(1);
  
  // Cargar tipos de acción al inicio
  useEffect(() => {
    const loadTipos = async () => {
      const tipos = await obtenerTiposAccion();
      setTiposAccion(tipos);
    };
    loadTipos();
  }, []);
  
  // Cargar logs
  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const result = await consultarLogs({
        ...filtros,
        offset: (currentPage - 1) * filtros.limit
      });
      setLogs(result.logs || []);
      setTotalLogs(result.total || 0);
    } catch (error) {
      toast.error('Error al cargar logs de auditoría');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [filtros, currentPage]);
  
  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      const result = await obtenerStats({
        fecha_desde: filtros.fecha_desde,
        fecha_hasta: filtros.fecha_hasta
      });
      setStats(result);
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  }, [filtros.fecha_desde, filtros.fecha_hasta]);
  
  // Cargar datos al cambiar filtros o página
  useEffect(() => {
    loadLogs();
    loadStats();
  }, [loadLogs, loadStats]);
  
  // Manejar cambio de filtros
  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: valor }));
    setCurrentPage(1); // Reset a página 1
  };
  
  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      fecha_desde: '',
      fecha_hasta: '',
      tipo_accion: '',
      entidad: '',
      nombre_usuario: '',
      limit: 50,
      offset: 0
    });
    setCurrentPage(1);
  };
  
  // Formatear fecha
  const formatFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleString('es-GT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };
  
  // Calcular páginas totales
  const totalPages = Math.ceil(totalLogs / filtros.limit);
  
  return (
    <div className="auditoria-container">
      {/* Header */}
      <div className="auditoria-header">
        <div className="auditoria-title">
          <img src="/assets/log.png" alt="Auditoría" className="auditoria-icon" />
          <h1>Auditoría y Logs</h1>
        </div>
        <p className="auditoria-subtitle">
          Registro de todas las acciones realizadas en el sistema
        </p>
      </div>
      
      {/* Estadísticas */}
      {stats && (
        <div className="auditoria-stats">
          <div className="stat-card stat-total">
            <span className="stat-value">{stats.resumen?.total || 0}</span>
            <span className="stat-label">Total Logs</span>
          </div>
          <div className="stat-card stat-exito">
            <span className="stat-value">{stats.resumen?.exitosos || 0}</span>
            <span className="stat-label">Exitosos</span>
          </div>
          <div className="stat-card stat-error">
            <span className="stat-value">{stats.resumen?.errores || 0}</span>
            <span className="stat-label">Errores</span>
          </div>
          <div className="stat-card stat-usuarios">
            <span className="stat-value">{stats.top_usuarios?.length || 0}</span>
            <span className="stat-label">Usuarios Activos</span>
          </div>
        </div>
      )}
      
      {/* Filtros */}
      <div className="auditoria-filtros">
        <div className="filtro-group">
          <label>Fecha Desde</label>
          <input
            type="date"
            value={filtros.fecha_desde}
            onChange={(e) => handleFiltroChange('fecha_desde', e.target.value)}
          />
        </div>
        
        <div className="filtro-group">
          <label>Fecha Hasta</label>
          <input
            type="date"
            value={filtros.fecha_hasta}
            onChange={(e) => handleFiltroChange('fecha_hasta', e.target.value)}
          />
        </div>
        
        <div className="filtro-group">
          <label>Tipo de Acción</label>
          <select
            value={filtros.tipo_accion}
            onChange={(e) => handleFiltroChange('tipo_accion', e.target.value)}
          >
            <option value="">Todas</option>
            {tiposAccion.map(tipo => (
              <option key={tipo} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>
        
        <div className="filtro-group">
          <label>Entidad</label>
          <select
            value={filtros.entidad}
            onChange={(e) => handleFiltroChange('entidad', e.target.value)}
          >
            <option value="">Todas</option>
            <option value="SKILL">Skill</option>
            <option value="BOT_RED">Bot Red</option>
            <option value="TIPO_CLIENTE">Tipo Cliente</option>
            <option value="USUARIO">Usuario</option>
          </select>
        </div>
        
        <div className="filtro-group">
          <label>Usuario</label>
          <input
            type="text"
            placeholder="Nombre de usuario..."
            value={filtros.nombre_usuario}
            onChange={(e) => handleFiltroChange('nombre_usuario', e.target.value)}
          />
        </div>
        
        <button className="btn-limpiar" onClick={limpiarFiltros}>
          🧹 Limpiar
        </button>
      </div>
      
      {/* Tabla de Logs */}
      <div className="auditoria-table-container">
        {loading ? (
          <div className="auditoria-loading">Cargando logs...</div>
        ) : logs.length === 0 ? (
          <div className="auditoria-empty">
            <img src="/assets/log.png" alt="Sin logs" />
            <p>No se encontraron logs con los filtros seleccionados</p>
          </div>
        ) : (
          <>
            <table className="auditoria-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Acción</th>
                  <th>Ventana</th>
                  <th>Usuario</th>
                  <th>Base de Datos</th>
                  <th>Empresa</th>
                  <th>Bot</th>
                  <th>Detalle</th>
                  <th>Resultado</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const fecha = new Date(log.FECHA_HORA);
                  const fechaStr = fecha.toLocaleDateString('es-GT');
                  const horaStr = fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  
                  return (
                  <tr key={log.ID_LOG} className={log.EXITO ? 'row-exito' : 'row-error'}>
                    <td className="cell-fecha">
                      {fechaStr}
                    </td>
                    <td className="cell-hora">
                      {horaStr}
                    </td>
                    <td className="cell-accion">
                      <span 
                        className="accion-badge"
                        style={{ backgroundColor: getColorAccion(log.TIPO_ACCION) + '20', color: getColorAccion(log.TIPO_ACCION) }}
                      >
                        {getIconoAccion(log.TIPO_ACCION)} {log.TIPO_ACCION}
                      </span>
                    </td>
                    <td className="cell-ventana">
                      <span className="ventana-badge">
                        🪟 {getNombreVentana(log.ENTIDAD)}
                      </span>
                    </td>
                    <td className="cell-usuario">
                      <div className="usuario-info">
                        <span className="usuario-nombre">{log.NOMBRE_USUARIO || log.USUARIO || 'Sistema'}</span>
                        {log.IP_ADDRESS && (
                          <span className="usuario-ip">IP: {log.IP_ADDRESS}</span>
                        )}
                      </div>
                    </td>
                    <td className="cell-db">
                      <span className="db-badge">
                        🗄️ {getNombreDB(log.DB_KEY)}
                      </span>
                    </td>
                    <td className="cell-empresa">{log.NOMBRE_EMPRESA || '-'}</td>
                    <td className="cell-bot">
                      {log.NOMBRE_BOT_RED ? (
                        <span className="bot-badge">
                          🤖 {log.NOMBRE_BOT_RED}
                        </span>
                      ) : (
                        <span className="bot-vacio">-</span>
                      )}
                    </td>
                    <td className="cell-detalle">
                      {formatearDetalle(log)}
                    </td>
                    <td className="cell-resultado">
                      {log.EXITO ? (
                        <span className="badge-exito">✓ Éxito</span>
                      ) : (
                        <span className="badge-error">✗ Error</span>
                      )}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
            
            {/* Paginador */}
            <div className="auditoria-paginador">
              <div className="paginador-info">
                Mostrando {logs.length} de {totalLogs} logs
                <span className="paginador-paginas"> (Página {currentPage} de {totalPages})</span>
              </div>
              <div className="paginador-botones">
                <button 
                  className="btn-pagina"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                >
                  « Primera
                </button>
                <button 
                  className="btn-pagina"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  ← Anterior
                </button>
                <span className="pagina-actual">{currentPage}</span>
                <button 
                  className="btn-pagina"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
                >
                  Siguiente →
                </button>
                <button 
                  className="btn-pagina"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                >
                  Última »
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Auditoria;
