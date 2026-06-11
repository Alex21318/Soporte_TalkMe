import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { API_URLS } from '../../config/api';
import ConfirmModal from '../../components/ConfirmModal';

// ── Bases de datos disponibles ─────────────────────────────────────────────
const DB_NAMES = {
  'db_1': 'Talkme S1 (wss.talkme.pro)',
  'db_2': 'Talkme S2 (cloud-s2)',
  'db_3': 'Talkme S3 (cloud-s3)',
  'db_4': 'Talkme S4 (cloud-s4)',
  'db_5': 'Talkme MDD (cloud-mdd)',
};

// ── URLs por defecto según servidor ────────────────────────────────────────
const SERVER_URL_PRESETS = {
  'db_1': ['https://wss.talkme.pro', 'https://plantillas.talkme.pro'],
  'db_2': ['https://cloud-s2.talkme.pro', 'https://plantillas.talkme.pro'],
  'db_3': ['https://cloud-s3.talkme.pro', 'https://plantillas.talkme.pro'],
  'db_4': ['https://cloud-s4.talkme.pro', 'https://plantillas.talkme.pro'],
  'db_5': ['https://cloud-mdd.talkme.pro', 'https://plantillas.talkme.pro'],
};

// ── Valores por defecto ───────────────────────────────────────────────────
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

