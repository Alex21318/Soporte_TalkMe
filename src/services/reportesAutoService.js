const API_BASE = 'http://localhost:3001';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function obtenerConfig() {
  return fetchJson(`${API_BASE}/api/scheduler/config`);
}

export async function guardarConfig(config) {
  return fetchJson(`${API_BASE}/api/scheduler/config`, {
    method: 'POST',
    body: JSON.stringify(config),
  });
}

export async function guardarReporte(reporte) {
  return fetchJson(`${API_BASE}/api/scheduler/reporte/agregar`, {
    method: 'POST',
    body: JSON.stringify(reporte),
  });
}

export async function eliminarReporte(clave) {
  const res = await fetch(`${API_BASE}/api/scheduler/reporte/${clave}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function obtenerHistorial() {
  return fetchJson(`${API_BASE}/api/scheduler/log`);
}

export async function reintentarReporte(idLog) {
  return fetchJson(`${API_BASE}/api/scheduler/reintentar`, {
    method: 'POST',
    body: JSON.stringify({ id_log: idLog }),
  });
}

export async function obtenerEmailConfig() {
  return fetchJson(`${API_BASE}/api/scheduler/email/config`);
}

export async function obtenerTemplates(idJob) {
  return fetchJson(`${API_BASE}/api/scheduler/templates?id_job=${idJob}`);
}

export async function obtenerTemplate(id) {
  return fetchJson(`${API_BASE}/api/scheduler/templates/${id}`);
}

export async function guardarTemplate(tpl) {
  const url = tpl.id_template
    ? `${API_BASE}/api/scheduler/templates/${tpl.id_template}`
    : `${API_BASE}/api/scheduler/templates`;
  return fetchJson(url, {
    method: tpl.id_template ? 'PUT' : 'POST',
    body: JSON.stringify(tpl),
  });
}

export async function eliminarTemplate(id) {
  const res = await fetch(`${API_BASE}/api/scheduler/templates/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function obtenerDestinatarios(idJob) {
  return fetchJson(`${API_BASE}/api/scheduler/destinatarios?id_job=${idJob}`);
}

export async function cargarEmpresasParaFiltros(dbKey) {
  return fetchJson(`${API_BASE}/api/empresas?db_key=${dbKey}`);
}

export async function cargarSkillsParaFiltros(dbKey, idEmpresa) {
  return fetchJson(`${API_BASE}/api/skills?db_key=${dbKey}&id_empresa=${idEmpresa}`);
}

export async function cargarBotsParaFiltros(dbKey, idEmpresa, tipo) {
  return fetchJson(`${API_BASE}/api/reportes/bots-empresa?db_key=${dbKey}&id_empresa=${idEmpresa}`);
}

export async function cargarFormulariosParaFiltros(dbKey, idBots) {
  const ids = Array.isArray(idBots) ? idBots.join(',') : idBots;
  return fetchJson(`${API_BASE}/api/reportes/formularios-bot?db_key=${dbKey}&id_bots=${ids}`);
}