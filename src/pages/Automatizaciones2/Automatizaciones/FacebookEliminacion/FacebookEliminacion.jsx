import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import PanelTareaProgramada from '../components/PanelTareaProgramada';
import * as facebookService from '../../../services/facebookEliminacionService';
import './FacebookEliminacion.css';

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

export default function FacebookEliminacion({ dbKey }) {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [loadingExec, setLoadingExec] = useState(false);

  // Resetear estados al cambiar dbKey
  useEffect(() => {
    setPreview(null);
    setResultado(null);
  }, [dbKey]);

  const cargarPreview = async () => {
    setLoading(true);
    setResultado(null);
    try {
      const data = await facebookService.obtenerPreview(dbKey);
      setPreview(data || []);
      if (data?.length === 0) {
        toast.info('Sin solicitudes en estado "procesando"');
      } else if (data?.length > 0) {
        toast.success(`${data.length} solicitudes encontradas`);
      }
    } catch (e) {
      toast.error('Error al cargar vista previa: ' + e.message);
      setPreview([]);
    } finally {
      setLoading(false);
    }
  };

  const ejecutarEliminacion = async () => {
    if (!preview || preview.length === 0) return;
    setLoadingExec(true);
    try {
      const data = await facebookService.ejecutarEliminacion(dbKey);
      setResultado(data);
      toast.success('Solicitudes procesadas con éxito');
    } catch (e) {
      toast.error('Error al procesar solicitudes: ' + e.message);
    } finally {
      setLoadingExec(false);
    }
  };

  const renderContenido = () => {
    if (loading) {
      return (
        <div className="ci-state-center">
          <div className="ci-spinner" />
          <p>Consultando solicitudes...</p>
        </div>
      );
    }
    
    if (resultado) {
      return (
        <div className="ci-seccion">
          <div className="ci-resultado-inline ci-resultado-ok">
            <span className="ci-resultado-icon">✅</span>
            <div>
              <div className="ci-resultado-titulo">Actualización completada</div>
              <div className="ci-resultado-detalle">
                <span className="ci-stat"><strong>{resultado.actualizados}</strong> solicitudes marcadas como completado</span>
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
            <h2 className="ci-welcome-title">Solicitudes de Eliminación FB</h2>
            <p className="ci-welcome-text">Consulta las solicitudes en estado <strong>procesando</strong> en <strong>{DB_NAMES[dbKey] || dbKey}</strong>.</p>
            <button className="ci-btn-preview" onClick={cargarPreview}>🔍 Ver solicitudes pendientes</button>
          </div>
        </div>
      );
    }
    
    if (preview.length === 0) {
      return (
        <div className="ci-state-center">
          <div className="ci-welcome-card">
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 className="ci-welcome-title">Sin solicitudes pendientes</h2>
            <p className="ci-welcome-text">No hay solicitudes en estado "procesando" en <strong>{DB_NAMES[dbKey] || dbKey}</strong>.</p>
            <button className="ci-btn-preview" onClick={cargarPreview}>🔄 Volver a consultar</button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="ci-seccion">
        <div className="ci-resumen-bar">
          <div className="ci-resumen-total">
            <span className="ci-badge-total ci-badge-fb">{preview.length}</span>
            <span className="ci-resumen-label">solicitudes en estado "procesando"</span>
          </div>
          <button className="ci-btn-ejecutar" onClick={ejecutarEliminacion} disabled={loadingExec}>
            {loadingExec ? '⏳ Ejecutando...' : `⚡ Marcar como completado (${preview.length})`}
          </button>
        </div>
        <div className="ci-table-wrap">
          <table className="ci-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>ID Solicitud</th>
                <th>Usuario ID</th>
                <th>Aplicación</th>
                <th>Fecha Solicitud</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {preview.map(row => (
                <tr key={row.ID_ELIMINACION}>
                  <td><span className="ci-id-tag">{row.ID_ELIMINACION}</span></td>
                  <td><span className="ci-id-tag" style={{ fontSize: '10px' }}>{row.ID_SOLICITUD}</span></td>
                  <td>{row.USUARIO_ID}</td>
                  <td>{row.NOMBRE_APLICACION || '--'}</td>
                  <td>{formatFecha(row.FECHA_SOLICITO)}</td>
                  <td><span className="ci-estado-badge ci-estado-procesando">procesando</span></td>
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
      <PanelTareaProgramada tipo="facebook" dbKey={dbKey} />
    </div>
  );
}
