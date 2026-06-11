import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './Creaciones.css';
import CreacionInstancia from './CreacionInstancia';
import IntegracionWhatsapp from './IntegracionWhatsapp';
import IntegracionFBIG from './IntegracionFBIG';
import NumerosDemos from './NumerosDemos';
import PaginasDemos from './PaginasDemos';
import { ICONOS_MENU } from '../../components/MenuIcons';

// ── Items del sidebar ────────────────────────────────────────────────────────
const SIDEBAR_ITEMS = [
  {
    id: 'instancia',
    label: 'Creacion Instancia',
    desc: 'Crear nueva empresa',
  },
  {
    id: 'whatsapp',
    label: 'Integración WhatsApp',
    desc: 'Configurar API Oficial',
  },
  {
    id: 'fbig',
    label: 'Integración FB / IG',
    desc: 'Facebook + Instagram',
  },
  {
    id: 'numeros',
    label: 'Números Demos',
    desc: 'Gestionar números WhatsApp',
  },
  {
    id: 'paginas',
    label: 'Páginas Demos',
    desc: 'Gestionar páginas FB/IG',
  },
];

const AMBIENTES = ['DEMO_TALKME', 'DEMO_PARNET', 'DEMO_IA_TALK'];
const ESTADOS = ['DISPONIBLE', 'OCUPADO', 'INACTIVO'];
const REDES_SOCIALES = ['FACEBOOK', 'INSTAGRAM', 'AMBAS'];

