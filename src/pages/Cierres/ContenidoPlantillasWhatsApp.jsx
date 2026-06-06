import { useState, useCallback, useEffect } from 'react';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { toast } from 'react-toastify';

// Helper para obtener badge de estado Gupshup
const getEstadoGupshupBadge = (estado) => {
  const estados = {
    0: { label: 'DELETED', class: 'badge-deleted' },
    1: { label: 'APPROVED', class: 'badge-approved' },
    2: { label: 'PENDING', class: 'badge-pending' },
    3: { label: 'REJECTED', class: 'badge-rejected' },
    4: { label: 'FAILED', class: 'badge-failed' }
  };
  return estados[estado] || { label: 'UNKNOWN', class: 'badge-unknown' };
};

// Helper para formatear mensaje con parámetros coloreados
const formatearMensaje = (mensaje) => {
  if (!mensaje) return '';
  return mensaje.replace(/\{\{([^}]+)\}\}/g, '<span class="wa-param">{{$1}}</span>');
};

// Helper para obtener usuario logueado
const getUsuarioLogueado = () => {
  try {
    const userInfo = sessionStorage.getItem('user_info');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.usuario || parsed.NOMBRE_USUARIO || parsed.nombre || 'SISTEMA';
    }
  } catch {}
  return 'SISTEMA';
};

