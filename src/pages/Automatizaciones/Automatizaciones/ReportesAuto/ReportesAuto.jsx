import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'react-toastify';
import * as schedulerService from '../../../services/reportesAutoService';
import './ReportesAuto.css';

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

// ── Tipos de reporte disponibles ─────────────────
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
    const resultado = await window.electronAPI.selectFolder();
    return resultado;
  } catch {
    return null;
  }
}

// Skills precargados por defecto
const SKILLS_DEFAULT = [9, 26, 39, 43, 71, 102];

// Reglas de filtros por tipo de reporte
const REPORTES_CON_SKILLS   = ['detallado', 'resumido', 'resolpalabra'];
const REPORTES_CON_BOT      = ['detallado', 'resumido', 'broadcast', 'apinotif', 'respuestas', 'campaniasrep'];
const REPORTES_CON_FORMULARIO = ['respuestas'];
const REPORTES_CON_TEXTO    = ['resolpalabra'];
const REPORTES_SIN_EMPRESA  = ['numerosactivos'];
const REPORTES_GRUPOQ_FIXED = ['grupoq']; // db_2 + empresa 213

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
  
  const [skills, setSkills] = useState([]);
  const [skillsSel, setSkillsSel] = useState(reporteInicial?.skills || []);
  const [bots, setBots] = useState([]);
  const [botsSel, setBotsSel] = useState(reporteInicial?.id_bots || []);
  const [formularios, setFormularios] = useState([]);
  const [formularioSel, setFormularioSel] = useState(reporteInicial?.id_formulario || '');
  const [textoBuscar, setTextoBuscar] = useState(reporteInicial?.texto_buscar || '');
  const [flujo, setFlujo] = useState(reporteInicial?.flujo || '');

  const idEmpresaInicial = useRef(esEdicion ? String(reporteInicial?.id_empresa || '') : '');
  const dbKeyPrev = useRef(dbKey);

  // Cargar empresas
  useEffect(() => {
    if (!dbKey) return;
    if (REPORTES_GRUPOQ_FIXED.includes(tipo)) {
      schedulerService.cargarEmpresasParaFiltros('db_2')
        .then(data => { setEmpresas(data); setIdEmpresa('213'); });
      return;
    }
    const usuarioCambioDb = dbKeyPrev.current !== dbKey;
    dbKeyPrev.current = dbKey;
    schedulerService.cargarEmpresasParaFiltros(dbKey)
      .then(data => {
        setEmpresas(data);
        if (usuarioCambioDb) setIdEmpresa('');
        else if (idEmpresaInicial.current) setIdEmpresa(idEmpresaInicial.current);
      });
  }, [dbKey, tipo]);

  const skillsSelInicial  = useRef(reporteInicial?.skills        || []);
  const botsSelInicial    = useRef(reporteInicial?.id_bots       || []);
  const tipoEmpresaPrev = useRef(`${tipo}__${idEmpresa}`);

  // Cargar skills
  useEffect(() => {
    if (!REPORTES_CON_SKILLS.includes(tipo) || !dbKey || !idEmpresa) { setSkills([]); return; }
    const clave = `${tipo}__${idEmpresa}`;
    const usuarioCambio = tipoEmpresaPrev.current !== clave;
    tipoEmpresaPrev.current = clave;
    setSkills([]);
    if (usuarioCambio) setSkillsSel([]);
    schedulerService.cargarSkillsParaFiltros(dbKey, idEmpresa)
      .then(data => {
        setSkills(data);
        if (!usuarioCambio) {
          if (skillsSelInicial.current.length > 0) {
            setSkillsSel(skillsSelInicial.current.map(Number));
          } else if (!esEdicion) {
            const disponibles = data.filter(s => SKILLS_DEFAULT.includes(s.ID_SKILL)).map(s => s.ID_SKILL);
            if (disponibles.length > 0) setSkillsSel(disponibles);
          }
        }
      });
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
    schedulerService.cargarBotsParaFiltros(dbKey, idEmpresa, tipo)
      .then(data => {
        setBots(data);
        if (!usuarioCambio && botsSelInicial.current.length > 0) {
          setBotsSel(botsSelInicial.current.map(Number));
        }
      });
  }, [tipo, dbKey, idEmpresa]);

  // Cargar formularios
  useEffect(() => {
    setFormularioSel(''); setFormularios([]);
    if (!REPORTES_CON_FORMULARIO.includes(tipo) || botsSel.length === 0) return;
    schedulerService.cargarFormulariosParaFiltros(dbKey, botsSel)
      .then(data => setFormularios(data));
  }, [tipo, dbKey, JSON.stringify(botsSel)]);

  // Al cambiar tipo, resetear filtros (solo si NO es edición inicial)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    setSkillsSel([]); setBotsSel([]); setFormularioSel('');
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
        
      await schedulerService.guardarReporte({
        clave, nombre, tipo_reporte: tipo,
        db_key: REPORTES_GRUPOQ_FIXED.includes(tipo) ? 'db_2' : dbKey,
        id_empresa: String(idEmpresa), carpeta: carpeta.trim(), formato,
        skills: skillsSel, id_bots: botsSel,
        id_broadcasts: [], id_formulario: formularioSel,
        texto_buscar: textoBuscar.trim(), flujo: flujo.trim()
      });

      toast.success(esEdicion ? 'Reporte actualizado' : 'Reporte agregado');
      onAgregado();
      onClose();
    } catch (e) { 
      toast.error('Error al guardar reporte: ' + e.message); 
    } finally { 
      setGuardando(false); 
    }
  };

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

          {/* Skills */}
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

          {/* Bots */}
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

          {/* Formulario */}
          {REPORTES_CON_FORMULARIO.includes(tipo) && formularios.length > 0 && (
            <div className="ci-ra-modal-field">
              <label>Formulario</label>
              <select className="ci-ra-select" value={formularioSel} onChange={e => setFormularioSel(e.target.value)}>
                <option value="">— seleccionar —</option>
                {formularios.map(f => <option key={f.ID_FORMULARIO} value={f.ID_FORMULARIO}>{f.NOMBRE}</option>)}
              </select>
            </div>
          )}

          {/* Texto a buscar */}
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

