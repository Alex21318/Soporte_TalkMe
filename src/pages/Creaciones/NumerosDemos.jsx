import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { API_URLS } from '../../config/api';
import ConfirmModal from '../../components/ConfirmModal';

const AMBIENTES = ['DEMO_TALKME', 'DEMO_PARNET', 'DEMO_IA_TALK'];
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
  nombreApp: '',
  numero: '',
  authCode: '',
  appId: '',
  ambiente: 'DEMO_TALKME',
  estado: 'DISPONIBLE',
};

const ITEMS_POR_PAGINA = 10;

function NumerosDemos() {
  const [numeros, setNumeros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(DEFAULT_FORM);
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroAmbiente, setFiltroAmbiente] = useState('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [paginaActual, setPaginaActual] = useState(1);

  // ── Estados de validación ────────────────────────────────────────────────
  const [showValidar, setShowValidar] = useState(false);
  const [dbValidar, setDbValidar] = useState('');
  const [validando, setValidando] = useState(false);
  const [resultadoValidacion, setResultadoValidacion] = useState(null);

  // ── Estados de modales de confirmación ────────────────────────────────────
  const [showEliminarModal, setShowEliminarModal] = useState(false);
  const [showLiberarModal, setShowLiberarModal] = useState(false);
  const [numeroToDelete, setNumeroToDelete] = useState(null);
  const [numeroToLiberar, setNumeroToLiberar] = useState(null);

  // Cargar números al iniciar
  useEffect(() => {
    cargarNumeros();
  }, []);

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtroEstado, filtroAmbiente, busqueda]);

  const handleValidar = async () => {
    if (!dbValidar) {
      toast.error('Seleccione una base de datos para validar');
      return;
    }
    setValidando(true);
    setResultadoValidacion(null);
    try {
      const response = await fetchWithAuth(API_URLS.numerosDemosValidar(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbKey: dbValidar }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Error al validar');
      setResultadoValidacion(data);
      if (data.numerosActualizados > 0) {
        toast.success(`✓ ${data.numerosActualizados} números actualizados en ${data.segmento}`);
        cargarNumeros();
      } else {
        toast.info(`No se encontraron coincidencias en ${data.segmento}`);
      }
    } catch (error) {
      toast.error('Error al validar: ' + error.message);
    } finally {
      setValidando(false);
    }
  };

  const cargarNumeros = async () => {
    setLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.numerosDemos());
      if (!response.ok) throw new Error('Error al cargar números');
      const data = await response.json();
      setNumeros(data);
    } catch (error) {
      toast.error('Error al cargar números: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombreApp || !formData.numero) {
      toast.error('Nombre y número son obligatorios');
      return;
    }

    setLoading(true);
    try {
      const url = formData.id 
        ? `/api/numeros-demos/${formData.id}` 
        : '/api/numeros-demos';
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

      toast.success(formData.id ? 'Número actualizado' : 'Número creado');
      setShowForm(false);
      setFormData(DEFAULT_FORM);
      cargarNumeros();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditar = (numero) => {
    setFormData({
      id: numero.ID_NUMERO,
      nombreApp: numero.NOMBRE_APP,
      numero: numero.NUMERO,
      authCode: numero.AUTH_CODE || '',
      appId: numero.APP_ID || '',
      ambiente: numero.AMBIENTE,
      estado: numero.ESTADO,
    });
    setShowForm(true);
  };

  const handleEliminar = (id) => {
    setNumeroToDelete(id);
    setShowEliminarModal(true);
  };

  const confirmEliminar = async () => {
    setShowEliminarModal(false);
    const id = numeroToDelete;
    setNumeroToDelete(null);

    setLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.numerosDemos() + `/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error al eliminar');
      }

      toast.success('Número eliminado');
      cargarNumeros();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLiberar = async (id) => {
    setNumeroToLiberar(id);
    setShowLiberarModal(true);
  };

  const confirmLiberar = async () => {
    setShowLiberarModal(false);
    const id = numeroToLiberar;
    setNumeroToLiberar(null);

    setLoading(true);
    try {
      const response = await fetchWithAuth(API_URLS.numerosDemosLiberar(id), {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Error al liberar');

      toast.success('Número liberado');
      cargarNumeros();
    } catch (error) {
      toast.error('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const numerosFiltrados = numeros.filter(n => {
    const matchEstado = filtroEstado === 'TODOS' || n.ESTADO === filtroEstado;
    const matchAmbiente = filtroAmbiente === 'TODOS' || n.AMBIENTE === filtroAmbiente;
    const matchBusqueda = busqueda === '' || 
      n.NOMBRE_APP.toLowerCase().includes(busqueda.toLowerCase()) ||
      n.NUMERO.includes(busqueda) ||
      (n.AUTH_CODE && n.AUTH_CODE.toLowerCase().includes(busqueda.toLowerCase())) ||
      (n.APP_ID && n.APP_ID.toLowerCase().includes(busqueda.toLowerCase()));
    return matchEstado && matchAmbiente && matchBusqueda;
  });

  // Paginación tabla principal
  const totalPaginas = Math.ceil(numerosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (paginaActual - 1) * ITEMS_POR_PAGINA;
  const numerosPaginados = numerosFiltrados.slice(inicio, inicio + ITEMS_POR_PAGINA);

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
      <div className="cr-inst-header">
        <h2>
          <span className="cr-inst-header-icon">📱</span>
          Números Demos WhatsApp
        </h2>
        <div className="cr-inst-actions">
          <button
            className="cr-inst-btn cr-inst-btn-primary"
            onClick={() => {
              setFormData(DEFAULT_FORM);
              setShowForm(true);
            }}
            disabled={loading}
          >
            ➕ Nuevo Número
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={cargarNumeros}
            disabled={loading}
          >
            🔄 Recargar
          </button>
          <button
            className="cr-inst-btn"
            style={{ background: '#7c3aed', color: 'white', border: 'none' }}
            onClick={() => { setShowValidar(!showValidar); setResultadoValidacion(null); }}
            disabled={loading}
          >
            🔍 Validar en DB
          </button>
        </div>
      </div>

      {/* Panel de Validación en Base de Datos */}
      {showValidar && (
        <div className="cr-inst-section" style={{ border: '2px solid #7c3aed', borderRadius: '10px' }}>
          <div className="cr-inst-section-header" style={{ background: '#f5f3ff' }}>
            <h3 style={{ color: '#7c3aed' }}>🔍 Validar Números en Base de Datos</h3>
            <small style={{ color: '#6d28d9' }}>Consulta qué números están activos en demos y actualiza el mapeo</small>
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
                  background: resultadoValidacion.numerosActualizados > 0 ? '#f0fdf4' : '#fefce8',
                  border: `1px solid ${resultadoValidacion.numerosActualizados > 0 ? '#86efac' : '#fde047'}`,
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
                      Actualizados: <span style={{ color: '#dc2626' }}>{resultadoValidacion.numerosActualizados}</span>
                    </span>
                  </div>
                </div>

                {resultadoValidacion.detalles && resultadoValidacion.detalles.length > 0 && (
                  <table className="cr-inst-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr>
                        <th>Nombre App</th>
                        <th>Número</th>
                        <th>Empresa en DB</th>
                        <th>Bot</th>
                        <th>ID Bot Redes</th>
                        <th>Segmento</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resultadoValidacion.detalles.map((d, i) => (
                        <tr key={i}>
                          <td><strong>{d.nombreApp}</strong></td>
                          <td>{d.numero}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ fontWeight: '500' }}>{d.encontradoEn.nombreEmpresa}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>ID: {d.encontradoEn.idEmpresa}</span>
                            </div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
                              <span style={{ fontWeight: '500' }}>{d.encontradoEn.nombreBot}</span>
                              <span style={{ fontSize: '11px', color: '#64748b' }}>ID: {d.encontradoEn.idBot}</span>
                            </div>
                          </td>
                          <td>{d.encontradoEn.idBotRedes}</td>
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {resultadoValidacion.detalles && resultadoValidacion.detalles.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' }}>
                    ⚠️ No se encontraron coincidencias entre los números de la DB y los registrados en Demos
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>🔍 Filtros</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid-4">
            <div className="cr-inst-field">
              <label>Buscar</label>
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Nombre o número..."
                className="cr-inst-input"
              />
            </div>
            <div className="cr-inst-field">
              <label>Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="cr-inst-select"
              >
                <option value="TODOS">Todos</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div className="cr-inst-field">
              <label>Ambiente</label>
              <select
                value={filtroAmbiente}
                onChange={(e) => setFiltroAmbiente(e.target.value)}
                className="cr-inst-select"
              >
                <option value="TODOS">Todos</option>
                {AMBIENTES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div className="cr-inst-field" style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={() => {
                  setFiltroEstado('TODOS');
                  setFiltroAmbiente('TODOS');
                  setBusqueda('');
                }}
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="cr-inst-section">
          <div className="cr-inst-section-header">
            <h3>{formData.id ? '✏️ Editar Número' : '➕ Nuevo Número'}</h3>
          </div>
          <div className="cr-inst-section-body">
            <form onSubmit={handleSubmit}>
              <div className="cr-inst-grid-3">
                <div className="cr-inst-field">
                  <label>Nombre App *</label>
                  <input
                    type="text"
                    value={formData.nombreApp}
                    onChange={(e) => setFormData({...formData, nombreApp: e.target.value})}
                    placeholder="Ej: DemosTalkme24"
                    className="cr-inst-input"
                    required
                  />
                </div>
                <div className="cr-inst-field">
                  <label>Número *</label>
                  <input
                    type="text"
                    value={formData.numero}
                    onChange={(e) => setFormData({...formData, numero: e.target.value})}
                    placeholder="Ej: 50378248640"
                    className="cr-inst-input"
                    required
                  />
                </div>
                <div className="cr-inst-field">
                  <label>Ambiente</label>
                  <select
                    value={formData.ambiente}
                    onChange={(e) => setFormData({...formData, ambiente: e.target.value})}
                    className="cr-inst-select"
                  >
                    {AMBIENTES.map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="cr-inst-grid-2" style={{ marginTop: '12px' }}>
                <div className="cr-inst-field">
                  <label>Auth Code</label>
                  <input
                    type="text"
                    value={formData.authCode}
                    onChange={(e) => setFormData({...formData, authCode: e.target.value})}
                    placeholder="sk_..."
                    className="cr-inst-input"
                  />
                </div>
                <div className="cr-inst-field">
                  <label>App ID</label>
                  <input
                    type="text"
                    value={formData.appId}
                    onChange={(e) => setFormData({...formData, appId: e.target.value})}
                    placeholder="UUID..."
                    className="cr-inst-input"
                  />
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

      {/* Tabla de números */}
      <div className="cr-inst-section cr-inst-section-full">
        <div className="cr-inst-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3>📋 Lista de Números ({numerosFiltrados.length})</h3>
          {totalPaginas > 1 && (
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Página {paginaActual} de {totalPaginas}
            </div>
          )}
        </div>
        <div className="cr-inst-section-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="cr-inst-loading">
              <div className="cr-inst-spinner"></div>
              <span>Cargando números...</span>
            </div>
          ) : (
            <table className="cr-inst-table">
              <thead>
                <tr>
                  <th>Nombre App</th>
                  <th>Número</th>
                  <th>Auth Code</th>
                  <th>App ID</th>
                  <th>Ambiente</th>
                  <th>Estado</th>
                  <th>Segmento</th>
                  <th>Empresa/Bot</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {numerosPaginados.map((n) => (
                  <tr key={n.ID_NUMERO} className={n.ESTADO === 'OCUPADO' ? 'fila-ocupada' : ''}>
                    <td><strong>{n.NOMBRE_APP}</strong></td>
                    <td>{n.NUMERO}</td>
                    <td>
                      {n.AUTH_CODE ? (
                        <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {n.AUTH_CODE.substring(0, 20)}...
                        </code>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td>
                      {n.APP_ID ? (
                        <code style={{ fontSize: '11px', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>
                          {n.APP_ID.substring(0, 15)}...
                        </code>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td><span className="badge-ambiente">{n.AMBIENTE}</span></td>
                    <td>
                      <span className={`estado-badge ${getEstadoClass(n.ESTADO)}`}>
                        {n.ESTADO}
                      </span>
                    </td>
                    <td>
                      {n.SEGMENTO ? (
                        <span style={{
                          background: n.SEGMENTO.startsWith('F') ? '#ede9fe' : '#dbeafe',
                          color: n.SEGMENTO.startsWith('F') ? '#7c3aed' : '#1d4ed8',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: '600'
                        }}>{n.SEGMENTO}</span>
                      ) : (
                        <span className="text-muted" style={{ fontSize: '11px' }}>—</span>
                      )}
                    </td>
                    <td>
                      {n.NOMBRE_EMPRESA ? (
                        <div className="uso-info">
                          <small style={{ fontWeight: '500' }}>{n.NOMBRE_EMPRESA}</small>
                          <small className="text-muted">Bot ID: {n.ID_BOT}</small>
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="acciones-row">
                        <button
                          className="cr-inst-btn cr-inst-btn-small cr-inst-btn-secondary"
                          onClick={() => handleEditar(n)}
                          title="Editar"
                        >
                          ✏️
                        </button>
                        {n.ESTADO === 'OCUPADO' && (
                          <button
                            className="cr-inst-btn cr-inst-btn-small cr-inst-btn-success"
                            onClick={() => handleLiberar(n.ID_NUMERO)}
                            title="Liberar"
                          >
                            🔓
                          </button>
                        )}
                        <button
                          className="cr-inst-btn cr-inst-btn-small cr-inst-btn-danger"
                          onClick={() => handleEliminar(n.ID_NUMERO)}
                          title="Eliminar"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {numerosPaginados.length === 0 && (
                  <tr>
                    <td colSpan="9" className="text-center text-muted" style={{ padding: '40px' }}>
                      No se encontraron números con los filtros seleccionados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* Controles de paginación */}
          {totalPaginas > 1 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '8px', 
              padding: '16px',
              borderTop: '1px solid #e2e8f0'
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
        title="Eliminar Número"
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmEliminar}
        onCancel={() => {
          setShowEliminarModal(false);
          setNumeroToDelete(null);
        }}
      >
        <p>¿Está seguro de eliminar este número?</p>
      </ConfirmModal>

      <ConfirmModal
        show={showLiberarModal}
        title="Liberar Número"
        confirmText="Liberar"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={confirmLiberar}
        onCancel={() => {
          setShowLiberarModal(false);
          setNumeroToLiberar(null);
        }}
      >
        <p>¿Liberar este número? Se marcará como DISPONIBLE.</p>
      </ConfirmModal>
    </div>
  );
}

export default NumerosDemos;
