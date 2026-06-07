import { useState, useEffect } from 'react';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './Login.css';

// Iconos SVG profesionales
const IconUser = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const IconLock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const IconEye = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const IconEyeOff = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const IconRocket = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" />
    <path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z" />
    <path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0" />
    <path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5" />
  </svg>
);

const IconAlert = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

function Login({ onLoginSuccess }) {
  const [formData, setFormData] = useState({
    usuario: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Cargar usuario recordado al montar (usar sessionStorage por seguridad)
  useEffect(() => {
    const rememberedUser = sessionStorage.getItem('remembered_user');
    if (rememberedUser) {
      setFormData(prev => ({ ...prev, usuario: rememberedUser, rememberMe: true }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    // Limpiar error al escribir
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if (!formData.usuario.trim() || !formData.password) {
      setError('Por favor ingrese usuario y contraseña');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth(API_URLS.login(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: formData.usuario.trim(),
          password: formData.password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar errores de autenticación silenciosamente (no mostrar en consola)
        if (response.status === 401) {
          setError(data.error || 'Credenciales inválidas');
          setLoading(false);
          return;
        }
        throw new Error(data.error || 'Error al iniciar sesión');
      }

      // Guardar token
      sessionStorage.setItem('auth_token', data.token);
      sessionStorage.setItem('user_info', JSON.stringify(data.user));

      // Guardar permisos
      if (data.user.permissions) {
        sessionStorage.setItem('user_permissions', JSON.stringify(data.user.permissions));
      }

      // Manejar "Recordarme" (usar sessionStorage por seguridad)
      if (formData.rememberMe) {
        sessionStorage.setItem('remembered_user', formData.usuario.trim());
      } else {
        sessionStorage.removeItem('remembered_user');
      }

      // Notificar éxito
      onLoginSuccess(data.user);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePassword = () => setShowPassword(!showPassword);

  return (
    <div className="login-page">
      {/* Fondo animado */}
      <div className="login-bg">
        <div className="gradient-orb orb-1"></div>
        <div className="gradient-orb orb-2"></div>
        <div className="gradient-orb orb-3"></div>
      </div>

      {/* Contenedor principal */}
      <div className="login-wrapper">
        {/* Card de login */}
        <div className="login-card">
          {/* Header con logo */}
          <div className="login-header">
            <div className="logo-container">
              <img src="/assets/new_logo.png" alt="TalkMe" className="login-logo" />
              <div className="logo-glow"></div>
            </div>
            <h1 className="login-title">Soporte TalkMe</h1>
            <p className="login-subtitle">Acceso a operaciones de mantenimiento</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="login-form-modern">
            {/* Campo Usuario */}
            <div className="input-wrapper">
              <label className="input-label">
                <span className="label-icon"><IconUser /></span>
                Usuario
              </label>
              <div className="input-container">
                <input
                  type="text"
                  name="usuario"
                  value={formData.usuario}
                  onChange={handleChange}
                  placeholder="Ingrese su usuario"
                  className={`modern-input ${error ? 'input-error' : ''}`}
                  disabled={loading}
                  autoComplete="username"
                  autoFocus
                />
                <div className="input-focus-line"></div>
              </div>
            </div>

            {/* Campo Contraseña */}
            <div className="input-wrapper">
              <label className="input-label">
                <span className="label-icon"><IconLock /></span>
                Contraseña
              </label>
              <div className="input-container password-container">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Ingrese su contraseña"
                  className={`modern-input ${error ? 'input-error' : ''}`}
                  disabled={loading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePassword}
                  tabIndex={-1}
                >
                  {showPassword ? <IconEyeOff /> : <IconEye />}
                </button>
                <div className="input-focus-line"></div>
              </div>
            </div>

            {/* Opciones */}
            <div className="login-options">
              <label className="remember-me">
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  disabled={loading}
                />
                <span className="checkmark"></span>
                Recordarme
              </label>
            </div>

            {/* Mensaje de error */}
            {error && (
              <div className="error-message">
                <span className="error-icon"><IconAlert /></span>
                {error}
              </div>
            )}

            {/* Botón de login */}
            <button
              type="submit"
              className={`btn-login-modern ${loading ? 'loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <span className="btn-icon"><IconRocket /></span>
                  Ingresar al Sistema
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="login-footer">
            <p className="version-info">v1.0.0 - Sistema de Soporte</p>
          </div>
        </div>

        {/* Elementos decorativos */}
        <div className="floating-elements">
          <div className="float-item" style={{ '--delay': '0s', '--x': '10%', '--y': '20%' }}>⚙️</div>
          <div className="float-item" style={{ '--delay': '1s', '--x': '80%', '--y': '30%' }}>🔧</div>
          <div className="float-item" style={{ '--delay': '2s', '--x': '15%', '--y': '70%' }}>💬</div>
          <div className="float-item" style={{ '--delay': '3s', '--x': '85%', '--y': '75%' }}>📊</div>
        </div>
      </div>
    </div>
  );
}

export default Login;