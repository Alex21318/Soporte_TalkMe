import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import ConfirmModal from '../../components/ConfirmModal';

// Componente para configurar usuarios QRM - Tabla expandible
export default function UsuariosQRM({ dbKey, idEmpresa, empresas, filtrosExternos, onFiltrosChange, onSociedadesMarcasChange }) {
  const [usuariosData, setUsuariosData] = useState([]);
  const [loading, setLoading] = useState({ usuarios: false, guardando: false });
  const [expandidos, setExpandidos] = useState(new Set());
  
  // Usar filtros externos (controlados desde Usuarios.jsx)
  const filtros = filtrosExternos || { usuario: '', sociedad: '', marca: '', canal: '' };
  const setFiltros = onFiltrosChange || (() => {});
  
  // Datos de configuración QRM del usuario logueado (para filtrar sociedades/marcas)
  const [configuracionQRM, setConfiguracionQRM] = useState([]);
  
  // Estado para edición masiva
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [configToDelete, setConfigToDelete] = useState(null);
  
  // Paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const itemsPorPagina = 20;
  
  // Forzar S2 - Esta vista solo funciona con S2
  const dbKeyS2 = 'db_2';
  const esS2 = true; // Siempre true, ya que forzamos S2

  // Cargar configuración QRM y usuarios al montar o cambiar empresa
  useEffect(() => {
    cargarConfiguracionQRMUsuario();
  }, []);

  // Cargar usuarios cuando cambia empresa
  useEffect(() => {
    if (!idEmpresa) return;
    cargarUsuarios();
  }, [idEmpresa]);

  // Cargar configuración QRM del usuario logueado para saber qué sociedades puede ver
  const cargarConfiguracionQRMUsuario = async () => {
    try {
      const res = await fetchWithAuth(`${API_URLS.qrmConfigUsuario()}?db_key=${dbKeyS2}`);
      const data = await res.json();
      if (res.ok) setConfiguracionQRM(data.data || []);
    } catch (e) { 
      // Silenciar error
    }
  };

  const cargarUsuarios = async () => {
    setLoading(prev => ({ ...prev, usuarios: true }));
    try {
      const res = await fetchWithAuth(`${API_URLS.usuariosQRM()}?db_key=${dbKeyS2}&id_empresa=${idEmpresa}`);
      const data = await res.json();
      if (res.ok) {
        setUsuariosData(data.data || []);
        // Calcular sociedades y marcas únicas para los filtros
        const sociedadesUnicas = [...new Set(data.data?.map(d => d.SOCIEDAD).filter(Boolean) || [])].sort();
        const marcasUnicas = [...new Set(data.data?.map(d => d.MARCA).filter(Boolean) || [])].sort();
        if (onSociedadesMarcasChange) {
          onSociedadesMarcasChange({ sociedades: sociedadesUnicas, marcas: marcasUnicas });
        }
      }
    } catch (e) { 
      toast.error('Error cargando usuarios'); 
    }
    finally { setLoading(prev => ({ ...prev, usuarios: false })); }
  };


  // Agrupar configuraciones por usuario
  const usuariosAgrupados = useMemo(() => {
    const grupos = {};
    usuariosData.forEach(config => {
      const idUsuario = config.ID_USUARIO;
      if (!grupos[idUsuario]) {
        grupos[idUsuario] = {
          id: idUsuario,
          nombre: config.NOMBRE_USUARIO,
          nombreCompleto: `${config.NOMBRE || ''} ${config.APELLIDO || ''}`.trim(),
          estado: config.ESTADO,
          configs: []
        };
      }
      grupos[idUsuario].configs.push(config);
    });
    return Object.values(grupos);
  }, [usuariosData]);

  // Aplicar filtros
  const usuariosFiltrados = useMemo(() => {
    return usuariosAgrupados.filter(usuario => {
      const matchUsuario = !filtros.usuario || 
        usuario.nombre.toLowerCase().includes(filtros.usuario.toLowerCase()) ||
        usuario.nombreCompleto.toLowerCase().includes(filtros.usuario.toLowerCase());
      
      const matchSociedad = !filtros.sociedad || 
        usuario.configs.some(c => c.SOCIEDAD?.toLowerCase().includes(filtros.sociedad.toLowerCase()));
      
      const matchMarca = !filtros.marca || 
        usuario.configs.some(c => c.MARCA?.toLowerCase().includes(filtros.marca.toLowerCase()));
      
      return matchUsuario && matchSociedad && matchMarca;
    });
  }, [usuariosAgrupados, filtros]);

  const toggleExpandido = (idUsuario) => {
    setExpandidos(prev => {
      const nuevo = new Set(prev);
      if (nuevo.has(idUsuario)) {
        nuevo.delete(idUsuario);
      } else {
        nuevo.add(idUsuario);
      }
      return nuevo;
    });
  };

  const toggleUsuarioSeleccionado = (idUsuario) => {
    const usuario = usuariosAgrupados.find(u => u.id === idUsuario);
    if (!usuario) return;
    
    setUsuariosSeleccionados(prev => {
      const yaSeleccionado = prev.some(u => u.id === idUsuario);
      if (yaSeleccionado) {
        return prev.filter(u => u.id !== idUsuario);
      }
      return [...prev, { id: idUsuario, nombre: usuario.nombre }];
    });
  };

  const guardarConfiguracion = async (idUsuario, config) => {
    setLoading(prev => ({ ...prev, guardando: true }));
    try {
      // Si tiene id_info_usuario, es edición
      const url = config.id_info_usuario
        ? `${API_URLS.usuariosQRM()}?db_key=${dbKeyS2}&id_info_usuario=${config.id_info_usuario}`
        : `${API_URLS.usuariosQRM()}?db_key=${dbKeyS2}`;
      const res = await fetchWithAuth(url, {
        method: config.id_info_usuario ? 'PUT' : 'POST',
        body: JSON.stringify({ id_usuario: idUsuario, ...config })
      });

      if (!res.ok) throw new Error('Error al guardar');
      toast.success(config.id_info_usuario ? 'Configuración QRM actualizada' : 'Configuración QRM guardada');
      cargarUsuarios();
    } catch (e) { toast.error('Error guardando: ' + e.message); }
    finally { setLoading(prev => ({ ...prev, guardando: false })); }
  };

  const eliminarConfiguracion = async (idInfoUsuario) => {
    setLoading(prev => ({ ...prev, guardando: true }));
    try {
      const res = await fetchWithAuth(`${API_URLS.usuariosQRM()}?db_key=${dbKeyS2}&id_info_usuario=${idInfoUsuario}`, {
        method: 'DELETE'
      });

      if (!res.ok) throw new Error('Error al eliminar');
      toast.success('Configuración QRM eliminada');
      cargarUsuarios();
    } catch (e) { toast.error('Error eliminando: ' + e.message); }
    finally { setLoading(prev => ({ ...prev, guardando: false })); }
  };

  const handleEliminar = (configId) => {
    setConfigToDelete(configId);
    setShowDeleteModal(true);
  };

  const confirmEliminar = () => {
    if (configToDelete) {
      eliminarConfiguracion(configToDelete);
    }
    setShowDeleteModal(false);
    setConfigToDelete(null);
  };

  const guardarMasivo = async (configuraciones) => {
    if (configuraciones.length === 0) {
      toast.warning('No hay configuraciones para guardar');
      return;
    }
    
    setLoading(prev => ({ ...prev, guardando: true }));
    try {
      const res = await fetchWithAuth(`${API_URLS.usuariosQRMMasivo()}?db_key=${dbKeyS2}`, {
        method: 'POST',
        body: JSON.stringify({ 
          configuraciones 
        })
      });
      
      if (!res.ok) throw new Error('Error al guardar');
      toast.success(`${configuraciones.length} usuarios configurados exitosamente`);
      setMostrarModalMasivo(false);
      setUsuariosSeleccionados([]);
      cargarUsuarios();
    } catch (e) { toast.error('Error guardando: ' + e.message); }
    finally { setLoading(prev => ({ ...prev, guardando: false })); }
  };

  // Obtener sociedades/marcas disponibles según configuración del usuario logueado
  const sociedadesDisponibles = configuracionQRM.length > 0 
    ? configuracionQRM.map(c => ({ id: c.ID_BOT_SOCIEDAD, nombre: c.SOCIEDAD + ' - ' + c.MARCA }))
    : [];

  if (!esS2) {
    return (
      <div className="usr-qrm-container">
        <div className="usr-qrm-error">
          <span className="usr-qrm-error-icon">⚠️</span>
          <h3>Solo disponible para Talkme S2</h3>
          <p>La configuración QRM solo está disponible para la base de datos S2.</p>
          <p>Por favor cambia a S2 usando el selector de base de datos.</p>
        </div>
      </div>
    );
  }

  // Calcular usuarios paginados
  const usuariosPaginados = useMemo(() => {
    const inicio = (paginaActual - 1) * itemsPorPagina;
    const fin = inicio + itemsPorPagina;
    return usuariosFiltrados.slice(inicio, fin);
  }, [usuariosFiltrados, paginaActual]);

  // Total de páginas
  const totalPaginas = Math.ceil(usuariosFiltrados.length / itemsPorPagina);
  
  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setPaginaActual(1);
  }, [filtros.usuario, filtros.sociedad, filtros.marca, filtros.canal]);

  return (
    <div className="usr-qrm-container">
      {/* Botón de configuración masiva - solo cuando hay selección */}
      {usuariosSeleccionados.length > 0 && (
        <div className="usr-qrm-action-bar">
          <button 
            className="usr-qrm-btn-masivo" 
            onClick={() => setMostrarModalMasivo(true)}
          >
            Configurar {usuariosSeleccionados.length} usuarios
          </button>
        </div>
      )}

      {/* Lista de usuarios QRM */}
      {loading.usuarios ? (
        <div className="usr-qrm-loading">Cargando usuarios...</div>
      ) : idEmpresa && usuariosFiltrados.length === 0 ? (
        <div className="usr-qrm-empty">No hay usuarios que coincidan con los filtros</div>
      ) : !idEmpresa ? (
        <div className="usr-qrm-empty"></div>
      ) : (
        <>
        <div className="usr-qrm-table-wrapper">
          <table className="usr-qrm-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '40px' }}></th>
                <th style={{ width: '35%' }}>Canal</th>
                <th style={{ width: '20%' }}>Sociedad</th>
                <th style={{ width: '15%' }}>Marca</th>
                <th style={{ width: '8%' }}>Depto</th>
                <th style={{ width: '8%' }}>Suc</th>
                <th style={{ width: '8%' }}>Vend</th>
                <th style={{ width: '20%' }}>Usuario QRM</th>
              </tr>
            </thead>
            <tbody>
              {usuariosPaginados.map(usuario => (
                <UsuarioQRMItem
                  key={usuario.id}
                  usuario={usuario}
                  expandido={expandidos.has(usuario.id)}
                  seleccionado={usuariosSeleccionados.some(u => u.id === usuario.id)}
                  onToggleExpand={() => toggleExpandido(usuario.id)}
                  onToggleSelect={() => toggleUsuarioSeleccionado(usuario.id)}
                  onGuardar={guardarConfiguracion}
                  onEliminar={handleEliminar}
                  loading={loading.guardando}
                />
              ))}
            </tbody>
          </table>
        </div>
      </>
      )}

      {/* Paginación */}
      {usuariosFiltrados.length > itemsPorPagina && (
        <div className="usr-qrm-pagination">
          <button 
            className="usr-qrm-page-btn" 
            onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
            disabled={paginaActual === 1}
          >
            ← Anterior
          </button>
          <span className="usr-qrm-page-info">
            Página {paginaActual} de {totalPaginas} ({usuariosFiltrados.length} total)
          </span>
          <button 
            className="usr-qrm-page-btn" 
            onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
            disabled={paginaActual === totalPaginas}
          >
            Siguiente →
          </button>
        </div>
      )}

      {mostrarModalMasivo && (
        <ModalConfiguracionMasiva
          usuariosSeleccionados={usuariosSeleccionados}
          onGuardar={guardarMasivo}
          onCancelar={() => setMostrarModalMasivo(false)}
          loading={loading.guardando}
        />
      )}

      <ConfirmModal
        show={showDeleteModal}
        title="Eliminar Configuración QRM"
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmEliminar}
        onCancel={() => {
          setShowDeleteModal(false);
          setConfigToDelete(null);
        }}
      >
        <p>¿Eliminar configuración QRM?</p>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>Esta acción no se puede deshacer.</p>
      </ConfirmModal>
    </div>
  );
}

