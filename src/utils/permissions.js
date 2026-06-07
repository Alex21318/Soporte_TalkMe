// Helper para verificar permisos del usuario

export const getUserPermissions = () => {
  try {
    const permissions = sessionStorage.getItem('user_permissions');
    return permissions ? JSON.parse(permissions) : [];
  } catch (error) {
    console.error('Error al obtener permisos:', error);
    return [];
  }
};

export const hasPermission = (modulo, accion) => {
  const permissions = getUserPermissions();
  const permissionKey = `${modulo}:${accion}`;
  return permissions.includes(permissionKey);
};

export const hasAnyPermission = (modulo, acciones = []) => {
  const permissions = getUserPermissions();
  return acciones.some(accion => permissions.includes(`${modulo}:${accion}`));
};

export const hasModuleAccess = (modulo) => {
  const permissions = getUserPermissions();
  return permissions.some(p => p.startsWith(`${modulo}:`));
};
