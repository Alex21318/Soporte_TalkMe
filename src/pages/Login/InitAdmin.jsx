import { useState } from 'react';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './InitAdmin.css';

function InitAdmin({ onAdminCreated }) {
  const [formData, setFormData] = useState({
    usuario: 'admin',
    password: '',
    confirmPassword: '',
    nombre: 'Administrador'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validaciones
    if (!formData.usuario.trim() || !formData.password || !formData.nombre.trim()) {
      setError('Todos los campos son requeridos');
      return;
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetchWithAuth(API_URLS.baseUrl + '/api/auth/init-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          usuario: formData.usuario.trim(),
          password: formData.password,
          nombre: formData.nombre.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuario administrador');
      }

      setSuccess(true);
      setTimeout(() => {
        onAdminCreated();
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="init-admin-wrapper">
        <div className="init-admin-card success">
          <div className="success-icon">✅</div>
          <h2>¡Usuario Administrador Creado!</h2>
          <p>Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="init-admin-wrapper">
      <div className="init-admin-card">
        <div className="init-header">
          <img src="/assets/new_logo.png" alt="TalkMe" className="init-logo" />
          <h1>Configuración Inicial</h1>
          <p>Cree el usuario administrador para comenzar</p>
        </div>

        <form onSubmit={handleSubmit} className="init-form">
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              name="usuario"
              value={formData.usuario}
              onChange={handleChange}
              placeholder="Nombre de usuario"
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="form-group">
            <label>Nombre Completo</label>
            <input
              type="text"
              name="nombre"
              value={formData.nombre}
              onChange={handleChange}
              placeholder="Nombre del administrador"
              disabled={loading}
              autoComplete="name"
            />
          </div>

          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mínimo 6 caracteres"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="form-group">
            <label>Confirmar Contraseña</label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Repita la contraseña"
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button
            type="submit"
            className={`btn-init ${loading ? 'loading' : ''}`}
            disabled={loading}
          >
            {loading ? 'Creando usuario...' : 'Crear Administrador'}
          </button>
        </form>

        <div className="init-footer">
          <p className="security-note">
            🔒 Las contraseñas se almacenan con encriptación bcrypt (seguridad militar)
          </p>
        </div>
      </div>
    </div>
  );
}

export default InitAdmin;