// Componente de formulario de configuración QRM con flujo de 3 pasos
// idUsuarioTarget = el usuario al que se le está agregando/editando la configuración
function FormConfigQRM({ idUsuarioTarget, configInicial = null, onGuardar, onCancelar, loading }) {
  const dbKey = 'db_2'; // Forzar S2
  const [bots, setBots] = useState([]);
  const [canales, setCanales] = useState([]);
  const [sociedades, setSociedades] = useState([]);
  const [cargando, setCargando] = useState({ bots: false, canales: false, sociedades: false });
  
  // Estado del formulario
  const [formData, setFormData] = useState({
    id_bot: configInicial?.ID_BOT || '',
    id_bot_redes: '',
    id_bot_sociedad: configInicial?.ID_BOT_SOCIEDAD || '',
    id_departamento: configInicial?.ID_DEPARTAMENTO || '',
    id_sucursal: configInicial?.ID_SUCURSAL || '',
    id_vendedor: configInicial?.ID_VENDEDOR || '',
    usuario_qrm: configInicial?.USUARIO_QRM || ''
  });

  // Cargar BOTs al montar
  useEffect(() => {
    cargarBots();
  }, [dbKey]);

  // Cuando cambia el BOT, cargar canales y sociedades
  useEffect(() => {
    if (!formData.id_bot) {
      setCanales([]);
      setSociedades([]);
      return;
    }
    cargarCanales(formData.id_bot);
    cargarSociedades(formData.id_bot);
  }, [formData.id_bot]);

  const cargarBots = async () => {
    if (!idUsuarioTarget) return;
    setCargando(prev => ({ ...prev, bots: true }));
    try {
      // Pasar id_usuario_target para obtener los bots según los permisos de ESE usuario
      const res = await fetchWithAuth(`${API_URLS.qrmBots()}?db_key=${dbKey}&id_usuario_target=${idUsuarioTarget}`);
      const data = await res.json();
      if (res.ok) setBots(data.data || []);
    } catch (e) { /* Silenciar */ }
    finally { setCargando(prev => ({ ...prev, bots: false })); }
  };

  const cargarCanales = async (idBot) => {
    if (!idUsuarioTarget || !idBot) return;
    setCargando(prev => ({ ...prev, canales: true }));
    try {
      // Pasar id_usuario_target para obtener los canales según los permisos de ESE usuario
      const res = await fetchWithAuth(`${API_URLS.qrmCanales(idBot)}&db_key=${dbKey}&id_usuario_target=${idUsuarioTarget}`);
      const data = await res.json();
      if (res.ok) setCanales(data.data || []);
    } catch (e) { /* Silenciar */ }
    finally { setCargando(prev => ({ ...prev, canales: false })); }
  };

  const cargarSociedades = async (idBot) => {
    setCargando(prev => ({ ...prev, sociedades: true }));
    try {
      const res = await fetchWithAuth(`${API_URLS.qrmSociedades(idBot)}&db_key=${dbKey}`);
      const data = await res.json();
      if (res.ok) {
        setSociedades(data.data || []);
        if (data.data?.length === 1) {
          setFormData(prev => ({ ...prev, id_bot_sociedad: data.data[0].ID_BOT_SOCIEDAD }));
        }
      }
    } catch (e) { /* Silenciar */ }
    finally { setCargando(prev => ({ ...prev, sociedades: false })); }
  };

  const handleSubmit = () => {
    if (!formData.id_bot_sociedad) {
      toast.warning('Seleccione una sociedad/marca');
      return;
    }
    onGuardar({
      id_bot_sociedad: formData.id_bot_sociedad,
      id_departamento: formData.id_departamento,
      id_sucursal: formData.id_sucursal,
      id_vendedor: formData.id_vendedor,
      usuario_qrm: formData.usuario_qrm
    });
  };

  return (
    <>
      {/* Columnas vacías: Checkbox + Expand */}
      <td style={{ padding: 0 }}></td>
      <td style={{ padding: 0 }}></td>

      {/* Columna Canal */}
      <td style={{ padding: '6px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Canal:</label>
        <select
          value={formData.id_bot}
          onChange={e => setFormData({ ...formData, id_bot: e.target.value, id_bot_sociedad: '' })}
          className="usr-qrm-input-select"
          disabled={cargando.bots}
          style={{ width: '100%', fontSize: '12px' }}
        >
          <option value="">{cargando.bots ? 'Cargando...' : 'Seleccione...'}</option>
          {bots.map(b => (
            <option key={b.ID_BOT} value={b.ID_BOT}>{b.NOMBRE_BOT}</option>
          ))}
        </select>
      </td>

      {/* Columnas Sociedad + Marca (combinadas) */}
      <td colSpan="2" style={{ padding: '6px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Sociedad/Marca:</label>
        {sociedades.length === 1 ? (
          <div style={{ fontSize: '12px', padding: '4px 6px', background: '#f3f4f6', borderRadius: '4px' }}>
            {sociedades[0].SOCIEDAD} - {sociedades[0].MARCA}
          </div>
        ) : (
          <select
            value={formData.id_bot_sociedad}
            onChange={e => setFormData({ ...formData, id_bot_sociedad: e.target.value })}
            className="usr-qrm-input-select"
            disabled={!formData.id_bot || cargando.sociedades || sociedades.length === 0}
            style={{ width: '100%', fontSize: '12px' }}
          >
            <option value="">
              {!formData.id_bot ? 'Primero Canal' : 
               cargando.sociedades ? 'Cargando...' : 
               sociedades.length === 0 ? 'Sin sociedades' : 'Seleccione...'}
            </option>
            {sociedades.map(s => (
              <option key={s.ID_BOT_SOCIEDAD} value={s.ID_BOT_SOCIEDAD}>
                {s.SOCIEDAD} - {s.MARCA}
              </option>
            ))}
          </select>
        )}
      </td>

      {/* Columna Depto */}
      <td style={{ padding: '6px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Depto:</label>
        <input 
          type="number" 
          placeholder="Depto" 
          value={formData.id_departamento} 
          onChange={e => setFormData({...formData, id_departamento: e.target.value})}
          style={{ width: '100%', fontSize: '12px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', height: '28px', boxSizing: 'border-box' }}
        />
      </td>

      {/* Columna Suc */}
      <td style={{ padding: '6px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Suc:</label>
        <input 
          type="number" 
          placeholder="Suc" 
          value={formData.id_sucursal} 
          onChange={e => setFormData({...formData, id_sucursal: e.target.value})}
          style={{ width: '100%', fontSize: '12px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', height: '28px', boxSizing: 'border-box' }}
        />
      </td>

      {/* Columna Vend */}
      <td style={{ padding: '6px' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Vend:</label>
        <input 
          type="number" 
          placeholder="Vend" 
          value={formData.id_vendedor} 
          onChange={e => setFormData({...formData, id_vendedor: e.target.value})}
          style={{ width: '100%', fontSize: '12px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', height: '28px', boxSizing: 'border-box' }}
        />
      </td>

      {/* Columna Usuario QRM + Botones */}
      <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
        <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>Usuario QRM:</label>
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="Usuario QRM" 
            value={formData.usuario_qrm} 
            onChange={e => setFormData({...formData, usuario_qrm: e.target.value})}
            style={{ flex: 1, fontSize: '12px', padding: '4px 6px', border: '1px solid #d1d5db', borderRadius: '4px', height: '28px', boxSizing: 'border-box', minWidth: '80px' }}
          />
          <button 
            className="usr-qrm-btn-guardar-mini" 
            onClick={handleSubmit} 
            disabled={loading || !formData.id_bot_sociedad}
            title="Guardar"
          >
            💾
          </button>
          <button 
            className="usr-qrm-btn-cancelar-mini" 
            onClick={onCancelar} 
            title="Cancelar"
          >
            ✕
          </button>
        </div>
      </td>
    </>
  );
}

// Componente de item de usuario con sus configs debajo (estructura de tabla)
function UsuarioQRMItem({ usuario, expandido, seleccionado, onToggleExpand, onToggleSelect, onGuardar, onEliminar, loading }) {
  const dbKey = 'db_2'; // Forzar S2
  const [agregando, setAgregando] = useState(false);
  const [editando, setEditando] = useState(null); // ID de config en edición
  const [editConfigData, setEditConfigData] = useState(null);
  const [menuContextual, setMenuContextual] = useState({ visible: false, x: 0, y: 0, config: null });

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    if (!menuContextual.visible) return;
    const handleClick = () => setMenuContextual({ visible: false, x: 0, y: 0, config: null });
    const timer = setTimeout(() => {
      document.addEventListener('click', handleClick, { once: true });
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClick);
    };
  }, [menuContextual.visible]);

  const configsValidas = usuario.configs.filter(c => c.ID_INFO_USUARIO);
  const tieneConfigs = configsValidas.length > 0;

  const handleGuardar = (configData) => {
    onGuardar(usuario.id, configData);
    setAgregando(false);
  };

  const handleGuardarEdicion = (configData) => {
    onGuardar(usuario.id, { ...configData, id_info_usuario: editando });
    setEditando(null);
    setEditConfigData(null);
  };

  const handleContextMenu = (e, config = null) => {
    e.preventDefault();
    setMenuContextual({ visible: true, x: e.clientX, y: e.clientY, config });
  };

  const cerrarMenu = () => {
    setMenuContextual({ visible: false, x: 0, y: 0, config: null });
  };

  return (
    <>
      {/* Fila del usuario - Siempre visible con nombre */}
      <tr 
        className={`usr-qrm-tr-header ${expandido ? 'expandido' : ''} ${seleccionado ? 'seleccionado' : ''}`}
        onContextMenu={(e) => handleContextMenu(e, null)}
      >
        <td>
          <input type="checkbox" checked={seleccionado} onChange={onToggleSelect} />
        </td>
        <td>
          <button className="usr-qrm-expand-btn" onClick={onToggleExpand}>
            {expandido ? '▼' : '▶'}
          </button>
        </td>
        {/* Columna Canal muestra el usuario SIEMPRE */}
        <td className="usr-qrm-td-canal" colSpan={expandido ? 8 : 8}>
          <div className="usr-qrm-usuario-row">
            <span className="usr-qrm-usuario-nombre">{usuario.nombre}</span>
            {tieneConfigs && (
              <span className="usr-qrm-contador-small">{configsValidas.length} config{configsValidas.length !== 1 ? 's' : ''}</span>
            )}
            {!tieneConfigs && (
              <span className="usr-qrm-sin-config">Sin configuración</span>
            )}
          </div>
        </td>
      </tr>

      {/* Filas de configuraciones expandidas (solo cuando esta expandido) */}
      {expandido && configsValidas.map((config) => (
        editando === config.ID_INFO_USUARIO ? (
          // Fila en modo edición - Usar FormConfigQRM
          <tr key={`edit-${config.ID_INFO_USUARIO}`} className="usr-qrm-tr-config usr-qrm-tr-editing">
            <FormConfigQRM
              idUsuarioTarget={usuario.id}
              configInicial={config}
              onGuardar={handleGuardarEdicion}
              onCancelar={() => setEditando(null)}
              loading={loading}
            />
          </tr>
        ) : (
          // Fila normal (no edición)
          <tr key={config.ID_INFO_USUARIO} className="usr-qrm-tr-config" onContextMenu={(e) => handleContextMenu(e, config)}>
            <td></td>
            <td></td>
            <td className="usr-qrm-td-canal-nombre">
              {config.MARCA || '—'} {config.SOCIEDAD?.includes('Guatemala') ? 'Guatemala' : config.SOCIEDAD?.includes('Honduras') ? 'Honduras' : config.SOCIEDAD?.includes('Costa Rica') ? 'Costa Rica' : config.SOCIEDAD?.includes('Panamá') ? 'Panamá' : ''}
            </td>
            <td>{config.SOCIEDAD || '—'}</td>
            <td>{config.MARCA || '—'}</td>
            <td>{config.ID_DEPARTAMENTO || '—'}</td>
            <td>{config.ID_SUCURSAL || '—'}</td>
            <td>{config.ID_VENDEDOR || '—'}</td>
            <td>{config.USUARIO_QRM || '—'}</td>
          </tr>
        )
      ))}

      {/* Fila para agregar nueva configuración - Usar FormConfigQRM */}
      {agregando && (
        <tr className="usr-qrm-tr-nueva">
          <FormConfigQRM
            idUsuarioTarget={usuario.id}
            onGuardar={handleGuardar}
            onCancelar={() => setAgregando(false)}
            loading={loading}
          />
        </tr>
      )}

      {/* Menú contextual - Renderizado con Portal fuera del tbody */}
      {menuContextual.visible && createPortal(
        <div className="usr-qrm-menu-contextual" style={{ top: menuContextual.y, left: menuContextual.x }}>
          {menuContextual.config ? (
            // Menú para configuración específica (sobre una fila de config)
            <>
              <div className="usr-qrm-menu-item" onClick={() => {
                const config = menuContextual.config;
                if (config) {
                  setEditando(config.ID_INFO_USUARIO);
                  setEditConfigData(config);
                }
                setMenuContextual({ visible: false, x: 0, y: 0, config: null });
              }}>
                ✏️ Editar
              </div>
              <div className="usr-qrm-menu-item" onClick={() => {
                setAgregando(true);
                if (!expandido) onToggleExpand();
                setMenuContextual({ visible: false, x: 0, y: 0, config: null });
              }}>
                ➕ Agregar nueva
              </div>
              <div className="usr-qrm-menu-item usr-qrm-menu-item-danger" onClick={() => {
                const config = menuContextual.config;
                if (config && config.ID_INFO_USUARIO) {
                  onEliminar(config.ID_INFO_USUARIO);
                }
                setMenuContextual({ visible: false, x: 0, y: 0, config: null });
              }}>
                🗑️ Eliminar
              </div>
            </>
          ) : (
            // Menú para usuario sin configuraciones
            <>
              <div className="usr-qrm-menu-header">
                {usuario.nombre}
              </div>
              <div className="usr-qrm-menu-item" onClick={() => {
                setAgregando(true);
                if (!expandido) onToggleExpand();
                setMenuContextual({ visible: false, x: 0, y: 0, config: null });
              }}>
                ➕ Agregar configuración
              </div>
            </>
          )}
        </div>,
        document.body
      )}
    </>
  );
}

// Modal mejorado para configuración masiva con canales por usuario
function ModalConfiguracionMasiva({ usuariosSeleccionados, onGuardar, onCancelar, loading }) {
  const [configuracionesPorUsuario, setConfiguracionesPorUsuario] = useState({});
  const [canalesPorUsuario, setCanalesPorUsuario] = useState({});
  const [loadingCanales, setLoadingCanales] = useState({});
  const dbKey = 'db_2';

  // Inicializar configuraciones vacías para cada usuario (array para múltiples configs)
  useEffect(() => {
    const inicial = {};
    usuariosSeleccionados.forEach(u => {
      inicial[u.id] = [
        {
          id_bot_redes: '',
          id_departamento: '',
          id_sucursal: '',
          id_vendedor: '',
          usuario_qrm: ''
        }
      ];
    });
    setConfiguracionesPorUsuario(inicial);
  }, [usuariosSeleccionados]);

  // Cargar canales disponibles para cada usuario
  useEffect(() => {
    usuariosSeleccionados.forEach(async (u) => {
      const idUsuario = u.id;
      setLoadingCanales(prev => ({ ...prev, [idUsuario]: true }));
      try {
        const res = await fetchWithAuth(`${API_URLS.botRedesPorUsuario()}?db_key=${dbKey}&id_usuario=${idUsuario}`);
        const data = await res.json();
        if (res.ok) {
          setCanalesPorUsuario(prev => ({ 
            ...prev, 
            [idUsuario]: data.data || [] 
          }));
        }
      } catch (e) {
        console.error(`Error cargando canales para usuario ${idUsuario}:`, e);
      } finally {
        setLoadingCanales(prev => ({ ...prev, [idUsuario]: false }));
      }
    });
  }, [usuariosSeleccionados]);

  const actualizarConfiguracion = (idUsuario, configIndex, campo, valor) => {
    setConfiguracionesPorUsuario(prev => {
      const configs = [...(prev[idUsuario] || [])];
      configs[configIndex] = {
        ...configs[configIndex],
        [campo]: valor
      };
      return {
        ...prev,
        [idUsuario]: configs
      };
    });
  };

  const agregarConfiguracion = (idUsuario) => {
    setConfiguracionesPorUsuario(prev => ({
      ...prev,
      [idUsuario]: [
        ...(prev[idUsuario] || []),
        {
          id_bot_redes: '',
          id_departamento: '',
          id_sucursal: '',
          id_vendedor: '',
          usuario_qrm: ''
        }
      ]
    }));
  };

  const eliminarConfiguracion = (idUsuario, configIndex) => {
    setConfiguracionesPorUsuario(prev => {
      const configs = [...(prev[idUsuario] || [])];
      if (configs.length > 1) {
        configs.splice(configIndex, 1);
      }
      return {
        ...prev,
        [idUsuario]: configs
      };
    });
  };

  const handleGuardar = () => {
    const configuracionesParaGuardar = [];
    const camposIncompletos = [];
    
    usuariosSeleccionados.forEach(u => {
      const idUsuario = u.id;
      const configs = configuracionesPorUsuario[idUsuario] || [];
      configs.forEach((config, idx) => {
        // Validar que todos los campos obligatorios estén llenos
        if (!config.id_bot_redes || !config.id_departamento || !config.id_sucursal || 
            !config.id_vendedor || !config.usuario_qrm) {
          camposIncompletos.push(`${u.nombre} (Config ${idx + 1})`);
          return;
        }
        
        configuracionesParaGuardar.push({
          id_usuario: idUsuario,
          ...config
        });
      });
    });

    if (camposIncompletos.length > 0) {
      toast.warning(`Complete todos los campos obligatorios: ${camposIncompletos.join(', ')}`);
      return;
    }

    if (configuracionesParaGuardar.length === 0) {
      toast.warning('Por favor, configure al menos un canal');
      return;
    }

    onGuardar(configuracionesParaGuardar);
  };

  const obtenerSociedadMarca = (idUsuario, idBotSociedad) => {
    const bots = canalesPorUsuario[idUsuario] || [];
    const bot = bots.find(b => String(b.ID_BOT_SOCIEDAD) === String(idBotSociedad));
    
    if (!bot) return { sociedad: '', marca: '' };
    
    return {
      sociedad: bot.SOCIEDAD || '',
      marca: bot.MARCA || ''
    };
  };

  return (
    <div className="usr-qrm-modal-overlay">
      <div className="usr-qrm-modal usr-qrm-modal-masivo">
        <div className="usr-qrm-modal-header">
          <h3>Configuración Masiva QRM</h3>
          <p className="usr-qrm-modal-subtitle">
            Configurando {usuariosSeleccionados.length} usuario{usuariosSeleccionados.length !== 1 ? 's' : ''}
          </p>
        </div>
        
        <div className="usr-qrm-modal-content">
          {usuariosSeleccionados.map(u => {
            const idUsuario = u.id;
            const configs = configuracionesPorUsuario[idUsuario] || [];
            const canales = canalesPorUsuario[idUsuario] || [];
            const loading = loadingCanales[idUsuario];

            return (
              <div key={idUsuario} className="usr-qrm-usuario-config">
                <div className="usr-qrm-usuario-header">
                  <span className="usr-qrm-usuario-id">{u.nombre} (ID: {idUsuario})</span>
                  <button 
                    className="usr-qrm-add-config-btn"
                    onClick={() => agregarConfiguracion(idUsuario)}
                    title="Agregar otra configuración"
                  >
                    +
                  </button>
                </div>
                
                {configs.map((config, configIndex) => {
                  const sociedadMarca = config.id_bot_redes ? 
                    obtenerSociedadMarca(idUsuario, config.id_bot_redes) : 
                    { sociedad: '', marca: '' };

                  return (
                    <div key={configIndex} className="usr-qrm-config-item">
                      {configs.length > 1 && (
                        <button 
                          className="usr-qrm-remove-config-btn"
                          onClick={() => eliminarConfiguracion(idUsuario, configIndex)}
                          title="Eliminar configuración"
                        >
                          ×
                        </button>
                      )}
                      
                      <div className="usr-qrm-config-row">
                        <div className="usr-qrm-field-group">
                          <label>Canal:</label>
                          {loading ? (
                            <div className="usr-qrm-loading-small">Cargando...</div>
                          ) : (
                            <select 
                              value={config.id_bot_redes || ''} 
                              onChange={e => actualizarConfiguracion(idUsuario, configIndex, 'id_bot_redes', e.target.value)}
                              className="usr-qrm-select-canal"
                            >
                              <option value="">Seleccionar...</option>
                              {canales.map(bot => (
                                <option key={`${bot.ID_BOT}-${bot.SOCIEDAD}-${bot.MARCA}`} value={bot.ID_BOT_SOCIEDAD}>
                                  {bot.NOMBRE_BOT}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                        
                        <div className="usr-qrm-field-group">
                          <label>Sociedad / Marca:</label>
                          <input 
                            type="text" 
                            value={sociedadMarca.sociedad && sociedadMarca.marca ? `${sociedadMarca.sociedad} / ${sociedadMarca.marca}` : ''} 
                            readOnly
                            className="usr-qrm-readonly"
                            placeholder="Autocompletar"
                          />
                        </div>

                        <div className="usr-qrm-field-group">
                          <label>ID Depto: *</label>
                          <input 
                            type="number" 
                            value={config.id_departamento || ''} 
                            onChange={e => actualizarConfiguracion(idUsuario, configIndex, 'id_departamento', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="usr-qrm-field-group">
                          <label>ID Suc: *</label>
                          <input 
                            type="number" 
                            value={config.id_sucursal || ''} 
                            onChange={e => actualizarConfiguracion(idUsuario, configIndex, 'id_sucursal', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="usr-qrm-field-group">
                          <label>ID Vend: *</label>
                          <input 
                            type="number" 
                            value={config.id_vendedor || ''} 
                            onChange={e => actualizarConfiguracion(idUsuario, configIndex, 'id_vendedor', e.target.value)}
                            required
                          />
                        </div>

                        <div className="usr-qrm-field-group">
                          <label>Usuario QRM: *</label>
                          <input 
                            type="text" 
                            value={config.usuario_qrm || ''} 
                            onChange={e => actualizarConfiguracion(idUsuario, configIndex, 'usuario_qrm', e.target.value)}
                            placeholder="usuario@grupoq.com"
                            required
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        
        <div className="usr-qrm-modal-actions">
          <button className="usr-qrm-btn-cancelar" onClick={onCancelar}>Cancelar</button>
          <button className="usr-qrm-btn-guardar" onClick={handleGuardar} disabled={loading}>
            {loading ? 'Guardando...' : `Guardar configuración${usuariosSeleccionados.length !== 1 ? 'es' : ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}