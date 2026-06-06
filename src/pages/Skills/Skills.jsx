import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import ConfirmModal from '../../components/ConfirmModal';
import HorariosBots from './HorariosBots';
import './Skills.css'; 

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

function Skills() { 
  // Estado persistente - Recuperar de sessionStorage al iniciar
  const [filtros, setFiltros] = useState(() => {
    const savedFiltros = sessionStorage.getItem('skills_filtros');
    return savedFiltros ? JSON.parse(savedFiltros) : { 
      db_key: 'db_1', 
      id_empresa: '', 
      nombre_empresa: '',
      skill_search: '',
      skills_seleccionados: [], // Array de {ID_SKILL, NOMBRE_SKILL}
      usuario_search: '',
      usuarios_seleccionados: [], // Array de {ID_USUARIO, NOMBRE_USUARIO}
      estado: '',
      eliminado: '',
      bot_id: '', // Para vista de Horarios Bots
    };
  });
  
  const [skills, setSkills] = useState(() => {
    const savedSkills = sessionStorage.getItem('skills_data');
    return savedSkills ? JSON.parse(savedSkills) : [];
  });
  
  const [seleccionados, setSeleccionados] = useState(() => {
    const savedSeleccionados = sessionStorage.getItem('skills_seleccionados');
    return savedSeleccionados ? JSON.parse(savedSeleccionados) : [];
  });

  // Listas para dropdowns (persistidas en sessionStorage para evitar re-fetch al remontar)
  const [empresas, setEmpresas] = useState(() => {
    try { const s = sessionStorage.getItem('skills_empresas'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [usuarios, setUsuarios] = useState(() => {
    try { const s = sessionStorage.getItem('skills_usuarios_lista'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [skillsLista, setSkillsLista] = useState(() => {
    try { const s = sessionStorage.getItem('skills_skills_lista'); return s ? JSON.parse(s) : []; } catch { return []; }
  });
  const [bots, setBots] = useState([]);
  const [loading, setLoading] = useState({ empresas: false, usuarios: false, skills: false });
  const [loadingBots, setLoadingBots] = useState(false);
  
  // Vista activa del submenú lateral: 'skills' | 'bots'
  const [vistaActiva, setVistaActiva] = useState('skills');
  
  // Paginación en dropdowns
  const [paginacionUsuarios, setPaginacionUsuarios] = useState({ page: 1, totalPages: 1, total: 0 });
  const [paginacionSkills, setPaginacionSkills] = useState({ page: 1, totalPages: 1, total: 0 });
  
  // Control de visibilidad de dropdowns
  const [showSkillDropdown, setShowSkillDropdown] = useState(false);
  const [showUsuarioDropdown, setShowUsuarioDropdown] = useState(false);

  // Cola activa contraíble
  const [colaExpanded, setColaExpanded] = useState(false);

  // Limpiar todos los toasts al desmontar el componente (evita countdown congelado)
  useEffect(() => {
    return () => { toast.dismiss(); };
  }, []);
  
  // Referencias para dropdowns
  const skillInputRef = useRef(null);
  const usuarioInputRef = useRef(null);

  // Refs para detectar cambio real (no solo remontar)
  const empresaCacheadaRef = useRef(
    (() => { try { const s = sessionStorage.getItem('skills_filtros'); return s ? JSON.parse(s).id_empresa : ''; } catch { return ''; } })()
  );
  const dbKeyCacheadaRef = useRef(
    (() => { try { const s = sessionStorage.getItem('skills_filtros'); return s ? JSON.parse(s).db_key : ''; } catch { return ''; } })()
  );
  // Guardar valor previo para detectar cambio real en búsquedas
  const prevSkillSearchRef = useRef(
    (() => { try { const s = sessionStorage.getItem('skills_filtros'); return s ? JSON.parse(s).skill_search : undefined; } catch { return undefined; } })()
  );
  const prevUsuarioSearchRef = useRef(
    (() => { try { const s = sessionStorage.getItem('skills_filtros'); return s ? JSON.parse(s).usuario_search : undefined; } catch { return undefined; } })()
  );

  // Posición fixed para dropdowns (superar z-index de select nativos)
  const [skillDropPos, setSkillDropPos] = useState({});
  const [usuarioDropPos, setUsuarioDropPos] = useState({});

  const abrirSkillDropdown = () => {
    if (!filtros.id_empresa) return;
    if (skillInputRef.current) {
      const rect = skillInputRef.current.getBoundingClientRect();
      setSkillDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setShowSkillDropdown(true);
  };

  const abrirUsuarioDropdown = () => {
    if (!filtros.id_empresa) return;
    if (usuarioInputRef.current) {
      const rect = usuarioInputRef.current.getBoundingClientRect();
      setUsuarioDropPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setShowUsuarioDropdown(true);
  };
  
  // Tablas inferiores (Cola Activa vs Historial)
  const [programados, setProgramados] = useState([]);
  const [historial, setHistorial] = useState([]);
  const [tabActiva, setTabActiva] = useState('cola');

  // Paginacion
  const [currentPage, setCurrentPage] = useState(() => {
    const savedPage = sessionStorage.getItem('skills_currentPage');
    return savedPage ? parseInt(savedPage) : 1;
  });
  const itemsPerPage = 15;

  // Ordenamiento
  const [sortConfig, setSortConfig] = useState(() => {
    const savedSort = sessionStorage.getItem('skills_sortConfig');
    return savedSort ? JSON.parse(savedSort) : { key: '', direction: '' };
  });
  
  // Modales
  const [modalConfirm, setModalConfirm] = useState({ show: false, id: null, type: '' });
  const [modalForm, setModalForm] = useState({ 
    show: false, mode: 'add', skill: null, desde: '08:00:00', hasta: '17:00:00', dias: [true, true, true, true, true, false, false] 
  });
  
  // Edición Masiva de Horarios
  const [modoEdicionMasiva, setModoEdicionMasiva] = useState(false);
  const [edicionMasivaData, setEdicionMasivaData] = useState({});
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);

  // Programación masiva (modal)
  const [showProgramarModal, setShowProgramarModal] = useState(false);
  const [formProgramar, setFormProgramar] = useState({
    nuevo_desde: '08:00:00', nuevo_hasta: '17:00:00',
    fecha_aplicacion: '', fecha_reversion: '',
    dias: [true, true, true, true, true, false, false]
  });
  // Horarios temporales nuevos (se crean al aplicar y se eliminan al revertir)
  const [horariosTemporales, setHorariosTemporales] = useState({});
  const [contadorTemporal, setContadorTemporal] = useState(0);

  // Skills expandidos (para mostrar horarios)
  const [expandidos, setExpandidos] = useState({});
  const toggleExpandido = (idSkill) => setExpandidos(prev => ({ ...prev, [idSkill]: !prev[idSkill] }));

  // Modal para editar mensaje directamente
  const [showEditarMensajeModal, setShowEditarMensajeModal] = useState(false);
  const [skillEditarMensaje, setSkillEditarMensaje] = useState(null);
  const [mensajeEditar, setMensajeEditar] = useState('');
  const [guardandoMensaje, setGuardandoMensaje] = useState(false);

  // Modal para programar cambio de mensaje (individual - legacy)
  const [showProgramarMensajeModal, setShowProgramarMensajeModal] = useState(false);
  const [formProgramarMensaje, setFormProgramarMensaje] = useState({
    nuevo_mensaje: '',
    fecha_aplicacion: '',
    fecha_reversion: ''
  });

  // Mensajes programados por skill dentro del modal de programación masiva
  // clave: id_skill, valor: { nuevo_mensaje, fecha_aplicacion, fecha_reversion, habilitado }
  const [formMensajesPorSkill, setFormMensajesPorSkill] = useState({});

  // Clipboard para copiar/pegar fechas individualmente entre horarios
  // { fecha_aplicacion, fecha_reversion }
  const [clipboardFechas, setClipboardFechas] = useState(null);

  const diasLetras = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (skillInputRef.current && !skillInputRef.current.contains(event.target)) {
        setShowSkillDropdown(false);
      }
      if (usuarioInputRef.current && !usuarioInputRef.current.contains(event.target)) {
        setShowUsuarioDropdown(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Persistencia en sessionStorage
  useEffect(() => {
    sessionStorage.setItem('skills_filtros', JSON.stringify(filtros));
  }, [filtros]);

  useEffect(() => {
    sessionStorage.setItem('skills_data', JSON.stringify(skills));
  }, [skills]);

  useEffect(() => {
    sessionStorage.setItem('skills_seleccionados', JSON.stringify(seleccionados));
  }, [seleccionados]);

  useEffect(() => {
    sessionStorage.setItem('skills_currentPage', currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    sessionStorage.setItem('skills_sortConfig', JSON.stringify(sortConfig));
  }, [sortConfig]);

  useEffect(() => {
    sessionStorage.setItem('skills_empresas', JSON.stringify(empresas));
  }, [empresas]);

  useEffect(() => {
    sessionStorage.setItem('skills_usuarios_lista', JSON.stringify(usuarios));
  }, [usuarios]);

  useEffect(() => {
    sessionStorage.setItem('skills_skills_lista', JSON.stringify(skillsLista));
  }, [skillsLista]);

  useEffect(() => { 
    cargarProgramados(); 
    cargarHistorial();
    
    const interval = setInterval(() => {
      cargarProgramados();
      cargarHistorial();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  // Cargar empresas: solo si no hay cache O si cambió la base de datos
  useEffect(() => {
    if (!filtros.db_key) return;
    const dbCambio = filtros.db_key !== dbKeyCacheadaRef.current;
    dbKeyCacheadaRef.current = filtros.db_key;
    if (empresas.length > 0 && !dbCambio) return;
    if (dbCambio) {
      setEmpresas([]);
      sessionStorage.removeItem('skills_empresas');
      setUsuarios([]);
      setSkillsLista([]);
      sessionStorage.removeItem('skills_usuarios_lista');
      sessionStorage.removeItem('skills_skills_lista');
      empresaCacheadaRef.current = '';
      // Limpiar empresa seleccionada al cambiar de base de datos
      setFiltros(prev => ({
        ...prev,
        id_empresa: '',
        nombre_empresa: '',
        skill_search: '',
        skills_seleccionados: [],
        usuario_search: '',
        usuarios_seleccionados: [],
        bot_id: ''
      }));
      setSkills([]);
      setSeleccionados([]);
      setBots([]);
    }
    const controller = new AbortController();
    cargarEmpresas(controller.signal);
    return () => controller.abort();
  }, [filtros.db_key]);

  // Cargar usuarios y skills: solo si no hay cache O si la empresa cambió realmente
  useEffect(() => {
    if (filtros.id_empresa && filtros.db_key) {
      const empresaCambio = filtros.id_empresa !== empresaCacheadaRef.current;
      empresaCacheadaRef.current = filtros.id_empresa;
      if (usuarios.length === 0 || skillsLista.length === 0 || empresaCambio) {
        if (empresaCambio) {
          setUsuarios([]);
          setSkillsLista([]);
          sessionStorage.removeItem('skills_usuarios_lista');
          sessionStorage.removeItem('skills_skills_lista');
        }
        const controller = new AbortController();
        if (usuarios.length === 0 || empresaCambio) cargarUsuarios('', 1, controller.signal);
        if (skillsLista.length === 0 || empresaCambio) cargarSkillsLista('', 1, controller.signal);
        return () => controller.abort();
      }
    } else if (!filtros.id_empresa) {
      empresaCacheadaRef.current = '';
      setUsuarios([]);
      setSkillsLista([]);
      sessionStorage.removeItem('skills_usuarios_lista');
      sessionStorage.removeItem('skills_skills_lista');
      setPaginacionUsuarios({ page: 1, totalPages: 1, total: 0 });
      setPaginacionSkills({ page: 1, totalPages: 1, total: 0 });
    }
  }, [filtros.id_empresa, filtros.db_key]);

  const cargarEmpresas = useCallback(async (signal) => {
    setLoading(prev => ({ ...prev, empresas: true }));
    try {
      const res = await fetch(API_URLS.empresas(filtros.db_key), { signal });
      const data = await res.json();
      if (Array.isArray(data)) {
        setEmpresas(data);
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando empresas:", e);
    } finally {
      setLoading(prev => ({ ...prev, empresas: false }));
    }
  }, [filtros.db_key]);

  const cargarUsuarios = useCallback(async (search = '', page = 1, signal) => {
    if (!filtros.id_empresa) return;
    
    setLoading(prev => ({ ...prev, usuarios: true }));
    try {
      const res = await fetch(API_URLS.usuarios(filtros.db_key, filtros.id_empresa, search, page), { signal });
      const data = await res.json();
      
      if (data && Array.isArray(data.usuarios)) {
        if (page === 1) {
          setUsuarios(data.usuarios);
        } else {
          setUsuarios(prev => [...prev, ...data.usuarios]);
        }
        setPaginacionUsuarios({
          page: data.page,
          totalPages: data.totalPages,
          total: data.total
        });
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando usuarios:", e);
    } finally {
      setLoading(prev => ({ ...prev, usuarios: false }));
    }
  }, [filtros.db_key, filtros.id_empresa]);

  const cargarSkillsLista = useCallback(async (search = '', page = 1, signal) => {
    if (!filtros.id_empresa) return;
    
    setLoading(prev => ({ ...prev, skills: true }));
    try {
      const res = await fetch(API_URLS.skillsLista(filtros.db_key, filtros.id_empresa, search, page), { signal });
      const data = await res.json();
      
      if (data && Array.isArray(data.skills)) {
        if (page === 1) {
          setSkillsLista(data.skills);
        } else {
          setSkillsLista(prev => [...prev, ...data.skills]);
        }
        setPaginacionSkills({
          page: data.page,
          totalPages: data.totalPages,
          total: data.total
        });
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando lista de skills:", e);
    } finally {
      setLoading(prev => ({ ...prev, skills: false }));
    }
  }, [filtros.db_key, filtros.id_empresa]);

  const cargarProgramados = useCallback(async () => {
    try {
      const res = await fetch(API_URLS.programados());
      const data = await res.json();
      if (Array.isArray(data)) setProgramados(data);
      else setProgramados([]);
    } catch (e) { 
      setProgramados([]);
      toast.error("Error cargando cola activa"); 
    }
  }, []);

  const cargarHistorial = useCallback(async () => {
    try {
      const res = await fetch(API_URLS.historial());
      const data = await res.json();
      if (Array.isArray(data)) setHistorial(data);
      else setHistorial([]);
    } catch (e) { 
      setHistorial([]);
      toast.error("Error cargando historial"); 
    }
  }, []);

  // Manejar scroll infinito en dropdowns
  const handleUsuarioScroll = (e) => {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      if (paginacionUsuarios.page < paginacionUsuarios.totalPages) {
        cargarUsuarios(filtros.usuario_search, paginacionUsuarios.page + 1);
      }
    }
  };

  const handleSkillScroll = (e) => {
    const element = e.target;
    if (element.scrollHeight - element.scrollTop === element.clientHeight) {
      if (paginacionSkills.page < paginacionSkills.totalPages) {
        cargarSkillsLista(filtros.skill_search, paginacionSkills.page + 1);
      }
    }
  };

  // Manejar búsqueda de usuarios
  const handleUsuarioSearch = (e) => {
    const search = e.target.value;
    setFiltros({ ...filtros, usuario_search: search });
    setShowUsuarioDropdown(true);
  };

  // Manejar búsqueda de skills
  const handleSkillSearch = (e) => {
    const search = e.target.value;
    setFiltros({ ...filtros, skill_search: search });
    setShowSkillDropdown(true);
  };

  // Buscar con debounce (solo si el valor cambió realmente respecto al previo)
  useEffect(() => {
    if (filtros.skill_search === prevSkillSearchRef.current) return;
    prevSkillSearchRef.current = filtros.skill_search;
    if (!filtros.id_empresa) return;
    const timer = setTimeout(() => {
      cargarSkillsLista(filtros.skill_search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtros.skill_search]);

  useEffect(() => {
    if (filtros.usuario_search === prevUsuarioSearchRef.current) return;
    prevUsuarioSearchRef.current = filtros.usuario_search;
    if (!filtros.id_empresa) return;
    const timer = setTimeout(() => {
      cargarUsuarios(filtros.usuario_search, 1);
    }, 300);
    return () => clearTimeout(timer);
  }, [filtros.usuario_search]);

  // Agregar skill a seleccionados
  const agregarSkillSeleccionado = (skill) => {
    const existe = filtros.skills_seleccionados.find(s => s.ID_SKILL === skill.ID_SKILL);
    if (!existe) {
      const nuevosSkills = [...filtros.skills_seleccionados, skill];
      setFiltros({ 
        ...filtros, 
        skills_seleccionados: nuevosSkills,
        skill_search: '' // Limpiar búsqueda
      });
    }
  };

  // Remover skill de seleccionados
  const removerSkillSeleccionado = (skillId) => {
    const nuevosSkills = filtros.skills_seleccionados.filter(s => s.ID_SKILL !== skillId);
    setFiltros({ ...filtros, skills_seleccionados: nuevosSkills });
  };

  const toggleSkillFiltro = (skill) => {
    const existe = filtros.skills_seleccionados.find(s => s.ID_SKILL === skill.ID_SKILL);
    if (existe) {
      removerSkillSeleccionado(skill.ID_SKILL);
      return;
    }
    agregarSkillSeleccionado(skill);
  };

  // Agregar usuario a seleccionados
  const agregarUsuarioSeleccionado = (usuario) => {
    const existe = filtros.usuarios_seleccionados.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
    if (!existe) {
      const nuevosUsuarios = [...filtros.usuarios_seleccionados, usuario];
      setFiltros({ 
        ...filtros, 
        usuarios_seleccionados: nuevosUsuarios,
        usuario_search: '' // Limpiar búsqueda
      });
    }
  };

  // Remover usuario de seleccionados
  const removerUsuarioSeleccionado = (usuarioId) => {
    const nuevosUsuarios = filtros.usuarios_seleccionados.filter(u => u.ID_USUARIO !== usuarioId);
    setFiltros({ ...filtros, usuarios_seleccionados: nuevosUsuarios });
  };

  const toggleUsuarioFiltro = (usuario) => {
    const existe = filtros.usuarios_seleccionados.find(u => u.ID_USUARIO === usuario.ID_USUARIO);
    if (existe) {
      removerUsuarioSeleccionado(usuario.ID_USUARIO);
      return;
    }
    agregarUsuarioSeleccionado(usuario);
  };

  const buscarSkills = async (mostrarNotificacion = true) => {
    try {
      if (!filtros.id_empresa) {
        return toast.warning("Selecciona una empresa para buscar skills");
      }

      // Si hay skills seleccionados, buscar esos específicos
      if (filtros.skills_seleccionados.length > 0) {
        const ids = filtros.skills_seleccionados.map(s => s.ID_SKILL).join(',');
        const url = API_URLS.skills(filtros.db_key, filtros.id_empresa, { 
          ids_skill: ids,
          estado: filtros.estado,
          eliminado: filtros.eliminado
        });
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setSkills(data);
          setSeleccionados([]);
          setCurrentPage(1);
          if (mostrarNotificacion) toast.success(`Se encontraron ${data.length} skills`);
        } else {
          setSkills([]);
          if (mostrarNotificacion) toast.info("No se encontraron skills");
        }
        return;
      }

      // Si hay usuarios seleccionados, buscar sus skills
      if (filtros.usuarios_seleccionados.length > 0) {
        const ids = filtros.usuarios_seleccionados.map(u => u.ID_USUARIO).join(',');
        const url = API_URLS.skills(filtros.db_key, filtros.id_empresa, { 
          ids_usuario: ids,
          estado: filtros.estado,
          eliminado: filtros.eliminado
        });
        
        const res = await fetch(url);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          setSkills(data);
          setSeleccionados([]);
          setCurrentPage(1);
          if (mostrarNotificacion) toast.success(`Se encontraron ${data.length} skills de ${filtros.usuarios_seleccionados.length} usuarios`);
        } else {
          setSkills([]);
          if (mostrarNotificacion) toast.info("No se encontraron skills para los usuarios seleccionados");
        }
        return;
      }

      // Búsqueda normal por empresa
      const url = API_URLS.skills(filtros.db_key, filtros.id_empresa, {
        estado: filtros.estado,
        eliminado: filtros.eliminado
      });
      const res = await fetch(url);
      const data = await res.json();
      
      if (Array.isArray(data)) {
        setSkills(data);
        setSeleccionados([]);
        setCurrentPage(1);
        if (mostrarNotificacion) toast.success(`Se encontraron ${data.length} skills`);
      } else {
        setSkills([]);
        if (mostrarNotificacion) toast.error("Error al procesar la búsqueda");
      }
    } catch (error) {
      setSkills([]);
      toast.error("Error de conexión al consultar skills");
    }
  };

  // Cargar bots por empresa
  const cargarBotsPorEmpresa = useCallback(async (db_key, id_empresa) => {
    if (!db_key || !id_empresa) return;
    setLoadingBots(true);
    try {
      const res = await fetchWithAuth(API_URLS.botsEmpresa(db_key, id_empresa));
      if (res.ok) {
        const data = await res.json();
        setBots(Array.isArray(data) ? data : []);
      } else {
        const text = await res.text().catch(() => '');
        console.error('Error /api/bots-empresa:', res.status, text);
      }
    } catch (e) {
      console.error('Excepción /api/bots-empresa:', e);
    } finally {
      setLoadingBots(false);
    }
  }, []);

  // Cargar bots al cambiar a pestaña Bots si ya hay empresa seleccionada
  useEffect(() => {
    if (vistaActiva === 'bots' && filtros.id_empresa && bots.length === 0) {
      cargarBotsPorEmpresa(filtros.db_key, filtros.id_empresa);
    }
  }, [vistaActiva, filtros.id_empresa, filtros.db_key, bots.length, cargarBotsPorEmpresa]);

  // Manejar selección de empresa
  const handleEmpresaChange = (e) => {
    const selectedId = e.target.value;
    const empresaSeleccionada = empresas.find(emp => emp.ID_EMPRESA === parseInt(selectedId));
    
    setFiltros({
      ...filtros,
      id_empresa: selectedId,
      nombre_empresa: empresaSeleccionada ? empresaSeleccionada.NOMBRE : '',
      skill_search: '',
      skills_seleccionados: [],
      usuario_search: '',
      usuarios_seleccionados: [],
      bot_id: '',
    });
    
    setUsuarios([]);
    setSkillsLista([]);
    setSkills([]);
    setSeleccionados([]);
    setBots([]);
    
    if (selectedId) {
      cargarBotsPorEmpresa(filtros.db_key, selectedId);
    }
  };

  // Agregar/remover skill de los permisos del usuario
  const togglePermisoSkill = async (idSkill, accion) => {
    if (filtros.usuarios_seleccionados.length === 0) {
      return toast.warning("Selecciona al menos un usuario para modificar permisos");
    }

    try {
      const promesas = filtros.usuarios_seleccionados.map(usuario => {
        const url = accion === 'agregar' 
          ? API_URLS.permisoUsuario()
          : API_URLS.permisoUsuarioDelete(usuario.ID_USUARIO, idSkill);
        
        const method = accion === 'agregar' ? 'POST' : 'DELETE';

        return fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            db_key: filtros.db_key,
            id_usuario: usuario.ID_USUARIO,
            id_skill: idSkill
          })
        });
      });

      const resultados = await Promise.all(promesas);
      const exitosos = resultados.filter(r => r.ok).length;

      if (exitosos > 0) {
        toast.success(
          accion === 'agregar' 
            ? `Permiso agregado a ${exitosos} usuarios` 
            : `Permiso eliminado de ${exitosos} usuarios`
        );
        buscarSkills(false);
      }
    } catch (error) {
      toast.error("Error de conexión al modificar permisos");
    }
  };

  const formatDias = (bin) => {
    if (!bin) return <span className="badge-danger">Sin horario</span>;
    return bin.split('').map((v, i) => v === '1' ? diasLetras[i] : ' - ').join(' ');
  };

  // Logica de Ordenamiento
  const solicitarOrden = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Agrupar skills por ID_SKILL (una fila por skill con sus horarios anidados)
  const skillsAgrupados = useMemo(() => {
    const map = new Map();
    skills.forEach(row => {
      if (!map.has(row.ID_SKILL)) {
        map.set(row.ID_SKILL, {
          ID_SKILL: row.ID_SKILL,
          NOMBRE_SKILL: row.NOMBRE_SKILL,
          NOMBRE_EMPRESA: row.NOMBRE_EMPRESA,
          MENSAJE: row.MENSAJE,
          DB_VISUAL: row.DB_VISUAL,
          horarios: []
        });
      }
      if (row.ID_HORARIO_SKILL) {
        map.get(row.ID_SKILL).horarios.push({
          ID_HORARIO_SKILL: row.ID_HORARIO_SKILL,
          DESDE: row.DESDE,
          HASTA: row.HASTA,
          DIAS: row.DIAS,
          DESDE_GUATE: row.DESDE_GUATE,
          HASTA_GUATE: row.HASTA_GUATE,
          CREADO_POR: row.CREADO_POR,
          CREADO_EL: row.CREADO_EL,
          MODIFICADO_POR: row.MODIFICADO_POR,
          MODIFICADO_EL: row.MODIFICADO_EL
        });
      }
    });
    let grupos = Array.from(map.values());
    if (sortConfig.key === 'NOMBRE_SKILL' || sortConfig.key === 'ID_SKILL') {
      grupos.sort((a, b) => {
        let aVal = a[sortConfig.key] || '';
        let bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return grupos;
  }, [skills, sortConfig]);

  // Logica de Paginacion (por skill agrupado)
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const skillsPaginados = skillsAgrupados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(skillsAgrupados.length / itemsPerPage);

  const cambiarPagina = (nuevaPagina) => {
    setCurrentPage(nuevaPagina);
    const tablaElement = document.querySelector('.table-wrapper');
    if (tablaElement) {
      tablaElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const abrirModalFormulario = (skill, modo) => {
    let diasOriginales = [true, true, true, true, true, false, false];
    if (skill.DIAS && modo === 'edit') {
      diasOriginales = skill.DIAS.split('').map(d => d === '1');
    }

    setModalForm({ 
      show: true, 
      mode: modo, 
      skill: skill,
      desde: modo === 'edit' ? (skill.DESDE_GUATE || '08:00:00') : '08:00:00',
      hasta: modo === 'edit' ? (skill.HASTA_GUATE || '17:00:00') : '17:00:00',
      dias: diasOriginales
    });
  };

  const procesarFormularioHorario = async () => {
    try {
      const diasBin = modalForm.dias.map(d => d ? '1' : '0').join('');
      const url = modalForm.mode === 'add' 
        ? API_URLS.horarioCreate()
        : API_URLS.horario(filtros.db_key, modalForm.skill.ID_HORARIO_SKILL);
      const method = modalForm.mode === 'add' ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method, 
        body: JSON.stringify({
          db_key: filtros.db_key, 
          id_skill: modalForm.skill.ID_SKILL,
          desde: modalForm.desde, 
          hasta: modalForm.hasta, 
          dias: diasBin
        })
      });

      if (res.ok) {
        setModalForm({ ...modalForm, show: false });
        buscarSkills(false); 
        toast.success(modalForm.mode === 'add' ? "Horario agregado correctamente" : "Horario actualizado");
      }
    } catch (e) { 
      toast.error("Error al guardar horario"); 
    }
  };

  const confirmarEliminar = async () => {
    const { id, type } = modalConfirm;
    try {
      if (type === 'horario') {
        const res = await fetchWithAuth(API_URLS.horario(filtros.db_key, id), { method: 'DELETE' });
        buscarSkills(false);
        toast.success("Horario eliminado permanentemente");
      } else if (type === 'cola') {
        await fetchWithAuth(API_URLS.programado(id), { method: 'DELETE' });
        cargarProgramados();
        toast.success("Programacion anulada de la cola");
      }
      setModalConfirm({ show: false, id: null, type: '' });
    } catch (e) { 
      toast.error("Error procesando eliminacion"); 
    }
  };

  const toggleSeleccion = (grupo) => {
    const existe = seleccionados.find(s => s.ID_SKILL === grupo.ID_SKILL);
    if (existe) {
      setSeleccionados(seleccionados.filter(s => s.ID_SKILL !== grupo.ID_SKILL));
      const newData = {...edicionMasivaData};
      grupo.horarios.forEach(h => delete newData[h.ID_HORARIO_SKILL]);
      setEdicionMasivaData(newData);
    } else {
      setSeleccionados([...seleccionados, grupo]);
      const newData = {...edicionMasivaData};
      grupo.horarios.forEach(h => {
        newData[h.ID_HORARIO_SKILL] = {
          desde: h.DESDE_GUATE || '08:00:00',
          hasta: h.HASTA_GUATE || '17:00:00',
          dias: h.DIAS ? h.DIAS.split('').map(d => d === '1') : [true, true, true, true, true, false, false]
        };
      });
      setEdicionMasivaData(newData);
    }
  };

  const toggleSeleccionHorario = (grupo, horario) => {
    const existeGrupo = seleccionados.find(s => s.ID_SKILL === grupo.ID_SKILL);
    const horarioSeleccionado = existeGrupo?.horarios?.some(h => h.ID_HORARIO_SKILL === horario.ID_HORARIO_SKILL);

    if (horarioSeleccionado) {
      const nuevosSeleccionados = seleccionados
        .map(s => {
          if (s.ID_SKILL !== grupo.ID_SKILL) return s;
          return {
            ...s,
            horarios: s.horarios.filter(h => h.ID_HORARIO_SKILL !== horario.ID_HORARIO_SKILL)
          };
        })
        .filter(s => s.horarios.length > 0);

      const newData = { ...edicionMasivaData };
      delete newData[horario.ID_HORARIO_SKILL];
      setSeleccionados(nuevosSeleccionados);
      setEdicionMasivaData(newData);
      return;
    }

    const horarioData = {
      desde: horario.DESDE_GUATE || '08:00:00',
      hasta: horario.HASTA_GUATE || '17:00:00',
      dias: horario.DIAS ? horario.DIAS.split('').map(d => d === '1') : [true, true, true, true, true, false, false]
    };

    if (existeGrupo) {
      setSeleccionados(seleccionados.map(s => (
        s.ID_SKILL === grupo.ID_SKILL
          ? { ...s, horarios: [...s.horarios, horario] }
          : s
      )));
    } else {
      setSeleccionados([...seleccionados, { ...grupo, horarios: [horario] }]);
    }

    setEdicionMasivaData({
      ...edicionMasivaData,
      [horario.ID_HORARIO_SKILL]: horarioData
    });
  };
  
  const seleccionarTodos = () => {
    if (seleccionados.length === skillsPaginados.length) {
      setSeleccionados([]);
      setEdicionMasivaData({});
    } else {
      setSeleccionados(skillsPaginados.map(s => ({...s})));
      const newData = {};
      skillsPaginados.forEach(grupo => {
        grupo.horarios.forEach(h => {
          newData[h.ID_HORARIO_SKILL] = {
            desde: h.DESDE_GUATE || '08:00:00',
            hasta: h.HASTA_GUATE || '17:00:00',
            dias: h.DIAS ? h.DIAS.split('').map(d => d === '1') : [true, true, true, true, true, false, false]
          };
        });
      });
      setEdicionMasivaData(newData);
    }
  };
  
  const actualizarHorarioMasivo = (idHorarioSkill, campo, valor) => {
    setEdicionMasivaData(prev => ({
      ...prev,
      [idHorarioSkill]: {
        ...prev[idHorarioSkill],
        [campo]: valor
      }
    }));
  };
  
  const toggleDiaMasivo = (idHorarioSkill, index) => {
    setEdicionMasivaData(prev => ({
      ...prev,
      [idHorarioSkill]: {
        ...prev[idHorarioSkill],
        dias: prev[idHorarioSkill].dias.map((d, i) => i === index ? !d : d)
      }
    }));
  };
  
  const guardarEdicionMasiva = async () => {
    if (seleccionados.length === 0) {
      toast.warning("Selecciona al menos un skill");
      return;
    }
    
    // Recolectar todos los horarios seleccionados de todos los skills
    const horariosSeleccionados = [];
    seleccionados.forEach(s => {
      if (s.horarios && s.horarios.length > 0) {
        s.horarios.forEach(h => {
          horariosSeleccionados.push({ ...h, parentSkill: s });
        });
      }
    });
    
    if (horariosSeleccionados.length === 0) {
      toast.warning("Selecciona al menos un horario para editar");
      return;
    }
    
    setGuardandoMasivo(true);
    try {
      const updates = horariosSeleccionados.map(h => {
        const data = edicionMasivaData[h.ID_HORARIO_SKILL] || {};
        const diasBin = (data.dias || [true, true, true, true, true, false, false])
          .map(d => d ? '1' : '0').join('');
        return {
          db_key: filtros.db_key,
          id_horario_skill: h.ID_HORARIO_SKILL,
          id_skill: h.parentSkill.ID_SKILL,
          desde: data.desde || h.DESDE_GUATE,
          hasta: data.hasta || h.HASTA_GUATE,
          dias: diasBin
        };
      });
      
      const res = await fetchWithAuth(API_URLS.horarioUpdateMasivo(), {
        method: 'PUT',
        body: JSON.stringify({ updates })
      });
      
      const result = await res.json();
      
      if (result.success) {
        toast.success(`${result.actualizados || updates.length} horarios actualizados correctamente`);
        setModoEdicionMasiva(false);
        buscarSkills(false);
      } else {
        toast.error(result.error || "Error al actualizar horarios");
      }
    } catch (e) {
      console.error("Error en edición masiva:", e);
      toast.error("Error al guardar cambios masivos");
    } finally {
      setGuardandoMasivo(false);
    }
  };

  // ── Helpers de fecha para defaults ──
  const getNowLocal = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
  };
  const get0600Local = () => {
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T06:00`;
  };

  const abrirProgramarModal = () => {
    const ahora = getNowLocal();
    const reversion = get0600Local();
    // Inicializar un formulario individual por horario SOLO para los seleccionados
    const inicial = {};
    seleccionados.forEach(grupo => {
      // Solo incluir los horarios que están seleccionados (en grupo.horarios)
      if (grupo.horarios && grupo.horarios.length > 0) {
        grupo.horarios.forEach(h => {
          const key = grupo.ID_SKILL + '_' + h.ID_HORARIO_SKILL;
          inicial[key] = {
            nuevo_desde: h.DESDE_GUATE || '08:00:00',
            nuevo_hasta: h.HASTA_GUATE || '17:00:00',
            dias: h.DIAS ? h.DIAS.split('').map(d => d === '1') : [true, true, true, true, true, false, false],
            fecha_aplicacion: ahora,
            fecha_reversion: reversion
          };
        });
      }
    });
    
    // Si no hay horarios seleccionados, mostrar advertencia
    if (Object.keys(inicial).length === 0) {
      return toast.warning("Selecciona al menos un horario específico para programar");
    }
    setFormProgramar(inicial);
    // Inicializar mensajes programados por skill
    const mensajesInit = {};
    seleccionados.forEach(grupo => {
      mensajesInit[grupo.ID_SKILL] = {
        habilitado: false,
        nuevo_mensaje: grupo.MENSAJE || '',
        fecha_aplicacion: ahora,
        fecha_reversion: reversion
      };
    });
    setFormMensajesPorSkill(mensajesInit);
    setShowProgramarModal(true);
  };

  // ── Copiar una fecha/campo a todos los horarios ──
  const copiarATodos = (campo, valor) => {
    setFormProgramar(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], [campo]: valor }; });
      return next;
    });
    if (campo === 'fecha_aplicacion' || campo === 'fecha_reversion') {
      setFormMensajesPorSkill(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { next[k] = { ...next[k], [campo]: valor }; });
        return next;
      });
      // También copiar a horarios temporales de todos los skills seleccionados
      setHorariosTemporales(prev => {
        const next = { ...prev };
        seleccionados.forEach(grupo => {
          const skillId = grupo.ID_SKILL;
          const skillTemp = next[skillId] || {};
          const actualizados = {};
          Object.keys(skillTemp).forEach(temporalId => {
            actualizados[temporalId] = {
              ...skillTemp[temporalId],
              [campo]: valor
            };
          });
          next[skillId] = actualizados;
        });
        return next;
      });
    }
    toast.success('Fecha copiada a todos los horarios');
  };

  const actualizarFormProgramar = (key, campo, valor) => {
    setFormProgramar(prev => ({
      ...prev,
      [key]: { ...prev[key], [campo]: valor }
    }));
  };

  const toggleDiaProgramar = (key, index) => {
    setFormProgramar(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        dias: prev[key].dias.map((d, i) => i === index ? !d : d)
      }
    }));
  };

  // ── FUNCIONES PARA HORARIOS TEMPORALES ──
  const agregarHorarioTemporal = (skillId) => {
    const nuevoId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    setHorariosTemporales(prev => ({
      ...prev,
      [skillId]: {
        ...(prev[skillId] || {}),
        [nuevoId]: {
          id: nuevoId,
          nuevo_desde: '08:00:00',
          nuevo_hasta: '17:00:00',
          dias: [false, false, false, false, false, false, false], // Sin días seleccionados por defecto
          fecha_aplicacion: '',
          fecha_reversion: ''
        }
      }
    }));
    setContadorTemporal(c => c + 1);
  };

  const eliminarHorarioTemporal = (skillId, temporalId) => {
    setHorariosTemporales(prev => {
      const skillTemp = { ...prev[skillId] };
      delete skillTemp[temporalId];
      return {
        ...prev,
        [skillId]: skillTemp
      };
    });
  };

  const actualizarHorarioTemporal = (skillId, temporalId, campo, valor) => {
    setHorariosTemporales(prev => ({
      ...prev,
      [skillId]: {
        ...prev[skillId],
        [temporalId]: {
          ...prev[skillId][temporalId],
          [campo]: valor
        }
      }
    }));
  };

  const toggleDiaTemporal = (skillId, temporalId, index) => {
    setHorariosTemporales(prev => {
      const temporal = prev[skillId][temporalId];
      const nuevosDias = [...temporal.dias];
      nuevosDias[index] = !nuevosDias[index];
      return {
        ...prev,
        [skillId]: {
          ...prev[skillId],
          [temporalId]: {
            ...temporal,
            dias: nuevosDias
          }
        }
      };
    });
  };

  // ── Copiar fecha a todos los horarios temporales de un skill ──
  const copiarATodosTemporales = (skillId, campo, valor) => {
    if (!valor) return;
    setHorariosTemporales(prev => {
      const skillTemp = prev[skillId] || {};
      const actualizados = {};
      Object.keys(skillTemp).forEach(temporalId => {
        actualizados[temporalId] = {
          ...skillTemp[temporalId],
          [campo]: valor
        };
      });
      return {
        ...prev,
        [skillId]: actualizados
      };
    });
    toast.success(`Fecha ${campo === 'fecha_aplicacion' ? 'de aplicación' : 'de reversión'} aplicada a todos los temporales`);
  };

  const guardarProgramacionMasiva = async () => {
    if (seleccionados.length === 0) return toast.warning("Selecciona al menos un skill");

    // Construir items iterando sobre cada horario de cada grupo
    const items = [];
    for (const grupo of seleccionados) {
      if (grupo.horarios && grupo.horarios.length > 0) {
        for (const h of grupo.horarios) {
          const key = grupo.ID_SKILL + '_' + h.ID_HORARIO_SKILL;
          const f = formProgramar[key];
          if (!f || !f.fecha_aplicacion || !f.fecha_reversion) {
            return toast.warning(`Faltan fechas en horario del skill: ${grupo.NOMBRE_SKILL}`);
          }
          if (new Date(f.fecha_reversion) <= new Date(f.fecha_aplicacion)) {
            return toast.error(`La fecha de reversión debe ser posterior en: ${grupo.NOMBRE_SKILL}`);
          }
          items.push({
            db_key: filtros.db_key,
            id_skill: grupo.ID_SKILL,
            id_horario_skill: h.ID_HORARIO_SKILL,
            nombre_skill: grupo.NOMBRE_SKILL,
            nombre_empresa: filtros.nombre_empresa || grupo.NOMBRE_EMPRESA || '',
            original_desde: h.DESDE,
            original_hasta: h.HASTA,
            original_dias: h.DIAS,
            nuevo_desde: f.nuevo_desde,
            nuevo_hasta: f.nuevo_hasta,
            nuevos_dias: f.dias.map(d => d ? '1' : '0').join(''),
            fecha_aplicacion: f.fecha_aplicacion.replace('T', ' ') + ':00',
            fecha_reversion: f.fecha_reversion.replace('T', ' ') + ':00'
          });
        }
      }
    }
    // Agregar horarios temporales nuevos
    for (const grupo of seleccionados) {
      const temporalesSkill = horariosTemporales[grupo.ID_SKILL] || {};
      for (const temporalId in temporalesSkill) {
        const t = temporalesSkill[temporalId];
        if (!t.fecha_aplicacion || !t.fecha_reversion) {
          return toast.warning(`Faltan fechas en horario temporal de: ${grupo.NOMBRE_SKILL}`);
        }
        if (new Date(t.fecha_reversion) <= new Date(t.fecha_aplicacion)) {
          return toast.error(`La fecha de reversión debe ser posterior en horario temporal de: ${grupo.NOMBRE_SKILL}`);
        }
        items.push({
          db_key: filtros.db_key,
          id_skill: grupo.ID_SKILL,
          id_horario_skill: null, // null indica que es un horario temporal nuevo
          nombre_skill: grupo.NOMBRE_SKILL,
          nombre_empresa: filtros.nombre_empresa || grupo.NOMBRE_EMPRESA || '',
          original_desde: null,
          original_hasta: null,
          original_dias: null,
          nuevo_desde: t.nuevo_desde,
          nuevo_hasta: t.nuevo_hasta,
          nuevos_dias: t.dias.map(d => d ? '1' : '0').join(''),
          fecha_aplicacion: t.fecha_aplicacion.replace('T', ' ') + ':00',
          fecha_reversion: t.fecha_reversion.replace('T', ' ') + ':00'
        });
      }
    }

    if (items.length === 0) return toast.warning("No hay horarios para programar en los skills seleccionados");

    // Recolectar mensajes habilitados por skill
    const itemsMensajes = [];
    seleccionados.forEach(grupo => {
      const mf = formMensajesPorSkill[grupo.ID_SKILL];
      if (mf && mf.habilitado) {
        if (!mf.fecha_aplicacion) {
          toast.warning(`Falta fecha de aplicación del mensaje en: ${grupo.NOMBRE_SKILL}`);
          return;
        }
        itemsMensajes.push({
          db_key: filtros.db_key,
          id_skill: grupo.ID_SKILL,
          nombre_skill: grupo.NOMBRE_SKILL,
          nombre_empresa: filtros.nombre_empresa || grupo.NOMBRE_EMPRESA || '',
          original_mensaje: grupo.MENSAJE || null,
          nuevo_mensaje: mf.nuevo_mensaje,
          fecha_aplicacion: mf.fecha_aplicacion.replace('T', ' ') + ':00',
          fecha_reversion: mf.fecha_reversion ? mf.fecha_reversion.replace('T', ' ') + ':00' : null
        });
      }
    });

    try {
      const promesas = [];
      if (items.length > 0) {
        promesas.push(fetchWithAuth(API_URLS.programar(), {
          method: 'POST',
          body: JSON.stringify({ items })
        }));
      }
      if (itemsMensajes.length > 0) {
        promesas.push(fetchWithAuth(API_URLS.programarMensajes(), {
          method: 'POST',
          body: JSON.stringify({ items: itemsMensajes })
        }));
      }
      await Promise.all(promesas);
      const totalMsg = [];
      if (items.length > 0) totalMsg.push(`${items.length} horario(s)`);
      if (itemsMensajes.length > 0) totalMsg.push(`${itemsMensajes.length} mensaje(s)`);
      toast.success(`Programado: ${totalMsg.join(' y ')}`);
      setSeleccionados([]);
      setShowProgramarModal(false);
      cargarProgramados();
      setTabActiva('cola');
    } catch (e) {
      toast.error("Error al guardar programacion masiva");
    }
  };

  // ── FUNCIONES PARA MENSAJES ──
  const abrirEditarMensaje = (skill) => {
    setSkillEditarMensaje(skill);
    setMensajeEditar(skill.MENSAJE || '');
    setShowEditarMensajeModal(true);
  };

  const guardarMensajeDirecto = async () => {
    if (!skillEditarMensaje) return;
    setGuardandoMensaje(true);
    try {
      const res = await fetchWithAuth(API_URLS.skillMensaje(), {
        method: 'PUT',
        body: JSON.stringify({
          db_key: filtros.db_key,
          id_skill: skillEditarMensaje.ID_SKILL,
          mensaje: mensajeEditar
        })
      });
      
      if (res.ok) {
        toast.success("Mensaje actualizado correctamente");
        setShowEditarMensajeModal(false);
        buscarSkills(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al actualizar mensaje");
      }
    } catch (e) {
      toast.error("Error de conexión al actualizar mensaje");
    } finally {
      setGuardandoMensaje(false);
    }
  };

  const abrirProgramarMensaje = (skill) => {
    setSkillEditarMensaje(skill);
    setFormProgramarMensaje({
      nuevo_mensaje: skill.MENSAJE || '',
      fecha_aplicacion: '',
      fecha_reversion: ''
    });
    setShowProgramarMensajeModal(true);
  };

  const guardarProgramarMensaje = async () => {
    if (!skillEditarMensaje) return;
    if (!formProgramarMensaje.fecha_aplicacion) {
      return toast.warning("La fecha de aplicación es requerida");
    }
    
    const item = {
      db_key: filtros.db_key,
      id_skill: skillEditarMensaje.ID_SKILL,
      nombre_skill: skillEditarMensaje.NOMBRE_SKILL,
      nombre_empresa: filtros.nombre_empresa || skillEditarMensaje.NOMBRE_EMPRESA || '',
      original_mensaje: skillEditarMensaje.MENSAJE || null,
      nuevo_mensaje: formProgramarMensaje.nuevo_mensaje,
      fecha_aplicacion: formProgramarMensaje.fecha_aplicacion.replace('T', ' ') + ':00',
      fecha_reversion: formProgramarMensaje.fecha_reversion 
        ? formProgramarMensaje.fecha_reversion.replace('T', ' ') + ':00' 
        : null
    };

    try {
      const res = await fetchWithAuth(API_URLS.programarMensajes(), {
        method: 'POST',
        body: JSON.stringify({ items: [item] })
      });

      if (res.ok) {
        toast.success("Mensaje programado correctamente");
        setShowProgramarMensajeModal(false);
      } else {
        const data = await res.json();
        toast.error(data.error || "Error al programar mensaje");
      }
    } catch (e) {
      toast.error("Error de conexión al programar mensaje");
    }
  };

  const limpiarFiltros = () => {
    setFiltros({
      db_key: filtros.db_key,
      id_empresa: '',
      nombre_empresa: '',
      skill_search: '',
      skills_seleccionados: [],
      usuario_search: '',
      usuarios_seleccionados: [],
      estado: '',
      eliminado: '',
      bot_id: '',
    });
    setSkills([]);
    setSeleccionados([]);
    setUsuarios([]);
    setSkillsLista([]);
    setBots([]);
    setCurrentPage(1);
  };

  return (
    <div id="modulo-skills-root" className="dashboard">
      {/* BARRA UNIFICADA: logo | filtros | acciones */}
      <div className="sk-topbar">
        {/* Logo */}
        <div className="sk-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="sk-topbar-logo-img" />
        </div>
        <div className="sk-topbar-divider" />

        {/* Filtros inline — condicionales según vista */}
        <div className="sk-topbar-filters">
          {/* Base de Datos (siempre) */}
          <div className="sk-topbar-field">
            <span className="sk-topbar-label">Base de Datos</span>
            <select className="sk-topbar-select" value={filtros.db_key} onChange={e => setFiltros({...filtros, db_key: e.target.value})}>
              {Object.entries(DB_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          {/* Empresa (siempre) */}
          <div className="sk-topbar-field">
            <span className="sk-topbar-label">Empresa {loading.empresas && '⌛'}</span>
            <select className="sk-topbar-select" value={filtros.id_empresa} onChange={handleEmpresaChange}>
              <option value="">Seleccionar...</option>
              {empresas.map(emp => (
                <option key={emp.ID_EMPRESA} value={emp.ID_EMPRESA}>{emp.NOMBRE}</option>
              ))}
            </select>
          </div>

          {/* ── FILTROS EXCLUSIVOS DE SKILLS ── */}
          {vistaActiva === 'skills' && (<>
            {/* Filtro Estado */}
            <div className="sk-topbar-field">
              <span className="sk-topbar-label">Estado</span>
              <select 
                className="sk-topbar-select" 
                value={filtros.estado} 
                onChange={e => setFiltros({...filtros, estado: e.target.value})}
              >
                <option value="">Todos</option>
                <option value="1">Activo</option>
                <option value="0">Inactivo</option>
              </select>
            </div>

            {/* Filtro Eliminado */}
            <div className="sk-topbar-field">
              <span className="sk-topbar-label">Eliminado</span>
              <select 
                className="sk-topbar-select" 
                value={filtros.eliminado} 
                onChange={e => setFiltros({...filtros, eliminado: e.target.value})}
              >
                <option value="">No Eliminados</option>
                <option value="1">Eliminados</option>
                <option value="0">No Eliminados</option>
              </select>
            </div>

            {/* Skills multi-select */}
            <div className="sk-topbar-field sk-topbar-field-wide">
              <span className="sk-topbar-label">
                Skills {loading.skills && '⌛'}
                {filtros.skills_seleccionados.length > 0 && <span className="sk-topbar-badge">{filtros.skills_seleccionados.length}</span>}
              </span>
              <div className="multi-select-container" ref={skillInputRef}>
                <button
                  type="button"
                  className="sk-filter-trigger"
                  onClick={abrirSkillDropdown}
                  disabled={!filtros.id_empresa}
                >
                  {filtros.skills_seleccionados.length === 0
                    ? 'Seleccionar skills...'
                    : `${filtros.skills_seleccionados.length} skill${filtros.skills_seleccionados.length !== 1 ? 's' : ''} seleccionado${filtros.skills_seleccionados.length !== 1 ? 's' : ''}`}
                  <span className="sk-filter-arrow">▼</span>
                </button>
                {showSkillDropdown && filtros.id_empresa && (
                  <div className="sk-filter-dropdown" onScroll={handleSkillScroll}>
                    <div className="sk-filter-dropdown-header">
                      <input
                        className="sk-filter-search"
                        type="text"
                        placeholder="🔍 Buscar skill..."
                        value={filtros.skill_search}
                        onChange={handleSkillSearch}
                        autoFocus
                      />
                      <div className="sk-filter-actions">
                        <button
                          type="button"
                          className="sk-filter-action-btn"
                          onClick={() => setFiltros({ ...filtros, skills_seleccionados: skillsLista })}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className="sk-filter-action-btn"
                          onClick={() => setFiltros({ ...filtros, skills_seleccionados: [] })}
                        >
                          Ninguno
                        </button>
                      </div>
                    </div>
                    <div className="sk-filter-list">
                    {skillsLista
                      .filter(s => filtros.skill_search === '' || s.NOMBRE_SKILL.toLowerCase().includes(filtros.skill_search.toLowerCase()))
                      .sort((a, b) => {
                        const aSel = filtros.skills_seleccionados.some(sel => sel.ID_SKILL === a.ID_SKILL);
                        const bSel = filtros.skills_seleccionados.some(sel => sel.ID_SKILL === b.ID_SKILL);
                        return Number(bSel) - Number(aSel);
                      })
                      .map(skill => {
                      const seleccionado = !!filtros.skills_seleccionados.find(sel => sel.ID_SKILL === skill.ID_SKILL);
                      return (
                      <label key={skill.ID_SKILL} className="sk-filter-item">
                        <input type="checkbox" checked={seleccionado} onChange={() => toggleSkillFiltro(skill)} />
                        <span className="sk-filter-item-name">{skill.NOMBRE_SKILL}</span>
                      </label>
                      );
                    })}
                    {paginacionSkills.page < paginacionSkills.totalPages && <div className="sk-filter-empty">Cargando más...</div>}
                    {skillsLista.filter(s => filtros.skill_search === '' || s.NOMBRE_SKILL.toLowerCase().includes(filtros.skill_search.toLowerCase())).length === 0 && <div className="sk-filter-empty">No hay skills disponibles</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Usuarios multi-select */}
            <div className="sk-topbar-field sk-topbar-field-wide">
              <span className="sk-topbar-label">
                Usuarios {loading.usuarios && '⌛'}
                {filtros.usuarios_seleccionados.length > 0 && <span className="sk-topbar-badge">{filtros.usuarios_seleccionados.length}</span>}
              </span>
              <div className="multi-select-container" ref={usuarioInputRef}>
                <button
                  type="button"
                  className="sk-filter-trigger"
                  onClick={abrirUsuarioDropdown}
                  disabled={!filtros.id_empresa}
                >
                  {filtros.usuarios_seleccionados.length === 0
                    ? 'Seleccionar usuarios...'
                    : `${filtros.usuarios_seleccionados.length} usuario${filtros.usuarios_seleccionados.length !== 1 ? 's' : ''} seleccionado${filtros.usuarios_seleccionados.length !== 1 ? 's' : ''}`}
                  <span className="sk-filter-arrow">▼</span>
                </button>
                {showUsuarioDropdown && filtros.id_empresa && (
                  <div className="sk-filter-dropdown" onScroll={handleUsuarioScroll}>
                    <div className="sk-filter-dropdown-header">
                      <input
                        className="sk-filter-search"
                        type="text"
                        placeholder="🔍 Buscar usuario..."
                        value={filtros.usuario_search}
                        onChange={handleUsuarioSearch}
                        autoFocus
                      />
                      <div className="sk-filter-actions">
                        <button
                          type="button"
                          className="sk-filter-action-btn"
                          onClick={() => setFiltros({ ...filtros, usuarios_seleccionados: usuarios })}
                        >
                          Todos
                        </button>
                        <button
                          type="button"
                          className="sk-filter-action-btn"
                          onClick={() => setFiltros({ ...filtros, usuarios_seleccionados: [] })}
                        >
                          Ninguno
                        </button>
                      </div>
                    </div>
                    <div className="sk-filter-list">
                    {usuarios
                      .filter(u => filtros.usuario_search === '' || u.NOMBRE_USUARIO.toLowerCase().includes(filtros.usuario_search.toLowerCase()))
                      .sort((a, b) => {
                        const aSel = filtros.usuarios_seleccionados.some(sel => sel.ID_USUARIO === a.ID_USUARIO);
                        const bSel = filtros.usuarios_seleccionados.some(sel => sel.ID_USUARIO === b.ID_USUARIO);
                        return Number(bSel) - Number(aSel);
                      })
                      .map(usuario => {
                      const seleccionado = !!filtros.usuarios_seleccionados.find(sel => sel.ID_USUARIO === usuario.ID_USUARIO);
                      return (
                      <label key={usuario.ID_USUARIO} className="sk-filter-item">
                        <input type="checkbox" checked={seleccionado} onChange={() => toggleUsuarioFiltro(usuario)} />
                        <span className="sk-filter-item-name">{usuario.NOMBRE_USUARIO}</span>
                      </label>
                      );
                    })}
                    {paginacionUsuarios.page < paginacionUsuarios.totalPages && <div className="sk-filter-empty">Cargando más...</div>}
                    {usuarios.filter(u => filtros.usuario_search === '' || u.NOMBRE_USUARIO.toLowerCase().includes(filtros.usuario_search.toLowerCase())).length === 0 && <div className="sk-filter-empty">No hay usuarios disponibles</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>)}

          {/* ── FILTRO EXCLUSIVO DE BOTS ── */}
          {vistaActiva === 'bots' && (
            <div className="sk-topbar-field">
              <span className="sk-topbar-label">Bot {loadingBots && '⌛'}</span>
              <select
                className="sk-topbar-select"
                value={filtros.bot_id}
                onChange={e => setFiltros({ ...filtros, bot_id: e.target.value })}
                disabled={!filtros.id_empresa}
              >
                <option value="">Todos los bots</option>
                {bots.filter(b => b.ID_BOT != null).map(b => (
                  <option key={b.ID_BOT} value={b.ID_BOT}>{b.NOMBRE_BOT || b.DESCRIPCION || `Bot #${b.ID_BOT}`}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="sk-topbar-divider" />

        {/* Acciones */}
        {vistaActiva === 'skills' && (
          <button className="sk-topbar-btn-buscar" onClick={buscarSkills}>🔍 Buscar</button>
        )}
        <button className="sk-topbar-btn-limpiar" onClick={limpiarFiltros} title="Limpiar filtros">🧹</button>
      </div>

      {/* ── SIDEBAR LATERAL + CONTENIDO ── */}
      <div className="sk-body">
        <div className="sk-sidebar">
          <p className="sk-sidebar-title">Módulo</p>
          {[
            {
              id: 'skills',
              label: 'Horarios Skills',
              desc: 'Gestión de horarios por skill',
              icon: (
                <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <polyline points="12 6 12 12 16 14"/>
                </svg>
              )
            },
            {
              id: 'bots',
              label: 'Horarios Bots',
              desc: 'Gestión de horarios por bot',
              icon: (
                <svg className="nav-icon-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="10" rx="2"/>
                  <circle cx="12" cy="5" r="2"/>
                  <path d="M12 7v4"/>
                  <line x1="8" y1="16" x2="8" y2="16"/>
                  <line x1="16" y1="16" x2="16" y2="16"/>
                </svg>
              )
            },
          ].map(item => (
            <button
              key={item.id}
              className={`sk-sidebar-item ${vistaActiva === item.id ? 'active' : ''}`}
              onClick={() => setVistaActiva(item.id)}
            >
              <span className="sk-sidebar-icon">{item.icon}</span>
              <span className="sk-sidebar-labels">
                <span className="sk-sidebar-label">{item.label}</span>
                <span className="sk-sidebar-desc">{item.desc}</span>
              </span>
              {vistaActiva === item.id && <span className="sk-sidebar-arrow">›</span>}
            </button>
          ))}
        </div>
        <div className="sk-content">
          {vistaActiva === 'skills' && (<>

      {/* PANTALLA DE BIENVENIDA - solo cuando no hay resultados */}
      {skills.length === 0 && (
        <div className="sk-welcome-screen">
          <div className="sk-welcome-card">
            <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="sk-welcome-logo" />
            <p className="sk-welcome-text">Selecciona una empresa y presiona <strong>Buscar</strong> para ver los skills</p>
          </div>
        </div>
      )}

      {/* Sección de resultados */}
      {skills.length > 0 && (
        <section className="card animate-fade full-width-section">
          <div className="card-header">
            <h2>
              Skills
              {filtros.usuarios_seleccionados.length > 0 && (
                <span className="user-badge">
                  {filtros.usuarios_seleccionados.length} usuarios
                </span>
              )}
              {filtros.skills_seleccionados.length > 0 && (
                <span className="skill-badge">
                  {filtros.skills_seleccionados.length} skills filtrados
                </span>
              )}
            </h2>
            {seleccionados.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button 
                  className="btn-secondary btn-sm" 
                  onClick={seleccionarTodos}
                >
                  {seleccionados.length === skillsPaginados.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </button>
                {seleccionados.length > 0 && (
                  <button 
                    className="btn-primary btn-sm" 
                    onClick={() => setModoEdicionMasiva(!modoEdicionMasiva)}
                  >
                    {modoEdicionMasiva ? 'Ocultar edición' : 'Editar horarios'}
                  </button>
                )}
                {(() => {
                  const totalHorariosSeleccionados = seleccionados.reduce((acc, s) => acc + (s.horarios?.length || 0), 0);
                  return (
                    <button 
                      className="btn-main btn-sm" 
                      onClick={abrirProgramarModal}
                      disabled={totalHorariosSeleccionados === 0}
                      title={totalHorariosSeleccionados === 0 ? "Selecciona horarios individuales para programar" : `Programar ${totalHorariosSeleccionados} horario(s)`}
                    >
                      Programar {totalHorariosSeleccionados > 0 && <span className="badge-count">{totalHorariosSeleccionados}</span>} horario(s)
                    </button>
                  );
                })()}
              </div>
            )}
          </div>
          <div className="table-wrapper">
            <table className="table-modern">
              <thead>
                <tr>
                  <th width="34"></th>
                  <th width="50">Sel.</th>
                  <th className="sortable" onClick={() => solicitarOrden('ID_SKILL')}>
                    ID {sortConfig.key==='ID_SKILL' && (sortConfig.direction==='asc' ? '▲' : '▼')}
                  </th>
                  <th className="sortable" onClick={() => solicitarOrden('NOMBRE_SKILL')}>
                    Nombre Skill {sortConfig.key==='NOMBRE_SKILL' && (sortConfig.direction==='asc' ? '▲' : '▼')}
                  </th>
                  <th>Mensaje Fuera Horario</th>
                  <th width="170" className="text-center">
                    Acciones
                    <button
                      className="btn-icon btn-refresh-skills"
                      title="Actualizar resultados"
                      onClick={buscarSkills}
                      style={{ marginLeft: '6px', width: '24px', height: '24px', verticalAlign: 'middle' }}
                    >
                      <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2.5" fill="none">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
                      </svg>
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {skillsPaginados.map((grupo) => {
                  const estaExpandido = !!expandidos[grupo.ID_SKILL];
                  const estaSeleccionado = !!seleccionados.find(s => s.ID_SKILL === grupo.ID_SKILL);
                  const scheduleGridColumns = grupo.horarios.length <= 1
                    ? 'grid-cols-1'
                    : grupo.horarios.length === 2
                      ? 'md:grid-cols-2'
                      : grupo.horarios.length === 3
                        ? 'md:grid-cols-3'
                        : 'md:grid-cols-2 xl:grid-cols-4';
                  return (
                    <React.Fragment key={`grupo-${grupo.ID_SKILL}`}>
                      {/* FILA PRINCIPAL DEL SKILL */}
                      <tr className={`skill-row-parent ${estaSeleccionado ? 'row-selected' : ''}`}>
                        <td>
                          <button
                            className={`btn-expand ${estaExpandido ? 'expanded' : ''}`}
                            onClick={() => toggleExpandido(grupo.ID_SKILL)}
                            title={estaExpandido ? 'Colapsar horarios' : 'Ver horarios'}
                          >
                            <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2.5" fill="none">
                              <polyline points={estaExpandido ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}></polyline>
                            </svg>
                          </button>
                        </td>
                        <td>
                          <input
                            type="checkbox"
                            className="custom-checkbox"
                            checked={estaSeleccionado}
                            onChange={() => toggleSeleccion(grupo)}
                          />
                        </td>
                        <td><span className="id-tag">{grupo.ID_SKILL}</span></td>
                        <td>
                          <strong className="text-dark">{grupo.NOMBRE_SKILL}</strong>
                          <span className="skill-horarios-count">
                            {grupo.horarios.length > 0
                              ? ` · ${grupo.horarios.length} horario${grupo.horarios.length !== 1 ? 's' : ''}`
                              : ' · Sin horarios'}
                          </span>
                        </td>
                        <td className="mensaje-col" title={grupo.MENSAJE || ''}>
                          <div className="mensaje-texto">{grupo.MENSAJE || <em style={{color:'#cbd5e1'}}>Sin mensaje</em>}</div>
                        </td>
                        <td>
                          <div className="action-buttons">
                            {filtros.usuarios_seleccionados.length > 0 && (
                              <button
                                className="btn-icon btn-delete"
                                title="Quitar permiso"
                                onClick={() => togglePermisoSkill(grupo.ID_SKILL, 'eliminar')}
                              >
                                <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                              </button>
                            )}
                            <button className="btn-icon btn-add" title="Agregar Horario" onClick={() => abrirModalFormulario(grupo, 'add')}>
                              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                            </button>
                            <button className="btn-icon btn-edit" title="Editar Skill" onClick={() => abrirEditarMensaje(grupo)}>
                              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {estaExpandido && (
                        <tr key={`horarios-${grupo.ID_SKILL}`} className="skill-row-child">
                          <td colSpan={6} className="!p-0">
                            <div className="mx-8 my-2 rounded-xl border border-slate-200 border-l-4 border-l-blue-500 bg-slate-50/80 p-3 shadow-inner">
                              {grupo.horarios.length > 0 ? (
                                <div className={`grid grid-cols-1 gap-2 ${scheduleGridColumns}`}>
                                  {grupo.horarios.map((h) => {
                                    const horarioSeleccionado = seleccionados
                                      .find(s => s.ID_SKILL === grupo.ID_SKILL)
                                      ?.horarios?.some(sel => sel.ID_HORARIO_SKILL === h.ID_HORARIO_SKILL);
                                    const diasCount = h.DIAS ? h.DIAS.split('').filter(d => d === '1').length : 5;
                                    const tipoHorario = diasCount === 7 ? 'Todo el día' : diasCount >= 5 ? 'Semana' : 'Parcial';
                                    const diasLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
                                    const diasActivos = h.DIAS || '1111100';
                                    const creadoPor = h.CREADO_POR || h.creado_por || h.USUARIO_CREA || h.usuario_crea || h.created_by || h.CREA_USUARIO;
                                    const creadoEl = h.CREADO_EL || h.creado_el || h.FECHA_CREA || h.fecha_crea || h.created_at || h.CREA_FECHA;
                                    const modificadoPor = h.MODIFICADO_POR || h.modificado_por || h.USUARIO_MOD || h.usuario_mod || h.updated_by || h.MODI_USUARIO;
                                    const modificadoEl = h.MODIFICADO_EL || h.modificado_el || h.FECHA_MOD || h.fecha_mod || h.updated_at || h.MODI_FECHA;
                                    const desde = h.DESDE_GUATE?.substring(0,5) || '--:--';
                                    const hasta = h.HASTA_GUATE?.substring(0,5) || '--:--';
                                    const formatFechaGT = (fecha) => {
                                      if (!fecha) return null;
                                      const d = new Date(fecha);
                                      if (isNaN(d)) return fecha;
                                      return d.toLocaleString('es-GT', { 
                                        timeZone: 'America/Guatemala',
                                        day: '2-digit', 
                                        month: '2-digit', 
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    };
                                    return (
                                      <div key={`horario-${h.ID_HORARIO_SKILL}`} className={`rounded-lg border bg-white px-2.5 py-2 shadow-sm transition hover:border-blue-200 hover:shadow-md ${horarioSeleccionado ? 'border-blue-300 ring-1 ring-blue-200' : 'border-slate-200'}`}>
                                        <div className="flex items-start gap-2">
                                          <input
                                            type="checkbox"
                                            className="custom-checkbox mt-1"
                                            checked={!!horarioSeleccionado}
                                            onChange={() => toggleSeleccionHorario(grupo, h)}
                                            title={horarioSeleccionado ? "Desmarcar" : "Seleccionar"}
                                          />
                                          <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                              <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-800">
                                                <svg viewBox="0 0 24 24" width="12" height="12" stroke="currentColor" strokeWidth="2" fill="none"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                                                {desde} - {hasta}
                                              </span>
                                              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">{tipoHorario}</span>
                                            </div>
                                            <div className="mt-2 flex flex-wrap gap-1">
                                              {diasLabels.map((dia, index) => {
                                                const activo = diasActivos[index] === '1';
                                                return (
                                                  <span key={`${h.ID_HORARIO_SKILL}-${index}`} className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${activo ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    {dia}
                                                  </span>
                                                );
                                              })}
                                            </div>
                                            <div className="mt-2 flex flex-wrap justify-end gap-x-2 gap-y-0.5 text-[9px] leading-tight text-slate-400">
                                              {creadoPor && (
                                                <span className="inline-flex items-center gap-1" title={`Creado: ${formatFechaGT(creadoEl) || 'Fecha no disponible'}`}>
                                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>
                                                  C: {creadoPor} {formatFechaGT(creadoEl) && `· ${formatFechaGT(creadoEl)}`}
                                                </span>
                                              )}
                                              {modificadoPor && (
                                                <span className="inline-flex items-center gap-1" title={`Modificado: ${formatFechaGT(modificadoEl) || 'Fecha no disponible'}`}>
                                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12,6 12,12 16,14"/></svg>
                                                  M: {modificadoPor} {formatFechaGT(modificadoEl) && `· ${formatFechaGT(modificadoEl)}`}
                                                </span>
                                              )}
                                            </div>
                                          </div>
                                          <div className="action-buttons shrink-0">
                                            <button className="btn-icon btn-edit" title="Editar Horario" onClick={() => abrirModalFormulario({...grupo, ...h, ID_SKILL: grupo.ID_SKILL}, 'edit')}>
                                              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                                            </button>
                                            <button className="btn-icon btn-delete" title="Eliminar Horario" onClick={() => setModalConfirm({ show: true, id: h.ID_HORARIO_SKILL, type: 'horario' })}>
                                              <svg viewBox="0 0 24 24" width="15" height="15" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="flex min-h-[72px] items-center justify-center text-center text-sm italic text-slate-400">
                                  Sin horarios configurados para esta skill
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          <div className="pagination">
            <button disabled={currentPage === 1} onClick={() => cambiarPagina(1)}>««</button>
            <button disabled={currentPage === 1} onClick={() => cambiarPagina(currentPage - 1)}>Anterior</button>
            <span>
              Página {currentPage} de {totalPages}
              <small style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)' }}>
                ({skillsAgrupados.length} skills)
              </small>
            </span>
            <button disabled={currentPage === totalPages} onClick={() => cambiarPagina(currentPage + 1)}>Siguiente</button>
            <button disabled={currentPage === totalPages} onClick={() => cambiarPagina(totalPages)}>»»</button>
          </div>
        </section>
      )}

      {/* MODAL DE EDICIÓN MASIVA DE HORARIOS */}
      {modoEdicionMasiva && seleccionados.length > 0 && (
        <div className="modal-overlay" onClick={() => setModoEdicionMasiva(false)}>
          <div className="modal-content editar-horario-modal animate-pop" onClick={e => e.stopPropagation()}>

            <div className="editar-horario-header">
              {(() => {
                const totalHorarios = seleccionados.reduce((acc, g) => acc + (g.horarios ? g.horarios.length : 0), 0);
                return (
                  <>
                    <h3>Editar Horarios Masivamente <span style={{color:'#6366f1'}}>({totalHorarios})</span></h3>
                    <p>Modifica el horario y días activos de cada horario seleccionado.</p>
                  </>
                );
              })()}
              {seleccionados.filter(g => !g.horarios || g.horarios.length === 0).length > 0 && (
                <p style={{ color: '#f59e0b', marginTop: '4px' }}>
                  ⚠ {seleccionados.filter(g => !g.horarios || g.horarios.length === 0).length} skill(s) sin horarios seleccionados.
                </p>
              )}
            </div>

            <div className="editar-horario-lista">
              {seleccionados.map(grupo => {
                const diasLetrasModal = ['L','M','M','J','V','S','D'];
                const diasTitulos = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
                if (!grupo.horarios || grupo.horarios.length === 0) {
                  return (
                    <div key={grupo.ID_SKILL} className="editar-horario-card" style={{opacity:0.5}}>
                      <div className="editar-horario-card-header">
                        <strong>{grupo.NOMBRE_SKILL}</strong>
                        <span style={{color:'#f59e0b',fontSize:'11px'}}>Sin horarios</span>
                      </div>
                    </div>
                  );
                }
                return grupo.horarios.map(h => {
                  const data = edicionMasivaData[h.ID_HORARIO_SKILL] || {};
                  const diasActivos = data.dias || [true,true,true,true,true,false,false];
                  return (
                    <div key={h.ID_HORARIO_SKILL} className="editar-horario-card">
                      <div className="editar-horario-card-header">
                        <strong>{grupo.NOMBRE_SKILL}</strong>
                        <span className="editar-horario-card-actual">
                          {h.DESDE_GUATE || '--:--'} — {h.HASTA_GUATE || '--:--'}
                        </span>
                      </div>
                      <div className="editar-horario-card-body">
                        <div className="editar-horario-campo">
                          <label>Nuevo horario</label>
                          <div className="editar-horario-tiempo">
                            <input
                              type="time"
                              step="1"
                              value={(data.desde || h.DESDE_GUATE || '08:00:00').substring(0, 5)}
                              onChange={e => actualizarHorarioMasivo(h.ID_HORARIO_SKILL, 'desde', e.target.value + ':00')}
                            />
                            <span className="editar-horario-sep">—</span>
                            <input
                              type="time"
                              step="1"
                              value={(data.hasta || h.HASTA_GUATE || '17:00:00').substring(0, 5)}
                              onChange={e => actualizarHorarioMasivo(h.ID_HORARIO_SKILL, 'hasta', e.target.value + ':00')}
                            />
                          </div>
                        </div>
                        <div className="editar-horario-campo">
                          <label>Días activos</label>
                          <div className="editar-horario-dias">
                            {diasLetrasModal.map((l, i) => (
                              <button
                                key={i}
                                type="button"
                                className={`editar-horario-dia-btn ${diasActivos[i] ? 'activo' : ''}`}
                                title={diasTitulos[i]}
                                onClick={() => toggleDiaMasivo(h.ID_HORARIO_SKILL, i)}
                              >{l}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                });
              })}
            </div>

            {(() => {
              const totalHorarios = seleccionados.reduce((acc, g) => acc + (g.horarios ? g.horarios.length : 0), 0);
              return (
                <div className="modal-actions">
                  <button className="btn-secondary" onClick={() => setModoEdicionMasiva(false)} disabled={guardandoMasivo}>
                    Cancelar
                  </button>
                  <button
                    className="btn-main btn-glow"
                    onClick={guardarEdicionMasiva}
                    disabled={guardandoMasivo || totalHorarios === 0}
                  >
                    {guardandoMasivo ? 'Guardando...' : `Guardar ${totalHorarios} horario(s)`}
                  </button>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* MODAL PARA PROGRAMACIÓN MASIVA - Por skill individual */}
      {showProgramarModal && (
        <div className="modal-overlay" onClick={() => setShowProgramarModal(false)}>
          <div className="modal-content programar-masivo-modal animate-pop" onClick={e => e.stopPropagation()}>
            <div className="programar-modal-header">
              <h3 className="modal-title">Programar Horarios</h3>
              <p style={{ color: '#64748b', fontSize: '13px', marginTop: '4px' }}>
                Configura horario, días y fechas por skill de forma independiente.
              </p>
              {/* ── Panel de copia global ── */}
              <div style={{ marginTop: 10, padding: '10px 14px', background: '#f1f5f9', borderRadius: 8, border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: '#475569', whiteSpace: 'nowrap' }}>📋 Copiar a todos:</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>Aplicar el</label>
                  <input
                    type="datetime-local"
                    style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    onChange={e => e.target.value && copiarATodos('fecha_aplicacion', e.target.value)}
                    defaultValue={getNowLocal()}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <label style={{ fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>Revertir el</label>
                  <input
                    type="datetime-local"
                    style={{ fontSize: 11, padding: '4px 6px', borderRadius: 6, border: '1px solid #cbd5e1' }}
                    onChange={e => e.target.value && copiarATodos('fecha_reversion', e.target.value)}
                    defaultValue={get0600Local()}
                  />
                </div>
              </div>
            </div>

            <div className="programar-skills-lista">
              {seleccionados.map(grupo => {
                const diasIniciales = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
                const diasTitulos = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
                const yaEnCola = programados.filter(p =>
                  String(p.id_skill) === String(grupo.ID_SKILL) &&
                  (p.estado === 'PENDIENTE' || p.estado === 'APLICADO')
                );
                const mf = formMensajesPorSkill[grupo.ID_SKILL] || {};

                return (
                  <div key={grupo.ID_SKILL} className="programar-skill-grupo">
                    {/* ── CABECERA DEL SKILL ── */}
                    <div className="programar-skill-titulo">
                      <div className="programar-skill-titulo-left">
                        <span className="programar-skill-id">#{grupo.ID_SKILL}</span>
                        <strong>{grupo.NOMBRE_SKILL}</strong>
                        {yaEnCola.length > 0 && (
                          <span className="programar-cola-badge">⚠ {yaEnCola.length} en cola</span>
                        )}
                      </div>
                    </div>

                    {/* ── SECCIÓN MENSAJE (1 por skill) ── */}
                    <div className="programar-mensaje-seccion">
                      <div className="programar-mensaje-toggle">
                        <label className="programar-toggle-label">
                          <input
                            type="checkbox"
                            checked={!!mf.habilitado}
                            onChange={e => setFormMensajesPorSkill(prev => ({
                              ...prev,
                              [grupo.ID_SKILL]: { ...prev[grupo.ID_SKILL], habilitado: e.target.checked }
                            }))}
                          />
                          <span>Programar mensaje fuera de horario</span>
                        </label>
                        {grupo.MENSAJE && (
                          <span className="programar-mensaje-actual" title={grupo.MENSAJE}>
                            Actual: <em>"{grupo.MENSAJE.length > 50 ? grupo.MENSAJE.substring(0,50)+'…' : grupo.MENSAJE}"</em>
                          </span>
                        )}
                      </div>
                      {mf.habilitado && (
                        <div className="programar-mensaje-campos">
                          <div className="programar-campo programar-campo-full">
                            <label>Nuevo mensaje</label>
                            <textarea
                              className="input-modern"
                              rows="2"
                              value={mf.nuevo_mensaje || ''}
                              onChange={e => setFormMensajesPorSkill(prev => ({
                                ...prev,
                                [grupo.ID_SKILL]: { ...prev[grupo.ID_SKILL], nuevo_mensaje: e.target.value }
                              }))}
                              placeholder="Mensaje que se mostrará fuera de horario..."
                              style={{ width: '100%', resize: 'vertical', fontSize: '12px' }}
                            />
                          </div>
                          <div className="programar-campo">
                            <label>Aplicar el</label>
                            <input
                              className={`input-modern ${!mf.fecha_aplicacion ? 'input-required' : ''}`}
                              type="datetime-local"
                              value={mf.fecha_aplicacion || ''}
                              onChange={e => setFormMensajesPorSkill(prev => ({
                                ...prev,
                                [grupo.ID_SKILL]: { ...prev[grupo.ID_SKILL], fecha_aplicacion: e.target.value }
                              }))}
                              style={{ fontSize: '12px', padding: '6px 8px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div className="programar-campo">
                            <label>Revertir el (opcional)</label>
                            <input
                              className="input-modern"
                              type="datetime-local"
                              value={mf.fecha_reversion || ''}
                              onChange={e => setFormMensajesPorSkill(prev => ({
                                ...prev,
                                [grupo.ID_SKILL]: { ...prev[grupo.ID_SKILL], fecha_reversion: e.target.value }
                              }))}
                              style={{ fontSize: '12px', padding: '6px 8px', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── HORARIOS DEL SKILL ── */}
                    {(!grupo.horarios || grupo.horarios.length === 0) ? (
                      <div className="programar-sin-horarios">Sin horarios configurados — no se programarán cambios de horario</div>
                    ) : (
                      grupo.horarios.map(h => {
                        const key = grupo.ID_SKILL + '_' + h.ID_HORARIO_SKILL;
                        const f = formProgramar[key] || {};
                        const dias = f.dias || [true, true, true, true, true, false, false];
                        return (
                          <div key={key} className="programar-skill-card">
                            <div className="programar-skill-header">
                              <span className="programar-skill-actual-header">
                                Horario actual: {h.DESDE_GUATE || '--:--'} — {h.HASTA_GUATE || '--:--'} &nbsp;
                                <span className="days-code" style={{fontSize:'11px'}}>{formatDias(h.DIAS)}</span>
                              </span>
                              {/* ── Copiar / Pegar en el header, fuera del grid ── */}
                              <div style={{ display: 'flex', gap: 6, marginLeft: 'auto' }}>
                                <button
                                  type="button"
                                  title="Copiar fechas de este horario para pegar en otro"
                                  onClick={() => {
                                    setClipboardFechas({ fecha_aplicacion: f.fecha_aplicacion, fecha_reversion: f.fecha_reversion });
                                    toast.success('Fechas copiadas');
                                  }}
                                  style={{ padding: '3px 10px', borderRadius: 5, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', fontSize: 11, color: '#475569', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                >📋 Copiar fechas</button>
                                <button
                                  type="button"
                                  title="Pegar fechas copiadas aquí"
                                  disabled={!clipboardFechas}
                                  onClick={() => {
                                    if (!clipboardFechas) return;
                                    actualizarFormProgramar(key, 'fecha_aplicacion', clipboardFechas.fecha_aplicacion);
                                    actualizarFormProgramar(key, 'fecha_reversion', clipboardFechas.fecha_reversion);
                                    toast.success('Fechas pegadas');
                                  }}
                                  style={{ padding: '3px 10px', borderRadius: 5, border: `1px solid ${clipboardFechas ? '#93c5fd' : '#e2e8f0'}`, background: clipboardFechas ? '#eff6ff' : '#f1f5f9', cursor: clipboardFechas ? 'pointer' : 'not-allowed', fontSize: 11, color: clipboardFechas ? '#2563eb' : '#94a3b8', display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}
                                >📌 Pegar{clipboardFechas ? '' : ' (vacío)'}</button>
                              </div>
                            </div>
                            <div className="programar-skill-body">
                              <div className="programar-campo">
                                <label>Nuevo horario</label>
                                <div className="time-split" style={{ flexWrap: 'nowrap', gap: '4px' }}>
                                  <input
                                    className="input-modern programar-time-input"
                                    type="time"
                                    value={(f.nuevo_desde || '08:00:00').substring(0, 5)}
                                    onChange={e => actualizarFormProgramar(key, 'nuevo_desde', e.target.value + ':00')}
                                  />
                                  <span className="time-separator" style={{ padding: '0 4px', flexShrink: 0 }}>—</span>
                                  <input
                                    className="input-modern programar-time-input"
                                    type="time"
                                    value={(f.nuevo_hasta || '17:00:00').substring(0, 5)}
                                    onChange={e => actualizarFormProgramar(key, 'nuevo_hasta', e.target.value + ':00')}
                                  />
                                </div>
                              </div>
                              <div className="programar-campo">
                                <label>Días</label>
                                <div className="programar-dias-row">
                                  {diasIniciales.map((n, i) => (
                                    <button
                                      key={i}
                                      type="button"
                                      className={`programar-dia-btn ${dias[i] ? 'activo' : ''}`}
                                      onClick={() => toggleDiaProgramar(key, i)}
                                      title={diasTitulos[i]}
                                    >{n}</button>
                                  ))}
                                </div>
                              </div>
                              <div className="programar-campo">
                                <label>Aplicar el</label>
                                <input
                                  className={`input-modern ${!f.fecha_aplicacion ? 'input-required' : ''}`}
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', boxSizing: 'border-box' }}
                                  type="datetime-local"
                                  value={f.fecha_aplicacion || ''}
                                  onChange={e => actualizarFormProgramar(key, 'fecha_aplicacion', e.target.value)}
                                />
                              </div>
                              <div className="programar-campo">
                                <label>Revertir el</label>
                                <input
                                  className={`input-modern ${!f.fecha_reversion ? 'input-required' : ''}`}
                                  style={{ width: '100%', fontSize: '12px', padding: '6px 8px', boxSizing: 'border-box' }}
                                  type="datetime-local"
                                  value={f.fecha_reversion || ''}
                                  onChange={e => actualizarFormProgramar(key, 'fecha_reversion', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}

                    {/* ── HORARIOS TEMPORALES NUEVOS ── */}
                    <div className="programar-horarios-temporales">
                      <div className="programar-temporal-header">
                        <span className="programar-temporal-title">🕐 Horarios Temporales Nuevos</span>
                        <button
                          type="button"
                          className="btn-agregar-temporal"
                          onClick={() => agregarHorarioTemporal(grupo.ID_SKILL)}
                        >
                          ➕ Agregar horario temporal
                        </button>
                      </div>
                      {Object.entries(horariosTemporales[grupo.ID_SKILL] || {}).map(([temporalId, temporal]) => (
                        <div key={temporalId} className="programar-skill-card temporal">
                          <div className="programar-skill-header">
                            <span className="programar-skill-actual-header">
                              <span style={{color: '#2563eb', fontWeight: 600}}>⏰ Horario Temporal Nuevo</span>
                            </span>
                            <button
                              type="button"
                              className="btn-eliminar-temporal"
                              onClick={() => eliminarHorarioTemporal(grupo.ID_SKILL, temporalId)}
                              title="Eliminar este horario temporal"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                          <div className="programar-skill-body">
                            <div className="programar-campo">
                              <label>Horario</label>
                              <div className="time-split" style={{ flexWrap: 'nowrap', gap: '4px' }}>
                                <input
                                  className="input-modern programar-time-input"
                                  type="time"
                                  value={temporal.nuevo_desde.substring(0, 5)}
                                  onChange={e => actualizarHorarioTemporal(grupo.ID_SKILL, temporalId, 'nuevo_desde', e.target.value + ':00')}
                                />
                                <span className="time-separator" style={{ padding: '0 4px', flexShrink: 0 }}>—</span>
                                <input
                                  className="input-modern programar-time-input"
                                  type="time"
                                  value={temporal.nuevo_hasta.substring(0, 5)}
                                  onChange={e => actualizarHorarioTemporal(grupo.ID_SKILL, temporalId, 'nuevo_hasta', e.target.value + ':00')}
                                />
                              </div>
                            </div>
                            <div className="programar-campo">
                              <label>Días</label>
                              <div className="programar-dias-row">
                                {diasIniciales.map((n, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    className={`programar-dia-btn ${temporal.dias[i] ? 'activo' : ''}`}
                                    onClick={() => toggleDiaTemporal(grupo.ID_SKILL, temporalId, i)}
                                    title={diasTitulos[i]}
                                  >{n}</button>
                                ))}
                              </div>
                            </div>
                            <div className="programar-campo">
                              <label>Aplicar el</label>
                              <input
                                className={`input-modern ${!temporal.fecha_aplicacion ? 'input-required' : ''}`}
                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px', boxSizing: 'border-box' }}
                                type="datetime-local"
                                value={temporal.fecha_aplicacion || ''}
                                onChange={e => actualizarHorarioTemporal(grupo.ID_SKILL, temporalId, 'fecha_aplicacion', e.target.value)}
                              />
                            </div>
                            <div className="programar-campo">
                              <label>Revertir el</label>
                              <input
                                className={`input-modern ${!temporal.fecha_reversion ? 'input-required' : ''}`}
                                style={{ width: '100%', fontSize: '12px', padding: '6px 8px', boxSizing: 'border-box' }}
                                type="datetime-local"
                                value={temporal.fecha_reversion || ''}
                                onChange={e => actualizarHorarioTemporal(grupo.ID_SKILL, temporalId, 'fecha_reversion', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {(!horariosTemporales[grupo.ID_SKILL] || Object.keys(horariosTemporales[grupo.ID_SKILL]).length === 0) && (
                        <div className="programar-sin-temporales">
                          No hay horarios temporales. Usa "Agregar horario temporal" para crear horarios nuevos que se aplicarán y eliminarán automáticamente.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowProgramarModal(false)}>Cancelar</button>
              <button className="btn-main btn-glow" onClick={guardarProgramacionMasiva}>
                Programar horarios seleccionados
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={modalConfirm.show}
        title="Confirmación Requerida"
        confirmText="Sí, Eliminar"
        confirmVariant="danger"
        onConfirm={confirmarEliminar}
        onCancel={() => setModalConfirm({ show: false, id: null, type: '' })}
      >
        <p>Esta acción eliminará el registro de forma permanente. ¿Deseas continuar?</p>
      </ConfirmModal>

      {modalForm.show && (
        <div className="modal-overlay">
          <div className="modal-content animate-pop wide-modal">
            <h3 className="modal-title">{modalForm.mode === 'add' ? 'Crear Nuevo Horario' : 'Editar Horario Activo'}</h3>
            <p style={{marginBottom: '20px', color: '#64748b'}}>Configurando Skill: <strong>{modalForm.skill?.NOMBRE_SKILL}</strong></p>
            
            <div className="premium-grid">
              <div className="form-group"><label>Hora de Inicio</label><input className="input-modern" type="time" step="1" value={modalForm.desde} onChange={e => setModalForm({...modalForm, desde: e.target.value})} /></div>
              <div className="form-group"><label>Hora de Fin</label><input className="input-modern" type="time" step="1" value={modalForm.hasta} onChange={e => setModalForm({...modalForm, hasta: e.target.value})} /></div>
            </div>
            
            <div className="form-group" style={{marginTop:'15px'}}>
              <label>Días Activos</label>
              <div className="days-flex">
                {diasLetras.map((l, i) => (
                  <div key={i} className={`day-item ${modalForm.dias[i] ? 'active' : ''}`} onClick={() => { let d = [...modalForm.dias]; d[i] = !d[i]; setModalForm({...modalForm, dias: d}); }}>{l}</div>
                ))}
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModalForm({ show: false })}>Cancelar</button>
              <button className="btn-main" onClick={procesarFormularioHorario}>Guardar Cambios</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Editar Skill (nombre solo lectura + mensaje editable) */}
      {showEditarMensajeModal && (
        <div className="modal-overlay" onClick={() => setShowEditarMensajeModal(false)}>
          <div className="modal-content animate-pop wide-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Editar Skill</h3>
            <div className="form-group" style={{marginBottom:'16px'}}>
              <label>Nombre del Skill</label>
              <input
                className="input-modern"
                type="text"
                value={skillEditarMensaje?.NOMBRE_SKILL || ''}
                readOnly
                style={{background:'#f8fafc', color:'#94a3b8', cursor:'not-allowed'}}
              />
            </div>
            <div className="form-group">
              <label>Mensaje Fuera de Horario</label>
              <textarea
                className="input-modern"
                rows="4"
                value={mensajeEditar}
                onChange={e => setMensajeEditar(e.target.value)}
                placeholder="Ingrese el mensaje que se mostrará fuera del horario activo..."
                style={{width: '100%', minHeight: '90px', resize: 'vertical'}}
              />
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowEditarMensajeModal(false)} disabled={guardandoMensaje}>
                Cancelar
              </button>
              <button className="btn-main" onClick={guardarMensajeDirecto} disabled={guardandoMensaje}>
                {guardandoMensaje ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Programar Cambio de Mensaje */}
      {showProgramarMensajeModal && (
        <div className="modal-overlay" onClick={() => setShowProgramarMensajeModal(false)}>
          <div className="modal-content animate-pop wide-modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">Programar Cambio de Mensaje</h3>
            <p style={{marginBottom: '16px', color: '#64748b'}}>
              Skill: <strong>{skillEditarMensaje?.NOMBRE_SKILL}</strong>
            </p>
            <div className="form-group" style={{marginTop: '15px'}}>
              <label>Nuevo Mensaje</label>
              <textarea
                className="input-modern"
                rows="4"
                value={formProgramarMensaje.nuevo_mensaje}
                onChange={e => setFormProgramarMensaje({...formProgramarMensaje, nuevo_mensaje: e.target.value})}
                placeholder="Ingrese el nuevo mensaje..."
                style={{width: '100%', minHeight: '80px', resize: 'vertical'}}
              />
            </div>
            <div className="premium-grid" style={{marginTop: '15px'}}>
              <div className="form-group">
                <label>Aplicar el</label>
                <input
                  className={`input-modern ${!formProgramarMensaje.fecha_aplicacion ? 'input-required' : ''}`}
                  type="datetime-local"
                  value={formProgramarMensaje.fecha_aplicacion}
                  onChange={e => setFormProgramarMensaje({...formProgramarMensaje, fecha_aplicacion: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>Revertir el (opcional)</label>
                <input
                  className="input-modern"
                  type="datetime-local"
                  value={formProgramarMensaje.fecha_reversion}
                  onChange={e => setFormProgramarMensaje({...formProgramarMensaje, fecha_reversion: e.target.value})}
                />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowProgramarMensajeModal(false)}>
                Cancelar
              </button>
              <button className="btn-main btn-glow" onClick={guardarProgramarMensaje}>
                Programar Cambio
              </button>
            </div>
          </div>
        </div>
      )}</>)}

      {/* ── VISTA HORARIOS BOTS ── */}
      {vistaActiva === 'bots' && <HorariosBots dbKey={filtros.db_key} idEmpresa={filtros.id_empresa} botId={filtros.bot_id} />}

        </div>
      </div>
    </div>
  );
}

export default Skills;

