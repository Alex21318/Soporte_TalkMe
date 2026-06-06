import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import ConfirmModal from '../../components/ConfirmModal';

const DIAS_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DIAS_NOMBRES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Helpers: la DB guarda UTC, el usuario ve Guatemala (UTC-6)
function utcToGT(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  let gtH = h - 6;
  if (gtH < 0) gtH += 24;
  return `${String(gtH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function gtToUTC(timeStr) {
  if (!timeStr) return '';
  const [h, m] = timeStr.split(':').map(Number);
  let utcH = h + 6;
  if (utcH >= 24) utcH -= 24;
  return `${String(utcH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function HorariosBots({ dbKey, idEmpresa, botId }) {
  const [bots, setBots] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [modalForm, setModalForm] = useState({
    id_horario_bot: null,
    id_bot: '',
    desde: '',
    hasta: '',
    dias: [true, true, true, true, true, false, false],
  });

  // Modal confirmación eliminar
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [horarioAEliminar, setHorarioAEliminar] = useState(null);

  const cargarBots = useCallback(async () => {
    try {
      const res = await fetchWithAuth(API_URLS.botsEmpresa(dbKey, idEmpresa));
      if (res.ok) {
        const data = await res.json();
        setBots(Array.isArray(data) ? data : []);
      } else {
        const text = await res.text().catch(() => '');
        console.error('Error /api/bots-empresa:', res.status, text);
      }
    } catch (e) {
      console.error('Excepción /api/bots-empresa:', e);
    }
  }, [dbKey, idEmpresa]);

  const cargarHorarios = useCallback(async () => {
    setLoading(true);
    try {
      const url = botId
        ? API_URLS.horariosBot(dbKey, botId)
        : `${API_URLS.baseUrl}/api/horarios-bot?db_key=${dbKey}&id_empresa=${idEmpresa}`;
      const res = await fetchWithAuth(url);
      if (res.ok) {
        const data = await res.json();
        setHorarios(Array.isArray(data) ? data : []);
      } else {
        toast.error('Error al cargar horarios');
      }
    } catch (e) {
      toast.error('Error de conexión al cargar horarios');
    } finally {
      setLoading(false);
    }
  }, [dbKey, idEmpresa, botId]);

  // Cargar bots de la empresa para el modal crear
  useEffect(() => {
    if (!dbKey || !idEmpresa) { setBots([]); return; }
    cargarBots();
  }, [dbKey, idEmpresa, cargarBots]);

  // Cargar horarios cuando cambia dbKey, idEmpresa o botId
  useEffect(() => {
    if (!dbKey || !idEmpresa) {
      setHorarios([]);
      return;
    }
    cargarHorarios();
  }, [dbKey, idEmpresa, botId, cargarHorarios]);

  const abrirCrear = () => {
    setModalMode('create');
    setModalForm({
      id_horario_bot: null,
      id_bot: botId || (bots[0]?.ID_BOT || ''),
      desde: '08:00',
      hasta: '17:00',
      dias: [true, true, true, true, true, false, false],
    });
    setModalOpen(true);
  };

  const abrirEditar = (h) => {
    setModalMode('edit');
    const diasArray = h.DIAS ? h.DIAS.split('').map(c => c === '1') : [true, true, true, true, true, false, false];
    setModalForm({
      id_horario_bot: h.ID_HORARIO_BOT,
      id_bot: h.ID_BOT,
      desde: utcToGT(h.DESDE ? h.DESDE.substring(0, 5) : ''),
      hasta: utcToGT(h.HASTA ? h.HASTA.substring(0, 5) : ''),
      dias: diasArray.length === 7 ? diasArray : [true, true, true, true, true, false, false],
    });
    setModalOpen(true);
  };

  const confirmarEliminar = (h) => {
    setHorarioAEliminar(h);
    setShowConfirmModal(true);
  };

  const eliminarHorario = async () => {
    if (!horarioAEliminar) return;
    setShowConfirmModal(false);
    try {
      const res = await fetchWithAuth(API_URLS.horariosBotEliminar(horarioAEliminar.ID_HORARIO_BOT, dbKey), {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success('Horario eliminado');
        cargarHorarios();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al eliminar horario');
      }
    } catch (e) {
      toast.error('Error de conexión');
    } finally {
      setHorarioAEliminar(null);
    }
  };

  const guardarHorario = async () => {
    if (!modalForm.desde || !modalForm.hasta) {
      return toast.warning('Desde y Hasta son requeridos');
    }
    if (!modalForm.id_bot) {
      return toast.warning('Selecciona un bot');
    }
    const diasStr = modalForm.dias.map(d => d ? '1' : '0').join('');
    const payload = {
      db_key: dbKey,
      id_bot: parseInt(modalForm.id_bot),
      desde: gtToUTC(modalForm.desde),
      hasta: gtToUTC(modalForm.hasta),
      dias: diasStr,
    };

    try {
      const url = modalMode === 'create'
        ? API_URLS.horariosBotCrear()
        : API_URLS.horariosBotActualizar(modalForm.id_horario_bot);
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetchWithAuth(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        toast.success(modalMode === 'create' ? 'Horario creado' : 'Horario actualizado');
        setModalOpen(false);
        cargarHorarios();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Error al guardar horario');
      }
    } catch (e) {
      toast.error('Error de conexión al guardar horario');
    }
  };

  const toggleDia = (index) => {
    const d = [...modalForm.dias];
    d[index] = !d[index];
    setModalForm({ ...modalForm, dias: d });
  };

  const sinEmpresa = !idEmpresa;

  return (
    <div className="hb-container">
      {/* Acciones */}
      <div className="hb-filters">
        {!sinEmpresa && (
          <button className="btn-main btn-sm" onClick={abrirCrear}>
            + Nuevo Horario
          </button>
        )}
      </div>

      {/* Tabla de horarios */}
      {!sinEmpresa && (
        <div className="hb-table-wrapper">
          <table className="table-modern">
            <thead>
              <tr>
                <th>ID</th>
                {!botId && <th>Bot</th>}
                <th>Desde</th>
                <th>Hasta</th>
                <th>Días</th>
                <th>Creado</th>
                <th className="text-center">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={botId ? 6 : 7} className="text-center" style={{ padding: '24px' }}><div className="ci-spinner" style={{ margin: '0 auto 8px' }} />Cargando horarios...</td></tr>
              ) : horarios.length === 0 ? (
                <tr><td colSpan={botId ? 6 : 7} className="text-center" style={{ padding: '24px', color: '#94a3b8' }}>Sin horarios</td></tr>
              ) : horarios.map(h => (
                <tr key={h.ID_HORARIO_BOT}>
                  <td>{h.ID_HORARIO_BOT}</td>
                  {!botId && <td>{h.NOMBRE_BOT || h.DESCRIPCION || `Bot #${h.ID_BOT}`}</td>}
                  <td>{utcToGT(h.DESDE?.substring(0, 5))}</td>
                  <td>{utcToGT(h.HASTA?.substring(0, 5))}</td>
                  <td>
                    <div className="hb-dias-row">
                      {DIAS_LABELS.map((label, i) => {
                        const activo = h.DIAS?.[i] === '1';
                        return (
                          <span key={i} className={`hb-dia-badge ${activo ? 'active' : ''}`} title={DIAS_NOMBRES[i]}>
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td>{h.CREADO_EL ? new Date(h.CREADO_EL).toLocaleDateString() : '-'}</td>
                  <td className="text-center">
                    <button className="btn-icon" onClick={() => abrirEditar(h)} title="Editar">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-icon" onClick={() => confirmarEliminar(h)} title="Eliminar" style={{ color: '#ef4444' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sinEmpresa && (
        <div className="hb-empty">
          <p>Selecciona una empresa para ver los horarios de bots</p>
        </div>
      )}

      {/* Modal Crear/Editar */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content animate-pop" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">{modalMode === 'create' ? 'Nuevo Horario' : 'Editar Horario'}</h3>

            {/* Selector de bot (solo en modo crear cuando no hay botId preseleccionado) */}
            {modalMode === 'create' && !botId && (
              <div className="form-group">
                <label>Bot</label>
                <select
                  className="input-modern"
                  value={modalForm.id_bot}
                  onChange={e => setModalForm({ ...modalForm, id_bot: e.target.value })}
                >
                  <option value="">Seleccionar bot...</option>
                  {bots.map(b => (
                    <option key={b.ID_BOT} value={b.ID_BOT}>{b.NOMBRE_BOT || b.DESCRIPCION || `Bot #${b.ID_BOT}`}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Desde</label>
              <input
                type="time"
                className="input-modern"
                value={modalForm.desde}
                onChange={e => setModalForm({ ...modalForm, desde: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Hasta</label>
              <input
                type="time"
                className="input-modern"
                value={modalForm.hasta}
                onChange={e => setModalForm({ ...modalForm, hasta: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Días Activos</label>
              <div className="days-flex">
                {DIAS_LABELS.map((l, i) => (
                  <div
                    key={i}
                    className={`day-item ${modalForm.dias[i] ? 'active' : ''}`}
                    onClick={() => toggleDia(i)}
                    title={DIAS_NOMBRES[i]}
                  >
                    {l}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
              <button className="btn-main" onClick={guardarHorario}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* ConfirmModal eliminar */}
      <ConfirmModal
        show={showConfirmModal}
        title="Eliminar horario"
        confirmText="Eliminar"
        confirmVariant="danger"
        onConfirm={eliminarHorario}
        onCancel={() => { setShowConfirmModal(false); setHorarioAEliminar(null); }}
      >
        <p>¿Eliminar el horario <strong>{utcToGT(horarioAEliminar?.DESDE?.substring(0, 5))} - {utcToGT(horarioAEliminar?.HASTA?.substring(0, 5))}</strong>?</p>
      </ConfirmModal>
    </div>
  );
}

export default HorariosBots;