const DEFAULT_VALUES = {
  dbKey: 'db_2',
  idEmpresa: '',
  idBot: '',
  idBotRedes: '',
  nombreApp: '',
  numero: '',
  appId: '',
  authCode: '',
  creadoPor: getUsuarioLogueado(),
};

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Log Detallado de Integración (reutilizable WhatsApp / FB / IG)
// Muestra resumen + lista expandible de operaciones realizadas
// ═══════════════════════════════════════════════════════════════════════════════
export function LogIntegracion({ resumen, log }) {
  const [expandido, setExpandido] = useState(false);
  if (!resumen) return null;

  const COLORES = {
    creado:       { bg: '#dcfce7', color: '#166534', icon: '✨' },
    creada:       { bg: '#dcfce7', color: '#166534', icon: '✨' },
    actualizado:  { bg: '#dbeafe', color: '#1e40af', icon: '🔄' },
    actualizada:  { bg: '#dbeafe', color: '#1e40af', icon: '🔄' },
    ya_existia:   { bg: '#fef3c7', color: '#92400e', icon: '📦' },
    sin_cambios:  { bg: '#f1f5f9', color: '#475569', icon: '✓' },
    advertencia:  { bg: '#fef2f2', color: '#991b1b', icon: '⚠️' },
  };

  return (
    <div style={{ marginTop: 12 }}>
      {/* Resumen */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
        {Object.entries(resumen).map(([k, v]) => v > 0 && (
          <div
            key={k}
            style={{
              padding: '6px 12px',
              borderRadius: 8,
              background: COLORES[k]?.bg || '#f1f5f9',
              color: COLORES[k]?.color || '#475569',
              fontSize: 12,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{COLORES[k]?.icon || '•'}</span>
            <span>{v} {k.replace('_', ' ')}</span>
          </div>
        ))}
      </div>

      {/* Toggle log detallado */}
      {log && log.length > 0 && (
        <>
          <button
            onClick={() => setExpandido(!expandido)}
            style={{
              background: 'transparent',
              border: '1px solid var(--tm-border)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              cursor: 'pointer',
              color: 'var(--tm-text-soft)',
              fontWeight: 600,
            }}
          >
            {expandido ? '▼ Ocultar' : '▶ Ver'} detalle ({log.length} operaciones)
          </button>
          {expandido && (
            <div style={{
              marginTop: 10,
              maxHeight: 320,
              overflowY: 'auto',
              border: '1px solid var(--tm-border)',
              borderRadius: 8,
              background: '#f8fafc',
            }}>
              {log.map((entry, idx) => {
                const c = COLORES[entry.accion] || { bg: '#f1f5f9', color: '#475569', icon: '•' };
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '8px 12px',
                      borderBottom: idx < log.length - 1 ? '1px solid #e2e8f0' : 'none',
                      fontSize: 12,
                      display: 'flex',
                      gap: 10,
                      alignItems: 'flex-start',
                    }}
                  >
                    <span style={{ flexShrink: 0 }}>{c.icon}</span>
                    <span style={{
                      padding: '1px 8px',
                      borderRadius: 4,
                      background: c.bg,
                      color: c.color,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      flexShrink: 0,
                    }}>
                      {entry.accion}
                    </span>
                    <span style={{ color: '#334155', wordBreak: 'break-word', flex: 1 }}>{entry.detalle}</span>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Buscador de Números Demos (Searchable)
// ═══════════════════════════════════════════════════════════════════════════════
function NumeroDemoSearchable({ numeros, loading, onSeleccionar, seleccionado }) {
  const [busqueda, setBusqueda] = useState('');
  const [mostrarDropdown, setMostrarDropdown] = useState(false);
  const [seleccionadoData, setSeleccionadoData] = useState(null);
  const [paginaDropdown, setPaginaDropdown] = useState(1);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const ITEMS_DROPDOWN = 5;
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  const calcularPosicion = () => {
    if (inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
  };

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setMostrarDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Actualizar datos del seleccionado cuando cambia
  useEffect(() => {
    if (seleccionado) {
      const num = numeros.find(n => n.ID_NUMERO === parseInt(seleccionado));
      setSeleccionadoData(num || null);
      if (num) setBusqueda(`${num.NOMBRE_APP} (${num.NUMERO})`);
    } else {
      setSeleccionadoData(null);
      setBusqueda('');
    }
  }, [seleccionado, numeros]);

  // Resetear página al cambiar búsqueda
  useEffect(() => { setPaginaDropdown(1); }, [busqueda]);

  // Lista a mostrar: si hay texto busca, si no muestra todos paginados
  const listaBase = seleccionadoData
    ? []
    : busqueda
      ? numeros.filter(n =>
          n.NOMBRE_APP.toLowerCase().includes(busqueda.toLowerCase()) ||
          n.NUMERO.includes(busqueda)
        )
      : numeros;

  const totalPaginasDropdown = Math.ceil(listaBase.length / ITEMS_DROPDOWN);
  const inicioPag = (paginaDropdown - 1) * ITEMS_DROPDOWN;
  const listaVisible = listaBase.slice(inicioPag, inicioPag + ITEMS_DROPDOWN);

  const handleSeleccion = (numero) => {
    onSeleccionar(numero.ID_NUMERO);
    setBusqueda(`${numero.NOMBRE_APP} (${numero.NUMERO})`);
    setMostrarDropdown(false);
    setSeleccionadoData(numero);
  };

  const handleLimpiar = () => {
    setBusqueda('');
    setSeleccionadoData(null);
    onSeleccionar('');
    setPaginaDropdown(1);
    setMostrarDropdown(true);
  };

  const handleInputChange = (e) => {
    const valor = e.target.value;
    setBusqueda(valor);
    if (seleccionadoData && valor !== `${seleccionadoData.NOMBRE_APP} (${seleccionadoData.NUMERO})`) {
      setSeleccionadoData(null);
      onSeleccionar('');
    }
    setMostrarDropdown(true);
  };

  return (
    <div ref={wrapperRef} className="cr-inst-field" style={{ marginBottom: '16px', position: 'relative' }}>
      <label>Seleccionar Número Demo (opcional)</label>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <input
            type="text"
            className="cr-inst-input"
            placeholder={loading ? 'Cargando números...' : 'Escriba para buscar número demo...'}
            value={busqueda}
            onChange={handleInputChange}
            ref={inputRef}
            onFocus={() => { calcularPosicion(); setMostrarDropdown(true); }}
            disabled={loading}
            style={{ 
              width: '100%', 
              paddingRight: seleccionadoData ? '80px' : '40px',
              backgroundColor: seleccionadoData ? '#dcfce7' : 'white'
            }}
          />
          {/* Indicador de seleccionado */}
          {seleccionadoData && (
            <span 
              style={{
                position: 'absolute',
                right: '40px',
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: '11px',
                color: '#166534',
                background: '#86efac',
                padding: '2px 8px',
                borderRadius: '10px',
                fontWeight: '600'
              }}
            >
              ✓ Seleccionado
            </span>
          )}
          {/* Botón limpiar/X */}
          {(busqueda || seleccionadoData) && (
            <button
              onClick={handleLimpiar}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '18px',
                color: '#64748b',
                padding: '4px',
                lineHeight: 1
              }}
              title="Limpiar selección"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Dropdown de resultados con paginación — fixed para no ser cortado por overflow */}
      {mostrarDropdown && !seleccionadoData && !loading && (
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            background: 'white',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.18)',
            zIndex: 99999,
          }}
        >
          {/* Header con conteo */}
          <div style={{ padding: '7px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '11px', color: '#64748b', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderRadius: '8px 8px 0 0', background: '#f8fafc' }}>
            <span>
              {busqueda
                ? `${listaBase.length} resultado${listaBase.length !== 1 ? 's' : ''} para "${busqueda}"`
                : `${listaBase.length} número${listaBase.length !== 1 ? 's' : ''} disponibles`
              }
            </span>
            {totalPaginasDropdown > 1 && (
              <span style={{ color: '#94a3b8', fontWeight: '600' }}>Pág. {paginaDropdown} / {totalPaginasDropdown}</span>
            )}
          </div>

          {/* Lista de resultados — SIN overflow propio, altura fija por n items */}
          {listaVisible.length > 0 ? (
            listaVisible.map((n) => (
              <div
                key={n.ID_NUMERO}
                onClick={() => handleSeleccion(n)}
                style={{
                  padding: '9px 12px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'white',
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'white'}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: '600', fontSize: '13px', color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {n.NOMBRE_APP}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>📱 {n.NUMERO}</span>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                  <span style={{
                    background: n.AMBIENTE === 'DEMO_TALKME' ? '#dcfce7' : n.AMBIENTE === 'DEMO_PARNET' ? '#e0e7ff' : '#fef3c7',
                    color: n.AMBIENTE === 'DEMO_TALKME' ? '#166534' : n.AMBIENTE === 'DEMO_PARNET' ? '#3730a3' : '#92400e',
                    padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '500'
                  }}>{n.AMBIENTE}</span>
                  {n.SEGMENTO && (
                    <span style={{
                      background: n.SEGMENTO.startsWith('F') ? '#ede9fe' : '#dbeafe',
                      color: n.SEGMENTO.startsWith('F') ? '#7c3aed' : '#1d4ed8',
                      padding: '1px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: '600'
                    }}>{n.SEGMENTO}</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: '16px 12px', textAlign: 'center', fontSize: '13px', color: '#64748b' }}>
              {busqueda ? `Sin resultados para "${busqueda}"` : 'No hay números disponibles'}
            </div>
          )}

          {/* Controles de paginación — SIEMPRE visible al pie del dropdown */}
          {totalPaginasDropdown > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 12px', borderTop: '2px solid #e2e8f0', background: '#f8fafc', borderRadius: '0 0 8px 8px' }}>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (paginaDropdown > 1) setPaginaDropdown(p => p - 1); }}
                disabled={paginaDropdown === 1}
                style={{ background: paginaDropdown === 1 ? '#f1f5f9' : '#3b82f6', border: 'none', borderRadius: '5px', padding: '4px 12px', cursor: paginaDropdown === 1 ? 'default' : 'pointer', fontSize: '13px', color: paginaDropdown === 1 ? '#cbd5e1' : 'white', fontWeight: '600' }}
              >
                ← Ant
              </button>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                {Array.from({ length: totalPaginasDropdown }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onMouseDown={(e) => { e.preventDefault(); setPaginaDropdown(p); }}
                    style={{
                      width: '28px', height: '28px', border: 'none', borderRadius: '5px',
                      background: p === paginaDropdown ? '#3b82f6' : '#e2e8f0',
                      color: p === paginaDropdown ? 'white' : '#475569',
                      cursor: 'pointer', fontSize: '12px', fontWeight: p === paginaDropdown ? '700' : '500'
                    }}
                  >{p}</button>
                ))}
              </div>
              <button
                onMouseDown={(e) => { e.preventDefault(); if (paginaDropdown < totalPaginasDropdown) setPaginaDropdown(p => p + 1); }}
                disabled={paginaDropdown === totalPaginasDropdown}
                style={{ background: paginaDropdown === totalPaginasDropdown ? '#f1f5f9' : '#3b82f6', border: 'none', borderRadius: '5px', padding: '4px 12px', cursor: paginaDropdown === totalPaginasDropdown ? 'default' : 'pointer', fontSize: '13px', color: paginaDropdown === totalPaginasDropdown ? '#cbd5e1' : 'white', fontWeight: '600' }}
              >
                Sig →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Info de ayuda */}
      <small className="cr-inst-help-text" style={{ display: 'block', marginTop: '4px' }}>
        💡 Escriba el nombre o número para buscar. Seleccione uno para autocompletar los datos.
      </small>
      {numeros.length === 0 && !loading && (
        <small className="cr-inst-help-text" style={{ color: '#ef4444', display: 'block', marginTop: '4px' }}>
          ⚠️ No hay números disponibles. Agregue números en "Números Demos" o llene manualmente.
        </small>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════

function IntegracionWhatsapp() {
  const [formData, setFormData] = useState(DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [sqlPreview, setSqlPreview] = useState('');
  const [resultado, setResultado] = useState(null);
  
  // ── Estados para probar ejecución ──────────────────────────────────────────
  const [probandoSQL, setProbandoSQL] = useState(false);
  const [resultadoPruebaSQL, setResultadoPruebaSQL] = useState(null);
  
  // ── Estados para selects en cascada ────────────────────────────────────────
  const [empresas, setEmpresas] = useState([]);
  const [bots, setBots] = useState([]);
  const [botRedes, setBotRedes] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [loadingBots, setLoadingBots] = useState(false);
  const [loadingBotRedes, setLoadingBotRedes] = useState(false);
  
  // ── Estados para dropdowns con búsqueda ────────────────────────────────────
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const empresaDropdownRef = useRef(null);
  
  const [showBotDropdown, setShowBotDropdown] = useState(false);
  const [botSearch, setBotSearch] = useState('');
  const botDropdownRef = useRef(null);
  
  const [showBotRedesDropdown, setShowBotRedesDropdown] = useState(false);
  const [botRedesSearch, setBotRedesSearch] = useState('');
  const botRedesDropdownRef = useRef(null);
  
  // ── Estado para números demos ────────────────────────────────────────────
  const [numerosDisponibles, setNumerosDisponibles] = useState([]);
  const [loadingNumeros, setLoadingNumeros] = useState(false);
  
  // ── Estado para URLs dinámicas ───────────────────────────────────────────
  const [urlsConfig4, setUrlsConfig4] = useState(['https://cloud-s2.talkme.pro', 'https://plantillas.talkme.pro']);
  const [nuevaUrl, setNuevaUrl] = useState('');

  // ── Estados de modales de confirmación ────────────────────────────────────
  const [showEjecutarModal, setShowEjecutarModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // ── Cargar empresas cuando cambia la base de datos ────────────────────────
  useEffect(() => {
    cargarEmpresas();
    // Resetear selecciones cuando cambia la BD
    setFormData(prev => ({ ...prev, idEmpresa: '', idBot: '', idBotRedes: '' }));
    setBots([]);
    setBotRedes([]);
    // Actualizar URLs según el servidor seleccionado
    const defaultUrls = SERVER_URL_PRESETS[formData.dbKey] || ['https://cloud-s2.talkme.pro', 'https://plantillas.talkme.pro'];
    setUrlsConfig4(defaultUrls);
  }, [formData.dbKey]);

  // ── Cargar bots cuando se selecciona empresa ─────────────────────────────
  useEffect(() => {
    if (formData.idEmpresa) {
      cargarBots();
      setFormData(prev => ({ ...prev, idBot: '', idBotRedes: '' }));
      setBotRedes([]);
    }
  }, [formData.idEmpresa]);

  // ── Cargar bot_redes cuando se selecciona bot ────────────────────────────
  useEffect(() => {
    if (formData.idBot) {
      cargarBotRedes();
      setFormData(prev => ({ ...prev, idBotRedes: '' }));
    }
  }, [formData.idBot]);

  // ── Cargar números disponibles al iniciar ────────────────────────────────
  useEffect(() => {
    cargarNumerosDisponibles();
  }, []);

  // ── Cerrar dropdowns al hacer clic fuera ─────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empresaDropdownRef.current && !empresaDropdownRef.current.contains(event.target)) {
        setShowEmpresaDropdown(false);
      }
      if (botDropdownRef.current && !botDropdownRef.current.contains(event.target)) {
        setShowBotDropdown(false);
      }
      if (botRedesDropdownRef.current && !botRedesDropdownRef.current.contains(event.target)) {
        setShowBotRedesDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const response = await fetchWithAuth(API_URLS.creacionesEmpresas(formData.dbKey));
      if (!response.ok) throw new Error('Error al cargar empresas');
      const data = await response.json();
      setEmpresas(data);
    } catch (error) {
      toast.error('Error al cargar empresas: ' + error.message);
      setEmpresas([]);
    } finally {
      setLoadingEmpresas(false);
    }
  };

  const cargarBots = async () => {
    setLoadingBots(true);
    try {
      const response = await fetchWithAuth(API_URLS.creacionesBots(formData.dbKey, formData.idEmpresa));
      if (!response.ok) throw new Error('Error al cargar bots');
      const data = await response.json();
      setBots(data);
    } catch (error) {
      toast.error('Error al cargar bots: ' + error.message);
      setBots([]);
    } finally {
      setLoadingBots(false);
    }
  };

  const cargarBotRedes = async () => {
    setLoadingBotRedes(true);
    try {
      const response = await fetchWithAuth(`${API_URLS.creacionesBotRedes(formData.dbKey, formData.idBot)}&id_red_social=1`);
      if (!response.ok) throw new Error('Error al cargar bot_redes');
      const data = await response.json();
      setBotRedes(data);
    } catch (error) {
      toast.error('Error al cargar bot_redes: ' + error.message);
      setBotRedes([]);
    } finally {
      setLoadingBotRedes(false);
    }
  };

  const cargarNumerosDisponibles = async () => {
    setLoadingNumeros(true);
    try {
      const response = await fetchWithAuth(API_URLS.numerosDemosDisponibles());
      if (!response.ok) throw new Error('Error al cargar números');
      const data = await response.json();
      setNumerosDisponibles(data);
    } catch (error) {
      toast.error('Error al cargar números demos: ' + error.message);
      setNumerosDisponibles([]);
    } finally {
      setLoadingNumeros(false);
    }
  };

  const handleSeleccionarNumero = (numeroId) => {
    const numero = numerosDisponibles.find(n => n.ID_NUMERO === parseInt(numeroId));
    if (numero) {
      setFormData(prev => ({
        ...prev,
        nombreApp: numero.NOMBRE_APP,
        numero: numero.NUMERO,
        appId: numero.APP_ID || '',
        authCode: numero.AUTH_CODE || '',
        idNumeroSeleccionado: numero.ID_NUMERO,
      }));
      toast.success(`Número ${numero.NOMBRE_APP} seleccionado`);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Manejo de URLs dinámicas ─────────────────────────────────────────────
  const agregarUrl = () => {
    if (!nuevaUrl.trim()) {
      toast.error('Ingrese una URL válida');
      return;
    }
    if (!nuevaUrl.startsWith('http://') && !nuevaUrl.startsWith('https://')) {
      toast.error('La URL debe comenzar con http:// o https://');
      return;
    }
    if (urlsConfig4.includes(nuevaUrl.trim())) {
      toast.error('Esta URL ya existe en la lista');
      return;
    }
    setUrlsConfig4([...urlsConfig4, nuevaUrl.trim()]);
    setNuevaUrl('');
    toast.success('URL agregada');
  };

  const eliminarUrl = (index) => {
    const newUrls = urlsConfig4.filter((_, i) => i !== index);
    setUrlsConfig4(newUrls);
  };

  const handleKeyPressNuevaUrl = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      agregarUrl();
    }
  };

  // ── Generar el script SQL exacto como el usuario lo quiere ──────────────────
  const generarSQL = () => {
    const idBot = formData.idBot || '0';
    
    // Construir URLs configuración 4
    const urlsSQL = urlsConfig4.map(url => 
      `INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '4', '${escapeSql(url)}', NOW(), '${formData.creadoPor}');
`).join('');

    return `SET @ID_EMPRESA   := ${formData.idEmpresa || '0'};
SET @idBot        := ${formData.idBot || '0'};
SET @ID_BOT_REDES := ${formData.idBotRedes || '0'};
SET @NOMBRE_APP   := '${escapeSql(formData.nombreApp)}';
SET @NUMERO       := '${escapeSql(formData.numero)}';
SET @APP_ID 	  := '${escapeSql(formData.appId)}';
SET @AUTH_CODE    := '${escapeSql(formData.authCode)}';

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '18', '3', NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '19', CONCAT('https://partner.gupshup.io/partner/app/', @APP_ID, '/v3'), NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '20', @AUTH_CODE, NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '21', @APP_ID, NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '22', '1', NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '23', CONCAT('https://partner.gupshup.io/partner/app/', @APP_ID, '/onboarding/marketing'),NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '1', @NUMERO, NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '10', '${import.meta.env.VITE_WA_PARAM_FIJO_10 || 'YOUR_WA_PARAM_FIJO_10'}', NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '9', 'https://api.gupshup.io/wa/api/v1', NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '13', 'GUPSHUP', NOW(), '${formData.creadoPor}');

${urlsSQL}INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '14', @NOMBRE_APP, NOW(), '${formData.creadoPor}');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@ID_BOT_REDES, '17', '${import.meta.env.VITE_WA_PARAM_FIJO_17 || 'YOUR_WA_PARAM_FIJO_17'}', NOW(), '${formData.creadoPor}');


/*******************************/
/* Aplicaciones plantillas WA  */
/*******************************/

INSERT INTO APLICACION_PLANTILLAS_WHATSAPP (ID_EMPRESA, ID_BOT_REDES, NOMBRE_APP, APP_ID, AUTH_CODE, CREADO_POR) VALUES 
(@ID_EMPRESA, @ID_BOT_REDES, @NOMBRE_APP, @APP_ID, @AUTH_CODE, '${formData.creadoPor}');

INSERT INTO BROADCAST_PROCESOS_DETALLE (ID_BROADCAST_PROCESO, ID_BOT_REDES, CREADO_POR, CREADO_EL) VALUES 
('2', @ID_BOT_REDES, '${formData.creadoPor}', NOW());


UPDATE BOT_REDES
SET API = 1,
BAJO_DEMANDA = 1
WHERE ID_BOT_REDES = @ID_BOT_REDES
AND ID_RED_SOCIAL = 1;

/* CREAR TABLA EN BD DE WHATSAPP  */
CREATE TABLE whatsapp.WA_${idBot}_MESSAGES (
	MESSAGE_ID BIGINT NOT NULL AUTO_INCREMENT,
	MID TEXT NOT NULL,
	PSID TEXT NOT NULL,
	MESSAGE_DIR ENUM('E', 'R') NOT NULL,
	MESSAGE_TYPE VARCHAR(10) NOT NULL,
	ESTADO TINYINT(4) NOT NULL,
	EXTERNAL_ID BIGINT NOT NULL,
	MESSAGE_DATE  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
	MESSAGE_TEXT TEXT,
	MEDIA_URL TEXT,
	MEDIA_FILE_PATH TEXT,
	PRIMARY KEY (MESSAGE_ID)
)
ENGINE=InnoDB
DEFAULT CHARACTER SET=utf8mb4
COLLATE=utf8mb4_unicode_ci
COMMENT='Registro de los menssajes procesador para API Oficial de Whatsapp';

ALTER TABLE whatsapp.WA_${idBot}_MESSAGES ADD INDEX \`WA_${idBot}_MESSAGES_IDX_EXTERNALID\`(\`EXTERNAL_ID\`);

ALTER TABLE whatsapp.WA_${idBot}_MESSAGES ADD INDEX \`WA_${idBot}_MESSAGES_IDX_MESSAGE_DATE\`(\`MESSAGE_DATE\`);

/* ACTUALIZA PARAMETROS DE BOT PARA API WA*/
UPDATE PARAMETROS
SET VALOR = 1
WHERE ID_BOT = @idBot
AND NOMBRE IN ('ENVIAR_MENU_INTERACTIVO','HABILITAR_USO_3BOTONES_INTERACTIVO','OPTIN_ALTA_AUTOMATICA','SUSCRIPCION_PLANTILLA');
`;
  };

  const escapeSql = (value) => {
    if (value === null || value === undefined) return '';
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  };

  const handlePreview = () => {
    if (!validarCampos()) return;
    setSqlPreview(generarSQL());
    setPreviewMode(true);
    setResultado(null);
  };

  const validarCampos = () => {
    if (!formData.idEmpresa) {
      toast.error('El ID de Empresa es obligatorio');
      return false;
    }
    if (!formData.idBot) {
      toast.error('El ID de Bot es obligatorio');
      return false;
    }
    if (!formData.idBotRedes) {
      toast.error('El ID de Bot Redes es obligatorio');
      return false;
    }
    if (!formData.nombreApp) {
      toast.error('El Nombre de la App es obligatorio');
      return false;
    }
    if (!formData.numero) {
      toast.error('El Número es obligatorio');
      return false;
    }
    if (!formData.appId) {
      toast.error('El App ID es obligatorio');
      return false;
    }
    if (!formData.authCode) {
      toast.error('El Auth Code es obligatorio');
      return false;
    }
    return true;
  };

  // Construye el objeto params para el backend idempotente
  const construirParams = () => ({
    idEmpresa: formData.idEmpresa,
    idBot: formData.idBot,
    idBotRedes: formData.idBotRedes,
    nombreApp: formData.nombreApp,
    numero: formData.numero,
    appId: formData.appId,
    authCode: formData.authCode,
    creadoPor: formData.creadoPor,
    urlsConfig4: urlsConfig4,
  });

  const handleEjecutar = async () => {
    if (!validarCampos()) return;
    setShowEjecutarModal(true);
  };

  const confirmEjecutar = async () => {
    setShowEjecutarModal(false);

    setLoading(true);
    setResultado(null);

    try {
      const response = await fetchWithAuth(API_URLS.creacionesWhatsApp(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbKey: formData.dbKey,
          params: construirParams(),
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw { error: 'Respuesta no válida del servidor', details: text };
      }

      if (!response.ok) {
        throw data;
      }

      // Si se seleccionó un número demo, marcarlo como ocupado
      if (formData.idNumeroSeleccionado) {
        try {
          await fetchWithAuth(API_URLS.numerosDemosOcupar(formData.idNumeroSeleccionado), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              idEmpresa: formData.idEmpresa,
              idBot: formData.idBot,
              idBotRedes: formData.idBotRedes,
              nombreEmpresa: formData.nombreApp,
            }),
          });
          // Recargar números disponibles
          cargarNumerosDisponibles();
        } catch (ocuparError) {
          console.warn('No se pudo marcar el número como ocupado:', ocuparError);
        }
      }

      setResultado({
        success: true,
        mensaje: data.mensaje || 'Integración de WhatsApp ejecutada exitosamente',
        ...data,
      });
      toast.success(data.mensaje || 'Integración de WhatsApp ejecutada exitosamente');
    } catch (error) {
      setResultado({
        success: false,
        error: error.error || 'Error al ejecutar la integración',
        details: error.details || error.sqlMessage || error.message || 'Error desconocido',
      });
      toast.error(error.details || error.error || 'Error al ejecutar la integración');
    } finally {
      setLoading(false);
    }
  };

  const handleProbarSQL = async () => {
    if (!validarCampos()) return;

    setProbandoSQL(true);
    setResultadoPruebaSQL(null);

    try {
      const response = await fetchWithAuth(API_URLS.creacionesWhatsAppProbar(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbKey: formData.dbKey,
          params: construirParams(),
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw { error: 'Respuesta no válida del servidor', details: text };
      }

      if (!response.ok) {
        throw data;
      }

      setResultadoPruebaSQL({
        success: true,
        mensaje: data.mensaje || 'SQL válido - La ejecución fue exitosa (modo prueba con rollback)',
        duracionMs: data.duracionMs,
      });
      toast.success('SQL válido - Prueba exitosa (sin cambios guardados)');
    } catch (error) {
      setResultadoPruebaSQL({
        success: false,
        error: error.error || 'Error al probar el SQL',
        details: error.details || error.sqlMessage || error.message || 'Error desconocido',
      });
      toast.error(error.details || error.error || 'Error al probar el SQL');
    } finally {
      setProbandoSQL(false);
    }
  };

  const handleCopiarSQL = async () => {
    try {
      const sql = sqlPreview || generarSQL();
      await navigator.clipboard.writeText(sql);
      toast.success('SQL copiado al portapapeles');
    } catch (error) {
      toast.error('No se pudo copiar el SQL');
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    setShowResetModal(false);
    setFormData(DEFAULT_VALUES);
    setResultado(null);
    setPreviewMode(false);
    setSqlPreview('');
  };

  const resaltarSQL = (sql) => {
    const escapeHtml = (text) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escapeHtml(sql)
      .replace(/(--.*)$/gm, '<span class="sql-comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sql-comment">$1</span>')
      .replace(/('[^']*(?:''[^']*)*')/g, '<span class="sql-string">$1</span>')
      .replace(/\b(SET|INSERT|INTO|VALUES|SELECT|UPDATE|FROM|WHERE|CREATE|TABLE|ALTER|ADD|INDEX|IF|NOT|EXISTS|CONCAT|NOW|DEFAULT|PRIMARY|KEY|ENGINE|CHARACTER|COLLATE|COMMENT|ENUM|VARCHAR|TINYINT|BIGINT|TEXT|DATETIME|AUTO_INCREMENT)\b/gi, '<span class="sql-keyword">$1</span>')
      .replace(/\b(BOT_RED_CONF_VALORES|APLICACION_PLANTILLAS_WHATSAPP|BROADCAST_PROCESOS_DETALLE|BOT_REDES|PARAMETROS|whatsapp\.WA_\d+_MESSAGES)\b/g, '<span class="sql-table">$1</span>')
      .replace(/(@[A-Za-z0-9_]+)/g, '<span class="sql-variable">$1</span>');
  };

  return (
    <div className="cr-inst-container">
      <div className="cr-inst-header">
        <h2>
          <span className="cr-inst-header-icon">📱</span>
          Integración WhatsApp API Oficial
        </h2>
        <div className="cr-inst-actions">
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={handlePreview}
            disabled={loading || probandoSQL}
          >
            👁️ Vista SQL
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={handleProbarSQL}
            disabled={loading || probandoSQL}
          >
            {probandoSQL ? '⏳ Probando...' : '🧪 Probar SQL'}
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={handleReset}
            disabled={loading || probandoSQL}
          >
            🔄 Limpiar
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-primary"
            onClick={handleEjecutar}
            disabled={loading || probandoSQL}
          >
            {loading ? '⏳ Ejecutando...' : '🚀 Ejecutar Integración'}
          </button>
        </div>
      </div>

      {/* ── Sección: Configuración en Cascada ───────────────────── */}
      <div className="cr-inst-section cr-inst-section-full">
        <div className="cr-inst-section-header">
          <h3>🗄️ Configuración de Base de Datos</h3>
          <span className="cr-inst-section-badge">Obligatorio</span>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-4">
            <div className="cr-inst-field">
              <label className="cr-inst-required">Base de Datos</label>
              <select
                name="dbKey"
                value={formData.dbKey}
                onChange={handleChange}
              >
                {Object.entries(DB_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
            </div>
            <div className="cr-inst-field" ref={empresaDropdownRef}>
              <label className="cr-inst-required">Empresa</label>
              <div
                className={`cr-inst-select-dropdown ${showEmpresaDropdown ? 'open' : ''}`}
                onClick={() => !loadingEmpresas && setShowEmpresaDropdown(v => !v)}
              >
                {formData.idEmpresa ? (
                  <span className="cr-inst-select-value">
                    {empresas.find(e => String(e.ID_EMPRESA) === String(formData.idEmpresa))?.NOMBRE || 'Seleccionar...'}
                  </span>
                ) : (
                  <span className="cr-inst-select-placeholder">
                    {loadingEmpresas ? 'Cargando...' : '-- Seleccione empresa --'}
                  </span>
                )}
                <span className="cr-inst-select-chevron">{showEmpresaDropdown ? '▲' : '▼'}</span>
              </div>
              {showEmpresaDropdown && (
                <div className="cr-inst-dropdown-menu">
                  <div className="cr-inst-dropdown-header">
                    <input
                      className="cr-inst-dropdown-search"
                      type="text"
                      placeholder="🔍 Buscar empresa..."
                      value={empresaSearch}
                      onChange={e => setEmpresaSearch(e.target.value)}
                      onClick={ev => ev.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="cr-inst-dropdown-list">
                    {empresas
                      .filter(e => (e.NOMBRE || '').toLowerCase().includes(empresaSearch.toLowerCase()))
                      .map(emp => (
                        <div
                          key={emp.ID_EMPRESA}
                          className="cr-inst-dropdown-item"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, idEmpresa: String(emp.ID_EMPRESA) }));
                            setShowEmpresaDropdown(false);
                            setEmpresaSearch('');
                          }}
                        >
                          <span className="cr-inst-dropdown-item-name">{emp.NOMBRE}</span>
                          <span className="cr-inst-dropdown-item-id">ID: {emp.ID_EMPRESA}</span>
                        </div>
                      ))}
                    {empresas.filter(e => (e.NOMBRE || '').toLowerCase().includes(empresaSearch.toLowerCase())).length === 0 && (
                      <div className="cr-inst-dropdown-empty">No se encontraron empresas</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="cr-inst-field" ref={botDropdownRef}>
              <label className="cr-inst-required">Bot</label>
              <div
                className={`cr-inst-select-dropdown ${showBotDropdown ? 'open' : ''}`}
                onClick={() => !loadingBots && formData.idEmpresa && setShowBotDropdown(v => !v)}
              >
                {formData.idBot ? (
                  <span className="cr-inst-select-value">
                    {bots.find(b => String(b.ID_BOT) === String(formData.idBot))?.DESCRIPCION || 'Seleccionar...'}
                  </span>
                ) : (
                  <span className="cr-inst-select-placeholder">
                    {!formData.idEmpresa ? 'Seleccione empresa primero' : (loadingBots ? 'Cargando...' : '-- Seleccione bot --')}
                  </span>
                )}
                <span className="cr-inst-select-chevron">{showBotDropdown ? '▲' : '▼'}</span>
              </div>
              {showBotDropdown && (
                <div className="cr-inst-dropdown-menu">
                  <div className="cr-inst-dropdown-header">
                    <input
                      className="cr-inst-dropdown-search"
                      type="text"
                      placeholder="🔍 Buscar bot..."
                      value={botSearch}
                      onChange={e => setBotSearch(e.target.value)}
                      onClick={ev => ev.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="cr-inst-dropdown-list">
                    {bots
                      .filter(b => (b.DESCRIPCION || '').toLowerCase().includes(botSearch.toLowerCase()))
                      .map(bot => (
                        <div
                          key={bot.ID_BOT}
                          className="cr-inst-dropdown-item"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, idBot: String(bot.ID_BOT) }));
                            setShowBotDropdown(false);
                            setBotSearch('');
                          }}
                        >
                          <span className="cr-inst-dropdown-item-name">{bot.DESCRIPCION}</span>
                          <span className="cr-inst-dropdown-item-id">ID: {bot.ID_BOT}</span>
                        </div>
                      ))}
                    {bots.filter(b => (b.DESCRIPCION || '').toLowerCase().includes(botSearch.toLowerCase())).length === 0 && (
                      <div className="cr-inst-dropdown-empty">No se encontraron bots</div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="cr-inst-field" ref={botRedesDropdownRef}>
              <label className="cr-inst-required">Bot Redes</label>
              <div
                className={`cr-inst-select-dropdown ${showBotRedesDropdown ? 'open' : ''}`}
                onClick={() => !loadingBotRedes && formData.idBot && setShowBotRedesDropdown(v => !v)}
              >
                {formData.idBotRedes ? (
                  <span className="cr-inst-select-value">
                    {botRedes.find(br => String(br.ID_BOT_REDES) === String(formData.idBotRedes))?.NOMBRE_RED || 'Seleccionar...'}
                  </span>
                ) : (
                  <span className="cr-inst-select-placeholder">
                    {!formData.idBot ? 'Seleccione bot primero' : (loadingBotRedes ? 'Cargando...' : '-- Seleccione bot redes --')}
                  </span>
                )}
                <span className="cr-inst-select-chevron">{showBotRedesDropdown ? '▲' : '▼'}</span>
              </div>
              {showBotRedesDropdown && (
                <div className="cr-inst-dropdown-menu">
                  <div className="cr-inst-dropdown-header">
                    <input
                      className="cr-inst-dropdown-search"
                      type="text"
                      placeholder="🔍 Buscar bot redes..."
                      value={botRedesSearch}
                      onChange={e => setBotRedesSearch(e.target.value)}
                      onClick={ev => ev.stopPropagation()}
                      autoFocus
                    />
                  </div>
                  <div className="cr-inst-dropdown-list">
                    {botRedes
                      .filter(br => (br.NOMBRE_RED || '').toLowerCase().includes(botRedesSearch.toLowerCase()))
                      .map(br => (
                        <div
                          key={br.ID_BOT_REDES}
                          className="cr-inst-dropdown-item"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, idBotRedes: String(br.ID_BOT_REDES) }));
                            setShowBotRedesDropdown(false);
                            setBotRedesSearch('');
                          }}
                        >
                          <span className="cr-inst-dropdown-item-name">{br.NOMBRE_RED}</span>
                          <span className="cr-inst-dropdown-item-id">ID: {br.ID_BOT_REDES}</span>
                        </div>
                      ))}
                    {botRedes.filter(br => (br.NOMBRE_RED || '').toLowerCase().includes(botRedesSearch.toLowerCase())).length === 0 && (
                      <div className="cr-inst-dropdown-empty">No se encontraron bot redes</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Secciones lado a lado: Datos App + URLs ─────────── */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '0' }}>

      {/* ── Sección: Datos de la Aplicación ───────────────────── */}
      <div className="cr-inst-section" style={{ flex: '3', marginBottom: '20px' }}>
        <div className="cr-inst-section-header">
          <h3>📱 Datos de la Aplicación WhatsApp</h3>
          <span className="cr-inst-section-badge">Obligatorio</span>
        </div>
        <div className="cr-inst-section-body">
          {/* Selector de números demos - Searchable */}
          <NumeroDemoSearchable
            numeros={numerosDisponibles}
            loading={loadingNumeros}
            onSeleccionar={handleSeleccionarNumero}
            seleccionado={formData.idNumeroSeleccionado}
          />

          {/* Fila 1: Nombre App + Número */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '10px' }}>
            <div className="cr-inst-field" style={{ marginBottom: 0 }}>
              <label className="cr-inst-required">Nombre de la App</label>
              <input
                type="text"
                name="nombreApp"
                value={formData.nombreApp}
                onChange={handleChange}
                placeholder="Ej: TalkmeAltraco"
              />
            </div>
            <div className="cr-inst-field" style={{ marginBottom: 0 }}>
              <label className="cr-inst-required">Número de WhatsApp</label>
              <input
                type="text"
                name="numero"
                value={formData.numero}
                onChange={handleChange}
                placeholder="Ej: 50246230682"
              />
            </div>
          </div>

          {/* Fila 2: App ID + Auth Code */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginBottom: '10px' }}>
            <div className="cr-inst-field" style={{ marginBottom: 0 }}>
              <label className="cr-inst-required">App ID (Gupshup)</label>
              <input
                type="text"
                name="appId"
                value={formData.appId}
                onChange={handleChange}
                placeholder="Ej: 4a5a0c6d-dc13-4c1c-80df-10d694f8048c"
              />
            </div>
            <div className="cr-inst-field" style={{ marginBottom: 0 }}>
              <label className="cr-inst-required">Auth Code</label>
              <input
                type="text"
                name="authCode"
                value={formData.authCode}
                onChange={handleChange}
                placeholder="Ej: sk_2f37b45fccf748f6857d1a26965f90d0"
              />
            </div>
          </div>

          {/* Fila 3: Creado Por */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px' }}>
            <div className="cr-inst-field" style={{ marginBottom: 0 }}>
              <label>Creado Por</label>
              <input
                type="text"
                name="creadoPor"
                value={formData.creadoPor}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: URLs de Configuración ────────────────────── */}
      <div className="cr-inst-section" style={{ flex: '2', marginBottom: '20px' }}>
        <div className="cr-inst-section-header">
          <h3>🔗 URLs Config (ID_BOT_RED_CONF = 4)</h3>
          <span className="cr-inst-section-badge">Auto-generado por servidor</span>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-field">
            <label>URLs configuradas para este servidor:</label>
            <div className="cr-inst-urls-list">
              {urlsConfig4.map((url, index) => (
                <div key={index} className="cr-inst-url-item">
                  <span className="cr-inst-url-text">{url}</span>
                  <button
                    className="cr-inst-btn cr-inst-btn-small cr-inst-btn-danger"
                    onClick={() => eliminarUrl(index)}
                    title="Eliminar URL"
                  >
                    ❌
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className="cr-inst-field" style={{ marginTop: '15px' }}>
            <label>Agregar URL adicional:</label>
            <div className="cr-inst-url-add">
              <input
                type="text"
                value={nuevaUrl}
                onChange={(e) => setNuevaUrl(e.target.value)}
                onKeyPress={handleKeyPressNuevaUrl}
                placeholder="https://app-s4.talkme.pro"
                className="cr-inst-url-input"
              />
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={agregarUrl}
              >
                ➕ Agregar URL
              </button>
            </div>
            <small className="cr-inst-help-text">
              Las URLs se auto-configuran según el servidor seleccionado. Puede agregar URLs adicionales manualmente.
            </small>
          </div>
        </div>
      </div>

      </div>{/* ── fin flex row Datos App + URLs ── */}

      {/* ── Resultado de la prueba SQL ─────────────────────────── */}
      {resultadoPruebaSQL && (
        <div className={`cr-inst-section cr-inst-section-full ${resultadoPruebaSQL.success ? 'cr-inst-success' : 'cr-inst-error'}`}>
          <div className="cr-inst-section-header">
            <h3>{resultadoPruebaSQL.success ? '🧪 Prueba Exitosa (sin cambios guardados)' : '❌ Error en la Prueba'}</h3>
          </div>
          <div className="cr-inst-section-body">
            <p><strong>{resultadoPruebaSQL.mensaje || resultadoPruebaSQL.error}</strong></p>
            {resultadoPruebaSQL.resumen && <LogIntegracion resumen={resultadoPruebaSQL.resumen} log={resultadoPruebaSQL.log} />}
            {resultadoPruebaSQL.details && (
              <pre className="cr-inst-error-details">{resultadoPruebaSQL.details}</pre>
            )}
            {resultadoPruebaSQL.success && resultadoPruebaSQL.duracionMs && (
              <p className="cr-inst-help-text">Duración: {resultadoPruebaSQL.duracionMs}ms</p>
            )}
          </div>
        </div>
      )}

      {/* ── Resultado de la operación ─────────────────────────── */}
      {resultado && (
        <div className={`cr-inst-section cr-inst-section-full ${resultado.success ? 'cr-inst-success' : 'cr-inst-error'}`}>
          <div className="cr-inst-section-header">
            <h3>{resultado.success ? '✅ Integración Ejecutada' : '❌ Error en la Operación'}</h3>
          </div>
          <div className="cr-inst-section-body">
            <p><strong>{resultado.mensaje || resultado.error}</strong></p>
            {resultado.resumen && <LogIntegracion resumen={resultado.resumen} log={resultado.log} />}
            {resultado.details && (
              <pre className="cr-inst-error-details">{resultado.details}</pre>
            )}
            {resultado.sqlMessage && (
              <p className="cr-inst-sql-error">SQL: {resultado.sqlMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Preview del SQL ───────────────────────────────────── */}
      {previewMode && (
        <div className="cr-inst-section cr-inst-section-full cr-inst-sql-preview">
          <div className="cr-inst-section-header">
            <h3>👁️ Vista Previa del SQL</h3>
            <div className="cr-inst-actions">
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={handleCopiarSQL}
              >
                📋 Copiar SQL
              </button>
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={() => setPreviewMode(false)}
              >
                ❌ Cerrar Vista
              </button>
            </div>
          </div>
          <div className="cr-inst-section-body">
            <pre
              className="cr-inst-sql-code"
              dangerouslySetInnerHTML={{ __html: resaltarSQL(sqlPreview) }}
            />
          </div>
        </div>
      )}
      
      <ConfirmModal
        show={showEjecutarModal}
        title="Ejecutar Integración WhatsApp"
        confirmText="Ejecutar"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={confirmEjecutar}
        onCancel={() => setShowEjecutarModal(false)}
      >
        <p>¿Está seguro de ejecutar la integración de WhatsApp?</p>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>Si algunos datos ya existen, se actualizarán (no fallará).</p>
      </ConfirmModal>

      <ConfirmModal
        show={showResetModal}
        title="Limpiar Campos"
        confirmText="Limpiar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
      >
        <p>¿Está seguro de limpiar todos los campos?</p>
      </ConfirmModal>
    </div>
  );
}

export default IntegracionWhatsapp;
