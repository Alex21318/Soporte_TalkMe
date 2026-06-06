import { useState, useEffect, useRef, useMemo } from 'react';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './Reportes2.css';

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

function Reportes() {
  // Estados de filtros
  const [filtros, setFiltros] = useState(() => {
    try {
      const saved = sessionStorage.getItem('rep_filtros');
      const def = { 
        db_key: 'db_1', 
        id_empresa: '', 
        fecha_inicio: '', 
        fecha_fin: '', 
        skills: [],
        tipo_reporte: 'detallado',
        id_bots: [],
        id_broadcasts: [],
        texto_buscar: '',
        flujo: '',
        id_formulario: '',
        estado_nota: '',
        estado_skill: '',
        eliminado_skill: '',
        id_nota_rapida: '',
        id_redes_sociales: [],
        creado_por: '',
        estado_recontacto: ''
      };
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...def, ...parsed };
      }
      return def;
    } catch { 
      return { 
        db_key: 'db_1', 
        id_empresa: '', 
        fecha_inicio: '', 
        fecha_fin: '', 
        skills: [],
        tipo_reporte: 'detallado',
        id_bots: [],
        id_broadcasts: [],
        texto_buscar: '',
        flujo: '',
        id_formulario: '',
        estado_nota: '',
        estado_skill: '',
        eliminado_skill: '',
        id_nota_rapida: '',
        id_redes_sociales: [],
        creado_por: '',
        estado_recontacto: ''
      }; 
    }
  });

  // Persistir filtros en sessionStorage
  useEffect(() => { 
    sessionStorage.setItem('rep_filtros', JSON.stringify(filtros)); 
  }, [filtros]);

  // Grupo Q: solo disponible en db_2 + empresa 213
  useEffect(() => {
    if (filtros.tipo_reporte === 'grupoq') {
      if (filtros.db_key !== 'db_2') {
        setFiltros(prev => ({ ...prev, tipo_reporte: 'detallado' }));
      } else if (filtros.id_empresa !== '213') {
        // Forzar empresa 213 al seleccionar Grupo Q
        setFiltros(prev => ({ ...prev, id_empresa: '213' }));
      }
    }
  }, [filtros.db_key, filtros.tipo_reporte]);

  // Al cambiar tipo de reporte: limpiar selecciones de bot/campañas
  // (los bots disponibles cambian: broadcast=WA, otros=todos)
  const tipoReporteRef = useRef(null);
  useEffect(() => {
    if (tipoReporteRef.current !== null && tipoReporteRef.current !== filtros.tipo_reporte) {
      setFiltros(prev => ({ ...prev, id_bots: [], id_broadcasts: [] }));
      setBots([]);
      setCampanias([]);
    }
    tipoReporteRef.current = filtros.tipo_reporte;
  }, [filtros.tipo_reporte]);

  // Notas rápidas para el reporte
  const [notasRapidas, setNotasRapidas] = useState([]);

  // Listas para dropdowns (persistidas para evitar re-fetch al remontar)
  const [empresas, setEmpresas] = useState(() => {
    try { 
      const s = sessionStorage.getItem('rep_empresas'); 
      return s ? JSON.parse(s) : []; 
    } catch { 
      return []; 
    }
  });
  const [skills, setSkills] = useState(() => {
    try { 
      const s = sessionStorage.getItem('rep_skills'); 
      return s ? JSON.parse(s) : []; 
    } catch { 
      return []; 
    }
  });

  // Persistir listas en sessionStorage
  useEffect(() => { 
    sessionStorage.setItem('rep_empresas', JSON.stringify(empresas)); 
  }, [empresas]);
  useEffect(() => { 
    sessionStorage.setItem('rep_skills', JSON.stringify(skills)); 
  }, [skills]);

  // Estados para Broadcast: bots y campañas (no persisten porque dependen del filtro)
  const [bots, setBots] = useState([]);
  const [campanias, setCampanias] = useState([]);
  const [formularios, setFormularios] = useState([]);

  const [loading, setLoading] = useState({ 
    empresas: false, 
    skills: false, 
    reporte: false,
    bots: false,
    campanias: false,
    formularios: false,
    notas: false
  });

  // Resultados del reporte
  const [resultados, setResultados] = useState([]);

  // Paginacion de la tabla de resultados
  const [paginaActual, setPaginaActual] = useState(1);
  const FILAS_POR_PAGINA = 50;

  // Refs para detectar cambio real (no solo remontar)
  const empresaCacheadaRef = useRef(
    (() => { 
      try { 
        const s = sessionStorage.getItem('rep_filtros'); 
        return s ? JSON.parse(s).id_empresa : ''; 
      } catch { 
        return ''; 
      } 
    })()
  );
  const dbKeyCacheadaRef = useRef(
    (() => { 
      try { 
        const s = sessionStorage.getItem('rep_filtros'); 
        return s ? JSON.parse(s).db_key : ''; 
      } catch { 
        return ''; 
      } 
    })()
  );

  // Cargar empresas: solo si no hay cache O si cambió la base de datos
  useEffect(() => {
    if (!filtros.db_key) return;
    const dbCambio = filtros.db_key !== dbKeyCacheadaRef.current;
    dbKeyCacheadaRef.current = filtros.db_key;
    if (empresas.length > 0 && !dbCambio) return;
    if (dbCambio) {
      setEmpresas([]);
      sessionStorage.removeItem('rep_empresas');
      setSkills([]);
      sessionStorage.removeItem('rep_skills');
      setBots([]);
      setCampanias([]);
      setResultados([]);
      empresaCacheadaRef.current = '';
      setFiltros(prev => ({ ...prev, id_empresa: '', skills: [], id_bots: [], id_broadcasts: [] }));
    }
    const controller = new AbortController();
    cargarEmpresas(controller.signal);
    return () => controller.abort();
  }, [filtros.db_key]);

  // Cargar skills cuando cambia la empresa (o cuando no hay empresa pero el reporte lo permite)
  useEffect(() => {
    const empresaOpcional = REPORTES_EMPRESA_OPCIONAL.includes(filtros.tipo_reporte);
    if (!filtros.db_key || (!filtros.id_empresa && !empresaOpcional)) return;
    const empresaCambio = filtros.id_empresa !== empresaCacheadaRef.current;
    empresaCacheadaRef.current = filtros.id_empresa;
    if (skills.length > 0 && !empresaCambio) return;
    if (empresaCambio) {
      setSkills([]);
      sessionStorage.removeItem('rep_skills');
      setBots([]);
      setCampanias([]);
      setResultados([]);
      setFiltros(prev => ({ ...prev, skills: [], id_bots: [], id_broadcasts: [] }));
    }
    const controller = new AbortController();
    cargarSkills(controller.signal);
    return () => controller.abort();
  }, [filtros.db_key, filtros.id_empresa, filtros.tipo_reporte]);

  // Cargar notas rápidas cuando cambia la empresa y el tipo de reporte es notasrapidas
  useEffect(() => {
    if (filtros.tipo_reporte !== 'notasrapidas' || !filtros.db_key) return;
    const controller = new AbortController();
    cargarNotasRapidas(controller.signal);
    return () => controller.abort();
  }, [filtros.db_key, filtros.id_empresa, filtros.tipo_reporte]);

  // Tipos de reporte que usan filtro de bot
  const REPORTES_CON_BOT = ['detallado', 'resumido', 'broadcast', 'apinotif', 'respuestas', 'campaniasrep', 'recontactos-programados'];
  // Tipos de reporte que NO usan fechas obligatorias
  const REPORTES_SIN_FECHAS = ['numerosactivos', 'notasrapidas', 'skills'];
  // Tipos de reporte donde empresa es opcional
  const REPORTES_EMPRESA_OPCIONAL = ['numerosactivos', 'notasrapidas', 'skills'];

  // Cargar bots segun tipo de reporte:
  //  - broadcast → solo bots con WhatsApp (ID_RED_SOCIAL=1)
  //  - detallado, resumido, apinotif → todos los bots de la empresa
  useEffect(() => {
    if (!REPORTES_CON_BOT.includes(filtros.tipo_reporte) || !filtros.db_key || !filtros.id_empresa) {
      setBots([]);
      return;
    }
    const url = filtros.tipo_reporte === 'broadcast'
      ? API_URLS.reportesBotsBroadcast(filtros.db_key, filtros.id_empresa)
      : API_URLS.reportesBotsEmpresa(filtros.db_key, filtros.id_empresa);

    setLoading(prev => ({ ...prev, bots: true }));
    fetchWithAuth(url)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setBots(data);
        else setBots([]);
      })
      .catch(() => setBots([]))
      .finally(() => setLoading(prev => ({ ...prev, bots: false })));
  }, [filtros.tipo_reporte, filtros.db_key, filtros.id_empresa]);

  // Cargar operadores para Recontactos Programados
  useEffect(() => {
    if (filtros.tipo_reporte !== 'recontactos-programados' || !filtros.db_key || !filtros.id_empresa) {
      setOperadores([]);
      return;
    }
    setLoading(prev => ({ ...prev, operadores: true }));
    // Usar el endpoint de recontactos programados para obtener operadores únicos
    fetchWithAuth(API_URLS.reportesRecontactosProgramados(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        db_key: filtros.db_key,
        id_empresa: filtros.id_empresa,
        fecha_inicio: '2000-01-01',
        fecha_fin: '2099-12-31'
      })
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const operadoresUnicos = [...new Set(data.map(r => r['Creado Por']).filter(Boolean))];
          setOperadores(operadoresUnicos);
        } else {
          setOperadores([]);
        }
      })
      .catch(() => setOperadores([]))
      .finally(() => setLoading(prev => ({ ...prev, operadores: false })));
  }, [filtros.tipo_reporte, filtros.db_key, filtros.id_empresa]);

  // Cargar formularios cuando cambia bot (en modo Respuestas) — acepta 1 o más bots
  useEffect(() => {
    if (filtros.tipo_reporte !== 'respuestas' || !filtros.db_key || !filtros.id_bots || filtros.id_bots.length === 0) {
      setFormularios([]);
      return;
    }
    setLoading(prev => ({ ...prev, formularios: true }));
    fetchWithAuth(API_URLS.reportesFormularioBot(filtros.db_key, filtros.id_bots))
      .then(r => r.json())
      .then(data => setFormularios(Array.isArray(data) ? data : []))
      .catch(() => setFormularios([]))
      .finally(() => setLoading(prev => ({ ...prev, formularios: false })));
  }, [filtros.tipo_reporte, filtros.db_key, JSON.stringify(filtros.id_bots)]);

  // Cargar campañas cuando cambia bot o fechas (en modo Broadcast)
  useEffect(() => {
    if (filtros.tipo_reporte !== 'broadcast' || !filtros.id_bots || filtros.id_bots.length === 0 || !filtros.fecha_inicio || !filtros.fecha_fin) {
      setCampanias([]);
      return;
    }
    setLoading(prev => ({ ...prev, campanias: true }));
    fetchWithAuth(API_URLS.reportesCampanias(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        db_key: filtros.db_key,
        id_empresa: filtros.id_empresa,
        id_bots: filtros.id_bots,
        fecha_inicio: filtros.fecha_inicio,
        fecha_fin: filtros.fecha_fin
      })
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setCampanias(data);
        else {
          console.warn('[Campañas] Respuesta no es array:', data);
          setCampanias([]);
        }
      })
      .catch((e) => {
        console.error('[Campañas] error:', e);
        setCampanias([]);
      })
      .finally(() => setLoading(prev => ({ ...prev, campanias: false })));
  }, [filtros.tipo_reporte, filtros.db_key, filtros.id_bots, filtros.fecha_inicio, filtros.fecha_fin]);

  // Funciones de carga
  const cargarEmpresas = async (signal) => {
    setLoading(prev => ({ ...prev, empresas: true }));
    try {
      const res = await fetchWithAuth(API_URLS.empresas(filtros.db_key), { signal });
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

  const cargarSkills = async (signal) => {
    setLoading(prev => ({ ...prev, skills: true }));
    try {
      const res = await fetchWithAuth(API_URLS.skillsDisponibles(filtros.db_key, filtros.id_empresa, ''), { signal });
      const data = await res.json();
      if (Array.isArray(data)) setSkills(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando skills:", e);
      toast.error("Error al cargar skills");
    } finally {
      setLoading(prev => ({ ...prev, skills: false }));
    }
  };

  const cargarNotasRapidas = async (signal) => {
    if (!filtros.db_key) return;
    setLoading(prev => ({ ...prev, notas: true }));
    try {
      const empresaParam = filtros.id_empresa ? `&id_empresa=${filtros.id_empresa}` : '';
      const res = await fetchWithAuth(`${API_URLS.reportesNotasRapidasLista()}?db_key=${filtros.db_key}${empresaParam}`, { signal });
      const data = await res.json();
      if (Array.isArray(data)) setNotasRapidas(data);
    } catch (e) {
      if (e.name === 'AbortError') return;
      console.error("Error cargando notas rápidas:", e);
    } finally {
      setLoading(prev => ({ ...prev, notas: false }));
    }
  };

  // Generar reporte
  const generarReporte = async () => {
    const necesitaFechas = !REPORTES_SIN_FECHAS.includes(filtros.tipo_reporte);
    const empresaOpcional = REPORTES_EMPRESA_OPCIONAL.includes(filtros.tipo_reporte);
    if (!filtros.db_key || (!empresaOpcional && !filtros.id_empresa) || (necesitaFechas && (!filtros.fecha_inicio || !filtros.fecha_fin))) {
      toast.error('Por favor complete todos los filtros obligatorios');
      return;
    }

    // Validaciones especificas por tipo
    if (['broadcast', 'apinotif', 'respuestas'].includes(filtros.tipo_reporte)) {
      if (!filtros.id_bots || filtros.id_bots.length === 0) {
        toast.error('Seleccione al menos un Bot');
        return;
      }
      if (filtros.tipo_reporte === 'respuestas' && !filtros.id_formulario) {
        toast.error('Seleccione un formulario');
        return;
      }
    } else if (filtros.tipo_reporte === 'resolpalabra') {
      if (!filtros.texto_buscar || !filtros.texto_buscar.trim()) {
        toast.error('Ingrese el texto a buscar en los mensajes');
        return;
      }
    } else if (!['grupoq', 'numerosactivos', 'campaniasrep', 'skills', 'sesiones', 'notasrapidas'].includes(filtros.tipo_reporte) && filtros.skills.length === 0) {
      toast.error('Por favor seleccione al menos un skill');
      return;
    }

    setLoading(prev => ({ ...prev, reporte: true }));
    try {
      let endpoint;
      let payload = filtros;
      if (filtros.tipo_reporte === 'detallado') {
        endpoint = API_URLS.reportesDetallado();
        payload = { ...filtros, id_bots: filtros.id_bots || [] };
      } else if (filtros.tipo_reporte === 'resumido') {
        endpoint = API_URLS.reportesResumido();
        payload = { ...filtros, id_bots: filtros.id_bots || [] };
      } else if (filtros.tipo_reporte === 'grupoq') {
        endpoint = API_URLS.reportesGrupoQ();
      } else if (filtros.tipo_reporte === 'broadcast') {
        endpoint = API_URLS.reportesBroadcast();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          id_bots: filtros.id_bots,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin,
          id_broadcasts: filtros.id_broadcasts || []
        };
      } else if (filtros.tipo_reporte === 'apinotif') {
        endpoint = API_URLS.reportesApiNotificaciones();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          id_bots: filtros.id_bots,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin
        };
      } else if (filtros.tipo_reporte === 'numerosactivos') {
        endpoint = API_URLS.reportesNumerosActivos();
        payload = { db_key: filtros.db_key, id_empresa: filtros.id_empresa };
      } else if (filtros.tipo_reporte === 'resolpalabra') {
        endpoint = API_URLS.reportesResolucionesPalabra();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin,
          texto_buscar: filtros.texto_buscar,
          flujo: filtros.flujo || null
        };
      } else if (filtros.tipo_reporte === 'campaniasrep') {
        endpoint = API_URLS.reportesCampaniasReporte();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin,
          id_bots: filtros.id_bots || []
        };
      } else if (filtros.tipo_reporte === 'respuestas') {
        endpoint = API_URLS.reportesRespuestas();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin,
          id_bots: filtros.id_bots,
          id_formulario: filtros.id_formulario
        };
      } else if (filtros.tipo_reporte === 'notasrapidas') {
        endpoint = API_URLS.reportesNotasRapidas();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          id_nota_rapida: filtros.id_nota_rapida,
          estado: filtros.estado_nota
        };
      } else if (filtros.tipo_reporte === 'recontactos-programados') {
        endpoint = API_URLS.reportesRecontactosProgramados();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin,
          skills: filtros.skills || [],
          id_bots: filtros.id_bots || [],
          id_redes_sociales: filtros.id_redes_sociales || [],
          creado_por: filtros.creado_por || '',
          estado: filtros.estado_recontacto || ''
        };
      } else if (filtros.tipo_reporte === 'skills') {
        endpoint = API_URLS.reportesSkillsMaestro();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          skills: filtros.skills,
          estado: filtros.estado_skill,
          eliminado: filtros.eliminado_skill
        };
      } else if (filtros.tipo_reporte === 'sesiones') {
        endpoint = API_URLS.reportesSesiones();
        payload = {
          db_key: filtros.db_key,
          id_empresa: filtros.id_empresa,
          fecha_inicio: filtros.fecha_inicio,
          fecha_fin: filtros.fecha_fin
        };
      }
      
      const response = await fetchWithAuth(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      const nombreReporte = getNombreTipoReporte();
      if (response.ok) {
        setResultados(data);
        setPaginaActual(1);
        toast.success(`Reporte de ${nombreReporte} generado con ${data.length} registros`);
      } else {
        toast.error(data.error || 'Error al generar reporte');
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      toast.error('Error al generar el reporte');
    } finally {
      setLoading(prev => ({ ...prev, reporte: false }));
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setFiltros({
      db_key: filtros.db_key,
      id_empresa: '',
      fecha_inicio: '',
      fecha_fin: '',
      skills: [],
      id_bots: [],
      id_broadcasts: [],
      tipo_reporte: 'detallado',
      texto_buscar: '',
      flujo: '',
      id_formulario: '',
      estado_nota: '',
      estado_skill: '',
      eliminado_skill: '',
      id_nota_rapida: ''
    });
    setResultados([]);
    sessionStorage.removeItem('rep_filtros');
  };

  // Helper: nombre legible del tipo de reporte
  const getNombreTipoReporte = () => {
    if (filtros.tipo_reporte === 'detallado') return 'Operaciones';
    if (filtros.tipo_reporte === 'grupoq') return 'Grupo Q';
    if (filtros.tipo_reporte === 'broadcast') return 'Broadcast';
    if (filtros.tipo_reporte === 'apinotif') return 'API Notificaciones';
    if (filtros.tipo_reporte === 'numerosactivos') return 'Números Activos';
    if (filtros.tipo_reporte === 'resolpalabra') return 'Resoluciones por Palabra';
    if (filtros.tipo_reporte === 'sesiones') return 'Sesiones';
    if (filtros.tipo_reporte === 'campaniasrep') return 'Campañas';
    if (filtros.tipo_reporte === 'respuestas') return 'Respuestas';
    if (filtros.tipo_reporte === 'notasrapidas') return 'Notas Rápidas';
    if (filtros.tipo_reporte === 'skills') return 'Skills';
    if (filtros.tipo_reporte === 'recontactos-programados') return 'Recontactos Programados';
    return 'Resoluciones';
  };

  // Helper: formatear fecha "YYYY-MM-DD" a "04 de mayo 2026"
  const formatearFechaEs = (fechaStr) => {
    if (!fechaStr) return '';
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const [yyyy, mm, dd] = fechaStr.split('-');
    return `${dd} de ${meses[parseInt(mm, 10) - 1]} ${yyyy}`;
  };

  // Helper: fecha de hoy en formato "04 de mayo 2026"
  const fechaHoyEs = () => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return formatearFechaEs(`${yyyy}-${mm}-${dd}`);
  };

  // Helper: nombre del archivo con formato descriptivo
  const getNombreArchivo = (ext) => {
    const sanitize = (s) => s.replace(/[\\/:*?"<>|]/g, '').trim();

    // Caso especial Grupo Q: "Reporte de Operaciones - Grupo Q - [rango seleccionado]"
    if (filtros.tipo_reporte === 'grupoq') {
      const ini = formatearFechaEs(filtros.fecha_inicio);
      const fin = formatearFechaEs(filtros.fecha_fin);
      const rango = ini === fin ? ini : `${ini} al ${fin}`;
      return sanitize(`Reporte de Operaciones - Grupo Q - ${rango}`) + `.${ext}`;
    }

    const nombreReporte = getNombreTipoReporte();
    const empresaObj = empresas.find(e => String(e.ID_EMPRESA) === String(filtros.id_empresa));
    const empresaNombre = empresaObj?.NOMBRE || 'Empresa';
    const fechaInicioFmt = formatearFechaEs(filtros.fecha_inicio);
    const fechaFinFmt = formatearFechaEs(filtros.fecha_fin);
    const rango = fechaInicioFmt === fechaFinFmt 
      ? fechaInicioFmt 
      : `${fechaInicioFmt} al ${fechaFinFmt}`;
    return sanitize(`Reporte de ${nombreReporte} - ${empresaNombre} - ${rango}`) + `.${ext}`;
  };

  // Exportar a CSV con BOM UTF-8 (para emojis y caracteres especiales)
  // Grupo Q: separador ; sin comillas (requisito del cliente)
  // Otros: separador , con comillas estandar RFC 4180
  const exportarCSV = () => {
    if (resultados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    
    const esGrupoQ = filtros.tipo_reporte === 'grupoq';
    const separador = esGrupoQ ? ';' : ',';
    const headers = Object.keys(resultados[0]);

    // Para Grupo Q: limpiar valor (sin comillas) - los datos ya vienen sanitizados desde SQL
    // Para otros: escapar con comillas estandar
    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (esGrupoQ) {
        // Sin comillas: eliminar caracteres que rompen el CSV (saltos de linea, separador y comas)
        return str.replace(/[\r\n]+/g, ' ').replace(/;/g, ':').replace(/,/g, '.');
      }
      // CSV estandar: envolver en comillas si contiene coma, comilla o salto de linea
      if (/[",\n\r]/.test(str)) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      headers.map(escapeCsv).join(separador),
      ...resultados.map(row => headers.map(h => escapeCsv(row[h])).join(separador))
    ].join('\r\n');
    
    // BOM UTF-8 para que Excel reconozca correctamente los emojis y acentos
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = getNombreArchivo('csv');
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('CSV exportado correctamente');
  };

  // Exportar a XLSX (Excel) con tabla nativa estilo "Aguamarina, Estilo de tabla medio 6"
  const exportarXLSX = async () => {
    if (resultados.length === 0) {
      toast.error('No hay datos para exportar');
      return;
    }
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = 'TalkMe Soporte';
      wb.created = new Date();

      const sheetName = getNombreTipoReporte();
      const ws = wb.addWorksheet(sheetName);

      // Columnas a partir de las claves del primer registro
      const headers = Object.keys(resultados[0]);

      // Función para convertir string DD/MM/YYYY HH:MM:SS a Excel Date Serial Number
      const parseToExcelDate = (str) => {
        if (!str || typeof str !== 'string') return str;
        const parts = str.split(' ');
        const datePart = parts[0]; // 01/05/2026
        const timePart = parts[1] || '00:00:00'; // 22:54:00
        const [day, month, year] = datePart.split('/').map(Number);
        const [hour, minute, second] = timePart.split(':').map(Number);

        // Calcular días desde 01/01/1900 (sin zona horaria)
        // Contar días manualmente para evitar problemas de zona horaria
        const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

        // Verificar si es año bisiesto
        const isLeapYear = (y) => ((y % 4 === 0) && (y % 100 !== 0)) || (y % 400 === 0);

        // Calcular días desde el año 1900 hasta el año actual
        let totalDays = 0;
        for (let y = 1900; y < year; y++) {
          totalDays += isLeapYear(y) ? 366 : 365;
        }

        // Ajustar febrero si el año actual es bisiesto
        if (isLeapYear(year)) daysInMonth[1] = 29;

        // Sumar días de los meses anteriores del año actual
        for (let m = 0; m < month - 1; m++) {
          totalDays += daysInMonth[m];
        }

        // Sumar días del mes actual
        totalDays += day - 1;

        // Excel serial: 1 = 01/01/1900, pero Excel tiene bug del año bisiesto 1900
        // Excel piensa que 1900 fue bisiesto, así que las fechas desde 01/03/1900 en adelante
        // están desplazadas 1 día. Sumamos 1 para compensar.
        const excelSerial = totalDays + 2; // +1 por bug 1900, +1 porque Excel cuenta desde 0

        // Calcular fracción del día (hora)
        const timeFraction = (hour * 3600 + minute * 60 + second) / 86400;

        return excelSerial + timeFraction;
      };

      // Filas como arrays en el mismo orden que headers
      const rows = resultados.map(r => headers.map(h => {
        const v = r[h];
        if (v === null || v === undefined) return '';

        // Convertir TS 1er Respuesta a Excel Date Serial Number
        if (h === 'TS 1er Respuesta' && typeof v === 'string' && v.includes('/')) {
          return parseToExcelDate(v);
        }

        return v;
      }));

      // Crear Tabla real (Excel ListObject) con estilo TableStyleMedium6 (aguamarina)
      ws.addTable({
        name: 'TablaReporte',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: {
          theme: 'TableStyleMedium6',
          showRowStripes: true,
          showFirstColumn: false,
          showLastColumn: false
        },
        columns: headers.map(h => ({ name: h, filterButton: true })),
        rows
      });

      // Auto-ajustar ancho de columnas (max 50 chars) y aplicar formatos
      headers.forEach((h, i) => {
        const col = ws.getColumn(i + 1);
        let max = h.length;
        for (const row of rows) {
          const cell = row[i];
          const len = cell == null ? 0 : String(cell).length;
          if (len > max) max = len;
        }
        col.width = Math.min(Math.max(max + 2, 10), 50);

        // Aplicar formato de fecha a columna TS 1er Respuesta
        if (h === 'TS 1er Respuesta') {
          col.numFmt = 'dd/mm/yyyy hh:mm';
        }
      });

      // Congelar fila de encabezados
      ws.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = getNombreArchivo('xlsx');
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

  // Skills por defecto (CATY según las consultas)
  const skillsDefault = [9, 26, 39, 43, 71, 102];

  // Estado para dropdown de skills
  const [showSkillsDropdown, setShowSkillsDropdown] = useState(false);
  const [skillsSearch, setSkillsSearch] = useState('');
  const skillsDropdownRef = useRef(null);

  // Estado para dropdown de bots (Broadcast)
  const [showBotsDropdown, setShowBotsDropdown] = useState(false);
  const [botsSearch, setBotsSearch] = useState('');
  const botsDropdownRef = useRef(null);

  // Estado para dropdown de Red Social (Recontactos Programados)
  const [showRedesDropdown, setShowRedesDropdown] = useState(false);
  const [redesSearch, setRedesSearch] = useState('');
  const redesDropdownRef = useRef(null);
  const redesSociales = [
    { ID_RED_SOCIAL: 1, NOMBRE: 'WhatsApp' },
    { ID_RED_SOCIAL: 2, NOMBRE: 'Facebook Messenger' },
    { ID_RED_SOCIAL: 3, NOMBRE: 'Instagram' },
    { ID_RED_SOCIAL: 4, NOMBRE: 'Telegram' }
  ];

  // Estado para dropdown de Operador (Recontactos Programados)
  const [showOperadorDropdown, setShowOperadorDropdown] = useState(false);
  const [operadorSearch, setOperadorSearch] = useState('');
  const operadorDropdownRef = useRef(null);
  const [operadores, setOperadores] = useState([]);

  // Estado para dropdown de Estado (Recontactos Programados)
  const [showEstadoDropdown, setShowEstadoDropdown] = useState(false);
  const estadoDropdownRef = useRef(null);
  const estados = [
    { value: 'programado', label: 'Programado' },
    { value: 'ejecutado', label: 'Ejecutado' },
    { value: 'cancelado', label: 'Cancelado' },
    { value: 'vencido', label: 'Vencido' },
    { value: 'pospuesto', label: 'Pospuesto' }
  ];

  // Estado para dropdown de campañas (Broadcast)
  const [showCampaniasDropdown, setShowCampaniasDropdown] = useState(false);
  const [campaniasSearch, setCampaniasSearch] = useState('');
  const campaniasDropdownRef = useRef(null);

  // Cerrar dropdowns al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (skillsDropdownRef.current && !skillsDropdownRef.current.contains(e.target)) {
        setShowSkillsDropdown(false);
      }
      if (botsDropdownRef.current && !botsDropdownRef.current.contains(e.target)) {
        setShowBotsDropdown(false);
      }
      if (campaniasDropdownRef.current && !campaniasDropdownRef.current.contains(e.target)) {
        setShowCampaniasDropdown(false);
      }
      if (redesDropdownRef.current && !redesDropdownRef.current.contains(e.target)) {
        setShowRedesDropdown(false);
      }
      if (operadorDropdownRef.current && !operadorDropdownRef.current.contains(e.target)) {
        setShowOperadorDropdown(false);
      }
      if (estadoDropdownRef.current && !estadoDropdownRef.current.contains(e.target)) {
        setShowEstadoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Helpers Bots
  const toggleBot = (idBot) => {
    setFiltros(prev => ({
      ...prev,
      id_bots: prev.id_bots.includes(idBot)
        ? prev.id_bots.filter(id => id !== idBot)
        : [...prev.id_bots, idBot],
      id_broadcasts: [] // limpia campañas al cambiar bots
    }));
  };
  const seleccionarTodosBots = () => {
    setFiltros(prev => ({ ...prev, id_bots: bots.map(b => b.ID_BOT), id_broadcasts: [] }));
  };
  const limpiarBots = () => {
    setFiltros(prev => ({ ...prev, id_bots: [], id_broadcasts: [] }));
  };
  const botsFiltrados = bots.filter(b => 
    b.NOMBRE_BOT?.toLowerCase().includes(botsSearch.toLowerCase())
  );

  // Helpers Red Social
  const toggleRedSocial = (idRedSocial) => {
    setFiltros(prev => ({
      ...prev,
      id_redes_sociales: prev.id_redes_sociales.includes(idRedSocial)
        ? prev.id_redes_sociales.filter(id => id !== idRedSocial)
        : [...prev.id_redes_sociales, idRedSocial]
    }));
  };
  const seleccionarTodasRedes = () => {
    setFiltros(prev => ({ ...prev, id_redes_sociales: redesSociales.map(r => r.ID_RED_SOCIAL) }));
  };
  const limpiarRedes = () => {
    setFiltros(prev => ({ ...prev, id_redes_sociales: [] }));
  };
  const redesFiltradas = redesSociales.filter(r => 
    r.NOMBRE.toLowerCase().includes(redesSearch.toLowerCase())
  );

  // Helpers Operador
  const toggleOperador = (operador) => {
    setFiltros(prev => ({
      ...prev,
      creado_por: prev.creado_por === operador ? '' : operador
    }));
  };
  const operadoresFiltrados = operadores.filter(o => 
    o.toLowerCase().includes(operadorSearch.toLowerCase())
  );

  // Helpers Estado
  const toggleEstado = (estado) => {
    setFiltros(prev => ({
      ...prev,
      estado_recontacto: prev.estado_recontacto === estado ? '' : estado
    }));
  };

  // Helpers Campañas
  const toggleCampania = (idBroadcast) => {
    setFiltros(prev => ({
      ...prev,
      id_broadcasts: prev.id_broadcasts.includes(idBroadcast)
        ? prev.id_broadcasts.filter(id => id !== idBroadcast)
        : [...prev.id_broadcasts, idBroadcast]
    }));
  };
  const seleccionarTodasCampanias = () => {
    setFiltros(prev => ({ ...prev, id_broadcasts: campanias.map(c => c.ID_BROADCAST) }));
  };
  const limpiarCampanias = () => {
    setFiltros(prev => ({ ...prev, id_broadcasts: [] }));
  };
  const campaniasFiltradas = campanias.filter(c => {
    const q = campaniasSearch.toLowerCase();
    return c.TITULO?.toLowerCase().includes(q) || c.FECHA_HORA?.toLowerCase().includes(q);
  });

  // Pre-seleccionar skills por defecto cuando se cargan (excepto en reporte de Skills)
  useEffect(() => {
    if (filtros.tipo_reporte === 'skills') return; // No precargar defaults en reporte de Skills
    if (skills.length > 0 && filtros.skills.length === 0) {
      const defaultsAvailable = skills
        .filter(s => skillsDefault.includes(s.ID_SKILL))
        .map(s => s.ID_SKILL);
      if (defaultsAvailable.length > 0) {
        setFiltros(prev => ({ ...prev, skills: defaultsAvailable }));
      }
    }
  }, [skills, filtros.tipo_reporte]);

  const toggleSkill = (idSkill) => {
    setFiltros(prev => ({
      ...prev,
      skills: prev.skills.includes(idSkill)
        ? prev.skills.filter(id => id !== idSkill)
        : [...prev.skills, idSkill]
    }));
  };

  const seleccionarTodosSkills = () => {
    setFiltros(prev => ({ ...prev, skills: skills.map(s => s.ID_SKILL) }));
  };

  const limpiarSkills = () => {
    setFiltros(prev => ({ ...prev, skills: [] }));
  };

  const skillsFiltrados = skills.filter(s => 
    s.NOMBRE_SKILL?.toLowerCase().includes(skillsSearch.toLowerCase())
  );

  // Paginacion: calcular filas a mostrar y total de paginas (memoizado)
  const totalPaginas = Math.max(1, Math.ceil(resultados.length / FILAS_POR_PAGINA));
  const paginaSegura = Math.min(paginaActual, totalPaginas);
  const filasVisibles = useMemo(() => {
    const inicio = (paginaSegura - 1) * FILAS_POR_PAGINA;
    return resultados.slice(inicio, inicio + FILAS_POR_PAGINA);
  }, [resultados, paginaSegura]);
  const headersResultados = useMemo(() => 
    resultados.length > 0 ? Object.keys(resultados[0]) : []
  , [resultados]);

  return (
    <div id="modulo-reportes-root" className="dashboard">
      {/* Topbar con filtros */}
      <div className="rep-topbar">
        {/* Logo */}
        <div className="rep-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="rep-topbar-logo-img" />
        </div>

        <div className="rep-topbar-divider" />

        {/* Base de datos */}
        <div className="rep-topbar-field">
          <span className="rep-topbar-label">Base de datos</span>
          <select
            className="rep-topbar-select"
            value={filtros.db_key}
            onChange={(e) => setFiltros({...filtros, db_key: e.target.value})}
          >
            {Object.entries(DB_NAMES).map(([key, name]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>

        {/* Empresa */}
        <div className="rep-topbar-field">
          <span className="rep-topbar-label">
            Empresa {loading.empresas && '⌛'}
            {REPORTES_EMPRESA_OPCIONAL.includes(filtros.tipo_reporte) && (
              <span style={{ fontWeight: 400, color: '#94a3b8', fontSize: 10 }}> (opcional)</span>
            )}
          </span>
          <select
            className="rep-topbar-select"
            value={filtros.id_empresa}
            onChange={(e) => setFiltros({...filtros, id_empresa: e.target.value})}
            disabled={!filtros.db_key || loading.empresas}
          >
            <option value="">
              {REPORTES_EMPRESA_OPCIONAL.includes(filtros.tipo_reporte) ? 'Todas...' : 'Seleccionar...'}
            </option>
            {empresas.map(emp => (
              <option key={emp.ID_EMPRESA} value={emp.ID_EMPRESA}>{emp.NOMBRE}</option>
            ))}
          </select>
        </div>

        {/* Fecha inicio */}
        {!REPORTES_SIN_FECHAS.includes(filtros.tipo_reporte) && (
        <div className="rep-topbar-field">
          <span className="rep-topbar-label">Fecha inicio</span>
          <input
            type="date"
            className="rep-topbar-input"
            value={filtros.fecha_inicio}
            onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
          />
        </div>
        )}

        {/* Fecha fin */}
        {!REPORTES_SIN_FECHAS.includes(filtros.tipo_reporte) && (
        <div className="rep-topbar-field">
          <span className="rep-topbar-label">Fecha fin</span>
          <input
            type="date"
            className="rep-topbar-input"
            value={filtros.fecha_fin}
            onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
          />
        </div>
        )}

        {/* Bot - dropdown con busqueda y multi-select (Operaciones, Resoluciones, API Notif, Respuestas, Campañas, Recontactos Programados) */}
        {['detallado', 'resumido', 'apinotif', 'respuestas', 'campaniasrep', 'recontactos-programados'].includes(filtros.tipo_reporte) && (
          <div className="rep-topbar-field rep-skills-field" ref={botsDropdownRef}>
            <span className="rep-topbar-label">Bot {loading.bots && '⌛'}</span>
            <button
              type="button"
              className="rep-topbar-select rep-skills-trigger"
              onClick={() => setShowBotsDropdown(!showBotsDropdown)}
              disabled={!filtros.id_empresa || loading.bots}
            >
              {filtros.id_bots.length === 0
                ? 'Todos los bots'
                : `${filtros.id_bots.length} bot${filtros.id_bots.length !== 1 ? 's' : ''} seleccionado${filtros.id_bots.length !== 1 ? 's' : ''}`}
              <span className="rep-skills-arrow">▼</span>
            </button>
            {showBotsDropdown && (
              <div className="rep-skills-dropdown">
                <div className="rep-skills-dropdown-header">
                  <input
                    type="text"
                    className="rep-skills-search"
                    placeholder="🔍 Buscar bot..."
                    value={botsSearch}
                    onChange={(e) => setBotsSearch(e.target.value)}
                  />
                  <div className="rep-skills-actions">
                    <button type="button" className="rep-skills-action-btn" onClick={seleccionarTodosBots}>Todos</button>
                    <button type="button" className="rep-skills-action-btn" onClick={limpiarBots}>Ninguno</button>
                  </div>
                </div>
                <div className="rep-skills-list">
                  {botsFiltrados.length === 0 ? (
                    <div className="rep-skills-empty">No hay bots disponibles</div>
                  ) : (
                    botsFiltrados.map(bot => (
                      <label key={bot.ID_BOT} className="rep-skills-item">
                        <input
                          type="checkbox"
                          checked={filtros.id_bots.includes(bot.ID_BOT)}
                          onChange={() => toggleBot(bot.ID_BOT)}
                        />
                        <span className="rep-skills-item-name">{bot.NOMBRE_BOT}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Filtros adicionales para Recontactos Programados */}
        {filtros.tipo_reporte === 'recontactos-programados' && (
          <>
            {/* Red Social - dropdown estilo Bot */}
            <div className="rep-topbar-field rep-skills-field" ref={redesDropdownRef}>
              <span className="rep-topbar-label">Red Social</span>
              <button
                type="button"
                className="rep-topbar-select rep-skills-trigger"
                onClick={() => setShowRedesDropdown(!showRedesDropdown)}
              >
                {filtros.id_redes_sociales.length === 0
                  ? 'Todas las redes'
                  : `${filtros.id_redes_sociales.length} red${filtros.id_redes_sociales.length !== 1 ? 'es' : ''} seleccionada${filtros.id_redes_sociales.length !== 1 ? 's' : ''}`}
                <span className="rep-skills-arrow">▼</span>
              </button>
              {showRedesDropdown && (
                <div className="rep-skills-dropdown">
                  <div className="rep-skills-dropdown-header">
                    <input
                      type="text"
                      className="rep-skills-search"
                      placeholder="🔍 Buscar red..."
                      value={redesSearch}
                      onChange={(e) => setRedesSearch(e.target.value)}
                    />
                    <div className="rep-skills-actions">
                      <button type="button" className="rep-skills-action-btn" onClick={seleccionarTodasRedes}>Todas</button>
                      <button type="button" className="rep-skills-action-btn" onClick={limpiarRedes}>Ninguna</button>
                    </div>
                  </div>
                  <div className="rep-skills-list">
                    {redesFiltradas.map(red => (
                      <label key={red.ID_RED_SOCIAL} className="rep-skills-item">
                        <input
                          type="checkbox"
                          checked={filtros.id_redes_sociales.includes(red.ID_RED_SOCIAL)}
                          onChange={() => toggleRedSocial(red.ID_RED_SOCIAL)}
                        />
                        <span className="rep-skills-item-name">{red.NOMBRE}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Operador - dropdown estilo Bot */}
            <div className="rep-topbar-field rep-skills-field" ref={operadorDropdownRef}>
              <span className="rep-topbar-label">Operador</span>
              <button
                type="button"
                className="rep-topbar-select rep-skills-trigger"
                onClick={() => setShowOperadorDropdown(!showOperadorDropdown)}
              >
                {filtros.creado_por ? filtros.creado_por : 'Todos los operadores'}
                <span className="rep-skills-arrow">▼</span>
              </button>
              {showOperadorDropdown && (
                <div className="rep-skills-dropdown">
                  <div className="rep-skills-dropdown-header">
                    <input
                      type="text"
                      className="rep-skills-search"
                      placeholder="🔍 Buscar operador..."
                      value={operadorSearch}
                      onChange={(e) => setOperadorSearch(e.target.value)}
                    />
                  </div>
                  <div className="rep-skills-list">
                    {operadoresFiltrados.length === 0 ? (
                      <div className="rep-skills-empty">No hay operadores disponibles</div>
                    ) : (
                      operadoresFiltrados.map(operador => (
                        <label key={operador} className="rep-skills-item">
                          <input
                            type="radio"
                            name="operador"
                            checked={filtros.creado_por === operador}
                            onChange={() => toggleOperador(operador)}
                          />
                          <span className="rep-skills-item-name">{operador}</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Estado - dropdown estilo Bot */}
            <div className="rep-topbar-field rep-skills-field" ref={estadoDropdownRef}>
              <span className="rep-topbar-label">Estado</span>
              <button
                type="button"
                className="rep-topbar-select rep-skills-trigger"
                onClick={() => setShowEstadoDropdown(!showEstadoDropdown)}
              >
                {filtros.estado_recontacto ? estados.find(e => e.value === filtros.estado_recontacto)?.label : 'Todos los estados'}
                <span className="rep-skills-arrow">▼</span>
              </button>
              {showEstadoDropdown && (
                <div className="rep-skills-dropdown">
                  <div className="rep-skills-list">
                    <label className="rep-skills-item">
                      <input
                        type="radio"
                        name="estado"
                        checked={!filtros.estado_recontacto}
                        onChange={() => toggleEstado('')}
                      />
                      <span className="rep-skills-item-name">Todos</span>
                    </label>
                    {estados.map(estado => (
                      <label key={estado.value} className="rep-skills-item">
                        <input
                          type="radio"
                          name="estado"
                          checked={filtros.estado_recontacto === estado.value}
                          onChange={() => toggleEstado(estado.value)}
                        />
                        <span className="rep-skills-item-name">{estado.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Skills - Dropdown con checkboxes (oculto en Broadcast, API Notif, Notas Rápidas, Sesiones y reportes sin skills) */}
        {!['broadcast', 'apinotif', 'numerosactivos', 'campaniasrep', 'respuestas', 'notasrapidas', 'sesiones', 'skills'].includes(filtros.tipo_reporte) && (
        <div className="rep-topbar-field rep-skills-field" ref={skillsDropdownRef}>
          <span className="rep-topbar-label">Skills {loading.skills && '⌛'}</span>
          <button
            type="button"
            className="rep-topbar-select rep-skills-trigger"
            onClick={() => setShowSkillsDropdown(!showSkillsDropdown)}
            disabled={(!filtros.id_empresa && !REPORTES_EMPRESA_OPCIONAL.includes(filtros.tipo_reporte)) || loading.skills}
          >
            {filtros.skills.length === 0 
              ? 'Seleccionar skills...' 
              : `${filtros.skills.length} skill${filtros.skills.length !== 1 ? 's' : ''} seleccionado${filtros.skills.length !== 1 ? 's' : ''}`}
            <span className="rep-skills-arrow">▼</span>
          </button>
          
          {showSkillsDropdown && (
            <div className="rep-skills-dropdown">
              <div className="rep-skills-dropdown-header">
                <input
                  type="text"
                  className="rep-skills-search"
                  placeholder="🔍 Buscar skill..."
                  value={skillsSearch}
                  onChange={(e) => setSkillsSearch(e.target.value)}
                />
                <div className="rep-skills-actions">
                  <button 
                    type="button" 
                    className="rep-skills-action-btn"
                    onClick={seleccionarTodosSkills}
                  >
                    Todos
                  </button>
                  <button 
                    type="button" 
                    className="rep-skills-action-btn"
                    onClick={limpiarSkills}
                  >
                    Ninguno
                  </button>
                </div>
              </div>
              <div className="rep-skills-list">
                {skillsFiltrados.length === 0 ? (
                  <div className="rep-skills-empty">No hay skills disponibles</div>
                ) : (
                  skillsFiltrados.map(skill => (
                    <label key={skill.ID_SKILL} className="rep-skills-item">
                      <input
                        type="checkbox"
                        checked={filtros.skills.includes(skill.ID_SKILL)}
                        onChange={() => toggleSkill(skill.ID_SKILL)}
                      />
                      <span className="rep-skills-item-name">{skill.NOMBRE_SKILL}</span>
                      {skillsDefault.includes(skill.ID_SKILL) && filtros.tipo_reporte !== 'skills' && (
                        <span className="rep-skills-default-badge">★</span>
                      )}
                    </label>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        )}

        {/* Bot - dropdown con busqueda y multi-select (solo Broadcast) */}
        {filtros.tipo_reporte === 'broadcast' && (
          <div className="rep-topbar-field rep-skills-field" ref={botsDropdownRef}>
            <span className="rep-topbar-label">Bot {loading.bots && '⌛'}</span>
            <button
              type="button"
              className="rep-topbar-select rep-skills-trigger"
              onClick={() => setShowBotsDropdown(!showBotsDropdown)}
              disabled={!filtros.id_empresa || loading.bots}
            >
              {filtros.id_bots.length === 0
                ? 'Seleccionar bots...'
                : `${filtros.id_bots.length} bot${filtros.id_bots.length !== 1 ? 's' : ''} seleccionado${filtros.id_bots.length !== 1 ? 's' : ''}`}
              <span className="rep-skills-arrow">▼</span>
            </button>
            {showBotsDropdown && (
              <div className="rep-skills-dropdown">
                <div className="rep-skills-dropdown-header">
                  <input
                    type="text"
                    className="rep-skills-search"
                    placeholder="🔍 Buscar bot..."
                    value={botsSearch}
                    onChange={(e) => setBotsSearch(e.target.value)}
                  />
                  <div className="rep-skills-actions">
                    <button type="button" className="rep-skills-action-btn" onClick={seleccionarTodosBots}>
                      Todos
                    </button>
                    <button type="button" className="rep-skills-action-btn" onClick={limpiarBots}>
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="rep-skills-list">
                  {botsFiltrados.length === 0 ? (
                    <div className="rep-skills-empty">No hay bots disponibles</div>
                  ) : (
                    botsFiltrados.map(bot => (
                      <label key={bot.ID_BOT} className="rep-skills-item">
                        <input
                          type="checkbox"
                          checked={filtros.id_bots.includes(bot.ID_BOT)}
                          onChange={() => toggleBot(bot.ID_BOT)}
                        />
                        <span className="rep-skills-item-name">{bot.NOMBRE_BOT}</span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Campañas - dropdown con busqueda y multi-select (solo Broadcast) */}
        {filtros.tipo_reporte === 'broadcast' && (
          <div className="rep-topbar-field rep-skills-field" ref={campaniasDropdownRef}>
            <span className="rep-topbar-label">Campañas {loading.campanias && '⌛'}</span>
            <button
              type="button"
              className="rep-topbar-select rep-skills-trigger"
              onClick={() => setShowCampaniasDropdown(!showCampaniasDropdown)}
              disabled={filtros.id_bots.length === 0 || !filtros.fecha_inicio || !filtros.fecha_fin || loading.campanias}
              title={
                filtros.id_bots.length === 0
                  ? 'Seleccione al menos un bot'
                  : (!filtros.fecha_inicio || !filtros.fecha_fin)
                    ? 'Seleccione el rango de fechas'
                    : `${campanias.length} campañas. Vacío = todas`
              }
            >
              {filtros.id_broadcasts.length === 0
                ? (campanias.length === 0 ? 'Sin campañas' : 'Todas las campañas')
                : `${filtros.id_broadcasts.length} campaña${filtros.id_broadcasts.length !== 1 ? 's' : ''} seleccionada${filtros.id_broadcasts.length !== 1 ? 's' : ''}`}
              <span className="rep-skills-arrow">▼</span>
            </button>
            {showCampaniasDropdown && (
              <div className="rep-skills-dropdown rep-campanias-dropdown">
                <div className="rep-skills-dropdown-header">
                  <input
                    type="text"
                    className="rep-skills-search"
                    placeholder="🔍 Buscar por título o fecha..."
                    value={campaniasSearch}
                    onChange={(e) => setCampaniasSearch(e.target.value)}
                  />
                  <div className="rep-skills-actions">
                    <button type="button" className="rep-skills-action-btn" onClick={seleccionarTodasCampanias}>
                      Todos
                    </button>
                    <button type="button" className="rep-skills-action-btn" onClick={limpiarCampanias}>
                      Ninguno
                    </button>
                  </div>
                </div>
                <div className="rep-skills-list">
                  {campaniasFiltradas.length === 0 ? (
                    <div className="rep-skills-empty">No hay campañas en el rango</div>
                  ) : (
                    campaniasFiltradas.map(c => (
                      <label key={c.ID_BROADCAST} className="rep-skills-item">
                        <input
                          type="checkbox"
                          checked={filtros.id_broadcasts.includes(c.ID_BROADCAST)}
                          onChange={() => toggleCampania(c.ID_BROADCAST)}
                        />
                        <span className="rep-skills-item-name">
                          <strong>{c.FECHA_HORA}</strong> — {c.TITULO}
                          <span style={{ marginLeft: 6, color: '#64748b', fontSize: 11 }}>
                            ({c.TOTAL_NUMEROS})
                          </span>
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Flujo - solo en Resoluciones por Palabra */}
        {filtros.tipo_reporte === 'resolpalabra' && (
          <div className="rep-topbar-field">
            <span className="rep-topbar-label">Flujo</span>
            <select
              className="rep-topbar-select"
              value={filtros.flujo}
              onChange={(e) => setFiltros({ ...filtros, flujo: e.target.value })}
            >
              <option value="">Todos</option>
              <option value="1">Entrante (1)</option>
              <option value="2">Saliente (2)</option>
            </select>
          </div>
        )}

        {/* Formulario - solo en Respuestas (requiere 1 bot seleccionado) */}
        {filtros.tipo_reporte === 'respuestas' && (
          <div className="rep-topbar-field">
            <span className="rep-topbar-label">Formulario {loading.formularios && '⌛'}</span>
            <select
              className="rep-topbar-select"
              value={filtros.id_formulario}
              onChange={(e) => setFiltros({ ...filtros, id_formulario: e.target.value })}
              disabled={formularios.length === 0 || loading.formularios}
            >
              <option value="">{filtros.id_bots.length === 0 ? 'Primero seleccione un bot' : (formularios.length === 0 ? 'Sin formularios' : 'Seleccionar...')}</option>
              {formularios.map(f => (
                <option key={f.ID_BOT_FORMULARIO} value={f.ID_BOT_FORMULARIO}>{f.NOMBRE}</option>
              ))}
            </select>
          </div>
        )}

        {/* Tipo de reporte */}
        <div className="rep-topbar-field">
          <span className="rep-topbar-label">Tipo reporte</span>
          <select
            className="rep-topbar-select"
            value={filtros.tipo_reporte}
            onChange={(e) => setFiltros({ ...filtros, tipo_reporte: e.target.value })}
          >
            <option value="detallado">Operaciones</option>
            <option value="resumido">Resoluciones</option>
            <option value="broadcast">Broadcast</option>
            <option value="apinotif">API Notificaciones</option>
            <option value="numerosactivos">Números Activos</option>
            <option value="resolpalabra">Resoluciones por Palabra</option>
            <option value="sesiones">Sesiones</option>
            <option value="campaniasrep">Campañas</option>
            <option value="respuestas">Respuestas</option>
            <option value="notasrapidas">Notas Rápidas</option>
            <option value="skills">Skills</option>
            <option value="recontactos-programados">Recontactos Programados</option>
            {filtros.db_key === 'db_2' && String(filtros.id_empresa) === '213' && (
              <option value="grupoq">Grupo Q</option>
            )}
          </select>
        </div>

        {/* Acciones */}
        <div className="rep-topbar-divider" />
        <button 
          className="rep-topbar-btn-generar"
          onClick={generarReporte}
          disabled={loading.reporte}
        >
          {loading.reporte ? (
            <span>⏳ Generando...</span>
          ) : (
            <>
              <img src="/assets/Generar.png" alt="" className="rep-btn-icon" />
              <span>Generar</span>
            </>
          )}
        </button>
        {resultados.length > 0 && (
          <>
            <button 
              className="rep-topbar-btn-exportar"
              onClick={exportarXLSX}
              disabled={loading.reporte}
              title="Exportar a Excel"
            >
              <img src="/assets/EXCEL.png" alt="Excel" className="rep-btn-icon" />
              <span>Excel</span>
            </button>
            <button 
              className="rep-topbar-btn-exportar"
              onClick={exportarCSV}
              disabled={loading.reporte}
              title="Exportar a CSV (UTF-8)"
            >
              <img src="/assets/CSV.png" alt="CSV" className="rep-btn-icon" />
              <span>CSV</span>
            </button>
          </>
        )}
        <button className="rep-topbar-clear" onClick={limpiarFiltros} title="Limpiar filtros">
          🧹
        </button>
      </div>

      {/* Barra secundaria: texto a buscar (solo en Resoluciones por Palabra) */}
      {filtros.tipo_reporte === 'resolpalabra' && (
        <div className="rep-subbar">
          <span className="rep-topbar-label" style={{ whiteSpace: 'nowrap' }}>Texto del mensaje</span>
          <input
            type="text"
            className="rep-topbar-input"
            placeholder="Ej: Gracias por compartir sus datos..."
            value={filtros.texto_buscar}
            onChange={(e) => setFiltros({ ...filtros, texto_buscar: e.target.value })}
            style={{ flex: 1, minWidth: 0 }}
          />
        </div>
      )}

      {/* Barra secundaria: filtros para Notas Rápidas */}
      {filtros.tipo_reporte === 'notasrapidas' && (
        <div className="rep-subbar">
          <span className="rep-topbar-label" style={{ whiteSpace: 'nowrap' }}>Nota rápida</span>
          <select
            className="rep-topbar-select"
            value={filtros.id_nota_rapida || ''}
            onChange={(e) => setFiltros({ ...filtros, id_nota_rapida: e.target.value })}
            style={{ flex: 1, minWidth: 0 }}
            disabled={!filtros.db_key || loading.notas}
          >
            <option value="">Todas las notas...</option>
            {notasRapidas.map(nota => (
              <option key={nota.ID_NOTAS_RAPIDAS} value={nota.ID_NOTAS_RAPIDAS}>
                {nota.NOMBRE}
              </option>
            ))}
          </select>
          <span className="rep-topbar-label" style={{ whiteSpace: 'nowrap', marginLeft: '10px' }}>Estado</span>
          <select
            className="rep-topbar-select"
            value={filtros.estado_nota || ''}
            onChange={(e) => setFiltros({ ...filtros, estado_nota: e.target.value })}
            style={{ width: '120px' }}
          >
            <option value="">Todos</option>
            <option value="1">ALTA</option>
            <option value="0">BAJA</option>
          </select>
        </div>
      )}

      {/* Barra secundaria: filtros para Skills */}
      {filtros.tipo_reporte === 'skills' && (
        <div className="rep-subbar">
          <span className="rep-topbar-label" style={{ whiteSpace: 'nowrap' }}>Estado</span>
          <select
            className="rep-topbar-select"
            value={filtros.estado_skill || ''}
            onChange={(e) => setFiltros({ ...filtros, estado_skill: e.target.value })}
            style={{ width: '100px' }}
          >
            <option value="">Todos</option>
            <option value="1">ALTA</option>
            <option value="0">BAJA</option>
          </select>
          <span className="rep-topbar-label" style={{ whiteSpace: 'nowrap', marginLeft: '10px' }}>Eliminado</span>
          <select
            className="rep-topbar-select"
            value={filtros.eliminado_skill || ''}
            onChange={(e) => setFiltros({ ...filtros, eliminado_skill: e.target.value })}
            style={{ width: '120px' }}
          >
            <option value="">Todos</option>
            <option value="0">ACTIVO</option>
            <option value="1">ELIMINADO</option>
          </select>
        </div>
      )}

      {/* Resultados */}
      {resultados.length > 0 && (
        <div className="rep-resultados">
          <div className="rep-table-wrapper">
            <table className="rep-table rep-table-aguamarina">
              <thead>
                <tr>
                  {headersResultados.map(key => (
                    <th key={key}>{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filasVisibles.map((row, idx) => (
                  <tr key={(paginaSegura - 1) * FILAS_POR_PAGINA + idx}>
                    {headersResultados.map((h, i) => (
                      <td key={i} data-column={h}>{row[h] === null || row[h] === undefined ? '' : String(row[h])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginacion */}
          <div className="rep-pagination">
            <button
              className="rep-page-btn"
              onClick={() => setPaginaActual(1)}
              disabled={paginaSegura === 1}
            >
              ⏮ Primera
            </button>
            <button
              className="rep-page-btn"
              onClick={() => setPaginaActual(p => Math.max(1, p - 1))}
              disabled={paginaSegura === 1}
            >
              ◀ Anterior
            </button>
            <span className="rep-page-info">
              Página <strong>{paginaSegura}</strong> de <strong>{totalPaginas}</strong>
              {' '}({((paginaSegura - 1) * FILAS_POR_PAGINA + 1).toLocaleString()} - {Math.min(paginaSegura * FILAS_POR_PAGINA, resultados.length).toLocaleString()} de {resultados.length.toLocaleString()})
            </span>
            <button
              className="rep-page-btn"
              onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}
              disabled={paginaSegura === totalPaginas}
            >
              Siguiente ▶
            </button>
            <button
              className="rep-page-btn"
              onClick={() => setPaginaActual(totalPaginas)}
              disabled={paginaSegura === totalPaginas}
            >
              Última ⏭
            </button>
          </div>
        </div>
      )}

      {/* Pantalla de bienvenida cuando no hay empresa y no hay resultados */}
      {!filtros.id_empresa && resultados.length === 0 && (
        <div className="rep-welcome-screen">
          <div className="rep-welcome-card">
            <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="rep-welcome-logo" />
            <h2 className="rep-welcome-title">📊 Reportes</h2>
            <p className="rep-welcome-text">Selecciona una base de datos y configura los filtros para generar reportes</p>
            <div className="rep-welcome-steps">
              <div className="rep-welcome-step">
                <span className="rep-step-number">1</span>
                <span className="rep-step-text">Selecciona base de datos y empresa</span>
              </div>
              <div className="rep-welcome-step">
                <span className="rep-step-number">2</span>
                <span className="rep-step-text">Configura fechas y skills</span>
              </div>
              <div className="rep-welcome-step">
                <span className="rep-step-number">3</span>
                <span className="rep-step-text">Genera y exporta el reporte</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Reportes;
