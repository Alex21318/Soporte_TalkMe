import React, { useState, useCallback, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import ConfirmModal from '../../components/ConfirmModal';
import '../Cierres/Cierres.css'; // Importamos estilos de seguridad (prefijo ci- no colisiona con usr-)

// Etiquetas de resultado del log masivo
const LOG_LABELS = {
  asignado:                      { icon: '✓', texto: 'Permiso asignado',                          cls: 'ok'    },
  reactivado:                    { icon: '✓', texto: 'Reactivado (era denegado)',                   cls: 'ok'    },
  negacion_eliminada_perfil_activo: { icon: '✓', texto: 'Negación eliminada — ahora por perfil',     cls: 'ok'    },
  ya_existia_manual:             { icon: '⚠', texto: 'Ya tenía permiso manual',                     cls: 'warn'  },
  ya_existia_perfil:             { icon: '⚠', texto: 'Ya tiene permiso por perfil',                 cls: 'warn'  },
  negado:                        { icon: '✓', texto: 'Permiso removido (negado)',                   cls: 'ok'    },
  ya_negado:                     { icon: '⚠', texto: 'Ya estaba removido (negado)',                 cls: 'warn'  },
  sin_permiso:                   { icon: '—', texto: 'Sin permiso — nada que quitar',               cls: 'muted' },
  error:                         { icon: '✗', texto: 'Error',                                       cls: 'err'   },
};

// Etiquetas de estado de permiso
const ESTADO_LABEL = {
  HABILITADO_PERFIL:  { label: 'Perfil',   cls: 'ci-seg-badge-perfil' },
  HABILITADO_MANUAL:  { label: 'Manual',   cls: 'ci-seg-badge-manual' },
  DENEGADO_MANUAL:    { label: 'Denegado', cls: 'ci-seg-badge-denegado' },
  SIN_PERMISO:        { label: '',         cls: '' },
};

function TreeNode({ node, origPermisos, pendientes, onToggle, depth = 0 }) {
  const [open, setOpen] = useState(false);
  const hasHijos = node.hijos && node.hijos.length > 0;

  const orig = origPermisos[node.id] || 'SIN_PERMISO';
  const pendiente = pendientes[node.id];

  let estadoEfectivo;
  if (pendiente === 'H') estadoEfectivo = 'HABILITADO_MANUAL';
  else if (pendiente === 'D') estadoEfectivo = 'DENEGADO_MANUAL';
  else if (pendiente === null) estadoEfectivo = orig === 'HABILITADO_PERFIL' ? 'HABILITADO_PERFIL' : 'SIN_PERMISO';
  else estadoEfectivo = orig;

  const isOn = estadoEfectivo === 'HABILITADO_PERFIL' || estadoEfectivo === 'HABILITADO_MANUAL';
  const isPending = pendiente !== undefined;
  const badge = ESTADO_LABEL[estadoEfectivo] || ESTADO_LABEL.SIN_PERMISO;

  const handleToggle = () => {
    if (isOn) {
      if (orig === 'HABILITADO_PERFIL') onToggle(node.id, 'D');
      else if (orig === 'HABILITADO_MANUAL') onToggle(node.id, null);
      else onToggle(node.id, null);
    } else {
      if (orig === 'DENEGADO_MANUAL') onToggle(node.id, null);
      else onToggle(node.id, 'H');
    }
  };

  return (
    <div className="ci-tree-node">
      <div className={`ci-tree-row ci-tree-depth-${Math.min(depth, 2)} ${isPending ? 'ci-tree-row-pending' : ''}`}>
        <span className="ci-tree-arrow">
          {hasHijos
            ? <span onClick={() => setOpen(o => !o)} style={{ cursor: 'pointer' }}>{open ? '▾' : '▸'}</span>
            : <span className="ci-tree-dot">·</span>}
        </span>
        <span className="ci-tree-name">{node.etiqueta}</span>
        {badge.label && <span className={`ci-seg-badge ${badge.cls}`}>{badge.label}</span>}
        <button className={`ci-seg-check ${isOn ? 'ci-seg-on' : 'ci-seg-off'}`} onClick={handleToggle} title={isOn ? 'Quitar permiso' : 'Dar permiso'} style={{ marginLeft: 'auto' }}>
          {isOn ? '✔' : '✘'}
        </button>
      </div>
      {open && hasHijos && (
        <div className="ci-tree-children">
          {node.hijos.map(h => (
            <TreeNode key={h.id} node={h} origPermisos={origPermisos} pendientes={pendientes} onToggle={onToggle} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function SeguridadModal({ usuario, dbKey, onClose, onSaved }) {
  const [pendientes, setPendientes] = useState({});
  const [saving, setSaving] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [arbol, setArbol] = useState(null);
  const [origPermisos, setOrigPermisos] = useState(usuario.permisos || {});
  const [loadingArbol, setLoadingArbol] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoadingArbol(true);
    fetchWithAuth(API_URLS.seguridadArbolUsuario(dbKey, usuario.secusuarioid), { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.arbol_completo)) {
          setArbol(data.arbol_completo);
          setOrigPermisos(data.permisos || {});
        } else if (data && data.error) console.error('Error al cargar árbol:', data.error);
      })
      .catch(e => { if (e.name !== 'AbortError') console.error(e); })
      .finally(() => setLoadingArbol(false));
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.secusuarioid, dbKey]);

  const hayCambios = Object.keys(pendientes).length > 0;

  const handleToggle = useCallback((secelementoid, valor) => {
    setPendientes(prev => {
      const next = { ...prev };
      if (valor === undefined) return prev;
      if (valor === null) {
        const origVal = origPermisos[secelementoid] || 'SIN_PERMISO';
        if (origVal === 'HABILITADO_MANUAL' || origVal === 'DENEGADO_MANUAL') next[secelementoid] = null;
        else delete next[secelementoid];
      } else {
        const origVal = origPermisos[secelementoid] || 'SIN_PERMISO';
        const mismoEstado =
          (valor === 'H' && (origVal === 'HABILITADO_MANUAL' || origVal === 'HABILITADO_PERFIL')) ||
          (valor === 'D' && origVal === 'DENEGADO_MANUAL');
        if (mismoEstado) delete next[secelementoid];
        else next[secelementoid] = valor;
      }
      return next;
    });
  }, [origPermisos]);

  const handleGuardar = async () => {
    if (!hayCambios) return;
    setSaving(true);
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const cambios = Object.entries(pendientes).map(([secelementoid, permiso]) => ({
        secelementoid: Number(secelementoid),
        accion: permiso === 'H' ? 'habilitar' : permiso === 'D' ? 'denegar' : 'restaurar',
      }));
      const res = await fetchWithAuth(API_URLS.seguridadPermisosActualizar(), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_key: dbKey, secusuarioid: usuario.secusuarioid, cambios, creado_por: creadoPor }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al guardar');
      const nuevosPermisos = { ...origPermisos };
      Object.entries(pendientes).forEach(([seid, val]) => {
        if (val === 'H') nuevosPermisos[seid] = 'HABILITADO_MANUAL';
        else if (val === 'D') nuevosPermisos[seid] = 'DENEGADO_MANUAL';
        else {
          const orig = origPermisos[seid] || '';
          if (orig === 'HABILITADO_PERFIL') nuevosPermisos[seid] = 'HABILITADO_PERFIL';
          else delete nuevosPermisos[seid];
        }
      });
      onSaved(usuario.secusuarioid, nuevosPermisos);
      setPendientes({});
      onClose();
    } catch (e) { alert(e.message); }
    finally { setSaving(false); }
  };

  const filtrarNodos = (nodos, texto) => {
    if (!texto) return nodos;
    const t = texto.toLowerCase();
    const filtrar = (lista) => {
      const result = [];
      lista.forEach(n => {
        const hijosMatch = filtrar(n.hijos || []);
        if (n.etiqueta.toLowerCase().includes(t) || hijosMatch.length > 0) result.push({ ...n, hijos: hijosMatch });
      });
      return result;
    };
    return filtrar(nodos);
  };

  const arbolFiltrado = filtrarNodos(arbol || [], busqueda);
  const cantCambios = Object.keys(pendientes).length;

  return (
    <div className="ci-modal-overlay" onClick={onClose}>
      <div className="ci-modal ci-modal-wide" onClick={e => e.stopPropagation()}>
        <div className="ci-modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="ci-modal-title">Permisos: {usuario.usuario}</span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
              {usuario.perfiles.map(p => <span key={p.id} className="ci-seg-badge ci-seg-badge-perfil">{p.nombre}</span>)}
              {usuario.perfiles.length === 0 && <span className="ci-seg-badge ci-seg-badge-denegado">Sin perfil</span>}
            </div>
          </div>
          <button className="ci-modal-close" onClick={onClose}>✕</button>
        </div>
        <div style={{ padding: '6px 12px 4px' }}>
          <input className="ci-seg-search" type="text" placeholder="🔍 Buscar pantalla..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        </div>
        <div className="ci-modal-body">
          <div className="ci-tree-root">
            {loadingArbol ? <div style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}><div className="ci-spinner" style={{ margin: '0 auto 8px' }} />Cargando permisos...</div>
              : arbolFiltrado.length === 0 ? <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8' }}>Sin resultados</div>
              : arbolFiltrado.map((node, i) => <TreeNode key={node.id ?? i} node={node} origPermisos={origPermisos} pendientes={pendientes} onToggle={handleToggle} depth={0} />)}
          </div>
        </div>
        <div className="ci-modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', alignItems: 'center', padding: '12px 16px', borderTop: '1px solid var(--tm-border-strong)' }}>
          {hayCambios && <span style={{ fontSize: 12, color: '#f59e0b', marginRight: 'auto' }}>{cantCambios} cambio{cantCambios !== 1 ? 's' : ''} pendiente{cantCambios !== 1 ? 's' : ''}</span>}
          <button className="ci-btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="ci-btn-primary" onClick={handleGuardar} disabled={!hayCambios || saving} style={{ opacity: hayCambios ? 1 : 0.5 }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Combo buscable local ─────────
function LocalCombo({ options, value, onChange, placeholder = 'Seleccionar...' }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = options.find(o => String(o.value) === String(value));

  useEffect(() => { if (!open) setQuery(''); }, [open]);
  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = query ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()) || String(o.value).includes(query)) : options;

  return (
    <div className="ci-lcombo" ref={wrapRef}>
      <div className="ci-lcombo-trigger" onClick={() => setOpen(o => !o)}>
        {open
          ? <input autoFocus className="ci-lcombo-input" value={query} onChange={e => setQuery(e.target.value)} onClick={e => e.stopPropagation()} placeholder="Buscar..." />
          : <span className={selected ? 'ci-lcombo-val' : 'ci-lcombo-placeholder'}>{selected ? selected.label : placeholder}</span>}
        <span className="ci-lcombo-arrow">▾</span>
      </div>
      {open && (
        <div className="ci-lcombo-drop">
          {value && <div className="ci-lcombo-opt ci-lcombo-clear" onMouseDown={() => { onChange(''); setOpen(false); }}>— Ninguno</div>}
          {filtered.slice(0, 120).map(o => (
            <div key={o.value} className={`ci-lcombo-opt ${String(o.value) === String(value) ? 'ci-lcombo-sel' : ''}`} onMouseDown={() => { onChange(o.value); setOpen(false); }}>
              <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b', marginRight: '6px' }}>#{o.value}</span>{o.label}
            </div>
          ))}
          {filtered.length === 0 && <div className="ci-lcombo-empty">Sin resultados</div>}
        </div>
      )}
    </div>
  );
}

// ── Gestión Masiva de Permisos ────────────────────────────────────────────────
// Props pasadas desde Usuarios.jsx (filtros unificados en barra superior)
export function GestionMasivaPermisos({
  dbKey,
  empresas,
  perfiles,
  elementos,
  modo,
  empId,
  estado,
  perfilId,
  elemId,
  usuarios,
  loading,
  seleccionados,
  setSeleccionados,
  log,
  ejecutando,
  onToggleUser,
  onEjecutar,
  busqLocal,
  setBusqLocal,
  pagina,
  setPagina
}) {
  const ITEMS_POR_PAGINA = 25;
  const chkAllRef = useRef(null);

  // Callbacks que usan los props recibidos
  const toggleUser = useCallback((id) => {
    onToggleUser(id);
  }, [onToggleUser]);

  const handleEjecutar = useCallback(() => {
    onEjecutar();
  }, [onEjecutar]);

  const usuariosFiltrados = busqLocal ? usuarios.filter(u => u.usuario.toLowerCase().includes(busqLocal.toLowerCase())) : usuarios;
  const totalPaginas = Math.ceil(usuariosFiltrados.length / ITEMS_POR_PAGINA);
  const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const usuariosPaginados = usuariosFiltrados.slice(inicio, fin);
  const todosSelec = usuariosPaginados.length > 0 && usuariosPaginados.every(u => seleccionados.has(u.secusuarioid));
  const algunoSelec = usuariosPaginados.some(u => seleccionados.has(u.secusuarioid));

  useEffect(() => { if (chkAllRef.current) chkAllRef.current.indeterminate = algunoSelec && !todosSelec; }, [algunoSelec, todosSelec]);

  return (
    <div className="ci-masiva">
      {/* Mostrar logo de bienvenida cuando no hay resultados y aún no se buscó */}
      {!loading && usuarios.length === 0 && (
        <div style={{ padding: '30px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: 'fit-content' }}>
          <div className="ci-welcome-card">
            <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
            <h2 className="ci-welcome-title">Permisos de Seguridad</h2>
            <p className="ci-welcome-text">Selecciona los filtros y presiona <strong>Buscar</strong> para ver los permisos de los usuarios.</p>
          </div>
        </div>
      )}
      {!loading && usuarios.length > 0 && (
        <div className="ci-masiva-lista">
          <div className="ci-masiva-lista-hdr">
            <label className="ci-masiva-selall">
              <input type="checkbox" ref={chkAllRef} checked={todosSelec} onChange={e => setSeleccionados(e.target.checked ? new Set(usuariosFiltrados.map(u => u.secusuarioid)) : new Set())} />
              Seleccionar todos ({usuariosFiltrados.length})
            </label>
            <input className="ci-masiva-busq" type="text" placeholder="🔍 Filtrar..." value={busqLocal} onChange={e => setBusqLocal(e.target.value)} />
            <button className={`ci-masiva-exec ${modo === 'quitar' ? 'danger' : ''}`} onClick={handleEjecutar} disabled={!seleccionados.size || ejecutando || !elemId}>
              {ejecutando ? '⏳ Procesando...' : modo === 'asignar' ? `➕ Asignar a ${seleccionados.size} usuario(s)` : `➖ Quitar a ${seleccionados.size} usuario(s)`}
            </button>
          </div>
          <div className="ci-masiva-content">
            <div className="ci-masiva-cards">
              {usuariosPaginados.map(u => {
                const isSelected = seleccionados.has(u.secusuarioid);
                const isActivo = u.estado === 'ALTA';
                return (
                  <div key={u.secusuarioid} className={`ci-seg-card ci-masiva-card ${isSelected ? 'is-selected' : ''}`} onClick={() => toggleUser(u.secusuarioid)} role="button" tabIndex={0}>
                    <div className="ci-seg-card-head">
                      <div className="ci-seg-card-info"><span className="ci-seg-card-name">{u.usuario}</span><span className="ci-seg-card-id">ID: {u.secusuarioid}</span></div>
                      <div className="ci-masiva-card-check"><input type="checkbox" checked={isSelected} onChange={(e) => { e.stopPropagation(); toggleUser(u.secusuarioid); }} onClick={(e) => e.stopPropagation()} /></div>
                      <span className={`ci-seg-card-estado ${isActivo ? 'is-alta' : 'is-baja'}`}><span className="ci-seg-dot" />{u.estado}</span>
                    </div>
                    <div className="ci-seg-card-perfiles">
                      {u.perfiles?.length === 0 ? <span className="ci-seg-card-perfil-empty">Sin perfil</span> : u.perfiles?.map(p => <span key={p.id} className="ci-seg-card-chip">{p.nombre}</span>)}
                    </div>
                    {u.tipo_permiso && <div className="ci-masiva-tipo-badge"><span className={`ci-masiva-tipo ${u.tipo_permiso === 'MANUAL' ? 'manual' : 'perfil'}`}>{u.tipo_permiso}</span></div>}
                  </div>
                );
              })}
            </div>
            {usuariosFiltrados.length > 0 && (
              <div className="ci-paginacion">
                <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="ci-btn-pagina">← Anterior</button>
                <span className="ci-pagina-actual">{pagina} / {totalPaginas}</span>
                <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="ci-btn-pagina">Siguiente →</button>
              </div>
            )}
          </div>
        </div>
      )}
      {log && log.length > 0 && (
        <div className="ci-masiva-log">
          <div className="ci-masiva-log-hdr">
            <span>Resultado — {log.filter(l => ['asignado','reactivado','negacion_eliminada_perfil_activo','negado'].includes(l.resultado)).length} cambio(s) efectivo(s) de {log.length} procesado(s)</span>
          </div>
          <div className="ci-masiva-log-body">
            {log.map((item, i) => {
              const l = LOG_LABELS[item.resultado] || { icon: '?', texto: item.resultado, cls: 'muted' };
              return <div key={i} className={`ci-masiva-log-item ci-log-${l.cls}`}><span className="ci-log-icon">{l.icon}</span><span className="ci-log-user">{item.usuario}</span><span className="ci-log-msg">{l.texto}</span></div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ── ContenidoSeguridad: lista de usuarios con permisos ────────────────────────
export function ContenidoSeguridad({ resultados, loading, dbKey, onPermisosSaved }) {
  const [modalUsuario, setModalUsuario] = useState(null);
  const [busqUsuario, setBusqUsuario] = useState('');
  const [pagina, setPagina] = useState(1);
  const [desbloqueandoId, setDesbloqueandoId] = useState(null);
  const [showDesbloquearModal, setShowDesbloquearModal] = useState(false);
  const [usuarioADesbloquear, setUsuarioADesbloquear] = useState(null);
  const ITEMS_POR_PAGINA = 25;

  useEffect(() => { setPagina(1); }, [resultados?.length]);

  const abrirModalDesbloquear = (e, secusuarioid, nombre) => {
    e.stopPropagation();
    setUsuarioADesbloquear({ secusuarioid, nombre });
    setShowDesbloquearModal(true);
  };

  const handleDesbloquearConfirmado = async () => {
    if (!usuarioADesbloquear) return;
    setShowDesbloquearModal(false);
    setDesbloqueandoId(usuarioADesbloquear.secusuarioid);
    try {
      const userInfo = JSON.parse(sessionStorage.getItem('user_info') || '{}');
      const creadoPor = userInfo.usuario || userInfo.NOMBRE_USUARIO || userInfo.nombre || 'SISTEMA';
      const res = await fetchWithAuth(API_URLS.seguridadDesbloquearUsuario(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ db_key: dbKey, secusuarioid: usuarioADesbloquear.secusuarioid, creado_por: creadoPor })
      });
      if (!res.ok) throw new Error('Error al desbloquear');
      toast.success('Usuario desbloqueado');
      onPermisosSaved(usuarioADesbloquear.secusuarioid, null, true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDesbloqueandoId(null);
      setUsuarioADesbloquear(null);
    }
  };

  if (loading) return <div style={{ padding: '30px 20px', display: 'flex', justifyContent: 'center' }}><div className="ci-spinner" /><p>Consultando permisos...</p></div>;
  if (resultados === null) return (
    <div style={{ padding: '30px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: 'fit-content' }}>
      <div className="ci-welcome-card">
        <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
        <h2 className="ci-welcome-title">Permisos de Seguridad</h2>
        <p className="ci-welcome-text">Selecciona los filtros y presiona <strong>Consultar</strong> para ver los permisos de los usuarios.</p>
      </div>
    </div>
  );
  if (resultados.length === 0) return (
    <div style={{ padding: '30px 20px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', height: 'fit-content' }}>
      <div className="ci-welcome-card">
        <span style={{ fontSize: 48 }}>🔍</span>
        <h2 className="ci-welcome-title">Sin resultados</h2>
        <p className="ci-welcome-text">No se encontraron usuarios con los filtros seleccionados.</p>
      </div>
    </div>
  );

  const listaFiltrada = busqUsuario ? resultados.filter(r => r.usuario.toLowerCase().includes(busqUsuario.toLowerCase())) : resultados;
  const totalPaginas = Math.ceil(listaFiltrada.length / ITEMS_POR_PAGINA);
  const inicio = (pagina - 1) * ITEMS_POR_PAGINA;
  const fin = inicio + ITEMS_POR_PAGINA;
  const listaPaginada = listaFiltrada.slice(inicio, fin);

  return (
    <div className="ci-seccion">
      {modalUsuario && (
        <SeguridadModal
          usuario={modalUsuario}
          dbKey={dbKey}
          onClose={() => setModalUsuario(null)}
          onSaved={(secusuarioid, nuevosPermisos) => { onPermisosSaved(secusuarioid, nuevosPermisos); setModalUsuario(null); }}
        />
      )}
      <div className="ci-resumen-bar">
        <div className="ci-resumen-total">
          <span className="ci-badge-total ci-badge-seg">{listaFiltrada.length}</span>
          <span className="ci-resumen-label">usuario(s) encontrados</span>
          {totalPaginas > 1 && <span className="ci-resumen-paginacion">Página {pagina} de {totalPaginas}</span>}
        </div>
        <input className="ci-seg-search" type="text" placeholder="🔍 Buscar usuario..." value={busqUsuario} onChange={e => setBusqUsuario(e.target.value)} style={{ width: 200 }} />
      </div>
      <div className="ci-seg-content">
        <div className="ci-seg-grid">
          {listaPaginada.map(row => {
            const permisosObj = row.permisos || {};
            const totalPerfil = Object.values(permisosObj).filter(v => v === 'HABILITADO_PERFIL').length;
            const totalManual = Object.values(permisosObj).filter(v => v === 'HABILITADO_MANUAL').length;
            const totalDenegado = Object.values(permisosObj).filter(v => v === 'DENEGADO_MANUAL').length;
            const isActivo = row.estado === 'ALTA';
            const isBloqueado = row.bloqueado === true || row.bloqueado === 1 || row.bloqueado === '1';
            return (
              <div key={row.secusuarioid} className={`ci-seg-card ${isBloqueado ? 'is-bloqueado' : ''}`} onClick={() => setModalUsuario(row)} role="button" tabIndex={0}>
                <div className="ci-seg-card-head">
                  <div className="ci-seg-card-info">
                    <span className="ci-seg-card-name">{row.usuario}</span>
                    <span className="ci-seg-card-id">ID: {row.secusuarioid}</span>
                  </div>
                  <div className="ci-seg-card-actions">
                    {isBloqueado && (
                      <button
                        className="ci-seg-btn-bloqueado"
                        onClick={(e) => abrirModalDesbloquear(e, row.secusuarioid, row.usuario)}
                        disabled={desbloqueandoId === row.secusuarioid}
                        title="Usuario bloqueado - clic para desbloquear"
                      >
                        {desbloqueandoId === row.secusuarioid ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                            Desbloqueando...
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                            Bloqueado
                          </span>
                        )}
                      </button>
                    )}
                    <span className={`ci-seg-card-estado ${isActivo ? 'is-alta' : 'is-baja'}`}><span className="ci-seg-dot" />{row.estado}</span>
                  </div>
                </div>
                <div className="ci-seg-card-perfiles">
                  {row.perfiles.length === 0 ? <span className="ci-seg-card-perfil-empty">Sin perfil</span> : row.perfiles.map(p => <span key={p.id} className="ci-seg-card-chip">{p.nombre}</span>)}
                </div>
                <div className="ci-seg-card-stats">
                  <div className={`ci-seg-stat is-perfil ${totalPerfil === 0 ? 'is-empty' : ''}`}><span className="ci-seg-stat-num">{totalPerfil}</span><span className="ci-seg-stat-label">Perfil</span></div>
                  <div className={`ci-seg-stat is-manual ${totalManual === 0 ? 'is-empty' : ''}`}><span className="ci-seg-stat-num">{totalManual}</span><span className="ci-seg-stat-label">Manual</span></div>
                  <div className={`ci-seg-stat is-denegado ${totalDenegado === 0 ? 'is-empty' : ''}`}><span className="ci-seg-stat-num">{totalDenegado}</span><span className="ci-seg-stat-label">Denegado</span></div>
                </div>
              </div>
            );
          })}
        </div>
        {listaFiltrada.length > 0 && (
          <div className="ci-paginacion">
            <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={pagina === 1} className="ci-btn-pagina">← Anterior</button>
            <span className="ci-pagina-actual">{pagina} / {totalPaginas}</span>
            <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={pagina === totalPaginas} className="ci-btn-pagina">Siguiente →</button>
          </div>
        )}
      </div>

      {/* Modal de confirmación para desbloquear */}
      <ConfirmModal
        show={showDesbloquearModal}
        title="Desbloquear usuario"
        confirmText="Desbloquear"
        confirmVariant="primary"
        onConfirm={handleDesbloquearConfirmado}
        onCancel={() => { setShowDesbloquearModal(false); setUsuarioADesbloquear(null); }}
      >
        <p>¿Desbloquear al usuario <strong>{usuarioADesbloquear?.nombre}</strong>?</p>
        <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>El usuario podrá iniciar sesión nuevamente.</p>
      </ConfirmModal>
    </div>
  );
}
