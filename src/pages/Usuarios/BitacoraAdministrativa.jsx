import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './Usuarios.css';

const DB_NAMES = {
  'db_1': 'Talkme S1',
  'db_2': 'Talkme S2',
  'db_3': 'Talkme S3',
  'db_4': 'Talkme S4',
  'db_5': 'Talkme MDD',
  'db_6': 'Ficohsa S1',
  'db_7': 'Ficohsa S2',
  'db_8': 'Ficohsa S3'
};

function BitacoraAdministrativa() {
  // Filtros
  const [dbKey, setDbKey] = useState('db_1');
  const [empresa, setEmpresa] = useState('');
  const [subgrupo, setSubgrupo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [creadoPor, setCreadoPor] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });

  // Resultados
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const ITEMS_POR_PAGINA = 50;

  // Opciones para dropdowns
  const [filtrosDisponibles, setFiltrosDisponibles] = useState({
    empresas: [],
    subgrupos: [],
    categorias: [],
    creado_por: []
  });
  const [loadingFiltros, setLoadingFiltros] = useState(false);

  // Dropdowns visibles
  const [showEmpresaDropdown, setShowEmpresaDropdown] = useState(false);
  const [showSubgrupoDropdown, setShowSubgrupoDropdown] = useState(false);
  const [showCategoriaDropdown, setShowCategoriaDropdown] = useState(false);
  const [showCreadoPorDropdown, setShowCreadoPorDropdown] = useState(false);

  // Búsqueda en dropdowns
  const [empresaSearch, setEmpresaSearch] = useState('');
  const [subgrupoSearch, setSubgrupoSearch] = useState('');
  const [categoriaSearch, setCategoriaSearch] = useState('');
  const [creadoPorSearch, setCreadoPorSearch] = useState('');

  // Refs para detectar clic fuera
  const empresaRef = useRef(null);
  const subgrupoRef = useRef(null);
  const categoriaRef = useRef(null);
  const creadoPorRef = useRef(null);

  // Cargar filtros disponibles al cambiar db_key
  useEffect(() => {
    cargarFiltrosDisponibles();
    // Limpiar selecciones al cambiar de base de datos
    setEmpresa('');
    setSubgrupo('');
    setCategoria('');
    setCreadoPor('');
    setRegistros([]);
    setTotal(0);
    setPagina(1);
  }, [dbKey]);

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (empresaRef.current && !empresaRef.current.contains(event.target)) {
        setShowEmpresaDropdown(false);
      }
      if (subgrupoRef.current && !subgrupoRef.current.contains(event.target)) {
        setShowSubgrupoDropdown(false);
      }
      if (categoriaRef.current && !categoriaRef.current.contains(event.target)) {
        setShowCategoriaDropdown(false);
      }
      if (creadoPorRef.current && !creadoPorRef.current.contains(event.target)) {
        setShowCreadoPorDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const cargarFiltrosDisponibles = async () => {
    setLoadingFiltros(true);
    try {
      const res = await fetchWithAuth(API_URLS.bitacoraAdministrativaFiltros(dbKey));
      const data = await res.json();
      if (res.ok) {
        setFiltrosDisponibles(data);
      } else {
        console.error('Error al cargar filtros:', data.error);
        toast.error('Error al cargar opciones de filtro');
      }
    } catch (e) {
      console.error('Error cargando filtros:', e);
      toast.error('Error al cargar opciones de filtro');
    } finally {
      setLoadingFiltros(false);
    }
  };

  const buscar = async () => {
    setLoading(true);
    setRegistros([]);
    setPagina(1);

    try {
      const url = API_URLS.bitacoraAdministrativa({
        db_key: dbKey,
        empresa: empresa || undefined,
        subgrupo: subgrupo || undefined,
        categoria: categoria || undefined,
        descripcion: descripcion || undefined,
        creado_por: creadoPor || undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        limit: ITEMS_POR_PAGINA,
        offset: 0
      });

      const res = await fetchWithAuth(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar bitácora');
      }

      setRegistros(data.registros || []);
      setTotal(data.total || 0);

      if ((data.registros || []).length === 0) {
        toast.info('No se encontraron registros con los filtros aplicados');
      }
    } catch (e) {
      console.error('Error buscando bitácora:', e);
      toast.error(e.message || 'Error al consultar bitácora');
    } finally {
      setLoading(false);
    }
  };

  const cargarPagina = async (paginaNum) => {
    setLoading(true);
    try {
      const offset = (paginaNum - 1) * ITEMS_POR_PAGINA;
      const url = API_URLS.bitacoraAdministrativa({
        db_key: dbKey,
        empresa: empresa || undefined,
        subgrupo: subgrupo || undefined,
        categoria: categoria || undefined,
        descripcion: descripcion || undefined,
        creado_por: creadoPor || undefined,
        fecha_inicio: fechaInicio || undefined,
        fecha_fin: fechaFin || undefined,
        limit: ITEMS_POR_PAGINA,
        offset
      });

      const res = await fetchWithAuth(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar bitácora');
      }

      setRegistros(data.registros || []);
      setPagina(paginaNum);
    } catch (e) {
      console.error('Error cargando página:', e);
      toast.error('Error al cargar página');
    } finally {
      setLoading(false);
    }
  };

  const limpiarFiltros = () => {
    setEmpresa('');
    setSubgrupo('');
    setCategoria('');
    setDescripcion('');
    setCreadoPor('');
    setEmpresaSearch('');
    setSubgrupoSearch('');
    setCategoriaSearch('');
    setCreadoPorSearch('');
    setFechaInicio(new Date().toISOString().split('T')[0]);
    setFechaFin(new Date().toISOString().split('T')[0]);
    setRegistros([]);
    setTotal(0);
    setPagina(1);
  };

  // Helpers
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatearHora = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  };

  const formatearJSON = (jsonVal) => {
    if (!jsonVal) return '-';
    try {
      const parsed = typeof jsonVal === 'string' ? JSON.parse(jsonVal) : jsonVal;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return String(jsonVal);
    }
  };

  // Exportar a Excel
  const exportarExcel = async () => {
    if (!registros || registros.length === 0) {
      toast.info('No hay registros para exportar');
      return;
    }

    try {
      const headers = [
        'ID_LOG', 'ID_EMPRESA', 'EMPRESA', 'SUBGRUPO', 'CATEGORIA',
        'DESCRIPCION', 'GRUPO', 'ID_USUARIO', 'NOMBRE_USUARIO',
        'VALOR_ANTERIOR', 'VALOR_ACTUAL', 'CREADO_EL', 'CREADO_POR'
      ];

      const rows = registros.map(r => [
        r.ID_LOG,
        r.ID_EMPRESA,
        r.EMPRESA,
        r.SUBGRUPO,
        r.CATEGORIA,
        r.DESCRIPCION,
        r.GRUPO,
        r.ID_USUARIO,
        r.NOMBRE_USUARIO,
        formatearJSON(r.VALOR_ANTERIOR),
        formatearJSON(r.VALOR_ACTUAL),
        `${formatearFecha(r.CREADO_EL)} ${formatearHora(r.CREADO_EL)}`,
        r.CREADO_POR
      ]);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'TalkMe Soporte';
      wb.created = new Date();
      const ws = wb.addWorksheet('Bitácora Administrativa');

      ws.addTable({
        name: 'TablaBitacora',
        ref: 'A1',
        headerRow: true,
        totalsRow: false,
        style: { theme: 'TableStyleMedium6', showRowStripes: true },
        columns: headers.map(h => ({ name: h, filterButton: true })),
        rows
      });

      headers.forEach((h, i) => {
        const col = ws.getColumn(i + 1);
        let max = h.length;
        for (const row of rows) { const len = row[i] == null ? 0 : String(row[i]).length; if (len > max) max = len; }
        col.width = Math.min(Math.max(max + 2, 10), 60);
      });

      ws.views = [{ state: 'frozen', ySplit: 1 }];

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bitacora_administrativa_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Excel exportado correctamente');
    } catch (e) {
      console.error('Error exportando XLSX:', e);
      toast.error('Error al exportar Excel');
    }
  };

  // Filtrar opciones de dropdown
  const empresasFiltradas = filtrosDisponibles.empresas.filter(e =>
    e.toLowerCase().includes(empresaSearch.toLowerCase())
  ).slice(0, 50);

  const subgruposFiltrados = filtrosDisponibles.subgrupos.filter(s =>
    s.toLowerCase().includes(subgrupoSearch.toLowerCase())
  ).slice(0, 50);

  const categoriasFiltradas = filtrosDisponibles.categorias.filter(c =>
    c.toLowerCase().includes(categoriaSearch.toLowerCase())
  ).slice(0, 50);

  const creadoPorFiltrado = filtrosDisponibles.creado_por.filter(c =>
    c.toLowerCase().includes(creadoPorSearch.toLowerCase())
  ).slice(0, 50);

  const totalPaginas = Math.ceil(total / ITEMS_POR_PAGINA);

  return (
    <div className="usr-bitacora-admin">

      {/* ── PANEL DE FILTROS ── */}
      <section className="card usr-bitacora-filters">
        <div className="usr-masivo-header">
          <div className="usr-masivo-header-left">
            <h3 className="usr-masivo-title">Bitácora Administrativa</h3>
            <span className="usr-masivo-desc">Consulta el historial de cambios por base de datos</span>
          </div>
          {registros.length > 0 && (
            <div className="usr-masivo-header-right">
              <button className="usr-export-btn" onClick={exportarExcel}>
                <img src="/assets/CSV.png" alt="Excel" className="usr-export-btn-icon" />
                <span>Exportar Excel</span>
              </button>
            </div>
          )}
        </div>

        <div className="usr-bitacora-filters-grid">

          {/* Base de datos */}
          <div className="usr-bitacora-filter-field">
            <label className="usr-bitacora-filter-label">Base de Datos</label>
            <select
              className="usr-bitacora-filter-select"
              value={dbKey}
              onChange={(e) => setDbKey(e.target.value)}
            >
              {Object.entries(DB_NAMES).map(([key, name]) => (
                <option key={key} value={key}>{name}</option>
              ))}
            </select>
          </div>

          {/* Empresa */}
          <div className="usr-bitacora-filter-field" ref={empresaRef}>
            <label className="usr-bitacora-filter-label">
              Empresa {loadingFiltros && <span className="usr-bitacora-loading-dot">⌛</span>}
            </label>
            <div className="usr-dropdown-container">
              <input
                type="text"
                className="usr-bitacora-filter-select"
                placeholder={loadingFiltros ? 'Cargando...' : `Todas (${filtrosDisponibles.empresas.length})`}
                value={empresa}
                disabled={loadingFiltros}
                onChange={(e) => {
                  setEmpresa(e.target.value);
                  setEmpresaSearch(e.target.value);
                  setShowEmpresaDropdown(true);
                }}
                onFocus={() => setShowEmpresaDropdown(true)}
              />
              {empresa && (
                <button
                  className="usr-bitacora-clear-input"
                  onClick={() => { setEmpresa(''); setEmpresaSearch(''); }}
                  title="Limpiar"
                >×</button>
              )}
              {showEmpresaDropdown && empresasFiltradas.length > 0 && (
                <div className="usr-dropdown-list">
                  {empresasFiltradas.map((emp, idx) => (
                    <div
                      key={idx}
                      className="usr-dropdown-item"
                      onClick={() => {
                        setEmpresa(emp);
                        setEmpresaSearch('');
                        setShowEmpresaDropdown(false);
                      }}
                    >
                      {emp}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Subgrupo */}
          <div className="usr-bitacora-filter-field" ref={subgrupoRef}>
            <label className="usr-bitacora-filter-label">Subgrupo</label>
            <div className="usr-dropdown-container">
              <input
                type="text"
                className="usr-bitacora-filter-select"
                placeholder={`Todos (${filtrosDisponibles.subgrupos.length})`}
                value={subgrupo}
                onChange={(e) => {
                  setSubgrupo(e.target.value);
                  setSubgrupoSearch(e.target.value);
                  setShowSubgrupoDropdown(true);
                }}
                onFocus={() => setShowSubgrupoDropdown(true)}
              />
              {subgrupo && (
                <button
                  className="usr-bitacora-clear-input"
                  onClick={() => { setSubgrupo(''); setSubgrupoSearch(''); }}
                  title="Limpiar"
                >×</button>
              )}
              {showSubgrupoDropdown && subgruposFiltrados.length > 0 && (
                <div className="usr-dropdown-list">
                  {subgruposFiltrados.map((sub, idx) => (
                    <div
                      key={idx}
                      className="usr-dropdown-item"
                      onClick={() => {
                        setSubgrupo(sub);
                        setSubgrupoSearch('');
                        setShowSubgrupoDropdown(false);
                      }}
                    >
                      {sub}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Categoría */}
          <div className="usr-bitacora-filter-field" ref={categoriaRef}>
            <label className="usr-bitacora-filter-label">Categoría</label>
            <div className="usr-dropdown-container">
              <input
                type="text"
                className="usr-bitacora-filter-select"
                placeholder={`Todas (${filtrosDisponibles.categorias.length})`}
                value={categoria}
                onChange={(e) => {
                  setCategoria(e.target.value);
                  setCategoriaSearch(e.target.value);
                  setShowCategoriaDropdown(true);
                }}
                onFocus={() => setShowCategoriaDropdown(true)}
              />
              {categoria && (
                <button
                  className="usr-bitacora-clear-input"
                  onClick={() => { setCategoria(''); setCategoriaSearch(''); }}
                  title="Limpiar"
                >×</button>
              )}
              {showCategoriaDropdown && categoriasFiltradas.length > 0 && (
                <div className="usr-dropdown-list">
                  {categoriasFiltradas.map((cat, idx) => (
                    <div
                      key={idx}
                      className="usr-dropdown-item"
                      onClick={() => {
                        setCategoria(cat);
                        setCategoriaSearch('');
                        setShowCategoriaDropdown(false);
                      }}
                    >
                      {cat}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Descripción */}
          <div className="usr-bitacora-filter-field">
            <label className="usr-bitacora-filter-label">Descripción</label>
            <div className="usr-dropdown-container">
              <input
                type="text"
                className="usr-bitacora-filter-select"
                placeholder="Buscar en descripción..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && buscar()}
              />
              {descripcion && (
                <button
                  className="usr-bitacora-clear-input"
                  onClick={() => setDescripcion('')}
                  title="Limpiar"
                >×</button>
              )}
            </div>
          </div>

          {/* Creado Por */}
          <div className="usr-bitacora-filter-field" ref={creadoPorRef}>
            <label className="usr-bitacora-filter-label">Creado Por</label>
            <div className="usr-dropdown-container">
              <input
                type="text"
                className="usr-bitacora-filter-select"
                placeholder={`Todos (${filtrosDisponibles.creado_por.length})`}
                value={creadoPor}
                onChange={(e) => {
                  setCreadoPor(e.target.value);
                  setCreadoPorSearch(e.target.value);
                  setShowCreadoPorDropdown(true);
                }}
                onFocus={() => setShowCreadoPorDropdown(true)}
              />
              {creadoPor && (
                <button
                  className="usr-bitacora-clear-input"
                  onClick={() => { setCreadoPor(''); setCreadoPorSearch(''); }}
                  title="Limpiar"
                >×</button>
              )}
              {showCreadoPorDropdown && creadoPorFiltrado.length > 0 && (
                <div className="usr-dropdown-list">
                  {creadoPorFiltrado.map((cp, idx) => (
                    <div
                      key={idx}
                      className="usr-dropdown-item"
                      onClick={() => {
                        setCreadoPor(cp);
                        setCreadoPorSearch('');
                        setShowCreadoPorDropdown(false);
                      }}
                    >
                      {cp}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Fecha Inicio */}
          <div className="usr-bitacora-filter-field">
            <label className="usr-bitacora-filter-label">Fecha Inicio</label>
            <input
              type="date"
              className="usr-bitacora-filter-select"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </div>

          {/* Fecha Fin */}
          <div className="usr-bitacora-filter-field">
            <label className="usr-bitacora-filter-label">Fecha Fin</label>
            <input
              type="date"
              className="usr-bitacora-filter-select"
              value={fechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </div>

        </div>

        {/* Botones de acción */}
        <div className="usr-bitacora-actions">
          <button
            className="usr-topbar-btn-buscar"
            onClick={buscar}
            disabled={loading || loadingFiltros}
          >
            {loading ? '⏳ Buscando...' : '🔍 Buscar'}
          </button>
          <button
            className="usr-topbar-btn-limpiar"
            onClick={limpiarFiltros}
            disabled={loading}
          >
            🗑️ Limpiar
          </button>
        </div>
      </section>

      {/* ── RESULTADOS ── */}
      {loading && (
        <div className="usr-historial-loading">
          <span>⏳ Cargando bitácora...</span>
        </div>
      )}

      {!loading && registros.length === 0 && (
        <div className="usr-bitacora-empty">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14,2 14,8 20,8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10,9 9,9 8,9"/>
          </svg>
          <p>Seleccione los filtros y haga clic en <strong>Buscar</strong> para ver la bitácora administrativa.</p>
        </div>
      )}

      {!loading && registros.length > 0 && (
        <section className="card usr-bitacora-results">
          <div className="usr-masivo-header">
            <div className="usr-masivo-header-left">
              <h3 className="usr-masivo-title">Resultados</h3>
              <span className="usr-masivo-total-badge">
                {total} registros totales · Página {pagina} de {totalPaginas}
              </span>
            </div>
          </div>

          <div className="usr-bitacora-table-container">
            <table className="usr-historial-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Empresa</th>
                  <th>Subgrupo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Usuario</th>
                  <th>Valor Anterior</th>
                  <th>Valor Actual</th>
                  <th>Creado El</th>
                  <th>Creado Por</th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, idx) => (
                  <tr key={`${r.ID_LOG}-${idx}`}>
                    <td>{r.ID_LOG}</td>
                    <td>{r.EMPRESA || '-'}</td>
                    <td>{r.SUBGRUPO || '-'}</td>
                    <td>{r.CATEGORIA || '-'}</td>
                    <td className="usr-bitacora-desc">{r.DESCRIPCION || '-'}</td>
                    <td>{r.NOMBRE_USUARIO || '-'}</td>
                    <td className="usr-bitacora-json">
                      {r.VALOR_ANTERIOR ? (
                        <pre>{formatearJSON(r.VALOR_ANTERIOR)}</pre>
                      ) : '-'}
                    </td>
                    <td className="usr-bitacora-json">
                      {r.VALOR_ACTUAL ? (
                        <pre>{formatearJSON(r.VALOR_ACTUAL)}</pre>
                      ) : '-'}
                    </td>
                    <td>
                      <div>{formatearFecha(r.CREADO_EL)}</div>
                      <div className="usr-historial-hora">{formatearHora(r.CREADO_EL)}</div>
                    </td>
                    <td>{r.CREADO_POR || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginador */}
          {totalPaginas > 1 && (
            <div className="usr-masivo-paginador">
              <button
                className="usr-masivo-pag-btn"
                disabled={pagina === 1}
                onClick={() => cargarPagina(pagina - 1)}
              >
                Anterior
              </button>
              <span className="usr-masivo-pag-info">
                Página {pagina} de {totalPaginas}
              </span>
              <button
                className="usr-masivo-pag-btn"
                disabled={pagina === totalPaginas}
                onClick={() => cargarPagina(pagina + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}

export default BitacoraAdministrativa;
