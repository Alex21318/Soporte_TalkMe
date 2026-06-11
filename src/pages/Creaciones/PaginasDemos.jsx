import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { API_URLS } from '../../config/api';
import ConfirmModal from '../../components/ConfirmModal';

const REDES_SOCIALES = ['FACEBOOK', 'INSTAGRAM', 'AMBAS'];
const ESTADOS = ['DISPONIBLE', 'OCUPADO', 'INACTIVO'];

const DB_VALIDACION = [
  { key: 'db_1', label: 'Talkme S1', segmento: 'S1' },
  { key: 'db_2', label: 'Talkme S2', segmento: 'S2' },
  { key: 'db_3', label: 'Talkme S3', segmento: 'S3' },
  { key: 'db_4', label: 'Talkme S4', segmento: 'S4' },
  { key: 'db_5', label: 'Talkme MDD', segmento: 'MDD' },
  { key: 'db_6', label: 'Ficohsa S1', segmento: 'FS1' },
  { key: 'db_7', label: 'Ficohsa S2', segmento: 'FS2' },
  { key: 'db_8', label: 'Ficohsa S3', segmento: 'FS3' },
];

const DEFAULT_FORM = {
  id: null,
  nombrePagina: '',
  idPaginaFb: '',
  token: '',
  idPaginaIg: '',
  nombreUsuarioIg: '',
  redSocial: 'FACEBOOK',
  estado: 'DISPONIBLE',
  tipoDemo: '',
};

const ITEMS_POR_PAGINA = 15;

