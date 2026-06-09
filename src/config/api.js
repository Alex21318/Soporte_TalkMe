// Configuración centralizada de la API
// Permite cambiar fácilmente el puerto o entorno

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const API_URLS = {
  // Base URL para servicios que la necesiten
  baseUrl: API_BASE_URL,
  
  // Auditoría / Logs
  auditoriaLog: () => `${API_BASE_URL}/api/auditoria/log`,
  auditoriaLogs: (filtros = {}) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value);
      }
    });
    return `${API_BASE_URL}/api/auditoria/logs?${params.toString()}`;
  },
  auditoriaStats: () => `${API_BASE_URL}/api/auditoria/stats`,
  auditoriaTiposAccion: () => `${API_BASE_URL}/api/auditoria/tipos-accion`,
  
  // Auth endpoints
  login: () => `${API_BASE_URL}/api/auth/login`,
  logout: () => `${API_BASE_URL}/api/auth/logout`,
  verify: () => `${API_BASE_URL}/api/auth/verify`,
  checkInit: () => `${API_BASE_URL}/api/auth/check-init`,
  cambiarPassword: () => `${API_BASE_URL}/api/auth/cambiar-password`,
  
  // Sistema de usuarios
  systemUsers: () => `${API_BASE_URL}/api/auth/users`,
  createSystemUser: () => `${API_BASE_URL}/api/auth/users`,
  updateSystemUser: (id) => `${API_BASE_URL}/api/auth/users/${id}`,
  changeSystemUserPassword: (id) => `${API_BASE_URL}/api/auth/users/${id}/password`,
  
  // Skills endpoints
  empresas: (db_key) => `${API_BASE_URL}/api/empresas?db_key=${db_key}`,
  usuarios: (db_key, id_empresa, search, page) => 
    `${API_BASE_URL}/api/usuarios?db_key=${db_key}&id_empresa=${id_empresa}&search=${search}&page=${page}&limit=1500`,
  skillsLista: (db_key, id_empresa, search, page) => 
    `${API_BASE_URL}/api/skills/lista?db_key=${db_key}&id_empresa=${id_empresa}&search=${search}&page=${page}&limit=10`,
  skills: (db_key, id_empresa, params = {}) => {
    let url = `${API_BASE_URL}/api/skills?db_key=${db_key}&id_empresa=${id_empresa}`;
    if (params.ids_skill) url += `&ids_skill=${params.ids_skill}`;
    if (params.ids_usuario) url += `&ids_usuario=${params.ids_usuario}`;
    if (params.estado !== undefined && params.estado !== '') url += `&estado=${params.estado}`;
    if (params.eliminado !== undefined && params.eliminado !== '') url += `&eliminado=${params.eliminado}`;
    return url;
  },
  programar: () => `${API_BASE_URL}/api/programar`,
  programados: () => `${API_BASE_URL}/api/programados`,
  historial: () => `${API_BASE_URL}/api/historial`,
  programado: (id) => `${API_BASE_URL}/api/programados/${id}`,
  
  // Diagramas endpoints
  bots: () => `${API_BASE_URL}/api/bots`,
  bot: (id) => `${API_BASE_URL}/api/bots/${id}`,
  botsEmpresa: (db_key, id_empresa) => `${API_BASE_URL}/api/bots-empresa?db_key=${db_key}&id_empresa=${id_empresa}`,
  
  // Skills - Horarios
  horario: (db_key, id_horario) => `${API_BASE_URL}/api/skills/horario/${db_key}/${id_horario}`,
  horarioCreate: () => `${API_BASE_URL}/api/skills/horario`,
  
  // Skills - Mensajes
  skillMensaje: () => `${API_BASE_URL}/api/skills/mensaje`,
  programarMensajes: () => `${API_BASE_URL}/api/programar-mensajes`,
  programadosMensajes: () => `${API_BASE_URL}/api/programados-mensajes`,
  historialMensajes: () => `${API_BASE_URL}/api/historial-mensajes`,
  programadoMensaje: (id) => `${API_BASE_URL}/api/programados-mensajes/${id}`,
  
  // Skills - Permisos
  permisoUsuario: () => `${API_BASE_URL}/api/skills/usuario/permiso`,
  permisoUsuarioDelete: (idUsuario, idSkill) => 
    `${API_BASE_URL}/api/skills/usuario/permiso/${idUsuario}/${idSkill}`,
  
  // Usuarios - Permisos
  permisosRedes: (db_key, id_usuario) => 
    `${API_BASE_URL}/api/usuarios/permisos/redes?db_key=${db_key}&id_usuario=${id_usuario}`,
  permisosSkills: (db_key, id_usuario) => 
    `${API_BASE_URL}/api/usuarios/permisos/skills?db_key=${db_key}&id_usuario=${id_usuario}`,
  permisosTiposCliente: (db_key, id_usuario) => 
    `${API_BASE_URL}/api/usuarios/permisos/tipos-cliente?db_key=${db_key}&id_usuario=${id_usuario}`,
  
  // Gestión Masiva de Permisos
  permisosMasivoAgregar: () => `${API_BASE_URL}/api/permisos/masivo/agregar`,
  permisosMasivoEliminar: () => `${API_BASE_URL}/api/permisos/masivo/eliminar`,
  skillsDisponibles: (db_key, id_empresa, search) => 
    `${API_BASE_URL}/api/skills/disponibles?db_key=${db_key}&id_empresa=${id_empresa || ''}&search=${search || ''}&limit=9999`,
  tiposClienteDisponibles: (db_key, id_empresa, search) => 
    `${API_BASE_URL}/api/tipos-cliente/disponibles?db_key=${db_key}&id_empresa=${id_empresa || ''}&search=${search || ''}&limit=9999`,
  botRedesDisponibles: (db_key, id_empresa, search) => 
    `${API_BASE_URL}/api/bot-redes/disponibles?db_key=${db_key}&id_empresa=${id_empresa || ''}&search=${search || ''}&limit=9999`,
  
  // Usuarios con skills específicas
  usuariosConSkills: (db_key, id_empresa, ids_skill) =>
    `${API_BASE_URL}/api/usuarios/con-skills?db_key=${db_key}&id_empresa=${id_empresa || ''}&ids_skill=${ids_skill}`,
  
  // Usuarios con bot redes específicas
  usuariosConBotRedes: (db_key, id_empresa, ids_bot_red) =>
    `${API_BASE_URL}/api/usuarios/con-bot-redes?db_key=${db_key}&id_empresa=${id_empresa || ''}&ids_bot_red=${ids_bot_red}`,

  // Seguridad - Estado y Perfiles
  infoUsuarioSeguridad: (db_key, nombre_usuario) => 
    `${API_BASE_URL}/api/usuarios/seguridad/info?db_key=${db_key}&nombre_usuario=${nombre_usuario}`,
  perfilesSeguridad: (db_key) => 
    `${API_BASE_URL}/api/seguridad/perfiles?db_key=${db_key}`,
  usuariosPorPerfil: (db_key, id_empresa, perfil_id) => 
    `${API_BASE_URL}/api/usuarios/por-perfil?db_key=${db_key}&id_empresa=${id_empresa}&perfil_id=${perfil_id}`,
  
  // Edición masiva de horarios
  horarioUpdateMasivo: () => `${API_BASE_URL}/api/horarios/masivo`,

  // Cierres automáticos
  cierresPreview: (db_key) => `${API_BASE_URL}/api/cierres/preview?db_key=${db_key}`,
  cierresEjecutar: () => `${API_BASE_URL}/api/cierres/ejecutar`,

  // Facebook — solicitudes de eliminación
  facebookPreview: (db_key) => `${API_BASE_URL}/api/facebook/preview?db_key=${db_key}`,
  facebookEjecutar: () => `${API_BASE_URL}/api/facebook/ejecutar`,

  // Tareas programadas (cierres + facebook)
  tareasLista: () => `${API_BASE_URL}/api/tareas`,
  tareasGuardar: () => `${API_BASE_URL}/api/tareas`,
  tareasEliminar: (tipo, db_key) => `${API_BASE_URL}/api/tareas/${tipo}/${db_key}`,
  tareasEjecutarAhora: () => `${API_BASE_URL}/api/tareas/ejecutar-ahora`,
  tareasLog: (tipo, db_key) => `${API_BASE_URL}/api/tareas/log?tipo=${tipo}&db_key=${db_key}`,
  tareasUltimoLog: (tipo, db_key) => `${API_BASE_URL}/api/tareas/ultimo-log?tipo=${tipo}&db_key=${db_key}`,
  botTagsBuscar: (db_key, id_bot, tag) =>
    `${API_BASE_URL}/api/bot-tags/buscar?db_key=${db_key}&id_bot=${id_bot}&tag=${encodeURIComponent(tag || '')}`,

  // Seguridad — Permisos completos
  seguridadEmpresas: (db_key) => `${API_BASE_URL}/api/seguridad/empresas?db_key=${db_key}`,
  seguridadPerfilesList: (db_key) => `${API_BASE_URL}/api/seguridad/perfiles-lista?db_key=${db_key}`,
  seguridadElementosList: (db_key) => `${API_BASE_URL}/api/seguridad/elementos-lista?db_key=${db_key}`,
  seguridadPermisosUsuarios: (db_key, params = {}) => {
    let url = `${API_BASE_URL}/api/seguridad/permisos-usuarios?db_key=${db_key}`;
    if (params.secempresaid) url += `&secempresaid=${params.secempresaid}`;
    if (params.estado) url += `&estado=${params.estado}`;
    if (params.perfil_id) url += `&perfil_id=${params.perfil_id}`;
    return url;
  },
  seguridadPermisosActualizar: () => `${API_BASE_URL}/api/seguridad/permisos-actualizar`,
  seguridadArbolUsuario: (db_key, secusuarioid) =>
    `${API_BASE_URL}/api/seguridad/arbol-usuario?db_key=${db_key}&secusuarioid=${secusuarioid}`,
  seguridadUsuariosLista: (db_key, params = {}) => {
    let url = `${API_BASE_URL}/api/seguridad/usuarios-lista?db_key=${db_key}`;
    if (params.secempresaid) url += `&secempresaid=${params.secempresaid}`;
    if (params.estado)       url += `&estado=${params.estado}`;
    if (params.perfilid)     url += `&perfilid=${params.perfilid}`;
    return url;
  },
  seguridadUsuariosConElemento: (db_key, secelementoid, params = {}) => {
    let url = `${API_BASE_URL}/api/seguridad/usuarios-con-elemento?db_key=${db_key}&secelementoid=${secelementoid}`;
    if (params.secempresaid) url += `&secempresaid=${params.secempresaid}`;
    if (params.estado)       url += `&estado=${params.estado}`;
    if (params.perfilid)     url += `&perfilid=${params.perfilid}`;
    return url;
  },
  seguridadAsignarMasivo: () => `${API_BASE_URL}/api/seguridad/asignar-masivo`,
  seguridadQuitarMasivo:  () => `${API_BASE_URL}/api/seguridad/quitar-masivo`,
  seguridadDesbloquearUsuario: () => `${API_BASE_URL}/api/seguridad/desbloquear-usuario`,
  seguridadPerfilesPorEmpresa: (db_key, secempresaid) =>
    `${API_BASE_URL}/api/seguridad/perfiles-por-empresa?db_key=${db_key}&secempresaid=${secempresaid}`,
  seguridadElementosPorEmpresa: (db_key, secempresaid) =>
    `${API_BASE_URL}/api/seguridad/elementos-por-empresa?db_key=${db_key}&secempresaid=${secempresaid}`,

  // Estados de usuarios
  estadosActuales: (db_key, id_empresa) =>
    `${API_BASE_URL}/api/usuarios/estados-actuales?db_key=${db_key}&id_empresa=${id_empresa}`,
  estadosDisponibles: (db_key, id_empresa) =>
    `${API_BASE_URL}/api/estados/disponibles?db_key=${db_key}&id_empresa=${id_empresa}`,
  historialEstados: (db_key, params = {}) => {
    let url = `${API_BASE_URL}/api/usuarios/historial-estados?db_key=${db_key}`;
    if (params.fecha_inicio) url += `&fecha_inicio=${params.fecha_inicio}`;
    if (params.fecha_fin) url += `&fecha_fin=${params.fecha_fin}`;
    if (params.id_empresa) url += `&id_empresa=${params.id_empresa}`;
    if (params.perfil) url += `&perfil=${encodeURIComponent(params.perfil)}`;
    if (params.estado) url += `&estado=${params.estado}`;
    if (params.id_usuario) url += `&id_usuario=${params.id_usuario}`;
    if (params.skills) url += `&skills=${encodeURIComponent(params.skills)}`;
    if (params.bot_redes) url += `&bot_redes=${encodeURIComponent(params.bot_redes)}`;
    return url;
  },

  // Reportes endpoints
  reportesEmpresas: (db_key) => `${API_BASE_URL}/api/empresas?db_key=${db_key}`,
  reportesSkills: (db_key) => `${API_BASE_URL}/api/skills?db_key=${db_key}`,
  reportesDetallado: () => `${API_BASE_URL}/api/reportes/detallado`,
  reportesResumido: () => `${API_BASE_URL}/api/reportes/resumido`,
  reportesGrupoQ: () => `${API_BASE_URL}/api/reportes/grupoq`,
  reportesBotsBroadcast: (db_key, id_empresa) => `${API_BASE_URL}/api/reportes/bots-broadcast?db_key=${db_key}&id_empresa=${id_empresa}`,
  reportesBotsEmpresa: (db_key, id_empresa) => `${API_BASE_URL}/api/reportes/bots-empresa?db_key=${db_key}&id_empresa=${id_empresa}`,
  reportesCampanias: () => `${API_BASE_URL}/api/reportes/campanias`,
  reportesBroadcast: () => `${API_BASE_URL}/api/reportes/broadcast`,
  reportesApiNotificaciones: () => `${API_BASE_URL}/api/reportes/api-notificaciones`,
  reportesNumerosActivos: () => `${API_BASE_URL}/api/reportes/numeros-activos`,
  reportesResolucionesPalabra: () => `${API_BASE_URL}/api/reportes/resoluciones-palabra`,
  reportesSesiones: () => `${API_BASE_URL}/api/reportes/sesiones`,
  reportesCampaniasReporte: () => `${API_BASE_URL}/api/reportes/campanias-reporte`,
  reportesFormularioBot: (db_key, id_bots) => `${API_BASE_URL}/api/reportes/formularios-bot?db_key=${db_key}&id_bots=${Array.isArray(id_bots) ? id_bots.join(',') : id_bots}`,
  reportesRespuestas: () => `${API_BASE_URL}/api/reportes/respuestas`,
  reportesNotasRapidas: () => `${API_BASE_URL}/api/reportes/notasrapidas`,
  reportesNotasRapidasLista: () => `${API_BASE_URL}/api/notas-rapidas`,
  reportesSkillsMaestro: () => `${API_BASE_URL}/api/reportes/skills`,
  reportesRecontactosProgramados: () => `${API_BASE_URL}/api/reportes/recontactos-programados`,
  diagramasBotMenu: () => `${API_BASE_URL}/api/diagramas/bot-menu`,
  diagramasBotInfo: () => `${API_BASE_URL}/api/diagramas/bot-info`,

  // Scheduler / Reportes Automáticos - Email
  schedulerDestinatarios: (id_job) => `${API_BASE_URL}/api/scheduler/destinatarios?id_job=${id_job}`,
  schedulerDestinatariosPorReporte: (id_job, clave) => `${API_BASE_URL}/api/scheduler/destinatarios/${clave}?id_job=${id_job}`,
  schedulerAgregarDestinatario: () => `${API_BASE_URL}/api/scheduler/destinatarios`,
  schedulerEliminarDestinatario: (id_email) => `${API_BASE_URL}/api/scheduler/destinatarios/${id_email}`,
  schedulerEmailConfig: () => `${API_BASE_URL}/api/scheduler/email/config`,
  schedulerEmailHistorial: (params = {}) => {
    let url = `${API_BASE_URL}/api/scheduler/email/historial`;
    const query = [];
    if (params.id_job) query.push(`id_job=${params.id_job}`);
    if (params.clave_reporte) query.push(`clave_reporte=${params.clave_reporte}`);
    if (params.fecha_desde) query.push(`fecha_desde=${params.fecha_desde}`);
    if (params.fecha_hasta) query.push(`fecha_hasta=${params.fecha_hasta}`);
    if (params.limit) query.push(`limit=${params.limit}`);
    if (query.length > 0) url += '?' + query.join('&');
    return url;
  },
  schedulerEmailProbar: () => `${API_BASE_URL}/api/scheduler/email/probar`,
  
  // Templates de correo (configuración tipo Outlook)
  schedulerTemplates: (id_job) => `${API_BASE_URL}/api/scheduler/templates?id_job=${id_job}`,
  schedulerTemplate: (id) => `${API_BASE_URL}/api/scheduler/templates/${id}`,
  schedulerCrearTemplate: () => `${API_BASE_URL}/api/scheduler/templates`,
  schedulerActualizarTemplate: (id) => `${API_BASE_URL}/api/scheduler/templates/${id}`,
  schedulerEliminarTemplate: (id) => `${API_BASE_URL}/api/scheduler/templates/${id}`,
  schedulerToggleTemplateActivo: (id) => `${API_BASE_URL}/api/scheduler/templates/${id}/activo`,
  
  // Plantillas WhatsApp
  plantillasWhatsApp: () => `${API_BASE_URL}/api/plantillas-whatsapp`,
  plantillasWhatsAppExport: () => `${API_BASE_URL}/api/plantillas-whatsapp/export`,
  plantillasWhatsAppActualizar: (id) => `${API_BASE_URL}/api/plantillas-whatsapp/${id}`,
  plantillasCategorias: () => `${API_BASE_URL}/api/plantillas-categorias`,
  plantillasParametros: (id) => `${API_BASE_URL}/api/plantillas-whatsapp/${id}/parametros`,
  plantillasParametrosActualizar: (id) => `${API_BASE_URL}/api/plantillas-whatsapp/${id}/parametros`,
  empresasPlantillas: () => `${API_BASE_URL}/api/empresas-plantillas`,
  botsPlantillas: () => `${API_BASE_URL}/api/bots-plantillas`,
  
  // Usuarios QRM
  usuariosQRM: () => `${API_BASE_URL}/api/usuarios-qrm`,
  usuariosQRMMasivo: () => `${API_BASE_URL}/api/usuarios-qrm/masivo`,
  qrmConfigUsuario: () => `${API_BASE_URL}/api/usuarios-qrm/config`,
  qrmBots: () => `${API_BASE_URL}/api/usuarios-qrm/bots`,
  qrmCanales: (idBot) => `${API_BASE_URL}/api/usuarios-qrm/canales?id_bot=${idBot}`,
  qrmSociedades: (idBot) => `${API_BASE_URL}/api/usuarios-qrm/sociedades?id_bot=${idBot}`,
  botRedesPorUsuario: () => `${API_BASE_URL}/api/usuarios-qrm/canales-por-usuario`,

  // Creaciones endpoints
  creacionesPlantillaSQL: () => `${API_BASE_URL}/api/creaciones/plantilla-sql`,
  creacionesInstancia: () => `${API_BASE_URL}/api/creaciones/instancia`,
  creacionesInstanciaProbarSQL: () => `${API_BASE_URL}/api/creaciones/instancia/probar-sql`,
  creacionesEmpresas: (db_key) => `${API_BASE_URL}/api/creaciones/empresas?db_key=${db_key}`,
  creacionesBots: (db_key, id_empresa) => `${API_BASE_URL}/api/creaciones/bots?db_key=${db_key}&id_empresa=${id_empresa}`,
  creacionesBotRedes: (db_key, id_bot) => `${API_BASE_URL}/api/creaciones/bot-redes?db_key=${db_key}&id_bot=${id_bot}`,
  creacionesWhatsApp: () => `${API_BASE_URL}/api/creaciones/whatsapp`,
  creacionesWhatsAppProbar: () => `${API_BASE_URL}/api/creaciones/whatsapp/probar`,
  creacionesFacebookInstagram: () => `${API_BASE_URL}/api/creaciones/facebook-instagram`,
  
  // Números demos endpoints
  numerosDemos: () => `${API_BASE_URL}/api/numeros-demos`,
  numerosDemosValidar: () => `${API_BASE_URL}/api/numeros-demos/validar`,
  numerosDemosDisponibles: () => `${API_BASE_URL}/api/numeros-demos/disponibles`,
  numerosDemosOcupar: (id) => `${API_BASE_URL}/api/numeros-demos/${id}/ocupar`,
  numerosDemosLiberar: (id) => `${API_BASE_URL}/api/numeros-demos/${id}/liberar`,

  // Horarios bots
  horariosBot: (db_key, id_bot) => `${API_BASE_URL}/api/horarios-bot?db_key=${db_key}&id_bot=${id_bot}`,
  horariosBotCrear: () => `${API_BASE_URL}/api/horarios-bot`,
  horariosBotActualizar: (id) => `${API_BASE_URL}/api/horarios-bot/${id}`,
  horariosBotEliminar: (id, db_key) => `${API_BASE_URL}/api/horarios-bot/${id}?db_key=${db_key}`,

  // Bitácora Administrativa
  bitacoraAdministrativa: (params = {}) => {
    let url = `${API_BASE_URL}/api/bitacora-administrativa`;
    const query = [];
    if (params.db_key) query.push(`db_key=${params.db_key}`);
    if (params.id_empresa) query.push(`id_empresa=${params.id_empresa}`);
    if (params.empresa) query.push(`empresa=${encodeURIComponent(params.empresa)}`);
    if (params.subgrupo) query.push(`subgrupo=${encodeURIComponent(params.subgrupo)}`);
    if (params.categoria) query.push(`categoria=${encodeURIComponent(params.categoria)}`);
    if (params.descripcion) query.push(`descripcion=${encodeURIComponent(params.descripcion)}`);
    if (params.creado_por) query.push(`creado_por=${encodeURIComponent(params.creado_por)}`);
    if (params.fecha_inicio) query.push(`fecha_inicio=${params.fecha_inicio}`);
    if (params.fecha_fin) query.push(`fecha_fin=${params.fecha_fin}`);
    if (params.limit) query.push(`limit=${params.limit}`);
    if (params.offset) query.push(`offset=${params.offset}`);
    if (query.length > 0) url += '?' + query.join('&');
    return url;
  },
  bitacoraAdministrativaFiltros: (db_key) => `${API_BASE_URL}/api/bitacora-administrativa/filtros?db_key=${db_key}`,
};

export default API_BASE_URL;
