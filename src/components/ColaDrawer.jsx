import { useState, useEffect } from 'react';
import { Bell, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URLS } from '../config/api';
import { fetchWithAuth } from '../utils/fetchWithAuth';
import './ColaDrawer.css';

function ColaDrawer() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('cola');
  const [programados, setProgramados] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [loadingProgramados, setLoadingProgramados] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  // Estados para saber si es carga inicial (mostrar spinner) o recarga (silenciosa)
  const [initialLoadCola, setInitialLoadCola] = useState(true);
  const [initialLoadHistorial, setInitialLoadHistorial] = useState(true);
  const [modalConfirm, setModalConfirm] = useState({ show: false, id: null });
  
  // Paginación
  const ITEMS_POR_PAGINA = 5;
  const [paginaCola, setPaginaCola] = useState(1);
  const [paginaHistorial, setPaginaHistorial] = useState(1);
  const [totalCola, setTotalCola] = useState(0);
  const [totalHistorial, setTotalHistorial] = useState(0);

  // Cargar programados - silent=true para recargas en segundo plano
  const cargarProgramados = async (page = 1, silent = false) => {
    if (!silent) setLoadingProgramados(true);
    try {
      const res = await fetchWithAuth(`${API_URLS.programados()}?page=${page}&limit=${ITEMS_POR_PAGINA}`);
      if (res.ok) {
        const result = await res.json();
        setProgramados(result.data || []);
        setTotalCola(result.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { 
      if (!silent) setLoadingProgramados(false);
      setInitialLoadCola(false);
    }
  };

  // Cargar historial - silent=true para recargas en segundo plano
  const cargarHistorial = async (page = 1, silent = false) => {
    if (!silent) setLoadingHistorial(true);
    try {
      const res = await fetchWithAuth(`${API_URLS.historial()}?page=${page}&limit=${ITEMS_POR_PAGINA}`);
      if (res.ok) {
        const result = await res.json();
        setHistorial(result.data || []);
        setTotalHistorial(result.total || 0);
      }
    } catch (e) { console.error(e); }
    finally { 
      if (!silent) setLoadingHistorial(false);
      setInitialLoadHistorial(false);
    }
  };
  
  const totalPagesCola = Math.ceil(totalCola / ITEMS_POR_PAGINA);
  const totalPagesHistorial = Math.ceil(totalHistorial / ITEMS_POR_PAGINA);

  // Carga inicial de cola y recarga silenciosa cada 30 segundos
  useEffect(() => {
    cargarProgramados(paginaCola, false); // Primera carga con loading
    const interval = setInterval(() => {
      cargarProgramados(paginaCola, true); // Recarga silenciosa (sin loading visual)
    }, 30000);
    return () => clearInterval(interval);
  }, [paginaCola]);

  // Carga de historial solo cuando se abre la pestaña
  useEffect(() => {
    if (open && tab === 'historial') {
      cargarHistorial(paginaHistorial, initialLoadHistorial ? false : true);
    }
  }, [open, tab, paginaHistorial]);

  const pendientes = programados.filter(p => p.estado === 'PENDIENTE').length;
  const total = totalCola;

  const anularItem = async () => {
    if (!modalConfirm.id) return;
    try {
      await fetchWithAuth(API_URLS.programado(modalConfirm.id), { method: 'DELETE' });
      setModalConfirm({ show: false, id: null });
      cargarProgramados(paginaCola, false); // Recargar con loading después de anular
    } catch (e) { console.error(e); }
  };
  
  // Componente de paginación reutilizable
  const Paginacion = ({ page, totalPages, onPageChange, total }) => {
    if (totalPages <= 1) return null;
    return (
      <div className="cola-paginacion">
        <button 
          className="cola-paginacion-btn" 
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="cola-paginacion-info">
          Página {page} de {totalPages} ({total} total)
        </span>
        <button 
          className="cola-paginacion-btn" 
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  return (
    <>
      {/* CAMPANITA EN SIDEBAR — se renderiza dentro del drawer, pero la campana va en Sidebar via portal o se pasa como prop. Aquí es el drawer completo */}
      <button
        className={`cola-bell-btn ${open ? 'open' : ''} ${total > 0 ? 'has-notifications' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="Cola de automatizaciones"
      >
        <Bell size={22} strokeWidth={1.75} />
        {total > 0 && (
          <span className="cola-bell-badge">{total > 99 ? '99+' : total}</span>
        )}
      </button>

      {/* OVERLAY */}
      {open && <div className="cola-overlay" onClick={() => setOpen(false)} />}

      {/* DRAWER */}
      <div className={`cola-drawer ${open ? 'cola-drawer-open' : ''}`}>
        <div className="cola-drawer-header">
          <div className="cola-drawer-title">
            <Bell size={16} strokeWidth={2} />
            Automatizaciones
            {total > 0 && <span className="cola-drawer-count">{total}</span>}
          </div>
          <button className="cola-drawer-close" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="cola-drawer-tabs">
          <button
            className={`cola-drawer-tab ${tab === 'cola' ? 'active' : ''}`}
            onClick={() => setTab('cola')}
          >
            Cola Activa
            {total > 0 && <span className="cola-tab-badge">{total}</span>}
          </button>
          <button
            className={`cola-drawer-tab ${tab === 'historial' ? 'active' : ''}`}
            onClick={() => setTab('historial')}
          >
            Historial
          </button>
        </div>

        <div className="cola-drawer-body">
          {tab === 'cola' && (
            loadingProgramados && initialLoadCola
              ? <div className="cola-empty">⏳ Cargando cola...</div>
              : programados.length === 0
                ? <div className="cola-empty">📭 No hay tareas en la cola</div>
                : <>
                    <div className="cola-items-scrollable">
                      {programados.map(p => (
                        <div key={p.id} className={`cola-item ${!p.id_original_horario ? 'cola-item-temporal' : ''}`}>
                          <div className="cola-item-top">
                            <span className={`cola-item-estado ${p.estado === 'PENDIENTE' ? 'pendiente' : 'aplicado'}`}>
                              {p.estado}
                            </span>
                            <strong className="cola-item-nombre">{p.nombre_skill}</strong>
                            <span className="cola-item-db">{p.DB_VISUAL}</span>
                          </div>
                          {!p.id_original_horario && (
                            <div className="cola-item-tipo-badge">⏰ HORARIO TEMPORAL NUEVO</div>
                          )}
                          {p.nombre_empresa && <div className="cola-item-empresa">🏢 {p.nombre_empresa}</div>}
                          <div className="cola-item-grid">
                            {p.id_original_horario ? (
                              <>
                                <div className="cola-item-row">
                                  <span className="cola-item-label">Horario original</span>
                                  <span className="cola-item-val muted">
                                    {p.original_desde_guate && p.original_hasta_guate
                                      ? `${p.original_desde_guate} — ${p.original_hasta_guate}`
                                      : '—'}
                                  </span>
                                </div>
                                <div className="cola-item-row">
                                  <span className="cola-item-label">Días original</span>
                                  <span className="cola-item-val mono muted">{p.original_dias_str || '—'}</span>
                                </div>
                              </>
                            ) : (
                              <div className="cola-item-row">
                                <span className="cola-item-label">Tipo</span>
                                <span className="cola-item-val" style={{color: '#2563eb', fontWeight: 600}}>
                                  Nuevo horario temporal (se eliminará al revertir)
                                </span>
                              </div>
                            )}
                            <div className="cola-item-row">
                              <span className="cola-item-label">Horario {p.id_original_horario ? 'solicitado' : 'temporal'}</span>
                              <span className="cola-item-val accent">{p.nuevo_desde_guate} — {p.nuevo_hasta_guate}</span>
                            </div>
                            <div className="cola-item-row">
                              <span className="cola-item-label">Días {p.id_original_horario ? 'solicitados' : 'temporales'}</span>
                              <span className="cola-item-val mono accent">{p.nuevos_dias_str || '—'}</span>
                            </div>
                            <div className="cola-item-row">
                              <span className="cola-item-label">Activación</span>
                              <span className="cola-item-val">⚡ {p.fecha_aplicacion_str}</span>
                            </div>
                            <div className="cola-item-row">
                              <span className="cola-item-label">Reversión</span>
                              <span className="cola-item-val">↩ {p.fecha_reversion_str}</span>
                            </div>
                          </div>
                          {p.estado === 'PENDIENTE' && (
                            <button className="cola-item-anular" onClick={() => setModalConfirm({ show: true, id: p.id })}>
                              ❌ Anular
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="cola-paginacion-fixed">
                      <Paginacion 
                        page={paginaCola} 
                        totalPages={totalPagesCola} 
                        onPageChange={setPaginaCola}
                        total={totalCola}
                      />
                    </div>
                  </>
          )}

          {tab === 'historial' && (
            loadingHistorial && initialLoadHistorial
              ? <div className="cola-empty">⏳ Cargando historial...</div>
              : historial.length === 0
                ? <div className="cola-empty">📜 Sin registros históricos</div>
                : <>
                    <div className="cola-items-scrollable">
                      {historial.map(h => (
                        <div key={h.id} className={`cola-item ${!h.id_original_horario ? 'cola-item-temporal' : ''}`}>
                          <div className="cola-item-top">
                            <span className="cola-item-estado revertido">{h.estado}</span>
                            <strong className="cola-item-nombre">{h.nombre_skill}</strong>
                            <span className="cola-item-db">{h.DB_VISUAL}</span>
                          </div>
                          {!h.id_original_horario && (
                            <div className="cola-item-tipo-badge revertido">⏰ HORARIO TEMPORAL (Eliminado)</div>
                          )}
                          {h.nombre_empresa && <div className="cola-item-empresa">🏢 {h.nombre_empresa}</div>}
                          <div className="cola-item-grid">
                            {h.id_original_horario ? (
                              <>
                                <div className="cola-item-row">
                                  <span className="cola-item-label">Horario original</span>
                                  <span className="cola-item-val muted">
                                    {h.original_desde_guate && h.original_hasta_guate
                                      ? `${h.original_desde_guate} — ${h.original_hasta_guate}`
                                      : '—'}
                                  </span>
                                </div>
                                <div className="cola-item-row">
                                  <span className="cola-item-label">Días original</span>
                                  <span className="cola-item-val mono muted">{h.original_dias_str || '—'}</span>
                                </div>
                              </>
                            ) : (
                              <div className="cola-item-row">
                                <span className="cola-item-label">Tipo</span>
                                <span className="cola-item-val" style={{color: '#64748b'}}>
                                  Horario temporal creado y eliminado automáticamente
                                </span>
                              </div>
                            )}
                            <div className="cola-item-row">
                              <span className="cola-item-label">Horario aplicado</span>
                              <span className="cola-item-val accent">{h.nuevo_desde_guate} — {h.nuevo_hasta_guate}</span>
                            </div>
                            <div className="cola-item-row">
                              <span className="cola-item-label">Días aplicados</span>
                              <span className="cola-item-val mono accent">{h.nuevos_dias_str || '—'}</span>
                            </div>
                            <div className="cola-item-row">
                              <span className="cola-item-label">Activación</span>
                              <span className="cola-item-val">⚡ {h.fecha_aplicacion_str}</span>
                            </div>
                            <div className="cola-item-row">
                              <span className="cola-item-label">Revertido el</span>
                              <span className="cola-item-val">↩ {h.fecha_reversion_str}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="cola-paginacion-fixed">
                      <Paginacion 
                        page={paginaHistorial} 
                        totalPages={totalPagesHistorial} 
                        onPageChange={setPaginaHistorial}
                        total={totalHistorial}
                      />
                    </div>
                  </>
          )}
        </div>
      </div>

      {/* MODAL CONFIRMACIÓN ANULAR */}
      {modalConfirm.show && (
        <div className="cola-confirm-overlay">
          <div className="cola-confirm-box">
            <p style={{color: '#1e293b', fontWeight: 600}}>¿Anular esta automatización?</p>
            <p style={{fontSize: '12px', color: '#64748b', marginTop: '-8px'}}>
              Esta acción no se puede deshacer
            </p>
            <div className="cola-confirm-actions">
              <button onClick={() => setModalConfirm({ show: false, id: null })}>Cancelar</button>
              <button className="danger" onClick={anularItem}>Sí, anular</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ColaDrawer;