// Modal de edición
function ModalEditarPlantilla({ plantilla, dbKey, onClose, onGuardar }) {
  const [nombrePlantilla, setNombrePlantilla] = useState(plantilla.nombre_plantilla || '');
  const [nombre, setNombre] = useState(plantilla.nombre || '');
  const [estado, setEstado] = useState(plantilla.estado ?? 1);
  const [estadoGupshup, setEstadoGupshup] = useState(plantilla.estado_gupshup ?? 1);
  const [categoria, setCategoria] = useState(plantilla.id_plantilla_categoria || '');
  const [url, setUrl] = useState(plantilla.media_url || '');
  const [pantallas, setPantallas] = useState(plantilla.pantallas || '');
  const [guardando, setGuardando] = useState(false);
  const [categorias, setCategorias] = useState([]);
  const [parametros, setParametros] = useState([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);
  const [loadingParametros, setLoadingParametros] = useState(false);

  // Cargar categorías
  useEffect(() => {
    const cargarCategorias = async () => {
      setLoadingCategorias(true);
      try {
        const res = await fetchWithAuth(`${API_URLS.plantillasCategorias()}?db_key=${dbKey}`);
        const data = await res.json();
        setCategorias(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error al cargar categorías:', e);
      } finally {
        setLoadingCategorias(false);
      }
    };
    cargarCategorias();
  }, [dbKey]);

  // Cargar parámetros de la plantilla
  useEffect(() => {
    if (!plantilla.id_plantilla) return;
    const cargarParametros = async () => {
      setLoadingParametros(true);
      try {
        const res = await fetchWithAuth(`${API_URLS.plantillasParametros(plantilla.id_plantilla)}?db_key=${dbKey}`);
        const data = await res.json();
        setParametros(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error al cargar parámetros:', e);
      } finally {
        setLoadingParametros(false);
      }
    };
    cargarParametros();
  }, [plantilla.id_plantilla, dbKey]);

  // Actualizar parámetro
  const actualizarParametro = (id, campo, valor) => {
    setParametros(prev => prev.map(p => 
      p.ID_PLANTILLA_PARAMETRO === id ? { ...p, [campo]: valor } : p
    ));
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const creadoPor = getUsuarioLogueado();
      const res = await fetchWithAuth(`${API_URLS.plantillasWhatsAppActualizar(plantilla.id_plantilla)}?db_key=${dbKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_plantilla: nombrePlantilla,
          nombre: nombre,
          estado: estado,
          estado_gupshup: estadoGupshup,
          id_plantilla_categoria: categoria,
          url: url,
          pantallas: pantallas,
          modificado_por: creadoPor,
          parametros: parametros.map(p => ({
            id_plantilla_parametro: p.ID_PLANTILLA_PARAMETRO,
            nombre: p.NOMBRE,
            placeholder: p.PLACEHOLDER,
            orden: p.ORDEN
          }))
        })
      });
      
      if (!res.ok) throw new Error('Error al actualizar');
      
      toast.success('Plantilla actualizada correctamente');
      onGuardar();
      onClose();
    } catch (e) {
      toast.error('Error al guardar: ' + e.message);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="wa-modal-overlay" onClick={onClose}>
      <div className="wa-modal wa-modal-grande" onClick={e => e.stopPropagation()}>
        <div className="wa-modal-header">
          <h3>Editar Plantilla</h3>
          <button className="wa-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="wa-modal-body">
          {/* Campos principales */}
          <div className="wa-seccion">
            <label>Información General</label>
            <div className="wa-fields-grid">
              <div className="wa-field">
                <label>Nombre Plantilla (Gupshup):</label>
                <input 
                  type="text" 
                  value={nombrePlantilla} 
                  onChange={e => setNombrePlantilla(e.target.value)}
                  className="wa-input"
                />
              </div>
              <div className="wa-field">
                <label>Nombre (Mostrar al cliente):</label>
                <input 
                  type="text" 
                  value={nombre} 
                  onChange={e => setNombre(e.target.value)}
                  className="wa-input"
                />
              </div>
              <div className="wa-field">
                <label>Categoría:</label>
                {loadingCategorias ? (
                  <span className="wa-field-value">Cargando...</span>
                ) : (
                  <select 
                    value={categoria} 
                    onChange={e => setCategoria(e.target.value)}
                    className="wa-input"
                  >
                    <option key="default" value="">Seleccionar...</option>
                    {categorias.map(cat => (
                      <option key={cat.ID_PLANTILLA_CATEGORIA} value={cat.ID_PLANTILLA_CATEGORIA}>
                        {cat.CATEGORIA}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="wa-field">
                <label>Estado:</label>
                <select 
                  value={estado} 
                  onChange={e => setEstado(parseInt(e.target.value))}
                  className="wa-input"
                >
                  <option key="activo" value={1}>Activo</option>
                  <option key="inactivo" value={0}>Inactivo</option>
                </select>
              </div>
              <div className="wa-field">
                <label>Estado Gupshup:</label>
                <select 
                  value={estadoGupshup} 
                  onChange={e => setEstadoGupshup(parseInt(e.target.value))}
                  className="wa-input"
                >
                  <option key="approved" value={1}>APPROVED</option>
                  <option key="pending" value={2}>PENDING</option>
                  <option key="rejected" value={3}>REJECTED</option>
                  <option key="deleted" value={0}>DELETED</option>
                  <option key="failed" value={4}>FAILED</option>
                </select>
              </div>
              <div className="wa-field">
                <label>Pantallas:</label>
                <input 
                  type="text" 
                  value={pantallas} 
                  onChange={e => setPantallas(e.target.value)}
                  placeholder="Nombre de pantallas"
                  className="wa-input"
                />
              </div>
            </div>
          </div>

          {/* Configuración */}
          {plantilla.media_url && (
            <div className="wa-seccion">
              <label>Configuración</label>
              <div className="wa-field">
                <label>URL / Media URL:</label>
                <input 
                  type="text" 
                  value={url} 
                  onChange={e => setUrl(e.target.value)}
                  placeholder="https://..."
                  className="wa-input"
                />
              </div>
            </div>
          )}

          {/* Parámetros */}
          <div className="wa-seccion">
            <label>Parámetros ({parametros.length})</label>
            {loadingParametros ? (
              <span className="wa-field-value">Cargando...</span>
            ) : parametros.length === 0 ? (
              <span className="wa-field-value">Sin parámetros</span>
            ) : (
              <div className="wa-params-editar">
                {parametros.map(param => (
                  <div key={param.ID_PLANTILLA_PARAMETRO} className="wa-param-row">
                    <div className="wa-param-col">
                      <label>Orden:</label>
                      <input 
                        type="number" 
                        value={param.ORDEN} 
                        onChange={e => actualizarParametro(param.ID_PLANTILLA_PARAMETRO, 'ORDEN', parseInt(e.target.value))}
                        className="wa-input wa-input-sm"
                      />
                    </div>
                    <div className="wa-param-col">
                      <label>Nombre:</label>
                      <input 
                        type="text" 
                        value={param.NOMBRE} 
                        onChange={e => actualizarParametro(param.ID_PLANTILLA_PARAMETRO, 'NOMBRE', e.target.value)}
                        className="wa-input"
                      />
                    </div>
                    <div className="wa-param-col">
                      <label>Placeholder:</label>
                      <input 
                        type="text" 
                        value={param.PLACEHOLDER} 
                        onChange={e => actualizarParametro(param.ID_PLANTILLA_PARAMETRO, 'PLACEHOLDER', e.target.value)}
                        className="wa-input"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="wa-modal-footer">
          <button className="wa-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button 
            className="wa-btn-guardar" 
            onClick={handleGuardar} 
            disabled={guardando}
          >
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Context Menu
function ContextMenu({ x, y, plantilla, onEditar, onCerrar }) {
  return (
    <>
      <div className="wa-context-backdrop" onClick={onCerrar} />
      <div className="wa-context-menu" style={{ left: x, top: y }}>
        <div className="wa-context-item" onClick={() => { onEditar(); onCerrar(); }}>
          ✏️ Editar...
        </div>
        <div className="wa-context-item wa-context-separator" />
        <div className="wa-context-item wa-context-info">
          ID: {plantilla.id_plantilla}
        </div>
      </div>
    </>
  );
}

export default function ContenidoPlantillasWhatsApp({ plantillas, loading, dbKey, onConsultar, idEmpresa }) {
  const [plantillaExpandida, setPlantillaExpandida] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [modalEditar, setModalEditar] = useState(null);

  const toggleExpandir = (id) => {
    setPlantillaExpandida(plantillaExpandida === id ? null : id);
  };

  const handleContextMenu = useCallback((e, plantilla) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, plantilla });
  }, []);

  const handleEditar = (plantilla) => {
    setModalEditar(plantilla);
  };

  // Estado inicial - no hay consulta aún
  if (!plantillas && !loading) {
    return (
      <div className="wa-empty-state">
        <div className="wa-welcome-card">
          <span className="wa-icon-large">💬</span>
          <h3>Plantillas de WhatsApp</h3>
          <p>Selecciona empresa y bot en la barra superior, luego presiona <strong>Consultar</strong>.</p>
        </div>
      </div>
    );
  }

  // Loading
  if (loading) {
    return (
      <div className="wa-loading">
        <div className="wa-spinner" />
        <p>Cargando plantillas...</p>
      </div>
    );
  }

  // Sin resultados
  if (plantillas?.length === 0) {
    return (
      <div className="wa-empty-state">
        <div className="wa-welcome-card">
          <span className="wa-icon-large">📋</span>
          <h3>Sin plantillas</h3>
          <p>No se encontraron plantillas para los filtros seleccionados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="wa-container">
      {/* Grid de tarjetas */}
      <div className="wa-grid">
        {plantillas.map((p) => {
          const estadoBadge = getEstadoGupshupBadge(p.estado_gupshup);
          const expandida = plantillaExpandida === p.id_plantilla;
          
          return (
            <div 
              key={p.id_plantilla} 
              className={`wa-card ${expandida ? 'expandida' : ''}`}
              onContextMenu={(e) => handleContextMenu(e, p)}
            >
              {/* Header con badges */}
              <div className="wa-card-header">
                <div className="wa-badges">
                  <span className={`wa-badge ${estadoBadge.class}`}>{estadoBadge.label}</span>
                  {p.nombre_categoria && (
                    <span className="wa-badge wa-badge-category">{p.nombre_categoria}</span>
                  )}
                  {p.tipo_plantilla === 1 && (
                    <span className="wa-badge wa-badge-carousel">CAROUSEL</span>
                  )}
                </div>
                <h4 className="wa-card-title" title={p.nombre}>{p.nombre}</h4>
                <span className="wa-card-id">ID: {p.id_interno}</span>
              </div>

              {/* Mensaje con scroll - Media primero, luego texto */}
              <div className="wa-card-body">
                {/* Media arriba del texto */}
                {p.media && p.media_url && (
                  <div className="wa-media">
                    {p.media === 'image' && <img src={p.media_url} alt="Media" />}
                    {p.media === 'video' && <video src={p.media_url} controls />}
                    {p.media === 'document' && (
                      <a href={p.media_url} target="_blank" rel="noopener noreferrer" className="wa-document-link">
                        📄 Ver documento
                      </a>
                    )}
                  </div>
                )}
                
                <div 
                  className="wa-mensaje"
                  dangerouslySetInnerHTML={{ __html: formatearMensaje(p.mensaje_mapeado) }}
                />
              </div>

              {/* Footer con botones reales de la plantilla */}
              <div className="wa-card-footer">
                {p.botones?.length > 0 ? (
                  <div className="wa-botones-preview-container">
                    {p.botones.map((btn, idx) => (
                      <button 
                        key={idx} 
                        className={`wa-boton-real wa-boton-${btn.tipo?.toLowerCase()}`}
                        title={`${btn.tipo}: ${btn.titulo || ''}`}
                      >
                        {btn.tipo === 'QUICK_REPLY' && '↩️ '}
                        {btn.tipo === 'URL' && '🔗 '}
                        {btn.tipo === 'PHONE_NUMBER' && '📞 '}
                        {btn.titulo || btn.tipo}
                      </button>
                    ))}
                  </div>
                ) : (
                  <span className="wa-no-botones">Sin botones</span>
                )}
              </div>

              {/* Panel expandido con detalles (sin info del bot) */}
              {expandida && (
                <div className="wa-panel-detalles">
                  {/* URL y Pantallas editables */}
                  <div className="wa-seccion">
                    <label>Configuración:</label>
                    <div className="wa-config-list">
                      <div className="wa-config-item">
                        <span className="wa-config-label">URL:</span>
                        <span className="wa-config-value">{p.media_url || '—'}</span>
                      </div>
                      <div className="wa-config-item">
                        <span className="wa-config-label">Pantallas:</span>
                        <span className="wa-config-value">{p.pantallas || '—'}</span>
                      </div>
                    </div>
                    <button 
                      className="wa-btn-editar-inline"
                      onClick={() => handleEditar(p)}
                    >
                      ✏️ Editar
                    </button>
                  </div>

                  {/* Parámetros */}
                  {p.parametros?.length > 0 && (
                    <div className="wa-seccion">
                      <label>Parámetros ({p.parametros.length}):</label>
                      <div className="wa-params-list">
                        {p.parametros.map((param, idx) => (
                          <span key={idx} className="wa-param-chip">
                            {param.orden}. {param.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botones detallados */}
                  {p.botones?.length > 0 && (
                    <div className="wa-seccion">
                      <label>Botones ({p.botones.length}):</label>
                      <div className="wa-botones-detalle">
                        {p.botones.map((btn, idx) => (
                          <div key={idx} className="wa-boton-item">
                            <span className={`wa-boton-tipo wa-tipo-${btn.tipo?.toLowerCase()}`}>
                              {btn.tipo}
                            </span>
                            <span className="wa-boton-titulo">{btn.titulo}</span>
                            {btn.url && (
                              <a 
                                href={btn.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="wa-boton-link"
                              >
                                {btn.url.substring(0, 30)}...
                              </a>
                            )}
                            {btn.telefono && (
                              <span className="wa-boton-tel">📞 {btn.telefono}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <ContextMenu 
          x={contextMenu.x} 
          y={contextMenu.y} 
          plantilla={contextMenu.plantilla}
          onEditar={() => handleEditar(contextMenu.plantilla)}
          onCerrar={() => setContextMenu(null)}
        />
      )}

      {/* Modal Editar */}
      {modalEditar && (
        <ModalEditarPlantilla 
          plantilla={modalEditar}
          dbKey={dbKey}
          onClose={() => setModalEditar(null)}
          onGuardar={() => setModalEditar(null)}
        />
      )}
    </div>
  );
}