function PaginasDemos({
  busqueda,
  setBusqueda,
  filtroEstado,
  setFiltroEstado,
  filtroRedSocial,
  setFiltroRedSocial,
  filtroTipoDemo,
  setFiltroTipoDemo,
  recargarTrigger,
  showValidar,
  setShowValidar,
  showForm,
  setShowForm
}) {
  const [paginas, setPaginas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [paginaActual, setPaginaActual] = useState(1);

  // ── Estados de validación ────────────────────────────────────────────────
  const [dbValidar, setDbValidar] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState(null);

  // ── Estados de modales de confirmación ────────────────────────────────────
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [showLiberarModal, setShowLiberarModal] = useState(false);
  const [paginaToDelete, setPaginaToDelete] = useState(null);
  const [paginaToLiberar, setPaginaToLiberar] = useState(null);

  // Cargar páginas al iniciar
  useEffect(() => {
    cargarPaginas();
  }, []);

  // Recargar cuando cambia el trigger
  useEffect(() => {
    if (recargarTrigger > 0) {
      cargarPaginas();
    }
  }, [recargarTrigger]);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, filtroRedSocial, busqueda]);

  const handleValidar = async () => {
    if (!dbValidar) {
      toast.error('Seleccione una base de datos para validar');
      return;
    }
    setValidando(true);
    setResultadoValidacion(null);
    try {
      const response = await fetchWithAuth(API_URLS.paginasDemosValidar(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbKey: dbValidar }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al validar');
      setResultadoValidacion(data);
      if (data.paginasActualizadas > 0) {
        toast.success(`✓ ${data.paginasActualizadas} páginas actualizadas en ${data.segmento}`);
        cargarPaginas();
      } else {
        toast.info(`No se encontraron coincidencias en ${data.segmento}`);
      }
    } catch (error) {
      toast.error('Error al validar: ' + error.message);
    } finally {
      setValidando(false);
    }
  };

  const cargarPaginas = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.paginasDemos());
      if (!response.ok) throw new Error('Error al cargar páginas');
      const data = await response.json();
      setPaginas(data);
    } catch (error) {
      toast.error('Error al cargar páginas: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const url = formData.id 
        ? `/api/paginas-demos/${formData.id}` 
        : '/api/paginas-demos';
      const method = formData.id ? 'PUT' : 'POST';

      const response = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al guardar');
      }

      toast.success(formData.id ? 'Página actualizada' : 'Página creada');
      setShowForm(false);
      setFormData(DEFAULT_FORM);
      cargarPaginas();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (pagina) => {
    setFormData({
      id: pagina.ID_PAGINA,
      nombrePagina: pagina.NOMBRE_PAGINA,
      idPaginaFb: pagina.ID_PAGINA_FB || '',
      token: pagina.TOKEN || '',
      idPaginaIg: pagina.ID_PAGINA_IG || '',
      nombreUsuarioIg: pagina.NOMBRE_USUARIO_IG || '',
      redSocial: pagina.RED_SOCIAL,
      estado: pagina.ESTADO,
    });
    setShowForm(true);
  };

  const handleEliminar = (id) => {
    setPaginaToDelete(id);
    setShowEliminarModal(true);
  };

  const confirmEliminar = async () => {
    setShowEliminarModal(false);
    const id = paginaToDelete;
    setPaginaToDelete(null);

    setLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.paginasDemos() + `/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      toast.success('Página eliminada');
      cargarPaginas();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLiberar = async (id) => {
    setPaginaToLiberar(id);
    setShowLiberarModal(true);
  };

  const confirmLiberar = async () => {
    setShowLiberarModal(false);
    const id = paginaToLiberar;
    setPaginaToLiberar(null);

    setLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.paginasDemosLiberar(id), {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Error al liberar');

      toast.success('Página liberada');
      cargarPaginas();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const paginasFiltradas = paginas.filter(p => {
    const matchEstado = filtroEstado === 'TODOS' || p.ESTADO === filtroEstado;
    const matchRedSocial = filtroRedSocial === 'TODOS' || p.RED_SOCIAL === filtroRedSocial;
    const matchTipoDemo = filtroTipoDemo === 'TODOS' || p.TIPO_DEMO === filtroTipoDemo;
    const matchBusqueda = busqueda === '' || 
      p.NOMBRE_PAGINA.toLowerCase().includes(busqueda.toLowerCase()) ||
      (p.ID_PAGINA_FB && p.ID_PAGINA_FB.includes(busqueda)) ||
      (p.ID_PAGINA_IG && p.ID_PAGINA_IG.includes(busqueda)) ||
      (p.NOMBRE_USUARIO_IG && p.NOMBRE_USUARIO_IG.toLowerCase().includes(busqueda.toLowerCase()));
    return matchEstado && matchRedSocial && matchTipoDemo && matchBusqueda;
  });

  // Paginación tabla principal
  const totalPaginas = Math.ceil(paginasFiltradas.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const paginasPaginadas = paginasFiltradas.slice(inicio, inicio + ITEMS_POR_PAGINA);

  const handlePaginaAnterior = () => {
    if (paginaActual > 1) setPaginaActual(p => p - 1);
  };

  const handlePaginaSiguiente = () => {
    if (paginaActual < totalPaginas) setPaginaActual(p => p + 1);
  };

  const getEstadoClass = (estado) => {
    switch (estado) {
      case 'DISPONIBLE': return 'estado-disponible';
      case 'OCUPADO': return 'estado-ocupado';
      case 'INACTIVO': return 'estado-inactivo';
      default: return '';
    }
  };

  return (
    <div className="cr-inst-container">
      {/* Panel de Validación en Base de Datos */}
      {showValidar && (
        <div className="cr-inst-section" style={{ border: '2px solid #7c3aed', borderRadius: '10px' }}>
          <div className="cr-inst-section-header" style={{ background: '#f5f3ff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ color: '#7c3aed', margin: 0 }}>🔍 Validar Páginas en Base de Datos</h3>
              <small style={{ color: '#6d28d9' }}>Consulta qué páginas están activas en demos y actualiza el mapeo</small>
            </div>
            <button
              className="cr-inst-btn cr-inst-btn-small cr-inst-btn-danger"
              onClick={() => setShowValidar(false)}
              title="Cerrar panel de validación"
            >
              ✕
            </button>
          </div>
          <div className="cr-inst-section-body">
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
              <div className="cr-inst-field" style={{ flex: '1', minWidth: '200px' }}>
                <label>Seleccionar Base de Datos</label>
                <select
                  className="cr-inst-select"
                  value={dbValidar}
                  onChange={(e) => setDbValidar(e.target.value)}
                  disabled={validando}
                >
                  <option value="">-- Seleccione un segmento --</option>
                  {DB_VALIDACION.map(db => (
                    <option key={db.key} value={db.key}>
                      {db.label} ({db.segmento})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ paddingBottom: '4px' }}>
                <button
                  className="cr-inst-btn"
                  style={{
                    background: validando ? '#a78bfa' : '#7c3aed',
                    color: 'white',
                    border: 'none',
                    minWidth: '140px'
                  }}
                  onClick={handleValidar}
                  disabled={validando || !dbValidar}
                >
                  {validando ? '⏳ Validando...' : '▶ Ejecutar Validación'}
                </button>
              </div>
            </div>

            {/* Resultado de la validación */}
            {resultadoValidacion && (
              <div style={{ marginTop: '16px' }}>
                <div style={{
                  background: resultadoValidacion.paginasActualizadas > 0 || resultadoValidacion.paginasNuevas > 0 ? '#f0fdf4' : '#fefce8',
                  border: `1px solid ${resultadoValidacion.paginasActualizadas > 0 || resultadoValidacion.paginasNuevas > 0 ? '#86efac' : '#fde047'}`,
                  borderRadius: '8px',
                  padding: '12px 16px',
                  marginBottom: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', marginBottom: '8px' }}>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      Segmento: <span style={{ color: '#7c3aed' }}>{resultadoValidacion.segmento}</span>
                    </span>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      Consultados en DB: <span style={{ color: '#2563eb' }}>{resultadoValidacion.totalConsultados}</span>
                    </span>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      Coincidencias: <span style={{ color: '#16a34a' }}>{resultadoValidacion.coincidenciasEncontradas}</span>
                    </span>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      Actualizados: <span style={{ color: '#dc2626' }}>{resultadoValidacion.paginasActualizadas}</span>
                    </span>
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      Nuevos: <span style={{ color: '#7c3aed' }}>{resultadoValidacion.paginasNuevas}</span>
                    </span>
                  </div>
                </div>

                {resultadoValidacion.detalles && resultadoValidacion.detalles.length > 0 && (
                  <table className="cr-inst-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Acción</th>
                        <th>Bot</th>
                        <th>Red Social</th>
                        <th>ID Página FB</th>
                        <th>ID Página IG</th>
                        <th>Usuario IG</th>
                        <th>Empresa en DB</th>
                        <th>Segmento</th>
                        <th>Tipo Demo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoValidacion.detalles.map((d, i) => (
                        <tr key={i}>
                          <td>
                            <span style={{
                              background: d.accion === 'nuevo' ? '#dbeafe' : '#fef3c7',
                              color: d.accion === 'nuevo' ? '#1d4ed8' : '#d97706',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {d.accion === 'nuevo' ? 'NUEVO' : 'ACTUALIZADO'}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ fontWeight: '500' }}>{d.encontradoEn.nombreBot}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>ID: {d.encontradoEn.idBot}</span>
                            </div>
                          </td>
                          <td>{d.redSocial}</td>
                          <td>
                            {d.encontradoEn.idPaginaFb ? (
                              <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {d.encontradoEn.idPaginaFb}
                              </code>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                            )}
                          </td>
                          <td>
                            {d.encontradoEn.idPaginaIg ? (
                              <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {d.encontradoEn.idPaginaIg}
                              </code>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                            )}
                          </td>
                          <td>
                            {d.encontradoEn.nombreUsuarioIg ? (
                              <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                                {d.encontradoEn.nombreUsuarioIg}
                              </code>
                            ) : (
                              <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ fontWeight: '500' }}>{d.encontradoEn.nombreEmpresa}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>ID: {d.encontradoEn.idEmpresa}</span>
                            </div>
                          </td>
                          <td>
                            <span style={{
                              background: '#ede9fe',
                              color: '#7c3aed',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {d.encontradoEn.segmento}
                            </span>
                          </td>
                          <td>
                            <span style={{
                              background: d.tipoDemo === 'DEMO_TALKME' ? '#dcfce7' : d.tipoDemo === 'DEMO_PARTNER' ? '#fef9c3' : '#f3f4f6',
                              color: d.tipoDemo === 'DEMO_TALKME' ? '#16a34a' : d.tipoDemo === 'DEMO_PARTNER' ? '#ca8a04' : '#6b7280',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: '600'
                            }}>
                              {d.tipoDemo || 'CLIENTE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {resultadoValidacion.detalles && resultadoValidacion.detalles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                    ⚠️ No se encontraron coincidencias entre las páginas de la DB y las registradas en Demos
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="cr-inst-section">
          <div className="cr-inst-section-header">
            <h3>{formData.id ? '✏️ Editar Página' : '➕ Nueva Página'}</h3>
          </div>
          <div className="cr-inst-section-body">
            <form onSubmit={handleSubmit}>
              <div className="cr-inst-grid-2">
                <div className="cr-inst-field">
                  <label>Nombre Página</label>
                  <input
                    type="text"
                    value={formData.nombrePagina}
                    onChange={(e) => setFormData({...formData, nombrePagina: e.target.value})}
                    placeholder="Ej: Talkme Official (opcional)"
                    className="cr-inst-input"
                  />
                </div>
                <div className="cr-inst-field">
                  <label>Red Social</label>
                  <select
                    value={formData.redSocial}
                    onChange={(e) => setFormData({...formData, redSocial: e.target.value})}
                    className="cr-inst-select"
                  >
                    {REDES_SOCIALES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
              </div>
              <div className="cr-inst-grid-2" style={{ marginTop: '12px' }}>
                <div className="cr-inst-field">
                  <label>ID Página Facebook</label>
                  <input
                    type="text"
                    value={formData.idPaginaFb}
                    onChange={(e) => setFormData({...formData, idPaginaFb: e.target.value})}
                    placeholder="ID de página FB..."
                    className="cr-inst-input"
                  />
                </div>
                <div className="cr-inst-field">
                  <label>Token</label>
                  <input
                    type="text"
                    value={formData.token}
                    onChange={(e) => setFormData({...formData, token: e.target.value})}
                    placeholder="Token de acceso..."
                    className="cr-inst-input"
                  />
                </div>
              </div>
              <div className="cr-inst-grid-2" style={{ marginTop: '12px' }}>
                <div className="cr-inst-field">
                  <label>ID Página Instagram</label>
                  <input
                    type="text"
                    value={formData.idPaginaIg}
                    onChange={(e) => setFormData({...formData, idPaginaIg: e.target.value})}
                    placeholder="ID de página IG..."
                    className="cr-inst-input"
                  />
                </div>
                <div className="cr-inst-field">
                  <label>Nombre Usuario Instagram</label>
                  <input
                    type="text"
                    value={formData.nombreUsuarioIg}
                    onChange={(e) => setFormData({...formData, nombreUsuarioIg: e.target.value})}
                    placeholder="@usuario..."
                    className="cr-inst-input"
                  />
                </div>
              </div>
              <div className="cr-inst-grid-2" style={{ marginTop: '12px' }}>
                <div className="cr-inst-field">
                  <label>Tipo Demo</label>
                  <select
                    value={formData.tipoDemo || ''}
                    onChange={(e) => setFormData({...formData, tipoDemo: e.target.value})}
                    className="cr-inst-select"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="DEMO_TALKME">DEMO_TALKME</option>
                    <option value="DEMO_PARTNER">DEMO_PARTNER</option>
                    <option value="CLIENTE">CLIENTE</option>
                  </select>
                </div>
                <div className="cr-inst-field">
                  <label>Estado</label>
                  <select
                    value={formData.estado}
                    onChange={(e) => setFormData({...formData, estado: e.target.value})}
                    className="cr-inst-select"
                  >
                    {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                </div>
              </div>
              <div className="cr-inst-actions" style={{ marginTop: '16px' }}>
                <button
                  type="button"
                  className="cr-inst-btn cr-inst-btn-secondary"
                  onClick={() => setShowForm(false)}
                  disabled={loading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cr-inst-btn cr-inst-btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : (formData.id ? 'Actualizar' : 'Guardar')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla de páginas */}
      <div className="cr-inst-section cr-inst-section-full" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 100px)' }}>
        <div className="cr-inst-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <h3>📋 Lista de Páginas ({paginasFiltradas.length})</h3>
          {totalPaginas > 1 && (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Página {paginaActual} de {totalPaginas}
            </div>
          )}
        </div>
        <div className="cr-inst-section-body" style={{ padding: 0, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {loading ? (
            <div className="cr-inst-loading">
              <div className="cr-inst-spinner"></div>
              <span>Cargando páginas...</span>
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table className="cr-inst-table">
                <thead>
                  <tr>
                    <th>Nombre Página</th>
                    <th>Red Social</th>
                    <th>ID Página FB</th>
                    <th>Token</th>
                    <th>ID Página IG</th>
                    <th>Usuario IG</th>
                    <th>Estado</th>
                    <th>Segmento</th>
                    <th>Tipo Demo</th>
                    <th>Empresa/Bot</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginasPaginadas.map((p) => (
                    <tr key={p.ID_PAGINA} className={p.ESTADO === 'OCUPADO' ? 'fila-ocupada' : ''}>
                      <td><strong>{p.NOMBRE_PAGINA}</strong></td>
                      <td><span className="badge-ambiente">{p.RED_SOCIAL}</span></td>
                      <td>
                        {p.ID_PAGINA_FB ? (
                          <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.ID_PAGINA_FB}
                          </code>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.TOKEN ? (
                          <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.TOKEN.substring(0, 20)}...
                          </code>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.ID_PAGINA_IG ? (
                          <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.ID_PAGINA_IG}
                          </code>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.NOMBRE_USUARIO_IG ? (
                          <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                            {p.NOMBRE_USUARIO_IG}
                          </code>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`estado-badge ${getEstadoClass(p.ESTADO)}`}>
                          {p.ESTADO}
                        </span>
                      </td>
                      <td>
                        {p.SEGMENTO ? (
                          <span style={{
                            background: p.SEGMENTO.startsWith('F') ? '#ede9fe' : '#dbeafe',
                            color: p.SEGMENTO.startsWith('F') ? '#7c3aed' : '#1d4ed8',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>{p.SEGMENTO}</span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.TIPO_DEMO ? (
                          <span style={{
                            background: p.TIPO_DEMO === 'DEMO_TALKME' ? '#dcfce7' : p.TIPO_DEMO === 'DEMO_PARTNER' ? '#fef9c3' : '#f3f4f6',
                            color: p.TIPO_DEMO === 'DEMO_TALKME' ? '#16a34a' : p.TIPO_DEMO === 'DEMO_PARTNER' ? '#ca8a04' : '#6b7280',
                            padding: '2px 8px',
                            borderRadius: '10px',
                            fontSize: '11px',
                            fontWeight: '600'
                          }}>
                            {p.TIPO_DEMO}
                          </span>
                        ) : (
                          <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                        )}
                      </td>
                      <td>
                        {p.NOMBRE_EMPRESA ? (
                          <div className="uso-info">
                            <small style={{ fontWeight: '500' }}>{p.NOMBRE_EMPRESA}</small>
                            <small className="text-muted">Bot ID: {p.ID_BOT}</small>
                          </div>
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                      <td>
                        <div className="acciones-row">
                          <button
                            className="cr-inst-btn cr-inst-btn-small cr-inst-btn-secondary"
                            onClick={() => handleEditar(p)}
                            title="Editar"
                          >
                            ✏️
                          </button>
                          {p.ESTADO === 'OCUPADO' && (
                            <button
                              className="cr-inst-btn cr-inst-btn-small cr-inst-btn-success"
                              onClick={() => handleLiberar(p.ID_PAGINA)}
                              title="Liberar"
                            >
                              🔓
                            </button>
                          )}
                          <button
                            className="cr-inst-btn cr-inst-btn-small cr-inst-btn-danger"
                            onClick={() => handleEliminar(p.ID_PAGINA)}
                            title="Eliminar"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {paginasPaginadas.length === 0 && (
                    <tr>
                      <td colSpan="10" className="text-center text-muted" style={{ padding: '40px' }}>
                        No se encontraron páginas con los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Controles de paginación */}
          {totalPaginas > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '16px',
              borderTop: '1px solid #e2e8f0',
              flexShrink: 0,
              backgroundColor: 'white'
            }}>
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={handlePaginaAnterior}
                disabled={paginaActual === 1}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                ◀ Anterior
              </button>

              <div style={{ display: 'flex', gap: '4px' }}>
                {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(pagina => (
                  <button
                    key={pagina}
                    onClick={() => setPaginaActual(pagina)}
                    style={{
                      width: '32px',
                      height: '32px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                      background: pagina === paginaActual ? '#3b82f6' : 'white',
                      color: pagina === paginaActual ? 'white' : '#64748b',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: pagina === paginaActual ? '600' : '400'
                    }}
                  >
                    {pagina}
                  </button>
                ))}
              </div>

              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={handlePaginaSiguiente}
                disabled={paginaActual === totalPaginas}
                style={{ padding: '6px 12px', fontSize: '12px' }}
              >
                Siguiente ▶
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        show={showEliminarModal}
        title="Eliminar Página"
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmEliminar}
        onCancel={() => {
          setShowEliminarModal(false);
          setPaginaToDelete(null);
        }}
      >
        <p>¿Está seguro de eliminar esta página?</p>
      </ConfirmModal>

      <ConfirmModal
        show={showLiberarModal}
        title="Liberar Página"
        confirmText="Liberar"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={confirmLiberar}
        onCancel={() => {
          setShowLiberarModal(false);
          setPaginaToLiberar(null);
        }}
      >
        <p>¿Liberar esta página? Se marcará como DISPONIBLE.</p>
      </ConfirmModal>
    </div>
  );
}

export default PaginasDemos;
