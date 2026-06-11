import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import ConfirmModal from './ConfirmModal';
import ColaDrawer from './ColaDrawer';
import { hasModuleAccess } from '../utils/permissions';
import './Sidebar.css';

// Iconos SVG personalizados — temática soporte/chat/mensajería TalkMe
// Usuarios: agente con headset + burbuja de chat
const IconUsuarios = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="8" r="3.5" />
    <path d="M3 21v-2c0-2.76 2.69-5 6-5h2c.7 0 1.37.1 2 .28" />
    <path d="M17 14h3.5c.83 0 1.5.67 1.5 1.5v3c0 .83-.67 1.5-1.5 1.5H20l-1.5 2L17 20h-.5c-.83 0-1.5-.67-1.5-1.5v-3c0-.83.67-1.5 1.5-1.5z" />
    <line x1="17" y1="16.5" x2="20" y2="16.5" />
    <line x1="17" y1="18.5" x2="19" y2="18.5" />
  </svg>
);

// Skills: escudo/insignia con rayo — capacidades del agente
const IconSkills = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2L4 6v5c0 5.25 3.4 10.15 8 11.5 4.6-1.35 8-6.25 8-11.5V6l-8-4z" />
    <polyline points="11 8.5 9.5 13 12 12 10.5 17 15 11 12.5 12 14 8.5 11 8.5" fill="currentColor" opacity="0.2" />
    <polyline points="11 8.5 9.5 13 12 12 10.5 17 15 11 12.5 12 14 8.5" />
  </svg>
);

// Diagramas: flujo de conversación con burbujas de chat conectadas
const IconDiagramas = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="8" height="5.5" rx="2" />
    <line x1="5" y1="4" x2="8" y2="4" />
    <line x1="5" y1="5.8" x2="7" y2="5.8" />
    <rect x="14" y="2" width="8" height="5.5" rx="2" />
    <line x1="16.5" y1="4" x2="20" y2="4" />
    <line x1="16.5" y1="5.8" x2="19" y2="5.8" />
    <rect x="8" y="16.5" width="8" height="5.5" rx="2" />
    <line x1="10.5" y1="18.5" x2="14" y2="18.5" />
    <line x1="10.5" y1="20.3" x2="13" y2="20.3" />
    <path d="M6 7.5v4c0 1 .5 1.5 1.5 1.5h9c1 0 1.5-.5 1.5-1.5v-4" />
    <line x1="12" y1="13" x2="12" y2="16.5" />
  </svg>
);

// Diagramas BD: base de datos con burbuja de chat — datos de conversaciones
const IconDiagramasBD = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <ellipse cx="10" cy="5" rx="7" ry="2.5" />
    <path d="M3 5v4.5c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V5" />
    <path d="M3 9.5V14c0 1.38 3.13 2.5 7 2.5.88 0 1.72-.06 2.5-.17" />
    <path d="M17 15h3.5c.83 0 1.5.56 1.5 1.25v2.5c0 .69-.67 1.25-1.5 1.25H20l-1 1.5-1-1.5h-1c-.83 0-1.5-.56-1.5-1.25v-2.5c0-.69.67-1.25 1.5-1.25z" />
    <circle cx="18.5" cy="17.5" r="0.5" fill="currentColor" />
    <circle cx="20" cy="17.5" r="0.5" fill="currentColor" />
    <circle cx="17" cy="17.5" r="0.5" fill="currentColor" />
  </svg>
);

// Reportes: portapapeles con gráfico y métricas de chat
const IconReportes = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 2h6v2.5c0 .28-.22.5-.5.5h-5a.5.5 0 0 1-.5-.5V2z" />
    <rect x="4" y="3" width="16" height="19" rx="2" />
    <path d="M9 2h6" />
    <rect x="7" y="14" width="2.5" height="4" rx="0.5" fill="currentColor" opacity="0.2" />
    <rect x="10.75" y="11" width="2.5" height="7" rx="0.5" fill="currentColor" opacity="0.2" />
    <rect x="14.5" y="8.5" width="2.5" height="9.5" rx="0.5" fill="currentColor" opacity="0.2" />
    <line x1="7" y1="14" x2="7" y2="18" />
    <line x1="9.5" y1="14" x2="9.5" y2="18" />
    <line x1="10.75" y1="11" x2="10.75" y2="18" />
    <line x1="13.25" y1="11" x2="13.25" y2="18" />
    <line x1="14.5" y1="8.5" x2="14.5" y2="18" />
    <line x1="17" y1="8.5" x2="17" y2="18" />
  </svg>
);

