import { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import ConfirmModal from '../../../components/ConfirmModal';
import { registrarLog } from '../../../services/auditoriaService';
import * as cierreService from '../../../services/cierreConversacionesService';
import * as facebookService from '../../../services/facebookEliminacionService';
import './PanelTareaProgramada.css';

const DB_NAMES = {
  'db_1': 'Talkme S1',
  'db_2': 'Talkme S2',
  'db_3': 'Talkme S3',
  'db_4': 'Talkme S4',
  'db_5': 'Talkme MDD',
  'db_6': 'Ficohsa S1',
  'db_7': 'Ficohsa S2',
  'db_8': 'Ficohsa S3',
};

export default function PanelTareaProgramada({ tipo, dbKey }) {
  const service = tipo === 'cierres' ? cierreService : facebookService;

  const [tarea, setTarea]       = useState(null);   // config guardada
  const [hora, setHora]         = useState('06:00');
  const [activo, setActivo]     = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [log, setLog]           = useState([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [tabLocal, setTabLocal] = useState('config'); // 'config' | 'historial'
  const [ejecutando, setEjecutando] = useState(false);
  const [logExpandido, setLogExpandido] = useState(null); // ID_LOG del log expandido
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [ultimoLog, setUltimoLog] = useState(null);
  const [loadingUltimoLog, setLoadingUltimoLog] = useState(false);

  const cargarTarea = async () => {
    try {
      const data = await service.obtenerTarea(dbKey);
      if (data) { 
        setTarea(data); 
        setHora(data.hora); 
        setActivo(data.activo); 
      } else { 
        setTarea(null); 
        setActivo(false); 
      }
      
      // Auditoría de búsqueda de tareas
      registrarLog({
        tipo_accion: 'BUSQUEDA',
        entidad: 'TAREAS',
        db_key: dbKey,
        metadata: { tipo_tarea: tipo, resultado: data ? 'Encontrada' : 'No encontrada' },
        descripcion: `Búsqueda de tareas programadas: ${tipo} (${dbKey})`
      });
    } catch { /* silencioso */ }
  };

  const cargarLog = async () => {
    setLoadingLog(true);
    try {
      const arr = await service.obtenerLog(dbKey);
      setLog(arr);
      
      // Auto-expandir el último log con detalles válidos
      const ultimoConDetalles = arr.find(r => {
        try {
          const det = r.DETALLE_IDS ? (typeof r.DETALLE_IDS === 'string' ? JSON.parse(r.DETALLE_IDS) : r.DETALLE_IDS) : [];
          return det.filter(d => d && (d.ID_CONVERSACION || d.ID_SOLICITUD)).length > 0;
        } catch { return false; }
      });
      if (ultimoConDetalles) setLogExpandido(ultimoConDetalles.ID_LOG);
    } catch { setLog([]); }
    finally { setLoadingLog(false); }
  };

  const cargarUltimoLog = async () => {
    setLoadingUltimoLog(true);
    try {
      const data = await service.obtenerUltimoLog(dbKey);
      setUltimoLog(data || null);
    } catch { setUltimoLog(null); }
    finally { setLoadingUltimoLog(false); }
  };

  useEffect(() => { 
    cargarTarea(); 
    cargarUltimoLog(); 
  }, [tipo, dbKey]);

  useEffect(() => { 
    if (tabLocal === 'historial') cargarLog(); 
  }, [tabLocal, tipo, dbKey]);

  const guardar = async () => {
    if (!hora) return toast.error('Selecciona una hora');
    setGuardando(true);
    try {
      await service.guardarTarea(dbKey, hora, activo, DB_NAMES[dbKey]);
      toast.success('Tarea guardada');
      cargarTarea();
    } catch (e) { 
      toast.error(e.message); 
    } finally { 
      setGuardando(false); 
    }
  };

  const eliminar = () => {
    setShowEliminarModal(true);
  };

  const confirmEliminar = async () => {
    setShowEliminarModal(false);
    try {
      await service.eliminarTarea(dbKey);
      toast.success('Tarea eliminada');
      setTarea(null); 
      setActivo(false);
    } catch (e) { 
      toast.error(e.message); 
    }
  };

  const ejecutarAhora = async () => {
    if (!tarea) return toast.error('Guarda la tarea primero');
    setEjecutando(true);
    try {
      const data = await service.ejecutarAhora(dbKey);
      
      // Auditoría de ejecución manual
      registrarLog({
        tipo_accion: 'CIERRE_MANUAL',
        entidad: 'AUTOMATIZACIONES',
        db_key: dbKey,
        metadata: { tipo_tarea: tipo },
        descripcion: `Ejecución manual de automatización: ${tipo === 'cierres' ? 'Cierre de conversaciones' : 'Eliminación FB'} (${dbKey})`
      });

      toast.success('Tarea ejecutada manualmente');
      cargarUltimoLog();
      if (tabLocal === 'historial') cargarLog();
    } catch (e) { 
      toast.error(e.message); 
    } finally { 
      setEjecutando(false); 
    }
  };

  const fmtFecha = (f) => {
    if (!f) return '--';
    const d = new Date(f.replace(' ', 'T'));
    if (isNaN(d)) return f;
    return d.toLocaleDateString('es-GT', { year:'numeric', month:'2-digit', day:'2-digit' })
      + ' ' + d.toLocaleTimeString('es-GT', { hour:'2-digit', minute:'2-digit' });
  };

  return (
    <div className={`ci-tarea-panel ${tabLocal === 'historial' ? 'expandido' : ''}`}>
      <div className="ci-tarea-header">
        <div className="ci-tarea-header-left">
          <div className="ci-tarea-icon-wrap">
            <span className="ci-tarea-icon">⏰</span>
          </div>
          <div className="ci-tarea-titulo-wrap">
            <span className="ci-tarea-titulo">Automatización</span>
            <span className="ci-tarea-subtitulo">Tarea programada</span>
          </div>
        </div>
        <div className="ci-tarea-tabs">
          <button className={`ci-tarea-tab ${tabLocal==='config'?'active':''}`} onClick={() => setTabLocal('config')}>Configurar</button>
          <button className={`ci-tarea-tab ${tabLocal==='historial'?'active':''}`} onClick={() => setTabLocal('historial')}>Historial</button>
        </div>
      </div>

      {tabLocal === 'config' && (
        <div className="ci-tarea-config">
          <div className="ci-tarea-field">
            <span className="ci-tarea-field-label">Hora de ejecución (GT)</span>
            <input type="time" className="ci-tarea-input-hora" value={hora} onChange={e => setHora(e.target.value)} />
          </div>

          <div className="ci-tarea-toggle-wrap">
            <div className="ci-tarea-toggle-text">
              <strong>Ejecución automática</strong>
              <span>{activo ? 'Se ejecutará diariamente' : 'Desactivada'}</span>
            </div>
            <label className="ci-tarea-toggle">
              <input type="checkbox" checked={activo} onChange={e => setActivo(e.target.checked)} />
              <span className="ci-tarea-toggle-slider" />
            </label>
          </div>

          <div className="ci-tarea-divider" />

          <div className="ci-tarea-actions">
            <button className="ci-tarea-btn-save" onClick={guardar} disabled={guardando}>
              <span>{guardando ? '⏳' : '💾'}</span>
              <span>{guardando ? 'Guardando...' : 'Guardar configuración'}</span>
            </button>
            {tarea && (
              <div className="ci-tarea-secondary-actions">
                <button className="ci-tarea-btn-run" onClick={ejecutarAhora} disabled={ejecutando}>
                  <span>{ejecutando ? '⏳' : '▶'}</span>
                  <span>{ejecutando ? 'Ejecutando...' : 'Ejecutar ahora'}</span>
                </button>
                <button className="ci-tarea-btn-del" onClick={eliminar}>
                  <span>🗑</span>
                  <span>Eliminar</span>
                </button>
              </div>
            )}
          </div>

          {tarea && (
            <div className="ci-tarea-status">
              {tarea.activo
                ? <span className="ci-tarea-badge-on">Programada · {tarea.hora} GT</span>
                : <span className="ci-tarea-badge-off">Desactivada</span>}
            </div>
          )}

          {/* ── Indicador de última ejecución ── */}
          <div className="ci-tarea-ultimo-log">
            {loadingUltimoLog ? (
              <span className="ci-tarea-ultimo-log-loading">Cargando última ejecución...</span>
            ) : ultimoLog ? (
              <>
                <span className={`ci-tarea-ultimo-log-badge ${ultimoLog.OK ? 'ok' : 'error'}`}>
                  {ultimoLog.OK ? '✅' : '❌'}
                </span>
                <span className="ci-tarea-ultimo-log-text">
                  <strong>Última ejecución:</strong> {fmtFecha(ultimoLog.EJECUTADO_EL)}
                  <span className="ci-tarea-ultimo-log-afectados">
                    Registros afectados: <strong>{ultimoLog.REGISTROS ?? '--'}</strong>
                  </span>
                </span>
              </>
            ) : (
              <span className="ci-tarea-ultimo-log-none">Sin ejecuciones registradas</span>
            )}
          </div>
        </div>
      )}

      {tabLocal === 'historial' && (
        <div className="ci-tarea-log">
          <div className="ci-tarea-log-header">
            <span className="ci-tarea-log-title">Historial de Ejecuciones <span className="ci-tarea-log-count">{log.length}</span></span>
            <button className="ci-tarea-btn-refresh" onClick={cargarLog} disabled={loadingLog}>
              <span>{loadingLog ? '⏳' : '🔄'}</span>
              <span>Actualizar</span>
            </button>
          </div>

          {loadingLog && log.length === 0 ? (
            <div className="ci-state-center"><div className="ci-spinner" /><p>Cargando historial...</p></div>
          ) : log.length === 0 ? (
            <div className="ci-tarea-log-empty">Sin ejecuciones registradas aún</div>
          ) : (
            <div className="ci-tarea-log-table-wrap">
              <table className="ci-tarea-log-table">
                <thead>
                  <tr>
                    <th>Fecha ejecución</th>
                    <th>Estado / Detalle</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {log.map((r) => {
                    const esActivo = logExpandido === r.ID_LOG;
                    let detalles = [];
                    try {
                      detalles = r.DETALLE_IDS ? (typeof r.DETALLE_IDS === 'string' ? JSON.parse(r.DETALLE_IDS) : r.DETALLE_IDS) : [];
                    } catch { detalles = []; }
                    const detalleFiltrado = detalles.filter(d => d && (d.ID_CONVERSACION || d.ID_SOLICITUD));

                    return (
                      <tr key={r.ID_LOG} className={esActivo ? 'fila-activa' : ''}>
                        <td className="ci-fecha-cell">{fmtFecha(r.EJECUTADO_EL)}</td>
                        <td>
                          {r.OK ? (
                            <div className="ci-tarea-log-detalles-summary">
                              <span className="ci-resultado-ok-pill">
                                ✅ Completado <strong>{r.REGISTROS || 0}</strong>
                              </span>
                            </div>
                          ) : (
                            <span className="ci-resultado-err-pill" title={r.ERROR}>
                              ❌ Error: {r.ERROR || 'Fallo desconocido'}
                            </span>
                          )}
                          
                          {/* Detalles desplegables si tiene ids */}
                          {esActivo && detalleFiltrado.length > 0 && (
                            <div className="ci-tarea-log-detalles">
                              <div className="ci-tarea-log-detalles-header">
                                <span>Lista de Registros Afectados</span>
                                <span className="ci-tarea-log-detalles-count">{detalleFiltrado.length} registros</span>
                              </div>
                              <div className="ci-tarea-log-detalles-table">
                                <table className="ci-table">
                                  <thead>
                                    <tr>
                                      <th style={{ width: '40px' }}>#</th>
                                      <th>ID Registro</th>
                                      {tipo === 'cierres' && (
                                        <>
                                          <th>Empresa</th>
                                          <th>Skill</th>
                                          <th>Cliente</th>
                                        </>
                                      )}
                                      {tipo === 'facebook' && (
                                        <>
                                          <th>ID Solicitud</th>
                                          <th>Página</th>
                                        </>
                                      )}
                                      <th>Fecha</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detalleFiltrado.map((d, index) => (
                                      <tr key={index}>
                                        <td><span className="ci-row-num">{index + 1}</span></td>
                                        <td><span className="ci-id-tag">{d.ID_CONVERSACION || d.ID_SOLICITUD || d.id || '--'}</span></td>
                                        {tipo === 'cierres' && (
                                          <>
                                            <td>{d.EMPRESA || '--'}</td>
                                            <td>{d.SKILL || '--'}</td>
                                            <td>{d.CLIENTE || '--'}</td>
                                          </>
                                        )}
                                        {tipo === 'facebook' && (
                                          <>
                                            <td>{d.ID_SOLICITUD || '--'}</td>
                                            <td>{d.PAGINA || '--'}</td>
                                          </>
                                        )}
                                        <td>{d.FECHA || '--'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                        <td>
                          {detalleFiltrado.length > 0 && (
                            <button 
                              className={`ci-tarea-btn-detalles ${esActivo ? 'activo' : ''}`}
                              onClick={() => setLogExpandido(esActivo ? null : r.ID_LOG)}
                            >
                              {esActivo ? 'Ocultar' : 'Detalles'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmModal
        show={showEliminarModal}
        title="Eliminar tarea programada"
        confirmText="Confirmar eliminación"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmEliminar}
        onCancel={() => setShowEliminarModal(false)}
      >
        <p>¿Estás seguro de que deseas eliminar esta tarea programada? La ejecución automática diaria dejará de funcionar para esta base de datos.</p>
      </ConfirmModal>
    </div>
  );
}
