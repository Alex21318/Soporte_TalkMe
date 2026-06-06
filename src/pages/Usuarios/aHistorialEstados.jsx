import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { toast } from 'react-toastify';
import ExcelJS from 'exceljs';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import './Usuarios.css';

function AHistorialEstados({ 
  dbKey, 
  idEmpresa, 
  perfilFiltro, 
  estadoPlataformaFiltro,
  fechaInicio,
  fechaFin,
  skillsFiltro,
  botRedesFiltro,
  usuarioSearch,
  forwardedRef
}) {
  // Resultados
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(false);

  // Paginación
  const [pagina, setPagina] = useState(1);
  const [ITEMS_POR_PAGINA, setItemsPorPagina] = useState(20);
  const containerRef = React.useRef(null);

  // Exponer método buscar al componente padre
  useImperativeHandle(forwardedRef, () => ({
    buscar: () => {
      if (fechaInicio && fechaFin && idEmpresa) {
        buscar();
      }
    }
  }));

  // Ya no busca automáticamente - solo cuando se da click en Buscar
  // o cuando cambian fechas/empresa/db (requerido para nueva búsqueda)
  useEffect(() => {
    // Solo limpiar resultados cuando cambia empresa o db, no buscar automáticamente
    if (!idEmpresa) {
      setRegistros([]);
    }
  }, [dbKey, idEmpresa]);

  // Helper: generar clave de cache basada en filtros
  const getCacheKey = () => {
    const skillsStr = (skillsFiltro || []).map(s => s.ID_SKILL).join(',');
    const botRedesStr = (botRedesFiltro || []).map(b => b.ID_BOT_REDES).join(',');
    return `historial_cache_${dbKey}_${idEmpresa}_${fechaInicio}_${fechaFin}_${perfilFiltro || ''}_${estadoPlataformaFiltro || ''}_${usuarioSearch || ''}_${skillsStr}_${botRedesStr}`;
  };

  // Restaurar cache al montar si los filtros coinciden
  useEffect(() => {
    if (!dbKey || !idEmpresa || !fechaInicio || !fechaFin) return;
    try {
      const cacheKey = getCacheKey();
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.registros && Array.isArray(parsed.registros)) {
          setRegistros(parsed.registros);
          if (parsed.pagina) setPagina(parsed.pagina);
        }
      }
    } catch (e) {
      // ignorar errores de parseo
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ajustar dinámicamente cantidad de filas por página según alto disponible
  useEffect(() => {
    const calcularFilas = () => {
      try {
        // Espacios más realistas tras medir en pantalla
        const topOffset = 140; // topbar + filtros + header de card
        const footerOffset = 60; // paginador + margenes
        const available = Math.max(0, window.innerHeight - topOffset - footerOffset);
        const rowApprox = 54; // altura real de fila compacta (incluyendo border y padding)
        const filas = Math.max(8, Math.floor(available / rowApprox));
        setItemsPorPagina(Math.min(filas, 50)); // máx 50 para no romper perfil
      } catch (e) {
        setItemsPorPagina(15);
      }
    };

    calcularFilas();
    window.addEventListener('resize', calcularFilas);
    return () => window.removeEventListener('resize', calcularFilas);
  }, []);

  const buscar = async () => {
    if (!fechaInicio || !fechaFin) return;

    setLoading(true);
    setRegistros([]);
    setPagina(1);

    try {
      const skillsStr = (skillsFiltro || []).map(s => s.NOMBRE_SKILL).join(',');
      const botRedesStr = (botRedesFiltro || []).map(b => b.NOMBRE_BOT || b.DESCRIPCION).join(',');

      const url = API_URLS.historialEstados(dbKey, {
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        id_empresa: idEmpresa,
        perfil: perfilFiltro || '',
        estado: estadoPlataformaFiltro || '',
        id_usuario: usuarioSearch || '',
        skills: skillsStr,
        bot_redes: botRedesStr
      });

      const res = await fetchWithAuth(url);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al consultar historial');
      }

      const resultados = Array.isArray(data) ? data : [];
      setRegistros(resultados);
      
      // Guardar en cache
      try {
        const cacheKey = getCacheKey();
        sessionStorage.setItem(cacheKey, JSON.stringify({
          registros: resultados,
          pagina: 1,
          timestamp: Date.now()
        }));
      } catch (e) {
        // ignorar errores de storage
      }
      
      if (resultados.length === 0) {
        toast.info('No se encontraron registros');
      }
    } catch (e) {
      console.error('Error buscando historial:', e);
      toast.error(e.message || 'Error al consultar historial');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar registros localmente por usuario
  let registrosFiltrados = registros;
  if (usuarioSearch) {
    const q = String(usuarioSearch || '').trim();
    if (/^\d+$/.test(q)) {
      registrosFiltrados = registrosFiltrados.filter(r => String(r.id_usuario) === q);
    } else {
      const qq = q.toLowerCase();
      registrosFiltrados = registrosFiltrados.filter(r =>
        (r.login_usuario || '').toLowerCase().includes(qq) ||
        (r.nombre_usuario || '').toLowerCase().includes(qq)
      );
    }
  }

  // Paginación
  const totalPaginas = Math.ceil(registrosFiltrados.length / ITEMS_POR_PAGINA);
  const paginaSegura = Math.min(pagina, totalPaginas || 1);
  const registrosPagina = registrosFiltrados.slice((paginaSegura - 1) * ITEMS_POR_PAGINA, paginaSegura * ITEMS_POR_PAGINA);

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

  const calcularDuracion = (inicio, fin) => {
    if (!inicio) return '-';
    const start = new Date(inicio);
    const end = fin ? new Date(fin) : new Date();
    const diffMs = end - start;
    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const diffSecs = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    if (diffMins > 0) return `${diffMins}m ${diffSecs}s`;
    return `${diffSecs}s`;
  };

  const getColorEstado = (colorPath) => {
    if (!colorPath) return '#999';
    const colores = {
      'verde.png': '#22c55e',
      'rojo.png': '#ef4444',
      'amarillo.png': '#eab308',
      'azul.png': '#3b82f6',
      'naranja.png': '#f97316',
      'gris.png': '#6b7280',
      'morado.png': '#8b5cf6'
    };
    return colores[colorPath] || colores[colorPath?.toLowerCase()] || '#999';
  };

  // Exportar a Excel con formato de tabla (mismo estilo que Cierres/Reportes)
  const exportarExcel = async () => {
    if (!registrosFiltrados || registrosFiltrados.length === 0) {
      toast.info('No hay registros para exportar');
      return;
    }

    try {
      const headers = ['Usuario', 'Nombre', 'Perfiles', 'Skills', 'Bot Redes', 'Estado', 'Fecha Inicio', 'Hora Inicio', 'Fecha Fin', 'Hora Fin', 'Duración', 'Movil'];

      const rows = registrosFiltrados.map(r => [
        r.login_usuario,
        r.nombre_usuario,
        r.perfiles,
        (r.skills || []).join('; '),
        (r.bot_redes || []).join('; '),
        r.nombre_estado,
        r.hora_inicio ? new Date(r.hora_inicio).toLocaleDateString('es-GT') : '',
        r.hora_inicio ? new Date(r.hora_inicio).toLocaleTimeString('es-GT') : '',
        r.hora_fin ? new Date(r.hora_fin).toLocaleDateString('es-GT') : '',
        r.hora_fin ? new Date(r.hora_fin).toLocaleTimeString('es-GT') : '',
        r.hora_inicio ? calcularDuracion(r.hora_inicio, r.hora_fin) : '',
        r.movil ? 'Si' : 'No'
      ]);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'TalkMe Soporte';
      wb.created = new Date();
      const ws = wb.addWorksheet('Historial');

      ws.addTable({
        name: 'TablaHistorial',
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
      link.download = `historial_estados_${new Date().toISOString().split('T')[0]}.xlsx`;
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

  return (
    <div className="usr-historial-resultados">
      {loading && (
        <div className="usr-historial-loading">
          <span>⏳ Cargando historial...</span>
        </div>
      )}

      {!loading && registros.length === 0 && (
        <div className="usr-welcome-screen">
          <div className="usr-welcome-card">
            <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="usr-welcome-logo" />
            <p className="usr-welcome-text">Seleccione los filtros y fechas para ver el historial de estados.</p>
          </div>
        </div>
      )}

      {!loading && registros.length > 0 && (
        <section className="card usr-historial-card">
          <div className="usr-masivo-header">
            <div className="usr-masivo-header-left">
              <h3 className="usr-masivo-title">Historial de Estados</h3>
              <span className="usr-masivo-total-badge">
                {registrosFiltrados.length} de {registros.length} registros
              </span>
            </div>
            <div className="usr-masivo-header-right">
              <button
                className="usr-export-btn"
                onClick={exportarExcel}
              >
                <img src="/assets/CSV.png" alt="Excel" className="usr-export-btn-icon" />
                <span>Exportar Excel</span>
              </button>
            </div>
          </div>

          {/* TABLA de resultados */}
          <div className="usr-historial-table-container">
            <table className="usr-historial-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Estado</th>
                  <th>Perfiles</th>
                  <th>Skills</th>
                  <th>Bot Redes</th>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Duración</th>
                  <th>Dispositivo</th>
                </tr>
              </thead>
              <tbody>
                {registrosPagina.map((r, idx) => (
                  <tr key={`${r.id_estado_usuarios}-${idx}`}>
                    <td className="usr-historial-cell-usuario">
                      <strong>{r.login_usuario}</strong>
                    </td>
                    <td className="usr-historial-cell-estado">
                      <span
                        className="usr-historial-badge-estado"
                        style={{
                          backgroundColor: getColorEstado(r.color_estado),
                          color: '#fff'
                        }}
                      >
                        {r.nombre_estado || 'N/A'}
                        {r.estado_pausa && ' (P)'}
                      </span>
                    </td>
                    <td className="usr-historial-cell-perfiles">
                      {r.perfiles && r.perfiles !== 'Sin perfil' ? (
                        <span className="usr-historial-text-wrap">
                          {r.perfiles}
                        </span>
                      ) : (
                        <span className="usr-historial-text-muted">Sin perfil</span>
                      )}
                    </td>
                    <td className="usr-historial-cell-skills">
                      {r.skills && r.skills.length > 0 ? (
                        <span className="usr-historial-text-wrap">
                          {r.skills.join(', ')}
                        </span>
                      ) : (
                        <span className="usr-historial-text-muted">-</span>
                      )}
                    </td>
                    <td className="usr-historial-cell-botredes">
                      {r.bot_redes && r.bot_redes.length > 0 ? (
                        <span className="usr-historial-text-wrap">
                          {r.bot_redes.join(', ')}
                        </span>
                      ) : (
                        <span className="usr-historial-text-muted">-</span>
                      )}
                    </td>
                    <td className="usr-historial-cell-fecha">
                      <div>{formatearFecha(r.hora_inicio)}</div>
                      <div className="usr-historial-hora">{formatearHora(r.hora_inicio)}</div>
                    </td>
                    <td className="usr-historial-cell-fecha">
                      {r.hora_fin ? (
                        <>
                          <div>{formatearFecha(r.hora_fin)}</div>
                          <div className="usr-historial-hora">{formatearHora(r.hora_fin)}</div>
                        </>
                      ) : (
                        <span className="usr-historial-text-muted">En curso</span>
                      )}
                    </td>
                    <td className="usr-historial-cell-duracion">
                      <strong>{calcularDuracion(r.hora_inicio, r.hora_fin)}</strong>
                    </td>
                    <td className="usr-historial-cell-dispositivo">
                      {r.movil ? (
                        <span className="usr-historial-dispositivo" title="Móvil">📱</span>
                      ) : (
                        <span className="usr-historial-dispositivo" title="Web">💻</span>
                      )}
                    </td>
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
                disabled={paginaSegura === 1}
                onClick={() => setPagina(p => Math.max(1, p - 1))}
              >
                Anterior
              </button>
              <span className="usr-masivo-pag-info">
                Página {paginaSegura} de {totalPaginas}
                <small>({registrosPagina.length} de {registrosFiltrados.length} registros)</small>
              </span>
              <button
                className="usr-masivo-pag-btn"
                disabled={paginaSegura === totalPaginas}
                onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
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

export default forwardRef((props, ref) => AHistorialEstados({ ...props, forwardedRef: ref }));
