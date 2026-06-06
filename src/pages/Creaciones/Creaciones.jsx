import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import './Creaciones.css';
import CreacionInstancia from './CreacionInstancia';
import IntegracionWhatsapp from './IntegracionWhatsapp';
import IntegracionFBIG from './IntegracionFBIG';
import NumerosDemos from './NumerosDemos';
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
];

// ── Componente principal ─────────────────────────────────────────────────────
function Creaciones() {
  const [seccion, setSeccion] = useState(null);

  // ── Activar sección desde sidebar ──
  const activarSeccion = (id) => {
    if (seccion === id) return;
    setSeccion(id);
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
          <span className="cr-topbar-title">Módulo de Creaciones</span>
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
            {seccion === 'numeros' && <NumerosDemos />}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Creaciones;
