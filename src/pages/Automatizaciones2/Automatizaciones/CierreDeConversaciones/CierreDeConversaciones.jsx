import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import PanelTareaProgramada from '../components/PanelTareaProgramada';
import * as cierreService from '../../../services/cierreConversacionesService';
import './CierreDeConversaciones.css';

const DB_NAMES = {
  'db_1': 'Talkme S1',
  'db_2': 'Talkme S2',
  'db_3': 'Talkme S3',
  'db_4': 'Talkme S4',
  'db_5': 'Talkme MDD',
  'db_6': 'Ficohsa S1',
  'db_7': 'Ficohsa S2',
  'db_8': 'Ficohsa S3',
};

const formatFecha = (fecha) => {
  if (!fecha) return '--';
  return new Date(fecha).toLocaleDateString('es-GT', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
};

export default function CierreDeConversaciones({ dbKey }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [loadingExec, setLoadingExec] = useState(false);

  // Cargar preview automáticamente o resetear estados al cambiar dbKey
  useEffect(() => {
    setPreview(null);
    setResultado(null);
    setFiltroEmpresa('');
  }, [dbKey]);

  const cargarPreview = async () => {
    setLoading(true);
    setResultado(null);
    try {
      const data = await cierreService.obtenerPreview(dbKey);
      setPreview(data || []);
      if (data?.length === 0) {
        toast.info('No hay conversaciones mayores a 30 días para cerrar');
      } else if (data?.length > 0) {
        toast.success(`${data.length} conversaciones listas para cerrar`);
      }
    } catch (e) {
      toast.error('Error al cargar vista previa: ' + e.message);
      setPreview([]);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarCierre = async () => {
    if (!preview || preview.length === 0) return;
    setLoadingExec(true);
    try {
      const data = await cierreService.ejecutarCierre(dbKey);
      setResultado(data);
      toast.success('Cierre ejecutado con éxito');
    } catch (e) {
      toast.error('Error al ejecutar cierre: ' + e.message);
    } finally {
      setLoadingExec(false);
    }
  };

  const empresasUnicas = preview ? [...new Set(preview.map(r => r.NOMBRE_EMPRESA))].sort() : [];
  const previewFiltrado = preview ? (filtroEmpresa ? preview.filter(r => r.NOMBRE_EMPRESA === filtroEmpresa) : preview) : [];

  const renderContenido = () => {
    if (loading) {
      return (
        <div className="ci-state-center">
          <div className="ci-spinner" />
          <p>Consultando conversaciones...</p>
        </div>
      );
    }
    
    if (resultado) {
      return (
        <div className="ci-seccion">
          <div className="ci-resultado-inline ci-resultado-ok">
            <span className="ci-resultado-icon">✅</span>
            <div>
              <div className="ci-resultado-titulo">Cierre completado</div>
              <div className="ci-resultado-detalle">
                <span className="ci-stat"><strong>{resultado.conversaciones_cerradas}</strong> conversaciones cerradas</span>
                <span className="ci-stat"><strong>{resultado.resoluciones_insertadas}</strong> resoluciones registradas</span>
              </div>
            </div>
            <button className="ci-btn-preview" style={{ marginLeft: 'auto' }} onClick={cargarPreview}>🔍 Verificar</button>
          </div>
        </div>
      );
    }
    
    if (preview === null) {
      return (
        <div className="ci-state-center">
          <div className="ci-welcome-card">
            <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
            <h2 className="ci-welcome-title">Cierre de Conversaciones</h2>
            <p className="ci-welcome-text">Consulta las conversaciones con más de <strong>30 días</strong> abiertas en <strong>{DB_NAMES[dbKey] || dbKey}</strong>.</p>
            <button className="ci-btn-preview" onClick={cargarPreview}>🔍 Ver conversaciones a cerrar</button>
          </div>
        </div>
      );
    }
    
    if (preview.length === 0) {
      return (
        <div className="ci-state-center">
          <div className="ci-welcome-card">
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 className="ci-welcome-title">Todo en orden</h2>
            <p className="ci-welcome-text">No hay conversaciones con más de 30 días abiertas en <strong>{DB_NAMES[dbKey] || dbKey}</strong>.</p>
            <button className="ci-btn-preview" onClick={cargarPreview}>🔄 Volver a consultar</button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="ci-seccion">
        <div className="ci-resumen-bar">
          <div className="ci-resumen-total">
            <span className="ci-badge-total">{preview.length}</span>
            <span className="ci-resumen-label">conversaciones en {empresasUnicas.length} empresa(s)</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="ci-topbar-select" value={filtroEmpresa} onChange={e => setFiltroEmpresa(e.target.value)}>
              <option value="">Todas las empresas</option>
              {empresasUnicas.map(emp => {
                const cnt = preview.filter(r => r.NOMBRE_EMPRESA === emp).length;
                return <option key={emp} value={emp}>{emp} ({cnt})</option>;
              })}
            </select>
            <button className="ci-btn-ejecutar" onClick={ejecutarCierre} disabled={loadingExec}>
              {loadingExec ? '⏳ Ejecutando...' : `⚡ Ejecutar cierre (${preview.length})`}
            </button>
          </div>
        </div>
        <div className="ci-table-wrap">
          <table className="ci-table">
            <thead>
              <tr>
                <th>ID Conversación</th>
                <th>Empresa</th>
                <th>Fecha Inicio</th>
                <th>Días Abierta</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {previewFiltrado.map(row => (
                <tr key={row.ID_CONVERSACION}>
                  <td><span className="ci-id-tag">{row.ID_CONVERSACION}</span></td>
                  <td>{row.NOMBRE_EMPRESA}</td>
                  <td>{formatFecha(row.FECHA_CONVERSACION)}</td>
                  <td>
                    <span className={`ci-dias-badge ${row.DIAS_ABIERTA >= 90 ? 'critico' : row.DIAS_ABIERTA >= 60 ? 'alto' : 'medio'}`}>
                      {row.DIAS_ABIERTA} días
                    </span>
                  </td>
                  <td><span className="ci-estado-badge">Abierta</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="ci-seccion-con-panel">
      {renderContenido()}
      <PanelTareaProgramada tipo="cierres" dbKey={dbKey} />
    </div>
  );
}