// ── Componente principal ─────────────────────────────────────────────────────
function Creaciones() {
  const [seccion, setSeccion] = useState(null);
  
  // ── Estados para filtros de Números Demos ───────────────────────────────────
  const [numerosBusqueda, setNumerosBusqueda] = useState('');
  const [numerosFiltroEstado, setNumerosFiltroEstado] = useState('TODOS');
  const [numerosFiltroAmbiente, setNumerosFiltroAmbiente] = useState('TODOS');
  const [numerosRecargarTrigger, setNumerosRecargarTrigger] = useState(0);
  const [numerosShowValidar, setNumerosShowValidar] = useState(false);
  const [numerosShowForm, setNumerosShowForm] = useState(false);

  // ── Estados para filtros de Páginas Demos ───────────────────────────────────
  const [paginasBusqueda, setPaginasBusqueda] = useState('');
  const [paginasFiltroEstado, setPaginasFiltroEstado] = useState('TODOS');
  const [paginasFiltroRedSocial, setPaginasFiltroRedSocial] = useState('TODOS');
  const [paginasFiltroTipoDemo, setPaginasFiltroTipoDemo] = useState('TODOS');
  const [paginasRecargarTrigger, setPaginasRecargarTrigger] = useState(0);
  const [paginasShowValidar, setPaginasShowValidar] = useState(false);
  const [paginasShowForm, setPaginasShowForm] = useState(false);

  // ── Activar sección desde sidebar ──
  const activarSeccion = (id) => {
    if (seccion === id) return;
    setSeccion(id);
  };

  // ── Funciones para Números Demos ───────────────────────────────────────────
  const handleNumerosLimpiarFiltros = () => {
    setNumerosBusqueda('');
    setNumerosFiltroEstado('TODOS');
    setNumerosFiltroAmbiente('TODOS');
  };

  const handleNumerosRecargar = () => {
    setNumerosRecargarTrigger(prev => prev + 1);
  };

  const handleNumerosNuevo = () => {
    setNumerosShowForm(true);
  };

  const handleNumerosValidar = () => {
    setNumerosShowValidar(!numerosShowValidar);
  };

  // ── Funciones para Páginas Demos ───────────────────────────────────────────
  const handlePaginasLimpiarFiltros = () => {
    setPaginasBusqueda('');
    setPaginasFiltroEstado('TODOS');
    setPaginasFiltroRedSocial('TODOS');
    setPaginasFiltroTipoDemo('TODOS');
  };

  const handlePaginasRecargar = () => {
    setPaginasRecargarTrigger(prev => prev + 1);
  };

  const handlePaginasNuevo = () => {
    setPaginasShowForm(true);
  };

  const handlePaginasValidar = () => {
    setPaginasShowValidar(!paginasShowValidar);
  };

  return (
    <div id="modulo-creaciones-root">
      {/* ── TOPBAR ── */}
      <div className="cr-topbar">
        <div className="cr-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="cr-topbar-logo-img" />
        </div>
        <div className="cr-topbar-divider" />
        <div className="cr-topbar-filters">
          {seccion === 'numeros' ? (
            <>
              <input
                type="text"
                value={numerosBusqueda}
                onChange={(e) => setNumerosBusqueda(e.target.value)}
                placeholder="Buscar nombre o número..."
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  minWidth: '200px'
                }}
              />
              <select
                value={numerosFiltroEstado}
                onChange={(e) => setNumerosFiltroEstado(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="TODOS">Estado: Todos</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select
                value={numerosFiltroAmbiente}
                onChange={(e) => setNumerosFiltroAmbiente(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="TODOS">Ambiente: Todos</option>
                {AMBIENTES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button
                onClick={handleNumerosLimpiarFiltros}
                style={{
                  padding: '6px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
              <button
                onClick={handleNumerosNuevo}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                ➕ Nuevo
              </button>
              <button
                onClick={handleNumerosRecargar}
                style={{
                  padding: '6px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                🔄 Recargar
              </button>
              <button
                onClick={handleNumerosValidar}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                🔍 Validar DB
              </button>
            </>
          ) : seccion === 'paginas' ? (
            <>
              <input
                type="text"
                value={paginasBusqueda}
                onChange={(e) => setPaginasBusqueda(e.target.value)}
                placeholder="Buscar nombre de página..."
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  minWidth: '200px'
                }}
              />
              <select
                value={paginasFiltroEstado}
                onChange={(e) => setPaginasFiltroEstado(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="TODOS">Estado: Todos</option>
                {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <select
                value={paginasFiltroRedSocial}
                onChange={(e) => setPaginasFiltroRedSocial(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="TODOS">Red Social: Todas</option>
                {REDES_SOCIALES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <select
                value={paginasFiltroTipoDemo}
                onChange={(e) => setPaginasFiltroTipoDemo(e.target.value)}
                style={{
                  padding: '6px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="TODOS">Tipo Demo: Todos</option>
                <option value="DEMO_TALKME">DEMO_TALKME</option>
                <option value="DEMO_PARTNER">DEMO_PARTNER</option>
                <option value="CLIENTE">CLIENTE</option>
              </select>
              <button
                onClick={handlePaginasLimpiarFiltros}
                style={{
                  padding: '6px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                Limpiar
              </button>
              <button
                onClick={handlePaginasNuevo}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                ➕ Nuevo
              </button>
              <button
                onClick={handlePaginasRecargar}
                style={{
                  padding: '6px 16px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '13px',
                  marginRight: '8px',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                🔄 Recargar
              </button>
              <button
                onClick={handlePaginasValidar}
                style={{
                  padding: '6px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  backgroundColor: '#7c3aed',
                  color: 'white',
                  cursor: 'pointer'
                }}
              >
                🔍 Validar DB
              </button>
            </>
          ) : (
            <span className="cr-topbar-title">Módulo de Creaciones</span>
          )}
        </div>
      </div>

      {/* ── BODY: sidebar + content ── */}
      <div className="cr-body">

        {/* ── SIDEBAR ── */}
        <div className="cr-sidebar">
          <p className="cr-sidebar-title">Acciones</p>
          {SIDEBAR_ITEMS.map(item => {
            const Icon = ICONOS_MENU[item.id];
            return (
              <button
                key={item.id}
                className={`cr-sidebar-item ${seccion === item.id ? 'active' : ''}`}
                onClick={() => activarSeccion(item.id)}
              >
                <span className="cr-sidebar-icon">{Icon && <Icon width={22} height={22} />}</span>
                <span className="cr-sidebar-labels">
                  <span className="cr-sidebar-label">{item.label}</span>
                  <span className="cr-sidebar-desc">{item.desc}</span>
                </span>
                {seccion === item.id && <span className="cr-sidebar-arrow">›</span>}
              </button>
            );
          })}
        </div>

        {/* ── PANEL DERECHO ── */}
        <div className="cr-panel">
          {/* CONTENIDO */}
          <div className="cr-content">
            {!seccion && (
              <div className="cr-state-center">
                <div className="cr-welcome-card">
                  <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="cr-welcome-logo" />
                  <h2 className="cr-welcome-title">Módulo de Creaciones</h2>
                  <p className="cr-welcome-text">Selecciona una acción del menú lateral para comenzar.</p>
                </div>
              </div>
            )}

            {seccion === 'instancia' && <CreacionInstancia />}
            {seccion === 'whatsapp' && <IntegracionWhatsapp />}
            {seccion === 'fbig' && <IntegracionFBIG />}
            {seccion === 'numeros' && (
              <NumerosDemos
                busqueda={numerosBusqueda}
                setBusqueda={setNumerosBusqueda}
                filtroEstado={numerosFiltroEstado}
                setFiltroEstado={setNumerosFiltroEstado}
                filtroAmbiente={numerosFiltroAmbiente}
                setFiltroAmbiente={setNumerosFiltroAmbiente}
                recargarTrigger={numerosRecargarTrigger}
                showValidar={numerosShowValidar}
                setShowValidar={setNumerosShowValidar}
                showForm={numerosShowForm}
                setShowForm={setNumerosShowForm}
              />
            )}
            {seccion === 'paginas' && (
              <PaginasDemos
                busqueda={paginasBusqueda}
                setBusqueda={setPaginasBusqueda}
                filtroEstado={paginasFiltroEstado}
                setFiltroEstado={setPaginasFiltroEstado}
                filtroRedSocial={paginasFiltroRedSocial}
                setFiltroRedSocial={setPaginasFiltroRedSocial}
                filtroTipoDemo={paginasFiltroTipoDemo}
                setFiltroTipoDemo={setPaginasFiltroTipoDemo}
                recargarTrigger={paginasRecargarTrigger}
                showValidar={paginasShowValidar}
                setShowValidar={setPaginasShowValidar}
                showForm={paginasShowForm}
                setShowForm={setPaginasShowForm}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Creaciones;
