import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import Auditoria from '../Auditoria/Auditoria';
import ContenidoConfiguraciones from './ContenidoConfiguraciones';
import ContenidoPlantillasWhatsApp from './ContenidoPlantillasWhatsApp';
import { ICONOS_MENU } from '../../components/MenuIcons';
import ConfirmModal from '../../components/ConfirmModal';
import './Cierres.css';

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

const formatFecha = (fecha) => {
  if (!fecha) return '--';
  return new Date(fecha).toLocaleDateString('es-GT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
};

// ── Items del sidebar ────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  { id: 'conversaciones', label: 'Conversaciones',  desc: 'Cierre +30 días' },
  { id: 'facebook',       label: 'Facebook',        desc: 'Eliminación solicitudes' },
  { id: 'tags',           label: 'Tags Bot',        desc: 'Validar palabras' },
  { id: 'plantillas_wa',  label: 'Plantillas WA',   desc: 'Plantillas WhatsApp' },
  { id: 'reportes_auto',  label: 'Reportes Auto',   desc: 'Descarga programada' },
  { id: 'auditoria',      label: 'Auditoría',       desc: 'Logs del sistema' },
  { id: 'configuraciones',label: 'Configuraciones', desc: 'Tema y apariencia' },
];

// ── Panel: Tarea Programada (reutilizable para Cierres y Facebook) ────────────
function PanelTareaProgramada({ tipo, dbKey }) {
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
      const res = await fetchWithAuth(API_URLS.tareasLista());
      const data = await res.json();
      const found = data.find(t => t.TIPO === tipo && t.DB_KEY === dbKey);
      if (found) { setTarea(found); setHora(found.hora); setActivo(found.activo); }
      else        { setTarea(null); setActivo(false); }
      
      // Auditoría de búsqueda de tareas
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'BUSQUEDA',
          entidad: 'TAREAS',
          db_key: dbKey,
          metadata: { tipo_tarea: tipo, resultados: Array.isArray(data) ? data.length : 0 },
          descripcion: `Búsqueda de tareas programadas: ${tipo} (${dbKey})`
        });
      });

    } catch { /* silencioso */ }
  };

  const cargarLog = async () => {
    setLoadingLog(true);
    try {
      const res = await fetchWithAuth(API_URLS.tareasLog(tipo, dbKey));
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
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
      const res = await fetchWithAuth(API_URLS.tareasUltimoLog(tipo, dbKey));
      const data = await res.json();
      setUltimoLog(data || null);
    } catch { setUltimoLog(null); }
    finally { setLoadingUltimoLog(false); }
  };

  useEffect(() => { cargarTarea(); cargarUltimoLog(); }, [tipo, dbKey]);
  useEffect(() => { if (tabLocal === 'historial') cargarLog(); }, [tabLocal, tipo, dbKey]);

  const guardar = async () => {
    if (!hora) return toast.error('Selecciona una hora');
    setGuardando(true);
    try {
      const res = await fetchWithAuth(API_URLS.tareasGuardar(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, db_key: dbKey, hora, activo, nombre: `${tipo === 'cierres' ? 'Cierre Conv.' : 'Elim. FB'} ${DB_NAMES[dbKey] || dbKey}` }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Tarea guardada');
      cargarTarea();
    } catch (e) { toast.error(e.message); }
    finally { setGuardando(false); }
  };

  const eliminar = async () => {
    setShowEliminarModal(true);
  };

  const confirmEliminar = async () => {
    setShowEliminarModal(false);
    try {
      await fetchWithAuth(API_URLS.tareasEliminar(tipo, dbKey), { method: 'DELETE' });
      toast.success('Tarea eliminada');
      setTarea(null); setActivo(false);
    } catch (e) { toast.error(e.message); }
  };

  const ejecutarAhora = async () => {
    if (!tarea) return toast.error('Guarda la tarea primero');
    setEjecutando(true);
    try {
      const res = await fetchWithAuth(API_URLS.tareasEjecutarAhora(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, db_key: dbKey }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      
      // Auditoría de ejecución manual
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'CIERRE_MANUAL',
          entidad: 'AUTOMATIZACIONES',
          db_key: dbKey,
          metadata: { tipo_tarea: tipo },
          descripcion: `Ejecución manual de automatización: ${tipo === 'cierres' ? 'Cierre de conversaciones' : 'Eliminación FB'} (${dbKey})`
        });
      });

      toast.success('Tarea ejecutada manualmente');
      cargarUltimoLog();
      if (tabLocal === 'historial') cargarLog();
    } catch (e) { toast.error(e.message); }
    finally { setEjecutando(false); }
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
                  {ultimoLog.OK !== undefined && (
                    <span className="ci-tarea-ultimo-log-afectados">
                      {ultimoLog.OK ? `${ultimoLog.AFECTADOS ?? 0} afectados` : `Error: ${ultimoLog.ERROR || 'Desconocido'}`}
                    </span>
                  )}
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
          {loadingLog ? (
            <div className="ci-tarea-log-empty">Cargando historial...</div>
          ) : log.length === 0 ? (
            <div className="ci-tarea-log-empty">
              <span>Sin ejecuciones registradas</span>
              <span style={{ fontSize: '12px', opacity: 0.7 }}>Las ejecuciones aparecerán aquí</span>
            </div>
          ) : (
            <>
              <div className="ci-tarea-log-header">
                <div className="ci-tarea-log-title">
                  Últimas ejecuciones
                  <span className="ci-tarea-log-count">{Math.min(log.length, 5)} de {log.length}</span>
                </div>
              </div>
              <div className="ci-tarea-log-table-wrap">
                <table className="ci-tarea-log-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Resultado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {log.slice(0, 5).map(r => {
                      const detallesRaw = r.DETALLE_IDS ? (typeof r.DETALLE_IDS === 'string' ? JSON.parse(r.DETALLE_IDS) : r.DETALLE_IDS) : [];
                      const detalles = detallesRaw.filter(d => d && (d.ID_CONVERSACION || d.ID_SOLICITUD));
                      const afectados = r.AFECTADOS ?? 0;
                      const detectados = detalles.length;
                      const isOpen = logExpandido === r.ID_LOG;
                      
                      return (
                        <tr key={r.ID_LOG} className={isOpen ? 'fila-activa' : ''}>
                          <td className="ci-fecha-cell">{fmtFecha(r.EJECUTADO_EL)}</td>
                          <td>
                            {r.OK ? (
                              <span className="ci-resultado-ok-pill">
                                <strong>{afectados}</strong> cerradas
                                {detectados !== afectados && (
                                  <span className="ci-text-muted"> · {detectados} detect.</span>
                                )}
                              </span>
                            ) : (
                              <span className="ci-resultado-err-pill" title={r.ERROR || 'Error'}>
                                Error: {r.ERROR ? r.ERROR.substring(0, 40) : 'sin detalle'}
                              </span>
                            )}
                          </td>
                          <td>
                            {detectados > 0 ? (
                              <button 
                                className={`ci-tarea-btn-detalles ${isOpen ? 'activo' : ''}`}
                                onClick={() => setLogExpandido(isOpen ? null : r.ID_LOG)}
                              >
                                {isOpen ? 'Ocultar' : 'Ver detalle'}
                              </button>
                            ) : <span className="ci-text-muted">Sin registros</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Tabla de detalles expandida */}
                {logExpandido && (() => {
                  const logItem = log.find(r => r.ID_LOG === logExpandido);
                  if (!logItem) return null;
                  const detallesRaw = logItem.DETALLE_IDS ? (typeof logItem.DETALLE_IDS === 'string' ? JSON.parse(logItem.DETALLE_IDS) : logItem.DETALLE_IDS) : [];
                  // Filtrar solo entradas válidas con ID
                  const detalles = detallesRaw.filter(d => d && (d.ID_CONVERSACION || d.ID_SOLICITUD));
                  if (detalles.length === 0) return null;
                  
                  const afectados = logItem.AFECTADOS ?? 0;
                  
                  return (
                    <div className="ci-tarea-log-detalles">
                      <div className="ci-tarea-log-detalles-header">
                        <span>Detalles de la ejecución</span>
                        <div className="ci-tarea-log-detalles-summary">
                          <span className="ci-badge-ok">{afectados} cerradas</span>
                          <span className="ci-text-muted"> de {detalles.length} detectadas</span>
                        </div>
                      </div>
                      <div className="ci-tarea-log-detalles-table">
                        {tipo === 'cierres' ? (
                          <table className="ci-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>ID Conversación</th>
                                <th>Empresa</th>
                                <th>Fecha Inicio</th>
                                <th>Días Abierta</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalles.map((d, i) => (
                                <tr key={i}>
                                  <td><span className="ci-row-num">{i + 1}</span></td>
                                  <td><span className="ci-id-tag">{d.ID_CONVERSACION}</span></td>
                                  <td>{d.EMPRESA}</td>
                                  <td>{formatFecha(d.FECHA_INICIO)}</td>
                                  <td>{d.DIAS_ABIERTA} días</td>
                                  <td><span className="ci-estado-badge">{d.ESTADO}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ) : (
                          <table className="ci-table">
                            <thead>
                              <tr>
                                <th>#</th>
                                <th>ID Solicitud</th>
                                <th>ID Usuario Facebook</th>
                                <th>Fecha Solicitud</th>
                                <th>Días Pendiente</th>
                                <th>Estado</th>
                              </tr>
                            </thead>
                            <tbody>
                              {detalles.map((d, i) => (
                                <tr key={i}>
                                  <td><span className="ci-row-num">{i + 1}</span></td>
                                  <td><span className="ci-id-tag">{d.ID_SOLICITUD}</span></td>
                                  <td>{d.ID_USUARIO_FACEBOOK || '--'}</td>
                                  <td>{formatFecha(d.FECHA_SOLICITUD)}</td>
                                  <td>{d.DIAS_PENDIENTE} días</td>
                                  <td><span className="ci-estado-badge">{d.ESTADO}</span></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </>
          )}
          <button className="ci-tarea-btn-refresh" onClick={cargarLog}>
            <span>🔄</span>
            <span>Actualizar</span>
          </button>
        </div>
      )}

      <ConfirmModal
        show={showEliminarModal}
        title="Eliminar Tarea Programada"
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmEliminar}
        onCancel={() => setShowEliminarModal(false)}
      >
        <p>¿Eliminar esta tarea programada?</p>
      </ConfirmModal>
    </div>
  );
}

// ── Contenido: Conversaciones ────────────────────────────────────────────────
function ContenidoConversaciones({ preview, loading, resultado, dbKey, filtroEmpresa, setFiltroEmpresa, cargar, ejecutar, loadingExec }) {
  const empresasUnicas = preview ? [...new Set(preview.map(r => r.NOMBRE_EMPRESA))].sort() : [];
  const previewFiltrado = preview ? (filtroEmpresa ? preview.filter(r => r.NOMBRE_EMPRESA === filtroEmpresa) : preview) : [];

  const renderContenido = () => {
    if (loading) return <div className="ci-state-center"><div className="ci-spinner" /><p>Consultando conversaciones...</p></div>;
    if (resultado) return (
      <div className="ci-seccion">
        <div className="ci-resultado-inline ci-resultado-ok">
          <span className="ci-resultado-icon">✅</span>
          <div>
            <div className="ci-resultado-titulo">Cierre completado</div>
            <div className="ci-resultado-detalle">
              <span className="ci-stat"><strong>{resultado.conversaciones_cerradas}</strong> conversaciones cerradas</span>
              <span className="ci-stat"><strong>{resultado.resoluciones_insertadas}</strong> resoluciones registradas</span>
            </div>
          </div>
          <button className="ci-btn-preview" style={{ marginLeft: 'auto' }} onClick={cargar}>🔍 Verificar</button>
        </div>
      </div>
    );
    if (preview === null) return (
      <div className="ci-state-center">
        <div className="ci-welcome-card">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
          <h2 className="ci-welcome-title">Cierre de Conversaciones</h2>
          <p className="ci-welcome-text">Consulta las conversaciones con más de <strong>30 días</strong> abiertas en <strong>{DB_NAMES[dbKey]}</strong>.</p>
          <button className="ci-btn-preview" onClick={cargar}>🔍 Ver conversaciones a cerrar</button>
        </div>
      </div>
    );
    if (preview.length === 0) return (
      <div className="ci-state-center">
        <div className="ci-welcome-card">
          <span style={{ fontSize: 48 }}>✅</span>
          <h2 className="ci-welcome-title">Todo en orden</h2>
          <p className="ci-welcome-text">No hay conversaciones con más de 30 días abiertas en <strong>{DB_NAMES[dbKey]}</strong>.</p>
          <button className="ci-btn-preview" onClick={cargar}>🔄 Volver a consultar</button>
        </div>
      </div>
    );
    return (
      <div className="ci-seccion">
        <div className="ci-resumen-bar">
          <div className="ci-resumen-total">
            <span className="ci-badge-total">{preview.length}</span>
            <span className="ci-resumen-label">conversaciones en {empresasUnicas.length} empresa(s)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="ci-topbar-select" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
              <option value="">Todas las empresas</option>
              {empresasUnicas.map(emp => {
                const cnt = preview.filter(r => r.NOMBRE_EMPRESA === emp).length;
                return <option key={emp} value={emp}>{emp} ({cnt})</option>;
              })}
            </select>
            <button className="ci-btn-ejecutar" onClick={ejecutar} disabled={loadingExec}>
              {loadingExec ? '⏳ Ejecutando...' : `⚡ Ejecutar cierre (${preview.length})`}
            </button>
          </div>
        </div>
        <div className="ci-table-wrap">
          <table className="ci-table">
            <thead>
              <tr><th>ID Conversación</th><th>Empresa</th><th>Fecha Inicio</th><th>Días Abierta</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {previewFiltrado.map(row => (
                <tr key={row.ID_CONVERSACION}>
                  <td><span className="ci-id-tag">{row.ID_CONVERSACION}</span></td>
                  <td>{row.NOMBRE_EMPRESA}</td>
                  <td>{formatFecha(row.FECHA_CONVERSACION)}</td>
                  <td>
                    <span className={`ci-dias-badge ${row.DIAS_ABIERTA >= 90 ? 'critico' : row.DIAS_ABIERTA >= 60 ? 'alto' : 'medio'}`}>
                      {row.DIAS_ABIERTA} días
                    </span>
                  </td>
                  <td><span className="ci-estado-badge">Abierta</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="ci-seccion-con-panel">
      {renderContenido()}
      <PanelTareaProgramada tipo="cierres" dbKey={dbKey} />
    </div>
  );
}

// ── Contenido: Facebook ──────────────────────────────────────────────────────
function ContenidoFacebook({ preview, loading, resultado, dbKey, cargar, ejecutar, loadingExec }) {
  const renderContenido = () => {
    if (loading) return <div className="ci-state-center"><div className="ci-spinner" /><p>Consultando solicitudes...</p></div>;
    if (resultado) return (
      <div className="ci-seccion">
        <div className="ci-resultado-inline ci-resultado-ok">
          <span className="ci-resultado-icon">✅</span>
          <div>
            <div className="ci-resultado-titulo">Actualización completada</div>
            <div className="ci-resultado-detalle">
              <span className="ci-stat"><strong>{resultado.actualizados}</strong> solicitudes marcadas como completado</span>
            </div>
          </div>
          <button className="ci-btn-preview" style={{ marginLeft: 'auto' }} onClick={cargar}>🔍 Verificar</button>
        </div>
      </div>
    );
    if (preview === null) return (
      <div className="ci-state-center">
        <div className="ci-welcome-card">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
          <h2 className="ci-welcome-title">Solicitudes de Eliminación FB</h2>
          <p className="ci-welcome-text">Consulta las solicitudes en estado <strong>procesando</strong> en <strong>{DB_NAMES[dbKey]}</strong>.</p>
          <button className="ci-btn-preview" onClick={cargar}>🔍 Ver solicitudes pendientes</button>
        </div>
      </div>
    );
    if (preview.length === 0) return (
      <div className="ci-state-center">
        <div className="ci-welcome-card">
          <span style={{ fontSize: 48 }}>✅</span>
          <h2 className="ci-welcome-title">Sin solicitudes pendientes</h2>
          <p className="ci-welcome-text">No hay solicitudes en estado "procesando" en <strong>{DB_NAMES[dbKey]}</strong>.</p>
          <button className="ci-btn-preview" onClick={cargar}>🔄 Volver a consultar</button>
        </div>
      </div>
    );
    return (
      <div className="ci-seccion">
        <div className="ci-resumen-bar">
          <div className="ci-resumen-total">
            <span className="ci-badge-total ci-badge-fb">{preview.length}</span>
            <span className="ci-resumen-label">solicitudes en estado "procesando"</span>
          </div>
          <button className="ci-btn-ejecutar" onClick={ejecutar} disabled={loadingExec}>
            {loadingExec ? '⏳ Ejecutando...' : `⚡ Marcar como completado (${preview.length})`}
          </button>
        </div>
        <div className="ci-table-wrap">
          <table className="ci-table">
            <thead>
              <tr><th>ID</th><th>ID Solicitud</th><th>Usuario ID</th><th>Aplicación</th><th>Fecha Solicitud</th><th>Estado</th></tr>
            </thead>
            <tbody>
              {preview.map(row => (
                <tr key={row.ID_ELIMINACION}>
                  <td><span className="ci-id-tag">{row.ID_ELIMINACION}</span></td>
                  <td><span className="ci-id-tag" style={{ fontSize: '10px' }}>{row.ID_SOLICITUD}</span></td>
                  <td>{row.USUARIO_ID}</td>
                  <td>{row.NOMBRE_APLICACION || '--'}</td>
                  <td>{formatFecha(row.FECHA_SOLICITO)}</td>
                  <td><span className="ci-estado-badge ci-estado-procesando">procesando</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="ci-seccion-con-panel">
      {renderContenido()}
      <PanelTareaProgramada tipo="facebook" dbKey={dbKey} />
    </div>
  );
}

// ── Contenido: Tags Bot ──────────────────────────────────────────────────────
function ContenidoBotTags({ resultados, loading, tag }) {
  if (loading) {
    return <div className="ci-state-center"><div className="ci-spinner" /><p>Buscando coincidencias...</p></div>;
  }

  if (resultados === null) {
    return (
      <div className="ci-state-center">
        <div className="ci-welcome-card">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
          <h2 className="ci-welcome-title">Validación de Tags Bot</h2>
          <p className="ci-welcome-text">Selecciona una empresa, un bot y escribe una palabra clave en los filtros, luego presiona <strong>Buscar</strong>.</p>
        </div>
      </div>
    );
  }

  if (resultados.length === 0) {
    return (
      <div className="ci-state-center">
        <div className="ci-welcome-card">
          <span style={{ fontSize: 48 }}>✅</span>
          <h2 className="ci-welcome-title">Sin coincidencias</h2>
          <p className="ci-welcome-text">No se encontraron coincidencias para <strong>"{tag}"</strong>. La palabra clave está disponible.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="ci-seccion">
      <div className="ci-resumen-bar">
        <div className="ci-resumen-total">
          <span className="ci-badge-total ci-badge-tags">{resultados.length}</span>
          <span className="ci-resumen-label">coincidencia(s) encontradas para "{tag}"</span>
        </div>
      </div>
      <div className="ci-table-wrap">
        <table className="ci-table">
          <thead>
            <tr><th>ID Bot Menu</th><th>Nombre</th><th>Palabra Clave</th><th>Red Social</th><th>Tags</th></tr>
          </thead>
          <tbody>
            {resultados.map((row, idx) => (
              <tr key={row.ID_BOT_MENU || idx}>
                <td><span className="ci-id-tag">{row.ID_BOT_MENU}</span></td>
                <td>{row.NOMBRE || '--'}</td>
                <td>{row.PALABRA_CLAVE || '--'}</td>
                <td>{row.NOMBRE_RED_SOCIAL || '--'}</td>
                <td className="ci-tags-cell">{row.TAGS || '--'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── ComboSearch: input con lista desplegable filtrable ────────────────
function ComboSearch({ options, value, onChange, placeholder, labelKey, valueKey, loading }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useState(() => ({ current: null }))[0];

  const selected = options.find(o => String(o[valueKey]) === String(value));
  const display = selected ? selected[labelKey] : '';

  const filtered = query
    ? options.filter(o => o[labelKey].toLowerCase().includes(query.toLowerCase()))
    : options;

  const select = (opt) => {
    onChange(opt ? String(opt[valueKey]) : '');
    setQuery('');
    setOpen(false);
  };

  return (
    <div className="ci-combo" ref={r => { if (ref) ref.current = r; }}>
      <input
        className="ci-topbar-input ci-combo-input"
        placeholder={loading ? 'Cargando...' : (display || placeholder)}
        value={open ? query : display}
        onFocus={() => { setOpen(true); setQuery(''); }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={e => setQuery(e.target.value)}
        readOnly={loading}
      />
      {value && !open && (
        <button className="ci-combo-clear" onMouseDown={() => select(null)}>×</button>
      )}
      {open && (
        <div className="ci-combo-dropdown">
          <div className="ci-combo-opt ci-combo-opt-none" onMouseDown={() => select(null)}>
            <em>{placeholder}</em>
          </div>
          {filtered.length === 0
            ? <div className="ci-combo-opt ci-combo-opt-empty">Sin resultados</div>
            : filtered.map(o => (
              <div key={o[valueKey]} className="ci-combo-opt" onMouseDown={() => select(o)}>
                {o[labelKey]}
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}

// ── Helper: contar nodos en árbol ──────────────────────────────────────
const countNodes = (tree) => tree.reduce((acc, n) => acc + 1 + countNodes(n.hijos || []), 0);

// ── Helper: badge contador que abre modal ──────────────────────────────────
// payload: array de tree nodes {id, nombre, etiqueta, hijos[]} (por perfil o manuales)
function PantallasCell({ tree, variant, label, onOpen }) {
  if (!tree || tree.length === 0) return <span style={{ color: '#94a3b8', fontSize: 12 }}>--</span>;
  const total = countNodes(tree);
  return (
    <button className={`ci-pantallas-badge ci-chip-${variant}`} onClick={() => onOpen(tree, label)}>
      {total} elemento{total !== 1 ? 's' : ''}
    </button>
  );
}

// ── Helper: nodo del árbol expandible (estilo compacto) ───────────────
function TreeNode({ node, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const hasHijos = node.hijos && node.hijos.length > 0;
  return (
    <div className="ci-tree-node">
      <div
        className={`ci-tree-row ci-tree-depth-${Math.min(depth, 2)}`}
        onClick={hasHijos ? () => setOpen(o => !o) : undefined}
        style={{ cursor: hasHijos ? 'pointer' : 'default' }}
      >
        <span className="ci-tree-arrow">
          {hasHijos ? (open ? '▾' : '▸') : <span className="ci-tree-dot">·</span>}
        </span>
        <span className="ci-tree-name">
          {node.etiqueta} <span className={node.permiso === 'H' ? 'ci-tree-check' : 'ci-tree-cross'}>{node.permiso === 'H' ? '✔' : '✘'}</span>
        </span>
      </div>
      {open && hasHijos && (
        <div className="ci-tree-children">
          {node.hijos.map(h => <TreeNode key={h.id} node={h} depth={depth + 1} />)}
        </div>
      )}
    </div>
  );
}

// ── Helper: chips coloreados desde array ──────────────────────────────────
function ChipList({ items = [], variant = 'blue' }) {
  if (!items.length) return <span style={{ color: '#94a3b8', fontSize: 12 }}>--</span>;
  return (
    <div className="ci-chip-list">
      {items.map((item, i) => (
        <span key={i} className={`ci-chip ci-chip-${variant}`}>{item}</span>
      ))}
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────
function Cierres() {
  const [dbKey, setDbKey] = useState('db_1');
  const [seccion, setSeccion] = useState(null);

  // Conversaciones
  const [previewConv, setPreviewConv] = useState(null);
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingExecConv, setLoadingExecConv] = useState(false);
  const [resultadoConv, setResultadoConv] = useState(null);
  const [filtroEmpConv, setFiltroEmpConv] = useState('');

  // Facebook
  const [previewFb, setPreviewFb] = useState(null);
  const [loadingFb, setLoadingFb] = useState(false);
  const [loadingExecFb, setLoadingExecFb] = useState(false);
  const [resultadoFb, setResultadoFb] = useState(null);

  // ── Estados de modales de confirmación ──
  const [showEjecutarConvModal, setShowEjecutarConvModal] = useState(false);
  const [showEjecutarFbModal, setShowEjecutarFbModal] = useState(false);

  // Tags
  const [empresasTags, setEmpresasTags] = useState([]);
  const [botsTags, setBotsTags] = useState([]);
  const [idEmpresaTags, setIdEmpresaTags] = useState('');
  const [idBotTags, setIdBotTags] = useState('');
  const [tagBusqueda, setTagBusqueda] = useState('');
  const [resultadosTags, setResultadosTags] = useState(null);
  const [loadingTags, setLoadingTags] = useState(false);
  const [loadingEmpTags, setLoadingEmpTags] = useState(false);
  const [loadingBotsTags, setLoadingBotsTags] = useState(false);

  // Plantillas WhatsApp
  const [empresasPlantillas, setEmpresasPlantillas] = useState([]);
  const [botsPlantillas, setBotsPlantillas] = useState([]);
  const [idEmpresaPlantillas, setIdEmpresaPlantillas] = useState('');
  const [idBotPlantillas, setIdBotPlantillas] = useState('');
  const [estadoPlantillas, setEstadoPlantillas] = useState(''); // '' = todos, '1' = activo, '0' = inactivo
  const [loadingEmpPlantillas, setLoadingEmpPlantillas] = useState(false);
  const [loadingBotsPlantillas, setLoadingBotsPlantillas] = useState(false);
  const [plantillasData, setPlantillasData] = useState(null);
  const [loadingPlantillas, setLoadingPlantillas] = useState(false);

  // ── Conversaciones ──
  const cargarPreviewConv = async (keyOverride) => {
    const key = typeof keyOverride === 'string' ? keyOverride : dbKey;
    setLoadingConv(true); setPreviewConv(null); setResultadoConv(null); setFiltroEmpConv('');
    try {
      const res = await fetchWithAuth(API_URLS.cierresPreview(key));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setPreviewConv(data);
      if (data.length === 0) toast.info('No hay conversaciones con más de 30 días abiertas');
      else toast.success(`${data.length} conversación(es) encontradas`);
    } catch (e) { toast.error(e.message); setPreviewConv([]); }
    finally { setLoadingConv(false); }
  };

  const ejecutarConv = async () => {
    if (!previewConv?.length) return;
    setShowEjecutarConvModal(true);
  };

  const confirmEjecutarConv = async () => {
    setShowEjecutarConvModal(false);
    setLoadingExecConv(true);
    try {
      const res = await fetchWithAuth(API_URLS.cierresEjecutar(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_key: dbKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setResultadoConv(data); setPreviewConv(null);
      toast.success(`Cierre completado: ${data.conversaciones_cerradas} conversaciones cerradas`);

      // Auditoría de cierre masivo de conversaciones
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'CIERRE_MANUAL',
          entidad: 'AUTOMATIZACIONES',
          db_key: dbKey,
          metadata: { conversaciones_cerradas: data.conversaciones_cerradas },
          descripcion: `Ejecución manual: Cierre de conversaciones de +30 días (${dbKey}). ${data.conversaciones_cerradas} cerradas.`
        });
      });

    } catch (e) { toast.error(e.message); }
    finally { setLoadingExecConv(false); }
  };

  // ── Facebook ──
  const cargarPreviewFb = async (keyOverride) => {
    const key = typeof keyOverride === 'string' ? keyOverride : dbKey;
    setLoadingFb(true); setPreviewFb(null); setResultadoFb(null);
    try {
      const res = await fetchWithAuth(API_URLS.facebookPreview(key));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setPreviewFb(data);
      if (data.length === 0) toast.info('No hay solicitudes de Facebook en estado "procesando"');
      else toast.success(`${data.length} solicitud(es) encontradas`);
    } catch (e) { toast.error(e.message); setPreviewFb([]); }
    finally { setLoadingFb(false); }
  };

  const ejecutarFb = async () => {
    if (!previewFb?.length) return;
    setShowEjecutarFbModal(true);
  };

  const confirmEjecutarFb = async () => {
    setShowEjecutarFbModal(false);
    setLoadingExecFb(true);
    try {
      const res = await fetchWithAuth(API_URLS.facebookEjecutar(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_key: dbKey }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      setResultadoFb(data); setPreviewFb(null);
      toast.success(`Eliminación completada: ${data.registros_eliminados} registros eliminados`);

      // Auditoría de limpieza de Facebook
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'CIERRE_MANUAL',
          entidad: 'AUTOMATIZACIONES',
          db_key: dbKey,
          metadata: { registros_eliminados: data.registros_eliminados },
          descripcion: `Ejecución manual: Limpieza de logs Facebook (${dbKey}). ${data.registros_eliminados} eliminados.`
        });
      });

    } catch (e) { toast.error(e.message); }
    finally { setLoadingExecFb(false); }
  };

  // ── Tags: cargar empresas al activar sección ──
  const cargarEmpresasTags = async (keyOverride) => {
    const key = typeof keyOverride === 'string' ? keyOverride : dbKey;
    setLoadingEmpTags(true);
    setEmpresasTags([]); setBotsTags([]); setIdEmpresaTags(''); setIdBotTags(''); setResultadosTags(null);
    try {
      const res = await fetchWithAuth(API_URLS.empresas(key));
      const data = await res.json();
      setEmpresasTags(Array.isArray(data) ? data : []);
    } catch { toast.error('Error al cargar empresas'); }
    finally { setLoadingEmpTags(false); }
  };

  // ── Tags: cargar bots al cambiar empresa ──
  useEffect(() => {
    if (seccion !== 'tags' || !idEmpresaTags) {
      setBotsTags([]); setIdBotTags(''); return;
    }
    const cargar = async () => {
      setLoadingBotsTags(true);
      setBotsTags([]); setIdBotTags(''); setResultadosTags(null);
      try {
        const res = await fetchWithAuth(API_URLS.botRedesDisponibles(dbKey, idEmpresaTags, ''));
        const data = await res.json();
        const vistos = new Set();
        const unicos = [];
        (Array.isArray(data) ? data : []).forEach(b => {
          if (!vistos.has(b.ID_BOT)) { vistos.add(b.ID_BOT); unicos.push({ ID_BOT: b.ID_BOT, NOMBRE_BOT: b.NOMBRE_BOT }); }
        });
        setBotsTags(unicos);
      } catch { toast.error('Error al cargar bots'); }
      finally { setLoadingBotsTags(false); }
    };
    cargar();
  }, [dbKey, idEmpresaTags, seccion]);

  // ── Tags: buscar ──
  const buscarTags = async () => {
    if (!idEmpresaTags) return toast.warning('Selecciona una empresa');
    if (!idBotTags) return toast.warning('Selecciona un bot');
    if (!tagBusqueda.trim()) return toast.warning('Ingresa una palabra clave o tag');
    setLoadingTags(true); setResultadosTags(null);
    try {
      const res = await fetchWithAuth(API_URLS.botTagsBuscar(dbKey, idBotTags, tagBusqueda.trim()));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar coincidencias');
      setResultadosTags(Array.isArray(data) ? data : []);
      if (Array.isArray(data) && data.length > 0) toast.warning(`${data.length} coincidencia(s) encontradas`);
      else toast.success('No se encontraron coincidencias');

      // Auditoría de búsqueda de TAGs
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'BUSQUEDA',
          entidad: 'TAGS',
          db_key: dbKey,
          metadata: { tag: tagBusqueda.trim(), id_empresa: idEmpresaTags, id_bot: idBotTags, resultados: Array.isArray(data) ? data.length : 0 },
          descripcion: `Búsqueda de TAG: "${tagBusqueda.trim()}" en bot ${idBotTags} (Empresa: ${idEmpresaTags})`
        });
      });

    } catch (e) { toast.error(e.message); }
    finally { setLoadingTags(false); }
  };

  // ── Activar sección desde sidebar (sin auto-cargar) ──
  const activarSeccion = (id) => {
    if (seccion === id) return;
    setSeccion(id);
    setPreviewConv(null); setResultadoConv(null);
    setPreviewFb(null); setResultadoFb(null);
    setResultadosTags(null);
    setPlantillasData(null);
    if (id === 'tags') cargarEmpresasTags(dbKey);
    if (id === 'plantillas_wa') cargarEmpresasPlantillas(dbKey);
  };

  // ── Plantillas WhatsApp: cargar empresas ──
  const cargarEmpresasPlantillas = async (keyOverride) => {
    const key = typeof keyOverride === 'string' ? keyOverride : dbKey;
    setLoadingEmpPlantillas(true);
    setEmpresasPlantillas([]); setBotsPlantillas([]); 
    setIdEmpresaPlantillas(''); setIdBotPlantillas(''); setPlantillasData(null);
    try {
      const res = await fetchWithAuth(`${API_URLS.empresasPlantillas()}?db_key=${key}`);
      const data = await res.json();
      setEmpresasPlantillas(Array.isArray(data) ? data : []);
    } catch { toast.error('Error al cargar empresas'); }
    finally { setLoadingEmpPlantillas(false); }
  };

  // ── Plantillas WhatsApp: cargar bots ──
  useEffect(() => {
    if (seccion !== 'plantillas_wa' || !idEmpresaPlantillas) {
      setBotsPlantillas([]); setIdBotPlantillas(''); return;
    }
    const cargar = async () => {
      setLoadingBotsPlantillas(true);
      setBotsPlantillas([]); setIdBotPlantillas(''); setPlantillasData(null);
      try {
        const res = await fetchWithAuth(`${API_URLS.botsPlantillas()}?db_key=${dbKey}&id_empresa=${idEmpresaPlantillas}`);
        const data = await res.json();
        setBotsPlantillas(Array.isArray(data) ? data : []);
      } catch { toast.error('Error al cargar bots'); }
      finally { setLoadingBotsPlantillas(false); }
    };
    cargar();
  }, [dbKey, idEmpresaPlantillas, seccion]);

  // ── Plantillas WhatsApp: consultar ──
  const consultarPlantillas = async () => {
    if (!idEmpresaPlantillas) return toast.warning('Selecciona una empresa');
    setLoadingPlantillas(true); setPlantillasData(null);
    try {
      let url = `${API_URLS.plantillasWhatsApp()}?db_key=${dbKey}&id_empresa=${idEmpresaPlantillas}`;
      if (idBotPlantillas) url += `&id_bot=${idBotPlantillas}`;
      if (estadoPlantillas !== '') url += `&estado=${estadoPlantillas}`;
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al consultar');
      setPlantillasData(data.data || []);
      if (data.data?.length === 0) toast.info('No se encontraron plantillas');
      else toast.success(`${data.data.length} plantillas cargadas`);
    } catch (e) { toast.error(e.message); }
    finally { setLoadingPlantillas(false); }
  };

  // ── Plantillas WhatsApp: exportar Excel (.xlsx) ──
  const exportarPlantillasExcel = async () => {
    if (!idEmpresaPlantillas) return toast.warning('Selecciona una empresa para exportar');
    try {
      let url = `${API_URLS.plantillasWhatsAppExport()}?db_key=${dbKey}&id_empresa=${idEmpresaPlantillas}`;
      if (idBotPlantillas) url += `&id_bot=${idBotPlantillas}`;
      if (estadoPlantillas !== '') url += `&estado=${estadoPlantillas}`;
      
      const res = await fetchWithAuth(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error');
      
      if (data.data?.length > 0) {
        const headers = Object.keys(data.data[0]);
        
        // Crear tabla HTML para Excel
        let html = `
          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
          <head>
            <meta charset="UTF-8">
            <style>
              table { border-collapse: collapse; }
              th { background-color: #00a884; color: white; font-weight: bold; padding: 8px; border: 1px solid #333; }
              td { padding: 6px; border: 1px solid #ccc; }
              tr:nth-child(even) { background-color: #f9fafb; }
            </style>
          </head>
          <body>
            <table>
              <thead>
                <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
              </thead>
              <tbody>
                ${data.data.map(row => `
                  <tr>${headers.map(h => `<td>${String(row[h] || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>`).join('')}</tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;
        
        const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `plantillas_whatsapp_${dbKey}_${new Date().toISOString().split('T')[0]}.xls`;
        link.click();
        toast.success(`${data.data.length} plantillas exportadas a Excel`);
      } else {
        toast.info('No hay datos para exportar');
      }
    } catch (e) { toast.error('Error al exportar: ' + e.message); }
  };

  // ── Cambio de BD principal ──
  const handleDbChange = (newKey) => {
    setDbKey(newKey);
    setPreviewConv(null); setResultadoConv(null); setFiltroEmpConv('');
    setPreviewFb(null); setResultadoFb(null);
    setResultadosTags(null);
    setPlantillasData(null);
    if (seccion === 'tags') cargarEmpresasTags(newKey);
    if (seccion === 'plantillas_wa') cargarEmpresasPlantillas(newKey);
  };

  return (
    <div id="modulo-cierres-root">
      {/* ── TOPBAR ── */}
      <div className="ci-topbar">
        <div className="ci-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-topbar-logo-img" />
        </div>
        <div className="ci-topbar-divider" />

        <div className="ci-topbar-filters">
          {/* Base de Datos */}
          <div className="ci-topbar-field">
            <span className="ci-topbar-label">Base de Datos</span>
            <select className="ci-topbar-select" value={dbKey} onChange={e => handleDbChange(e.target.value)}>
              {Object.entries(DB_NAMES).map(([k, n]) => (
                <option key={k} value={k}>{n}</option>
              ))}
            </select>
          </div>

          {/* Filtros de Tags — solo cuando la sección está activa */}
          {seccion === 'tags' && (
            <>
              <div className="ci-topbar-divider" />
              <div className="ci-topbar-field">
                <span className="ci-topbar-label">Empresa {loadingEmpTags && '⌛'}</span>
                <select className="ci-topbar-select" value={idEmpresaTags} onChange={e => setIdEmpresaTags(e.target.value)}>
                  <option value="">Seleccionar empresa...</option>
                  {empresasTags.map(emp => <option key={emp.ID_EMPRESA} value={emp.ID_EMPRESA}>{emp.NOMBRE}</option>)}
                </select>
              </div>
              <div className="ci-topbar-field">
                <span className="ci-topbar-label">Bot {loadingBotsTags && '⌛'}</span>
                <select className="ci-topbar-select" value={idBotTags} onChange={e => setIdBotTags(e.target.value)} disabled={!idEmpresaTags}>
                  <option value="">Seleccionar bot...</option>
                  {botsTags.map(bot => <option key={bot.ID_BOT} value={bot.ID_BOT}>{bot.NOMBRE_BOT}</option>)}
                </select>
              </div>
              <div className="ci-topbar-field ci-topbar-field-search">
                <span className="ci-topbar-label">Palabra clave / tag</span>
                <input
                  className="ci-topbar-input"
                  value={tagBusqueda}
                  onChange={e => setTagBusqueda(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') buscarTags(); }}
                  placeholder="Ej: AYUDA"
                />
              </div>
              <button className="ci-btn-buscar" onClick={buscarTags} disabled={loadingTags}>
                {loadingTags ? '⏳' : '🔍 Buscar'}
              </button>
            </>
          )}

          {/* Filtros de Plantillas WA — solo cuando la sección está activa */}
          {seccion === 'plantillas_wa' && (
            <>
              <div className="ci-topbar-divider" />
              <div className="ci-topbar-field">
                <span className="ci-topbar-label">Empresa {loadingEmpPlantillas && '⌛'}</span>
                <select className="ci-topbar-select" value={idEmpresaPlantillas} onChange={e => setIdEmpresaPlantillas(e.target.value)}>
                  <option value="">Seleccionar empresa...</option>
                  {empresasPlantillas.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
                </select>
              </div>
              <div className="ci-topbar-field">
                <span className="ci-topbar-label">Bot {loadingBotsPlantillas && '⌛'}</span>
                <select className="ci-topbar-select" value={idBotPlantillas} onChange={e => setIdBotPlantillas(e.target.value)} disabled={!idEmpresaPlantillas}>
                  <option value="">Todos los bots...</option>
                  {botsPlantillas.map(bot => <option key={bot.id} value={bot.id}>{bot.nombre}</option>)}
                </select>
              </div>
              <div className="ci-topbar-field">
                <span className="ci-topbar-label">Estado</span>
                <select className="ci-topbar-select" value={estadoPlantillas} onChange={e => setEstadoPlantillas(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="1">Activo</option>
                  <option value="0">Inactivo</option>
                </select>
              </div>
              <button className="ci-btn-buscar" onClick={consultarPlantillas} disabled={loadingPlantillas || !idEmpresaPlantillas}>
                {loadingPlantillas ? '⏳' : '🔍 Consultar'}
              </button>
              <button 
                className="ci-btn-secondary" 
                onClick={exportarPlantillasExcel} 
                disabled={!idEmpresaPlantillas}
                title="Exportar a Excel (.xls)"
              >
                📊 Exportar Excel
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── BODY: sidebar + content ── */}
      <div className="ci-body">

        {/* ── SIDEBAR ── */}
        <div className="ci-sidebar">
          <p className="ci-sidebar-title">Acciones</p>
          {SIDEBAR_ITEMS.map(item => {
            const Icon = ICONOS_MENU[item.id];
            return (
              <button
                key={item.id}
                className={`ci-sidebar-item ${seccion === item.id ? 'active' : ''}`}
                onClick={() => activarSeccion(item.id)}
              >
                <span className="ci-sidebar-icon">{Icon && <Icon width={22} height={22} />}</span>
                <span className="ci-sidebar-labels">
                  <span className="ci-sidebar-label">{item.label}</span>
                  <span className="ci-sidebar-desc">{item.desc}</span>
                </span>
                {seccion === item.id && <span className="ci-sidebar-arrow">›</span>}
              </button>
            );
          })}
        </div>

        {/* ── PANEL DERECHO ── */}
        <div className="ci-panel">

          {/* CONTENIDO */}
          <div className="ci-content">
            {!seccion && (
              <div className="ci-state-center">
                <div className="ci-welcome-card">
                  <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
                  <h2 className="ci-welcome-title">Módulo de Acciones</h2>
                  <p className="ci-welcome-text">Selecciona una acción del menú lateral para comenzar.</p>
                </div>
              </div>
            )}

            {seccion === 'conversaciones' && (
              <ContenidoConversaciones
                preview={previewConv} loading={loadingConv} resultado={resultadoConv}
                dbKey={dbKey} filtroEmpresa={filtroEmpConv} setFiltroEmpresa={setFiltroEmpConv}
                cargar={cargarPreviewConv} ejecutar={ejecutarConv} loadingExec={loadingExecConv}
              />
            )}

            {seccion === 'facebook' && (
              <ContenidoFacebook
                preview={previewFb} loading={loadingFb} resultado={resultadoFb}
                dbKey={dbKey} cargar={cargarPreviewFb} ejecutar={ejecutarFb} loadingExec={loadingExecFb}
              />
            )}

            {seccion === 'tags' && (
              <ContenidoBotTags
                resultados={resultadosTags} loading={loadingTags} tag={tagBusqueda}
              />
            )}

            {seccion === 'reportes_auto' && (
              <ContenidoReportesAuto />
            )}

            {seccion === 'auditoria' && <Auditoria />}

            {seccion === 'configuraciones' && <ContenidoConfiguraciones />}

{seccion === 'plantillas_wa' && (
              <ContenidoPlantillasWhatsApp 
                plantillas={plantillasData} 
                loading={loadingPlantillas}
                dbKey={dbKey}
                onConsultar={consultarPlantillas}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tipos de reporte disponibles (mapeados de Reportes2.jsx) ─────────────────
const TIPOS_REPORTE = [
  { value: 'detallado',      label: 'Operaciones (Detallado)',      formato: 'xlsx', descripcion: 'Conversaciones detalladas por skill' },
  { value: 'resumido',       label: 'Resoluciones (Resumido)',       formato: 'xlsx', descripcion: 'Resumen de resoluciones por skill' },
  { value: 'grupoq',         label: 'Grupo Q',                      formato: 'csv',  descripcion: 'Reporte especial Grupo Q (DB2 · Empresa 213)' },
  { value: 'broadcast',      label: 'Broadcast',                    formato: 'xlsx', descripcion: 'Campañas de difusión masiva' },
  { value: 'apinotif',       label: 'API Notificaciones',           formato: 'xlsx', descripcion: 'Notificaciones enviadas por API' },
  { value: 'numerosactivos', label: 'Números Activos',              formato: 'xlsx', descripcion: 'Contactos activos del período' },
  { value: 'campaniasrep',   label: 'Campañas',                     formato: 'xlsx', descripcion: 'Reporte de campañas' },
  { value: 'respuestas',     label: 'Respuestas de Formulario',     formato: 'xlsx', descripcion: 'Respuestas a formularios enviados' },
  { value: 'resolpalabra',   label: 'Resoluciones por Palabra',     formato: 'xlsx', descripcion: 'Búsqueda de palabras en mensajes' },
];

const DB_NAMES_SCH = {
  'db_1':'Talkme S1','db_2':'Talkme S2','db_3':'Talkme S3','db_4':'Talkme S4',
  'db_5':'Talkme MDD','db_6':'Ficohsa S1','db_7':'Ficohsa S2','db_8':'Ficohsa S3',
};

const FORMATO_BADGE = { xlsx: { label: 'XLSX', cls: 'ci-ra-badge-xlsx' }, csv: { label: 'CSV', cls: 'ci-ra-badge-csv' } };

// Helper: invocar dialog de carpeta via IPC (solo en Electron)
async function elegirCarpeta() {
  try {
    const { ipcRenderer } = window.require('electron');
    const resultado = await ipcRenderer.invoke('seleccionar-carpeta');
    return resultado || null;
  } catch {
    return null;
  }
}

// ── MultiSelectDropdown: dropdown con búsqueda y checkboxes ──────────────────
function MultiSelectDropdown({ label, items, selected, onChange, idKey, labelKey, placeholder, loading: isLoading, defaultIds }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target) &&
          !e.target.closest('.ci-ra-msd-portal')) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleOpen = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setDropPos({ top: rect.bottom + window.scrollY + 4, left: rect.left + window.scrollX, width: rect.width });
    }
    setOpen(o => !o);
  };

  const selNums = selected.map(Number);
  const filtered = items.filter(i => String(i[labelKey] || '').toLowerCase().includes(search.toLowerCase()));
  const selCount = selNums.length;

  const toggle = (id) => {
    const n = Number(id);
    onChange(selNums.includes(n) ? selNums.filter(x => x !== n) : [...selNums, n]);
  };

  const portal = open ? (
    <div className="ci-ra-msd-portal" style={{ position: 'fixed', top: dropPos.top, left: dropPos.left, width: dropPos.width, zIndex: 99999 }}>
      <div className="ci-ra-msd-dropdown">
        <div className="ci-ra-msd-search-row">
          <input className="ci-ra-msd-search" placeholder={`🔍 Buscar ${label.toLowerCase()}...`}
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div className="ci-ra-msd-actions">
          <button type="button" onClick={() => onChange(items.map(i => Number(i[idKey])))}>Todos</button>
          <button type="button" onClick={() => onChange([])}>Ninguno</button>
        </div>
        <div className="ci-ra-msd-list">
          {filtered.length === 0
            ? <div className="ci-ra-msd-empty">Sin resultados</div>
            : filtered.map(i => (
              <label key={i[idKey]} className="ci-ra-msd-item">
                <input type="checkbox" checked={selNums.includes(Number(i[idKey]))} onChange={() => toggle(i[idKey])} />
                <span>{i[labelKey]}</span>
                {defaultIds?.includes(Number(i[idKey])) && <span className="ci-ra-msd-star">★</span>}
              </label>
            ))
          }
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="ci-ra-msd-wrap" ref={wrapRef}>
      <button type="button" className="ci-ra-msd-trigger" ref={triggerRef} onClick={handleOpen} disabled={isLoading}>
        <span className="ci-ra-msd-val">
          {isLoading ? '⌛ Cargando...' : selCount === 0 ? placeholder : `${selCount} seleccionado${selCount !== 1 ? 's' : ''}`}
        </span>
        <span className="ci-ra-msd-arrow">{open ? '▲' : '▼'}</span>
      </button>
      {typeof document !== 'undefined' && portal ? createPortal(portal, document.body) : null}
    </div>
  );
}

// Skills precargados por defecto (igual que Reportes2)
const SKILLS_DEFAULT = [9, 26, 39, 43, 71, 102];

// Reglas de filtros por tipo de reporte
const REPORTES_CON_SKILLS   = ['detallado', 'resumido', 'resolpalabra'];
const REPORTES_CON_BOT      = ['detallado', 'resumido', 'broadcast', 'apinotif', 'respuestas', 'campaniasrep'];
const REPORTES_CON_CAMPANIAS= ['broadcast'];
const REPORTES_CON_FORMULARIO = ['respuestas'];
const REPORTES_CON_TEXTO    = ['resolpalabra'];
const REPORTES_CON_FLUJO    = ['resolpalabra'];
const REPORTES_SIN_EMPRESA  = ['numerosactivos'];
const REPORTES_GRUPOQ_FIXED = ['grupoq']; // db_2 + empresa 213

// ── Modal: agregar nuevo reporte ──────────────────────────────────────────────
function ModalAgregarReporte({ onClose, onAgregado, reporteInicial }) {
  const esEdicion = !!reporteInicial;
  const [tipo, setTipo] = useState(reporteInicial?.tipo_reporte || 'detallado');
  const [dbKey, setDbKey] = useState(reporteInicial?.db_key || 'db_8');
  const [empresas, setEmpresas] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState(String(reporteInicial?.id_empresa || ''));
  const [carpeta, setCarpeta] = useState(reporteInicial?.carpeta || '');
  const [formato, setFormato] = useState(reporteInicial?.formato || 'xlsx');
  const [guardando, setGuardando] = useState(false);
  // Filtros adicionales por tipo
  const [skills, setSkills] = useState([]);
  const [skillsSel, setSkillsSel] = useState(reporteInicial?.skills || []);
  const [bots, setBots] = useState([]);
  const [botsSel, setBotsSel] = useState(reporteInicial?.id_bots || []);
  const [campanias, setCampanias] = useState([]);
  const [campaniasSel, setCampaniasSel] = useState(reporteInicial?.id_broadcasts || []);
  const [formularios, setFormularios] = useState([]);
  const [formularioSel, setFormularioSel] = useState(reporteInicial?.id_formulario || '');
  const [textoBuscar, setTextoBuscar] = useState(reporteInicial?.texto_buscar || '');
  const [flujo, setFlujo] = useState(reporteInicial?.flujo || '');

  // ID de empresa a preservar al montar en modo edición (inmutable)
  const idEmpresaInicial = useRef(esEdicion ? String(reporteInicial?.id_empresa || '') : '');
  // dbKey anterior para detectar cambio real del usuario
  const dbKeyPrev = useRef(dbKey);

  // Cargar empresas
  useEffect(() => {
    if (!dbKey) return;
    if (REPORTES_GRUPOQ_FIXED.includes(tipo)) {
      fetchWithAuth(`http://localhost:3001/api/empresas?db_key=db_2`)
        .then(r => r.json()).then(data => { setEmpresas(Array.isArray(data) ? data : []); setIdEmpresa('213'); })
        .catch(() => setEmpresas([]));
      return;
    }
    // Si el usuario cambió la DB, resetear empresa; si es la carga inicial en edición, preservar
    const usuarioCambioDb = dbKeyPrev.current !== dbKey;
    dbKeyPrev.current = dbKey;
    fetchWithAuth(`http://localhost:3001/api/empresas?db_key=${dbKey}`)
      .then(r => r.json()).then(data => {
        setEmpresas(Array.isArray(data) ? data : []);
        if (usuarioCambioDb) setIdEmpresa('');
        else if (idEmpresaInicial.current) setIdEmpresa(idEmpresaInicial.current);
      })
      .catch(() => setEmpresas([]));
  }, [dbKey, tipo]);

  // Valores iniciales de filtros (inmutables) para modo edición
  const skillsSelInicial  = useRef(reporteInicial?.skills        || []);
  const botsSelInicial    = useRef(reporteInicial?.id_bots       || []);
  // Combinación anterior tipo+empresa para detectar cambio real del usuario
  const tipoEmpresaPrev = useRef(`${tipo}__${idEmpresa}`);

  // Cargar skills
  useEffect(() => {
    if (!REPORTES_CON_SKILLS.includes(tipo) || !dbKey || !idEmpresa) { setSkills([]); return; }
    const clave = `${tipo}__${idEmpresa}`;
    const usuarioCambio = tipoEmpresaPrev.current !== clave;
    tipoEmpresaPrev.current = clave;
    setSkills([]);
    if (usuarioCambio) setSkillsSel([]);
    fetchWithAuth(`http://localhost:3001/api/skills/disponibles?db_key=${dbKey}&id_empresa=${idEmpresa}&search=&limit=9999`)
      .then(r => r.json()).then(data => {
        const lista = Array.isArray(data) ? data : [];
        setSkills(lista);
        if (!usuarioCambio) {
          if (skillsSelInicial.current.length > 0) {
            // Edición: restaurar los guardados
            setSkillsSel(skillsSelInicial.current.map(Number));
          } else if (!esEdicion) {
            // Nuevo reporte: precargar defaults disponibles
            const disponibles = lista.filter(s => SKILLS_DEFAULT.includes(s.ID_SKILL)).map(s => s.ID_SKILL);
            if (disponibles.length > 0) setSkillsSel(disponibles);
          }
        }
      })
      .catch(() => setSkills([]));
  }, [tipo, dbKey, idEmpresa]);

  // Cargar bots
  const tipoEmpresaBotsPrev = useRef(`${tipo}__${idEmpresa}`);
  useEffect(() => {
    if (!REPORTES_CON_BOT.includes(tipo) || !dbKey || !idEmpresa) { setBots([]); return; }
    const clave = `${tipo}__${idEmpresa}`;
    const usuarioCambio = tipoEmpresaBotsPrev.current !== clave;
    tipoEmpresaBotsPrev.current = clave;
    setBots([]);
    if (usuarioCambio) setBotsSel([]);
    const url = tipo === 'broadcast'
      ? `http://localhost:3001/api/reportes/bots-broadcast?db_key=${dbKey}&id_empresa=${idEmpresa}`
      : `http://localhost:3001/api/reportes/bots-empresa?db_key=${dbKey}&id_empresa=${idEmpresa}`;
    fetchWithAuth(url).then(r => r.json()).then(data => {
      setBots(Array.isArray(data) ? data : []);
      if (!usuarioCambio && botsSelInicial.current.length > 0) {
        setBotsSel(botsSelInicial.current.map(Number));
      }
    }).catch(() => setBots([]));
  }, [tipo, dbKey, idEmpresa]);

  // Cargar formularios
  useEffect(() => {
    setFormularioSel(''); setFormularios([]);
    if (!REPORTES_CON_FORMULARIO.includes(tipo) || botsSel.length === 0) return;
    fetchWithAuth(`http://localhost:3001/api/reportes/formularios-bot?db_key=${dbKey}&id_bots=${botsSel.join(',')}`)
      .then(r => r.json()).then(data => setFormularios(Array.isArray(data) ? data : []))
      .catch(() => setFormularios([]));
  }, [tipo, dbKey, JSON.stringify(botsSel)]);

  // Al cambiar tipo, resetear filtros (solo si NO es edición inicial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSkillsSel([]); setBotsSel([]); setCampaniasSel([]); setFormularioSel('');
    setTextoBuscar(''); setFlujo('');
    setFormato(TIPOS_REPORTE.find(t => t.value === tipo)?.formato || 'xlsx');
  }, [tipo]);

  const tipoInfo = TIPOS_REPORTE.find(t => t.value === tipo);


  const abrirCarpeta = async () => { const r = await elegirCarpeta(); if (r) setCarpeta(r); };

  const agregar = async () => {
    if (!REPORTES_SIN_EMPRESA.includes(tipo) && !idEmpresa) { toast.error('Selecciona una empresa'); return; }
    if (!carpeta.trim()) { toast.error('Indica la carpeta destino'); return; }
    if (REPORTES_CON_TEXTO.includes(tipo) && !textoBuscar.trim()) { toast.error('Ingresa el texto a buscar'); return; }
    setGuardando(true);
    try {
      const empresaObj = empresas.find(e => String(e.ID_EMPRESA) === String(idEmpresa));
      const empresaNombre = empresaObj?.NOMBRE || idEmpresa;
      const clave = esEdicion
        ? reporteInicial.clave
        : `${tipo}_${dbKey}_${idEmpresa}_${Date.now()}`.replace(/[^a-z0-9_]/gi, '_').toLowerCase();
      const nombre = esEdicion
        ? reporteInicial.nombre
        : `${tipoInfo?.label || tipo} - ${empresaNombre}`;
      const res = await fetchWithAuth('http://localhost:3001/api/scheduler/reporte/agregar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clave, nombre, tipo_reporte: tipo,
          db_key: REPORTES_GRUPOQ_FIXED.includes(tipo) ? 'db_2' : dbKey,
          id_empresa: String(idEmpresa), carpeta: carpeta.trim(), formato,
          skills: skillsSel, id_bots: botsSel,
          id_broadcasts: campaniasSel, id_formulario: formularioSel,
          texto_buscar: textoBuscar.trim(), flujo: flujo.trim()
        })
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(esEdicion ? 'Reporte actualizado' : 'Reporte agregado');
        
        // Auditoría de agregar/editar reporte automático
        import('../../services/auditoriaService').then(({ registrarLog }) => {
          registrarLog({
            tipo_accion: esEdicion ? 'UPDATE' : 'INSERT',
            entidad: 'DESCARGAS_AUTO',
            db_key: dbKey,
            id_empresa: idEmpresa,
            metadata: { clave, nombre, tipo_reporte: tipo, carpeta },
            descripcion: `${esEdicion ? 'Actualizado' : 'Agregado'} reporte automático: ${nombre} (${tipo})`
          });
        });

        onAgregado();
        onClose();
      }
      else toast.error(data.error || 'Error al agregar');
    } catch { toast.error('Error al agregar reporte'); }
    finally { setGuardando(false); }
  };

  const dbKeyFinal = REPORTES_GRUPOQ_FIXED.includes(tipo) ? 'db_2' : dbKey;

  return (
    <div className="ci-ra-modal-overlay" onClick={onClose}>
      <div className="ci-ra-modal ci-ra-modal-lg" onClick={e => e.stopPropagation()}>
        <div className="ci-ra-modal-header">
          <span className="ci-ra-modal-titulo">{esEdicion ? '✏️ Editar reporte' : '➕ Agregar reporte al scheduler'}</span>
          <button className="ci-ra-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="ci-ra-modal-body">
          {/* Fila 1: Tipo + Formato */}
          <div className="ci-ra-modal-row2">
            <div className="ci-ra-modal-field">
              <label>Tipo de reporte</label>
              <select className="ci-ra-select" value={tipo} onChange={e => setTipo(e.target.value)}>
                {TIPOS_REPORTE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
              {tipoInfo && <p className="ci-ra-modal-hint">{tipoInfo.descripcion}</p>}
            </div>
            <div className="ci-ra-modal-field">
              <label>Formato de archivo</label>
              <div className="ci-ra-fmt-selector">
                {['xlsx', 'csv'].map(fmt => (
                  <button key={fmt} className={`ci-ra-fmt-btn ${formato === fmt ? 'active' : ''}`}
                    onClick={() => setFormato(fmt)}>
                    <span className={`ci-ra-fmt-badge ${fmt === 'xlsx' ? 'ci-ra-badge-xlsx' : 'ci-ra-badge-csv'}`}>
                      {fmt.toUpperCase()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fila 2: DB + Empresa */}
          <div className="ci-ra-modal-row2">
            <div className="ci-ra-modal-field">
              <label>Base de datos</label>
              {REPORTES_GRUPOQ_FIXED.includes(tipo)
                ? <input className="ci-ra-input" value="2. Talkme S2 (fijo)" disabled />
                : <select className="ci-ra-select" value={dbKey} onChange={e => setDbKey(e.target.value)}>
                    {Object.entries(DB_NAMES_SCH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
              }
            </div>
            <div className="ci-ra-modal-field">
              <label>Empresa{REPORTES_SIN_EMPRESA.includes(tipo) ? ' (opcional)' : ''}</label>
              {REPORTES_GRUPOQ_FIXED.includes(tipo)
                ? <input className="ci-ra-input" value="Empresa 213 (fijo)" disabled />
                : <select className="ci-ra-select" value={idEmpresa} onChange={e => setIdEmpresa(e.target.value)}>
                    <option value="">— seleccionar —</option>
                    {empresas.map(e => <option key={e.ID_EMPRESA} value={String(e.ID_EMPRESA)}>{e.NOMBRE}</option>)}
                  </select>
              }
            </div>
          </div>

          {/* Skills — detallado, resumido, resolpalabra */}
          {REPORTES_CON_SKILLS.includes(tipo) && (
            <div className="ci-ra-modal-field">
              <label>Skills <span className="ci-ra-modal-hint-inline">(selecciona los que aplican)</span></label>
              <MultiSelectDropdown
                label="Skills"
                items={skills}
                selected={skillsSel}
                onChange={setSkillsSel}
                idKey="ID_SKILL"
                labelKey="NOMBRE_SKILL"
                placeholder="Seleccionar skills..."
                loading={skills.length === 0 && !!idEmpresa}
                defaultIds={SKILLS_DEFAULT}
              />
            </div>
          )}

          {/* Bots — detallado, resumido, broadcast, apinotif, respuestas, campaniasrep */}
          {REPORTES_CON_BOT.includes(tipo) && (
            <div className="ci-ra-modal-field">
              <label>Bots <span className="ci-ra-modal-hint-inline">(selecciona los que aplican)</span></label>
              <MultiSelectDropdown
                label="Bots"
                items={bots}
                selected={botsSel}
                onChange={setBotsSel}
                idKey="ID_BOT"
                labelKey="NOMBRE_BOT"
                placeholder="Seleccionar bots..."
                loading={bots.length === 0 && !!idEmpresa}
              />
            </div>
          )}

          {/* Formulario — respuestas */}
          {REPORTES_CON_FORMULARIO.includes(tipo) && formularios.length > 0 && (
            <div className="ci-ra-modal-field">
              <label>Formulario</label>
              <select className="ci-ra-select" value={formularioSel} onChange={e => setFormularioSel(e.target.value)}>
                <option value="">— seleccionar —</option>
                {formularios.map(f => <option key={f.ID_FORMULARIO} value={f.ID_FORMULARIO}>{f.NOMBRE}</option>)}
              </select>
            </div>
          )}

          {/* Texto a buscar — resolpalabra */}
          {REPORTES_CON_TEXTO.includes(tipo) && (
            <div className="ci-ra-modal-row2">
              <div className="ci-ra-modal-field">
                <label>Texto a buscar</label>
                <input className="ci-ra-input" value={textoBuscar} onChange={e => setTextoBuscar(e.target.value)}
                  placeholder="Palabra o frase a buscar" />
              </div>
              <div className="ci-ra-modal-field">
                <label>Flujo</label>
                <select className="ci-ra-select" value={flujo} onChange={e => setFlujo(e.target.value)}>
                  <option value="">Todos</option>
                  <option value="Salientes">Salientes</option>
                  <option value="Entrantes">Entrantes</option>
                </select>
              </div>
            </div>
          )}

          {/* Carpeta destino */}
          <div className="ci-ra-modal-field">
            <label>📁 Carpeta destino</label>
            <div className="ci-ra-carpeta-row">
              <input type="text" className="ci-ra-input ci-ra-input-wide"
                value={carpeta} onChange={e => setCarpeta(e.target.value)}
                placeholder="Ej: C:\Users\hp\Desktop\Reportes" />
              <button className="ci-ra-btn-browse" onClick={abrirCarpeta}>📂 Explorar</button>
            </div>
          </div>
        </div>

        <div className="ci-ra-modal-footer">
          <button className="ci-ra-btn-cancel" onClick={onClose}>Cancelar</button>
          <button className="ci-btn-ejecutar" onClick={agregar} disabled={guardando}>
            {guardando ? '⏳ Guardando...' : esEdicion ? '💾 Guardar cambios' : '➕ Agregar reporte'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Contenido: Reportes Automáticos ─────────────────────────────────────────
function ContenidoReportesAuto() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [histPagina, setHistPagina] = useState(1);
  const ROWS_PER_PAGE = 15;
  const [tab, setTab] = useState('config');
  const [modalAgregar, setModalAgregar] = useState(false);
  const [editando, setEditando] = useState(null);
  const [eliminando, setEliminando] = useState(null);
  const [reintentando, setReintentando] = useState(null);
  
  // Estados para gestión de emails
  const [destinatarios, setDestinatarios] = useState([]);
  const [emailConfig, setEmailConfig] = useState(null);
  const [emailConfigLoading, setEmailConfigLoading] = useState(false);
  const [emailTestLoading, setEmailTestLoading] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);
  const [nuevoEmail, setNuevoEmail] = useState({ email: '', nombre: '', clave_reporte: '', tipo: 'PARA' });
  const [guardandoDestinatario, setGuardandoDestinatario] = useState(false);
  
  // Estados para plantillas de correo (tipo Outlook)
  const [templates, setTemplates] = useState([]);
  const [templateActual, setTemplateActual] = useState(null);
  const [modalTemplate, setModalTemplate] = useState(false);
  const [guardandoTemplate, setGuardandoTemplate] = useState(false);
  const [nuevoDestinatarioTemplate, setNuevoDestinatarioTemplate] = useState({ email: '', nombre: '', tipo: 'PARA' });
  // Estados para editor de plantillas estilo ESINSA
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [modoEditor, setModoEditor] = useState('visual'); // 'visual' | 'html'
  const [editandoAsunto, setEditandoAsunto] = useState('');
  const [editandoCuerpo, setEditandoCuerpo] = useState('');
  const [editandoFirma, setEditandoFirma] = useState('');
  const [editandoReportes, setEditandoReportes] = useState([]); // IDs de reportes seleccionados
  const [editandoDestinatarios, setEditandoDestinatarios] = useState([]); // Array de destinatarios
  const destinatariosRef = useRef([]); // Ref para evitar stale closure
  // Estados separados para cada tipo de destinatario (evita que se borren al cambiar de campo)
  const [nuevoPara, setNuevoPara] = useState({ email: '', nombre: '' });
  const [nuevoCc, setNuevoCc] = useState({ email: '', nombre: '' });
  const [nuevoCco, setNuevoCco] = useState({ email: '', nombre: '' });
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [mostrarVistaPrevia, setMostrarVistaPrevia] = useState(false);
  const [imagenFirmaPreview, setImagenFirmaPreview] = useState(null);

  // Sincronizar ref con estado de destinatarios
  useEffect(() => {
    destinatariosRef.current = editandoDestinatarios;
  }, [editandoDestinatarios]);

  // Helper para obtener nombres de reportes formateados
  const getNombresReportes = (reportesClaves) => {
    if (!reportesClaves || reportesClaves.length === 0) return 'Reporte';
    
    const nombres = reportesClaves.map(r => {
      const reporte = config?.reportes?.find(rep => rep.clave === r);
      return reporte?.nombre || r;
    });
    
    if (nombres.length === 1) return nombres[0];
    if (nombres.length === 2) return `${nombres[0]} y ${nombres[1]}`;
    return nombres.slice(0, -1).join(', ') + ' y ' + nombres[nombres.length - 1];
  };

  // Función para generar vista previa del correo estilo Outlook/Gmail
  const generarVistaPrevia = (template = null) => {
    const tpl = template || templateActual;
    if (!tpl) return '';
    
    const hoy = new Date();
    const fecha = hoy.toLocaleDateString('es-ES', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Obtener destinatarios (pueden venir como 'destinatarios' o desde la API como array)
    const destinatarios = tpl.destinatarios || [];
    const destPara = destinatarios.filter(d => d.tipo === 'PARA' || d.TIPO === 'PARA');
    const destCC = destinatarios.filter(d => d.tipo === 'CC' || d.TIPO === 'CC');
    
    // Generar lista de reportes - usar nombres reales de archivo
    const reportesLista = (tpl.reportes || []).map(r => {
      const reporte = config?.reportes?.find(rep => rep.clave === r);
      const nombreReporte = reporte?.nombre || r;
      // Generar nombre de archivo igual que en el backend
      const fechaStr = hoy.toISOString().split('T')[0].replace(/-/g, '');
      return `${nombreReporte}_${fechaStr}.xlsx`;
    });
    
    // Procesar cuerpo con variables - usar nombres reales de reportes
    const nombresReportesTexto = getNombresReportes(tpl.reportes || []);
    let cuerpo = (tpl.cuerpo_html || tpl.CUERPO_HTML || '')
      .replace(/{FECHA}/g, fecha)
      .replace(/{TIPO_REPORTE}/g, nombresReportesTexto)
      .replace(/{EMPRESA}/g, 'Ficohsa');
    
    // Procesar firma
    let firma = (tpl.firma_html || tpl.FIRMA_HTML || '')
      .replace(/{FECHA}/g, fecha);
    
    // Asunto procesado - usar nombres reales de reportes
    const asuntoRaw = tpl.asunto || tpl.ASUNTO || 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}';
    const asunto = asuntoRaw
      .replace(/{FECHA}/g, fecha)
      .replace(/{TIPO_REPORTE}/g, nombresReportesTexto)
      .replace(/{EMPRESA}/g, 'Ficohsa');
    
    // Imagen de firma - más grande (200px)
    let imagenHtml = '';
    const imgPath = tpl.imagen_firma_path || tpl.IMAGEN_FIRMA_PATH || imagenFirmaPreview;
    if (imgPath) {
      imagenHtml = `<div style="margin-top:30px;padding-top:20px;border-top:1px solid #e2e8f0;">
        <img src="${imgPath}" style="max-width:100%;max-height:200px;height:auto;display:block;" onerror="this.style.display='none'" />
      </div>`;
    }
    
    return `
      <div style="font-family:'Segoe UI',Arial,sans-serif;color:#333;max-width:700px;margin:0 auto;background:#fff;">
        <!-- Header del correo estilo Outlook -->
        <div style="background:#f8f9fa;border:1px solid #e2e8f0;border-radius:8px;padding:20px;margin-bottom:24px;">
          <table style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr>
              <td style="width:80px;color:#64748b;font-weight:600;vertical-align:top;padding:4px 0;">De:</td>
              <td style="padding:4px 0;">
                <strong>${emailConfig?.fromName || 'Soporte TalkMe'}</strong> 
                <span style="color:#64748b;">&lt;${emailConfig?.fromEmail || 'soporte@talkme.pro'}&gt;</span>
              </td>
            </tr>
            <tr>
              <td style="color:#64748b;font-weight:600;vertical-align:top;padding:4px 0;">Para:</td>
              <td style="padding:4px 0;">
                ${destPara.map(d => `<strong>${d.nombre || d.NOMBRE || d.email || d.EMAIL}</strong> <span style="color:#64748b;">&lt;${d.email || d.EMAIL}&gt;</span>`).join(', ') || '<span style="color:#94a3b8;">Sin destinatarios</span>'}
              </td>
            </tr>
            ${destCC.length > 0 ? `
            <tr>
              <td style="color:#64748b;font-weight:600;vertical-align:top;padding:4px 0;">CC:</td>
              <td style="padding:4px 0;">
                ${destCC.map(d => `<strong>${d.nombre || d.NOMBRE || d.email || d.EMAIL}</strong> <span style="color:#64748b;">&lt;${d.email || d.EMAIL}&gt;</span>`).join(', ')}
              </td>
            </tr>
            ` : ''}
            <tr>
              <td style="color:#64748b;font-weight:600;vertical-align:top;padding:4px 0;">Asunto:</td>
              <td style="padding:4px 0;font-weight:600;">${asunto}</td>
            </tr>
            <tr>
              <td style="color:#64748b;font-weight:600;vertical-align:top;padding:4px 0;">Adjuntos:</td>
              <td style="padding:4px 0;color:#64748b;">
                📎 ${reportesLista.length > 0 ? reportesLista.join(', ') : 'Sin reportes'}
              </td>
            </tr>
          </table>
        </div>
        
        <!-- Cuerpo del correo -->
        <div style="padding:0 10px;line-height:1.7;font-size:15px;color:#374151;">
          ${cuerpo}
        </div>
        
        <!-- Firma -->
        ${firma ? `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;font-size:14px;color:#4b5563;">${firma}</div>` : ''}
        
        <!-- Imagen de firma -->
        ${imagenHtml}
      </div>
    `;
  };

  // Función para seleccionar plantilla y cargar en editor (con detalles completos)
  const seleccionarPlantilla = async (template) => {
    // Cargar detalles completos desde el API
    try {
      const res = await fetchWithAuth(API_URLS.schedulerTemplate(template.ID_TEMPLATE));
      if (!res.ok) throw new Error('Error cargando plantilla');
      const templateCompleto = await res.json();
      
      setPlantillaSeleccionada(templateCompleto);
      setEditandoAsunto(templateCompleto.ASUNTO || '');
      setEditandoCuerpo(templateCompleto.CUERPO_HTML || '');
      setEditandoFirma(templateCompleto.FIRMA_HTML || '');
      setEditandoReportes(templateCompleto.reportes || []);
      setEditandoDestinatarios(templateCompleto.destinatarios?.map(d => ({
        id: d.id || d.ID_DEST,
        email: d.email || d.EMAIL,
        nombre: d.nombre || d.NOMBRE,
        tipo: d.tipo || d.TIPO
      })) || []);
      setModoEditor('visual');
      setImagenFirmaPreview(templateCompleto.IMAGEN_FIRMA_PATH || null);
      setNuevoPara({ email: '', nombre: '' });
      setNuevoCc({ email: '', nombre: '' });
      setNuevoCco({ email: '', nombre: '' });
    } catch (err) {
      toast.error('Error cargando detalles de la plantilla');
      console.error(err);
    }
  };

  // Función para crear nueva plantilla inline
  const nuevaPlantillaInline = () => {
    setPlantillaSeleccionada({
      ID_TEMPLATE: null, // null indica que es nueva
      NOMBRE_TEMPLATE: '',
      ASUNTO: 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}',
      CUERPO_HTML: '<p>Buenos días Estimados,</p>\n\n<p>Adjuntamos los reportes correspondientes al día <strong>{FECHA}</strong>:</p>\n\n<p>Quedamos atentos a sus comentarios.</p>\n\n<p>Saludos cordiales,</p>',
      FIRMA_HTML: '',
      IMAGEN_FIRMA_PATH: ''
    });
    setEditandoAsunto('Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}');
    setEditandoCuerpo('<p>Buenos días Estimados,</p>\n\n<p>Adjuntamos los reportes correspondientes al día <strong>{FECHA}</strong>:</p>\n\n<p>Quedamos atentos a sus comentarios.</p>\n\n<p>Saludos cordiales,</p>');
    setEditandoFirma('');
    setEditandoReportes([]);
    setEditandoDestinatarios([]);
    setImagenFirmaPreview(null);
    setNuevoPara({ email: '', nombre: '' });
    setNuevoCc({ email: '', nombre: '' });
    setNuevoCco({ email: '', nombre: '' });
    setModoEditor('visual');
    toast.info('Modo creación: Completa los campos y guarda');
  };

  // Función para guardar cambios de plantilla (crear o actualizar)
  const guardarCambiosPlantilla = async () => {
    if (!plantillaSeleccionada) return;
    
    // Validar nombre obligatorio
    if (!plantillaSeleccionada.NOMBRE_TEMPLATE?.trim()) {
      toast.error('El nombre de la plantilla es obligatorio');
      return;
    }
    
    setGuardandoCambios(true);
    try {
      // Usar ref para obtener destinatarios actuales (evita stale closure)
      const destinatariosActuales = destinatariosRef.current;
      
      const payload = {
        nombre: plantillaSeleccionada.NOMBRE_TEMPLATE,
        asunto: editandoAsunto,
        cuerpo_html: editandoCuerpo,
        firma_html: editandoFirma,
        imagen_firma_path: imagenFirmaPreview || '',
        reportes: editandoReportes,
        destinatarios: destinatariosActuales
      };
      
      // Detectar si es nueva (sin ID) o existente
      const esNueva = !plantillaSeleccionada.ID_TEMPLATE;
      const url = esNueva 
        ? API_URLS.schedulerCrearTemplate()
        : API_URLS.schedulerActualizarTemplate(plantillaSeleccionada.ID_TEMPLATE);
      const method = esNueva ? 'POST' : 'PUT';
      
      // Si es nueva, agregar id_job al payload
      if (esNueva) {
        payload.id_job = config.id_job;
      }
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Error ${res.status}: ${errorText || 'Error al guardar'}`);
      }
      
      const data = await res.json();
      
      if (esNueva) {
        toast.success(`✅ Plantilla creada con ${editandoDestinatarios.length} destinatarios`);
        // Recargar templates y seleccionar la nueva
        await cargarTemplates();
        // Buscar la plantilla recién creada por nombre y seleccionarla
        const nuevaPlantilla = data.id_template || data.ID_TEMPLATE;
        if (nuevaPlantilla) {
          // Cargar la plantilla completa recién creada
          const resNueva = await fetchWithAuth(API_URLS.schedulerTemplate(nuevaPlantilla));
          if (resNueva.ok) {
            const templateData = await resNueva.json();
            seleccionarPlantilla(templateData);
          }
        }
      } else {
        toast.success(`✅ Plantilla actualizada con ${editandoDestinatarios.length} destinatarios`);
        await cargarTemplates();
      }
    } catch (err) {
      console.error('ERROR COMPLETO:', err);
      toast.error('Error al guardar cambios: ' + err.message);
    } finally {
      setGuardandoCambios(false);
    }
  };

  // Funciones para manejar destinatarios - separados por tipo
  const agregarDestinatarioEdicion = (tipo) => {
    const estado = tipo === 'PARA' ? nuevoPara : tipo === 'CC' ? nuevoCc : nuevoCco;
    const setEstado = tipo === 'PARA' ? setNuevoPara : tipo === 'CC' ? setNuevoCc : setNuevoCco;
    
    
    if (!estado.email?.trim()) {
      return;
    }
    
    const newDest = {
      id: Date.now(), // ID temporal
      email: estado.email.trim(),
      nombre: estado.nombre?.trim() || '',
      tipo: tipo
    };
    
    
    setEditandoDestinatarios(prev => {
      const nuevos = [...prev, newDest];
      return nuevos;
    });
    setEstado({ email: '', nombre: '' });
  };
  
  const handleKeyPressDest = (e, tipo) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarDestinatarioEdicion(tipo);
    }
  };

  const eliminarDestinatarioEdicion = (id) => {
    setEditandoDestinatarios(prev => prev.filter(d => d.id !== id));
  };

  // Funciones para manejar reportes
  const toggleReporte = (clave) => {
    if (editandoReportes.includes(clave)) {
      setEditandoReportes(editandoReportes.filter(r => r !== clave));
    } else {
      setEditandoReportes([...editandoReportes, clave]);
    }
  };

  // Función para cargar imagen de firma
  const cargarImagenFirma = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      
      if (base64.length > 5 * 1024 * 1024) { // 5MB max
        toast.error('La imagen es muy grande. Máximo 5MB.');
        return;
      }
      
      setImagenFirmaPreview(base64);
      toast.success('✅ Imagen cargada correctamente');
    };
    reader.onerror = (err) => {
      console.error('[cargarImagenFirma] Error leyendo archivo:', err);
      toast.error('Error al leer la imagen');
    };
    reader.readAsDataURL(file);
  };

  const cargarConfig = (silencioso = false) => {
    if (!silencioso) setLoading(true);
    fetchWithAuth('http://localhost:3001/api/scheduler/config')
      .then(r => r.json()).then(data => {
        setConfig(data);
        if (!silencioso) setLoading(false);
      })
      .catch(() => {
        toast.error('Error cargando configuración del scheduler');
        if (!silencioso) setLoading(false);
      });
  };

  const cargarHistorial = () => {
    fetchWithAuth('http://localhost:3001/api/scheduler/log')
      .then(r => r.json()).then(setHistorial)
      .catch(() => toast.error('Error cargando historial'));
  };
  
  const cargarDestinatarios = () => {
    if (!config?.id_job) return;
    fetchWithAuth(API_URLS.schedulerDestinatarios(config.id_job))
      .then(r => r.json())
      .then(setDestinatarios)
      .catch(() => toast.error('Error cargando destinatarios'));
  };
  
  const cargarEmailConfig = () => {
    setEmailConfigLoading(true);
    fetchWithAuth(API_URLS.schedulerEmailConfig())
      .then(r => r.json())
      .then(data => {
        setEmailConfig(data);
        setEmailConfigLoading(false);
      })
      .catch(() => {
        toast.error('Error cargando configuración de email');
        setEmailConfigLoading(false);
      });
  };
  
  const probarEmailConfig = async (emailPrueba) => {
    if (!emailPrueba) {
      toast.error('Ingresa un email de prueba');
      return;
    }
    setEmailTestLoading(true);
    setEmailTestResult(null);
    try {
      const res = await fetchWithAuth(API_URLS.schedulerEmailProbar(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email_prueba: emailPrueba })
      });
      const data = await res.json();
      setEmailTestResult(data);
      if (data.ok) toast.success('Correo de prueba enviado correctamente');
      else toast.error(`Error: ${data.error}`);
    } catch (e) {
      toast.error('Error enviando correo de prueba');
    } finally {
      setEmailTestLoading(false);
    }
  };
  
  const agregarDestinatario = async () => {
    if (!nuevoEmail.email || !nuevoEmail.clave_reporte) {
      toast.error('Email y reporte son obligatorios');
      return;
    }
    setGuardandoDestinatario(true);
    try {
      const res = await fetchWithAuth(API_URLS.schedulerAgregarDestinatario(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_job: config.id_job,
          clave_reporte: nuevoEmail.clave_reporte,
          email: nuevoEmail.email,
          nombre: nuevoEmail.nombre,
          tipo: nuevoEmail.tipo
        })
      });
      if (res.ok) {
        toast.success('Destinatario agregado');
        setNuevoEmail({ email: '', nombre: '', clave_reporte: '', tipo: 'PARA' });
        cargarDestinatarios();
      } else throw new Error('Error al agregar');
    } catch (e) {
      toast.error('Error al agregar destinatario');
    } finally {
      setGuardandoDestinatario(false);
    }
  };
  
  const eliminarDestinatario = async (idEmail) => {
    if (!confirm('¿Eliminar este destinatario?')) return;
    try {
      const res = await fetchWithAuth(API_URLS.schedulerEliminarDestinatario(idEmail), { method: 'DELETE' });
      if (res.ok) {
        toast.success('Destinatario eliminado');
        cargarDestinatarios();
      } else throw new Error('Error al eliminar');
    } catch (e) {
      toast.error('Error al eliminar destinatario');
    }
  };
  
  // Funciones para plantillas de correo
  const cargarTemplates = () => {
    if (!config?.id_job) return;
    fetchWithAuth(API_URLS.schedulerTemplates(config.id_job))
      .then(r => r.json())
      .then(setTemplates)
      .catch(() => toast.error('Error cargando plantillas'));
  };
  
  const guardarTemplate = async () => {
    if (!templateActual?.nombre || !templateActual?.asunto) {
      toast.error('Nombre y asunto son obligatorios');
      return;
    }
    setGuardandoTemplate(true);
    try {
      const url = templateActual.id_template 
        ? API_URLS.schedulerActualizarTemplate(templateActual.id_template)
        : API_URLS.schedulerCrearTemplate();
      const method = templateActual.id_template ? 'PUT' : 'POST';
      
      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_job: config.id_job,
          nombre: templateActual.nombre,
          asunto: templateActual.asunto,
          cuerpo_html: templateActual.cuerpo_html || '',
          firma_html: templateActual.firma_html || '',
          imagen_firma_path: templateActual.imagen_firma_path || '',
          reportes: templateActual.reportes || [],
          destinatarios: templateActual.destinatarios || []
        })
      });
      
      if (res.ok) {
        toast.success(templateActual.id_template ? 'Plantilla actualizada' : 'Plantilla creada');
        setModalTemplate(false);
        setTemplateActual(null);
        cargarTemplates();
      } else throw new Error('Error al guardar');
    } catch (e) {
      toast.error('Error al guardar plantilla');
    } finally {
      setGuardandoTemplate(false);
    }
  };
  
  const eliminarTemplate = async (idTemplate) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      const res = await fetchWithAuth(API_URLS.schedulerEliminarTemplate(idTemplate), { method: 'DELETE' });
      if (res.ok) {
        toast.success('Plantilla eliminada');
        cargarTemplates();
      } else throw new Error('Error al eliminar');
    } catch (e) {
      toast.error('Error al eliminar plantilla');
    }
  };
  
  const abrirModalTemplate = (template = null) => {
    if (template) {
      // Cargar template completo para editar
      fetchWithAuth(API_URLS.schedulerTemplate(template.ID_TEMPLATE))
        .then(r => r.json())
        .then(data => {
          setTemplateActual({
            id_template: data.ID_TEMPLATE,
            nombre: data.NOMBRE_TEMPLATE,
            asunto: data.ASUNTO,
            cuerpo_html: data.CUERPO_HTML || '',
            firma_html: data.FIRMA_HTML || '',
            imagen_firma_path: data.IMAGEN_FIRMA_PATH || '',
            reportes: data.reportes || [],
            destinatarios: data.destinatarios || []
          });
          setModalTemplate(true);
        })
        .catch(() => toast.error('Error cargando plantilla'));
    } else {
      // Nueva plantilla
      setTemplateActual({
        nombre: '',
        asunto: 'Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}',
        cuerpo_html: '<p>Buenos días Estimados,</p><p>Adjuntamos los siguientes reportes correspondientes al día <strong>{FECHA}</strong>:</p><ul><li>📊 Reporte de Operaciones</li><li>📊 Reporte de Resoluciones</li></ul><p>Quedamos atentos a sus comentarios o dudas.</p><p>Saludos cordiales</p>',
        firma_html: '<div style="margin-top:20px;"><img src="cid:firma-image" style="max-width:600px;" /></div>',
        imagen_firma_path: emailConfig?.imagenFirmaPath || '',
        reportes: [],
        destinatarios: []
      });
      setModalTemplate(true);
    }
  };
  
  const agregarDestinatarioTemplate = () => {
    if (!nuevoDestinatarioTemplate.email) {
      toast.error('Ingresa un email');
      return;
    }
    setTemplateActual(prev => ({
      ...prev,
      destinatarios: [...(prev.destinatarios || []), { ...nuevoDestinatarioTemplate }]
    }));
    setNuevoDestinatarioTemplate({ email: '', nombre: '', tipo: 'PARA' });
  };
  
  const eliminarDestinatarioTemplate = (index) => {
    setTemplateActual(prev => ({
      ...prev,
      destinatarios: prev.destinatarios.filter((_, i) => i !== index)
    }));
  };

  useEffect(() => { cargarConfig(); }, []);
  useEffect(() => { if (tab === 'historial') cargarHistorial(); }, [tab]);
  useEffect(() => { 
    if (tab === 'email' && config?.id_job) {
      cargarDestinatarios();
      cargarEmailConfig();
      cargarTemplates();
    }
  }, [tab, config?.id_job]);

  // Seleccionar primera plantilla automáticamente cuando se carguen las templates
  useEffect(() => {
    if (tab === 'email' && templates.length > 0 && !plantillaSeleccionada) {
      seleccionarPlantilla(templates[0]);
    }
  }, [tab, templates, plantillaSeleccionada]);

  const guardar = async () => {
    setGuardando(true);
    try {
      const res = await fetchWithAuth('http://localhost:3001/api/scheduler/config', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config)
      });
      const data = await res.json();
      if (data.ok) {
        data.activo
          ? toast.success(`✅ Scheduler activo — ${config.hora} hora Guatemala`)
          : toast.info('💾 Configuración guardada. Scheduler desactivado.');
      } else toast.error(data.error || 'Error al guardar');
    } catch { toast.error('Error al guardar'); }
    finally { setGuardando(false); }
  };

  const eliminarReporte = async (clave) => {
    setEliminando(clave);
    try {
      await fetchWithAuth(`http://localhost:3001/api/scheduler/reporte/${clave}`, { method: 'DELETE' });
      toast.success('Reporte eliminado');
      
      // Auditoría de eliminar reporte automático
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'DELETE',
          entidad: 'DESCARGAS_AUTO',
          metadata: { clave },
          descripcion: `Eliminado reporte automático: ${clave}`
        });
      });

      cargarConfig(true);
    } catch { toast.error('Error al eliminar'); }
    finally { setEliminando(null); }
  };

  const setReporte = (clave, campo, valor) => {
    setConfig(prev => ({ ...prev, reportes: prev.reportes.map(r => r.clave === clave ? { ...r, [campo]: valor } : r) }));
  };

  const reintentarReporte = async (id_log) => {
    setReintentando(id_log);
    try {
      const res = await fetchWithAuth('http://localhost:3001/api/scheduler/reintentar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_log })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error al reintentar');
      }

      toast.success(`✅ ${data.message}`);
      
      // Actualizar el historial para reflejar el reintento
      await cargarHistorial();
      
      // Auditoría de reintento
      import('../../services/auditoriaService').then(({ registrarLog }) => {
        registrarLog({
          tipo_accion: 'REINTENTAR',
          entidad: 'DESCARGAS_AUTO',
          metadata: { id_log, resultado: data },
          descripcion: `Reintentado reporte automático ID_LOG=${id_log}: ${data.registros} registros`
        });
      });
      
    } catch (e) {
      toast.error(`❌ Error al reintentar: ${e.message}`);
    } finally {
      setReintentando(null);
    }
  };

  const formatFecha = (fecha) => {
    if (!fecha) return '';
    const [yyyy, mm, dd] = fecha.split('-');
    const meses = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${dd} ${meses[parseInt(mm,10)-1]} ${yyyy}`;
  };

  const formatTs = (ts) => {
    if (!ts) return '—';
    // MySQL devuelve "2026-05-06 10:00:00" ya en hora Guatemala (hora local del servidor)
    // Parsear directamente los componentes sin conversión de zona
    const str = String(ts).replace('T', ' ').replace('Z', '');
    const [datePart, timePart] = str.split(' ');
    if (!datePart || !timePart) return str;
    const [yyyy, mm, dd] = datePart.split('-');
    const [hh, min] = timePart.split(':');
    const h = parseInt(hh, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${dd}/${mm}/${yyyy} ${String(h12).padStart(2,'0')}:${min} ${ampm}`;
  };

  // Agrupar historial por FECHA_EJECUCION
  const historialAgrupado = historial.reduce((acc, h) => {
    const f = h.FECHA_EJECUCION;
    if (!acc[f]) acc[f] = [];
    acc[f].push(h);
    return acc;
  }, {});

  if (loading) return <div className="ci-state-center"><div className="ci-spinner" /><p>Cargando configuración...</p></div>;
  if (!config) return null;

  return (
    <div className="ci-ra-root">
      {modalAgregar && <ModalAgregarReporte onClose={() => setModalAgregar(false)} onAgregado={() => cargarConfig(true)} />}
      {editando   && <ModalAgregarReporte reporteInicial={editando} onClose={() => setEditando(null)} onAgregado={() => cargarConfig(true)} />}

      {/* ── HEADER ── */}
      <div className="ci-ra-header">
        <div className="ci-ra-header-left">
          <span className="ci-ra-header-icon">⏰</span>
          <div>
            <h2 className="ci-ra-header-titulo">Reportes Automáticos</h2>
            <p className="ci-ra-header-sub">Generación diaria automática — datos del día anterior</p>
          </div>
        </div>
        <div className="ci-ra-header-right">
          <div className={`ci-ra-status-badge ${config.activo ? 'activo' : 'inactivo'}`}>
            <span className="ci-ra-status-dot" />
            {config.activo ? `Activo · ${config.hora} GT` : 'Desactivado'}
          </div>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="ci-ra-tabs">
        <button className={`ci-ra-tab ${tab === 'config' ? 'active' : ''}`} onClick={() => setTab('config')}>⚙️ Configuración</button>
        <button className={`ci-ra-tab ${tab === 'email' ? 'active' : ''}`} onClick={() => setTab('email')}>📧 Email</button>
        <button className={`ci-ra-tab ${tab === 'historial' ? 'active' : ''}`} onClick={() => setTab('historial')}>📋 Historial</button>
      </div>

      {/* ══ TAB: CONFIGURACIÓN ══ */}
      {tab === 'config' && (
        <div className="ci-ra-config-layout">

          {/* Panel izquierdo: hora + estado */}
          <div className="ci-ra-config-side">
            <div className="ci-ra-side-card">
              <p className="ci-ra-side-title">⏱ Programación</p>
              <div className="ci-ra-side-row">
                <label>Hora (GT)</label>
                <input type="time" className="ci-ra-input" value={config.hora}
                  onChange={e => setConfig({ ...config, hora: e.target.value })} />
              </div>
              <div className="ci-ra-side-row">
                <label>Estado</label>
                <button className={`ci-ra-toggle ${config.activo ? 'activo' : 'inactivo'}`}
                  onClick={() => setConfig({ ...config, activo: !config.activo })}>
                  {config.activo ? '✅ Activo' : '⏸ Inactivo'}
                </button>
              </div>
              <div className="ci-ra-side-actions">
                <button className="ci-ra-btn-save" onClick={guardar} disabled={guardando}>
                  {guardando ? '⏳ Guardando...' : '💾 Guardar programación'}
                </button>
              </div>
            </div>

          </div>

          {/* Panel derecho: lista de reportes */}
          <div className="ci-ra-config-main">
            <div className="ci-ra-reportes-header">
              <span className="ci-ra-reportes-titulo">Reportes configurados <span className="ci-ra-count">{config.reportes.length}</span></span>
              <button className="ci-ra-btn-add" onClick={() => setModalAgregar(true)}>➕ Agregar reporte</button>
            </div>

            {config.reportes.length === 0 && (
              <div className="ci-ra-empty">
                <p>No hay reportes configurados.</p>
                <p>Haz clic en <strong>➕ Agregar reporte</strong> para comenzar.</p>
              </div>
            )}

            {config.reportes.map(rep => {
              const tipoInfo = TIPOS_REPORTE.find(t => t.value === rep.tipo_reporte);
              const fmtBadge = FORMATO_BADGE[tipoInfo?.formato || 'xlsx'];
              return (
                <div key={rep.clave} className={`ci-ra-rep-card ${rep.activo ? '' : 'inactiva'}`}>
                  <div className="ci-ra-rep-top">
                    <div className="ci-ra-rep-info">
                      <span className={`ci-ra-fmt-badge ${fmtBadge.cls}`}>{fmtBadge.label}</span>
                      <span className="ci-ra-rep-nombre">{rep.nombre}</span>
                    </div>
                    <div className="ci-ra-rep-actions">
                      <button
                        className={`ci-ra-toggle-small ${rep.activo ? 'activo' : 'inactivo'}`}
                        onClick={() => setReporte(rep.clave, 'activo', !rep.activo)}>
                        {rep.activo ? 'Activo' : 'Inactivo'}
                      </button>
                      <button className="ci-ra-btn-edit" onClick={() => setEditando(rep)} title="Editar filtros">✏️</button>
                      <button className="ci-ra-btn-del"
                        onClick={() => eliminarReporte(rep.clave)}
                        disabled={eliminando === rep.clave}
                        title="Eliminar reporte">
                        {eliminando === rep.clave ? '⏳' : '🗑'}
                      </button>
                    </div>
                  </div>
                  <div className="ci-ra-rep-meta">
                    <span className="ci-ra-rep-meta-item">🗄 {DB_NAMES_SCH[rep.db_key] || rep.db_key}</span>
                    <span className="ci-ra-rep-meta-sep">·</span>
                    <span className="ci-ra-rep-meta-item">🏢 Empresa {rep.id_empresa}</span>
                    <span className="ci-ra-rep-meta-sep">·</span>
                    <span className="ci-ra-rep-meta-item">📊 {tipoInfo?.label || rep.tipo_reporte}</span>
                  </div>
                  <div className="ci-ra-rep-carpeta">
                    <span className="ci-ra-rep-carpeta-icon">📁</span>
                    <input type="text" className="ci-ra-input ci-ra-input-wide"
                      value={rep.carpeta || ''}
                      onChange={e => setReporte(rep.clave, 'carpeta', e.target.value)}
                      placeholder="Carpeta destino..." />
                    <button className="ci-ra-btn-browse-sm" title="Explorar carpetas"
                      onClick={async () => {
                        const ruta = await elegirCarpeta();
                        if (ruta) setReporte(rep.clave, 'carpeta', ruta);
                      }}>
                      📂
                    </button>
                  </div>
                </div>
              );
            })}

          </div>
        </div>
      )}

      {/* ══ TAB: EMAIL V2 - OUTLOOK STYLE ══ */}
      {tab === 'email' && (
        <div className="ci-ra-email-v2-root">
          {/* Header */}
          <div className="ci-ra-email-v2-header">
            <div className="ci-ra-email-v2-header-left">
              <div className="ci-ra-email-v2-icon">📧</div>
              <div className="ci-ra-email-v2-selector">
                <label>Plantilla de Email</label>
                <select 
                  className="ci-ra-email-v2-select"
                  value={plantillaSeleccionada?.ID_TEMPLATE || ''}
                  onChange={(e) => {
                    const selected = templates.find(t => t.ID_TEMPLATE === parseInt(e.target.value));
                    if (selected) seleccionarPlantilla(selected);
                  }}
                >
                  <option value="" disabled={!plantillaSeleccionada?.ID_TEMPLATE}>
                    {plantillaSeleccionada?.ID_TEMPLATE ? '-- Seleccionar otra --' : '-- Nueva plantilla --'}
                  </option>
                  {templates.map(t => (
                    <option key={t.ID_TEMPLATE} value={t.ID_TEMPLATE}>
                      {t.NOMBRE_TEMPLATE} ({t.CANT_DESTINATARIOS || 0} destinatarios)
                    </option>
                  ))}
                </select>
              </div>
              {/* Nombre de plantilla editable */}
              {plantillaSeleccionada && (
                <div className="ci-ra-email-v2-nombre-input">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={plantillaSeleccionada.NOMBRE_TEMPLATE || ''}
                    onChange={(e) => setPlantillaSeleccionada({
                      ...plantillaSeleccionada,
                      NOMBRE_TEMPLATE: e.target.value
                    })}
                    placeholder="Nombre de la plantilla..."
                    className="ci-ra-email-v2-input-nombre"
                  />
                </div>
              )}
            </div>
            <div className="ci-ra-email-v2-actions">
              <button 
                className="ci-ra-btn-v2-secondary"
                onClick={nuevaPlantillaInline}
              >
                ➕ Nueva
              </button>
              {plantillaSeleccionada && (
                <button 
                  className="ci-ra-btn-v2-primary"
                  onClick={guardarCambiosPlantilla}
                  disabled={guardandoCambios}
                >
                  💾 {guardandoCambios ? 'Guardando...' : 'Guardar'}
                </button>
              )}
            </div>
          </div>

          {/* Content: 2 columns */}
          {plantillaSeleccionada ? (
            <div className="ci-ra-email-v2-content">
              {/* Left: Editor */}
              <div className="ci-ra-email-v2-editor">
                <div className="ci-ra-email-v2-editor-content">
                  {/* De */}
                  <div className="ci-ra-email-v2-field">
                    <label className="ci-ra-email-v2-field-label">De</label>
                    <div className="ci-ra-email-v2-from-box">
                      <span className="ci-ra-email-v2-from-name">{emailConfig?.fromName || 'Soporte TalkMe'}</span>
                      <span className="ci-ra-email-v2-from-email">&lt;{emailConfig?.fromEmail || 'soporte@talkme.pro'}&gt;</span>
                    </div>
                  </div>

                  {/* Destinatarios */}
                  <div className="ci-ra-email-v2-dest-section">
                    {/* PARA */}
                    <div className="ci-ra-email-v2-dest-row">
                      <label className="ci-ra-email-v2-dest-label">Para</label>
                      <div className="ci-ra-email-v2-dest-input-wrapper">
                        <div className="ci-ra-email-v2-recipients-container">
                          {editandoDestinatarios.filter(d => d.tipo === 'PARA').map((d) => (
                            <span key={d.id} className="ci-ra-email-v2-chip ci-ra-email-v2-chip-para">
                              <span className="ci-ra-email-v2-chip-name">{d.nombre || d.email}</span>
                              <span className="ci-ra-email-v2-chip-email">&lt;{d.email}&gt;</span>
                              <button 
                                className="ci-ra-email-v2-chip-remove"
                                onClick={() => eliminarDestinatarioEdicion(d.id)}
                                title="Eliminar"
                              >×</button>
                            </span>
                          ))}
                          <input
                            type="email"
                            className="ci-ra-email-v2-chip-input"
                            placeholder="Agregar email..."
                            value={nuevoPara.email}
                            onChange={(e) => setNuevoPara({...nuevoPara, email: e.target.value})}
                            onKeyPress={(e) => handleKeyPressDest(e, 'PARA')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* CC */}
                    <div className="ci-ra-email-v2-dest-row">
                      <label className="ci-ra-email-v2-dest-label">CC</label>
                      <div className="ci-ra-email-v2-dest-input-wrapper">
                        <div className="ci-ra-email-v2-recipients-container">
                          {editandoDestinatarios.filter(d => d.tipo === 'CC').map((d) => (
                            <span key={d.id} className="ci-ra-email-v2-chip ci-ra-email-v2-chip-cc">
                              <span className="ci-ra-email-v2-chip-name">{d.nombre || d.email}</span>
                              <span className="ci-ra-email-v2-chip-email">&lt;{d.email}&gt;</span>
                              <button 
                                className="ci-ra-email-v2-chip-remove"
                                onClick={() => eliminarDestinatarioEdicion(d.id)}
                                title="Eliminar"
                              >×</button>
                            </span>
                          ))}
                          <input
                            type="email"
                            className="ci-ra-email-v2-chip-input"
                            placeholder="Agregar CC..."
                            value={nuevoCc.email}
                            onChange={(e) => setNuevoCc({...nuevoCc, email: e.target.value})}
                            onKeyPress={(e) => handleKeyPressDest(e, 'CC')}
                          />
                        </div>
                      </div>
                    </div>

                    {/* CCO */}
                    <div className="ci-ra-email-v2-dest-row">
                      <label className="ci-ra-email-v2-dest-label">CCO</label>
                      <div className="ci-ra-email-v2-dest-input-wrapper">
                        <div className="ci-ra-email-v2-recipients-container">
                          {editandoDestinatarios.filter(d => d.tipo === 'CCO').map((d) => (
                            <span key={d.id} className="ci-ra-email-v2-chip ci-ra-email-v2-chip-cco">
                              <span className="ci-ra-email-v2-chip-name">{d.nombre || d.email}</span>
                              <span className="ci-ra-email-v2-chip-email">&lt;{d.email}&gt;</span>
                              <button 
                                className="ci-ra-email-v2-chip-remove"
                                onClick={() => eliminarDestinatarioEdicion(d.id)}
                                title="Eliminar"
                              >×</button>
                            </span>
                          ))}
                          <input
                            type="email"
                            className="ci-ra-email-v2-chip-input"
                            placeholder="Agregar CCO..."
                            value={nuevoCco.email}
                            onChange={(e) => setNuevoCco({...nuevoCco, email: e.target.value})}
                            onKeyPress={(e) => handleKeyPressDest(e, 'CCO')}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Asunto */}
                  <div className="ci-ra-email-v2-field">
                    <label className="ci-ra-email-v2-field-label">Asunto</label>
                    <input
                      type="text"
                      className="ci-ra-email-v2-input"
                      value={editandoAsunto}
                      onChange={(e) => setEditandoAsunto(e.target.value)}
                      placeholder="Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}"
                    />
                  </div>

                  {/* Reportes adjuntos - solo mostrar activos */}
                  <div className="ci-ra-email-v2-attachments">
                    <div className="ci-ra-email-v2-attachments-header">
                      <label className="ci-ra-email-v2-field-label">📎 Reportes Adjuntos</label>
                      <span className="ci-ra-email-v2-attachments-count">
                        {editandoReportes.length} seleccionados • {config?.reportes?.filter(r => r.activo).length || 0} disponibles
                      </span>
                    </div>
                    <div className="ci-ra-email-v2-attachments-grid">
                      {config?.reportes?.filter(r => r.activo).map(r => (
                        <label 
                          key={r.clave} 
                          className={`ci-ra-email-v2-attachment-item ${editandoReportes.includes(r.clave) ? 'selected' : ''}`}
                          title={r.descripcion || r.nombre}
                        >
                          <input
                            type="checkbox"
                            checked={editandoReportes.includes(r.clave)}
                            onChange={() => toggleReporte(r.clave)}
                          />
                          <span className="ci-ra-email-v2-attachment-name">{r.nombre}</span>
                          <span className="ci-ra-email-v2-attachment-status active">●</span>
                        </label>
                      ))}
                    </div>
                    {/* Mostrar reportes inactivos seleccionados previamente como deshabilitados */}
                    {editandoReportes.some(clave => {
                      const rep = config?.reportes?.find(r => r.clave === clave);
                      return rep && !rep.activo;
                    }) && (
                      <div className="ci-ra-email-v2-attachments-inactivos">
                        <div className="ci-ra-email-v2-attachments-inactivos-title">⚠️ Reportes inactivos (no se enviarán):</div>
                        <div className="ci-ra-email-v2-attachments-grid">
                          {editandoReportes.filter(clave => {
                            const rep = config?.reportes?.find(r => r.clave === clave);
                            return rep && !rep.activo;
                          }).map(clave => {
                            const r = config?.reportes?.find(r => r.clave === clave);
                            return (
                              <label 
                                key={r.clave} 
                                className="ci-ra-email-v2-attachment-item inactive"
                              >
                                <input type="checkbox" checked={true} disabled />
                                <span className="ci-ra-email-v2-attachment-name">{r.nombre}</span>
                                <span className="ci-ra-email-v2-attachment-status inactive">● Inactivo</span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cuerpo del correo */}
                  <div className="ci-ra-email-v2-field">
                    <label className="ci-ra-email-v2-field-label">📝 Cuerpo del Correo</label>
                    <div className="ci-ra-email-v2-body-section">
                      <div className="ci-ra-email-v2-toolbar">
                        <button className="ci-ra-email-v2-toolbar-btn" onClick={() => document.execCommand('bold')}>B</button>
                        <button className="ci-ra-email-v2-toolbar-btn" onClick={() => document.execCommand('italic')}>I</button>
                        <button className="ci-ra-email-v2-toolbar-btn" onClick={() => document.execCommand('underline')}>U</button>
                        <span className="ci-ra-email-v2-toolbar-sep"></span>
                        <div className="ci-ra-email-v2-toolbar-vars">
                          <button className="ci-ra-email-v2-toolbar-var" onClick={() => setEditandoCuerpo(editandoCuerpo + '{FECHA}')}>{'{FECHA}'}</button>
                          <button className="ci-ra-email-v2-toolbar-var" onClick={() => setEditandoCuerpo(editandoCuerpo + '{TIPO_REPORTE}')}>{'{TIPO}'}</button>
                          <button className="ci-ra-email-v2-toolbar-var" onClick={() => setEditandoCuerpo(editandoCuerpo + '{EMPRESA}')}>{'{EMPRESA}'}</button>
                        </div>
                      </div>
                      <textarea
                        className="ci-ra-email-v2-textarea"
                        value={editandoCuerpo}
                        onChange={(e) => setEditandoCuerpo(e.target.value)}
                        placeholder="Escribe el cuerpo del correo..."
                        rows={8}
                      />
                    </div>
                  </div>

                  {/* Firma */}
                  <div className="ci-ra-email-v2-signature">
                    <div className="ci-ra-email-v2-signature-header">
                      <label className="ci-ra-email-v2-field-label">✒️ Firma (Imagen)</label>
                    </div>
                    <div className="ci-ra-email-v2-signature-upload">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={cargarImagenFirma}
                        className="ci-ra-email-v2-file-input"
                      />
                      <input
                        type="text"
                        className="ci-ra-email-v2-input"
                        style={{ flex: 1, minWidth: '150px' }}
                        value={imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH || ''}
                        onChange={(e) => setImagenFirmaPreview(e.target.value)}
                        placeholder="O ruta de imagen..."
                      />
                      {(imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH) && (
                        <button
                          className="ci-ra-btn-v2-icon"
                          onClick={() => setImagenFirmaPreview('')}
                          title="Quitar imagen"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                    {(imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH) && (
                      <div className="ci-ra-email-v2-signature-preview">
                        {(() => {
                          const imgSrc = imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH;
                          const esBase64 = imgSrc?.startsWith('data:image');
                          
                          // Detectar base64 truncado
                          if (esBase64 && imgSrc.length < 100) {
                            return (
                              <div style={{padding:'8px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:'6px',fontSize:'11px',color:'#dc2626'}}>
                                ⚠️ <strong>Imagen truncada</strong><br/>
                                La imagen fue truncada al guardar (solo {imgSrc.length} caracteres).<br/>
                                <strong>Solución:</strong> Ejecuta en MySQL:<br/>
                                <code style={{background:'#fff',padding:'2px 4px',borderRadius:'3px'}}>
                                  ALTER TABLE SCHEDULER_EMAIL_TEMPLATES MODIFY IMAGEN_FIRMA_PATH LONGTEXT;
                                </code>
                              </div>
                            );
                          }
                          
                          return (
                            <img
                              src={imgSrc}
                              alt="Firma"
                              className="ci-ra-email-v2-signature-img"
                              onError={(e) => { 
                                e.target.style.display = 'none'; 
                                e.target.parentElement.innerHTML = '<span style="color:#dc2626;font-size:12px;">⚠️ Error mostrando imagen</span>';
                              }}
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Preview */}
              <div className="ci-ra-email-v2-preview">
                <div className="ci-ra-email-v2-preview-header">
                  <span className="ci-ra-email-v2-preview-title">👁️ Vista Previa</span>
                </div>
                <div className="ci-ra-email-v2-preview-content">
                  <div className="ci-ra-email-v2-preview-frame">
                    {/* Email Header */}
                    <div className="ci-ra-email-v2-preview-email-header">
                      <div className="ci-ra-email-v2-preview-field">
                        <span className="ci-ra-email-v2-preview-label">De:</span>
                        <span className="ci-ra-email-v2-preview-value">
                          <span className="ci-ra-email-v2-preview-value-strong">{emailConfig?.fromName || 'Soporte TalkMe'}</span>
                          <span className="ci-ra-email-v2-preview-value-muted"> &lt;{emailConfig?.fromEmail || 'soporte@talkme.pro'}&gt;</span>
                        </span>
                      </div>
                      <div className="ci-ra-email-v2-preview-field">
                        <span className="ci-ra-email-v2-preview-label">Para:</span>
                        <span className="ci-ra-email-v2-preview-value">
                          {editandoDestinatarios.filter(d => d.tipo === 'PARA').length > 0 
                            ? editandoDestinatarios.filter(d => d.tipo === 'PARA').map(d => (
                              <span key={d.id}>
                                <span className="ci-ra-email-v2-preview-value-strong">{d.nombre || d.email}</span>
                                <span className="ci-ra-email-v2-preview-value-muted"> &lt;{d.email}&gt;</span>
                                {', '}
                              </span>
                            ))
                            : <span className="ci-ra-email-v2-preview-value-muted">Sin destinatarios</span>
                          }
                        </span>
                      </div>
                      {editandoDestinatarios.filter(d => d.tipo === 'CC').length > 0 && (
                        <div className="ci-ra-email-v2-preview-field">
                          <span className="ci-ra-email-v2-preview-label">CC:</span>
                          <span className="ci-ra-email-v2-preview-value">
                            {editandoDestinatarios.filter(d => d.tipo === 'CC').map(d => (
                              <span key={d.id}>
                                <span className="ci-ra-email-v2-preview-value-strong">{d.nombre || d.email}</span>
                                <span className="ci-ra-email-v2-preview-value-muted"> &lt;{d.email}&gt;</span>
                                {', '}
                              </span>
                            ))}
                          </span>
                        </div>
                      )}
                      <div className="ci-ra-email-v2-preview-field">
                        <span className="ci-ra-email-v2-preview-label">Asunto:</span>
                        <span className="ci-ra-email-v2-preview-value ci-ra-email-v2-preview-subject">
                          {(() => {
                            const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                            const nombresReportes = getNombresReportes(editandoReportes);
                            return editandoAsunto
                              .replace(/{FECHA}/g, hoy)
                              .replace(/{TIPO_REPORTE}/g, nombresReportes)
                              .replace(/{EMPRESA}/g, 'Empresa');
                          })()}
                        </span>
                      </div>
                      {editandoReportes.length > 0 && (
                        <div className="ci-ra-email-v2-preview-field">
                          <span className="ci-ra-email-v2-preview-label">Adjuntos:</span>
                          <span className="ci-ra-email-v2-preview-attachments">
                            {editandoReportes.map(clave => {
                              const reporte = config?.reportes?.find(r => r.clave === clave);
                              return (
                                <span key={clave} className="ci-ra-email-v2-preview-attachment-tag">
                                  📎 {reporte?.nombre || clave}
                                </span>
                              );
                            })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Email Body */}
                    <div 
                      className="ci-ra-email-v2-preview-body"
                      dangerouslySetInnerHTML={{ 
                        __html: (() => {
                          const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                          const nombresReportes = getNombresReportes(editandoReportes);
                          return editandoCuerpo
                            .replace(/\n/g, '<br>') // Convertir saltos de línea a <br>
                            .replace(/{FECHA}/g, hoy)
                            .replace(/{TIPO_REPORTE}/g, nombresReportes)
                            .replace(/{EMPRESA}/g, 'Empresa');
                        })()
                      }}
                    />

                    {/* Firma */}
                    {(imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH) && (
                      <div className="ci-ra-email-v2-preview-signature">
                        {(() => {
                          const imgSrc = imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH;
                          const esBase64 = imgSrc?.startsWith('data:image');
                          const esUrl = imgSrc?.startsWith('http') || imgSrc?.startsWith('/');
                          const esRutaLocal = !esBase64 && !esUrl && imgSrc?.length > 0;
                          
                          
                          // Validar base64
                          if (esBase64 && imgSrc.length < 100) {
                            return (
                              <span style={{color:'#dc2626',fontSize:'12px'}}>
                                ⚠️ Base64 truncado ({imgSrc.length} chars). Ejecuta: ALTER TABLE SCHEDULER_EMAIL_TEMPLATES MODIFY IMAGEN_FIRMA_PATH TEXT;
                              </span>
                            );
                          }
                          
                          return (
                            <img
                              src={imgSrc}
                              alt="Firma"
                              style={{ maxWidth: '100%', maxHeight: '200px' }}
                              onError={(e) => { 
                                const errorMsg = esRutaLocal 
                                  ? '⚠️ Ruta local no accesible desde el navegador' 
                                  : esBase64 
                                    ? '⚠️ Base64 inválido o truncado' 
                                    : '⚠️ Error cargando imagen';
                                console.error('[Preview] Error:', errorMsg, imgSrc?.substring(0, 100));
                                e.target.style.display = 'none'; 
                                e.target.parentElement.innerHTML = `<span style="color:#dc2626;font-size:11px;">${errorMsg}</span>`;
                              }}
                            />
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="ci-ra-email-v2-empty">
              <div className="ci-ra-email-v2-empty-icon">📧</div>
              <div className="ci-ra-email-v2-empty-title">No hay plantillas configuradas</div>
              <div className="ci-ra-email-v2-empty-desc">Crea una plantilla para comenzar a configurar emails automáticos</div>
              <button 
                className="ci-ra-btn-v2-primary"
                onClick={nuevaPlantillaInline}
              >
                ➕ Crear Plantilla
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: HISTORIAL ══ */}
      {tab === 'historial' && (() => {
        const totalPags = Math.max(1, Math.ceil(historial.length / ROWS_PER_PAGE));
        const pagSegura = Math.min(histPagina, totalPags);
        const filas = historial.slice((pagSegura - 1) * ROWS_PER_PAGE, pagSegura * ROWS_PER_PAGE);
        const getTipoLabel = (tipo) => ({
          detallado:'Operaciones', resumido:'Resoluciones', grupoq:'Grupo Q',
          broadcast:'Broadcast', apinotif:'API Notificaciones', respuestas:'Respuestas',
          campaniasrep:'Campañas', resolpalabra:'Resol. Palabra', numerosactivos:'Núm. Activos'
        }[tipo] || tipo);
        return (
          <div className="ci-ra-hist-root">

            {historial.length === 0 ? (
              <div className="ci-ra-hist-empty">
                <span>📭</span>
                <p>Sin ejecuciones registradas aún.</p>
              </div>
            ) : (
              <>
                <div className="ci-ra-hist-table-wrap">
                  <table className="ci-ra-hist-table">
                    <colgroup>
                      <col style={{width:'48px'}} />
                      <col style={{width:'150px'}} />
                      <col style={{width:'20%'}} />
                      <col />
                      <col style={{width:'90px'}} />
                      <col style={{width:'155px'}} />
                      <col style={{width:'100px'}} />
                    </colgroup>
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Tipo</th>
                        <th>Reporte</th>
                        <th>Archivo</th>
                        <th style={{textAlign:'right'}}>Registros</th>
                        <th>Fecha ejecución</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filas.map(h => {
                        const tipoFromLog = h.TIPO || h.TIPO_REPORTE;
                        const tipoLabel = getTipoLabel(tipoFromLog) || tipoFromLog || '—';
                        const nombreArchivo = h.ARCHIVO ? h.ARCHIVO.split(/[\/\\]/).pop() : null;
                        return (
                          <tr key={h.ID_LOG} className={h.OK ? 'ci-ra-ht-ok' : 'ci-ra-ht-err'}>
                            <td className="ci-ra-ht-status">
                              {h.OK
                                ? <span className="ci-ra-ht-badge ok">✓</span>
                                : <span className="ci-ra-ht-badge err">✕</span>}
                            </td>
                            <td className="ci-ra-ht-tipo">{tipoLabel}</td>
                            <td className="ci-ra-ht-nombre">
                              <span title={h.NOMBRE || h.CLAVE}>{h.NOMBRE || h.CLAVE}</span>
                              {!h.OK && h.ERROR && <div className="ci-ra-ht-error">{h.ERROR}</div>}
                            </td>
                            <td className="ci-ra-ht-archivo">
                              {nombreArchivo
                                ? <span title={h.ARCHIVO}>📄 {nombreArchivo}</span>
                                : <span className="ci-ra-ht-nil">—</span>}
                            </td>
                            <td className="ci-ra-ht-regs">
                              {h.REGISTROS != null ? h.REGISTROS.toLocaleString() : <span className="ci-ra-ht-nil">—</span>}
                            </td>
                            <td className="ci-ra-ht-fecha">{formatTs(h.EJECUTADO_EL)}</td>
                            <td className="ci-ra-ht-acciones">
                              {!h.OK && (
                                <button
                                  className="ci-ra-btn-retry"
                                  onClick={() => reintentarReporte(h.ID_LOG)}
                                  disabled={reintentando === h.ID_LOG}
                                  title="Reintentar reporte"
                                >
                                  {reintentando === h.ID_LOG ? '⏳' : '🔄'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </>
            )}

            {/* Paginación siempre al fondo */}
            <div className="ci-ra-hist-pag-wrap">
              <div className="ci-ra-hist-pag">
                <button className="ci-ra-pag-btn" onClick={() => setHistPagina(1)} disabled={pagSegura === 1}>«</button>
                <button className="ci-ra-pag-btn" onClick={() => setHistPagina(p => Math.max(1,p-1))} disabled={pagSegura === 1}>‹</button>
                <span className="ci-ra-pag-info">Página <strong>{pagSegura}</strong> de <strong>{totalPags}</strong></span>
                <button className="ci-ra-pag-btn" onClick={() => setHistPagina(p => Math.min(totalPags,p+1))} disabled={pagSegura === totalPags}>›</button>
                <button className="ci-ra-pag-btn" onClick={() => setHistPagina(totalPags)} disabled={pagSegura === totalPags}>»</button>
                <span className="ci-ra-pag-sep">|</span>
                <button className="ci-ra-btn-refresh" onClick={cargarHistorial}>🔄 Actualizar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ MODAL: CREAR/EDITAR PLANTILLA ══ */}
      {modalTemplate && templateActual && (
        <div className="ci-ra-modal-overlay" onClick={() => setModalTemplate(false)}>
          <div className="ci-ra-modal ci-ra-modal-xl" onClick={e => e.stopPropagation()}>
            <div className="ci-ra-modal-header">
              <span className="ci-ra-modal-titulo">
                {templateActual.id_template ? '✏️ Editar Plantilla' : '➕ Nueva Plantilla'}
              </span>
              <button className="ci-ra-modal-close" onClick={() => setModalTemplate(false)}>✕</button>
            </div>

            <div className="ci-ra-modal-body ci-ra-outlook-form">
              {/* Campo: Nombre de plantilla */}
              <div className="ci-ra-outlook-field">
                <label>Nombre de la plantilla:</label>
                <input 
                  type="text"
                  className="ci-ra-input"
                  value={templateActual.nombre}
                  onChange={e => setTemplateActual({...templateActual, nombre: e.target.value})}
                  placeholder="Ej: Reportes Diarios Ficohsa"
                />
              </div>

              {/* Campo: De */}
              <div className="ci-ra-outlook-field">
                <label>De:</label>
                <input 
                  type="text"
                  className="ci-ra-input ci-ra-input-disabled"
                  value={`${emailConfig?.fromName || 'Soporte TalkMe'} <${emailConfig?.fromEmail || 'soporte@talkme.pro'}>`}
                  disabled
                />
              </div>

              {/* Destinatarios */}
              <div className="ci-ra-outlook-field">
                <label>Destinatarios:</label>
                <div className="ci-ra-destinatarios-editor">
                  {(templateActual.destinatarios || []).map((dest, idx) => (
                    <div key={idx} className="ci-ra-destinatario-tag">
                      <span className={`ci-ra-dest-tipo ${dest.tipo}`}>{dest.tipo}</span>
                      <span className="ci-ra-dest-email">{dest.email}</span>
                      <button onClick={() => eliminarDestinatarioTemplate(idx)}>✕</button>
                    </div>
                  ))}
                  <div className="ci-ra-destinatario-add">
                    <input 
                      type="email"
                      placeholder="Email..."
                      className="ci-ra-input"
                      value={nuevoDestinatarioTemplate.email}
                      onChange={e => setNuevoDestinatarioTemplate({...nuevoDestinatarioTemplate, email: e.target.value})}
                    />
                    <input 
                      type="text"
                      placeholder="Nombre..."
                      className="ci-ra-input"
                      value={nuevoDestinatarioTemplate.nombre}
                      onChange={e => setNuevoDestinatarioTemplate({...nuevoDestinatarioTemplate, nombre: e.target.value})}
                    />
                    <select
                      className="ci-ra-select"
                      value={nuevoDestinatarioTemplate.tipo}
                      onChange={e => setNuevoDestinatarioTemplate({...nuevoDestinatarioTemplate, tipo: e.target.value})}
                    >
                      <option value="PARA">Para</option>
                      <option value="CC">CC</option>
                    </select>
                    <button className="ci-ra-btn-add-sm" onClick={agregarDestinatarioTemplate}>➕</button>
                  </div>
                </div>
              </div>

              {/* Campo: Asunto */}
              <div className="ci-ra-outlook-field">
                <label>Asunto:</label>
                <input 
                  type="text"
                  className="ci-ra-input"
                  value={templateActual.asunto}
                  onChange={e => setTemplateActual({...templateActual, asunto: e.target.value})}
                  placeholder="Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}"
                />
                <small className="ci-ra-help-text">
                  Variables: {'{FECHA}'}, {'{TIPO_REPORTE}'}, {'{EMPRESA}'}
                </small>
              </div>

              {/* Campo: Reportes a incluir */}
              <div className="ci-ra-outlook-field">
                <label>Reportes a incluir:</label>
                <div className="ci-ra-reportes-selector">
                  {config?.reportes?.map(r => (
                    <label key={r.clave} className="ci-ra-reporte-checkbox">
                      <input 
                        type="checkbox"
                        checked={(templateActual.reportes || []).includes(r.clave)}
                        onChange={e => {
                          const reportes = templateActual.reportes || [];
                          if (e.target.checked) {
                            setTemplateActual({...templateActual, reportes: [...reportes, r.clave]});
                          } else {
                            setTemplateActual({...templateActual, reportes: reportes.filter(cl => cl !== r.clave)});
                          }
                        }}
                      />
                      <span>{r.nombre}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Campo: Cuerpo del correo */}
              <div className="ci-ra-outlook-field">
                <label>Cuerpo del correo (HTML):</label>
                <textarea 
                  className="ci-ra-textarea ci-ra-textarea-large"
                  value={templateActual.cuerpo_html}
                  onChange={e => setTemplateActual({...templateActual, cuerpo_html: e.target.value})}
                  rows={6}
                  placeholder="<p>Buenos días...</p>"
                />
              </div>

              {/* Campo: Firma */}
              <div className="ci-ra-outlook-field">
                <label>Firma (HTML opcional):</label>
                <textarea 
                  className="ci-ra-textarea"
                  value={templateActual.firma_html}
                  onChange={e => setTemplateActual({...templateActual, firma_html: e.target.value})}
                  rows={3}
                  placeholder="<div>...</div>"
                />
              </div>

              {/* Campo: Imagen de firma */}
              <div className="ci-ra-outlook-field">
                <label>Imagen de firma:</label>
                <div className="ci-ra-imagen-firma-upload">
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={cargarImagenFirma}
                    className="ci-ra-file-input"
                  />
                  <small className="ci-ra-help-text">
                    O ingresa ruta: <input 
                      type="text"
                      className="ci-ra-input"
                      value={templateActual.imagen_firma_path || ''}
                      onChange={e => setTemplateActual({...templateActual, imagen_firma_path: e.target.value})}
                      placeholder="D:\\Proyectos\\...\\firma.png"
                      style={{ marginTop: '5px', width: '100%' }}
                    />
                  </small>
                </div>
              </div>
            </div>

            <div className="ci-ra-modal-footer">
              <button 
                className="ci-ra-btn-secondary" 
                onClick={() => {
                  setModalTemplate(false);
                  setTemplateActual(null);
                }}
              >
                Cancelar
              </button>
              <button 
                className="ci-ra-btn-primary" 
                onClick={guardarTemplate}
                disabled={guardandoTemplate}
              >
                {guardandoTemplate ? '⏳ Guardando...' : '💾 Guardar Plantilla'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Cierres;