// Automatizaciones: robot/bot con antena — respuestas automáticas
const IconAutomatizaciones = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="8" width="16" height="12" rx="3" />
    <circle cx="9" cy="14" r="1.5" fill="currentColor" opacity="0.25" />
    <circle cx="15" cy="14" r="1.5" fill="currentColor" opacity="0.25" />
    <circle cx="9" cy="14" r="1.5" />
    <circle cx="15" cy="14" r="1.5" />
    <line x1="10.5" y1="17.5" x2="13.5" y2="17.5" />
    <line x1="12" y1="5" x2="12" y2="8" />
    <circle cx="12" cy="3.5" r="1.5" />
    <line x1="4" y1="12" x2="2" y2="10" />
    <line x1="20" y1="12" x2="22" y2="10" />
  </svg>
);

// Creaciones: burbuja de chat con + — crear nueva instancia/integración
const IconCreaciones = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12c0 4.42-4.03 8-9 8-1.4 0-2.72-.27-3.9-.75L3 21l1.5-4.25C3.55 15.4 3 13.76 3 12c0-4.42 4.03-8 9-8s9 3.58 9 8z" />
    <line x1="12" y1="8.5" x2="12" y2="15.5" />
    <line x1="8.5" y1="12" x2="15.5" y2="12" />
  </svg>
);

// Configuraciones: engranaje — configuraciones del sistema
const IconConfiguraciones = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// Salir: puerta con flecha y burbuja de despedida
const IconSalir = () => (
  <svg className="nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const menuItems = [
    { path: '/usuarios', name: 'Usuarios', Icon: IconUsuarios, modulo: 'usuarios_sistema' },
    { path: '/horarios', name: 'Horarios', Icon: IconSkills, modulo: 'horarios' },
    { path: '/diagramas', name: 'Diagramas Excel', Icon: IconDiagramas, modulo: 'diagramas' },
    { path: '/diagramas-bd', name: 'Diagramas', Icon: IconDiagramasBD, modulo: 'diagramas' },
    { path: '/reportes', name: 'Reportes', Icon: IconReportes, modulo: 'auditoria' },
    { path: '/cierres', name: 'Automatizaciones', Icon: IconAutomatizaciones, modulo: 'automatizaciones' },
    { path: '/creaciones', name: 'Creaciones', Icon: IconCreaciones, modulo: 'creaciones' },
    { path: '/configuraciones', name: 'Configuraciones', Icon: IconConfiguraciones, modulo: 'configuraciones' },
  ];

  const filteredItems = menuItems.filter(item => {
    return !item.modulo || hasModuleAccess(item.modulo);
  });

  // Función para cerrar sesión
  const handleLogout = () => {
    setShowLogoutModal(true);
  };

  const confirmLogout = () => {
    setShowLogoutModal(false);
    onLogout();
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        {/* Contenedor especial para aplicar el degradado de fondo a la T */}
        <div className="logo-gradient-bg">
          <img src="/assets/new_logo_T.png" alt="TalkMe Logo" className="sidebar-logo-img" />
        </div>
      </div>

      <nav className="sidebar-nav">
        {filteredItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.name}
            className={({ isActive }) => {
              const rootActive = item.path === '/usuarios' && location.pathname === '/';
              return (isActive || rootActive) ? "nav-item active" : "nav-item";
            }}
          >
            <item.Icon />
            <span className="nav-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-cola">
        <ColaDrawer />
      </div>

      {/* Información del usuario */}
      {user && (
        <div className="sidebar-user-info" title={`${user.nombre} (@${user.usuario})`}>
          <div className="user-avatar">
            <span>{user.nombre.charAt(0).toUpperCase()}</span>
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión">
          <IconSalir />
          <span className="nav-text">Cerrar Sesión</span>
        </button>
      </div>

      <ConfirmModal
        show={showLogoutModal}
        title="Cerrar Sesión"
        confirmText="Cerrar Sesión"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmLogout}
        onCancel={() => setShowLogoutModal(false)}
      >
        <p>¿Estás seguro de que deseas cerrar sesión?</p>
      </ConfirmModal>
    </aside>
  );
}

export default Sidebar;