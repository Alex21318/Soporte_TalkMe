import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { logPermisoAgregado, logPermisoEliminado, logPermisoMasivo } from '../../services/auditoriaService';
import AHistorialEstados from './aHistorialEstados';
import { SeguridadModal, GestionMasivaPermisos, ContenidoSeguridad } from './aSeguridad';
import UsuariosQRM from './UsuariosQRM';
import ConfirmModal from '../../components/ConfirmModal';
import './Usuarios.css';

// Mapeo de DB keys a nombres descriptivos
const DB_NAMES = {
  'db_1': 'Talkme S1',
  'db_2': 'Talkme S2',
  'db_3': 'Talkme S3',
  'db_4': 'Talkme S4',
  'db_5': 'Talkme MDD',
  'db_6': 'Ficohsa S1',
  'db_7': 'Ficohsa S2',
  'db_8': 'Ficohsa S3',
  'db_9': 'Modulo de seguridad Talkme',
  'db_10': 'Modulo de seguridad Ficohsa'
};

function Usuarios() {
  // ============================================================
  // NAVEGACIÓN POR PESTAÑAS
  // ============================================================
  const [vistaActiva, setVistaActiva] = useState(() => {
    return sessionStorage.getItem('usr_vista') || 'asignar';
  });
  
  // Estados de filtros
  const [filtros, setFiltros] = useState(() => {
    try {
      const saved = sessionStorage.getItem('usr_filtros');
      return saved ? JSON.parse(saved) : { db_key: 'db_1', id_empresa: '', id_usuario: '' };
    } catch { return { db_key: 'db_1', id_empresa: '', id_usuario: '' }; }
  });

  // Persistir filtros y vista en sessionStorage
  useEffect(() => { sessionStorage.setItem('usr_filtros', JSON.stringify(filtros)); }, [filtros]);
  useEffect(() => { sessionStorage.setItem('usr_vista', vistaActiva); }, [vistaActiva]);

  // Forzar db_2 cuando se cambia a vista QRM
  useEffect(() => {
    if (vistaActiva === 'qrm' && filtros.db_key !== 'db_2') {
      setFiltros({ ...filtros, db_key: 'db_2', id_empresa: '', id_usuario: '' });
      setUsuarioSearch('');
      setUsuariosFiltroRevisar([]);
      setUsuarios([]);
      setEmpresas([]);
      sessionStorage.removeItem('usr_empresas');
      sessionStorage.removeItem('usr_usuarios');
      cargarEmpresas();
    }
  }, [vistaActiva]);

  // Listas para dropdowns (persistidas para evitar re-fetch al remontar)
  const [empresas, setEmpresas] = useState(() => {
    try { const s = sessionStorage.getItem('usr_empresas'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [usuarios, setUsuarios] = useState(() => {
    try { const s = sessionStorage.getItem('usr_usuarios'); return s ? JSON.parse(s) : []; } catch { return []; }
  });

  // Persistir listas en sessionStorage
  useEffect(() => { sessionStorage.setItem('usr_empresas', JSON.stringify(empresas)); }, [empresas]);
  useEffect(() => { sessionStorage.setItem('usr_usuarios', JSON.stringify(usuarios)); }, [usuarios]);
  const [loading, setLoading] = useState({ 
    empresas: false, 
    usuarios: false, 
    permisos: false,
    masivo: false,
    seguridad: false
  });

  // Permisos del usuario seleccionado
  const [permisos, setPermisos] = useState({
    redes: [],
    skills: [],
    tiposCliente: []
  });

  // Datos del usuario seleccionado + datos de seguridad
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null);
  const [infoSeguridad, setInfoSeguridad] = useState(null);

  // Modales de confirmación
  const [showEliminarPermisosModal, setShowEliminarPermisosModal] = useState(false);
  const [showAsignarPermisosModal, setShowAsignarPermisosModal] = useState(false);

  // Paginación en dropdown de usuarios
  const [paginacionUsuarios, setPaginacionUsuarios] = useState({ page: 1, totalPages: 1, total: 0 });

  // Paginación local para lista masiva (dinámica según espacio disponible)
  const calcularPageSize = () => {
    const anchoVentana = window.innerWidth;
    const altoVentana = window.innerHeight;
    // Estimar columnas según ancho (grid de 4 columnas en desktop, menos en pantallas pequeñas)
    let columnas = 4;
    if (anchoVentana < 1400) columnas = 3;
    if (anchoVentana < 1100) columnas = 2;
    if (anchoVentana < 700) columnas = 1;
    // Estimar alto disponible para el grid (restando header, filtros, padding)
    const altoDisponible = altoVentana - 200; // 200px aprox para header + filtros + paginador
    // Estimar altura promedio de tarjeta (ahora más compacta con align-items: start)
    const altoTarjeta = 85; // Ajustado según altura real de tarjetas compactas
    const filas = Math.max(3, Math.floor(altoDisponible / altoTarjeta));
    const pageSize = columnas * filas;
    // Log debug paginación - descomentar si se necesita debug
    // console.log('=== PAGINACIÓN DINÁMICA ===', { anchoVentana, altoVentana, columnas, filas, pageSize });
    return Math.max(12, pageSize); // Mínimo 12 items
  };
  const [usrPageSize, setUsrPageSize] = useState(calcularPageSize());
  const [paginaLocal, setPaginaLocal] = useState(1);

  // Control de dropdown revisar
  const [showUsuarioDropdown, setShowUsuarioDropdown] = useState(false);
  const usuarioInputRef = useRef(null);
  const [usuarioSearch, setUsuarioSearch] = useState('');
  const [usuariosFiltroRevisar, setUsuariosFiltroRevisar] = useState([]);

  // Control de búsqueda de usuario en vista asignar
  const [usuarioMasivoSearch, setUsuarioMasivoSearch] = useState('');
  const [showUsuarioMasivoDropdown, setShowUsuarioMasivoDropdown] = useState(false);
  const usuarioMasivoRef = useRef(null);

  // Control de asignación por usuario ejemplo
  const [usuarioEjemplo, setUsuarioEjemplo] = useState(null);
  const [permisosEjemplo, setPermisosEjemplo] = useState({ skills: [], bot_redes: [], tipos_cliente: [] });
  const [loadingEjemplo, setLoadingEjemplo] = useState(false);
  const [usuarioEjemploSearch, setUsuarioEjemploSearch] = useState('');
  const [showUsuarioEjemploDropdown, setShowUsuarioEjemploDropdown] = useState(false);
  const usuarioEjemploRef = useRef(null);
  const [usuariosDestinoSeleccionados, setUsuariosDestinoSeleccionados] = useState([]);
  const [permisosEjemploSeleccionados, setPermisosEjemploSeleccionados] = useState({ skills: [], bot_redes: [], tipos_cliente: [] });
  const [perfilFiltroAsignacion, setPerfilFiltroAsignacion] = useState('');
  const [estadoFiltroAsignacion, setEstadoFiltroAsignacion] = useState('');
  const [estadoPlataformaFiltroAsignacion, setEstadoPlataformaFiltroAsignacion] = useState('');
  const [usuarioDestinoSearch, setUsuarioDestinoSearch] = useState('');

  // ============================================================
  // SEGURIDAD - ESTADOS
  // ============================================================
  const [dbKeySeg, setDbKeySeg] = useState('db_9');
  const [subSeccionSeg, setSubSeccionSeg] = useState('usuarios');
  const [empresasSeg, setEmpresasSeg] = useState([]);
  const [perfilesSeg, setPerfilesSeg] = useState([]);
  const [secEmpresaId, setSecEmpresaId] = useState('');
  const [estadoSeg, setEstadoSeg] = useState('');
  const [perfilFiltroSeg, setPerfilFiltroSeg] = useState('');
  const [resultadosSeg, setResultadosSeg] = useState(null);
  const [loadingSeg, setLoadingSeg] = useState(false);
  const [loadingEmpSeg, setLoadingEmpSeg] = useState(false);
  const [loadingPerfilesSeg, setLoadingPerfilesSeg] = useState(false);
  const [elementosSeg, setElementosSeg] = useState([]);
  const [loadingElementosSeg, setLoadingElementosSeg] = useState(false);
  const [elementoSeg, setElementoSeg] = useState('');
  // Dropdown estilo Usuario para filtro de Empresa general (Permisos, Asignación, Historial)
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const [empresaSearch, setEmpresaSearch] = useState('');
  const empresaDropdownRef = useRef(null);
  // Dropdowns estilo Usuario para filtros de seguridad
  const [showEmpresaSegDropdown, setShowEmpresaSegDropdown] = useState(false);
  const [empresaSegSearch, setEmpresaSegSearch] = useState('');
  const empresaSegRef = useRef(null);
  const [showPerfilSegDropdown, setShowPerfilSegDropdown] = useState(false);
  const [perfilSegSearch, setPerfilSegSearch] = useState('');
  const perfilSegRef = useRef(null);
  const [showElementoSegDropdown, setShowElementoSegDropdown] = useState(false);
  const [elementoSegSearch, setElementoSegSearch] = useState('');
  const elementoSegRef = useRef(null);

  // ============================================================
  // GESTIÓN MASIVA DE PERMISOS - ESTADOS
  // ============================================================
  const [usuariosSeleccionados, setUsuariosSeleccionados] = useState([]);
  
  // Filtros de Gestión Masiva (unificados en barra superior)
  const [modoMasiva, setModoMasiva] = useState('asignar');
  const [perfilIdMasiva, setPerfilIdMasiva] = useState('');
  const [elemIdMasiva, setElemIdMasiva] = useState('');
  const [perfilesMasiva, setPerfilesMasiva] = useState([]);
  const [elementosMasiva, setElementosMasiva] = useState([]);
  const [loadingPerfilesMasiva, setLoadingPerfilesMasiva] = useState(false);
  const [loadingElementosMasiva, setLoadingElementosMasiva] = useState(false);
  const [usuariosMasiva, setUsuariosMasiva] = useState([]);
  const [loadingMasiva, setLoadingMasiva] = useState(false);
  const [seleccionadosMasiva, setSeleccionadosMasiva] = useState(new Set());
  const [logMasiva, setLogMasiva] = useState(null);
  const [ejecutandoMasiva, setEjecutandoMasiva] = useState(false);
  const [busquedaMasivaLocal, setBusquedaMasivaLocal] = useState('');
  const [paginaMasiva, setPaginaMasiva] = useState(1);
  // Dropdowns estilo Usuario para filtros de Gestión Masiva
  const [showPerfilMasivaDropdown, setShowPerfilMasivaDropdown] = useState(false);
  const [perfilMasivaSearch, setPerfilMasivaSearch] = useState('');
  const perfilMasivaRef = useRef(null);
  const [showElementoMasivaDropdown, setShowElementoMasivaDropdown] = useState(false);
  const [elementoMasivaSearch, setElementoMasivaSearch] = useState('');
  const elementoMasivaRef = useRef(null);
  
  // Refs para detectar cambio real (no solo remontar)
  const empresaCacheadaRef = useRef(
    (() => { try { const s = sessionStorage.getItem('usr_filtros'); return s ? JSON.parse(s).id_empresa : ''; } catch { return ''; } })()
  );
  const dbKeyCacheadaRef = useRef(
    (() => { try { const s = sessionStorage.getItem('usr_filtros'); return s ? JSON.parse(s).db_key : ''; } catch { return ''; } })()
  );

  // Perfiles disponibles desde seguridad
  const [perfilesDisponibles, setPerfilesDisponibles] = useState([]);
  const [perfilFiltro, setPerfilFiltro] = useState('');

  // Filtro de perfil para vista revisar (local, sobre usuarios ya cargados)
  const [perfilFiltroRevisar, setPerfilFiltroRevisar] = useState('');

  // Estados para Historial de Estados (persistidos en sessionStorage)
  const [perfilFiltroHistorial, setPerfilFiltroHistorial] = useState(() => sessionStorage.getItem('historial_perfil') || '');
  const [estadoPlataformaFiltroHistorial, setEstadoPlataformaFiltroHistorial] = useState(() => sessionStorage.getItem('historial_estado') || '');

  // Filtros para Historial de Estados (fechas, skills, bot redes, usuario)
  
  // Filtros para vista QRM
  const [filtrosQRM, setFiltrosQRM] = useState({ usuario: '', sociedad: '', marca: '', canal: '' });
  const [sociedadesQRM, setSociedadesQRM] = useState([]);
  const [marcasQRM, setMarcasQRM] = useState([]);
  const [showSociedadQRM, setShowSociedadQRM] = useState(false);
  const [showMarcaQRM, setShowMarcaQRM] = useState(false);
  const [sociedadQRMSearch, setSociedadQRMSearch] = useState('');
  const [marcaQRMSearch, setMarcaQRMSearch] = useState('');
  const sociedadQRMRef = useRef(null);
  const marcaQRMRef = useRef(null);
  const [fechaInicioHistorial, setFechaInicioHistorial] = useState(() => {
    const saved = sessionStorage.getItem('historial_fecha_inicio');
    if (saved) return saved;
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [fechaFinHistorial, setFechaFinHistorial] = useState(() => {
    const saved = sessionStorage.getItem('historial_fecha_fin');
    if (saved) return saved;
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [skillsFiltroHistorial, setSkillsFiltroHistorial] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('historial_skills')) || []; } catch { return []; }
  });
  const [skillsFiltroSearchHistorial, setSkillsFiltroSearchHistorial] = useState('');
  const [showSkillsFiltroHistorial, setShowSkillsFiltroHistorial] = useState(false);
  const [botRedesFiltroHistorial, setBotRedesFiltroHistorial] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('historial_botredes')) || []; } catch { return []; }
  });
  const [botRedesFiltroSearchHistorial, setBotRedesFiltroSearchHistorial] = useState('');
  const [showBotRedesFiltroHistorial, setShowBotRedesFiltroHistorial] = useState(false);
  const [usuarioHistorialSearch, setUsuarioHistorialSearch] = useState('');
  const [usuarioHistorialSelected, setUsuarioHistorialSelected] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('historial_usuario')) || null; } catch { return null; }
  });
  const [showUsuarioHistorialDropdown, setShowUsuarioHistorialDropdown] = useState(false);
  const skillsFiltroRefHistorial = useRef(null);
  const botRedesFiltroRefHistorial = useRef(null);
  const historialEstadosRef = useRef(null);

  // Persistir filtros del historial en sessionStorage
  useEffect(() => { sessionStorage.setItem('historial_perfil', perfilFiltroHistorial); }, [perfilFiltroHistorial]);
  useEffect(() => { sessionStorage.setItem('historial_estado', estadoPlataformaFiltroHistorial); }, [estadoPlataformaFiltroHistorial]);
  useEffect(() => { sessionStorage.setItem('historial_fecha_inicio', fechaInicioHistorial); }, [fechaInicioHistorial]);
  useEffect(() => { sessionStorage.setItem('historial_fecha_fin', fechaFinHistorial); }, [fechaFinHistorial]);
  useEffect(() => { sessionStorage.setItem('historial_skills', JSON.stringify(skillsFiltroHistorial)); }, [skillsFiltroHistorial]);
  useEffect(() => { sessionStorage.setItem('historial_botredes', JSON.stringify(botRedesFiltroHistorial)); }, [botRedesFiltroHistorial]);
  useEffect(() => { sessionStorage.setItem('historial_usuario', JSON.stringify(usuarioHistorialSelected)); }, [usuarioHistorialSelected]);

  // Filtros independientes por vista
  const [estadoFiltroRevisar, setEstadoFiltroRevisar] = useState('');
  const [estadoFiltroMasivo, setEstadoFiltroMasivo] = useState('');
  const [estadoPlataformaFiltroRevisar, setEstadoPlataformaFiltroRevisar] = useState(''); // id_estado como string
  const [estadoPlataformaFiltroMasivo, setEstadoPlataformaFiltroMasivo] = useState('');

  // Estados de plataforma (ESTADOS table)
  const [estadosPlataforma, setEstadosPlataforma] = useState([]); // [{ID_ESTADO, NOMBRE, COLOR_PATH, ...}]
  const [estadosActualesMapa, setEstadosActualesMapa] = useState({}); // { id_usuario: {id_estado, nombre, color, activo, pausa} }

  // Filtro de skills — vista REVISAR
  const [skillsFiltroRevisar, setSkillsFiltroRevisar] = useState([]);
  const [skillsFiltroSearchRevisar, setSkillsFiltroSearchRevisar] = useState('');
  const [showSkillsFiltroRevisar, setShowSkillsFiltroRevisar] = useState(false);
  const [usuariosConSkillsMapaRevisar, setUsuariosConSkillsMapaRevisar] = useState(null);
  const skillsFiltroRefRevisar = useRef(null);

  // Filtro de skills — vista MASIVO/ASIGNAR
  const [skillsFiltroMasivo, setSkillsFiltroMasivo] = useState([]);
  const [skillsFiltroSearchMasivo, setSkillsFiltroSearchMasivo] = useState('');
  const [showSkillsFiltroMasivo, setShowSkillsFiltroMasivo] = useState(false);
  const [usuariosConSkillsMapaMasivo, setUsuariosConSkillsMapaMasivo] = useState(null);
  const skillsFiltroRefMasivo = useRef(null);
  const skillsFiltroListMasivo = useRef(null);
  const botRedesFiltroListMasivo = useRef(null);
  const skillsFiltroListHistorial = useRef(null);
  const botRedesFiltroListHistorial = useRef(null);

  // Filtro de bot redes — vista REVISAR
  const [botRedesFiltroRevisar, setBotRedesFiltroRevisar] = useState([]);
  const [botRedesFiltroSearchRevisar, setBotRedesFiltroSearchRevisar] = useState('');
  const [botRedesFiltroRedSocialRevisar, setBotRedesFiltroRedSocialRevisar] = useState(''); // '' = todas
  const [showBotRedesFiltroRevisar, setShowBotRedesFiltroRevisar] = useState(false);
  const [usuariosConBotRedesMapaRevisar, setUsuariosConBotRedesMapaRevisar] = useState(null);
  const botRedesFiltroRefRevisar = useRef(null);

  // Filtro de bot redes — vista MASIVO/ASIGNAR
  const [botRedesFiltroMasivo, setBotRedesFiltroMasivo] = useState([]);
  const [botRedesFiltroSearchMasivo, setBotRedesFiltroSearchMasivo] = useState('');
  const [botRedesFiltroRedSocialMasivo, setBotRedesFiltroRedSocialMasivo] = useState(''); // '' = todas
  const [showBotRedesFiltroMasivo, setShowBotRedesFiltroMasivo] = useState(false);
  const [usuariosConBotRedesMapaMasivo, setUsuariosConBotRedesMapaMasivo] = useState(null);
  const botRedesFiltroRefMasivo = useRef(null);

  // Skills disponibles compartidas (mismo origen)
  const [skillsFiltroDisponibles, setSkillsFiltroDisponibles] = useState([]);
  
  // Permisos disponibles para selección
  const [skillsDisponibles, setSkillsDisponibles] = useState([]);
  const [tiposClienteDisponibles, setTiposClienteDisponibles] = useState([]);
  const [botRedesDisponibles, setBotRedesDisponibles] = useState([]);
  
  // Permisos seleccionados para asignar/eliminar
  const [permisosSeleccionados, setPermisosSeleccionados] = useState({
    skills: [],
    tipos_cliente: [],
    bot_redes: []
  });
  
  // Modal unificado
  const [showModalPermisos, setShowModalPermisos] = useState(false);
  const [modalTabActiva, setModalTabActiva] = useState('skills');
  const [showModalAsignar, setShowModalAsignar] = useState(false);
  const [showModalEliminar, setShowModalEliminar] = useState(false);
  const [cargandoPermisosModal, setCargandoPermisosModal] = useState(false);
  const [permisosOriginales, setPermisosOriginales] = useState({ skills: [], tipos_cliente: [], bot_redes: [] });
  
  // Búsqueda en modales
  const [searchSkills, setSearchSkills] = useState('');
  const [searchTipos, setSearchTipos] = useState('');
  const [searchBotRedes, setSearchBotRedes] = useState('');

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (usuarioInputRef.current && !usuarioInputRef.current.contains(event.target)) {
        setShowUsuarioDropdown(false);
      }
      if (skillsFiltroRefRevisar.current && !skillsFiltroRefRevisar.current.contains(event.target)) {
        setShowSkillsFiltroRevisar(false);
      }
      if (skillsFiltroRefMasivo.current && !skillsFiltroRefMasivo.current.contains(event.target)) {
        setShowSkillsFiltroMasivo(false);
      }
      if (skillsFiltroRefHistorial.current && !skillsFiltroRefHistorial.current.contains(event.target)) {
        setShowSkillsFiltroHistorial(false);
      }
      if (botRedesFiltroRefRevisar.current && !botRedesFiltroRefRevisar.current.contains(event.target)) {
        setShowBotRedesFiltroRevisar(false);
      }
      if (botRedesFiltroRefMasivo.current && !botRedesFiltroRefMasivo.current.contains(event.target)) {
        setShowBotRedesFiltroMasivo(false);
      }
      if (botRedesFiltroRefHistorial.current && !botRedesFiltroRefHistorial.current.contains(event.target)) {
        setShowBotRedesFiltroHistorial(false);
      }
      if (usuarioMasivoRef.current && !usuarioMasivoRef.current.contains(event.target)) {
        setShowUsuarioMasivoDropdown(false);
      }
      if (usuarioEjemploRef.current && !usuarioEjemploRef.current.contains(event.target)) {
        setShowUsuarioEjemploDropdown(false);
      }
      if (empresaSegRef.current && !empresaSegRef.current.contains(event.target)) {
        setShowEmpresaSegDropdown(false);
      }
      if (perfilSegRef.current && !perfilSegRef.current.contains(event.target)) {
        setShowPerfilSegDropdown(false);
      }
      if (elementoSegRef.current && !elementoSegRef.current.contains(event.target)) {
        setShowElementoSegDropdown(false);
      }
      if (perfilMasivaRef.current && !perfilMasivaRef.current.contains(event.target)) {
        setShowPerfilMasivaDropdown(false);
      }
      if (elementoMasivaRef.current && !elementoMasivaRef.current.contains(event.target)) {
        setShowElementoMasivaDropdown(false);
      }
      if (empresaDropdownRef.current && !empresaDropdownRef.current.contains(event.target)) {
        setShowEmpresaDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Buscar skills disponibles (compartidas, se cargan una sola vez por empresa)
  useEffect(() => {
    if (!filtros.db_key || !filtros.id_empresa) { setSkillsFiltroDisponibles([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(API_URLS.skillsDisponibles(filtros.db_key, filtros.id_empresa, ''));
        const data = await res.json();
        setSkillsFiltroDisponibles(Array.isArray(data) ? data : []);
      } catch { setSkillsFiltroDisponibles([]); }
    }, 200);
    return () => clearTimeout(timer);
  }, [filtros.id_empresa, filtros.db_key]);

  // Buscar bot redes disponibles (compartidas, se cargan una sola vez por empresa)
  useEffect(() => {
    if (!filtros.db_key || !filtros.id_empresa) { setBotRedesDisponibles([]); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(API_URLS.botRedesDisponibles(filtros.db_key, filtros.id_empresa, ''));
        const data = await res.json();
        setBotRedesDisponibles(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error('Error cargando bot redes:', e);
        setBotRedesDisponibles([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [filtros.id_empresa, filtros.db_key]);

  // Recalcular pageSize cuando cambia el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      const nuevoPageSize = calcularPageSize();
      setUsrPageSize(nuevoPageSize);
      // Resetear a página 1 para evitar quedar en una página vacía
      setPaginaLocal(1);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Mapa de skills → usuarios (vista REVISAR)
  useEffect(() => {
    if (skillsFiltroRevisar.length === 0) { setUsuariosConSkillsMapaRevisar(null); return; }
    if (!filtros.db_key) return;
    const ids = skillsFiltroRevisar.map(s => s.ID_SKILL).join(',');
    const controller = new AbortController();
    fetch(API_URLS.usuariosConSkills(filtros.db_key, filtros.id_empresa, ids), { signal: controller.signal })
      .then(r => r.json())
      .then(data => setUsuariosConSkillsMapaRevisar(data && typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(e => { if (e.name !== 'AbortError') setUsuariosConSkillsMapaRevisar({}); });
    return () => controller.abort();
  }, [skillsFiltroRevisar, filtros.db_key, filtros.id_empresa]);

  // Mapa de skills → usuarios (vista MASIVO/ASIGNAR)
  useEffect(() => {
    if (skillsFiltroMasivo.length === 0) { setUsuariosConSkillsMapaMasivo(null); return; }
    if (!filtros.db_key) return;
    const ids = skillsFiltroMasivo.map(s => s.ID_SKILL).join(',');
    const controller = new AbortController();
    fetch(API_URLS.usuariosConSkills(filtros.db_key, filtros.id_empresa, ids), { signal: controller.signal })
      .then(r => r.json())
      .then(data => setUsuariosConSkillsMapaMasivo(data && typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(e => { if (e.name !== 'AbortError') setUsuariosConSkillsMapaMasivo({}); });
    return () => controller.abort();
  }, [skillsFiltroMasivo, filtros.db_key, filtros.id_empresa]);

  // Mapa de bot redes → usuarios (vista REVISAR)
  useEffect(() => {
    if (botRedesFiltroRevisar.length === 0) { setUsuariosConBotRedesMapaRevisar(null); return; }
    if (!filtros.db_key) return;
    const ids = botRedesFiltroRevisar.map(b => b.ID_BOT_REDES).join(',');
    const controller = new AbortController();
    fetch(API_URLS.usuariosConBotRedes(filtros.db_key, filtros.id_empresa, ids), { signal: controller.signal })
      .then(r => r.json())
      .then(data => setUsuariosConBotRedesMapaRevisar(data && typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(e => { if (e.name !== 'AbortError') setUsuariosConBotRedesMapaRevisar({}); });
    return () => controller.abort();
  }, [botRedesFiltroRevisar, filtros.db_key, filtros.id_empresa]);

  // Mapa de bot redes → usuarios (vista MASIVO/ASIGNAR)
  useEffect(() => {
    if (botRedesFiltroMasivo.length === 0) { setUsuariosConBotRedesMapaMasivo(null); return; }
    if (!filtros.db_key) return;
    const ids = botRedesFiltroMasivo.map(b => b.ID_BOT_REDES).join(',');
    const controller = new AbortController();
    fetch(API_URLS.usuariosConBotRedes(filtros.db_key, filtros.id_empresa, ids), { signal: controller.signal })
      .then(r => r.json())
      .then(data => setUsuariosConBotRedesMapaMasivo(data && typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(e => { if (e.name !== 'AbortError') setUsuariosConBotRedesMapaMasivo({}); });
    return () => controller.abort();
  }, [botRedesFiltroMasivo, filtros.db_key, filtros.id_empresa]);

  // Cargar estados disponibles de la empresa (ESTADOS table)
  useEffect(() => {
    if (!filtros.db_key || !filtros.id_empresa) { setEstadosPlataforma([]); return; }
    fetch(API_URLS.estadosDisponibles(filtros.db_key, filtros.id_empresa))
      .then(r => r.json())
      .then(data => setEstadosPlataforma(Array.isArray(data) ? data : []))
      .catch(() => setEstadosPlataforma([]));
  }, [filtros.db_key, filtros.id_empresa]);

  // Cargar mapa de estados actuales de usuarios
  useEffect(() => {
    if (!filtros.db_key || !filtros.id_empresa) { setEstadosActualesMapa({}); return; }
    const controller = new AbortController();
    fetch(API_URLS.estadosActuales(filtros.db_key, filtros.id_empresa), { signal: controller.signal })
      .then(r => r.json())
      .then(data => setEstadosActualesMapa(data && typeof data === 'object' && !Array.isArray(data) ? data : {}))
      .catch(e => { if (e.name !== 'AbortError') setEstadosActualesMapa({}); });
    return () => controller.abort();
  }, [filtros.db_key, filtros.id_empresa]);

  // Cargar empresas: solo si no hay cache O si cambió la base de datos
  useEffect(() => {
    if (!filtros.db_key) return;
    const dbCambio = filtros.db_key !== dbKeyCacheadaRef.current;
    dbKeyCacheadaRef.current = filtros.db_key;
    if (empresas.length > 0 && !dbCambio) return;
    if (dbCambio) {
      setEmpresas([]);
      sessionStorage.removeItem('usr_empresas');
      setUsuarios([]);
      sessionStorage.removeItem('usr_usuarios');
      empresaCacheadaRef.current = '';
      limpiarUsuarioEjemplo();
    }
    const controller = new AbortController();
    cargarEmpresas(controller.signal);
    return () => controller.abort();
  }, [filtros.db_key]);

  // Cargar usuarios: solo si no hay cache O si la empresa cambió realmente
  useEffect(() => {
    if (filtros.id_empresa && filtros.db_key) {
      const empresaCambio = filtros.id_empresa !== empresaCacheadaRef.current;
      empresaCacheadaRef.current = filtros.id_empresa;
      if (usuarios.length === 0 || empresaCambio) {
        if (empresaCambio) {
          setUsuarios([]);
          sessionStorage.removeItem('usr_usuarios');
        }
        const controller = new AbortController();
        cargarUsuarios('', 1, controller.signal);
        limpiarPermisos();
        setPaginaLocal(1);
        return () => controller.abort();
      }
    } else if (!filtros.id_empresa) {
      empresaCacheadaRef.current = '';
      setUsuarios([]);
      sessionStorage.removeItem('usr_usuarios');
      limpiarPermisos();
      setPaginaLocal(1);
    }
  }, [filtros.id_empresa, filtros.db_key]);

  // Cargar permisos cuando se selecciona un usuario
  useEffect(() => {
    if (filtros.id_usuario && filtros.db_key) {
      const controller = new AbortController();
      cargarPermisos(controller.signal);
      return () => controller.abort();
    }
  }, [filtros.id_usuario, filtros.db_key]);

  const cargarEmpresas = async (signal) => {
    setLoading(prev => ({ ...prev, empresas: true }));
    try {
      const res = await fetch(API_URLS.empresas(filtros.db_key), { signal });
      const data = await res.json();
      if (Array.isArray(data)) setEmpresas(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando empresas:", e);
      toast.error("Error al cargar empresas");
    } finally {
      setLoading(prev => ({ ...prev, empresas: false }));
    }
  };

  const cargarUsuarios = async (search = '', page = 1, signal) => {
    if (!filtros.id_empresa) return;
    setLoading(prev => ({ ...prev, usuarios: true }));
    try {
      const res = await fetch(API_URLS.usuarios(filtros.db_key, filtros.id_empresa, search, page), { signal });
      const data = await res.json();
      if (data && Array.isArray(data.usuarios)) {
        if (page === 1) setUsuarios(data.usuarios);
        else setUsuarios(prev => [...prev, ...data.usuarios]);
        setPaginacionUsuarios({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando usuarios:", e);
      toast.error("Error al cargar usuarios");
    } finally {
      setLoading(prev => ({ ...prev, usuarios: false }));
    }
  };

  const cargarPermisos = async (signal) => {
    if (!filtros.id_usuario || !filtros.db_key) return;

    setLoading(prev => ({ ...prev, permisos: true }));
    try {
      const [resRedes, resSkills, resTipos] = await Promise.all([
        fetchWithAuth(API_URLS.permisosRedes(filtros.db_key, filtros.id_usuario), { signal }),
        fetchWithAuth(API_URLS.permisosSkills(filtros.db_key, filtros.id_usuario), { signal }),
        fetchWithAuth(API_URLS.permisosTiposCliente(filtros.db_key, filtros.id_usuario), { signal })
      ]);

      const [redes, skills, tiposCliente] = await Promise.all([
        resRedes.json(),
        resSkills.json(),
        resTipos.json()
      ]);

      setPermisos({
        redes: Array.isArray(redes) ? redes : [],
        skills: Array.isArray(skills) ? skills : [],
        tiposCliente: Array.isArray(tiposCliente) ? tiposCliente : []
      });

      const usuario = usuarios.find(u => u.ID_USUARIO === parseInt(filtros.id_usuario));
      setUsuarioSeleccionado(usuario || null);

      if (usuario) cargarInfoSeguridad(usuario.NOMBRE_USUARIO, signal);

      toast.success("Permisos cargados correctamente");
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando permisos:", e);
      toast.error("Error al cargar permisos del usuario");
    } finally {
      setLoading(prev => ({ ...prev, permisos: false }));
    }
  };
  
  // Cargar información de seguridad (estado y perfil)
  const cargarInfoSeguridad = async (nombreUsuario, signal) => {
    if (!nombreUsuario || !filtros.db_key) return;
    
    setLoading(prev => ({ ...prev, seguridad: true }));
    try {
      const res = await fetch(API_URLS.infoUsuarioSeguridad(filtros.db_key, nombreUsuario), { signal });
      const data = await res.json();
      
      if (data.encontrado) {
        setInfoSeguridad(data);
      } else {
        setInfoSeguridad({
          encontrado: false,
          estado: 'DESCONOCIDO',
          perfiles: []
        });
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando info de seguridad:", e);
      setInfoSeguridad(null);
    } finally {
      setLoading(prev => ({ ...prev, seguridad: false }));
    }
  };

  const limpiarPermisos = () => {
    setPermisos({ redes: [], skills: [], tiposCliente: [] });
    setUsuarioSeleccionado(null);
    setInfoSeguridad(null);
    setFiltros(prev => ({ ...prev, id_usuario: '' }));
  };
  
  // Cargar perfiles disponibles desde seguridad
  const cargarPerfiles = async () => {
    if (!filtros.db_key) return;
    
    try {
      const res = await fetch(API_URLS.perfilesSeguridad(filtros.db_key));
      const data = await res.json();
      setPerfilesDisponibles(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando perfiles:", e);
      setPerfilesDisponibles([]);
    }
  };
  
  // Cargar usuarios por perfil
  const cargarUsuariosPorPerfil = async () => {
    if (!filtros.db_key || !filtros.id_empresa || !perfilFiltro) {
      // Si no hay filtro de perfil, cargar todos los usuarios
      cargarUsuarios('', 1);
      return;
    }
    
    setLoading(prev => ({ ...prev, usuarios: true }));
    try {
      const res = await fetch(API_URLS.usuariosPorPerfil(filtros.db_key, filtros.id_empresa, perfilFiltro));
      const data = await res.json();
      setUsuarios(Array.isArray(data) ? data : []);
      setPaginacionUsuarios({ page: 1, totalPages: 1, total: data.length });
    } catch (e) {
      console.error("Error cargando usuarios por perfil:", e);
      toast.error("Error al cargar usuarios filtrados");
    } finally {
      setLoading(prev => ({ ...prev, usuarios: false }));
    }
  };

  const handleEmpresaChange = (e) => {
    const selectedId = e.target.value;
    setFiltros({
      ...filtros,
      id_empresa: selectedId,
      id_usuario: ''
    });
    setUsuarioSearch('');
    setUsuariosFiltroRevisar([]);
    setUsuarios([]);
    // Limpiar filtros del historial al cambiar de empresa
    setPerfilFiltroHistorial('');
    setEstadoPlataformaFiltroHistorial('');
    setSkillsFiltroHistorial([]);
    setBotRedesFiltroHistorial([]);
    setUsuarioHistorialSelected(null);
    // Limpiar cache del historial en sessionStorage
    Object.keys(sessionStorage).forEach(key => {
      if (key.startsWith('historial_cache_')) sessionStorage.removeItem(key);
    });
    
    // Cargar usuarios para poder mostrar el filtro de perfiles en Historial
    if (selectedId) {
      setTimeout(() => cargarUsuarios('', 1), 0);
    }
  };

  const handleUsuarioSearch = (e) => {
    const value = e.target.value;
    setUsuarioSearch(value);
    cargarUsuarios(value, 1);
    setShowUsuarioDropdown(true);
  };

  const seleccionarUsuario = (usuario) => {
    setFiltros({
      ...filtros,
      id_usuario: usuario.ID_USUARIO.toString()
    });
    setUsuarioSearch(usuario.NOMBRE_USUARIO);
    setShowUsuarioDropdown(false);
  };

  const limpiarFiltros = () => {
    setFiltros({
      db_key: 'db_1',
      id_empresa: '',
      id_usuario: ''
    });
    setUsuarioSearch('');
    setUsuariosFiltroRevisar([]);
    setUsuarios([]);
    setPerfilFiltro('');
    setPerfilFiltroRevisar('');
    setEstadoFiltroRevisar('');
    setEstadoFiltroMasivo('');
    setEstadoPlataformaFiltroRevisar('');
    setEstadoPlataformaFiltroMasivo('');
    setEstadosPlataforma([]);
    setEstadosActualesMapa({});
    setSkillsFiltroRevisar([]);
    setSkillsFiltroMasivo([]);
    setUsuariosConSkillsMapaRevisar(null);
    setUsuariosConSkillsMapaMasivo(null);
    setBotRedesFiltroRevisar([]);
    setBotRedesFiltroMasivo([]);
    setBotRedesFiltroRedSocialRevisar('');
    setBotRedesFiltroRedSocialMasivo('');
    setUsuariosConBotRedesMapaRevisar(null);
    setUsuariosConBotRedesMapaMasivo(null);
    setUsuarioMasivoSearch('');
    setUsuariosSeleccionados([]);
    setUsuarioEjemplo(null);
    setPermisosEjemplo({ skills: [], bot_redes: [], tipos_cliente: [] });
    setPermisosEjemploSeleccionados({ skills: [], bot_redes: [], tipos_cliente: [] });
    setUsuarioEjemploSearch('');
    setUsuariosDestinoSeleccionados([]);
    setPerfilFiltroAsignacion('');
    setEstadoFiltroAsignacion('');
    setEstadoPlataformaFiltroAsignacion('');
    setUsuarioDestinoSearch('');
    // Limpiar filtros de seguridad
    setDbKeySeg('db_9');
    setSubSeccionSeg('usuarios');
    setSecEmpresaId('');
    setEstadoSeg('');
    setPerfilFiltroSeg('');
    setElementoSeg('');
    setResultadosSeg(null);
    setElementosSeg([]);
    limpiarPermisos();
  };

  const volverALista = () => {
    setFiltros(prev => ({ ...prev, id_usuario: '' }));
    setUsuarioSeleccionado(null);
    limpiarPermisos();
  };

  // ============================================================
  // FUNCIONES DE SEGURIDAD
  // ============================================================
  const cargarDatosSeg = async (key) => {
    const k = typeof key === 'string' ? key : dbKeySeg;
    setLoadingEmpSeg(true); setLoadingPerfilesSeg(true);
    setEmpresasSeg([]); setPerfilesSeg([]);
    setSecEmpresaId(''); setResultadosSeg(null);
    try {
      const [resEmp, resPerf] = await Promise.all([
        fetch(API_URLS.seguridadEmpresas(k)),
        fetch(API_URLS.seguridadPerfilesList(k)),
      ]);
      const [dataEmp, dataPerf] = await Promise.all([resEmp.json(), resPerf.json()]);
      setEmpresasSeg(Array.isArray(dataEmp) ? dataEmp : []);
      setPerfilesSeg(Array.isArray(dataPerf) ? dataPerf : []);
    } catch { toast.error('Error al cargar datos de seguridad'); }
    finally { setLoadingEmpSeg(false); setLoadingPerfilesSeg(false); }
  };

  const consultarSeg = async () => {
    setLoadingSeg(true); setResultadosSeg(null); setPerfilFiltroSeg('');
    try {
      const res = await fetchWithAuth(API_URLS.seguridadPermisosUsuarios(dbKeySeg, { secempresaid: secEmpresaId, estado: estadoSeg }));
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al consultar');
      const normalizado = (Array.isArray(data) ? data : []).map(u => ({
        ...u,
        perfiles: Array.isArray(u.perfiles) ? u.perfiles : []
      }));
      setResultadosSeg(normalizado);
    } catch (e) { toast.error(e.message); setResultadosSeg([]); }
    finally { setLoadingSeg(false); }
  };

  const buscarMasiva = async () => {
    if (!secEmpresaId) { toast.error('Selecciona una empresa'); return; }
    if (modoMasiva === 'quitar' && !elemIdMasiva) { toast.error('Selecciona el elemento a buscar'); return; }
    setLoadingMasiva(true);
    setUsuariosMasiva([]);
    setSeleccionadosMasiva(new Set());
    setLogMasiva(null);
    try {
      const url = modoMasiva === 'asignar'
        ? API_URLS.seguridadUsuariosLista(dbKeySeg, { secempresaid: secEmpresaId, estado: estadoSeg || 'ALTA', perfilid: perfilIdMasiva })
        : API_URLS.seguridadUsuariosConElemento(dbKeySeg, elemIdMasiva, { secempresaid: secEmpresaId, estado: estadoSeg || 'ALTA', perfilid: perfilIdMasiva });
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al buscar usuarios');
      const usuariosOrdenados = (Array.isArray(data) ? data : []).sort((a, b) => a.usuario.localeCompare(b.usuario));
      setUsuariosMasiva(usuariosOrdenados);
    } catch (e) { toast.error(e.message); setUsuariosMasiva([]); }
    finally { setLoadingMasiva(false); }
  };

  const ejecutarMasiva = async () => {
    if (!elemIdMasiva) { toast.error('Selecciona el elemento'); return; }
    const ids = Array.from(seleccionadosMasiva);
    if (!ids.length) { toast.error('Selecciona al menos un usuario'); return; }
    setEjecutandoMasiva(true);
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const url = modoMasiva === 'asignar' ? API_URLS.seguridadAsignarMasivo() : API_URLS.seguridadQuitarMasivo();
      const body = { 
        db_key: dbKeySeg, 
        secelementoid: parseInt(elemIdMasiva), 
        secusuarioids: ids,
        secempresaid: secEmpresaId,
        creado_por: creadoPor
      };
      if (modoMasiva === 'asignar') body.perfilid = perfilIdMasiva || null;
      const res = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al ejecutar');
      setLogMasiva(data);
      toast.success('Operación completada');
      // Actualizar lista si es modo quitar
      if (modoMasiva === 'quitar') await buscarMasiva();
    } catch (e) { toast.error(e.message); }
    finally { setEjecutandoMasiva(false); }
  };

  useEffect(() => {
    if (vistaActiva !== 'seguridad') return;
    const cargarElementosPorEmpresa = async () => {
      setLoadingElementosSeg(true);
      if (!secEmpresaId) { setElementosSeg([]); setLoadingElementosSeg(false); return; }
      try {
        const res = await fetch(API_URLS.seguridadElementosPorEmpresa(dbKeySeg, secEmpresaId));
        const data = await res.json();
        setElementosSeg(Array.isArray(data) ? data : []);
      } catch { setElementosSeg([]); }
      finally { setLoadingElementosSeg(false); }
    };
    cargarElementosPorEmpresa();
  }, [secEmpresaId, dbKeySeg, vistaActiva]);

  // Cargar perfiles y elementos para Gestión Masiva
  useEffect(() => {
    if (vistaActiva !== 'seguridad' || subSeccionSeg !== 'masiva') return;
    const cargarDatosMasiva = async () => {
      if (!secEmpresaId) { 
        setPerfilesMasiva(perfilesSeg || []); 
        setElementosMasiva([]); 
        return; 
      }
      setLoadingPerfilesMasiva(true);
      setLoadingElementosMasiva(true);
      try {
        const [resPerfiles, resElementos] = await Promise.all([
          fetch(API_URLS.seguridadPerfilesPorEmpresa(dbKeySeg, secEmpresaId)),
          fetch(API_URLS.seguridadElementosPorEmpresa(dbKeySeg, secEmpresaId))
        ]);
        const dataPerfiles = await resPerfiles.json();
        const dataElementos = await resElementos.json();
        setPerfilesMasiva(Array.isArray(dataPerfiles) ? dataPerfiles : []);
        setElementosMasiva(Array.isArray(dataElementos) ? dataElementos : []);
      } catch {
        setPerfilesMasiva([]);
        setElementosMasiva([]);
      } finally {
        setLoadingPerfilesMasiva(false);
        setLoadingElementosMasiva(false);
      }
    };
    cargarDatosMasiva();
  }, [secEmpresaId, dbKeySeg, vistaActiva, subSeccionSeg, perfilesSeg]);

  // Resetear perfil y elemento cuando cambia empresa en masiva
  useEffect(() => {
    setPerfilIdMasiva('');
    setElemIdMasiva('');
  }, [secEmpresaId]);

  const handleDbSegChange = (newKey) => {
    setDbKeySeg(newKey);
    cargarDatosSeg(newKey);
  };

  const toggleUsuarioFiltroRevisar = (usuario) => {
    setUsuariosFiltroRevisar(prev => {
      const existe = prev.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
      return existe
        ? prev.filter(u => u.ID_USUARIO !== usuario.ID_USUARIO)
        : [...prev, usuario];
    });
    setPaginaLocal(1);
  };

  // Manejar scroll infinito en dropdown
  const handleUsuarioScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      if (paginacionUsuarios.page < paginacionUsuarios.totalPages && !loading.usuarios) {
        cargarUsuarios(usuarioSearch, paginacionUsuarios.page + 1);
      }
    }
  };

  // Filtrar usuarios para el dropdown
  const usuariosFiltrados = usuarios.filter(u =>
    usuarioSearch === '' || u.NOMBRE_USUARIO.toLowerCase().includes(usuarioSearch.toLowerCase())
  );

  // ============================================================
  // FUNCIONES DE GESTIÓN MASIVA
  // ============================================================
  
  // Cargar permisos disponibles para el modal
  const cargarPermisosDisponibles = async () => {
    if (!filtros.db_key) return;
    
    setLoading(prev => ({ ...prev, masivo: true }));
    try {
      const [resSkills, resTipos, resBotRedes] = await Promise.all([
        fetch(API_URLS.skillsDisponibles(filtros.db_key, filtros.id_empresa, searchSkills)),
        fetch(API_URLS.tiposClienteDisponibles(filtros.db_key, filtros.id_empresa, searchTipos)),
        fetch(API_URLS.botRedesDisponibles(filtros.db_key, filtros.id_empresa, searchBotRedes))
      ]);
      
      const [skills, tipos, botRedes] = await Promise.all([
        resSkills.json(),
        resTipos.json(),
        resBotRedes.json()
      ]);
      
      setSkillsDisponibles(Array.isArray(skills) ? skills : []);
      setTiposClienteDisponibles(Array.isArray(tipos) ? tipos : []);
      setBotRedesDisponibles(Array.isArray(botRedes) ? botRedes : []);
    } catch (e) {
      console.error("Error cargando permisos disponibles:", e);
      toast.error("Error al cargar permisos disponibles");
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };
  
  // Toggle selección de usuario en modo masivo
  const toggleUsuarioSeleccionado = (usuario) => {
    setUsuariosSeleccionados(prev => {
      const existe = prev.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
      if (existe) {
        return prev.filter(u => u.ID_USUARIO !== usuario.ID_USUARIO);
      }
      return [...prev, usuario];
    });
  };
  
  // Seleccionar todos los usuarios visibles
  const seleccionarTodosUsuarios = () => {
    if (usuariosSeleccionados.length === usuarios.length) {
      setUsuariosSeleccionados([]);
    } else {
      setUsuariosSeleccionados([...usuarios]);
    }
  };

  const actualizarSkillUsuarioEnMapa = (setMapa, idUsuario, idSkill, agregar) => {
    setMapa(prev => {
      if (prev === null) return prev;
      const key = String(idUsuario);
      const actuales = (prev[key] || []).map(Number);
      const siguiente = agregar
        ? [...new Set([...actuales, Number(idSkill)])]
        : actuales.filter(id => id !== Number(idSkill));
      const nuevoMapa = { ...prev };
      if (siguiente.length > 0) {
        nuevoMapa[key] = siguiente;
      } else {
        delete nuevoMapa[key];
      }
      return nuevoMapa;
    });
  };

  const cambiarSkillUsuarioRapido = async (usuario, skill, agregar, vista) => {
    const accion = agregar ? 'agregar' : 'quitar';
    try {
      setLoading(prev => ({ ...prev, masivo: true }));
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const res = await fetchWithAuth(agregar ? API_URLS.permisosMasivoAgregar() : API_URLS.permisosMasivoEliminar(), {
        method: 'POST',
        body: JSON.stringify({
          db_key: filtros.db_key,
          usuarios: [usuario.ID_USUARIO],
          permisos: { skills: [skill.ID_SKILL], tipos_cliente: [], bot_redes: [] },
          creado_por: creadoPor
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `No se pudo ${accion} el permiso`);
      }
      if (vista === 'revisar') {
        actualizarSkillUsuarioEnMapa(setUsuariosConSkillsMapaRevisar, usuario.ID_USUARIO, skill.ID_SKILL, agregar);
      } else {
        actualizarSkillUsuarioEnMapa(setUsuariosConSkillsMapaMasivo, usuario.ID_USUARIO, skill.ID_SKILL, agregar);
      }
      toast.success(`${agregar ? 'Asignado' : 'Eliminado'} ${skill.NOMBRE_SKILL} para ${usuario.NOMBRE_USUARIO}`);
      
      // Registrar en auditoría
      const logData = {
        tipo_accion: agregar ? 'PERMISO_AGREGAR' : 'PERMISO_ELIMINAR',
        entidad: 'SKILL',
        id_entidad: skill.ID_SKILL,
        db_key: filtros.db_key,
        db_nombre: DB_NAMES[filtros.db_key],
        id_empresa: filtros.id_empresa,
        id_usuario_afectado: usuario.ID_USUARIO,
        nombre_usuario_afec: usuario.NOMBRE_USUARIO,
        id_skill: skill.ID_SKILL,
        nombre_skill: skill.NOMBRE_SKILL
      };
      if (agregar) {
        await logPermisoAgregado(logData);
      } else {
        await logPermisoEliminado(logData);
      }
    } catch (e) {
      console.error(`Error al ${accion} skill del usuario:`, e);
      toast.error(e.message || `Error al ${accion} permiso`);
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };

  const cambiarTodasSkillsUsuario = async (usuario, skills, agregar, vista) => {
    if (skills.length === 0) return;
    const accion = agregar ? 'agregar' : 'quitar';
    const idsSkills = skills.map(s => s.ID_SKILL);
    try {
      setLoading(prev => ({ ...prev, masivo: true }));
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const res = await fetchWithAuth(agregar ? API_URLS.permisosMasivoAgregar() : API_URLS.permisosMasivoEliminar(), {
        method: 'POST',
        body: JSON.stringify({
          db_key: filtros.db_key,
          usuarios: [usuario.ID_USUARIO],
          permisos: { skills: idsSkills, tipos_cliente: [], bot_redes: [] },
          creado_por: creadoPor
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `No se pudieron ${accion} los permisos`);
      }
      const setMapa = vista === 'revisar' ? setUsuariosConSkillsMapaRevisar : setUsuariosConSkillsMapaMasivo;
      idsSkills.forEach(idSkill => actualizarSkillUsuarioEnMapa(setMapa, usuario.ID_USUARIO, idSkill, agregar));
      toast.success(`${agregar ? 'Asignadas' : 'Eliminadas'} ${skills.length} skills para ${usuario.NOMBRE_USUARIO}`);
    } catch (e) {
      console.error(`Error al ${accion} skills del usuario:`, e);
      toast.error(e.message || `Error al ${accion} permisos`);
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };

  // Actualizar mapa de bot redes para un usuario individual
  const actualizarBotRedUsuarioEnMapa = (setMapa, idUsuario, idBotRed, agregar) => {
    setMapa(prev => {
      if (prev === null) return prev;
      const key = String(idUsuario);
      const actuales = (prev[key] || []).map(Number);
      const siguiente = agregar
        ? [...new Set([...actuales, Number(idBotRed)])]
        : actuales.filter(id => id !== Number(idBotRed));
      const nuevoMapa = { ...prev };
      if (siguiente.length > 0) {
        nuevoMapa[key] = siguiente;
      } else {
        delete nuevoMapa[key];
      }
      return nuevoMapa;
    });
  };

  const cambiarBotRedUsuarioRapido = async (usuario, botRed, agregar, vista) => {
    const accion = agregar ? 'agregar' : 'quitar';
    try {
      setLoading(prev => ({ ...prev, masivo: true }));
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const res = await fetchWithAuth(agregar ? API_URLS.permisosMasivoAgregar() : API_URLS.permisosMasivoEliminar(), {
        method: 'POST',
        body: JSON.stringify({
          db_key: filtros.db_key,
          usuarios: [usuario.ID_USUARIO],
          permisos: { skills: [], tipos_cliente: [], bot_redes: [botRed.ID_BOT_REDES] },
          creado_por: creadoPor
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `No se pudo ${accion} el permiso`);
      }
      if (vista === 'revisar') {
        actualizarBotRedUsuarioEnMapa(setUsuariosConBotRedesMapaRevisar, usuario.ID_USUARIO, botRed.ID_BOT_REDES, agregar);
      } else {
        actualizarBotRedUsuarioEnMapa(setUsuariosConBotRedesMapaMasivo, usuario.ID_USUARIO, botRed.ID_BOT_REDES, agregar);
      }
      toast.success(`${agregar ? 'Asignado' : 'Eliminado'} ${botRed.NOMBRE_BOT} para ${usuario.NOMBRE_USUARIO}`);
      
      // Registrar en auditoría
      const logData = {
        tipo_accion: agregar ? 'PERMISO_AGREGAR' : 'PERMISO_ELIMINAR',
        entidad: 'BOT_RED',
        id_entidad: botRed.ID_BOT_REDES,
        db_key: filtros.db_key,
        db_nombre: DB_NAMES[filtros.db_key],
        id_empresa: filtros.id_empresa,
        id_usuario_afectado: usuario.ID_USUARIO,
        nombre_usuario_afec: usuario.NOMBRE_USUARIO,
        id_bot_red: botRed.ID_BOT_REDES,
        nombre_bot_red: botRed.NOMBRE_BOT
      };
      if (agregar) {
        await logPermisoAgregado(logData);
      } else {
        await logPermisoEliminado(logData);
      }
    } catch (e) {
      console.error(`Error al ${accion} bot red del usuario:`, e);
      toast.error(e.message || `Error al ${accion} permiso`);
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };

  const cambiarTodasBotRedesUsuario = async (usuario, botRedes, agregar, vista) => {
    if (botRedes.length === 0) return;
    const accion = agregar ? 'agregar' : 'quitar';
    const idsBotRedes = botRedes.map(b => b.ID_BOT_REDES);
    try {
      setLoading(prev => ({ ...prev, masivo: true }));
      const res = await fetchWithAuth(agregar ? API_URLS.permisosMasivoAgregar() : API_URLS.permisosMasivoEliminar(), {
        method: 'POST',
        body: JSON.stringify({
          db_key: filtros.db_key,
          usuarios: [usuario.ID_USUARIO],
          permisos: { skills: [], tipos_cliente: [], bot_redes: idsBotRedes }
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `No se pudieron ${accion} los permisos`);
      }
      const setMapa = vista === 'revisar' ? setUsuariosConBotRedesMapaRevisar : setUsuariosConBotRedesMapaMasivo;
      idsBotRedes.forEach(idBotRed => actualizarBotRedUsuarioEnMapa(setMapa, usuario.ID_USUARIO, idBotRed, agregar));
      toast.success(`${agregar ? 'Asignados' : 'Eliminados'} ${botRedes.length} bots para ${usuario.NOMBRE_USUARIO}`);
    } catch (e) {
      console.error(`Error al ${accion} bots del usuario:`, e);
      toast.error(e.message || `Error al ${accion} permisos`);
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };
  
  // Toggle selección de permiso
  const togglePermisoSeleccionado = (tipo, id) => {
    setPermisosSeleccionados(prev => {
      const lista = prev[tipo];
      if (lista.includes(id)) {
        return { ...prev, [tipo]: lista.filter(item => item !== id) };
      }
      return { ...prev, [tipo]: [...lista, id] };
    });
  };
  
  // Cargar permisos actuales de un usuario para pre-marcar en modal
  const cargarPermisosParaModal = async (usuario) => {
    if (!usuario || !filtros.db_key) return { skills: [], tipos_cliente: [], bot_redes: [] };
    try {
      const [resRedes, resSkills, resTipos] = await Promise.all([
        fetchWithAuth(API_URLS.permisosRedes(filtros.db_key, usuario.ID_USUARIO)),
        fetchWithAuth(API_URLS.permisosSkills(filtros.db_key, usuario.ID_USUARIO)),
        fetchWithAuth(API_URLS.permisosTiposCliente(filtros.db_key, usuario.ID_USUARIO))
      ]);
      const [redes, skills, tipos] = await Promise.all([
        resRedes.json(), resSkills.json(), resTipos.json()
      ]);
      return {
        skills: Array.isArray(skills) ? skills.map(s => s.ID_SKILL) : [],
        tipos_cliente: Array.isArray(tipos) ? tipos.map(t => t.ID_TIPO) : [],
        bot_redes: Array.isArray(redes) ? redes.map(r => r.ID_BOT_REDES) : [],
      };
    } catch (e) {
      console.error('Error cargando permisos para modal:', e);
      return { skills: [], tipos_cliente: [], bot_redes: [] };
    }
  };

  // Abrir modal unificado
  const abrirModalPermisos = async () => {
    if (usuariosSeleccionados.length === 0) {
      toast.warning("Selecciona al menos un usuario");
      return;
    }
    setCargandoPermisosModal(true);
    let preMarcar = { skills: [], tipos_cliente: [], bot_redes: [] };
    if (usuariosSeleccionados.length === 1) {
      preMarcar = await cargarPermisosParaModal(usuariosSeleccionados[0]);
    }
    setPermisosOriginales(preMarcar);
    setPermisosSeleccionados({ ...preMarcar, skills: [...preMarcar.skills], tipos_cliente: [...preMarcar.tipos_cliente], bot_redes: [...preMarcar.bot_redes] });
    await cargarPermisosDisponibles();
    setCargandoPermisosModal(false);
    setShowModalPermisos(true);
  };

  // Mantener los anteriores por compatibilidad (ya no se usan en UI)
  const abrirModalAsignar = abrirModalPermisos;
  const abrirModalEliminar = abrirModalPermisos;
  
  // Guardar cambios del modal unificado (diff: agregar nuevos, quitar removidos)
  const ejecutarGuardarPermisos = async () => {
    const agregar = {
      skills:        permisosSeleccionados.skills.filter(id => !permisosOriginales.skills.includes(id)),
      tipos_cliente: permisosSeleccionados.tipos_cliente.filter(id => !permisosOriginales.tipos_cliente.includes(id)),
      bot_redes:     permisosSeleccionados.bot_redes.filter(id => !permisosOriginales.bot_redes.includes(id)),
    };
    const quitar = {
      skills:        permisosOriginales.skills.filter(id => !permisosSeleccionados.skills.includes(id)),
      tipos_cliente: permisosOriginales.tipos_cliente.filter(id => !permisosSeleccionados.tipos_cliente.includes(id)),
      bot_redes:     permisosOriginales.bot_redes.filter(id => !permisosSeleccionados.bot_redes.includes(id)),
    };
    const totalAgregar = agregar.skills.length + agregar.tipos_cliente.length + agregar.bot_redes.length;
    const totalQuitar  = quitar.skills.length  + quitar.tipos_cliente.length  + quitar.bot_redes.length;

    if (totalAgregar === 0 && totalQuitar === 0) {
      toast.info("No hay cambios que guardar");
      return;
    }

    setLoading(prev => ({ ...prev, masivo: true }));
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const promises = [];
      if (totalAgregar > 0) {
        promises.push(fetchWithAuth(API_URLS.permisosMasivoAgregar(), {
          method: 'POST',
          body: JSON.stringify({ db_key: filtros.db_key, usuarios: usuariosSeleccionados.map(u => u.ID_USUARIO), permisos: agregar, creado_por: creadoPor })
        }).then(r => r.json()));
      }
      if (totalQuitar > 0) {
        promises.push(fetchWithAuth(API_URLS.permisosMasivoEliminar(), {
          method: 'POST',
          body: JSON.stringify({ db_key: filtros.db_key, usuarios: usuariosSeleccionados.map(u => u.ID_USUARIO), permisos: quitar })
        }).then(r => r.json()));
      }
      await Promise.all(promises);
      const partes = [];
      if (totalAgregar > 0) partes.push(`${totalAgregar} permisos asignados`);
      if (totalQuitar  > 0) partes.push(`${totalQuitar} permisos eliminados`);
      toast.success(partes.join(' · '));
      setShowModalPermisos(false);
      setPermisosSeleccionados({ skills: [], tipos_cliente: [], bot_redes: [] });
      setPermisosOriginales({ skills: [], tipos_cliente: [], bot_redes: [] });
      if (filtros.id_usuario) cargarPermisos();
    } catch (e) {
      console.error('Error guardando permisos:', e);
      toast.error('Error al guardar permisos');
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };

  // Ejecutar asignación masiva (legacy, no se usa)
  const ejecutarAsignacionMasiva = ejecutarGuardarPermisos;
  
  // Ejecutar eliminación masiva
  const ejecutarEliminacionMasiva = async () => {
    const totalPermisos = permisosSeleccionados.skills.length + 
                        permisosSeleccionados.tipos_cliente.length + 
                        permisosSeleccionados.bot_redes.length;
    
    if (totalPermisos === 0) {
      toast.warning("Selecciona al menos un permiso para eliminar");
      return;
    }
    
    setShowEliminarPermisosModal(true);
  };

  const confirmEliminarPermisos = async () => {
    setShowEliminarPermisosModal(false);
    
    setLoading(prev => ({ ...prev, masivo: true }));
    try {
      const res = await fetchWithAuth(API_URLS.permisosMasivoEliminar(), {
        method: 'POST',
        body: JSON.stringify({
          db_key: filtros.db_key,
          usuarios: usuariosSeleccionados.map(u => u.ID_USUARIO),
          permisos: permisosSeleccionados
        })
      });
      
      const data = await res.json();
      
      if (data.success) {
        toast.success(data.mensaje);
        setShowModalEliminar(false);
        setPermisosSeleccionados({ skills: [], tipos_cliente: [], bot_redes: [] });
        // Recargar permisos del usuario actual si está seleccionado
        if (filtros.id_usuario) {
          cargarPermisos();
        }
      } else {
        toast.error(data.error || "Error al eliminar permisos");
      }
    } catch (e) {
      console.error("Error en eliminación masiva:", e);
      toast.error("Error al eliminar permisos");
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };
  
  // Filtrar permisos por búsqueda y ordenar: asignados primero
  const skillsFiltrados = skillsDisponibles
    .filter(s => s.NOMBRE_SKILL?.toLowerCase().includes(searchSkills.toLowerCase()))
    .sort((a, b) => {
      const aA = permisosSeleccionados.skills.includes(a.ID_SKILL);
      const bA = permisosSeleccionados.skills.includes(b.ID_SKILL);
      if (aA === bA) return 0;
      return aA ? -1 : 1;
    });
  const tiposFiltrados = tiposClienteDisponibles
    .filter(t => t.NOMBRE_TIPO?.toLowerCase().includes(searchTipos.toLowerCase()))
    .sort((a, b) => {
      const aA = permisosSeleccionados.tipos_cliente.includes(a.ID_TIPO);
      const bA = permisosSeleccionados.tipos_cliente.includes(b.ID_TIPO);
      if (aA === bA) return 0;
      return aA ? -1 : 1;
    });
  const botRedesFiltrados = botRedesDisponibles
    .filter(b =>
      b.NOMBRE_BOT?.toLowerCase().includes(searchBotRedes.toLowerCase()) ||
      b.NOMBRE_RED_SOCIAL?.toLowerCase().includes(searchBotRedes.toLowerCase())
    )
    .sort((a, b) => {
      const aA = permisosSeleccionados.bot_redes.includes(a.ID_BOT_REDES);
      const bA = permisosSeleccionados.bot_redes.includes(b.ID_BOT_REDES);
      if (aA === bA) return 0;
      return aA ? -1 : 1;
    });

  // ============================================================
  // ASIGNACIÓN POR USUARIO EJEMPLO
  // ============================================================
  const cargarPermisosUsuarioEjemplo = async (usuario) => {
    if (!usuario || !filtros.db_key) return;
    setLoadingEjemplo(true);
    try {
      const [resSkills, resRedes, resTipos] = await Promise.all([
        fetchWithAuth(API_URLS.permisosSkills(filtros.db_key, usuario.ID_USUARIO)),
        fetchWithAuth(API_URLS.permisosRedes(filtros.db_key, usuario.ID_USUARIO)),
        fetchWithAuth(API_URLS.permisosTiposCliente(filtros.db_key, usuario.ID_USUARIO))
      ]);
      const [skills, redes, tipos] = await Promise.all([resSkills.json(), resRedes.json(), resTipos.json()]);
      const perms = {
        skills: Array.isArray(skills) ? skills : [],
        bot_redes: Array.isArray(redes) ? redes : [],
        tipos_cliente: Array.isArray(tipos) ? tipos : []
      };
      setPermisosEjemplo(perms);
      setPermisosEjemploSeleccionados({
        skills: perms.skills.map(s => s.ID_SKILL),
        bot_redes: perms.bot_redes.map(r => r.ID_BOT_REDES),
        tipos_cliente: perms.tipos_cliente.map(t => t.ID_TIPO)
      });
      toast.success(`Permisos de ${usuario.NOMBRE_USUARIO} cargados (${perms.skills.length} skills, ${perms.bot_redes.length} redes, ${perms.tipos_cliente.length} tipos)`);
    } catch (e) {
      console.error('Error cargando permisos del usuario ejemplo:', e);
      toast.error('Error al cargar permisos del usuario ejemplo');
    } finally {
      setLoadingEjemplo(false);
    }
  };

  const limpiarUsuarioEjemplo = () => {
    setUsuarioEjemplo(null);
    setPermisosEjemplo({ skills: [], bot_redes: [], tipos_cliente: [] });
    setPermisosEjemploSeleccionados({ skills: [], bot_redes: [], tipos_cliente: [] });
    setUsuarioEjemploSearch('');
    setShowUsuarioEjemploDropdown(false);
  };

  const seleccionarUsuarioEjemplo = (usuario) => {
    // Si ya está seleccionado, deseleccionarlo
    if (usuarioEjemplo?.ID_USUARIO === usuario.ID_USUARIO) {
      limpiarUsuarioEjemplo();
    } else {
      setUsuarioEjemplo(usuario);
      setUsuarioEjemploSearch('');
      setShowUsuarioEjemploDropdown(false);
      cargarPermisosUsuarioEjemplo(usuario);
    }
  };

  const togglePermisoEjemplo = (tipo, id) => {
    setPermisosEjemploSeleccionados(prev => {
      const lista = prev[tipo];
      if (lista.includes(id)) {
        return { ...prev, [tipo]: lista.filter(item => item !== id) };
      }
      return { ...prev, [tipo]: [...lista, id] };
    });
  };

  const toggleUsuarioDestino = (usuario) => {
    setUsuariosDestinoSeleccionados(prev => {
      const existe = prev.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
      if (existe) return prev.filter(u => u.ID_USUARIO !== usuario.ID_USUARIO);
      return [...prev, usuario];
    });
  };

  const ejecutarAsignacionPorEjemplo = async () => {
    const totalPermisos = permisosEjemploSeleccionados.skills.length +
      permisosEjemploSeleccionados.bot_redes.length +
      permisosEjemploSeleccionados.tipos_cliente.length;
    if (totalPermisos === 0) { toast.warning('Selecciona al menos un permiso para asignar'); return; }
    if (usuariosDestinoSeleccionados.length === 0) { toast.warning('Selecciona al menos un usuario destino'); return; }
    setShowAsignarPermisosModal(true);
  };

  const confirmAsignarPermisos = async () => {
    setShowAsignarPermisosModal(false);
    try {
      const totalPermisos = permisosEjemploSeleccionados.skills.length +
        permisosEjemploSeleccionados.bot_redes.length +
        permisosEjemploSeleccionados.tipos_cliente.length;
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const res = await fetchWithAuth(API_URLS.permisosMasivoAgregar(), {
        method: 'POST',
        body: JSON.stringify({
          db_key: filtros.db_key,
          usuarios: usuariosDestinoSeleccionados.map(u => u.ID_USUARIO),
          permisos: permisosEjemploSeleccionados,
          creado_por: creadoPor
        })
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Error al asignar permisos');
      toast.success(`${totalPermisos} permisos asignados a ${usuariosDestinoSeleccionados.length} usuarios`);
      try {
        await logPermisoMasivo({
          tipo_accion: 'PERMISO_ASIGNACION_EJEMPLO',
          entidad: 'PERMISO',
          db_key: filtros.db_key,
          db_nombre: DB_NAMES[filtros.db_key],
          id_empresa: filtros.id_empresa,
          usuario_ejemplo: usuarioEjemplo?.NOMBRE_USUARIO,
          usuarios_destino: usuariosDestinoSeleccionados.map(u => u.NOMBRE_USUARIO).join(', '),
          skills_asignados: permisosEjemploSeleccionados.skills.length,
          bot_redes_asignados: permisosEjemploSeleccionados.bot_redes.length,
          tipos_cliente_asignados: permisosEjemploSeleccionados.tipos_cliente.length
        });
      } catch {}
    } catch (e) {
      console.error('Error en asignación por ejemplo:', e);
      toast.error(e.message || 'Error al asignar permisos');
    } finally {
      setLoading(prev => ({ ...prev, masivo: false }));
    }
  };

  const PALETA_ESTADOS_BG = [
    '#6366f1','#10b981','#f59e0b','#ef4444','#3b82f6',
    '#8b5cf6','#06b6d4','#ec4899','#f97316','#14b8a6',
    '#a855f7','#0ea5e9','#d946ef','#22c55e','#64748b',
  ];
  const colorEstado = (idEstado) => {
    const n = parseInt(idEstado, 10);
    const idx = isNaN(n) ? 0 : Math.abs(n) % PALETA_ESTADOS_BG.length;
    return PALETA_ESTADOS_BG[idx];
  };

  // ============================================================
  // EXPORTAR USUARIOS
  // ============================================================
  const buildFilasConPermisos = async (lista) => {
    const filas = [];
    for (const u of lista) {
      const estadoPlat = estadosActualesMapa[String(u.ID_USUARIO)];
      const esMobil = estadoPlat ? (estadoPlat.movil === true || estadoPlat.movil === 1) : false;
      const activoDesde = estadoPlat && estadoPlat.activo ? (esMobil ? 'Móvil' : 'Web') : '';
      let skillsNombres = '';
      let botNombres = '';
      let tiposNombres = '';
      try {
        const [resSkills, resRedes, resTipos] = await Promise.all([
          fetchWithAuth(API_URLS.permisosSkills(filtros.db_key, u.ID_USUARIO)),
          fetchWithAuth(API_URLS.permisosRedes(filtros.db_key, u.ID_USUARIO)),
          fetchWithAuth(API_URLS.permisosTiposCliente(filtros.db_key, u.ID_USUARIO))
        ]);
        const [skills, redes, tipos] = await Promise.all([resSkills.json(), resRedes.json(), resTipos.json()]);
        skillsNombres = Array.isArray(skills) ? skills.map(s => s.NOMBRE_SKILL).join(', ') : '';

        // Agrupar bot redes por NOMBRE_BOT y listar redes sociales
        if (Array.isArray(redes) && redes.length > 0) {
          const grupos = {};
          for (const r of redes) {
            const bot = r.NOMBRE_BOT || 'Sin Bot';
            const red = r.NOMBRE_RED_SOCIAL || 'Sin Red';
            if (!grupos[bot]) grupos[bot] = [];
            grupos[bot].push(red);
          }
          botNombres = Object.entries(grupos)
            .map(([bot, redesSociales]) => `${bot}: ${redesSociales.join(', ')}`)
            .join('; ');
        }

        tiposNombres = Array.isArray(tipos) ? tipos.map(t => t.NOMBRE || t.TIPO_CLIENTE || t.DESCRIPCION || '').join(', ') : '';
      } catch { /* dejar vacío si falla */ }
      filas.push({
        ID: u.ID_USUARIO,
        NOMBRE_USUARIO: u.NOMBRE_USUARIO,
        PERFIL: u.PERFILES || '',
        ESTADO: u.ESTADO_SEG || '',
        ESTADO_PLATAFORMA: estadoPlat ? estadoPlat.nombre : '',
        PERMISOS_SKILLS: skillsNombres,
        PERMISOS_BOT_REDES: botNombres,
        PERMISOS_TIPO_CLIENTE: tiposNombres,
        ACTIVO_DESDE: activoDesde
      });
    }
    return filas;
  };

  const exportarUsuariosXLSX = async (lista, nombreVista) => {
    if (!lista || lista.length === 0) { toast.error('No hay usuarios para exportar'); return; }
    toast.info(`Cargando permisos de ${lista.length} usuarios...`);
    try {
      const filas = await buildFilasConPermisos(lista);
      const headers = Object.keys(filas[0]);
      const rows = filas.map(r => headers.map(h => r[h] ?? ''));
      const wb = new ExcelJS.Workbook();
      wb.creator = 'TalkMe Soporte';
      wb.created = new Date();
      const ws = wb.addWorksheet('Usuarios');
      ws.addTable({
        name: 'TablaUsuarios',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium6', showRowStripes: true },
        columns: headers.map(h => ({ name: h, filterButton: true })),
        rows
      });
      headers.forEach((h, i) => {
        const col = ws.getColumn(i + 1);
        let max = h.length;
        for (const row of rows) { const len = row[i] == null ? 0 : String(row[i]).length; if (len > max) max = len; }
        col.width = Math.min(Math.max(max + 2, 10), 60);
      });
      ws.views = [{ state: 'frozen', ySplit: 1 }];
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Usuarios_${nombreVista}_${filtros.db_key}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Excel exportado correctamente');
    } catch (e) {
      console.error('Error exportando XLSX:', e);
      toast.error('Error al exportar Excel');
    }
  };

  const exportarUsuariosCSV = async (lista, nombreVista) => {
    if (!lista || lista.length === 0) { toast.error('No hay usuarios para exportar'); return; }
    toast.info(`Cargando permisos de ${lista.length} usuarios...`);
    try {
      const filas = await buildFilasConPermisos(lista);
      const headers = Object.keys(filas[0]);
      const escapeCsv = v => { const s = v == null ? '' : String(v); return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s; };
      const csvContent = [headers.join(','), ...filas.map(r => headers.map(h => escapeCsv(r[h])).join(','))].join('\r\n');
      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Usuarios_${nombreVista}_${filtros.db_key}_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('CSV exportado correctamente');
    } catch (e) {
      console.error('Error exportando CSV:', e);
      toast.error('Error al exportar CSV');
    }
  };

  // Items del sidebar
  const SIDEBAR_ITEMS = [
    { 
      id: 'asignar', 
      label: 'Permisos TalkMe', 
      desc: 'Gestión masiva de permisos', 
      icon: (
        <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z"/>
          <path d="M12 8v4"/>
          <circle cx="12" cy="16" r="1"/>
        </svg>
      )
    },
    { 
      id: 'asignacion', 
      label: 'Asignacion Masiva', 
      desc: 'Por usuario ejemplo', 
      icon: (
        <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14,2 14,8 20,8"/>
          <line x1="16" y1="13" x2="8" y2="13"/>
          <line x1="16" y1="17" x2="8" y2="17"/>
          <polyline points="10,9 9,9 8,9"/>
        </svg>
      )
    },
    { 
      id: 'seguridad', 
      label: 'Seguridad', 
      desc: 'Permisos de seguridad', 
      icon: (
        <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
      )
    },
    { 
      id: 'historial', 
      label: 'Historial', 
      desc: 'Estados de usuarios', 
      icon: (
        <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="20" x2="18" y2="10"/>
          <line x1="12" y1="20" x2="12" y2="4"/>
          <line x1="6" y1="20" x2="6" y2="14"/>
        </svg>
      )
    },
    { 
      id: 'qrm', 
      label: 'Usuarios QRM', 
      desc: 'Configuración QRM (S2)', 
      icon: (
        <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <rect x="7" y="7" width="3" height="3"/>
          <rect x="14" y="7" width="3" height="3"/>
          <rect x="14" y="14" width="3" height="3"/>
          <rect x="7" y="14" width="3" height="3"/>
        </svg>
      )
    },
  ];

  const [expandedSidebarItem, setExpandedSidebarItem] = useState('');

  return (
    <div id="modulo-usuarios-root" className="dashboard usr-layout">
      {/* BARRA SUPERIOR: filtros compartidos */}
      <div className="usr-topbar">
        {/* Logo */}
        <div className="usr-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="usr-topbar-logo-img" />
        </div>
        {/* Subtabs de Seguridad movidas al sidebar (anidados) */}
        <div className="usr-topbar-divider" />

        {/* Filtros inline con etiquetas */}
        <div className="usr-topbar-filters">
          {/* Filtros compartidos (ocultos en seguridad) */}
          {vistaActiva !== 'seguridad' && (
            <>
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Base de Datos</span>
                <select
                  className="usr-topbar-select"
                  value={filtros.db_key}
                  disabled={vistaActiva === 'qrm'}
                  onChange={e => {
                    const newDb = e.target.value;
                    setFiltros({ ...filtros, db_key: newDb, id_empresa: '', id_usuario: '' });
                    setUsuarioSearch('');
                    setUsuariosFiltroRevisar([]);
                    setUsuarios([]);
                    setEmpresas([]);
                    sessionStorage.removeItem('usr_empresas');
                    sessionStorage.removeItem('usr_usuarios');
                    // Limpiar filtros del historial al cambiar de DB
                    setPerfilFiltroHistorial('');
                    setEstadoPlataformaFiltroHistorial('');
                    setSkillsFiltroHistorial([]);
                    setBotRedesFiltroHistorial([]);
                    setUsuarioHistorialSelected(null);
                    setFechaInicioHistorial(() => { const hoy = new Date(); return hoy.toISOString().split('T')[0]; });
                    setFechaFinHistorial(() => { const hoy = new Date(); return hoy.toISOString().split('T')[0]; });
                    // Limpiar cache del historial
                    Object.keys(sessionStorage).forEach(key => {
                      if (key.startsWith('historial_cache_')) sessionStorage.removeItem(key);
                    });
                    cargarEmpresas();
                  }}
                >
                  {Object.entries(DB_NAMES).map(([key, name]) => (
                    <option key={key} value={key}>{name}</option>
                  ))}
                </select>
              </div>

              {/* Empresa - estilo dropdown Usuario */}
              <div className="usr-topbar-field usr-topbar-field-skills" ref={empresaDropdownRef}>
                <span className="usr-topbar-label">Empresa {loading.empresas && '⌛'}</span>
                <div className="usr-skills-filtro-wrap">
                  <div
                    className={`usr-skills-filtro-input ${showEmpresaDropdown ? 'open' : ''}`}
                    onClick={() => setShowEmpresaDropdown(v => !v)}
                  >
                    {filtros.id_empresa ? (
                      <span className="usr-skills-filtro-summary">{empresas.find(e => String(e.ID_EMPRESA) === String(filtros.id_empresa))?.NOMBRE || 'Seleccionar...'}</span>
                    ) : (
                      <span className="usr-skills-filtro-placeholder">Seleccionar empresa...</span>
                    )}
                    <span className="usr-skills-filtro-chevron">{showEmpresaDropdown ? '▲' : '▼'}</span>
                  </div>
                  {showEmpresaDropdown && (
                    <div className="usr-skills-filtro-dropdown">
                      <div className="usr-skills-filtro-header">
                        <input
                          className="usr-skills-filtro-search"
                          type="text"
                          placeholder="🔍 Buscar empresa..."
                          value={empresaSearch}
                          onChange={e => setEmpresaSearch(e.target.value)}
                          onClick={ev => ev.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="usr-skills-filtro-list">
                        {empresas
                          .filter(e => (e.NOMBRE || '').toLowerCase().includes(empresaSearch.toLowerCase()))
                          .map(emp => (
                            <label
                              key={emp.ID_EMPRESA}
                              className={`usr-skills-filtro-item ${String(filtros.id_empresa) === String(emp.ID_EMPRESA) ? 'selected' : ''}`}
                              onClick={() => { 
                                const fakeEvent = { target: { value: String(emp.ID_EMPRESA) } };
                                handleEmpresaChange(fakeEvent); 
                                setShowEmpresaDropdown(false); 
                                setEmpresaSearch(''); 
                              }}
                            >
                              <span className="usr-skills-filtro-item-name">{emp.NOMBRE}</span>
                            </label>
                          ))}
                        {empresas.filter(e => (e.NOMBRE || '').toLowerCase().includes(empresaSearch.toLowerCase())).length === 0 && (
                          <div className="usr-skills-filtro-empty">No se encontraron empresas</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {vistaActiva === 'asignacion' && usuarios.length > 0 && (() => {
            const perfilesUnicos = [...new Set(
              usuarios.flatMap(u => u.PERFILES ? u.PERFILES.split(', ') : [])
            )].sort();
            return perfilesUnicos.length > 0 ? (
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Perfil</span>
                <select
                  className="usr-topbar-select"
                  value={perfilFiltroAsignacion}
                  onChange={e => { setPerfilFiltroAsignacion(e.target.value); setPaginaLocal(1); }}
                >
                  <option value="">Todos los perfiles</option>
                  {perfilesUnicos.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ) : null;
          })()}

          {vistaActiva === 'asignacion' && usuarios.length > 0 && (() => {
            const estadosUnicos = [...new Set(
              usuarios.map(u => u.ESTADO_SEG).filter(Boolean)
            )].sort();
            return estadosUnicos.length > 0 ? (
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Estado</span>
                <select
                  className="usr-topbar-select"
                  value={estadoFiltroAsignacion}
                  onChange={e => { setEstadoFiltroAsignacion(e.target.value); setPaginaLocal(1); }}
                >
                  <option value="">Todos</option>
                  {estadosUnicos.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            ) : null;
          })()}

          {vistaActiva === 'asignacion' && usuarios.length > 0 && estadosPlataforma.length > 0 && (
            <div className="usr-topbar-field">
              <span className="usr-topbar-label">Estado plataforma</span>
              <select
                className="usr-topbar-select"
                value={estadoPlataformaFiltroAsignacion}
                onChange={e => { setEstadoPlataformaFiltroAsignacion(e.target.value); setPaginaLocal(1); }}
              >
                <option value="">Todos</option>
                {estadosPlataforma.map(e => (
                  <option key={e.ID_ESTADO} value={String(e.ID_ESTADO)}>{e.NOMBRE}</option>
                ))}
              </select>
            </div>
          )}

          {vistaActiva === 'asignacion' && filtros.id_empresa && (
            <div className="usr-topbar-field usr-topbar-field-skills" ref={usuarioEjemploRef}>
              <span className="usr-topbar-label">
                Usuario Ejemplo {loadingEjemplo && '⌛'}
              </span>
              <div className="usr-skills-filtro-wrap">
                <div
                  className={`usr-skills-filtro-input ${showUsuarioEjemploDropdown ? 'open' : ''}`}
                  onClick={() => setShowUsuarioEjemploDropdown(v => !v)}
                >
                  {!usuarioEjemplo
                    ? <span className="usr-skills-filtro-placeholder">Seleccionar usuario ejemplo...</span>
                    : <span className="usr-skills-filtro-summary">{usuarioEjemplo.NOMBRE_USUARIO}</span>
                  }
                  <span className="usr-skills-filtro-chevron">{showUsuarioEjemploDropdown ? '▲' : '▼'}</span>
                </div>
                {showUsuarioEjemploDropdown && (
                  <div className="usr-skills-filtro-dropdown">
                    <div className="usr-skills-filtro-header">
                      <input
                        className="usr-skills-filtro-search"
                        type="text"
                        placeholder="🔍 Buscar usuario ejemplo..."
                        value={usuarioEjemploSearch}
                        onChange={e => { setUsuarioEjemploSearch(e.target.value); }}
                        onClick={ev => ev.stopPropagation()}
                        autoFocus
                      />
                    </div>
                    <div className="usr-skills-filtro-list">
                      {usuarios
                        .filter(u => usuarioEjemploSearch === '' || u.NOMBRE_USUARIO.toLowerCase().includes(usuarioEjemploSearch.toLowerCase()))
                        .map(usuario => {
                          const seleccionado = usuarioEjemplo?.ID_USUARIO === usuario.ID_USUARIO;
                          return (
                          <label
                            key={usuario.ID_USUARIO}
                            className="usr-skills-filtro-item usr-skills-filtro-check-item"
                            onClick={ev => ev.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              onChange={() => seleccionarUsuarioEjemplo(usuario)}
                            />
                            <span style={{ fontWeight: 600 }}>{usuario.NOMBRE_USUARIO}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>ID: {usuario.ID_USUARIO}</span>
                          </label>
                          );
                        })}
                      {usuarios.filter(u => usuarioEjemploSearch === '' || u.NOMBRE_USUARIO.toLowerCase().includes(usuarioEjemploSearch.toLowerCase())).length === 0 && (
                        <div className="usr-skills-filtro-empty">No se encontraron usuarios</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {vistaActiva === 'asignar' && usuarios.length > 0 && (() => {
            const perfilesUnicos = [...new Set(
              usuarios.flatMap(u => u.PERFILES ? u.PERFILES.split(', ') : [])
            )].sort();
            return perfilesUnicos.length > 0 ? (
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Perfil</span>
                <select
                  className="usr-topbar-select"
                  value={perfilFiltro}
                  onChange={e => { setPerfilFiltro(e.target.value); setPaginaLocal(1); }}
                >
                  <option value="">Todos los perfiles</option>
                  {perfilesUnicos.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ) : null;
          })()}

          {vistaActiva === 'asignar' && usuarios.length > 0 && (() => {
            const estadosUnicos = [...new Set(usuarios.map(u => u.ESTADO_SEG).filter(Boolean))].sort();
            return estadosUnicos.length > 0 ? (
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Estado</span>
                <select
                  className="usr-topbar-select"
                  value={estadoFiltroMasivo}
                  onChange={e => { setEstadoFiltroMasivo(e.target.value); setPaginaLocal(1); }}
                >
                  <option value="">Todos</option>
                  {estadosUnicos.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
            ) : null;
          })()}

          {vistaActiva === 'asignar' && usuarios.length > 0 && estadosPlataforma.length > 0 && (
            <div className="usr-topbar-field">
              <span className="usr-topbar-label">Estado plataforma</span>
              <select
                className="usr-topbar-select"
                value={estadoPlataformaFiltroMasivo}
                onChange={e => { setEstadoPlataformaFiltroMasivo(e.target.value); setPaginaLocal(1); }}
              >
                <option value="">Todos</option>
                {estadosPlataforma.map(e => (
                  <option key={e.ID_ESTADO} value={String(e.ID_ESTADO)}>{e.NOMBRE}</option>
                ))}
              </select>
            </div>
          )}

          {vistaActiva === 'asignar' && filtros.id_empresa && (
            <div className="usr-topbar-field usr-topbar-field-skills" ref={usuarioMasivoRef}>
              <span className="usr-topbar-label">
                Usuario{usuariosSeleccionados.length > 0 ? ` (${usuariosSeleccionados.length})` : ''}
              </span>
              <div className="usr-skills-filtro-wrap">
                <div
                  className={`usr-skills-filtro-input ${showUsuarioMasivoDropdown ? 'open' : ''}`}
                  onClick={() => setShowUsuarioMasivoDropdown(v => !v)}
                >
                  {usuariosSeleccionados.length === 0
                    ? <span className="usr-skills-filtro-placeholder">Seleccionar usuarios...</span>
                    : <span className="usr-skills-filtro-summary">
                        {usuariosSeleccionados.length === 1
                          ? usuariosSeleccionados[0].NOMBRE_USUARIO
                          : `${usuariosSeleccionados.length} usuarios seleccionados`}
                      </span>
                  }
                  <span className="usr-skills-filtro-chevron">{showUsuarioMasivoDropdown ? '▲' : '▼'}</span>
                </div>
                {showUsuarioMasivoDropdown && (
                  <div className="usr-skills-filtro-dropdown">
                    <div className="usr-skills-filtro-header">
                      <input
                        className="usr-skills-filtro-search"
                        type="text"
                        placeholder="🔍 Buscar usuario..."
                        value={usuarioMasivoSearch}
                        onChange={e => { setUsuarioMasivoSearch(e.target.value); setPaginaLocal(1); }}
                        onClick={ev => ev.stopPropagation()}
                        autoFocus
                      />
                      <div className="usr-skills-filtro-actions">
                        <button
                          type="button"
                          className="usr-skills-filtro-action-btn"
                          onClick={ev => { ev.stopPropagation(); setUsuariosSeleccionados(usuarios); }}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className="usr-skills-filtro-action-btn"
                          onClick={ev => { ev.stopPropagation(); setUsuariosSeleccionados([]); }}
                        >
                          Ninguno
                        </button>
                      </div>
                    </div>
                    <div className="usr-skills-filtro-list">
                      {usuarios
                        .filter(u => u.NOMBRE_USUARIO.toLowerCase().includes(usuarioMasivoSearch.toLowerCase()))
                        .sort((a, b) => {
                          const aSel = usuariosSeleccionados.some(sel => sel.ID_USUARIO === a.ID_USUARIO);
                          const bSel = usuariosSeleccionados.some(sel => sel.ID_USUARIO === b.ID_USUARIO);
                          return Number(bSel) - Number(aSel);
                        })
                        .map(usuario => {
                          const seleccionado = !!usuariosSeleccionados.find(sel => sel.ID_USUARIO === usuario.ID_USUARIO);
                          return (
                          <label
                            key={usuario.ID_USUARIO}
                            className="usr-skills-filtro-item usr-skills-filtro-check-item"
                            onClick={ev => ev.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              checked={seleccionado}
                              onChange={() => toggleUsuarioSeleccionado(usuario)}
                            />
                            <span style={{ fontWeight: 600 }}>{usuario.NOMBRE_USUARIO}</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '4px' }}>ID: {usuario.ID_USUARIO}</span>
                          </label>
                          );
                        })}
                      {usuarios.filter(u => u.NOMBRE_USUARIO.toLowerCase().includes(usuarioMasivoSearch.toLowerCase())).length === 0 && (
                        <div className="usr-skills-filtro-empty">No se encontraron usuarios</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {vistaActiva === 'asignar' && filtros.id_empresa && (
            <div className="usr-topbar-field usr-topbar-field-skills" ref={skillsFiltroRefMasivo}>
              <span className="usr-topbar-label">
                Skills{skillsFiltroMasivo.length > 0 ? ` (${skillsFiltroMasivo.length})` : ''}
              </span>
              <div className="usr-skills-filtro-wrap">
                <div
                  className={`usr-skills-filtro-input ${showSkillsFiltroMasivo ? 'open' : ''}`}
                  onClick={() => setShowSkillsFiltroMasivo(v => !v)}
                >
                  {skillsFiltroMasivo.length === 0
                    ? <span className="usr-skills-filtro-placeholder">Filtrar por skill...</span>
                    : <span className="usr-skills-filtro-summary">
                        {skillsFiltroMasivo.length === 1 ? skillsFiltroMasivo[0].NOMBRE_SKILL : `${skillsFiltroMasivo.length} skills seleccionadas`}
                      </span>
                  }
                  <span className="usr-skills-filtro-chevron">{showSkillsFiltroMasivo ? '▲' : '▼'}</span>
                </div>
                {showSkillsFiltroMasivo && (
                  <div className="usr-skills-filtro-dropdown">
                    <div className="usr-skills-filtro-header">
                      <input className="usr-skills-filtro-search" type="text" placeholder="🔍 Buscar skill..."
                        value={skillsFiltroSearchMasivo} onChange={e => setSkillsFiltroSearchMasivo(e.target.value)}
                        onClick={ev => ev.stopPropagation()} autoFocus
                      />
                      <div className="usr-skills-filtro-actions">
                        <button
                          type="button"
                          className="usr-skills-filtro-action-btn"
                          onClick={ev => { ev.stopPropagation(); setSkillsFiltroMasivo(skillsFiltroDisponibles); setPaginaLocal(1); }}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className="usr-skills-filtro-action-btn"
                          onClick={ev => { ev.stopPropagation(); setSkillsFiltroMasivo([]); setPaginaLocal(1); }}
                        >
                          Ninguno
                        </button>
                      </div>
                    </div>
                    <div className="usr-skills-filtro-list" ref={skillsFiltroListMasivo}>
                      {skillsFiltroDisponibles
                        .filter(s => s.NOMBRE_SKILL.toLowerCase().includes(skillsFiltroSearchMasivo.toLowerCase()))
                        .sort((a, b) => {
                          const aSel = skillsFiltroMasivo.some(x => x.ID_SKILL === a.ID_SKILL);
                          const bSel = skillsFiltroMasivo.some(x => x.ID_SKILL === b.ID_SKILL);
                          return Number(bSel) - Number(aSel);
                        })
                        .map(s => {
                          const seleccionado = !!skillsFiltroMasivo.find(x => x.ID_SKILL === s.ID_SKILL);
                          return (
                            <label key={s.ID_SKILL} className={`usr-skills-filtro-item usr-skills-filtro-check-item${seleccionado ? ' selected' : ''}`} onClick={ev => ev.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={seleccionado}
                                onChange={() => {
                                  const el = skillsFiltroListMasivo.current;
                                  const savedScroll = el ? el.scrollTop : 0;
                                  setSkillsFiltroMasivo(prev => seleccionado ? prev.filter(x => x.ID_SKILL !== s.ID_SKILL) : [...prev, s]);
                                  setPaginaLocal(1);
                                  requestAnimationFrame(() => { if (el) el.scrollTop = savedScroll; });
                                }}
                              />
                              <span className="usr-skills-filtro-item-name">{s.NOMBRE_SKILL}</span>
                            </label>
                          );
                        })}
                      {skillsFiltroDisponibles.filter(s => s.NOMBRE_SKILL.toLowerCase().includes(skillsFiltroSearchMasivo.toLowerCase())).length === 0 && (
                        <div className="usr-skills-filtro-empty">No hay skills disponibles</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {vistaActiva === 'asignar' && filtros.id_empresa && (
            <div className="usr-topbar-field usr-topbar-field-skills" ref={botRedesFiltroRefMasivo}>
              <span className="usr-topbar-label">
                Bot Redes{botRedesFiltroMasivo.length > 0 ? ` (${botRedesFiltroMasivo.length})` : ''}
              </span>
              <div className="usr-skills-filtro-wrap">
                <div
                  className={`usr-skills-filtro-input ${showBotRedesFiltroMasivo ? 'open' : ''}`}
                  onClick={() => setShowBotRedesFiltroMasivo(v => !v)}
                >
                  {botRedesFiltroMasivo.length === 0
                    ? <span className="usr-skills-filtro-placeholder">Filtrar por bot...</span>
                    : <span className="usr-skills-filtro-summary">
                        {botRedesFiltroMasivo.length === 1 ? botRedesFiltroMasivo[0].NOMBRE_BOT : `${botRedesFiltroMasivo.length} bots seleccionados`}
                      </span>
                  }
                  <span className="usr-skills-filtro-chevron">{showBotRedesFiltroMasivo ? '▲' : '▼'}</span>
                </div>
                {showBotRedesFiltroMasivo && (
                  <div className="usr-skills-filtro-dropdown">
                    <div className="usr-skills-filtro-header">
                      <input className="usr-skills-filtro-search" type="text" placeholder="🔍 Buscar bot..."
                        value={botRedesFiltroSearchMasivo} onChange={e => setBotRedesFiltroSearchMasivo(e.target.value)}
                        onClick={ev => ev.stopPropagation()} autoFocus
                      />
                      <div className="usr-skills-filtro-redes">
                        <select
                          value={botRedesFiltroRedSocialMasivo}
                          onChange={e => { e.stopPropagation(); setBotRedesFiltroRedSocialMasivo(e.target.value); }}
                          className="usr-skills-filtro-select"
                        >
                          <option value="">Todas las redes</option>
                          <option value="1">WhatsApp</option>
                          <option value="2">Messenger</option>
                          <option value="7">Webchat</option>
                          <option value="10">Instagram DM</option>
                          <option value="11">Facebook Comentarios</option>
                          <option value="12">Instagram Comentarios</option>
                        </select>
                      </div>
                      <div className="usr-skills-filtro-actions">
                        <button
                          type="button"
                          className="usr-skills-filtro-action-btn"
                          onClick={ev => { ev.stopPropagation(); setBotRedesFiltroMasivo(botRedesDisponibles); setPaginaLocal(1); }}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className="usr-skills-filtro-action-btn"
                          onClick={ev => { ev.stopPropagation(); setBotRedesFiltroMasivo([]); setBotRedesFiltroRedSocialMasivo(''); setPaginaLocal(1); }}
                        >
                          Ninguno
                        </button>
                      </div>
                    </div>
                    <div className="usr-skills-filtro-list" ref={botRedesFiltroListMasivo}>
                      {(() => {
                        const filtrados = botRedesDisponibles.filter(b => {
                          const matchText = (b.NOMBRE_BOT || '').toLowerCase().includes(botRedesFiltroSearchMasivo.toLowerCase());
                          const matchRed = botRedesFiltroRedSocialMasivo === '' || String(b.ID_RED_SOCIAL) === botRedesFiltroRedSocialMasivo;
                          return matchText && matchRed;
                        });
                        return filtrados;
                      })()
                        .sort((a, b) => {
                          const aSel = botRedesFiltroMasivo.some(x => x.ID_BOT_REDES === a.ID_BOT_REDES);
                          const bSel = botRedesFiltroMasivo.some(x => x.ID_BOT_REDES === b.ID_BOT_REDES);
                          if (aSel === bSel) {
                            return (a.NOMBRE_BOT || '').localeCompare(b.NOMBRE_BOT || '');
                          }
                          return aSel ? -1 : 1;
                        })
                        .map(b => {
                          const seleccionado = !!botRedesFiltroMasivo.find(x => x.ID_BOT_REDES === b.ID_BOT_REDES);
                          const getIconoRed = (idRedSocial) => {
                            const iconos = {
                              1: '/assets/whatsapp.png',
                              2: '/assets/messenger.png',
                              7: '/assets/webchat.png',
                              10: '/assets/instagram_messenger.svg',
                              11: '/assets/facebook_comnetarios.png',
                              12: '/assets/instagram_comentarios.png'
                            };
                            return iconos[idRedSocial] || '/assets/webchat.png';
                          };
                          return (
                            <label key={b.ID_BOT_REDES} className={`usr-skills-filtro-item usr-skills-filtro-check-item usr-botred-item${seleccionado ? ' selected' : ''}`} onClick={ev => ev.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={seleccionado}
                                onChange={() => {
                                  const el = botRedesFiltroListMasivo.current;
                                  const savedScroll = el ? el.scrollTop : 0;
                                  setBotRedesFiltroMasivo(prev => seleccionado ? prev.filter(x => x.ID_BOT_REDES !== b.ID_BOT_REDES) : [...prev, b]);
                                  setPaginaLocal(1);
                                  requestAnimationFrame(() => { if (el) el.scrollTop = savedScroll; });
                                }}
                              />
                              <img
                                src={getIconoRed(b.ID_RED_SOCIAL)}
                                alt={b.NOMBRE_RED_SOCIAL}
                                className="usr-botred-icon"
                                onError={(e) => { e.target.src = '/assets/webchat.png'; }}
                              />
                              <span className="usr-skills-filtro-item-name">{b.NOMBRE_BOT}</span>
                              {b.NOMBRE_PAIS && <span className="usr-botred-pais">({b.NOMBRE_PAIS})</span>}
                            </label>
                          );
                        })}
                      {(() => {
                        const filtradosCount = botRedesDisponibles.filter(b => {
                          const matchText = (b.NOMBRE_BOT || '').toLowerCase().includes(botRedesFiltroSearchMasivo.toLowerCase());
                          const matchRed = botRedesFiltroRedSocialMasivo === '' || String(b.ID_RED_SOCIAL) === botRedesFiltroRedSocialMasivo;
                          return matchText && matchRed;
                        }).length;
                        return filtradosCount === 0;
                      })() && (
                        <div className="usr-skills-filtro-empty">No hay bots disponibles</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Filtro de Perfil para Historial - basado en usuarios cargados (igual que Masiva) */}
          {vistaActiva === 'historial' && filtros.id_empresa && usuarios.length > 0 && (() => {
            const perfilesUnicos = [...new Set(
              usuarios.flatMap(u => u.PERFILES ? u.PERFILES.split(', ') : [])
            )].sort();
            return perfilesUnicos.length > 0 ? (
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Perfil</span>
                <select
                  className="usr-topbar-select"
                  value={perfilFiltroHistorial}
                  onChange={e => setPerfilFiltroHistorial(e.target.value)}
                >
                  <option value="">Todos los perfiles</option>
                  {perfilesUnicos.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            ) : null;
          })()}

          {vistaActiva === 'historial' && filtros.id_empresa && estadosPlataforma.length > 0 && (
            <div className="usr-topbar-field">
              <span className="usr-topbar-label">Estado plataforma</span>
              <select
                className="usr-topbar-select"
                value={estadoPlataformaFiltroHistorial}
                onChange={e => setEstadoPlataformaFiltroHistorial(e.target.value)}
              >
                <option value="">Todos</option>
                {estadosPlataforma.map(e => (
                  <option key={e.ID_ESTADO} value={String(e.ID_ESTADO)}>{e.NOMBRE}</option>
                ))}
              </select>
            </div>
          )}

          {/* Filtros adicionales para Historial de Estados */}
          {vistaActiva === 'historial' && filtros.id_empresa && (
            <>
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Fecha inicio</span>
                <input
                  type="date"
                  className="usr-topbar-select"
                  value={fechaInicioHistorial}
                  onChange={e => setFechaInicioHistorial(e.target.value)}
                />
              </div>

              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Fecha fin</span>
                <input
                  type="date"
                  className="usr-topbar-select"
                  value={fechaFinHistorial}
                  onChange={e => setFechaFinHistorial(e.target.value)}
                />
              </div>

              {/* Skills dropdown - IDÉNTICO a Masiva */}
              {vistaActiva === 'historial' && filtros.id_empresa && (
                <div className="usr-topbar-field usr-topbar-field-skills" ref={skillsFiltroRefHistorial}>
                  <span className="usr-topbar-label">
                    Skills{skillsFiltroHistorial.length > 0 ? ` (${skillsFiltroHistorial.length})` : ''}
                  </span>
                  <div className="usr-skills-filtro-wrap">
                    <div
                      className={`usr-skills-filtro-input ${showSkillsFiltroHistorial ? 'open' : ''}`}
                      onClick={() => setShowSkillsFiltroHistorial(v => !v)}
                    >
                      {skillsFiltroHistorial.length === 0
                        ? <span className="usr-skills-filtro-placeholder">Filtrar por skill...</span>
                        : <span className="usr-skills-filtro-summary">
                            {skillsFiltroHistorial.length === 1 ? skillsFiltroHistorial[0].NOMBRE_SKILL : `${skillsFiltroHistorial.length} skills seleccionadas`}
                          </span>
                      }
                      <span className="usr-skills-filtro-chevron">{showSkillsFiltroHistorial ? '▲' : '▼'}</span>
                    </div>
                    {showSkillsFiltroHistorial && (
                      <div className="usr-skills-filtro-dropdown">
                        <div className="usr-skills-filtro-header">
                          <input className="usr-skills-filtro-search" type="text" placeholder="🔍 Buscar skill..."
                            value={skillsFiltroSearchHistorial} onChange={e => setSkillsFiltroSearchHistorial(e.target.value)}
                            onClick={ev => ev.stopPropagation()} autoFocus
                          />
                          <div className="usr-skills-filtro-actions">
                            <button
                              type="button"
                              className="usr-skills-filtro-action-btn"
                              onClick={ev => { ev.stopPropagation(); setSkillsFiltroHistorial(skillsFiltroDisponibles); }}
                            >
                              Todos
                            </button>
                            <button
                              type="button"
                              className="usr-skills-filtro-action-btn"
                              onClick={ev => { ev.stopPropagation(); setSkillsFiltroHistorial([]); }}
                            >
                              Ninguno
                            </button>
                          </div>
                        </div>
                        <div className="usr-skills-filtro-list" ref={skillsFiltroListHistorial}>
                          {skillsFiltroDisponibles
                            .filter(s => s.NOMBRE_SKILL.toLowerCase().includes(skillsFiltroSearchHistorial.toLowerCase()))
                            .sort((a, b) => {
                              const aSel = skillsFiltroHistorial.some(x => x.ID_SKILL === a.ID_SKILL);
                              const bSel = skillsFiltroHistorial.some(x => x.ID_SKILL === b.ID_SKILL);
                              return Number(bSel) - Number(aSel);
                            })
                            .map(s => {
                              const seleccionado = !!skillsFiltroHistorial.find(x => x.ID_SKILL === s.ID_SKILL);
                              return (
                                <label key={s.ID_SKILL} className={`usr-skills-filtro-item usr-skills-filtro-check-item${seleccionado ? ' selected' : ''}`} onClick={ev => ev.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={() => {
                                      const el = skillsFiltroListHistorial.current;
                                      const savedScroll = el ? el.scrollTop : 0;
                                      setSkillsFiltroHistorial(prev => seleccionado ? prev.filter(x => x.ID_SKILL !== s.ID_SKILL) : [...prev, s]);
                                      requestAnimationFrame(() => { if (el) el.scrollTop = savedScroll; });
                                    }}
                                  />
                                  <span className="usr-skills-filtro-item-name">{s.NOMBRE_SKILL}</span>
                                </label>
                              );
                            })}
                          {skillsFiltroDisponibles.filter(s => s.NOMBRE_SKILL.toLowerCase().includes(skillsFiltroSearchHistorial.toLowerCase())).length === 0 && (
                            <div className="usr-skills-filtro-empty">No hay skills disponibles</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Bot Redes dropdown - IDÉNTICO a Masiva */}
              {vistaActiva === 'historial' && filtros.id_empresa && (
                <div className="usr-topbar-field usr-topbar-field-skills" ref={botRedesFiltroRefHistorial}>
                  <span className="usr-topbar-label">
                    Bot Redes{botRedesFiltroHistorial.length > 0 ? ` (${botRedesFiltroHistorial.length})` : ''}
                  </span>
                  <div className="usr-skills-filtro-wrap">
                    <div
                      className={`usr-skills-filtro-input ${showBotRedesFiltroHistorial ? 'open' : ''}`}
                      onClick={() => setShowBotRedesFiltroHistorial(v => !v)}
                    >
                      {botRedesFiltroHistorial.length === 0
                        ? <span className="usr-skills-filtro-placeholder">Filtrar por bot...</span>
                        : <span className="usr-skills-filtro-summary">
                            {botRedesFiltroHistorial.length === 1 ? (botRedesFiltroHistorial[0].NOMBRE_BOT || botRedesFiltroHistorial[0].DESCRIPCION) : `${botRedesFiltroHistorial.length} bots seleccionados`}
                          </span>
                      }
                      <span className="usr-skills-filtro-chevron">{showBotRedesFiltroHistorial ? '▲' : '▼'}</span>
                    </div>
                    {showBotRedesFiltroHistorial && (
                      <div className="usr-skills-filtro-dropdown">
                        <div className="usr-skills-filtro-header">
                          <input className="usr-skills-filtro-search" type="text" placeholder="🔍 Buscar bot..."
                            value={botRedesFiltroSearchHistorial} onChange={e => setBotRedesFiltroSearchHistorial(e.target.value)}
                            onClick={ev => ev.stopPropagation()} autoFocus
                          />
                          <div className="usr-skills-filtro-actions">
                            <button
                              type="button"
                              className="usr-skills-filtro-action-btn"
                              onClick={ev => { ev.stopPropagation(); setBotRedesFiltroHistorial(botRedesDisponibles); }}
                            >
                              Todos
                            </button>
                            <button
                              type="button"
                              className="usr-skills-filtro-action-btn"
                              onClick={ev => { ev.stopPropagation(); setBotRedesFiltroHistorial([]); }}
                            >
                              Ninguno
                            </button>
                          </div>
                        </div>
                        <div className="usr-skills-filtro-list" ref={botRedesFiltroListHistorial}>
                          {botRedesDisponibles
                            .filter(b => (b.NOMBRE_BOT || b.DESCRIPCION || '').toLowerCase().includes(botRedesFiltroSearchHistorial.toLowerCase()))
                            .sort((a, b) => {
                              const aSel = botRedesFiltroHistorial.some(x => x.ID_BOT_REDES === a.ID_BOT_REDES);
                              const bSel = botRedesFiltroHistorial.some(x => x.ID_BOT_REDES === b.ID_BOT_REDES);
                              return Number(bSel) - Number(aSel);
                            })
                            .map(b => {
                              const nombre = b.NOMBRE_BOT || b.DESCRIPCION || 'Sin nombre';
                              const seleccionado = !!botRedesFiltroHistorial.find(x => x.ID_BOT_REDES === b.ID_BOT_REDES);
                              return (
                                <label key={b.ID_BOT_REDES} className={`usr-skills-filtro-item usr-skills-filtro-check-item${seleccionado ? ' selected' : ''}`} onClick={ev => ev.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={seleccionado}
                                    onChange={() => {
                                      const el = botRedesFiltroListHistorial.current;
                                      const savedScroll = el ? el.scrollTop : 0;
                                      setBotRedesFiltroHistorial(prev => seleccionado ? prev.filter(x => x.ID_BOT_REDES !== b.ID_BOT_REDES) : [...prev, b]);
                                      requestAnimationFrame(() => { if (el) el.scrollTop = savedScroll; });
                                    }}
                                  />
                                  <span className="usr-skills-filtro-item-name">{nombre}</span>
                                </label>
                              );
                            })}
                          {botRedesDisponibles.filter(b => (b.NOMBRE_BOT || b.DESCRIPCION || '').toLowerCase().includes(botRedesFiltroSearchHistorial.toLowerCase())).length === 0 && (
                            <div className="usr-skills-filtro-empty">No hay bots disponibles</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Usuario (dropdown tipo Masiva) */}
              <div className="usr-topbar-field usr-topbar-field-skills" ref={null}>
                <span className="usr-topbar-label">Usuario</span>
                <div className="usr-skills-filtro-wrap">
                  <div
                    className={`usr-skills-filtro-input ${showUsuarioHistorialDropdown ? 'open' : ''}`}
                    onClick={() => setShowUsuarioHistorialDropdown(v => !v)}
                  >
                    {usuarioHistorialSelected ? (
                      <span className="usr-skills-filtro-summary">{usuarioHistorialSelected.NOMBRE_USUARIO}</span>
                    ) : (
                      <span className="usr-skills-filtro-placeholder">Seleccionar usuario...</span>
                    )}
                    <span className="usr-skills-filtro-chevron">{showUsuarioHistorialDropdown ? '▲' : '▼'}</span>
                  </div>
                  {showUsuarioHistorialDropdown && (
                    <div className="usr-skills-filtro-dropdown">
                      <div className="usr-skills-filtro-header">
                        <input
                          className="usr-skills-filtro-search"
                          type="text"
                          placeholder="🔍 Buscar usuario..."
                          value={usuarioHistorialSearch}
                          onChange={e => { setUsuarioHistorialSearch(e.target.value); }}
                          onClick={ev => ev.stopPropagation()}
                          autoFocus
                        />
                        <div className="usr-skills-filtro-actions">
                          <button type="button" className="usr-skills-filtro-action-btn" onClick={ev => { ev.stopPropagation(); setUsuarioHistorialSelected(null); setUsuarioHistorialSearch(''); }}>
                            Ninguno
                          </button>
                        </div>
                      </div>
                      <div className="usr-skills-filtro-list">
                        {usuarios
                          .filter(u => u.NOMBRE_USUARIO.toLowerCase().includes(usuarioHistorialSearch.toLowerCase()))
                          .slice(0, 200)
                          .map(usuario => (
                            <label key={usuario.ID_USUARIO} className="usr-skills-filtro-item" onClick={ev => ev.stopPropagation()}>
                              <input
                                type="radio"
                                name="usuarioHistorial"
                                checked={usuarioHistorialSelected && usuarioHistorialSelected.ID_USUARIO === usuario.ID_USUARIO}
                                onChange={() => { setUsuarioHistorialSelected(usuario); setShowUsuarioHistorialDropdown(false); setUsuarioHistorialSearch(''); }}
                              />
                              <span style={{ fontWeight: 600 }}>{usuario.NOMBRE_USUARIO}</span>
                              <span style={{ fontSize: '10px', color: '#94a3b8', marginLeft: '6px' }}>ID: {usuario.ID_USUARIO}</span>
                            </label>
                          ))}
                        {usuarios.filter(u => u.NOMBRE_USUARIO.toLowerCase().includes(usuarioHistorialSearch.toLowerCase())).length === 0 && (
                          <div className="usr-skills-filtro-empty">No se encontraron usuarios</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Filtros de Seguridad */}
          {vistaActiva === 'seguridad' && (
            <>
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Base de Datos</span>
                <select className="usr-topbar-select" value={dbKeySeg} onChange={e => handleDbSegChange(e.target.value)}>
                  <option value="db_9">9. Modulo de seguridad Talkme</option>
                  <option value="db_10">10. Modulo de seguridad Ficohsa</option>
                </select>
              </div>
              {/* Empresa - estilo dropdown Usuario */}
              <div className="usr-topbar-field usr-topbar-field-skills" ref={empresaSegRef}>
                <span className="usr-topbar-label">Empresa {loadingEmpSeg && '⌛'}</span>
                <div className="usr-skills-filtro-wrap">
                  <div
                    className={`usr-skills-filtro-input ${showEmpresaSegDropdown ? 'open' : ''}`}
                    onClick={() => setShowEmpresaSegDropdown(v => !v)}
                  >
                    {secEmpresaId ? (
                      <span className="usr-skills-filtro-summary">{empresasSeg.find(e => String(e.SECEMPRESAID) === String(secEmpresaId))?.NOMBRE || 'Todas'}</span>
                    ) : (
                      <span className="usr-skills-filtro-placeholder">Todas las empresas</span>
                    )}
                    <span className="usr-skills-filtro-chevron">{showEmpresaSegDropdown ? '▲' : '▼'}</span>
                  </div>
                  {showEmpresaSegDropdown && (
                    <div className="usr-skills-filtro-dropdown">
                      <div className="usr-skills-filtro-header">
                        <input
                          className="usr-skills-filtro-search"
                          type="text"
                          placeholder="🔍 Buscar empresa..."
                          value={empresaSegSearch}
                          onChange={e => setEmpresaSegSearch(e.target.value)}
                          onClick={ev => ev.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="usr-skills-filtro-list">
                        <label
                          className={`usr-skills-filtro-item ${!secEmpresaId ? 'selected' : ''}`}
                          onClick={() => { setSecEmpresaId(''); setShowEmpresaSegDropdown(false); setEmpresaSegSearch(''); }}
                        >
                          <span className="usr-skills-filtro-item-name">Todas las empresas</span>
                        </label>
                        {empresasSeg
                          .filter(e => (e.NOMBRE || '').toLowerCase().includes(empresaSegSearch.toLowerCase()) || String(e.SECEMPRESAID).includes(empresaSegSearch))
                          .map(emp => (
                            <label
                              key={emp.SECEMPRESAID}
                              className={`usr-skills-filtro-item ${String(secEmpresaId) === String(emp.SECEMPRESAID) ? 'selected' : ''}`}
                              onClick={() => { setSecEmpresaId(String(emp.SECEMPRESAID)); setShowEmpresaSegDropdown(false); setEmpresaSegSearch(''); }}
                            >
                              <span className="usr-skills-filtro-item-name">
                                <span style={{ fontWeight: 600, color: 'var(--tm-primary-600)', marginRight: '8px' }}>{emp.SECEMPRESAID}</span>
                                <span style={{ color: 'var(--tm-text-muted)' }}>|</span>
                                <span style={{ marginLeft: '8px' }}>{emp.NOMBRE}</span>
                              </span>
                            </label>
                          ))}
                        {empresasSeg.filter(e => (e.NOMBRE || '').toLowerCase().includes(empresaSegSearch.toLowerCase())).length === 0 && (
                          <div className="usr-skills-filtro-empty">No se encontraron empresas</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Estado</span>
                <select className="usr-topbar-select" value={estadoSeg} onChange={e => setEstadoSeg(e.target.value)}>
                  <option value="">Todos (excl. BAJA)</option>
                  <option value="ALTA">ALTA</option>
                  <option value="BLOQUEADO">BLOQUEADO</option>
                </select>
              </div>
              {/* Filtros específicos de Gestión Masiva */}
              {subSeccionSeg === 'masiva' && (
                <>
                  <div className="usr-topbar-field">
                    <span className="usr-topbar-label">Modo</span>
                    <select className="usr-topbar-select" value={modoMasiva} onChange={e => setModoMasiva(e.target.value)}>
                      <option value="asignar">Asignar permiso</option>
                      <option value="quitar">Quitar permiso</option>
                    </select>
                  </div>
                  {/* Perfil - estilo dropdown Usuario */}
                  <div className="usr-topbar-field usr-topbar-field-skills" ref={perfilMasivaRef}>
                    <span className="usr-topbar-label">Perfil {loadingPerfilesMasiva && '⌛'}</span>
                    <div className="usr-skills-filtro-wrap">
                      <div
                        className={`usr-skills-filtro-input ${showPerfilMasivaDropdown ? 'open' : ''}`}
                        onClick={() => setShowPerfilMasivaDropdown(v => !v)}
                      >
                        {perfilIdMasiva ? (
                          <span className="usr-skills-filtro-summary">{perfilesMasiva.find(p => String(p.SECPERFILID) === String(perfilIdMasiva))?.NOMBRE || 'Todos'}</span>
                        ) : (
                          <span className="usr-skills-filtro-placeholder">Todos</span>
                        )}
                        <span className="usr-skills-filtro-chevron">{showPerfilMasivaDropdown ? '▲' : '▼'}</span>
                      </div>
                      {showPerfilMasivaDropdown && (
                        <div className="usr-skills-filtro-dropdown">
                          <div className="usr-skills-filtro-header">
                            <input
                              className="usr-skills-filtro-search"
                              type="text"
                              placeholder="🔍 Buscar perfil..."
                              value={perfilMasivaSearch}
                              onChange={e => setPerfilMasivaSearch(e.target.value)}
                              onClick={ev => ev.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="usr-skills-filtro-list">
                            <label
                              className={`usr-skills-filtro-item ${!perfilIdMasiva ? 'selected' : ''}`}
                              onClick={() => { setPerfilIdMasiva(''); setShowPerfilMasivaDropdown(false); setPerfilMasivaSearch(''); }}
                            >
                              <span className="usr-skills-filtro-item-name">Todos</span>
                            </label>
                            {perfilesMasiva
                              .filter(p => (p.NOMBRE || '').toLowerCase().includes(perfilMasivaSearch.toLowerCase()))
                              .map(p => (
                                <label
                                  key={p.SECPERFILID}
                                  className={`usr-skills-filtro-item ${String(perfilIdMasiva) === String(p.SECPERFILID) ? 'selected' : ''}`}
                                  onClick={() => { setPerfilIdMasiva(String(p.SECPERFILID)); setShowPerfilMasivaDropdown(false); setPerfilMasivaSearch(''); }}
                                >
                                  <span className="usr-skills-filtro-item-name">{p.NOMBRE}</span>
                                </label>
                              ))}
                            {perfilesMasiva.filter(p => (p.NOMBRE || '').toLowerCase().includes(perfilMasivaSearch.toLowerCase())).length === 0 && (
                              <div className="usr-skills-filtro-empty">No se encontraron perfiles</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Elemento - estilo dropdown Usuario */}
                  <div className="usr-topbar-field usr-topbar-field-skills" ref={elementoMasivaRef}>
                    <span className="usr-topbar-label">Elemento {loadingElementosMasiva && '⌛'}</span>
                    <div className="usr-skills-filtro-wrap">
                      <div
                        className={`usr-skills-filtro-input ${showElementoMasivaDropdown ? 'open' : ''}`}
                        onClick={() => setShowElementoMasivaDropdown(v => !v)}
                      >
                        {elemIdMasiva ? (
                          <span className="usr-skills-filtro-summary">[{elementosMasiva.find(e => String(e.SECELEMENTOID) === String(elemIdMasiva))?.APLICACION_NOMBRE}] {elementosMasiva.find(e => String(e.SECELEMENTOID) === String(elemIdMasiva))?.ETIQUETA}</span>
                        ) : (
                          <span className="usr-skills-filtro-placeholder">{modoMasiva === 'asignar' ? 'Seleccionar...' : 'Todos (requerido)'}</span>
                        )}
                        <span className="usr-skills-filtro-chevron">{showElementoMasivaDropdown ? '▲' : '▼'}</span>
                      </div>
                      {showElementoMasivaDropdown && (
                        <div className="usr-skills-filtro-dropdown">
                          <div className="usr-skills-filtro-header">
                            <input
                              className="usr-skills-filtro-search"
                              type="text"
                              placeholder="🔍 Buscar elemento..."
                              value={elementoMasivaSearch}
                              onChange={e => setElementoMasivaSearch(e.target.value)}
                              onClick={ev => ev.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="usr-skills-filtro-list">
                            {elementosMasiva
                              .filter(e => (e.ETIQUETA || '').toLowerCase().includes(elementoMasivaSearch.toLowerCase()) || (e.APLICACION_NOMBRE || '').toLowerCase().includes(elementoMasivaSearch.toLowerCase()))
                              .map(e => (
                                <label
                                  key={e.SECELEMENTOID}
                                  className={`usr-skills-filtro-item ${String(elemIdMasiva) === String(e.SECELEMENTOID) ? 'selected' : ''}`}
                                  onClick={() => { setElemIdMasiva(String(e.SECELEMENTOID)); setShowElementoMasivaDropdown(false); setElementoMasivaSearch(''); }}
                                >
                                  <span className="usr-skills-filtro-item-name">[{e.APLICACION_NOMBRE}] {e.ETIQUETA}</span>
                                </label>
                              ))}
                            {elementosMasiva.filter(e => (e.ETIQUETA || '').toLowerCase().includes(elementoMasivaSearch.toLowerCase()) || (e.APLICACION_NOMBRE || '').toLowerCase().includes(elementoMasivaSearch.toLowerCase())).length === 0 && (
                              <div className="usr-skills-filtro-empty">No se encontraron elementos</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              {subSeccionSeg === 'usuarios' && resultadosSeg && resultadosSeg.length > 0 && (() => {
                const perfsUnicos = [...new Set(resultadosSeg.flatMap(u => u.perfiles.map(p => p.nombre)))].sort();
                return perfsUnicos.length > 0 ? (
                  <div className="usr-topbar-field usr-topbar-field-skills" ref={perfilSegRef}>
                    <span className="usr-topbar-label">Perfil</span>
                    <div className="usr-skills-filtro-wrap">
                      <div
                        className={`usr-skills-filtro-input ${showPerfilSegDropdown ? 'open' : ''}`}
                        onClick={() => setShowPerfilSegDropdown(v => !v)}
                      >
                        {perfilFiltroSeg ? (
                          <span className="usr-skills-filtro-summary">{perfilFiltroSeg}</span>
                        ) : (
                          <span className="usr-skills-filtro-placeholder">Todos los perfiles</span>
                        )}
                        <span className="usr-skills-filtro-chevron">{showPerfilSegDropdown ? '▲' : '▼'}</span>
                      </div>
                      {showPerfilSegDropdown && (
                        <div className="usr-skills-filtro-dropdown">
                          <div className="usr-skills-filtro-header">
                            <input
                              className="usr-skills-filtro-search"
                              type="text"
                              placeholder="🔍 Buscar perfil..."
                              value={perfilSegSearch}
                              onChange={e => setPerfilSegSearch(e.target.value)}
                              onClick={ev => ev.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="usr-skills-filtro-list">
                            <label
                              className={`usr-skills-filtro-item ${!perfilFiltroSeg ? 'selected' : ''}`}
                              onClick={() => { setPerfilFiltroSeg(''); setShowPerfilSegDropdown(false); setPerfilSegSearch(''); }}
                            >
                              <span className="usr-skills-filtro-item-name">Todos los perfiles</span>
                            </label>
                            {perfsUnicos
                              .filter(p => p.toLowerCase().includes(perfilSegSearch.toLowerCase()))
                              .map(p => (
                                <label
                                  key={p}
                                  className={`usr-skills-filtro-item ${perfilFiltroSeg === p ? 'selected' : ''}`}
                                  onClick={() => { setPerfilFiltroSeg(p); setShowPerfilSegDropdown(false); setPerfilSegSearch(''); }}
                                >
                                  <span className="usr-skills-filtro-item-name">{p}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
              {subSeccionSeg === 'usuarios' && elementosSeg.length > 0 && (() => {
                const elemsOpts = elementosSeg.filter(e => e.ETIQUETA).map(e => ({ value: `[${e.APLICACION_NOMBRE || 'App'}] ${e.ETIQUETA}`, label: `[${e.APLICACION_NOMBRE || 'App'}] ${e.ETIQUETA}` })).sort((a, b) => a.label.localeCompare(b.label));
                return elemsOpts.length > 0 ? (
                  <div className="usr-topbar-field usr-topbar-field-skills" ref={elementoSegRef}>
                    <span className="usr-topbar-label">Elemento / Pantalla</span>
                    <div className="usr-skills-filtro-wrap">
                      <div
                        className={`usr-skills-filtro-input ${showElementoSegDropdown ? 'open' : ''}`}
                        onClick={() => setShowElementoSegDropdown(v => !v)}
                      >
                        {elementoSeg ? (
                          <span className="usr-skills-filtro-summary">{elementoSeg}</span>
                        ) : (
                          <span className="usr-skills-filtro-placeholder">Todas las pantallas</span>
                        )}
                        <span className="usr-skills-filtro-chevron">{showElementoSegDropdown ? '▲' : '▼'}</span>
                      </div>
                      {showElementoSegDropdown && (
                        <div className="usr-skills-filtro-dropdown">
                          <div className="usr-skills-filtro-header">
                            <input
                              className="usr-skills-filtro-search"
                              type="text"
                              placeholder="🔍 Buscar elemento..."
                              value={elementoSegSearch}
                              onChange={e => setElementoSegSearch(e.target.value)}
                              onClick={ev => ev.stopPropagation()}
                              autoFocus
                            />
                          </div>
                          <div className="usr-skills-filtro-list">
                            <label
                              className={`usr-skills-filtro-item ${!elementoSeg ? 'selected' : ''}`}
                              onClick={() => { setElementoSeg(''); setShowElementoSegDropdown(false); setElementoSegSearch(''); }}
                            >
                              <span className="usr-skills-filtro-item-name">Todas las pantallas</span>
                            </label>
                            {elemsOpts
                              .filter(o => o.label.toLowerCase().includes(elementoSegSearch.toLowerCase()))
                              .map(o => (
                                <label
                                  key={o.value}
                                  className={`usr-skills-filtro-item ${elementoSeg === o.value ? 'selected' : ''}`}
                                  onClick={() => { setElementoSeg(o.value); setShowElementoSegDropdown(false); setElementoSegSearch(''); }}
                                >
                                  <span className="usr-skills-filtro-item-name">{o.label}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : null;
              })()}
            </>
          )}

          {/* Filtros para vista QRM */}
          {vistaActiva === 'qrm' && filtros.id_empresa && (
            <>
              <div className="usr-topbar-field">
                <span className="usr-topbar-label">Usuario</span>
                <input
                  type="text"
                  className="usr-topbar-select"
                  placeholder="Buscar usuario..."
                  value={filtrosQRM.usuario || ''}
                  onChange={e => setFiltrosQRM({...filtrosQRM, usuario: e.target.value})}
                />
              </div>
              <div className="usr-topbar-field usr-topbar-field-skills" ref={sociedadQRMRef}>
                <span className="usr-topbar-label">Sociedad</span>
                <div className="usr-skills-filtro-wrap">
                  <div
                    className={`usr-skills-filtro-input ${showSociedadQRM ? 'open' : ''}`}
                    onClick={() => setShowSociedadQRM(v => !v)}
                  >
                    {filtrosQRM.sociedad ? (
                      <span className="usr-skills-filtro-summary">{filtrosQRM.sociedad}</span>
                    ) : (
                      <span className="usr-skills-filtro-placeholder">Todas</span>
                    )}
                    <span className="usr-skills-filtro-chevron">{showSociedadQRM ? '▲' : '▼'}</span>
                  </div>
                  {showSociedadQRM && (
                    <div className="usr-skills-filtro-dropdown">
                      <div className="usr-skills-filtro-header">
                        <input
                          className="usr-skills-filtro-search"
                          type="text"
                          placeholder="🔍 Buscar sociedad..."
                          value={sociedadQRMSearch}
                          onChange={e => setSociedadQRMSearch(e.target.value)}
                          onClick={ev => ev.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="usr-skills-filtro-list">
                        <label
                          className={`usr-skills-filtro-item ${!filtrosQRM.sociedad ? 'selected' : ''}`}
                          onClick={() => { setFiltrosQRM({...filtrosQRM, sociedad: ''}); setShowSociedadQRM(false); setSociedadQRMSearch(''); }}
                        >
                          <span className="usr-skills-filtro-item-name">Todas</span>
                        </label>
                        {sociedadesQRM
                          .filter(s => s.toLowerCase().includes(sociedadQRMSearch.toLowerCase()))
                          .map(s => (
                            <label
                              key={s}
                              className={`usr-skills-filtro-item ${filtrosQRM.sociedad === s ? 'selected' : ''}`}
                              onClick={() => { setFiltrosQRM({...filtrosQRM, sociedad: s}); setShowSociedadQRM(false); setSociedadQRMSearch(''); }}
                            >
                              <span className="usr-skills-filtro-item-name">{s}</span>
                            </label>
                          ))}
                        {sociedadesQRM.filter(s => s.toLowerCase().includes(sociedadQRMSearch.toLowerCase())).length === 0 && (
                          <div className="usr-skills-filtro-empty">No se encontraron sociedades</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="usr-topbar-field usr-topbar-field-skills" ref={marcaQRMRef}>
                <span className="usr-topbar-label">Marca</span>
                <div className="usr-skills-filtro-wrap">
                  <div
                    className={`usr-skills-filtro-input ${showMarcaQRM ? 'open' : ''}`}
                    onClick={() => setShowMarcaQRM(v => !v)}
                  >
                    {filtrosQRM.marca ? (
                      <span className="usr-skills-filtro-summary">{filtrosQRM.marca}</span>
                    ) : (
                      <span className="usr-skills-filtro-placeholder">Todas</span>
                    )}
                    <span className="usr-skills-filtro-chevron">{showMarcaQRM ? '▲' : '▼'}</span>
                  </div>
                  {showMarcaQRM && (
                    <div className="usr-skills-filtro-dropdown">
                      <div className="usr-skills-filtro-header">
                        <input
                          className="usr-skills-filtro-search"
                          type="text"
                          placeholder="🔍 Buscar marca..."
                          value={marcaQRMSearch}
                          onChange={e => setMarcaQRMSearch(e.target.value)}
                          onClick={ev => ev.stopPropagation()}
                          autoFocus
                        />
                      </div>
                      <div className="usr-skills-filtro-list">
                        <label
                          className={`usr-skills-filtro-item ${!filtrosQRM.marca ? 'selected' : ''}`}
                          onClick={() => { setFiltrosQRM({...filtrosQRM, marca: ''}); setShowMarcaQRM(false); setMarcaQRMSearch(''); }}
                        >
                          <span className="usr-skills-filtro-item-name">Todas</span>
                        </label>
                        {marcasQRM
                          .filter(m => m.toLowerCase().includes(marcaQRMSearch.toLowerCase()))
                          .map(m => (
                            <label
                              key={m}
                              className={`usr-skills-filtro-item ${filtrosQRM.marca === m ? 'selected' : ''}`}
                              onClick={() => { setFiltrosQRM({...filtrosQRM, marca: m}); setShowMarcaQRM(false); setMarcaQRMSearch(''); }}
                            >
                              <span className="usr-skills-filtro-item-name">{m}</span>
                            </label>
                          ))}
                        {marcasQRM.filter(m => m.toLowerCase().includes(marcaQRMSearch.toLowerCase())).length === 0 && (
                          <div className="usr-skills-filtro-empty">No se encontraron marcas</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Acciones */}
        <div className="usr-topbar-divider" />
        <button
          className="usr-topbar-btn-buscar"
          onClick={() => {
            if (vistaActiva === 'seguridad') {
              if (subSeccionSeg === 'masiva') { buscarMasiva(); return; }
              consultarSeg();
              return;
            }
            if (!filtros.id_empresa) return;
            if (vistaActiva === 'historial') {
              // En historial, llamar a la función buscar del componente
              historialEstadosRef.current?.buscar();
            } else {
              // En otras vistas, cargar usuarios normalmente
              cargarUsuarios('', 1);
            }
          }}
          disabled={(vistaActiva !== 'seguridad' && !filtros.id_empresa) || (vistaActiva === 'seguridad' ? (subSeccionSeg === 'masiva' ? loadingMasiva : loadingSeg) : loading.usuarios)}
        >
          {vistaActiva === 'seguridad'
            ? (subSeccionSeg === 'masiva'
                ? (loadingMasiva ? '⏳' : '🔍 Buscar usuarios')
                : (loadingSeg ? '⏳' : '🔍 Consultar'))
            : (loading.usuarios ? '⏳' : '🔍 Buscar')}
        </button>
        <button className="usr-topbar-clear" onClick={limpiarFiltros} title="Limpiar filtros">🧹</button>
      </div>

      {/* BODY: Sidebar + Content */}
      <div className="usr-body">
        {/* SIDEBAR */}
        <div className="usr-sidebar">
          <p className="usr-sidebar-title">Gestión</p>
          {SIDEBAR_ITEMS.map(item => (
            <div key={item.id}>
              <button
                className={`usr-sidebar-item ${vistaActiva === item.id ? 'active' : ''}`}
                onClick={() => { 
                  const willExpand = expandedSidebarItem !== item.id;
                  setExpandedSidebarItem(willExpand ? item.id : '');
                  setVistaActiva(item.id);
                  if (item.id === 'seguridad') {
                    cargarDatosSeg();
                  } else if (item.id !== 'historial') {
                    cargarPerfiles();
                  } else if (item.id === 'historial' && filtros.id_empresa && usuarios.length === 0) {
                    // Cargar usuarios para el historial si no hay usuarios cargados
                    cargarUsuarios('', 1);
                  }
                }}
                aria-expanded={expandedSidebarItem === item.id}
              >
                <span className="usr-sidebar-icon">{item.icon}</span>
                <span className="usr-sidebar-labels">
                  <span className="usr-sidebar-label">{item.label}</span>
                  <span className="usr-sidebar-desc">{item.desc}</span>
                </span>
                {vistaActiva === item.id && <span className="usr-sidebar-arrow">›</span>}
              </button>
              {item.id === 'seguridad' && (
                <div className={`usr-sidebar-subitems ${expandedSidebarItem === 'seguridad' ? 'open' : ''}`}>
                  <button className={`usr-sidebar-subitem ${subSeccionSeg === 'usuarios' ? 'active' : ''}`} onClick={() => { setSubSeccionSeg('usuarios'); setVistaActiva('seguridad'); }}>Usuarios</button>
                  <button className={`usr-sidebar-subitem ${subSeccionSeg === 'masiva' ? 'active' : ''}`} onClick={() => { setSubSeccionSeg('masiva'); setVistaActiva('seguridad'); }}>Gestión Masiva</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* CONTENT */}
        <div className="usr-content">
          {/* PANTALLA DE BIENVENIDA - cuando no hay empresa seleccionada y NO es historial ni seguridad */}
          {!filtros.id_empresa && vistaActiva !== 'historial' && vistaActiva !== 'seguridad' && (
            <div className="usr-welcome-screen">
              <div className="usr-welcome-card">
                <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="usr-welcome-logo" />
                <p className="usr-welcome-text">Selecciona una base de datos y empresa para comenzar</p>
              </div>
            </div>
          )}


      {/* LISTA DE USUARIOS PARA SELECCIÓN MASIVA */}
      {vistaActiva === 'asignar' && filtros.id_empresa && usuarios.length > 0 && (() => {
        let usuariosFiltradosMasivo = perfilFiltro
          ? usuarios.filter(u => u.PERFILES && u.PERFILES.split(', ').includes(perfilFiltro))
          : usuarios;
        if (estadoFiltroMasivo)
          usuariosFiltradosMasivo = usuariosFiltradosMasivo.filter(u => u.ESTADO_SEG === estadoFiltroMasivo);
        if (estadoPlataformaFiltroMasivo)
          usuariosFiltradosMasivo = usuariosFiltradosMasivo.filter(u =>
            estadosActualesMapa[String(u.ID_USUARIO)] &&
            String(estadosActualesMapa[String(u.ID_USUARIO)].id_estado) === estadoPlataformaFiltroMasivo
          );
        if (usuarioMasivoSearch)
          usuariosFiltradosMasivo = usuariosFiltradosMasivo.filter(u =>
            u.NOMBRE_USUARIO.toLowerCase().includes(usuarioMasivoSearch.toLowerCase())
          );
        if (usuariosConSkillsMapaMasivo !== null)
          usuariosFiltradosMasivo = usuariosFiltradosMasivo.filter(u => usuariosConSkillsMapaMasivo[String(u.ID_USUARIO)]);
        if (usuariosConBotRedesMapaMasivo !== null)
          usuariosFiltradosMasivo = usuariosFiltradosMasivo.filter(u => usuariosConBotRedesMapaMasivo[String(u.ID_USUARIO)]);
        const hayFiltroSkillsMasivo = usuariosConSkillsMapaMasivo !== null && skillsFiltroMasivo.length > 0;
        const hayFiltroBotRedesMasivo = usuariosConBotRedesMapaMasivo !== null && botRedesFiltroMasivo.length > 0;
        const totalPaginas = Math.ceil(usuariosFiltradosMasivo.length / usrPageSize);
        const paginaSegura = Math.min(paginaLocal, totalPaginas || 1);
        const usuariosPagina = usuariosFiltradosMasivo.slice((paginaSegura - 1) * usrPageSize, paginaSegura * usrPageSize);
        return (
          <section className="card usr-masivo-card">
            {/* Cabecera integrada con acciones */}
            <div className="usr-masivo-header">
              <div className="usr-masivo-header-left">
                <label className="usr-masivo-check-all">
                  <input
                    type="checkbox"
                    checked={usuariosFiltradosMasivo.length > 0 && usuariosFiltradosMasivo.every(u => usuariosSeleccionados.some(sel => sel.ID_USUARIO === u.ID_USUARIO))}
                    onChange={() => {
                      if (usuariosFiltradosMasivo.length > 0 && usuariosFiltradosMasivo.every(u => usuariosSeleccionados.some(sel => sel.ID_USUARIO === u.ID_USUARIO))) {
                        setUsuariosSeleccionados(prev => prev.filter(sel => !usuariosFiltradosMasivo.some(u => u.ID_USUARIO === sel.ID_USUARIO)));
                      } else {
                        setUsuariosSeleccionados([...usuariosFiltradosMasivo]);
                      }
                    }}
                  />
                </label>
                <h3 className="usr-masivo-title">Usuarios</h3>
                <span className="usr-masivo-total-badge">
                  {(perfilFiltro || estadoFiltroMasivo || estadoPlataformaFiltroMasivo || usuarioMasivoSearch || usuariosConSkillsMapaMasivo !== null || usuariosConBotRedesMapaMasivo !== null)
                    ? `${usuariosFiltradosMasivo.length} de ${usuarios.length}`
                    : `${usuarios.length} total`}
                </span>
              </div>
              <div className="usr-masivo-header-right">
                {usuariosSeleccionados.length > 0 && (
                  <span className="usr-masivo-sel-count">
                    {usuariosSeleccionados.length} seleccionados
                  </span>
                )}
                <button
                  className="usr-export-btn"
                  onClick={() => {
                    const listaParaExportar = usuariosSeleccionados.length > 0 ? usuariosSeleccionados : usuariosFiltradosMasivo;
                    exportarUsuariosXLSX(listaParaExportar, 'Masivo');
                  }}
                  disabled={usuariosFiltradosMasivo.length === 0 && usuariosSeleccionados.length === 0}
                  title={usuariosSeleccionados.length > 0 ? `Exportar ${usuariosSeleccionados.length} seleccionados a Excel` : 'Exportar todos los filtrados a Excel'}
                >
                  <img src="/assets/EXCEL.png" alt="Excel" className="usr-export-btn-icon" />
                  <span>{usuariosSeleccionados.length > 0 ? `Excel (${usuariosSeleccionados.length})` : 'Excel'}</span>
                </button>
                <button
                  className="usr-export-btn"
                  onClick={() => {
                    const listaParaExportar = usuariosSeleccionados.length > 0 ? usuariosSeleccionados : usuariosFiltradosMasivo;
                    exportarUsuariosCSV(listaParaExportar, 'Masivo');
                  }}
                  disabled={usuariosFiltradosMasivo.length === 0 && usuariosSeleccionados.length === 0}
                  title={usuariosSeleccionados.length > 0 ? `Exportar ${usuariosSeleccionados.length} seleccionados a CSV` : 'Exportar todos los filtrados a CSV'}
                >
                  <img src="/assets/CSV.png" alt="CSV" className="usr-export-btn-icon" />
                  <span>{usuariosSeleccionados.length > 0 ? `CSV (${usuariosSeleccionados.length})` : 'CSV'}</span>
                </button>
                <button
                  className="usr-masivo-btn-gestionar"
                  onClick={abrirModalPermisos}
                  disabled={usuariosSeleccionados.length === 0 || loading.masivo || cargandoPermisosModal}
                >
                  {cargandoPermisosModal ? '⏳' : '🔧'} Gestionar Permisos
                </button>
              </div>
            </div>

            {/* Grid de tarjetas */}
            <div className="usr-masivo-grid">
              {usuariosPagina.map(usuario => {
                const isSelected = usuariosSeleccionados.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
                return (
                  <div
                    key={usuario.ID_USUARIO}
                    className={`usr-masivo-card-item ${isSelected ? 'usr-masivo-selected' : ''}`}
                    onClick={() => toggleUsuarioSeleccionado(usuario)}
                  >
                    <input
                      type="checkbox"
                      className="usr-masivo-checkbox"
                      checked={!!isSelected}
                      onChange={() => {}}
                      onClick={e => e.stopPropagation()}
                    />
                    <div className="usr-masivo-info">
                      <span className="usr-masivo-nombre" title={usuario.NOMBRE_USUARIO}>
                        {usuario.NOMBRE_USUARIO}
                      </span>
                      <span className="usr-masivo-id">ID: {usuario.ID_USUARIO}</span>
                      <div className="usr-masivo-badges">
                        {usuario.PERFILES && (
                          <span className="usr-masivo-badge-perfil">{usuario.PERFILES}</span>
                        )}
                        {usuario.ESTADO_SEG != null && (
                          <span className={`usr-masivo-badge-estado ${usuario.ESTADO_SEG === 'ALTA' ? 'alta' : 'baja'}`}>
                            {usuario.ESTADO_SEG}
                          </span>
                        )}
                        {usuario.BLOQUEADO && (
                          <span className="usr-masivo-badge-bloqueado">🔒</span>
                        )}
                        {estadosActualesMapa[String(usuario.ID_USUARIO)] && (() => {
                          const est = estadosActualesMapa[String(usuario.ID_USUARIO)];
                          const esMobil = est.movil === true || est.movil === 1;
                          return (
                            <>
                              <span className="usr-masivo-badge-estado-plataforma" style={{ background: colorEstado(est.id_estado) }}>
                                {est.nombre}
                              </span>
                              {est.activo && (
                                <span className="usr-masivo-badge-dispositivo">
                                  {esMobil ? '📱 Móvil' : '💻 Web'}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {hayFiltroSkillsMasivo && (() => {
                        const idsDelUsuario = (usuariosConSkillsMapaMasivo[String(usuario.ID_USUARIO)] || []).map(Number);
                        const skillsUsuario = skillsFiltroMasivo.filter(s => idsDelUsuario.includes(Number(s.ID_SKILL)));
                        const skillsFaltantes = skillsFiltroMasivo.filter(s => !idsDelUsuario.includes(Number(s.ID_SKILL)));
                        const tieneSkills = skillsUsuario.length > 0;
                        const faltanSkills = skillsFaltantes.length > 0;
                        if (!tieneSkills && !faltanSkills) return null;
                        return (
                          <div className="usr-revisar-skills-section">
                            <div className="usr-revisar-skills-header">
                              <span className="usr-revisar-skills-label">Skills:</span>
                              <div className="usr-revisar-skills-actions">
                                {faltanSkills && (
                                  <button
                                    className="usr-skill-bulk-btn add-all"
                                    title="Agregar todas"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasSkillsUsuario(usuario, skillsFaltantes, true, 'masivo'); }}
                                  >+</button>
                                )}
                                {tieneSkills && (
                                  <button
                                    className="usr-skill-bulk-btn remove-all"
                                    title="Quitar todas"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasSkillsUsuario(usuario, skillsUsuario, false, 'masivo'); }}
                                  >×</button>
                                )}
                              </div>
                            </div>
                            <div className="usr-revisar-skills-chips">
                              {skillsUsuario.map(s => (
                                <span key={s.ID_SKILL} className="usr-revisar-skill-chip usr-skill-chip-action">
                                  ⚡ {s.NOMBRE_SKILL}
                                  <button
                                    className="usr-skill-chip-btn remove"
                                    title="Eliminar permiso"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarSkillUsuarioRapido(usuario, s, false, 'masivo'); }}
                                  >×</button>
                                </span>
                              ))}
                              {skillsFaltantes.map(s => (
                                <span key={`add-${s.ID_SKILL}`} className="usr-revisar-skill-chip usr-skill-chip-action missing">
                                  {s.NOMBRE_SKILL}
                                  <button
                                    className="usr-skill-chip-btn add"
                                    title="Agregar permiso"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarSkillUsuarioRapido(usuario, s, true, 'masivo'); }}
                                  >+</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {hayFiltroBotRedesMasivo && (() => {
                        const idsDelUsuario = (usuariosConBotRedesMapaMasivo[String(usuario.ID_USUARIO)] || []).map(Number);
                        const botRedesUsuario = botRedesFiltroMasivo.filter(b => idsDelUsuario.includes(Number(b.ID_BOT_REDES)));
                        const botRedesFaltantes = botRedesFiltroMasivo.filter(b => !idsDelUsuario.includes(Number(b.ID_BOT_REDES)));
                        const tieneBotRedes = botRedesUsuario.length > 0;
                        const faltanBotRedes = botRedesFaltantes.length > 0;
                        if (!tieneBotRedes && !faltanBotRedes) return null;
                        return (
                          <div className="usr-revisar-skills-section">
                            <div className="usr-revisar-skills-header">
                              <span className="usr-revisar-skills-label">Bot:</span>
                              <div className="usr-revisar-skills-actions">
                                {faltanBotRedes && (
                                  <button
                                    className="usr-skill-bulk-btn add-all"
                                    title="Agregar todas"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasBotRedesUsuario(usuario, botRedesFaltantes, true, 'masivo'); }}
                                  >+</button>
                                )}
                                {tieneBotRedes && (
                                  <button
                                    className="usr-skill-bulk-btn remove-all"
                                    title="Quitar todas"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasBotRedesUsuario(usuario, botRedesUsuario, false, 'masivo'); }}
                                  >×</button>
                                )}
                              </div>
                            </div>
                            <div className="usr-revisar-skills-chips">
                              {botRedesUsuario.map(b => {
                                const getIconoRed = (idRedSocial) => {
                                  const iconos = {
                                    1: '/assets/whatsapp.png',
                                    2: '/assets/messenger.png',
                                    7: '/assets/webchat.png',
                                    10: '/assets/instagram_messenger.svg',
                                    11: '/assets/facebook_comnetarios.png',
                                    12: '/assets/instagram_comentarios.png'
                                  };
                                  return iconos[idRedSocial] || '/assets/webchat.png';
                                };
                                return (
                                  <span key={b.ID_BOT_REDES} className="usr-revisar-skill-chip usr-skill-chip-action usr-botred-chip">
                                    <img src={getIconoRed(b.ID_RED_SOCIAL)} alt="" className="usr-botred-chip-icon" onError={(e) => { e.target.src = '/assets/webchat.png'; }} />
                                    {b.NOMBRE_BOT}
                                    <button
                                      className="usr-skill-chip-btn remove"
                                      title="Eliminar permiso"
                                      disabled={loading.masivo}
                                      onClick={ev => { ev.stopPropagation(); cambiarBotRedUsuarioRapido(usuario, b, false, 'masivo'); }}
                                    >×</button>
                                  </span>
                                );
                              })}
                              {botRedesFaltantes.map(b => {
                                const getIconoRed = (idRedSocial) => {
                                  const iconos = {
                                    1: '/assets/whatsapp.png',
                                    2: '/assets/messenger.png',
                                    7: '/assets/webchat.png',
                                    10: '/assets/instagram_messenger.svg',
                                    11: '/assets/facebook_comnetarios.png',
                                    12: '/assets/instagram_comentarios.png'
                                  };
                                  return iconos[idRedSocial] || '/assets/webchat.png';
                                };
                                return (
                                  <span key={`add-${b.ID_BOT_REDES}`} className="usr-revisar-skill-chip usr-skill-chip-action missing usr-botred-chip">
                                    <img src={getIconoRed(b.ID_RED_SOCIAL)} alt="" className="usr-botred-chip-icon" onError={(e) => { e.target.src = '/assets/webchat.png'; }} />
                                    {b.NOMBRE_BOT}
                                    <button
                                      className="usr-skill-chip-btn add"
                                      title="Agregar permiso"
                                      disabled={loading.masivo}
                                      onClick={ev => { ev.stopPropagation(); cambiarBotRedUsuarioRapido(usuario, b, true, 'masivo'); }}
                                    >+</button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginador */}
            <div className="usr-masivo-paginador">
              <button className="usr-masivo-pag-btn" disabled={paginaSegura === 1} onClick={() => setPaginaLocal(1)}>««</button>
              <button className="usr-masivo-pag-btn" disabled={paginaSegura === 1} onClick={() => setPaginaLocal(p => Math.max(1, p - 1))}>Anterior</button>
              <span className="usr-masivo-pag-info">
                Página {paginaSegura} de {totalPaginas}
                <small>({usuariosPagina.length} de {usuariosFiltradosMasivo.length} usuarios · {usrPageSize} por página)</small>
              </span>
              <button className="usr-masivo-pag-btn" disabled={paginaSegura === totalPaginas} onClick={() => setPaginaLocal(p => Math.min(totalPaginas, p + 1))}>Siguiente</button>
              <button className="usr-masivo-pag-btn" disabled={paginaSegura === totalPaginas} onClick={() => setPaginaLocal(totalPaginas)}>»»</button>
            </div>
          </section>
        );
      })()}

      {/* VISTA ASIGNACIÓN POR USUARIO EJEMPLO */}
      {vistaActiva === 'asignacion' && filtros.id_empresa && usuarios.length > 0 && (() => {
        let usuariosFiltradosAsignacion = perfilFiltroAsignacion
          ? usuarios.filter(u => u.PERFILES && u.PERFILES.split(', ').includes(perfilFiltroAsignacion))
          : usuarios;
        if (estadoFiltroAsignacion)
          usuariosFiltradosAsignacion = usuariosFiltradosAsignacion.filter(u => u.ESTADO_SEG === estadoFiltroAsignacion);
        if (estadoPlataformaFiltroAsignacion)
          usuariosFiltradosAsignacion = usuariosFiltradosAsignacion.filter(u =>
            estadosActualesMapa[String(u.ID_USUARIO)] &&
            String(estadosActualesMapa[String(u.ID_USUARIO)].id_estado) === estadoPlataformaFiltroAsignacion
          );
        if (usuarioDestinoSearch)
          usuariosFiltradosAsignacion = usuariosFiltradosAsignacion.filter(u =>
            u.NOMBRE_USUARIO.toLowerCase().includes(usuarioDestinoSearch.toLowerCase())
          );
        const totalPaginas = Math.ceil(usuariosFiltradosAsignacion.length / usrPageSize);
        const paginaSegura = Math.min(paginaLocal, totalPaginas || 1);
        const usuariosPagina = usuariosFiltradosAsignacion.slice((paginaSegura - 1) * usrPageSize, paginaSegura * usrPageSize);

        const getIconoRed = (idRedSocial) => {
          const iconos = { 1: '/assets/whatsapp.png', 2: '/assets/messenger.png', 7: '/assets/webchat.png', 10: '/assets/instagram_messenger.svg', 11: '/assets/facebook_comnetarios.png', 12: '/assets/instagram_comentarios.png' };
          return iconos[idRedSocial] || '/assets/webchat.png';
        };

        return (
          <div className="usr-asignacion-container">
            {/* Panel izquierdo: Permisos del usuario ejemplo */}
            <div className="usr-asignacion-permisos-panel">
              {!usuarioEjemplo ? (
                <div className="usr-asignacion-empty">
                  <span className="usr-asignacion-empty-icon">👤</span>
                  <p>Selecciona un <strong>Usuario Ejemplo</strong> en la barra superior para cargar sus permisos</p>
                </div>
              ) : loadingEjemplo ? (
                <div className="usr-asignacion-empty">
                  <span className="usr-asignacion-empty-icon">⏳</span>
                  <p>Cargando permisos de <strong>{usuarioEjemplo.NOMBRE_USUARIO}</strong>...</p>
                </div>
              ) : (
                <>
                  <div className="usr-asignacion-permisos-header">
                    <h3>Permisos de <strong>{usuarioEjemplo.NOMBRE_USUARIO}</strong></h3>
                    <span className="usr-masivo-total-badge">
                      {permisosEjemploSeleccionados.skills.length + permisosEjemploSeleccionados.bot_redes.length + permisosEjemploSeleccionados.tipos_cliente.length} seleccionados
                    </span>
                  </div>

                  {/* Skills */}
                  <div className="usr-asignacion-seccion">
                    <div className="usr-asignacion-seccion-header">
                      <h4 className="usr-asignacion-titulo-skills">Skills ({permisosEjemplo.skills.length})</h4>
                      <div className="usr-asignacion-seccion-actions">
                        <button className="usr-skills-filtro-action-btn" onClick={() => setPermisosEjemploSeleccionados(prev => ({ ...prev, skills: permisosEjemplo.skills.map(s => s.ID_SKILL) }))}>Todos</button>
                        <button className="usr-skills-filtro-action-btn" onClick={() => setPermisosEjemploSeleccionados(prev => ({ ...prev, skills: [] }))}>Ninguno</button>
                      </div>
                    </div>
                    <div className="usr-asignacion-lista">
                      {permisosEjemplo.skills.length === 0 ? (
                        <span className="usr-asignacion-no-permisos">Sin skills asignados</span>
                      ) : permisosEjemplo.skills.map(s => (
                        <label key={s.ID_SKILL} className="usr-asignacion-permiso-item">
                          <input type="checkbox" checked={permisosEjemploSeleccionados.skills.includes(s.ID_SKILL)} onChange={() => togglePermisoEjemplo('skills', s.ID_SKILL)} />
                          <span>{s.NOMBRE_SKILL}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Bot Redes */}
                  <div className="usr-asignacion-seccion">
                    <div className="usr-asignacion-seccion-header">
                      <h4 className="usr-asignacion-titulo-botredes">Bot Redes ({permisosEjemplo.bot_redes.length})</h4>
                      <div className="usr-asignacion-seccion-actions">
                        <button className="usr-skills-filtro-action-btn" onClick={() => setPermisosEjemploSeleccionados(prev => ({ ...prev, bot_redes: permisosEjemplo.bot_redes.map(r => r.ID_BOT_REDES) }))}>Todos</button>
                        <button className="usr-skills-filtro-action-btn" onClick={() => setPermisosEjemploSeleccionados(prev => ({ ...prev, bot_redes: [] }))}>Ninguno</button>
                      </div>
                    </div>
                    <div className="usr-asignacion-lista">
                      {permisosEjemplo.bot_redes.length === 0 ? (
                        <span className="usr-asignacion-no-permisos">Sin bot redes asignados</span>
                      ) : permisosEjemplo.bot_redes.map(r => (
                        <label key={r.ID_BOT_REDES} className="usr-asignacion-permiso-item usr-asignacion-botred">
                          <input type="checkbox" checked={permisosEjemploSeleccionados.bot_redes.includes(r.ID_BOT_REDES)} onChange={() => togglePermisoEjemplo('bot_redes', r.ID_BOT_REDES)} />
                          <img src={getIconoRed(r.ID_RED_SOCIAL)} alt="" className="usr-botred-chip-icon" onError={(e) => { e.target.src = '/assets/webchat.png'; }} />
                          <span>{r.NOMBRE_BOT}</span>
                          {r.NOMBRE_PAIS && <span className="usr-botred-pais">({r.NOMBRE_PAIS})</span>}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tipos de Cliente */}
                  <div className="usr-asignacion-seccion">
                    <div className="usr-asignacion-seccion-header">
                      <h4 className="usr-asignacion-titulo-tipos">Tipos de Cliente ({permisosEjemplo.tipos_cliente.length})</h4>
                      <div className="usr-asignacion-seccion-actions">
                        <button className="usr-skills-filtro-action-btn" onClick={() => setPermisosEjemploSeleccionados(prev => ({ ...prev, tipos_cliente: permisosEjemplo.tipos_cliente.map(t => t.ID_TIPO) }))}>Todos</button>
                        <button className="usr-skills-filtro-action-btn" onClick={() => setPermisosEjemploSeleccionados(prev => ({ ...prev, tipos_cliente: [] }))}>Ninguno</button>
                      </div>
                    </div>
                    <div className="usr-asignacion-lista">
                      {permisosEjemplo.tipos_cliente.length === 0 ? (
                        <span className="usr-asignacion-no-permisos">Sin tipos de cliente asignados</span>
                      ) : permisosEjemplo.tipos_cliente.map(t => (
                        <label key={t.ID_TIPO} className="usr-asignacion-permiso-item">
                          <input type="checkbox" checked={permisosEjemploSeleccionados.tipos_cliente.includes(t.ID_TIPO)} onChange={() => togglePermisoEjemplo('tipos_cliente', t.ID_TIPO)} />
                          <span>{t.NOMBRE_TIPO}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Botón Asignar */}
                  <div className="usr-asignacion-footer">
                    <button
                      className="usr-masivo-btn-gestionar"
                      onClick={ejecutarAsignacionPorEjemplo}
                      disabled={loading.masivo || usuariosDestinoSeleccionados.length === 0 || (permisosEjemploSeleccionados.skills.length + permisosEjemploSeleccionados.bot_redes.length + permisosEjemploSeleccionados.tipos_cliente.length) === 0}
                    >
                      {loading.masivo ? '⏳ Asignando...' : `📋 Asignar a ${usuariosDestinoSeleccionados.length} usuario${usuariosDestinoSeleccionados.length !== 1 ? 's' : ''}`}
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Panel derecho: Grid de usuarios destino */}
            <div className="usr-asignacion-usuarios-panel">
              <div className="usr-masivo-header">
                <div className="usr-masivo-header-left">
                  <label className="usr-masivo-check-all">
                    <input
                      type="checkbox"
                      checked={usuariosFiltradosAsignacion.length > 0 && usuariosFiltradosAsignacion.every(u => usuariosDestinoSeleccionados.some(sel => sel.ID_USUARIO === u.ID_USUARIO))}
                      onChange={() => {
                        if (usuariosFiltradosAsignacion.length > 0 && usuariosFiltradosAsignacion.every(u => usuariosDestinoSeleccionados.some(sel => sel.ID_USUARIO === u.ID_USUARIO))) {
                          setUsuariosDestinoSeleccionados(prev => prev.filter(sel => !usuariosFiltradosAsignacion.some(u => u.ID_USUARIO === sel.ID_USUARIO)));
                        } else {
                          setUsuariosDestinoSeleccionados([...usuariosFiltradosAsignacion]);
                        }
                      }}
                    />
                  </label>
                  <h3 className="usr-masivo-title">Usuarios Destino</h3>
                  <span className="usr-masivo-total-badge">
                    {(perfilFiltroAsignacion || estadoFiltroAsignacion || estadoPlataformaFiltroAsignacion || usuarioDestinoSearch)
                      ? `${usuariosFiltradosAsignacion.length} de ${usuarios.length}`
                      : `${usuarios.length} total`}
                  </span>
                </div>
                <div className="usr-masivo-header-right">
                  <input
                    type="text"
                    className="usr-asignacion-search-inline"
                    placeholder="🔍 Buscar usuario..."
                    value={usuarioDestinoSearch}
                    onChange={e => { setUsuarioDestinoSearch(e.target.value); setPaginaLocal(1); }}
                  />
                  {usuariosDestinoSeleccionados.length > 0 && (
                    <span className="usr-masivo-sel-count">
                      {usuariosDestinoSeleccionados.length} seleccionados
                    </span>
                  )}
                </div>
              </div>

              <div className="usr-masivo-grid">
                {usuariosPagina.map(usuario => {
                  const isSelected = usuariosDestinoSeleccionados.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
                  return (
                    <div
                      key={usuario.ID_USUARIO}
                      className={`usr-masivo-card-item ${isSelected ? 'usr-masivo-selected' : ''}`}
                      onClick={() => toggleUsuarioDestino(usuario)}
                    >
                      <input
                        type="checkbox"
                        className="usr-masivo-checkbox"
                        checked={!!isSelected}
                        onChange={() => {}}
                        onClick={e => e.stopPropagation()}
                      />
                      <div className="usr-masivo-info">
                        <span className="usr-masivo-nombre" title={usuario.NOMBRE_USUARIO}>
                          {usuario.NOMBRE_USUARIO}
                        </span>
                        <span className="usr-masivo-id">ID: {usuario.ID_USUARIO}</span>
                        <div className="usr-masivo-badges">
                          {usuario.PERFILES && (
                            <span className="usr-masivo-badge-perfil">{usuario.PERFILES}</span>
                          )}
                          {usuario.ESTADO_SEG != null && (
                            <span className={`usr-masivo-badge-estado ${usuario.ESTADO_SEG === 'ALTA' ? 'alta' : 'baja'}`}>
                              {usuario.ESTADO_SEG}
                            </span>
                          )}
                          {usuario.BLOQUEADO && (
                            <span className="usr-masivo-badge-bloqueado">🔒</span>
                          )}
                          {estadosActualesMapa[String(usuario.ID_USUARIO)] && (() => {
                            const est = estadosActualesMapa[String(usuario.ID_USUARIO)];
                            const esMobil = est.movil === true || est.movil === 1;
                            return (
                              <>
                                <span className="usr-masivo-badge-estado-plataforma" style={{ background: colorEstado(est.id_estado) }}>
                                  {est.nombre}
                                </span>
                                {est.activo && (
                                  <span className="usr-masivo-badge-dispositivo">
                                    {esMobil ? '📱 Móvil' : '💻 Web'}
                                  </span>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Paginador */}
              <div className="usr-masivo-paginador">
                <button className="usr-masivo-pag-btn" disabled={paginaSegura === 1} onClick={() => setPaginaLocal(1)}>««</button>
                <button className="usr-masivo-pag-btn" disabled={paginaSegura === 1} onClick={() => setPaginaLocal(p => Math.max(1, p - 1))}>Anterior</button>
                <span className="usr-masivo-pag-info">
                  Página {paginaSegura} de {totalPaginas}
                  <small>({usuariosPagina.length} de {usuariosFiltradosAsignacion.length} usuarios)</small>
                </span>
                <button className="usr-masivo-pag-btn" disabled={paginaSegura === totalPaginas} onClick={() => setPaginaLocal(p => Math.min(totalPaginas, p + 1))}>Siguiente</button>
                <button className="usr-masivo-pag-btn" disabled={paginaSegura === totalPaginas} onClick={() => setPaginaLocal(totalPaginas)}>»»</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Revisar view sections removed - replaced by Asignación view above */}

      {/* TARJETAS DE PERMISOS removed */}
      {false && (
        <div className="permisos-grid-removed">
          {/* PERMISOS DE REDES SOCIALES */}
          <section className="card permisos-card">
            <div className="card-header">
              <h3>
                <span className="icon">🌐</span>
                Redes Sociales
                {loading.permisos && <span className="loading-indicator">⌛</span>}
              </h3>
              <span className="badge-count">{permisos.redes.length}</span>
            </div>
            <div className="card-content">
              {permisos.redes.length === 0 ? (
                <div className="empty-state">
                  <p>El usuario no tiene permisos de redes sociales asignados</p>
                </div>
              ) : (
                <div className="permisos-list">
                  {permisos.redes.map((red, index) => {
                    // Mapeo de ID_RED_SOCIAL a iconos
                    const getIconoRed = (idRedSocial) => {
                      const iconos = {
                        1: '/assets/whatsapp.png',
                        2: '/assets/messenger.png',
                        7: '/assets/webchat.png',
                        10: '/assets/instagram_messenger.svg',
                        11: '/assets/facebook_comnetarios.png',
                        12: '/assets/instagram_comentarios.png'
                      };
                      return iconos[idRedSocial] || '/assets/webchat.png';
                    };

                    return (
                    <div key={`${red.ID_BOT_REDES}-${index}`} className="permiso-item">
                      <div className="permiso-icon imagen-red">
                        <img
                          src={getIconoRed(red.ID_RED_SOCIAL)}
                          alt={red.NOMBRE_RED_SOCIAL}
                          className="icono-red-social"
                          onError={(e) => { e.target.src = '/assets/webchat.png'; }}
                        />
                      </div>
                      <div className="permiso-info">
                        <span className="permiso-nombre">{red.NOMBRE_BOT}</span>
                        <span className="permiso-detalle">
                          {red.NOMBRE_RED_SOCIAL}
                          {red.NOMBRE_PAIS && <span className="pais-tag">{red.NOMBRE_PAIS}</span>}
                          {red.MANTENIMIENTO === 1 && <span className="mantenimiento-badge">🔧 Mantenimiento</span>}
                        </span>
                      </div>
                      <div className="permiso-estado">
                        <span className={`estado-dot ${red.ESTADO === 1 ? 'activo' : 'inactivo'}`}></span>
                      </div>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* PERMISOS DE SKILLS */}
          <section className="card permisos-card">
            <div className="card-header">
              <h3>
                <span className="icon">⚡</span>
                Skills
                {loading.permisos && <span className="loading-indicator">⌛</span>}
              </h3>
              <span className="badge-count">{permisos.skills.length}</span>
            </div>
            <div className="card-content">
              {permisos.skills.length === 0 ? (
                <div className="empty-state">
                  <p>El usuario no tiene skills asignados</p>
                </div>
              ) : (
                <div className="permisos-list">
                  {permisos.skills.map((skill, index) => (
                    <div key={`${skill.ID_SKILL}-${index}`} className="permiso-item">
                      <div className="permiso-icon">⚡</div>
                      <div className="permiso-info">
                        <span className="permiso-nombre">{skill.NOMBRE_SKILL}</span>
                        <span className="permiso-detalle">
                          ID Skill: {skill.ID_SKILL}
                        </span>
                      </div>
                      <div className="permiso-estado">
                        <span className={`estado-dot ${skill.ESTADO === 1 ? 'activo' : 'inactivo'}`}></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* PERMISOS DE TIPOS DE CLIENTE */}
          <section className="card permisos-card">
            <div className="card-header">
              <h3>
                <span className="icon">👥</span>
                Tipos de Cliente
                {loading.permisos && <span className="loading-indicator">⌛</span>}
              </h3>
              <span className="badge-count">{permisos.tiposCliente.length}</span>
            </div>
            <div className="card-content">
              {permisos.tiposCliente.length === 0 ? (
                <div className="empty-state">
                  <p>El usuario no tiene tipos de cliente asignados</p>
                </div>
              ) : (
                <div className="permisos-list">
                  {permisos.tiposCliente.map((tipo, index) => (
                    <div key={`${tipo.ID_TIPO}-${index}`} className="permiso-item">
                      <div className="permiso-icon">👤</div>
                      <div className="permiso-info">
                        <span className="permiso-nombre">{tipo.NOMBRE_TIPO}</span>
                        <span className="permiso-detalle">
                          {tipo.SISTEMA === 1 && <span className="sistema-badge">Sistema</span>}
                        </span>
                      </div>
                      <div className="permiso-estado">
                        <span className={`estado-dot ${tipo.ESTADO === 1 ? 'activo' : 'inactivo'}`}></span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      )}

      {/* LISTA DE USUARIOS REVISAR removed */}
      {false && (() => {
        let usuariosFiltradosPerfil = perfilFiltroRevisar
          ? usuarios.filter(u => u.PERFILES && u.PERFILES.split(', ').includes(perfilFiltroRevisar))
          : usuarios;
        if (estadoFiltroRevisar)
          usuariosFiltradosPerfil = usuariosFiltradosPerfil.filter(u => u.ESTADO_SEG === estadoFiltroRevisar);
        if (estadoPlataformaFiltroRevisar)
          usuariosFiltradosPerfil = usuariosFiltradosPerfil.filter(u =>
            estadosActualesMapa[String(u.ID_USUARIO)] &&
            String(estadosActualesMapa[String(u.ID_USUARIO)].id_estado) === estadoPlataformaFiltroRevisar
          );
        if (usuariosFiltroRevisar.length > 0)
          usuariosFiltradosPerfil = usuariosFiltradosPerfil.filter(u =>
            usuariosFiltroRevisar.some(sel => sel.ID_USUARIO === u.ID_USUARIO)
          );
        if (usuariosConSkillsMapaRevisar !== null)
          usuariosFiltradosPerfil = usuariosFiltradosPerfil.filter(u => usuariosConSkillsMapaRevisar[String(u.ID_USUARIO)]);
        if (usuariosConBotRedesMapaRevisar !== null)
          usuariosFiltradosPerfil = usuariosFiltradosPerfil.filter(u => usuariosConBotRedesMapaRevisar[String(u.ID_USUARIO)]);
        const hayFiltroSkills = usuariosConSkillsMapaRevisar !== null && skillsFiltroRevisar.length > 0;
        const hayFiltroBotRedes = usuariosConBotRedesMapaRevisar !== null && botRedesFiltroRevisar.length > 0;
        return (
          <section className="usr-revisar-card">
            {/* Cabecera */}
            <div className="usr-revisar-header">
              <div className="usr-masivo-header-left">
                <h3 className="usr-masivo-title">👥 Usuarios de la Empresa</h3>
                <span className="usr-masivo-total-badge">
                  {(perfilFiltroRevisar || estadoFiltroRevisar || estadoPlataformaFiltroRevisar || usuariosFiltroRevisar.length > 0 || usuariosConSkillsMapaRevisar !== null || usuariosConBotRedesMapaRevisar !== null)
                    ? `${usuariosFiltradosPerfil.length} de ${usuarios.length}`
                    : `${usuarios.length} usuarios`}
                </span>
                {loading.usuarios && <span className="usr-revisar-loading">⏳ Cargando...</span>}
              </div>
              <div className="usr-masivo-header-right">
                <button
                  className="usr-export-btn"
                  onClick={() => exportarUsuariosXLSX(usuariosFiltradosPerfil, 'Revisar')}
                  disabled={usuariosFiltradosPerfil.length === 0}
                  title="Exportar a Excel"
                >
                  <img src="/assets/EXCEL.png" alt="Excel" className="usr-export-btn-icon" />
                  <span>Excel</span>
                </button>
                <button
                  className="usr-export-btn"
                  onClick={() => exportarUsuariosCSV(usuariosFiltradosPerfil, 'Revisar')}
                  disabled={usuariosFiltradosPerfil.length === 0}
                  title="Exportar a CSV"
                >
                  <img src="/assets/CSV.png" alt="CSV" className="usr-export-btn-icon" />
                  <span>CSV</span>
                </button>
              </div>
            </div>

            {/* Grid auto-fill responsive — scroll interno */}
            <div className="usr-revisar-grid">
              {usuariosFiltradosPerfil.map(usuario => {
                const idsDelUsuarioR = hayFiltroSkills
                  ? (usuariosConSkillsMapaRevisar[String(usuario.ID_USUARIO)] || []).map(Number)
                  : [];
                const skillsUsuario = hayFiltroSkills
                  ? skillsFiltroRevisar.filter(s => idsDelUsuarioR.includes(Number(s.ID_SKILL)))
                  : [];
                const skillsFaltantes = hayFiltroSkills
                  ? skillsFiltroRevisar.filter(s => !idsDelUsuarioR.includes(Number(s.ID_SKILL)))
                  : [];
                const idsBotRedUsuarioR = hayFiltroBotRedes
                  ? (usuariosConBotRedesMapaRevisar[String(usuario.ID_USUARIO)] || []).map(Number)
                  : [];
                const botRedesUsuario = hayFiltroBotRedes
                  ? botRedesFiltroRevisar.filter(b => idsBotRedUsuarioR.includes(Number(b.ID_BOT_REDES)))
                  : [];
                const botRedesFaltantes = hayFiltroBotRedes
                  ? botRedesFiltroRevisar.filter(b => !idsBotRedUsuarioR.includes(Number(b.ID_BOT_REDES)))
                  : [];
                return (
                  <div
                    key={usuario.ID_USUARIO}
                    className="usr-revisar-card-item"
                    onClick={() => seleccionarUsuario(usuario)}
                  >
                    <div className="usr-masivo-info">
                      <span className="usr-masivo-nombre" title={usuario.NOMBRE_USUARIO}>
                        {usuario.NOMBRE_USUARIO}
                      </span>
                      <span className="usr-masivo-id">ID: {usuario.ID_USUARIO}</span>
                      <div className="usr-masivo-badges">
                        {usuario.PERFILES && (
                          <span className="usr-masivo-badge-perfil">{usuario.PERFILES}</span>
                        )}
                        {usuario.ESTADO_SEG != null && (
                          <span className={`usr-masivo-badge-estado ${usuario.ESTADO_SEG === 'ALTA' ? 'alta' : 'baja'}`}>
                            {usuario.ESTADO_SEG}
                          </span>
                        )}
                        {usuario.BLOQUEADO && (
                          <span className="usr-masivo-badge-bloqueado">🔒</span>
                        )}
                        {estadosActualesMapa[String(usuario.ID_USUARIO)] && (() => {
                          const est = estadosActualesMapa[String(usuario.ID_USUARIO)];
                          const esMobil = est.movil === true || est.movil === 1;
                          return (
                            <>
                              <span className="usr-masivo-badge-estado-plataforma" style={{ background: colorEstado(est.id_estado) }}>
                                {est.nombre}
                              </span>
                              {est.activo && (
                                <span className="usr-masivo-badge-dispositivo">
                                  {esMobil ? '📱 Móvil' : '💻 Web'}
                                </span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                      {hayFiltroSkills && (() => {
                        const tieneSkills = skillsUsuario.length > 0;
                        const faltanSkills = skillsFaltantes.length > 0;
                        if (!tieneSkills && !faltanSkills) return null;
                        return (
                          <div className="usr-revisar-skills-section">
                            <div className="usr-revisar-skills-header">
                              <span className="usr-revisar-skills-label">Skills:</span>
                              <div className="usr-revisar-skills-actions">
                                {faltanSkills && (
                                  <button
                                    className="usr-skills-action-link add-all"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasSkillsUsuario(usuario, skillsFaltantes, true, 'revisar'); }}
                                  >
                                    + Agregar todas ({skillsFaltantes.length})
                                  </button>
                                )}
                                {tieneSkills && (
                                  <button
                                    className="usr-skills-action-link remove-all"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasSkillsUsuario(usuario, skillsUsuario, false, 'revisar'); }}
                                  >
                                    × Quitar todas ({skillsUsuario.length})
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="usr-revisar-skills-chips">
                              {skillsUsuario.map(s => (
                                <span key={s.ID_SKILL} className="usr-revisar-skill-chip usr-skill-chip-action">
                                  ⚡ {s.NOMBRE_SKILL}
                                  <button
                                    className="usr-skill-chip-btn remove"
                                    title="Eliminar permiso"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarSkillUsuarioRapido(usuario, s, false, 'revisar'); }}
                                  >×</button>
                                </span>
                              ))}
                              {skillsFaltantes.map(s => (
                                <span key={`add-${s.ID_SKILL}`} className="usr-revisar-skill-chip usr-skill-chip-action missing">
                                  {s.NOMBRE_SKILL}
                                  <button
                                    className="usr-skill-chip-btn add"
                                    title="Agregar permiso"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarSkillUsuarioRapido(usuario, s, true, 'revisar'); }}
                                  >+</button>
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                      {hayFiltroBotRedes && (() => {
                        const tieneBotRedes = botRedesUsuario.length > 0;
                        const faltanBotRedes = botRedesFaltantes.length > 0;
                        if (!tieneBotRedes && !faltanBotRedes) return null;
                        return (
                          <div className="usr-revisar-skills-section">
                            <div className="usr-revisar-skills-header">
                              <span className="usr-revisar-skills-label">Bot:</span>
                              <div className="usr-revisar-skills-actions">
                                {faltanBotRedes && (
                                  <button
                                    className="usr-skills-action-link add-all"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasBotRedesUsuario(usuario, botRedesFaltantes, true, 'revisar'); }}
                                  >
                                    + Agregar todos ({botRedesFaltantes.length})
                                  </button>
                                )}
                                {tieneBotRedes && (
                                  <button
                                    className="usr-skills-action-link remove-all"
                                    disabled={loading.masivo}
                                    onClick={ev => { ev.stopPropagation(); cambiarTodasBotRedesUsuario(usuario, botRedesUsuario, false, 'revisar'); }}
                                  >
                                    × Quitar todos ({botRedesUsuario.length})
                                  </button>
                                )}
                              </div>
                            </div>
                            <div className="usr-revisar-skills-chips">
                              {botRedesUsuario.map(b => {
                                const getIconoRed = (idRedSocial) => {
                                  const iconos = {
                                    1: '/assets/whatsapp.png',
                                    2: '/assets/messenger.png',
                                    7: '/assets/webchat.png',
                                    10: '/assets/instagram_messenger.svg',
                                    11: '/assets/facebook_comnetarios.png',
                                    12: '/assets/instagram_comentarios.png'
                                  };
                                  return iconos[idRedSocial] || '/assets/webchat.png';
                                };
                                return (
                                  <span key={b.ID_BOT_REDES} className="usr-revisar-skill-chip usr-skill-chip-action usr-botred-chip">
                                    <img src={getIconoRed(b.ID_RED_SOCIAL)} alt="" className="usr-botred-chip-icon" onError={(e) => { e.target.src = '/assets/webchat.png'; }} />
                                    {b.NOMBRE_BOT}
                                    <button
                                      className="usr-skill-chip-btn remove"
                                      title="Eliminar permiso"
                                      disabled={loading.masivo}
                                      onClick={ev => { ev.stopPropagation(); cambiarBotRedUsuarioRapido(usuario, b, false, 'revisar'); }}
                                    >×</button>
                                  </span>
                                );
                              })}
                              {botRedesFaltantes.map(b => {
                                const getIconoRed = (idRedSocial) => {
                                  const iconos = {
                                    1: '/assets/whatsapp.png',
                                    2: '/assets/messenger.png',
                                    7: '/assets/webchat.png',
                                    10: '/assets/instagram_messenger.svg',
                                    11: '/assets/facebook_comnetarios.png',
                                    12: '/assets/instagram_comentarios.png'
                                  };
                                  return iconos[idRedSocial] || '/assets/webchat.png';
                                };
                                return (
                                  <span key={`add-${b.ID_BOT_REDES}`} className="usr-revisar-skill-chip usr-skill-chip-action missing usr-botred-chip">
                                    <img src={getIconoRed(b.ID_RED_SOCIAL)} alt="" className="usr-botred-chip-icon" onError={(e) => { e.target.src = '/assets/webchat.png'; }} />
                                    {b.NOMBRE_BOT}
                                    <button
                                      className="usr-skill-chip-btn add"
                                      title="Agregar permiso"
                                      disabled={loading.masivo}
                                      onClick={ev => { ev.stopPropagation(); cambiarBotRedUsuarioRapido(usuario, b, true, 'revisar'); }}
                                    >+</button>
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                    <span className="usr-revisar-arrow">›</span>
                  </div>
                );
              })}
            </div>

          </section>
        );
      })()}

      {/* VISTA HISTORIAL DE ESTADOS */}
      {vistaActiva === 'historial' && (
        <AHistorialEstados
          ref={historialEstadosRef}
          dbKey={filtros.db_key}
          idEmpresa={filtros.id_empresa}
          perfilFiltro={perfilFiltroHistorial}
          estadoPlataformaFiltro={estadoPlataformaFiltroHistorial}
          fechaInicio={fechaInicioHistorial}
          fechaFin={fechaFinHistorial}
          skillsFiltro={skillsFiltroHistorial}
          botRedesFiltro={botRedesFiltroHistorial}
          usuarioSearch={usuarioHistorialSelected ? String(usuarioHistorialSelected.ID_USUARIO) : usuarioHistorialSearch}
        />
      )}

      {/* VISTA SEGURIDAD */}
      {vistaActiva === 'seguridad' && (
        <>
          {subSeccionSeg === 'usuarios' && (
            <ContenidoSeguridad
              resultados={resultadosSeg}
              loading={loadingSeg}
              dbKey={dbKeySeg}
              onPermisosSaved={(secusuarioid, nuevosPermisos, desbloquear) => {
                if (desbloquear) {
                  setResultadosSeg(prev => prev.map(u => u.secusuarioid === secusuarioid ? { ...u, bloqueado: false } : u));
                  toast.success('Usuario desbloqueado');
                } else {
                  setResultadosSeg(prev => prev.map(u => u.secusuarioid === secusuarioid ? { ...u, permisos: nuevosPermisos } : u));
                  toast.success('Permisos actualizados');
                }
              }}
            />
          )}
          {subSeccionSeg === 'masiva' && (
            <GestionMasivaPermisos
              dbKey={dbKeySeg}
              empresas={empresasSeg}
              perfiles={perfilesMasiva}
              elementos={elementosMasiva}
              modo={modoMasiva}
              empId={secEmpresaId}
              estado={estadoSeg}
              perfilId={perfilIdMasiva}
              elemId={elemIdMasiva}
              usuarios={usuariosMasiva}
              loading={loadingMasiva}
              seleccionados={seleccionadosMasiva}
              setSeleccionados={setSeleccionadosMasiva}
              log={logMasiva}
              ejecutando={ejecutandoMasiva}
              onToggleUser={(id) => {
                setSeleccionadosMasiva(prev => {
                  const n = new Set(prev);
                  n.has(id) ? n.delete(id) : n.add(id);
                  return n;
                });
              }}
              onEjecutar={ejecutarMasiva}
              busqLocal={busquedaMasivaLocal}
              setBusqLocal={setBusquedaMasivaLocal}
              pagina={paginaMasiva}
              setPagina={setPaginaMasiva}
            />
          )}
        </>
      )}

      {/* VISTA USUARIOS QRM */}
      {vistaActiva === 'qrm' && (
        <UsuariosQRM 
          dbKey={filtros.db_key} 
          idEmpresa={filtros.id_empresa}
          empresas={empresas}
          filtrosExternos={filtrosQRM}
          onFiltrosChange={setFiltrosQRM}
          onSociedadesMarcasChange={(data) => {
            setSociedadesQRM(data.sociedades);
            setMarcasQRM(data.marcas);
          }}
        />
      )}


      {/* MODAL UNIFICADO DE PERMISOS */}
      {showModalPermisos && (
        <div className="gesp-overlay" onClick={() => setShowModalPermisos(false)}>
          <div className="gesp-modal gesp-modal-v2" onClick={e => e.stopPropagation()}>
            {/* Header con tabs */}
            <div className="gesp-v2-header">
              <div className="gesp-v2-tabs">
                <button className={`gesp-v2-tab ${(!modalTabActiva || modalTabActiva === 'skills') ? 'active' : ''}`} onClick={() => setModalTabActiva('skills')}>Permisos Skill</button>
                <button className={`gesp-v2-tab ${modalTabActiva === 'tipos_cliente' ? 'active' : ''}`} onClick={() => setModalTabActiva('tipos_cliente')}>Tipos de Cliente</button>
                <button className={`gesp-v2-tab ${modalTabActiva === 'bot_redes' ? 'active' : ''}`} onClick={() => setModalTabActiva('bot_redes')}>Bot Redes</button>
              </div>
              <button className="gesp-v2-close" onClick={() => setShowModalPermisos(false)}>✕</button>
            </div>

            <div className="gesp-v2-body">
              {/* Instrucciones + búsqueda */}
              <p className="gesp-v2-instruccion">
                Seleccione los {(!modalTabActiva || modalTabActiva === 'skills') ? 'skills' : modalTabActiva === 'tipos_cliente' ? 'tipos de cliente' : 'bot redes'} que desea asignar/desasignar al usuario.
              </p>

              <div className="gesp-v2-toolbar">
                <div className="gesp-v2-search-wrap">
                  <span className="gesp-v2-search-label">
                    {(!modalTabActiva || modalTabActiva === 'skills') ? 'Skill:' : modalTabActiva === 'tipos_cliente' ? 'Tipo:' : 'Bot Red:'}
                  </span>
                  <input
                    type="text"
                    className="gesp-v2-search"
                    placeholder={(!modalTabActiva || modalTabActiva === 'skills') ? 'Nombre del skill' : modalTabActiva === 'tipos_cliente' ? 'Nombre del tipo' : 'Nombre del bot'}
                    value={(!modalTabActiva || modalTabActiva === 'skills') ? searchSkills : modalTabActiva === 'tipos_cliente' ? searchTipos : searchBotRedes}
                    onChange={e => {
                      if (!modalTabActiva || modalTabActiva === 'skills') setSearchSkills(e.target.value);
                      else if (modalTabActiva === 'tipos_cliente') setSearchTipos(e.target.value);
                      else setSearchBotRedes(e.target.value);
                    }}
                  />
                </div>
                <div className="gesp-v2-toolbar-btns">
                  <button
                    className="gesp-v2-btn-all"
                    title="Seleccionar todos"
                    onClick={() => {
                      if (!modalTabActiva || modalTabActiva === 'skills') {
                        setPermisosSeleccionados(prev => ({ ...prev, skills: skillsDisponibles.map(s => s.ID_SKILL) }));
                      } else if (modalTabActiva === 'tipos_cliente') {
                        setPermisosSeleccionados(prev => ({ ...prev, tipos_cliente: tiposClienteDisponibles.map(t => t.ID_TIPO) }));
                      } else {
                        setPermisosSeleccionados(prev => ({ ...prev, bot_redes: botRedesDisponibles.map(b => b.ID_BOT_REDES) }));
                      }
                    }}
                  >☑</button>
                  <button
                    className="gesp-v2-btn-none"
                    title="Deseleccionar todos"
                    onClick={() => {
                      if (!modalTabActiva || modalTabActiva === 'skills') {
                        setPermisosSeleccionados(prev => ({ ...prev, skills: [] }));
                      } else if (modalTabActiva === 'tipos_cliente') {
                        setPermisosSeleccionados(prev => ({ ...prev, tipos_cliente: [] }));
                      } else {
                        setPermisosSeleccionados(prev => ({ ...prev, bot_redes: [] }));
                      }
                    }}
                  >☐</button>
                </div>
              </div>

              {/* Tabla de permisos */}
              <div className="gesp-v2-table-wrap">
                <table className="gesp-v2-table">
                  <thead>
                    <tr>
                      <th className="gesp-v2-th-name">
                        {(!modalTabActiva || modalTabActiva === 'skills') ? 'Skill' : modalTabActiva === 'tipos_cliente' ? 'Tipo de Cliente' : 'Bot Red'}
                      </th>
                      <th className="gesp-v2-th-check">Asignado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(!modalTabActiva || modalTabActiva === 'skills') && (
                      skillsFiltrados.length > 0 ? skillsFiltrados.map(skill => (
                        <tr key={skill.ID_SKILL} className={permisosSeleccionados.skills.includes(skill.ID_SKILL) ? 'gesp-v2-row-active' : ''} onClick={() => togglePermisoSeleccionado('skills', skill.ID_SKILL)}>
                          <td>{skill.NOMBRE_SKILL}</td>
                          <td className="gesp-v2-td-check">
                            <input type="checkbox" checked={permisosSeleccionados.skills.includes(skill.ID_SKILL)} onChange={() => {}} />
                          </td>
                        </tr>
                      )) : <tr><td colSpan="2" className="gesp-v2-empty">No se encontraron skills</td></tr>
                    )}
                    {modalTabActiva === 'tipos_cliente' && (
                      tiposFiltrados.length > 0 ? tiposFiltrados.map(tipo => (
                        <tr key={tipo.ID_TIPO} className={permisosSeleccionados.tipos_cliente.includes(tipo.ID_TIPO) ? 'gesp-v2-row-active' : ''} onClick={() => togglePermisoSeleccionado('tipos_cliente', tipo.ID_TIPO)}>
                          <td>{tipo.NOMBRE_TIPO}</td>
                          <td className="gesp-v2-td-check">
                            <input type="checkbox" checked={permisosSeleccionados.tipos_cliente.includes(tipo.ID_TIPO)} onChange={() => {}} />
                          </td>
                        </tr>
                      )) : <tr><td colSpan="2" className="gesp-v2-empty">No se encontraron tipos de cliente</td></tr>
                    )}
                    {modalTabActiva === 'bot_redes' && (
                      botRedesFiltrados.length > 0 ? botRedesFiltrados.map(bot => (
                        <tr key={bot.ID_BOT_REDES} className={permisosSeleccionados.bot_redes.includes(bot.ID_BOT_REDES) ? 'gesp-v2-row-active' : ''} onClick={() => togglePermisoSeleccionado('bot_redes', bot.ID_BOT_REDES)}>
                          <td>{bot.NOMBRE_BOT} <span className="gesp-v2-red-social">({bot.NOMBRE_RED_SOCIAL})</span></td>
                          <td className="gesp-v2-td-check">
                            <input type="checkbox" checked={permisosSeleccionados.bot_redes.includes(bot.ID_BOT_REDES)} onChange={() => {}} />
                          </td>
                        </tr>
                      )) : <tr><td colSpan="2" className="gesp-v2-empty">No se encontraron bot redes</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Tabla resumen de usuarios */}
              <div className="gesp-v2-resumen">
                <table className="gesp-v2-table gesp-v2-table-resumen">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                      <th>
                        {(!modalTabActiva || modalTabActiva === 'skills') ? 'Skills asignados' : modalTabActiva === 'tipos_cliente' ? 'Tipos asignados' : 'Bot Redes asignados'}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {usuariosSeleccionados.map(u => (
                      <tr key={u.ID_USUARIO}>
                        <td>{u.NOMBRE_USUARIO}</td>
                        <td className="gesp-v2-resumen-permisos">
                          {(!modalTabActiva || modalTabActiva === 'skills')
                            ? (permisosSeleccionados.skills.length > 0
                                ? skillsDisponibles.filter(s => permisosSeleccionados.skills.includes(s.ID_SKILL)).map(s => s.NOMBRE_SKILL).join(', ') || 'Ninguno'
                                : 'Ninguno')
                            : modalTabActiva === 'tipos_cliente'
                              ? (permisosSeleccionados.tipos_cliente.length > 0
                                  ? tiposClienteDisponibles.filter(t => permisosSeleccionados.tipos_cliente.includes(t.ID_TIPO)).map(t => t.NOMBRE_TIPO).join(', ') || 'Ninguno'
                                  : 'Ninguno')
                              : (permisosSeleccionados.bot_redes.length > 0
                                  ? botRedesDisponibles.filter(b => permisosSeleccionados.bot_redes.includes(b.ID_BOT_REDES)).map(b => b.NOMBRE_BOT).join(', ') || 'Ninguno'
                                  : 'Ninguno')
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="gesp-v2-footer">
              <div className="gesp-diff">
                {(() => {
                  const agregar = {
                    s: permisosSeleccionados.skills.filter(id => !permisosOriginales.skills.includes(id)).length,
                    t: permisosSeleccionados.tipos_cliente.filter(id => !permisosOriginales.tipos_cliente.includes(id)).length,
                    b: permisosSeleccionados.bot_redes.filter(id => !permisosOriginales.bot_redes.includes(id)).length,
                  };
                  const quitar = {
                    s: permisosOriginales.skills.filter(id => !permisosSeleccionados.skills.includes(id)).length,
                    t: permisosOriginales.tipos_cliente.filter(id => !permisosSeleccionados.tipos_cliente.includes(id)).length,
                    b: permisosOriginales.bot_redes.filter(id => !permisosSeleccionados.bot_redes.includes(id)).length,
                  };
                  const totalA = agregar.s + agregar.t + agregar.b;
                  const totalQ = quitar.s + quitar.t + quitar.b;
                  return <>
                    {totalA > 0 && <span className="gesp-diff-add">➕ {totalA} por asignar</span>}
                    {totalQ > 0 && <span className="gesp-diff-del">➖ {totalQ} por quitar</span>}
                    {totalA === 0 && totalQ === 0 && <span className="gesp-diff-none">Sin cambios</span>}
                  </>;
                })()}
              </div>
              <div className="gesp-actions">
                <button className="gesp-btn-cancel" onClick={() => setShowModalPermisos(false)}>Cancelar</button>
                <button className="gesp-btn-save" onClick={ejecutarGuardarPermisos} disabled={loading.masivo}>
                  {loading.masivo ? '⏳ Guardando...' : '💾 Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
        </div> {/* cierra usr-content */}
      </div> {/* cierra usr-body */}
      
      <ConfirmModal
        show={showEliminarPermisosModal}
        title="Eliminar Permisos"
        confirmText="Eliminar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmEliminarPermisos}
        onCancel={() => setShowEliminarPermisosModal(false)}
      >
        <p>¿Estás seguro de eliminar {permisosSeleccionados.skills.length + permisosSeleccionados.tipos_cliente.length + permisosSeleccionados.bot_redes.length} permisos de {usuariosSeleccionados.length} usuarios?</p>
      </ConfirmModal>

      <ConfirmModal
        show={showAsignarPermisosModal}
        title="Asignar Permisos"
        confirmText="Asignar"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={confirmAsignarPermisos}
        onCancel={() => setShowAsignarPermisosModal(false)}
      >
        <p>¿Asignar {permisosEjemploSeleccionados.skills.length + permisosEjemploSeleccionados.bot_redes.length + permisosEjemploSeleccionados.tipos_cliente.length} permisos a {usuariosDestinoSeleccionados.length} usuarios?</p>
      </ConfirmModal>
    </div> /* cierra dashboard */
  );
}

export default Usuarios;