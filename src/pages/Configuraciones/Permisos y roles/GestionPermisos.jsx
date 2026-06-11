import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './GestionPermisos.css';

function GestionPermisos() {
  const [roles, setRoles] = useState([]);
  const [permisos, setPermisos] = useState([]);
  const [selectedRol, setSelectedRol] = useState(null);
  const [rolPermisos, setRolPermisos] = useState([]);
  const [rolPermisosOriginal, setRolPermisosOriginal] = useState([]); // Para detectar cambios
  const [usuarios, setUsuarios] = useState([]);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [usuarioPermisos, setUsuarioPermisos] = useState([]);
  const [usuarioPermisosOriginal, setUsuarioPermisosOriginal] = useState([]); // Para detectar cambios
  const [loading, setLoading] = useState(true);
  const [modoVista, setModoVista] = useState('rol'); // 'rol' o 'usuario'
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(15);
  const [haysCambios, setHaysCambios] = useState(false); // Detectar cambios sin guardar
  const tableWrapperRef = useRef(null);

  // Calcular items por página dinámicamente basado en altura disponible
  const calcularItemsPerPage = useCallback(() => {
    if (!tableWrapperRef.current) return 5;
    
    const wrapperHeight = tableWrapperRef.current.clientHeight;
    // Altura de cada fila: ~42px (incluye padding, border, etc.)
    const rowHeight = 42;
    // Calcular cuántas filas caben en el espacio disponible
    const calculatedItems = Math.max(5, Math.floor(wrapperHeight / rowHeight));
    
    return calculatedItems;
  }, []);

  // Recalcular cuando cambia el tamaño de la ventana y cuando la tabla está lista
  useEffect(() => {
    const updateItemsPerPage = () => {
      const newItemsPerPage = calcularItemsPerPage();
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1); // Reset a la primera página
    };

    // Calcular al montar
    const timer = setTimeout(updateItemsPerPage, 150);
    
    // Listener para resize
    window.addEventListener('resize', updateItemsPerPage);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateItemsPerPage);
    };
  }, [calcularItemsPerPage]);

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
    setCurrentPage(1); // Reset paginación
    setSearchQuery(''); // Reset búsqueda
    setHaysCambios(false); // Reset flag de cambios
    try {
      const permisosRes = await fetchWithAuth(`/api/auth/roles/${rol.id}/permisos`);
      const permisosData = await permisosRes.json();
      setRolPermisos(permisosData);
      setRolPermisosOriginal(permisosData); // Guardar estado original
    } catch (error) {
      console.error('Error cargando permisos del rol:', error);
    }
  };

  const seleccionarUsuario = async (usuario) => {
    setSelectedUsuario(usuario);
    setSelectedRol(null);
    setCurrentPage(1); // Reset paginación
    setSearchQuery(''); // Reset búsqueda
    setHaysCambios(false); // Reset flag de cambios
    try {
      const permisosRes = await fetchWithAuth(`/api/auth/users/${usuario.id}/permisos`);
      const permisosData = await permisosRes.json();
      setUsuarioPermisos(permisosData);
      setUsuarioPermisosOriginal(permisosData); // Guardar estado original
    } catch (error) {
      console.error('Error cargando permisos del usuario:', error);
    }
  };

  const togglePermiso = (permisoId) => {
    if (modoVista === 'rol' && !selectedRol) return;
    if (modoVista === 'usuario' && !selectedUsuario) return;

    if (modoVista === 'rol') {
      const tienePermiso = rolPermisos.some(p => p.id === permisoId);
      const nuevosPermisos = tienePermiso
        ? rolPermisos.filter(p => p.id !== permisoId)
        : [...rolPermisos, permisos.find(p => p.id === permisoId)];

      setRolPermisos(nuevosPermisos);
      setHaysCambios(true); // Marcar que hay cambios sin guardar
    } else {
      const tienePermiso = usuarioPermisos.some(p => p.id === permisoId);
      const nuevosPermisos = tienePermiso
        ? usuarioPermisos.filter(p => p.id !== permisoId)
        : [...usuarioPermisos, permisos.find(p => p.id === permisoId)];

      setUsuarioPermisos(nuevosPermisos);
      setHaysCambios(true); // Marcar que hay cambios sin guardar
    }
  };

  const guardarPermisos = async () => {
    if (modoVista === 'rol' && !selectedRol) return;
    if (modoVista === 'usuario' && !selectedUsuario) return;

    try {
      let response;
      if (modoVista === 'rol') {
        response = await fetchWithAuth(`/api/auth/roles/${selectedRol.id}/permisos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permisoIds: rolPermisos.map(p => p.id) })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Error al guardar permisos del rol');
        }
        setRolPermisosOriginal(rolPermisos);
      } else {
        response = await fetchWithAuth(`/api/auth/users/${selectedUsuario.id}/permisos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ permisoIds: usuarioPermisos.map(p => p.id) })
        });
        if (!response.ok) {
          const err = await response.json().catch(() => ({}));
          throw new Error(err.error || 'Error al guardar permisos del usuario');
        }
        setUsuarioPermisosOriginal(usuarioPermisos);
      }
      setHaysCambios(false);
      toast.success('Permisos guardados correctamente');
    } catch (error) {
      console.error('Error guardando permisos:', error);
      toast.error('Error al guardar los permisos: ' + error.message);
    }
  };

  const cancelarCambios = () => {
    if (modoVista === 'rol') {
      setRolPermisos(rolPermisosOriginal);
    } else {
      setUsuarioPermisos(usuarioPermisosOriginal);
    }
    setHaysCambios(false);
  };

  // Recalcular items por página cuando se cargan permisos o cambia la selección
  useEffect(() => {
    // Esperar a que el DOM se actualice
    const timer = setTimeout(() => {
      const newItemsPerPage = calcularItemsPerPage();
      setItemsPerPage(newItemsPerPage);
      setCurrentPage(1);
    }, 100);

    return () => clearTimeout(timer);
  }, [selectedRol, selectedUsuario, calcularItemsPerPage]);

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
      <div className="gestion-body">
        {/* SIDEBAR IZQUIERDO - Lista de Roles/Usuarios */}
        <div className="gestion-sidebar">
          <div className="sidebar-header">
            <div className="modo-toggle-sidebar">
              <button
                className={`modo-btn-sidebar ${modoVista === 'rol' ? 'active' : ''}`}
                onClick={() => setModoVista('rol')}
              >
                👥 Roles
              </button>
              <button
                className={`modo-btn-sidebar ${modoVista === 'usuario' ? 'active' : ''}`}
                onClick={() => setModoVista('usuario')}
              >
                👤 Usuarios
               </button>
            </div>
          </div>
          
          <div className="sidebar-list">
            {modoVista === 'rol' ? (
              (Array.isArray(roles) ? roles : []).map(rol => (
                <div
                  key={rol.id}
                  className={`sidebar-item ${selectedRol?.id === rol.id ? 'active' : ''}`}
                  onClick={() => seleccionarRol(rol)}
                >
                  <div className="item-name">{rol.nombre}</div>
                  <div className="item-desc">{rol.descripcion || 'Sin descripción'}</div>
                </div>
              ))
            ) : (
              (Array.isArray(usuarios) ? usuarios : []).map(usuario => (
                <div
                  key={usuario.id}
                  className={`sidebar-item ${selectedUsuario?.id === usuario.id ? 'active' : ''}`}
                  onClick={() => seleccionarUsuario(usuario)}
                >
                  <div className="item-name">{usuario.nombre}</div>
                  <div className="item-desc">@{usuario.usuario}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* PANEL DERECHO - Permisos */}
        <div className="gestion-panel">
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
                    placeholder="🔍 Buscar permisos..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="table-wrapper" ref={tableWrapperRef}>
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
                <div className="pagination-left">
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

                {/* Botones Guardar/Cancelar - solo si hay cambios */}
                {haysCambios && (
                  <div className="pagination-actions">
                    <button
                      className="btn-cancelar"
                      onClick={cancelarCambios}
                    >
                      Cancelar
                    </button>
                    <button
                      className="btn-guardar"
                      onClick={guardarPermisos}
                    >
                      ✓ Guardar Cambios
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="empty-logo" />
              <h3>
                {modoVista === 'rol' ? 'Selecciona un rol' : 'Selecciona un usuario'}
              </h3>
              <p>
                {modoVista === 'rol'
                  ? 'Elige un rol de la lista para ver y configurar sus permisos'
                  : 'Elige un usuario de la lista para ver y configurar sus permisos individuales'}
              </p>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

export default GestionPermisos;
