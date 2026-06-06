// ============================================================================
//  MenuIcons — Iconos SVG temáticos para los submenús de Cierres y Creaciones
//  Todos usan currentColor, stroke 1.5, viewBox 24, redondeados.
//  Aplican el tema dinámicamente via CSS (color: var(--tm-primary-600)).
// ============================================================================

const baseProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

// ── Cierres / Acciones ──────────────────────────────────────────────────────

// Conversaciones — burbujas de chat conversación
export const IconConversaciones = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    <line x1="8.5" y1="11" x2="8.5" y2="11.01" />
    <line x1="12" y1="11" x2="12" y2="11.01" />
    <line x1="15.5" y1="11" x2="15.5" y2="11.01" />
  </svg>
);

// Facebook — letra F
export const IconFacebook = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

// Tags Bot — etiqueta con texto
export const IconTagsBot = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </svg>
);

// Seguridad — escudo con candado
export const IconSeguridad = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <rect x="9" y="11" width="6" height="5" rx="0.5" />
    <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
  </svg>
);

// Reportes Auto — documento con reloj
export const IconReportesAuto = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <circle cx="12" cy="15" r="3" />
    <line x1="12" y1="13.5" x2="12" y2="15" />
    <line x1="12" y1="15" x2="13.2" y2="16" />
  </svg>
);

// Auditoría — lupa con líneas (registro de logs)
export const IconAuditoria = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="13" y2="13" />
    <line x1="8" y1="17" x2="11" y2="17" />
    <line x1="8" y1="9" x2="10" y2="9" />
  </svg>
);

// Configuraciones — engranaje
export const IconConfiguraciones = (p) => (
  <svg {...baseProps} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </svg>
);

// ── Creaciones ──────────────────────────────────────────────────────────────

// Empresa/Instancia — edificio
export const IconEmpresa = (p) => (
  <svg {...baseProps} {...p}>
    <rect x="4" y="3" width="16" height="18" rx="2" />
    <line x1="9" y1="8" x2="9" y2="8.01" />
    <line x1="15" y1="8" x2="15" y2="8.01" />
    <line x1="9" y1="12" x2="9" y2="12.01" />
    <line x1="15" y1="12" x2="15" y2="12.01" />
    <path d="M10 21v-4h4v4" />
  </svg>
);

// WhatsApp — burbuja con auricular
export const IconWhatsApp = (p) => (
  <svg {...baseProps} {...p}>
    <path d="M20.5 11.5a8.5 8.5 0 1 1-3.7-7l-4.3 1.5L14 10a4 4 0 0 0 6 5l1 4-4-1a8.5 8.5 0 0 0 3.5-6.5z" />
  </svg>
);

// FB/IG — círculo con cuadrado (estilo cámara Instagram)
export const IconFBIG = (p) => (
  <svg {...baseProps} {...p}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// Demos / Teléfono móvil
export const IconDemos = (p) => (
  <svg {...baseProps} {...p}>
    <rect x="6" y="2" width="12" height="20" rx="2" />
    <line x1="11" y1="18" x2="13" y2="18" />
  </svg>
);

// ── Map utility ─────────────────────────────────────────────────────────────
// Permite obtener un icono por su id (usado en SIDEBAR_ITEMS)
export const ICONOS_MENU = {
  // Cierres
  conversaciones: IconConversaciones,
  facebook: IconFacebook,
  tags: IconTagsBot,
  seguridad: IconSeguridad,
  reportes_auto: IconReportesAuto,
  auditoria: IconAuditoria,
  configuraciones: IconConfiguraciones,
  // Creaciones
  instancia: IconEmpresa,
  whatsapp: IconWhatsApp,
  fbig: IconFBIG,
  numeros: IconDemos,
  // Plantillas WhatsApp
  plantillas_wa: IconWhatsApp,
};