// ── Componente Principal: ContenidoReportesAuto ──────────────────────────────
export default function ReportesAuto() {
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
  const [emailConfig, setEmailConfig] = useState(null);
  
  // Estados para plantillas de correo (tipo Outlook)
  const [templates, setTemplates] = useState([]);
  const [templateActual, setTemplateActual] = useState(null);
  const [modalTemplate, setModalTemplate] = useState(false);
  const [guardandoTemplate, setGuardandoTemplate] = useState(false);
  const [nuevoDestinatarioTemplate, setNuevoDestinatarioTemplate] = useState({ email: '', nombre: '', tipo: 'PARA' });
  
  // Editor de plantillas
  const [plantillaSeleccionada, setPlantillaSeleccionada] = useState(null);
  const [editandoAsunto, setEditandoAsunto] = useState('');
  const [editandoCuerpo, setEditandoCuerpo] = useState('');
  const [editandoReportes, setEditandoReportes] = useState([]);
  const [editandoDestinatarios, setEditandoDestinatarios] = useState([]);
  
  const [nuevoPara, setNuevoPara] = useState({ email: '', nombre: '' });
  const [nuevoCc, setNuevoCc] = useState({ email: '', nombre: '' });
  const [nuevoCco, setNuevoCco] = useState({ email: '', nombre: '' });
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [imagenFirmaPreview, setImagenFirmaPreview] = useState(null);
  const [mostrarCCO, setMostrarCCO] = useState(false);

  function formatearTexto(tag) {
    console.log('formatearTexto', tag);
    const ta = document.querySelector('.ci-ra-email-v2-textarea');
    if (!ta) { console.log('textarea no encontrado'); return; }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = editandoCuerpo.substring(start, end);
    if (selected) {
      setEditandoCuerpo(editandoCuerpo.substring(0, start) + '<' + tag + '>' + selected + '</' + tag + '>' + editandoCuerpo.substring(end));
    } else {
      setEditandoCuerpo(editandoCuerpo + '<' + tag + '></' + tag + '>');
    }
  }

  const cargarConfig = async (silencioso = false) => {
    if (!silencioso) setLoading(true);
    try {
      const data = await schedulerService.obtenerConfig();
      setConfig(data);
    } catch {
      toast.error('Error al cargar configuración');
    } finally {
      if (!silencioso) setLoading(false);
    }
  };

  const cargarHistorial = async () => {
    try {
      const data = await schedulerService.obtenerHistorial();
      setHistorial(data);
    } catch {
      setHistorial([]);
    }
  };

  const cargarEmailConfig = async () => {
    const data = await schedulerService.obtenerEmailConfig();
    setEmailConfig(data);
  };

  const cargarTemplates = async () => {
    if (!config?.id_job) return;
    const data = await schedulerService.obtenerTemplates(config.id_job);
    setTemplates(data);
  };

  const cargarDestinatarios = async () => {
    if (!config?.id_job) return;
    const data = await schedulerService.obtenerDestinatarios(config.id_job);
    // Para el editor Outlook lo manejamos por plantilla seleccionada, pero cargamos los generales si aplica
  };

  useEffect(() => { cargarConfig(); }, []);
  
  useEffect(() => { 
    if (tab === 'historial') cargarHistorial(); 
  }, [tab]);
  
  useEffect(() => { 
    if (tab === 'email' && config?.id_job) {
      cargarEmailConfig();
      cargarTemplates();
      cargarDestinatarios();
    }
  }, [tab, config?.id_job]);

  const seleccionarPlantilla = async (template) => {
    try {
      // Cargar plantilla detallada con sus reportes y destinatarios
      const fullTpl = await schedulerService.obtenerTemplate(template.ID_TEMPLATE);
      setPlantillaSeleccionada(fullTpl);
      setEditandoAsunto(fullTpl.ASUNTO || '');
      setEditandoCuerpo(fullTpl.CUERPO_HTML || '');
      setEditandoReportes(fullTpl.reportes || []);
      setEditandoDestinatarios(fullTpl.destinatarios || []);
      setImagenFirmaPreview(fullTpl.IMAGEN_FIRMA_PATH || null);
    } catch {
      toast.error('Error al cargar detalle de plantilla');
    }
  };

  

  // Seleccionar primera plantilla automáticamente cuando se carguen las templates
  useEffect(() => {
    if (tab === 'email' && templates.length > 0 && !plantillaSeleccionada) {
      seleccionarPlantilla(templates[0]);
    }
  }, [tab, templates, plantillaSeleccionada]);

  const guardarProgramacion = async () => {
    setGuardando(true);
    try {
      const data = await schedulerService.guardarConfig({
        hora: config.hora,
        activo: config.activo
      });
      if (data.ok) {
        data.activo
          ? toast.success(`✅ Scheduler activo — ${config.hora} hora Guatemala`)
          : toast.info('💾 Configuración guardada. Scheduler desactivado.');
      } else {
        toast.error(data.error || 'Error al guardar');
      }
    } catch { 
      toast.error('Error al guardar programación'); 
    } finally { 
      setGuardando(false); 
    }
  };

  const eliminarReporte = async (clave) => {
    setEliminando(clave);
    try {
      await schedulerService.eliminarReporte(clave);
      toast.success('Reporte eliminado');
      cargarConfig(true);
    } catch { 
      toast.error('Error al eliminar'); 
    } finally { 
      setEliminando(null); 
    }
  };

  const setReporte = (clave, campo, valor) => {
    setConfig(prev => ({ 
      ...prev, 
      reportes: prev.reportes.map(r => r.clave === clave ? { ...r, [campo]: valor } : r) 
    }));
  };

  const reintentarReporte = async (id_log) => {
    setReintentando(id_log);
    try {
      const data = await schedulerService.reintentarReporte(id_log);
      toast.success(`✅ ${data.message}`);
      await cargarHistorial();
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

  const toggleReporte = (clave) => {
    setEditandoReportes(prev => 
      prev.includes(clave) ? prev.filter(c => c !== clave) : [...prev, clave]
    );
  };

  const eliminarDestinatarioEdicion = (id) => {
    setEditandoDestinatarios(prev => prev.filter(d => d.id !== id));
  };

  const handleKeyPressDest = (e, tipoDest) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const inputVal = e.target.value.trim();
      if (!inputVal) return;

      const nuevoChip = {
        id: 'new_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        email: inputVal,
        nombre: inputVal.split('@')[0],
        tipo: tipoDest
      };

      setEditandoDestinatarios(prev => [...prev, nuevoChip]);
      
      if (tipoDest === 'PARA') setNuevoPara({ email: '', nombre: '' });
      if (tipoDest === 'CC') setNuevoCc({ email: '', nombre: '' });
      if (tipoDest === 'CCO') setNuevoCco({ email: '', nombre: '' });
      e.target.value = '';
    }
  };

  const cargarImagenFirma = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (upload) => {
      setImagenFirmaPreview(upload.target.result);
    };
    reader.readAsDataURL(file);
  };

  const guardarCambiosPlantilla = async () => {
    if (!plantillaSeleccionada) return;
    setGuardandoCambios(true);
    try {
      const data = await schedulerService.guardarTemplate({
        id_template: plantillaSeleccionada.ID_TEMPLATE,
        id_job: config.id_job,
        nombre: plantillaSeleccionada.NOMBRE_TEMPLATE,
        asunto: editandoAsunto,
        cuerpo_html: limpiarHTML(editandoCuerpo),
        firma_html: plantillaSeleccionada.FIRMA_HTML || '',
        imagen_firma_path: imagenFirmaPreview,
        reportes: editandoReportes,
        destinatarios: editandoDestinatarios
      });
      toast.success('Plantilla de email guardada con éxito');
      cargarTemplates();
    } catch (e) {
      toast.error('Error al guardar plantilla: ' + e.message);
    } finally {
      setGuardandoCambios(false);
    }
  };

  const nuevaPlantillaInline = async () => {
    try {
      const data = await schedulerService.guardarTemplate({
        id_job: config.id_job,
        nombre: 'Nueva plantilla',
        asunto: 'Reporte diario',
        cuerpo_html: '<p>Buenos días, adjunto reporte diario.</p>',
        firma_html: '',
        reportes: [],
        destinatarios: []
      });
      toast.success('Nueva plantilla creada');
      cargarTemplates();
      // Auto-seleccionar la recién creada
      if (data.id_template) {
        seleccionarPlantilla({ ID_TEMPLATE: data.id_template });
      }
    } catch (e) {
      toast.error('Error al crear plantilla: ' + e.message);
    }
  };

  const eliminarPlantillaSeleccionada = async () => {
    if (!plantillaSeleccionada) return;
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta plantilla?')) return;
    try {
      await schedulerService.eliminarTemplate(plantillaSeleccionada.ID_TEMPLATE);
      toast.success('Plantilla eliminada');
      setPlantillaSeleccionada(null);
      cargarTemplates();
    } catch (e) {
      toast.error('Error al eliminar plantilla: ' + e.message);
    }
  };

  // Función para limpiar HTML del contenteditable
  const limpiarHTML = (html) => {
    // Reemplazar &nbsp; con espacio normal
    let limpio = html.replace(/&nbsp;/g, ' ');
    // Convertir saltos de línea en <br> tags
    limpio = limpio.replace(/\n/g, '<br>');
    // Reemplazar múltiples espacios con un solo espacio (pero no dentro de tags)
    limpio = limpio.replace(/([^>])\s+([^<])/g, '$1 $2');
    return limpio;
  };

  // Función para insertar variable en la posición del cursor del contenteditable
  const insertarVariable = (texto) => {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      const textNode = document.createTextNode(texto);
      range.insertNode(textNode);
      range.setStartAfter(textNode);
      range.setEndAfter(textNode);
      selection.removeAllRanges();
      selection.addRange(range);
      setEditandoCuerpo(document.querySelector('.ci-ra-email-v2-textarea').innerHTML);
    } else {
      setEditandoCuerpo(editandoCuerpo + texto);
    }
  };

  const togglePlantillaActivo = async (idTemplate, activo) => {
    try {
      const res = await fetchWithAuth(API_URLS.schedulerToggleTemplateActivo(idTemplate), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo })
      });
      
      if (!res.ok) {
        throw new Error('Error al cambiar estado de plantilla');
      }
      
      const data = await res.json();
      
      // Actualizar estado local de la plantilla seleccionada
      if (plantillaSeleccionada?.ID_TEMPLATE === idTemplate) {
        setPlantillaSeleccionada({
          ...plantillaSeleccionada,
          ACTIVO: activo ? 1 : 0
        });
      }
      
      // Recargar lista de templates
      await cargarTemplates();
      
      toast.success(activo ? 'Plantilla activada' : 'Plantilla desactivada');
    } catch (err) {
      console.error('Error al cambiar estado de plantilla:', err);
      toast.error('Error al cambiar estado: ' + err.message);
    }
  };

  const agregarDestinatarioTemplate = () => {
    if (!nuevoDestinatarioTemplate.email) return toast.error('Ingresa un email');
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

  const abrirNuevaPlantillaModal = () => {
    setTemplateActual({
      nombre: '',
      asunto: '',
      cuerpo_html: '',
      firma_html: '',
      reportes: [],
      destinatarios: []
    });
    setModalTemplate(true);
  };

  const abrirEditarPlantillaModal = () => {
    if (!plantillaSeleccionada) return;
    setTemplateActual({
      id_template: plantillaSeleccionada.ID_TEMPLATE,
      nombre: plantillaSeleccionada.NOMBRE_TEMPLATE,
      asunto: editandoAsunto,
      cuerpo_html: editandoCuerpo,
      firma_html: plantillaSeleccionada.FIRMA_HTML || '',
      imagen_firma_path: imagenFirmaPreview,
      reportes: editandoReportes,
      destinatarios: editandoDestinatarios
    });
    setModalTemplate(true);
  };

  const guardarTemplate = async () => {
    if (!templateActual.nombre) return toast.error('Ingresa un nombre para la plantilla');
    setGuardandoTemplate(true);
    try {
      await schedulerService.guardarTemplate({
        id_template: templateActual.id_template,
        id_job: config.id_job,
        nombre: templateActual.nombre,
        asunto: templateActual.asunto,
        cuerpo_html: templateActual.cuerpo_html,
        firma_html: templateActual.firma_html || '',
        imagen_firma_path: templateActual.imagen_firma_path || null,
        reportes: templateActual.reportes || [],
        destinatarios: templateActual.destinatarios || []
      });
      toast.success('Plantilla guardada');
      setModalTemplate(false);
      setTemplateActual(null);
      cargarTemplates();
    } catch (e) {
      toast.error('Error al guardar plantilla: ' + e.message);
    } finally {
      setGuardandoTemplate(false);
    }
  };

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

  if (loading) return <div className="ci-state-center"><div className="ci-spinner" /><p>Cargando configuración...</p></div>;
  if (!config) return null;

  return (
    <div className="ci-ra-root">
      {modalAgregar && <ModalAgregarReporte dbKey="db_8" onClose={() => setModalAgregar(false)} onAgregado={() => cargarConfig(true)} />}
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
                <button className="ci-ra-btn-save" onClick={guardarProgramacion} disabled={guardando}>
                  {guardando ? '⏳ Guardando...' : '💾 Guardar programación'}
                </button>
              </div>
            </div>
          </div>

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
                      {t.ACTIVO === 1 ? '✅' : '🔒'} {t.NOMBRE_TEMPLATE} ({t.CANT_DESTINATARIOS || 0} destinatarios)
                    </option>
                  ))}
                </select>
              </div>
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
              <button className="ci-ra-btn-v2-secondary" onClick={nuevaPlantillaInline}>➕ Nueva</button>
              {plantillaSeleccionada && (
                <>
                  <button className="ci-ra-btn-v2-primary" onClick={guardarCambiosPlantilla} disabled={guardandoCambios}>
                    {guardandoCambios ? '⏳ Guardando...' : '💾 Guardar'}
                  </button>
                  <button className="ci-ra-btn-v2-danger" onClick={eliminarPlantillaSeleccionada}>🗑️ Eliminar</button>
                  <div className="ci-ra-email-v2-activo-toggle">
                    <label className="ci-ra-email-v2-toggle-label">
                      <input
                        type="checkbox"
                        checked={plantillaSeleccionada.ACTIVO === 1}
                        onChange={(e) => togglePlantillaActivo(plantillaSeleccionada.ID_TEMPLATE, e.target.checked)}
                        className="ci-ra-email-v2-toggle-checkbox"
                      />
                      <span className="ci-ra-email-v2-toggle-slider"></span>
                      <span className="ci-ra-email-v2-toggle-text">
                        {plantillaSeleccionada.ACTIVO === 1 ? 'Activa' : 'Inactiva'}
                      </span>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {plantillaSeleccionada ? (
            <div className="ci-ra-email-v2-content">
              <div className="ci-ra-email-v2-editor">
                <div className="ci-ra-email-v2-editor-content">
                  <div className="ci-ra-email-v2-field">
                    <label className="ci-ra-email-v2-field-label">De</label>
                    <div className="ci-ra-email-v2-from-box">
                      <span className="ci-ra-email-v2-from-name">{emailConfig?.fromName || 'Soporte TalkMe'}</span>
                      <span className="ci-ra-email-v2-from-email">&lt;{emailConfig?.fromEmail || 'soporte@talkme.pro'}&gt;</span>
                    </div>
                  </div>

                  <div className="ci-ra-email-v2-dest-section">
                    <div className="ci-ra-email-v2-dest-row">
                      <label className="ci-ra-email-v2-dest-label">Para</label>
                      <div className="ci-ra-email-v2-recipients-container">
                        {editandoDestinatarios.filter(d => d.tipo === 'PARA').map((d) => (
                          <span key={d.id} className="ci-ra-email-v2-chip ci-ra-email-v2-chip-para">
                            <span className="ci-ra-email-v2-chip-name">{d.nombre || d.email}</span>
                            <span className="ci-ra-email-v2-chip-email">&lt;{d.email}&gt;</span>
                            <button className="ci-ra-email-v2-chip-remove" onClick={() => eliminarDestinatarioEdicion(d.id)}>×</button>
                          </span>
                        ))}
                        <input type="email" className="ci-ra-email-v2-chip-input" placeholder={editandoDestinatarios.filter(d => d.tipo === 'PARA').length === 0 ? 'Agregar destinatarios...' : ''}
                          onKeyPress={(e) => handleKeyPressDest(e, 'PARA')} />
                      </div>
                    </div>
                    <div className="ci-ra-email-v2-dest-row ci-ra-email-v2-dest-row-cc">
                      <label className="ci-ra-email-v2-dest-label">CC</label>
                      <div className="ci-ra-email-v2-recipients-container">
                        {editandoDestinatarios.filter(d => d.tipo === 'CC').map((d) => (
                          <span key={d.id} className="ci-ra-email-v2-chip ci-ra-email-v2-chip-cc">
                            <span className="ci-ra-email-v2-chip-name">{d.nombre || d.email}</span>
                            <span className="ci-ra-email-v2-chip-email">&lt;{d.email}&gt;</span>
                            <button className="ci-ra-email-v2-chip-remove" onClick={() => eliminarDestinatarioEdicion(d.id)}>×</button>
                          </span>
                        ))}
                        <input type="email" className="ci-ra-email-v2-chip-input" placeholder={editandoDestinatarios.filter(d => d.tipo === 'CC').length === 0 ? 'Agregar CC...' : ''}
                          onKeyPress={(e) => handleKeyPressDest(e, 'CC')} />
                      </div>
                      {!mostrarCCO && (
                        <button className="ci-ra-email-v2-cc-toggle" onClick={() => setMostrarCCO(true)} title="Agregar CCO">CCO</button>
                      )}
                    </div>
                    {mostrarCCO && (
                      <div className="ci-ra-email-v2-dest-row ci-ra-email-v2-dest-row-cc">
                        <label className="ci-ra-email-v2-dest-label">CCO</label>
                        <div className="ci-ra-email-v2-recipients-container">
                          {editandoDestinatarios.filter(d => d.tipo === 'CCO').map((d) => (
                            <span key={d.id} className="ci-ra-email-v2-chip ci-ra-email-v2-chip-cco">
                              <span className="ci-ra-email-v2-chip-name">{d.nombre || d.email}</span>
                              <span className="ci-ra-email-v2-chip-email">&lt;{d.email}&gt;</span>
                              <button className="ci-ra-email-v2-chip-remove" onClick={() => eliminarDestinatarioEdicion(d.id)}>×</button>
                            </span>
                          ))}
                          <input type="email" className="ci-ra-email-v2-chip-input" placeholder={editandoDestinatarios.filter(d => d.tipo === 'CCO').length === 0 ? 'Agregar CCO...' : ''}
                            onKeyPress={(e) => handleKeyPressDest(e, 'CCO')} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ci-ra-email-v2-field">
                    <label className="ci-ra-email-v2-field-label">Asunto</label>
                    <input type="text" className="ci-ra-email-v2-input" value={editandoAsunto}
                      onChange={(e) => setEditandoAsunto(e.target.value)} placeholder="Reporte de {TIPO_REPORTE} - {EMPRESA} {FECHA}" />
                  </div>

                  <div className="ci-ra-email-v2-attachments">
                    <div className="ci-ra-email-v2-attachments-header">
                      <label className="ci-ra-email-v2-field-label">📎 Reportes Adjuntos</label>
                      <span className="ci-ra-email-v2-attachments-count">
                        {editandoReportes.length} seleccionados
                      </span>
                    </div>
                    <div className="ci-ra-email-v2-attachments-grid">
                      {config?.reportes?.filter(r => r.activo).map(r => (
                        <label key={r.clave} className={`ci-ra-email-v2-attachment-item ${editandoReportes.includes(r.clave) ? 'selected' : ''}`}>
                          <input type="checkbox" checked={editandoReportes.includes(r.clave)} onChange={() => toggleReporte(r.clave)} />
                          <span className="ci-ra-email-v2-attachment-name">{r.nombre}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="ci-ra-email-v2-field">
                    <label className="ci-ra-email-v2-field-label">📝 Cuerpo del Correo</label>
                    <div className="ci-ra-email-v2-body-section">
                      <div className="ci-ra-email-v2-toolbar">
                        <button className="ci-ra-email-v2-toolbar-btn" onClick={() => document.execCommand('bold')}>B</button>
                        <button className="ci-ra-email-v2-toolbar-btn" onClick={() => document.execCommand('italic')}>I</button>
                        <button className="ci-ra-email-v2-toolbar-btn" onClick={() => document.execCommand('underline')}>U</button>
                        <span className="ci-ra-email-v2-toolbar-sep"></span>
                        <div className="ci-ra-email-v2-toolbar-vars">
                          <button className="ci-ra-email-v2-toolbar-var" onClick={() => insertarVariable('{FECHA}')}>{'{FECHA}'}</button>
                          <button className="ci-ra-email-v2-toolbar-var" onClick={() => insertarVariable('{TIPO_REPORTE}')}>{'{TIPO}'}</button>
                          <button className="ci-ra-email-v2-toolbar-var" onClick={() => insertarVariable('{EMPRESA}')}>{'{EMPRESA}'}</button>
                        </div>
                      </div>
                      <div
                        className="ci-ra-email-v2-textarea"
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        onInput={(e) => setEditandoCuerpo(e.target.innerHTML)}
                        dangerouslySetInnerHTML={{ __html: editandoCuerpo }}
                        placeholder="Escribe el cuerpo del correo..."
                        style={{ minHeight: '200px' }}
                      />
                    </div>
                  </div>

                  <div className="ci-ra-email-v2-signature">
                    <label className="ci-ra-email-v2-field-label">✒️ Firma (Imagen)</label>
                    <div className="ci-ra-email-v2-signature-upload">
                      <input
                        type="text"
                        className="ci-ra-email-v2-input"
                        style={{ flex: 1, minWidth: '200px' }}
                        value={imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH || ''}
                        onChange={(e) => setImagenFirmaPreview(e.target.value)}
                        placeholder="Ingresa URL de imagen (ej: https://s3...)"
                      />
                      <label className="ci-ra-email-v2-file-label">
                        📁 Subir archivo
                        <input
                          type="file"
                          accept="image/*"
                          onChange={cargarImagenFirma}
                          className="ci-ra-email-v2-file-input"
                          style={{ display: 'none' }}
                        />
                      </label>
                      {(imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH) && (
                        <button className="ci-ra-btn-v2-icon" onClick={() => setImagenFirmaPreview(null)} title="Quitar firma">🗑️</button>
                      )}
                    </div>
                    {(imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH) && (
                      <div className="ci-ra-email-v2-signature-preview">
                        <img src={imagenFirmaPreview || plantillaSeleccionada?.IMAGEN_FIRMA_PATH} alt="Firma" className="ci-ra-email-v2-signature-img" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="ci-ra-email-v2-preview">
                <div className="ci-ra-email-v2-preview-header">
                  <span className="ci-ra-email-v2-preview-title">👁️ Vista Previa</span>
                </div>
                <div className="ci-ra-email-v2-preview-content">
                  <div className="ci-ra-email-v2-preview-frame">
                    <div className="ci-ra-email-v2-preview-email-header">
                      <div className="ci-ra-email-v2-preview-field">
                        <span className="ci-ra-email-v2-preview-label">De:</span>
                        <span className="ci-ra-email-v2-preview-value">
                          <strong>{emailConfig?.fromName || 'Soporte TalkMe'}</strong> &lt;{emailConfig?.fromEmail || 'soporte@talkme.pro'}&gt;
                        </span>
                      </div>
                      <div className="ci-ra-email-v2-preview-field">
                        <span className="ci-ra-email-v2-preview-label">Para:</span>
                        <span className="ci-ra-email-v2-preview-value">
                          {editandoDestinatarios.filter(d => d.tipo === 'PARA').map(d => d.email).join(', ') || 'Sin destinatarios'}
                        </span>
                      </div>
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
                            {editandoReportes.map(clave => (
                              <span key={clave} className="ci-ra-email-v2-preview-attachment-tag">📎 {config.reportes.find(r => r.clave === clave)?.nombre || clave}</span>
                            ))}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="ci-ra-email-v2-preview-body" dangerouslySetInnerHTML={{
                      __html: (() => {
                        const hoy = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                        const nombresReportes = getNombresReportes(editandoReportes);
                        return editandoCuerpo
                          .replace(/\n/g, '<br>')
                          .replace(/{FECHA}/g, hoy)
                          .replace(/{TIPO_REPORTE}/g, nombresReportes)
                          .replace(/{EMPRESA}/g, 'Empresa');
                      })()
                    }} />
                    {imagenFirmaPreview && (
                      <div className="ci-ra-email-v2-preview-signature">
                        <img src={imagenFirmaPreview} alt="Firma" style={{ maxWidth: '100%', maxHeight: '200px' }} />
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
              <button className="ci-ra-btn-v2-primary" onClick={nuevaPlantillaInline}>➕ Crear Plantilla</button>
            </div>
          )}
        </div>
      )}

      {/* ══ TAB: HISTORIAL ══ */}
      {tab === 'historial' && (() => {
        const totalPags = Math.max(1, Math.ceil(historial.length / ROWS_PER_PAGE));
        const pagSegura = Math.min(histPagina, totalPags);
        const filas = historial.slice((pagSegura - 1) * ROWS_PER_PAGE, pagSegura * ROWS_PER_PAGE);
        const getTipoLabel = (t) => ({
          detallado:'Operaciones', resumido:'Resoluciones', grupoq:'Grupo Q',
          broadcast:'Broadcast', apinotif:'API Notificaciones', respuestas:'Respuestas',
          campaniasrep:'Campañas', resolpalabra:'Resol. Palabra', numerosactivos:'Núm. Activos'
        }[t] || t);
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
                    <thead>
                      <tr>
                        <th>Estado</th>
                        <th>Tipo</th>
                        <th>Reporte</th>
                        <th>Archivo</th>
                        <th style={{ textAlign: 'right' }}>Registros</th>
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
                              {h.OK ? <span className="ci-ra-ht-badge ok">✓</span> : <span className="ci-ra-ht-badge err">✕</span>}
                            </td>
                            <td className="ci-ra-ht-tipo">{tipoLabel}</td>
                            <td className="ci-ra-ht-nombre">
                              <span title={h.NOMBRE || h.CLAVE}>{h.NOMBRE || h.CLAVE}</span>
                              {!h.OK && h.ERROR && <div className="ci-ra-ht-error">{h.ERROR}</div>}
                            </td>
                            <td className="ci-ra-ht-archivo">
                              {nombreArchivo ? <span title={h.ARCHIVO}>📄 {nombreArchivo}</span> : <span className="ci-ra-ht-nil">—</span>}
                            </td>
                            <td className="ci-ra-ht-regs" style={{ textAlign: 'right' }}>
                              {h.REGISTROS != null ? h.REGISTROS.toLocaleString() : '—'}
                            </td>
                            <td className="ci-ra-ht-fecha">{formatTs(h.EJECUTADO_EL)}</td>
                            <td className="ci-ra-ht-acciones">
                              {!h.OK && (
                                <button className="ci-ra-btn-retry" onClick={() => reintentarReporte(h.ID_LOG)} disabled={reintentando === h.ID_LOG} title="Reintentar reporte">
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
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}
