import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// ============================================================================
//  ThemeContext — Sistema centralizado de temas
//  Soporta temas predefinidos (data-theme="...") + color custom (HSL dinámico)
//  Persiste en localStorage y aplica al <html>
// ============================================================================

export const TEMAS = [
  { id: 'violeta',   nombre: 'Violeta',    color: '#6366f1', gradiente: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 'azul',      nombre: 'Azul',       color: '#3b82f6', gradiente: 'linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)' },
  { id: 'verde',     nombre: 'Verde',      color: '#10b981', gradiente: 'linear-gradient(135deg, #10b981 0%, #047857 100%)' },
  { id: 'turquesa',  nombre: 'Turquesa',   color: '#06b6d4', gradiente: 'linear-gradient(135deg, #22d3ee 0%, #0e7490 100%)' },
  { id: 'esmeralda', nombre: 'Esmeralda',  color: '#14b8a6', gradiente: 'linear-gradient(135deg, #2dd4bf 0%, #0f766e 100%)' },
  { id: 'naranja',   nombre: 'Naranja',    color: '#f97316', gradiente: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)' },
  { id: 'ambar',     nombre: 'Ámbar',      color: '#f59e0b', gradiente: 'linear-gradient(135deg, #fbbf24 0%, #b45309 100%)' },
  { id: 'rojo',      nombre: 'Rojo',       color: '#ef4444', gradiente: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' },
  { id: 'rosa',      nombre: 'Rosa',       color: '#ec4899', gradiente: 'linear-gradient(135deg, #ec4899 0%, #9d174d 100%)' },
  { id: 'purpura',   nombre: 'Púrpura',    color: '#a855f7', gradiente: 'linear-gradient(135deg, #c084fc 0%, #6b21a8 100%)' },
  { id: 'grafito',   nombre: 'Grafito',    color: '#475569', gradiente: 'linear-gradient(135deg, #64748b 0%, #1e293b 100%)' },
  { id: 'medianoche',nombre: 'Medianoche', color: '#1e40af', gradiente: 'linear-gradient(135deg, #1e40af 0%, #020617 100%)' },
];

const STORAGE_KEY = 'talkme_theme';
const STORAGE_CUSTOM_KEY = 'talkme_theme_custom_color';
const DEFAULT_THEME = 'violeta';
const CUSTOM_THEME_ID = 'custom';

// ──── Utilidades de color ────
function hexToRgb(hex) {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(v, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}
function rgbToHex(r, g, b) {
  const to = (x) => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s; const l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}
function hslToRgb(h, s, l) {
  h /= 360; s /= 100; l /= 100;
  if (s === 0) { const v = Math.round(l * 255); return { r: v, g: v, b: v }; }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
  };
}
function hslToHex(h, s, l) { const { r, g, b } = hslToRgb(h, s, l); return rgbToHex(r, g, b); }

// Genera escala completa 50-900 a partir de un color base
function generarPaleta(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);
  // Niveles de luminosidad ajustados estilo Tailwind
  const niveles = {
    50: 97, 100: 93, 200: 86, 300: 76, 400: 64,
    500: 53, 600: 45, 700: 37, 800: 30, 900: 24
  };
  // Saturación: para 50-100 más baja, para 600+ más alta
  const ajusteSat = (l) => Math.min(100, Math.max(15, l > 80 ? s * 0.5 : l < 30 ? s * 0.9 : s));
  const palette = {};
  Object.entries(niveles).forEach(([key, l]) => {
    palette[key] = hslToHex(h, ajusteSat(l), l);
  });
  const rgb500 = hexToRgb(palette[500]);
  const rgb600 = hexToRgb(palette[600]);
  const rgb700 = hexToRgb(palette[700]);
  return {
    palette,
    rgb500: `${rgb500.r}, ${rgb500.g}, ${rgb500.b}`,
    rgb600: `${rgb600.r}, ${rgb600.g}, ${rgb600.b}`,
    rgb700: `${rgb700.r}, ${rgb700.g}, ${rgb700.b}`,
    gradient: `linear-gradient(135deg, ${palette[400]} 0%, ${palette[700]} 100%)`,
  };
}

// Aplica una paleta custom como variables CSS inline en <html>
function aplicarPaletaCustom(hex) {
  const { palette, rgb500, rgb600, rgb700, gradient } = generarPaleta(hex);
  const root = document.documentElement;
  Object.entries(palette).forEach(([k, v]) => root.style.setProperty(`--tm-primary-${k}`, v));
  root.style.setProperty('--tm-primary-rgb-500', rgb500);
  root.style.setProperty('--tm-primary-rgb-600', rgb600);
  root.style.setProperty('--tm-primary-rgb-700', rgb700);
  root.style.setProperty('--tm-primary-gradient', gradient);
  root.style.setProperty('--tm-primary-contrast', '#ffffff');
}

// Limpia los overrides inline (para volver a usar el tema CSS)
function limpiarPaletaCustom() {
  const root = document.documentElement;
  ['50','100','200','300','400','500','600','700','800','900'].forEach(k => {
    root.style.removeProperty(`--tm-primary-${k}`);
  });
  root.style.removeProperty('--tm-primary-rgb-500');
  root.style.removeProperty('--tm-primary-rgb-600');
  root.style.removeProperty('--tm-primary-rgb-700');
  root.style.removeProperty('--tm-primary-gradient');
  root.style.removeProperty('--tm-primary-contrast');
}

const ThemeContext = createContext({
  tema: DEFAULT_THEME,
  setTema: () => {},
  colorCustom: null,
  setColorCustom: () => {},
  temas: TEMAS,
  CUSTOM_THEME_ID,
});

export function ThemeProvider({ children }) {
  const [tema, setTemaState] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
  });
  const [colorCustom, setColorCustomState] = useState(() => {
    try { return localStorage.getItem(STORAGE_CUSTOM_KEY) || '#6366f1'; } catch { return '#6366f1'; }
  });

  // Aplica el tema (predefinido o custom) al DOM
  useEffect(() => {
    if (tema === CUSTOM_THEME_ID) {
      document.documentElement.setAttribute('data-theme', CUSTOM_THEME_ID);
      aplicarPaletaCustom(colorCustom);
    } else {
      limpiarPaletaCustom();
      document.documentElement.setAttribute('data-theme', tema);
    }
    try { localStorage.setItem(STORAGE_KEY, tema); } catch { /* noop */ }
  }, [tema, colorCustom]);


  const setTema = useCallback((id) => {
    if (id === CUSTOM_THEME_ID || TEMAS.find(t => t.id === id)) setTemaState(id);
  }, []);

  const setColorCustom = useCallback((hex) => {
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
    setColorCustomState(hex);
    try { localStorage.setItem(STORAGE_CUSTOM_KEY, hex); } catch { /* noop */ }
    // Si no estamos en custom, cambiar a custom automáticamente
    setTemaState(CUSTOM_THEME_ID);
  }, []);


  return (
    <ThemeContext.Provider value={{ tema, setTema, colorCustom, setColorCustom, temas: TEMAS, CUSTOM_THEME_ID }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
