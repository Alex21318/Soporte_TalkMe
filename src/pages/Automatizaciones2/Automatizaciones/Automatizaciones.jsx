import { useState } from 'react';
import { ICONOS_MENU } from '../../components/MenuIcons';
import Auditoria from '../Auditoria/Auditoria';
import CierreDeConversaciones from './CierreDeConversaciones/CierreDeConversaciones';
import FacebookEliminacion from './FacebookEliminacion/FacebookEliminacion';
import TagBot from './TagBot/TagBot';
import PlantillasWA from './PlantillasWA/PlantillasWA';
import ReportesAuto from './ReportesAuto/ReportesAuto';
import Configuraciones from './Configuraciones/Configuraciones';
import './Automatizaciones.css';

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

const SIDEBAR_ITEMS = [
  { id: 'conversaciones', label: 'Conversaciones',  desc: 'Cierre +30 días' },
  { id: 'facebook',       label: 'Facebook',        desc: 'Eliminación solicitudes' },
  { id: 'tags',           label: 'Tags Bot',        desc: 'Validar palabras' },
  { id: 'plantillas_wa',  label: 'Plantillas WA',   desc: 'Plantillas WhatsApp' },
  { id: 'reportes_auto',  label: 'Reportes Auto',   desc: 'Descarga programada' },
  { id: 'auditoria',      label: 'Auditoría',       desc: 'Logs del sistema' },
  { id: 'configuraciones',label: 'Configuraciones', desc: 'Tema y apariencia' },
];

export default function Automatizaciones() {
  const [dbKey, setDbKey] = useState('db_8');
  const [seccion, setSeccion] = useState('conversaciones');

  const handleDbChange = (newKey) => {
    setDbKey(newKey);
  };

  const activarSeccion = (id) => {
    setSeccion(id);
  };

  return (
    <div id="modulo-cierres-root">
      {/* ── TOPBAR ── */}
      <div className="ci-topbar">
        <div className="ci-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-topbar-logo-img" />
        </div>
        <div className="ci-topbar-divider" />

        <div className="ci-topbar-filters">
          <div className="ci-topbar-field">
            <span className="ci-topbar-label">Base de Datos</span>
            <select className="ci-topbar-select" value={dbKey} onChange={e => handleDbChange(e.target.value)}>
              {Object.entries(DB_NAMES).map(([k, n]) => (
                <option key={k} value={k}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ── BODY: sidebar + content ── */}
      <div className="ci-body">
        {/* ── SIDEBAR ── */}
        <div className="ci-sidebar">
          <p className="ci-sidebar-title">Acciones</p>
          {SIDEBAR_ITEMS.map(item => {
            const Icon = ICONOS_MENU[item.id];
            return (
              <button
                key={item.id}
                className={`ci-sidebar-item ${seccion === item.id ? 'active' : ''}`}
                onClick={() => activarSeccion(item.id)}
              >
                <span className="ci-sidebar-icon">{Icon && <Icon width={22} height={22} />}</span>
                <span className="ci-sidebar-labels">
                  <span className="ci-sidebar-label">{item.label}</span>
                  <span className="ci-sidebar-desc">{item.desc}</span>
                </span>
                {seccion === item.id && <span className="ci-sidebar-arrow">›</span>}
              </button>
            );
          })}
        </div>

        {/* ── PANEL DERECHO ── */}
        <div className="ci-panel">
          <div className="ci-content">
            {!seccion && (
              <div className="ci-state-center">
                <div className="ci-welcome-card">
                  <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
                  <h2 className="ci-welcome-title">Módulo de Acciones</h2>
                  <p className="ci-welcome-text">Selecciona una acción del menú lateral para comenzar.</p>
                </div>
              </div>
            )}

            {seccion === 'conversaciones' && (
              <CierreDeConversaciones dbKey={dbKey} />
            )}

            {seccion === 'facebook' && (
              <FacebookEliminacion dbKey={dbKey} />
            )}

            {seccion === 'tags' && (
              <TagBot dbKey={dbKey} />
            )}

            {seccion === 'plantillas_wa' && (
              <PlantillasWA dbKey={dbKey} />
            )}

            {seccion === 'reportes_auto' && (
              <ReportesAuto />
            )}

            {seccion === 'auditoria' && (
              <Auditoria />
            )}

            {seccion === 'configuraciones' && (
              <Configuraciones />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
