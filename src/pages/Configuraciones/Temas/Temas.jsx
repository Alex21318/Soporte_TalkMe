import { useState, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import './Temas.css';

// Colores rápidos sugeridos para el picker custom
const COLORES_RAPIDOS = [
  '#6366f1', '#3b82f6', '#06b6d4', '#10b981', '#14b8a6',
  '#f59e0b', '#f97316', '#ef4444', '#ec4899', '#a855f7',
  '#8b5cf6', '#0ea5e9', '#22c55e', '#eab308', '#dc2626',
];

export default function Temas() {
  const { tema, setTema, colorCustom, setColorCustom, temas, CUSTOM_THEME_ID } = useTheme();
  const [hexInput, setHexInput] = useState(colorCustom || '#6366f1');

  // Sincroniza el input cuando cambia el colorCustom desde fuera
  useEffect(() => {
    setHexInput(colorCustom || '#6366f1');
  }, [colorCustom]);

  // Maneja el cambio de input de texto (HEX)
  const handleHexChange = (e) => {
    const v = e.target.value.trim();
    setHexInput(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) setColorCustom(v);
  };

  // Maneja el color picker nativo
  const handlePickerChange = (e) => {
    const v = e.target.value;
    setHexInput(v);
    setColorCustom(v);
  };

  const esCustomActivo = tema === CUSTOM_THEME_ID;

  return (
    <div className="cfg-container">
      {/* ── HEADER ── */}
      <div className="cfg-header">
        <div className="cfg-header-icon">
          <img src="/assets/new_logo_T.png" alt="TalkMe" />
        </div>
        <div>
          <h2 className="cfg-header-title">Temas y Apariencia</h2>
          <p className="cfg-header-subtitle">Personaliza la apariencia de TalkMe a tu gusto</p>
        </div>
      </div>

      {/* ── SECCIÓN: COLOR CUSTOM ── */}
      <section className="cfg-section">
        <div className="cfg-section-header">
          <div className="cfg-section-icon">🎨</div>
          <div>
            <h3 className="cfg-section-title">Color personalizado</h3>
            <p className="cfg-section-desc">
              Elige cualquier color y se aplicará automáticamente a toda la aplicación: botones, filtros, modales, barras y elementos destacados.
            </p>
          </div>
        </div>

        <div className="cfg-custom-picker">
          {/* Color picker nativo + preview grande */}
          <div className="cfg-picker-row">
            <label className="cfg-picker-swatch" style={{ background: hexInput }}>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(hexInput) ? hexInput : '#6366f1'}
                onChange={handlePickerChange}
                aria-label="Selector de color"
              />
              <span className="cfg-picker-swatch-hint">Click para elegir</span>
            </label>

            <div className="cfg-picker-controls">
              <label className="cfg-picker-label">Código HEX</label>
              <div className="cfg-picker-input-wrap">
                <span className="cfg-picker-hash">#</span>
                <input
                  type="text"
                  className="cfg-picker-input"
                  value={hexInput.replace('#', '')}
                  onChange={(e) => handleHexChange({ target: { value: '#' + e.target.value.replace('#', '') } })}
                  maxLength={6}
                  placeholder="6366f1"
                  spellCheck="false"
                />
              </div>
              <p className="cfg-picker-state">
                {esCustomActivo ? (
                  <><span className="cfg-picker-dot" /> Color personalizado activo</>
                ) : (
                  <>Usando tema predefinido</>
                )}
              </p>
            </div>
          </div>

          {/* Presets de colores rápidos */}
          <div className="cfg-presets">
            <span className="cfg-presets-label">Colores sugeridos</span>
            <div className="cfg-presets-grid">
              {COLORES_RAPIDOS.map(c => (
                <button
                  key={c}
                  className={`cfg-preset-dot ${esCustomActivo && colorCustom === c ? 'activo' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColorCustom(c)}
                  title={c}
                  aria-label={`Aplicar color ${c}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── SECCIÓN: TEMAS PREDEFINIDOS ── */}
      <section className="cfg-section">
        <div className="cfg-section-header">
          <div className="cfg-section-icon">✨</div>
          <div>
            <h3 className="cfg-section-title">Temas predefinidos</h3>
            <p className="cfg-section-desc">
              O selecciona uno de los temas curados con paletas ya optimizadas.
            </p>
          </div>
        </div>

        <div className="cfg-themes-grid">
          {temas.map(t => {
            const activo = tema === t.id;
            return (
              <button
                key={t.id}
                className={`cfg-theme-card ${activo ? 'activo' : ''}`}
                onClick={() => setTema(t.id)}
                title={`Aplicar tema ${t.nombre}`}
              >
                <div className="cfg-theme-preview" style={{ background: t.gradiente }}>
                  {activo && <span className="cfg-theme-check">✓</span>}
                </div>
                <div className="cfg-theme-info">
                  <span className="cfg-theme-name">{t.nombre}</span>
                  <span className="cfg-theme-hex">{t.color}</span>
                </div>
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
