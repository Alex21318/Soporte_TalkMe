import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './GestionPermisos.css';

function GestionPermisos() {
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [selectedRol, setSelectedRol] = useState(null);
  const [rolPermisos, setRolPermisos] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [usuarioPermisos, setUsuarioPermisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCrearRol, setShowCrearRol] = useState(false);
  const [nuevoRol, setNuevoRol] = useState({ nombre: '', descripcion: '' });
  const [modoVista, setModoVista] = useState('rol'); // 'rol' o 'usuario'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(15);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [rolesRes, permisosRes, usuariosRes] = await Promise.all([
        fetchWithAuth('/api/auth/roles'),
        fetchWithAuth('/api/auth/permisos'),
        fetchWithAuth('/api/auth/users')
      ]);

      const rolesData = await rolesRes.json();
      const permisosData = await permisosRes.json();
      const usuariosData = await usuariosRes.json();

      console.log('Roles data:', rolesData);
      console.log('Permisos data:', permisosData);
      console.log('Usuarios data:', usuariosData);

      setRoles(rolesData);
      setPermisos(permisosData);
      // El endpoint de usuarios devuelve {users: [...]} o directamente [...]
      setUsuarios(usuariosData.users || usuariosData);

      if (rolesData.length > 0) {
        seleccionarRol(rolesData[0]);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const seleccionarRol = async (rol) => {
    setSelectedRol(rol);
    setSelectedUsuario(null);
    try {
      const permisosRes = await fetchWithAuth(`/api/auth/roles/${rol.id}/permisos`);
      const permisosData = await permisosRes.json();
      console.log('Permisos del rol (frontend):', permisosData);
      setRolPermisos(permisosData);
    } catch (error) {
      console.error('Error cargando permisos del rol:', error);
    }
  };

  const seleccionarUsuario = async (usuario) => {
    setSelectedUsuario(usuario);
    setSelectedRol(null);
    try {
      const permisosRes = await fetchWithAuth(`/api/auth/users/${usuario.id}/permisos`);
      const permisosData = await permisosRes.json();
      console.log('Permisos del usuario:', permisosData);
      setUsuarioPermisos(permisosData);
    } catch (error) {
      console.error('Error cargando permisos del usuario:', error);
    }
  };

  const togglePermiso = async (permisoId) => {
    if (modoVista === 'rol' && !selectedRol) return;
    if (modoVista === 'usuario' && !selectedUsuario) return;

    if (modoVista === 'rol') {
      const tienePermiso = rolPermisos.some(p => p.id === permisoId);
      const nuevosPermisos = tienePermiso
        ? rolPermisos.filter(p => p.id !== permisoId)
        : [...rolPermisos, permisos.find(p => p.id === permisoId)];

      setRolPermisos(nuevosPermisos);

      try {
        await fetchWithAuth(`/api/auth/roles/${selectedRol.id}/permisos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permisoIds: nuevosPermisos.map(p => p.id) })
        });
      } catch (error) {
        console.error('Error actualizando permisos:', error);
        setRolPermisos(rolPermisos);
      }
    } else {
      const tienePermiso = usuarioPermisos.some(p => p.id === permisoId);
      const nuevosPermisos = tienePermiso
        ? usuarioPermisos.filter(p => p.id !== permisoId)
        : [...usuarioPermisos, permisos.find(p => p.id === permisoId)];

      setUsuarioPermisos(nuevosPermisos);

      try {
        await fetchWithAuth(`/api/auth/users/${selectedUsuario.id}/permisos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permisoIds: nuevosPermisos.map(p => p.id) })
        });
      } catch (error) {
        console.error('Error actualizando permisos del usuario:', error);
        setUsuarioPermisos(usuarioPermisos);
      }
    }
  };

  const crearRol = async (e) => {
    e.preventDefault();
    try {
      await fetchWithAuth('/api/auth/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoRol)
      });
      setShowCrearRol(false);
      setNuevoRol({ nombre: '', descripcion: '' });
      cargarDatos();
    } catch (error) {
      console.error('Error creando rol:', error);
    }
  };

  // Filtrar permisos en base al buscador
  const filteredPermisos = (Array.isArray(permisos) ? permisos : []).filter(permiso => {
    const q = searchQuery.toLowerCase();
    return (
      permiso.accion.toLowerCase().includes(q) ||
      permiso.modulo.toLowerCase().includes(q) ||
      (permiso.descripcion && permiso.descripcion.toLowerCase().includes(q))
    );
  });

  // Calcular paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const paginatedPermisos = filteredPermisos.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredPermisos.length / itemsPerPage);

  // Resetear página cuando cambia el buscador
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Agrupar permisos paginados por módulo
  const permisosPorModulo = paginatedPermisos.reduce((acc, permiso) => {
    if (!acc[permiso.modulo]) {
      acc[permiso.modulo] = [];
    }
    acc[permiso.modulo].push(permiso);
    return acc;
  }, {});

  if (loading) {
    return <div className="loading">Cargando...</div>;
  }

  return (
    <div id="gp-root" className="gestion-permisos">
      <div className="gestion-header">
        <h1>Gestión de Roles y Permisos</h1>
        <div className="header-actions">
          <div className="modo-toggle">
            <button
              className={`modo-btn ${modoVista === 'rol' ? 'active' : ''}`}
              onClick={() => setModoVista('rol')}
            >
              Por Rol
            </button>
            <button
              className={`modo-btn ${modoVista === 'usuario' ? 'active' : ''}`}
              onClick={() => setModoVista('usuario')}
            >
              Por Usuario
            </button>
          </div>
          {modoVista === 'rol' && (
            <>
              <select
                value={selectedRol?.id || ''}
                onChange={(e) => {
                  const rol = roles.find(r => r.id === parseInt(e.target.value));
                  if (rol) seleccionarRol(rol);
                }}
                className="rol-selector"
              >
                <option value="">Seleccionar Rol...</option>
                {(Array.isArray(roles) ? roles : []).map(rol => (
                  <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                ))}
              </select>
              <button className="btn-primary" onClick={() => setShowCrearRol(true)}>
                + Crear Rol
              </button>
            </>
          )}
          {modoVista === 'usuario' && (
            <select
              value={selectedUsuario?.id || ''}
              onChange={(e) => {
                const usuario = usuarios.find(u => u.id === parseInt(e.target.value));
                if (usuario) seleccionarUsuario(usuario);
              }}
              className="rol-selector"
            >
              <option value="">Seleccionar Usuario...</option>
              {(Array.isArray(usuarios) ? usuarios : []).map(usuario => (
                <option key={usuario.id} value={usuario.id}>{usuario.nombre} (@{usuario.usuario})</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {(modoVista === 'rol' && selectedRol) || (modoVista === 'usuario' && selectedUsuario) ? (
        <div className="permisos-table-container">
          <div className="table-header">
            <div className="table-header-left">
              <h2>
                Permisos: {modoVista === 'rol' ? selectedRol.nombre : `${selectedUsuario.nombre} (@${selectedUsuario.usuario})`}
              </h2>
              <p className="table-subtitle">
                {modoVista === 'rol'
                  ? 'Activa o desactiva los permisos para este rol'
                  : 'Activa o desactiva los permisos individuales para este usuario'}
              </p>
            </div>
            <div className="table-header-search">
              <input
                type="text"
                className="permisos-search-input"
                placeholder="🔍 Buscar permisos por módulo, acción o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          
          <div className="table-wrapper">
            <table className="permisos-table">
              <thead>
                <tr>
                  <th>Módulo</th>
                  <th>Acción</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(permisosPorModulo).length > 0 ? (
                  Object.entries(permisosPorModulo).map(([modulo, perms]) => (
                    perms.map(permiso => (
                      <tr key={permiso.id}>
                        <td>
                          <span className="modulo-badge">{modulo}</span>
                        </td>
                        <td className="permiso-accion-cell">{permiso.accion}</td>
                        <td className="permiso-desc-cell">{permiso.descripcion}</td>
                        <td>
                          <label className="switch">
                            <input
                              type="checkbox"
                              checked={
                                modoVista === 'rol'
                                  ? Array.isArray(rolPermisos) && rolPermisos.some(p => p.id === permiso.id)
                                  : Array.isArray(usuarioPermisos) && usuarioPermisos.some(p => p.id === permiso.id)
                              }
                              onChange={() => togglePermiso(permiso.id)}
                            />
                            <span className="slider"></span>
                          </label>
                        </td>
                      </tr>
                    ))
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="no-permisos-found">
                      No se encontraron permisos coincidentes con "{searchQuery}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Paginación — siempre visible abajo */}
          <div className="pagination-container">
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1 || totalPages <= 1}
            >
              ← Anterior
            </button>
            <span className="pagination-info">
              {totalPages > 1
                ? `Página ${currentPage} de ${totalPages} (${filteredPermisos.length} permisos)`
                : `${filteredPermisos.length} permisos`}
            </span>
            <button
              className="pagination-btn"
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages || totalPages <= 1}
            >
              Siguiente →
            </button>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">🔐</div>
          <h3>
            {modoVista === 'rol' ? 'Selecciona un rol' : 'Selecciona un usuario'}
          </h3>
          <p>
            {modoVista === 'rol'
              ? 'Elige un rol del selector superior para ver y configurar sus permisos'
              : 'Elige un usuario del selector superior para ver y configurar sus permisos individuales'}
          </p>
        </div>
      )}

      {/* Modal crear rol */}
      {showCrearRol && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Crear Nuevo Rol</h3>
            <form onSubmit={crearRol}>
              <div className="form-group">
                <label>Nombre del Rol</label>
                <input
                  type="text"
                  value={nuevoRol.nombre}
                  onChange={(e) => setNuevoRol({ ...nuevoRol, nombre: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descripción</label>
                <input
                  type="text"
                  value={nuevoRol.descripcion}
                  onChange={(e) => setNuevoRol({ ...nuevoRol, descripcion: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowCrearRol(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default GestionPermisos;
