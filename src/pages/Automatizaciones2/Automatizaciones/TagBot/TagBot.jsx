import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import * as tagService from '../../../services/tagBotService';
import './TagBot.css';

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

export default function TagBot({ dbKey }) {
  const [empresas, setEmpresas] = useState([]);
  const [bots, setBots] = useState([]);
  const [idEmpresa, setIdEmpresa] = useState('');
  const [idBot, setIdBot] = useState('');
  const [tagBusqueda, setTagBusqueda] = useState('');
  
  const [resultados, setResultados] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingEmp, setLoadingEmp] = useState(false);
  const [loadingBots, setLoadingBots] = useState(false);

  // Cargar empresas al cambiar dbKey
  useEffect(() => {
    const cargarEmpresas = async () => {
      setLoadingEmp(true);
      setEmpresas([]);
      setIdEmpresa('');
      setBots([]);
      setIdBot('');
      setResultados(null);
      setTagBusqueda('');
      
      try {
        const data = await tagService.cargarEmpresas(dbKey);
        setEmpresas(data);
      } catch (e) {
        toast.error('Error al cargar empresas: ' + e.message);
      } finally {
        setLoadingEmp(false);
      }
    };
    cargarEmpresas();
  }, [dbKey]);

  // Cargar bots al cambiar empresa
  useEffect(() => {
    if (!idEmpresa) {
      setBots([]);
      setIdBot('');
      return;
    }
    
    const cargarBots = async () => {
      setLoadingBots(true);
      setBots([]);
      setIdBot('');
      try {
        const data = await tagService.cargarBots(dbKey, idEmpresa);
        setBots(data);
      } catch (e) {
        toast.error('Error al cargar bots: ' + e.message);
      } finally {
        setLoadingBots(false);
      }
    };
    cargarBots();
  }, [dbKey, idEmpresa]);

  const buscarTags = async () => {
    if (!idEmpresa) return toast.warning('Selecciona una empresa');
    if (!idBot) return toast.warning('Selecciona un bot');
    if (!tagBusqueda.trim()) return toast.warning('Escribe una palabra clave o tag');

    setLoading(true);
    setResultados(null);
    try {
      const data = await tagService.buscarTags(dbKey, idBot, tagBusqueda);
      setResultados(data || []);
      if (data?.length === 0) {
        toast.info('No se encontraron coincidencias. Tag disponible.');
      } else if (data?.length > 0) {
        toast.warning(`Se encontraron ${data.length} coincidencias para el tag`);
      }
    } catch (e) {
      toast.error('Error al realizar búsqueda: ' + e.message);
      setResultados([]);
    } finally {
      setLoading(false);
    }
  };

  const renderContenido = () => {
    if (loading) {
      return (
        <div className="ci-state-center">
          <div className="ci-spinner" />
          <p>Buscando coincidencias...</p>
        </div>
      );
    }

    if (resultados === null) {
      return (
        <div className="ci-state-center">
          <div className="ci-welcome-card">
            <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="ci-welcome-logo" />
            <h2 className="ci-welcome-title">Validación de Tags Bot</h2>
            <p className="ci-welcome-text">
              Selecciona una empresa, un bot y escribe una palabra clave en los filtros de la parte superior, luego presiona <strong>Buscar</strong>.
            </p>
          </div>
        </div>
      );
    }

    if (resultados.length === 0) {
      return (
        <div className="ci-state-center">
          <div className="ci-welcome-card">
            <span style={{ fontSize: 48 }}>✅</span>
            <h2 className="ci-welcome-title">Sin coincidencias</h2>
            <p className="ci-welcome-text">
              No se encontraron coincidencias para <strong>"{tagBusqueda}"</strong> en la base de datos <strong>{DB_NAMES[dbKey] || dbKey}</strong>. La palabra clave está disponible.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="ci-seccion">
        <div className="ci-resumen-bar">
          <div className="ci-resumen-total">
            <span className="ci-badge-total ci-badge-tags">{resultados.length}</span>
            <span className="ci-resumen-label">coincidencia(s) encontradas para "{tagBusqueda}"</span>
          </div>
        </div>
        <div className="ci-table-wrap">
          <table className="ci-table">
            <thead>
              <tr>
                <th>ID Bot Menu</th>
                <th>Nombre</th>
                <th>Palabra Clave</th>
                <th>Red Social</th>
                <th>Tags</th>
              </tr>
            </thead>
            <tbody>
              {resultados.map((row, idx) => (
                <tr key={row.ID_BOT_MENU || idx}>
                  <td><span className="ci-id-tag">{row.ID_BOT_MENU}</span></td>
                  <td>{row.NOMBRE || '--'}</td>
                  <td>{row.PALABRA_CLAVE || '--'}</td>
                  <td>{row.NOMBRE_RED_SOCIAL || '--'}</td>
                  <td className="ci-tags-cell">{row.TAGS || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div className="tagbot-container">
      {/* Barra de filtros interna específica de la pestaña */}
      <div className="tagbot-filters-bar">
        <div className="tagbot-field">
          <span className="tagbot-label">Empresa {loadingEmp && '⌛'}</span>
          <select 
            className="tagbot-select" 
            value={idEmpresa} 
            onChange={e => setIdEmpresa(e.target.value)}
            disabled={loadingEmp}
          >
            <option value="">Seleccionar empresa...</option>
            {empresas.map(emp => (
              <option key={emp.ID_EMPRESA} value={emp.ID_EMPRESA}>{emp.NOMBRE}</option>
            ))}
          </select>
        </div>
        
        <div className="tagbot-field">
          <span className="tagbot-label">Bot {loadingBots && '⌛'}</span>
          <select 
            className="tagbot-select" 
            value={idBot} 
            onChange={e => setIdBot(e.target.value)} 
            disabled={!idEmpresa || loadingBots}
          >
            <option value="">Seleccionar bot...</option>
            {bots.map(bot => (
              <option key={bot.ID_BOT} value={bot.ID_BOT}>{bot.NOMBRE_BOT}</option>
            ))}
          </select>
        </div>

        <div className="tagbot-field search-field">
          <span className="tagbot-label">Palabra clave / tag</span>
          <input
            className="tagbot-input"
            value={tagBusqueda}
            onChange={e => setTagBusqueda(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') buscarTags(); }}
            placeholder="Ej: AYUDA"
            disabled={!idBot}
          />
        </div>

        <button 
          className="tagbot-btn-search" 
          onClick={buscarTags} 
          disabled={loading || !idBot || !tagBusqueda.trim()}
        >
          {loading ? '⏳' : '🔍 Buscar'}
        </button>
      </div>

      <div className="tagbot-content-body">
        {renderContenido()}
      </div>
    </div>
  );
}
