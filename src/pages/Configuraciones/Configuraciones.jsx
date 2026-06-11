import React, { useState } from 'react';
import GestionPermisos from './GestionPermisos';
import SistemaUsuarios from './SistemaUsuarios';
import Auditoria from '../Auditoria/Auditoria';
import Temas from './Temas';
import { hasModuleAccess } from '../../utils/permissions';
import './Configuraciones.css';

// Icono SVG para Permisos y Roles
const IconPermisos = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

// Icono SVG para Usuarios Sistema
const IconUsuariosSistema = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M9 21v-2a4 4 0 0 0-3-3.87" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

// Icono SVG para Auditoría
const IconAuditoria = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
);

// Icono SVG para Temas y Apariencia
const IconTemas = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path d="M12 6V12L16 14" />
    <circle cx="7.5" cy="10.5" r="1.5" />
    <circle cx="11.5" cy="7.5" r="1.5" />
    <circle cx="16.5" cy="9.5" r="1.5" />
    <circle cx="15.5" cy="14.5" r="1.5" />
  </svg>
);

// Submenú de configuraciones
const menuItems = [
  { id: 'permisos', name: 'Permisos y Roles', desc: 'Gestionar roles y permisos del sistema', icon: <IconPermisos />, modulo: 'configuraciones' },
  { id: 'usuarios_sistema', name: 'Usuarios Sistema', desc: 'Gestión de usuarios del sistema', icon: <IconUsuariosSistema />, modulo: 'usuarios_sistema' },
  { id: 'auditoria', name: 'Auditoría', desc: 'Logs y registros de actividad', icon: <IconAuditoria />, modulo: 'auditoria' },
  { id: 'temas', name: 'Temas', desc: 'Personalizar colores y apariencia', icon: <IconTemas /> },
];

function Configuraciones() {
  const [activeSubmenu, setActiveSubmenu] = useState('permisos');

  const filteredItems = menuItems.filter(item => !item.modulo || hasModuleAccess(item.modulo));

  const renderContent = () => {
    const item = filteredItems.find(i => i.id === activeSubmenu);
    if (!item) return <GestionPermisos />;
    switch (activeSubmenu) {
      case 'permisos':
        return <GestionPermisos />;
      case 'usuarios_sistema':
        return <SistemaUsuarios />;
      case 'auditoria':
        return <Auditoria />;
      case 'temas':
        return <Temas />;
      default:
        return <GestionPermisos />;
    }
  };

  return (
    <div id="modulo-configuraciones-root">
      {/* TOPBAR */}
      <div className="cr-topbar">
        <div className="cr-topbar-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="cr-topbar-logo-img" />
        </div>
        <div className="cr-topbar-divider" />
        <div className="cr-topbar-filters">
          <span className="cr-topbar-title">Módulo de Configuraciones</span>
        </div>
      </div>

      {/* BODY: sidebar + content */}
      <div className="cr-body">
        {/* SIDEBAR */}
        <div className="cr-sidebar">
          <p className="cr-sidebar-title">Acciones</p>
          {filteredItems.map((item) => (
            <button
              key={item.id}
              className={`cr-sidebar-item ${activeSubmenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveSubmenu(item.id)}
            >
              <span className="cr-sidebar-icon">
                {item.icon}
              </span>
              <span className="cr-sidebar-labels">
                <span className="cr-sidebar-label">{item.name}</span>
                <span className="cr-sidebar-desc">{item.desc}</span>
              </span>
              {activeSubmenu === item.id && <span className="cr-sidebar-arrow">›</span>}
            </button>
          ))}
        </div>

        {/* PANEL DERECHO */}
        <div className="cr-panel">
          {/* CONTENIDO */}
          <div className="cr-content">
            {!activeSubmenu && (
              <div className="cr-state-center">
                <div className="cr-welcome-card">
                  <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="cr-welcome-logo" />
                  <h2 className="cr-welcome-title">Módulo de Configuraciones</h2>
                  <p className="cr-welcome-text">Selecciona una acción del menú lateral para comenzar.</p>
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Configuraciones;
