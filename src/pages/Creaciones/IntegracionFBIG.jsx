import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { API_URLS } from '../../config/api';
import { LogIntegracion } from './IntegracionWhatsapp';
import ConfirmModal from '../../components/ConfirmModal';

// ════════════════════════════════════════════════════════════════════════════
// Integración Facebook / Instagram (idempotente)
// - Filtros en cascada: BD → Empresa → Bot
// - Selección de redes (1 a 4): autollena ID_BOT_REDES desde BOT_REDES del bot
// - Token compartido para las 4 redes
// - ID Página (FB) compartido entre FB Mensajes y FB Comentarios
// - ID Página IG + Cuenta IG compartidos entre IG Mensajes y IG Comentarios
// ════════════════════════════════════════════════════════════════════════════

const getUsuarioLogueado = () => {
  try {
    const userInfo = sessionStorage.getItem('user_info');
    if (userInfo) {
      const parsed = JSON.parse(userInfo);
      return parsed.usuario || parsed.NOMBRE_USUARIO || parsed.nombre || 'SISTEMA';
    }
  } catch {}
  return 'SISTEMA';
};

const DB_NAMES = {
  'db_1': 'Talkme S1 (wss.talkme.pro)',
  'db_2': 'Talkme S2 (cloud-s2)',
  'db_3': 'Talkme S3 (cloud-s3)',
  'db_4': 'Talkme S4 (cloud-s4)',
  'db_5': 'Talkme MDD (cloud-mdd)',
};

const REDES_DEF = [
  {
    id: 'facebook_mensajes',
    nombre: 'FB Mensajes',
    icon: '/assets/messenger.png',
    color: '#1877f2',
    plataforma: 'fb',
  },
  {
    id: 'facebook_comentarios',
    nombre: 'FB Comentarios',
    icon: '/assets/facebook_comnetarios.png',
    color: '#1877f2',
    plataforma: 'fb',
  },
  {
    id: 'instagram_mensajes',
    nombre: 'IG Mensajes',
    icon: '/assets/instagram_messenger.svg',
    color: '#e1306c',
    plataforma: 'ig',
  },
  {
    id: 'instagram_comentarios',
    nombre: 'IG Comentarios',
    icon: '/assets/instagram_comentarios.png',
    color: '#e1306c',
    plataforma: 'ig',
  },
];

// Predicado para filtrar bot_redes según el tipo de red por NOMBRE_RED
function matchRed(redId, nombreRed) {
  const n = (nombreRed || '').toLowerCase();
  switch (redId) {
    case 'facebook_mensajes':      return n.includes('facebook') && !n.includes('coment');
    case 'facebook_comentarios':   return n.includes('facebook') && n.includes('coment');
    case 'instagram_mensajes':     return n.includes('instagram') && !n.includes('coment');
    case 'instagram_comentarios': return n.includes('instagram') && n.includes('coment');
    default: return false;
  }
}

export default function IntegracionFBIG() {
  // ── Filtros generales ──
  const [dbKey, setDbKey] = useState('db_2');
  const [idEmpresa, setIdEmpresa] = useState('');
  const [idBot, setIdBot] = useState('');
  const [creadoPor, setCreadoPor] = useState(getUsuarioLogueado());

  // ── Listas en cascada ──
  const [empresas, setEmpresas] = useState([]);
  const [bots, setBots] = useState([]);
  const [botRedes, setBotRedes] = useState([]);
  const [loadingEmpresas, setLoadingEmpresas] = useState(false);
  const [loadingBots, setLoadingBots] = useState(false);
  const [loadingBotRedes, setLoadingBotRedes] = useState(false);

  // ── Redes activas ──
  const [redesActivas, setRedesActivas] = useState({
    facebook_mensajes: false,
    facebook_comentarios: false,
    instagram_mensajes: false,
    instagram_comentarios: false,
  });

  // ── ID_BOT_REDES por red (autorrellenado) ──
  const [idBotRedesPorRed, setIdBotRedesPorRed] = useState({
    facebook_mensajes: '',
    facebook_comentarios: '',
    instagram_mensajes: '',
    instagram_comentarios: '',
  });

  // ── Datos compartidos ──
  const [token, setToken] = useState('');
  const [idPagina, setIdPagina] = useState('');         // FB
  const [idPaginaIG, setIdPaginaIG] = useState('');     // IG
  const [cuentaIG, setCuentaIG] = useState('');         // IG

  // ── Estado de modal de confirmación ──
  const [showEjecutarModal, setShowEjecutarModal] = useState(false);

  // ── FB_INFOBOT / IG_INFOBOT (Registros Centrales - Fijos)
  // El ID es dinámico (= idBot seleccionado), los demás valores son constantes
  const FB_INFOBOT_DEFAULT = {
    verifToken: import.meta.env.VITE_FB_VERIF_TOKEN || '',
    pageAccessToken: import.meta.env.VITE_FB_PAGE_ACCESS_TOKEN || '',
    appSecret: import.meta.env.VITE_FB_APP_SECRET || '',
    appId: import.meta.env.VITE_FB_APP_ID || ''
  };
  const IG_INFOBOT_DEFAULT = {
    verifToken: import.meta.env.VITE_FB_VERIF_TOKEN || '',
    appSecret: import.meta.env.VITE_FB_APP_SECRET || '',
    appId: import.meta.env.VITE_FB_APP_ID || ''
  };

  // ── Resultados ──
  const [resultado, setResultado] = useState(null);
  const [resultadoPrueba, setResultadoPrueba] = useState(null);
  const [loading, setLoading] = useState(false);
  const [probando, setProbando] = useState(false);
  const [sqlPreview, setSqlPreview] = useState(null);

  // ── Helpers ──
  const tieneFB = redesActivas.facebook_mensajes || redesActivas.facebook_comentarios;
  const tieneIG = redesActivas.instagram_mensajes || redesActivas.instagram_comentarios;
  const algunaRed = tieneFB || tieneIG;

  // ── Detectar qué redes tiene este bot según sus bot_redes ──
  // Una red está disponible si al menos un bot_rede hace matchRed() con su id
  const redDisponible = (redId) => {
    if (!idBot || botRedes.length === 0) return false;
    return botRedes.some(br => matchRed(redId, br.NOMBRE_RED));
  };

  // ── Cargar empresas al cambiar BD ──
  useEffect(() => {
    cargarEmpresas();
    setIdEmpresa('');
    setIdBot('');
    setBots([]);
    setBotRedes([]);
    setIdBotRedesPorRed({ facebook_mensajes: '', facebook_comentarios: '', instagram_mensajes: '', instagram_comentarios: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dbKey]);

  // ── Cargar bots al cambiar empresa ──
  useEffect(() => {
    if (idEmpresa) {
      cargarBots();
      setIdBot('');
      setBotRedes([]);
      setRedesActivas({ facebook_mensajes: false, facebook_comentarios: false, instagram_mensajes: false, instagram_comentarios: false });
      setIdBotRedesPorRed({ facebook_mensajes: '', facebook_comentarios: '', instagram_mensajes: '', instagram_comentarios: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idEmpresa]);

  // ── Cargar bot_redes al cambiar bot ──
  useEffect(() => {
    if (idBot) {
      cargarBotRedes();
    } else {
      setRedesActivas({ facebook_mensajes: false, facebook_comentarios: false, instagram_mensajes: false, instagram_comentarios: false });
      setIdBotRedesPorRed({ facebook_mensajes: '', facebook_comentarios: '', instagram_mensajes: '', instagram_comentarios: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idBot]);

  // ── Al cargar bot_redes: auto-activar redes detectadas y pre-rellenar IDs ──
  // Un único useEffect sobre botRedes evita loops con redesActivas
  useEffect(() => {
    if (botRedes.length === 0) return;
    const nuevasActivas = { facebook_mensajes: false, facebook_comentarios: false, instagram_mensajes: false, instagram_comentarios: false };
    const nuevosIds = { facebook_mensajes: '', facebook_comentarios: '', instagram_mensajes: '', instagram_comentarios: '' };
    for (const red of REDES_DEF) {
      const candidato = botRedes.find(br => matchRed(red.id, br.NOMBRE_RED));
      if (candidato) {
        nuevasActivas[red.id] = true;
        nuevosIds[red.id] = String(candidato.ID_BOT_REDES);
      }
    }
    setRedesActivas(nuevasActivas);
    setIdBotRedesPorRed(nuevosIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botRedes]);

  const cargarEmpresas = async () => {
    setLoadingEmpresas(true);
    try {
      const r = await fetchWithAuth(API_URLS.creacionesEmpresas(dbKey));
      if (!r.ok) throw new Error('Error cargando empresas');
      setEmpresas(await r.json());
    } catch (e) { toast.error(e.message); setEmpresas([]); }
    finally { setLoadingEmpresas(false); }
  };

  const cargarBots = async () => {
    setLoadingBots(true);
    try {
      const r = await fetchWithAuth(API_URLS.creacionesBots(dbKey, idEmpresa));
      if (!r.ok) throw new Error('Error cargando bots');
      setBots(await r.json());
    } catch (e) { toast.error(e.message); setBots([]); }
    finally { setLoadingBots(false); }
  };

  const cargarBotRedes = async () => {
    setLoadingBotRedes(true);
    try {
      const r = await fetchWithAuth(API_URLS.creacionesBotRedes(dbKey, idBot));
      if (!r.ok) throw new Error('Error cargando bot_redes');
      setBotRedes(await r.json());
    } catch (e) { toast.error(e.message); setBotRedes([]); }
    finally { setLoadingBotRedes(false); }
  };

  // ── Toggle red ──
  const toggleRed = (redId) => {
    setRedesActivas(prev => ({ ...prev, [redId]: !prev[redId] }));
  };

  const setIdBotRedesRed = (redId, valor) => {
    setIdBotRedesPorRed(prev => ({ ...prev, [redId]: valor }));
  };

  // ── Lista filtrada de bot_redes para un select por red ──
  const opcionesPara = (redId) => {
    const filtrados = botRedes.filter(br => matchRed(redId, br.NOMBRE_RED));
    // Si no hay match por nombre, mostrar todos los bot_redes para que el usuario elija manualmente
    return filtrados.length > 0 ? filtrados : botRedes;
  };

  // ── Validación ──
  const validar = () => {
    if (!idBot) { toast.error('El ID Bot es obligatorio'); return false; }
    if (!algunaRed) { toast.error('Selecciona al menos una red'); return false; }
    if (!token) { toast.error('El Token de acceso es obligatorio'); return false; }
    for (const red of REDES_DEF) {
      if (redesActivas[red.id] && !idBotRedesPorRed[red.id]) {
        toast.error(`Falta ID_BOT_REDES para ${red.nombre}`);
        return false;
      }
    }
    if (tieneFB && !idPagina) { toast.error('El ID de Página (FB) es obligatorio'); return false; }
    if (tieneIG && (!idPaginaIG || !cuentaIG)) { toast.error('ID Página IG y Cuenta IG son obligatorios'); return false; }
    return true;
  };

  // ── Generar SQL Preview (idéntico al script manual) ──
  const generarSQL = () => {
    const params = construirParams();
    const r = params.redes;
    const lineas = [];

    // ── Variables SET ──
    lineas.push(`-- ════════════════════════════════════════════════════════════`);
    lineas.push(`-- Integración FB/IG — Bot ID: ${idBot} — ${creadoPor}`);
    lineas.push(`-- ════════════════════════════════════════════════════════════`);
    lineas.push('');
    if (r.facebook_mensajes)    lineas.push(`SET @idBotRedesFB              := '${r.facebook_mensajes.idBotRedes}';`);
    if (r.facebook_comentarios) lineas.push(`SET @idBotRedesComentarios     := '${r.facebook_comentarios.idBotRedes}';`);
    if (r.facebook_mensajes)    lineas.push(`SET @idPagina                  := '${r.facebook_mensajes.idPagina}';`);
    if (r.instagram_mensajes)   lineas.push(`SET @idBotRedesInstagram       := '${r.instagram_mensajes.idBotRedes}';`);
    if (r.instagram_comentarios)lineas.push(`SET @idBotRedesComentariosIG   := '${r.instagram_comentarios.idBotRedes}';`);
    if (r.instagram_mensajes)   lineas.push(`SET @idPaginaIG                := '${r.instagram_mensajes.idPaginaIG}';`);
    if (r.instagram_mensajes)   lineas.push(`SET @cuentaIG                  := '${r.instagram_mensajes.cuentaIG}';`);
    if (token)                  lineas.push(`SET @token                     := '${token}';`);
    lineas.push('');

    // ── FACEBOOK ──
    if (r.facebook_mensajes) {
      lineas.push(`-- FACEBOOK --`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesFB, 6, @token, now(), '${creadoPor}');`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesFB, 3, @idPagina, now(), '${creadoPor}');`);
      lineas.push('');
    }

    // ── COMENTARIOS FB ──
    if (r.facebook_comentarios) {
      lineas.push(`-- COMENTARIOS FB --`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesComentarios, 6, @token, now(), '${creadoPor}');`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesComentarios, 3, @idPagina, now(), '${creadoPor}');`);
      lineas.push('');
    }

    // ── INSTAGRAM ──
    if (r.instagram_mensajes) {
      lineas.push(`-- INSTAGRAM --`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesInstagram, 6, @token, now(), '${creadoPor}');`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesInstagram, 11, @idPaginaIG, now(), '${creadoPor}');`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesInstagram, 7, @cuentaIG, now(), '${creadoPor}');`);
      lineas.push('');
    }

    // ── COMENTARIOS IG ──
    if (r.instagram_comentarios) {
      lineas.push(`-- COMENTARIOS IG --`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesComentariosIG, 6, @token, now(), '${creadoPor}');`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesComentariosIG, 11, @idPaginaIG, now(), '${creadoPor}');`);
      lineas.push(`INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)`);
      lineas.push(`VALUES (@idBotRedesComentariosIG, 7, @cuentaIG, now(), '${creadoPor}');`);
      lineas.push('');
    }

    // ── CREACIÓN DE TABLAS FACEBOOK ──
    if (tieneFB) {
      const fb = params.fbInfobot;
      lineas.push(`/* CREACION DE TABLAS POR ID BOT */`);
      lineas.push(`CREATE TABLE facebook.FB_${idBot}_COMMENTS  (`);
      lineas.push(`  ID bigint(11) NOT NULL AUTO_INCREMENT,`);
      lineas.push(`  COMMENT_ID varchar(255) NOT NULL,`);
      lineas.push(`  USER_ID varchar(255) NOT NULL,`);
      lineas.push(`  PRIMARY KEY (\`ID\`),`);
      lineas.push(`  UNIQUE INDEX(\`COMMENT_ID\`) USING BTREE`);
      lineas.push(`);`);
      lineas.push('');
      lineas.push(`CREATE TABLE facebook.FB_${idBot}_POSTS  (`);
      lineas.push(`  ID bigint(11) NOT NULL AUTO_INCREMENT,`);
      lineas.push(`  POST_ID varchar(255) NOT NULL,`);
      lineas.push(`  POST_BODY LONGTEXT NOT NULL,`);
      lineas.push(`  PRIMARY KEY (\`ID\`),`);
      lineas.push(`  UNIQUE INDEX(\`POST_ID\`) USING BTREE`);
      lineas.push(`);`);
      lineas.push('');
      lineas.push(`CREATE TABLE facebook.FB_${idBot}_MESSAGES (`);
      lineas.push(`  MESSAGE_ID bigint(20) NOT NULL AUTO_INCREMENT,`);
      lineas.push(`  MID text NOT NULL,`);
      lineas.push(`  PSID text NOT NULL,`);
      lineas.push(`  MESSAGE_DIR enum('E','R','L') NOT NULL,`);
      lineas.push(`  MESSAGE_TYPE varchar(10) NOT NULL,`);
      lineas.push(`  ESTADO tinyint(4) NOT NULL,`);
      lineas.push(`  EXTERNAL_ID BIGINT NOT NULL,`);
      lineas.push(`  MESSAGE_DATE datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,`);
      lineas.push(`  MESSAGE_TEXT text,`);
      lineas.push(`  MEDIA_URL text,`);
      lineas.push(`  MEDIA_FILE_PATH text,`);
      lineas.push(`  PRIMARY KEY (\`MESSAGE_ID\`) USING BTREE`);
      lineas.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      lineas.push('');
      lineas.push(`ALTER TABLE facebook.FB_${idBot}_MESSAGES ADD INDEX \`FB_${idBot}_MESSAGES_IDX_EXTERNALID\`(\`EXTERNAL_ID\`);`);
      lineas.push(`ALTER TABLE facebook.FB_${idBot}_MESSAGES ADD INDEX \`FB_${idBot}_MESSAGES_IDX_MESSAGE_DATE\`(\`MESSAGE_DATE\`);`);
      lineas.push('');
      if (fb) {
        lineas.push(`-- INSERTAR EN LA TABLA FB_INFOBOT`);
        lineas.push(`INSERT INTO facebook.FB_INFOBOT (ID, VERIF_TOKEN, PAGE_ACCESS_TOKEN, APP_SECRET, APP_ID)`);
        lineas.push(`VALUES (${fb.id}, '${fb.verifToken}', '${fb.pageAccessToken}', '${fb.appSecret}', '${fb.appId}');`);
        lineas.push('');
      }
    }

    // ── CREACIÓN DE TABLAS INSTAGRAM ──
    if (tieneIG) {
      const ig = params.igInfobot;
      lineas.push(`-- INSTAGRAM`);
      lineas.push(`CREATE TABLE instagram.IG_${idBot}_MESSAGES (`);
      lineas.push(`  MESSAGE_ID bigint(20) NOT NULL AUTO_INCREMENT,`);
      lineas.push(`  MID text NOT NULL,`);
      lineas.push(`  PSID text NOT NULL,`);
      lineas.push(`  MESSAGE_DIR enum('E','R','L') NOT NULL,`);
      lineas.push(`  MESSAGE_TYPE varchar(10) NOT NULL,`);
      lineas.push(`  ESTADO tinyint(4) NOT NULL,`);
      lineas.push(`  EXTERNAL_ID BIGINT(11) NOT NULL,`);
      lineas.push(`  MESSAGE_DATE datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,`);
      lineas.push(`  MESSAGE_TEXT text,`);
      lineas.push(`  MEDIA_URL text,`);
      lineas.push(`  MEDIA_FILE_PATH text,`);
      lineas.push(`  PRIMARY KEY (MESSAGE_ID) USING BTREE`);
      lineas.push(`) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;`);
      lineas.push('');
      if (ig) {
        lineas.push(`-- INSERTAR EN LA TABLA IG_INFOBOT`);
        lineas.push(`INSERT INTO instagram.IG_INFOBOT (ID, VERIF_TOKEN, APP_SECRET, APP_ID)`);
        lineas.push(`VALUES (${ig.id}, '${ig.verifToken}', '${ig.appSecret}', '${ig.appId}');`);
      }
    }

    return lineas.join('\n');
  };

  // ── Construir params para backend ──
  // FB_INFOBOT e IG_INFOBOT usan valores centrales fijos (no editables por el usuario)
  const construirParams = () => {
    const redes = {};
    if (redesActivas.facebook_mensajes) {
      redes.facebook_mensajes = { idBotRedes: idBotRedesPorRed.facebook_mensajes, token, idPagina };
    }
    if (redesActivas.facebook_comentarios) {
      redes.facebook_comentarios = { idBotRedes: idBotRedesPorRed.facebook_comentarios, token, idPagina };
    }
    if (redesActivas.instagram_mensajes) {
      redes.instagram_mensajes = { idBotRedes: idBotRedesPorRed.instagram_mensajes, token, idPaginaIG, cuentaIG };
    }
    if (redesActivas.instagram_comentarios) {
      redes.instagram_comentarios = { idBotRedes: idBotRedesPorRed.instagram_comentarios, token, idPaginaIG, cuentaIG };
    }
    return {
      idBot,
      creadoPor,
      redes,
      fbInfobot: tieneFB ? { id: idBot, ...FB_INFOBOT_DEFAULT } : null,
      igInfobot: tieneIG ? { id: idBot, ...IG_INFOBOT_DEFAULT } : null,
    };
  };

  // ── Acciones ──
  const handleEjecutar = async () => {
    if (!validar()) return;
    setShowEjecutarModal(true);
  };

  const confirmEjecutar = async () => {
    setShowEjecutarModal(false);
    const redesTxt = Object.keys(construirParams().redes).join(', ');
    setLoading(true);
    setResultado(null);
    try {
      const res = await fetchWithAuth(API_URLS.creacionesFacebookInstagram(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbKey, params: construirParams(), probar: false }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setResultado({ success: true, ...data });
      toast.success(data.mensaje || 'Integración FB/IG ejecutada');
    } catch (err) {
      setResultado({ success: false, error: err.error || 'Error', details: err.details || err.message });
      toast.error(err.details || err.error || 'Error al ejecutar');
    } finally { setLoading(false); }
  };

  const handleProbar = async () => {
    if (!validar()) return;
    setProbando(true);
    setResultadoPrueba(null);
    try {
      const res = await fetchWithAuth(API_URLS.creacionesFacebookInstagram(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbKey, params: construirParams(), probar: true }),
      });
      const data = await res.json();
      if (!res.ok) throw data;
      setResultadoPrueba({ success: true, ...data });
      toast.success('Prueba exitosa (sin cambios guardados)');
    } catch (err) {
      setResultadoPrueba({ success: false, error: err.error || 'Error', details: err.details || err.message });
      toast.error(err.details || err.error || 'Error en prueba');
    } finally { setProbando(false); }
  };

  // Estilos compartidos para grids horizontales que NO se rompen
  const rowStyle = (cols) => ({
    display: 'grid',
    gridTemplateColumns: cols,
    gap: 12,
    minWidth: 0,
  });

  // ════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="cr-inst-container">
      {/* HEADER */}
      <div className="cr-inst-header">
        <h2 className="cr-inst-title">📱 Integración Facebook / Instagram</h2>
        <p className="cr-inst-subtitle">
          Selecciona empresa, bot y las redes a configurar. La ejecución es <strong>idempotente</strong>:
          actualiza los datos existentes y reporta tablas que ya existan sin fallar.
        </p>
      </div>

      {/* ── FILTROS + REDES EN UN SOLO BLOQUE ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>⚙️ Filtros y Redes</h3>
        </div>
        <div className="cr-inst-section-body">
          {/* Fila 1: BD | Empresa | Bot | Creado por */}
          <div style={rowStyle('1.6fr 2fr 2fr 1.2fr')}>
            <div className="cr-inst-field">
              <label>Base de Datos *</label>
              <select value={dbKey} onChange={e => setDbKey(e.target.value)}>
                {Object.entries(DB_NAMES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div className="cr-inst-field">
              <label>Empresa * {loadingEmpresas && <small>(cargando…)</small>}</label>
              <select value={idEmpresa} onChange={e => setIdEmpresa(e.target.value)} disabled={loadingEmpresas}>
                <option value="">— Seleccionar —</option>
                {empresas.map(e => (
                  <option key={e.ID_EMPRESA} value={e.ID_EMPRESA}>
                    {e.ID_EMPRESA} · {e.NOMBRE}
                  </option>
                ))}
              </select>
            </div>
            <div className="cr-inst-field">
              <label>Bot * {loadingBots && <small>(cargando…)</small>}</label>
              <select value={idBot} onChange={e => setIdBot(e.target.value)} disabled={!idEmpresa || loadingBots}>
                <option value="">— Seleccionar —</option>
                {bots.map(b => (
                  <option key={b.ID_BOT} value={b.ID_BOT}>
                    {b.ID_BOT} · {b.DESCRIPCION || b.NOMBRE_BOT || ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="cr-inst-field">
              <label>Creado por</label>
              <input type="text" value={creadoPor} onChange={e => setCreadoPor(e.target.value)} />
            </div>
          </div>

          {/* Separador + Redes (solo si hay bot seleccionado) */}
          {idBot && (
            <>
              <div style={{ borderTop: '1px solid var(--tm-border)', margin: '14px 0 12px' }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--tm-text-secondary)' }}>🌐 Redes detectadas para este bot</span>
                {botRedes.length > 0 && (
                  <small style={{ color: 'var(--tm-text-secondary)', fontSize: 11 }}>
                    {botRedes.length} bot_redes · solo se habilitan las redes FB/IG encontradas
                  </small>
                )}
              </div>
              <div style={rowStyle('repeat(4, 1fr)')}>
                {REDES_DEF.map(red => {
                  const disponible = redDisponible(red.id);
                  const activa = redesActivas[red.id];
                  return (
                    <button
                      key={red.id}
                      type="button"
                      onClick={() => disponible && toggleRed(red.id)}
                      disabled={!disponible}
                      title={!disponible ? `No se encontró bot_redes de ${red.nombre} para este bot` : ''}
                      style={{
                        background: activa ? red.color : disponible ? 'var(--tm-surface)' : '#f5f5f5',
                        color: activa ? '#fff' : disponible ? 'var(--tm-text)' : '#bbb',
                        border: `2px solid ${activa ? red.color : disponible ? 'var(--tm-border)' : '#e0e0e0'}`,
                        borderRadius: 10,
                        padding: '10px 12px',
                        cursor: disponible ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.18s ease',
                        boxShadow: activa ? `0 4px 14px ${red.color}55` : 'none',
                        minWidth: 0,
                        opacity: disponible ? 1 : 0.45,
                      }}
                    >
                      <img
                        src={red.icon}
                        alt={red.nombre}
                        style={{
                          width: 28, height: 28, objectFit: 'contain',
                          background: activa ? 'rgba(255,255,255,0.2)' : 'transparent',
                          borderRadius: 6, padding: 3, flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 13, textAlign: 'left' }}>{red.nombre}</span>
                      <div style={{
                        width: 20, height: 20, borderRadius: 5,
                        background: activa ? '#fff' : 'transparent',
                        border: `2px solid ${activa ? '#fff' : 'var(--tm-border-strong)'}`,
                        color: red.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, fontWeight: 900, flexShrink: 0,
                      }}>
                        {activa ? '✓' : !disponible ? '—' : ''}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── TOKEN DE ACCESO ── */}
      {algunaRed && (
        <div className="cr-inst-section">
          <div className="cr-inst-section-header">
            <h3>🔑 Token de Acceso</h3>
          </div>
          <div className="cr-inst-section-body">
            <div className="cr-inst-field">
              <label>Token *</label>
              <input
                type="text"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="EAAC3uZA..."
              />
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIG FACEBOOK: Dos Columnas (Mensajes | Comentarios) ── */}
      {tieneFB && (
        <div className="cr-inst-section">
          <div className="cr-inst-section-header" style={{ background: 'linear-gradient(135deg, #1877f222 0%, #1877f211 100%)' }}>
            <h3>📘 Configuración Facebook</h3>
          </div>
          <div className="cr-inst-section-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Columna 1: FB Mensajes */}
              {redesActivas.facebook_mensajes && (
                <div style={{ border: '1px solid var(--tm-border)', borderRadius: 10, padding: 14, background: '#fff' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1877f2', fontWeight: 700 }}>📨 FB Mensajes</h4>
                  <div className="cr-inst-field">
                    <label>ID_BOT_REDES *</label>
                    <select
                      value={idBotRedesPorRed.facebook_mensajes}
                      onChange={e => setIdBotRedesRed('facebook_mensajes', e.target.value)}
                      disabled={!idBot || loadingBotRedes}
                    >
                      <option value="">— Seleccionar —</option>
                      {opcionesPara('facebook_mensajes').map(br => (
                        <option key={br.ID_BOT_REDES} value={br.ID_BOT_REDES}>
                          {br.ID_BOT_REDES} · {br.NOMBRE_RED}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cr-inst-field" style={{ marginTop: 10 }}>
                    <label>ID Página FB *</label>
                    <input
                      type="text"
                      value={idPagina}
                      onChange={e => setIdPagina(e.target.value)}
                      placeholder="ej. 887713774643639"
                    />
                  </div>
                </div>
              )}
              {/* Columna 2: FB Comentarios */}
              {redesActivas.facebook_comentarios && (
                <div style={{ border: '1px solid var(--tm-border)', borderRadius: 10, padding: 14, background: '#fff' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#1877f2', fontWeight: 700 }}>💬 FB Comentarios</h4>
                  <div className="cr-inst-field">
                    <label>ID_BOT_REDES *</label>
                    <select
                      value={idBotRedesPorRed.facebook_comentarios}
                      onChange={e => setIdBotRedesRed('facebook_comentarios', e.target.value)}
                      disabled={!idBot || loadingBotRedes}
                    >
                      <option value="">— Seleccionar —</option>
                      {opcionesPara('facebook_comentarios').map(br => (
                        <option key={br.ID_BOT_REDES} value={br.ID_BOT_REDES}>
                          {br.ID_BOT_REDES} · {br.NOMBRE_RED}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cr-inst-field" style={{ marginTop: 10 }}>
                    <label>ID Página FB *</label>
                    <input
                      type="text"
                      value={idPagina}
                      onChange={e => setIdPagina(e.target.value)}
                      placeholder="ej. 887713774643639"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── CONFIG INSTAGRAM: Dos Columnas (Mensajes | Comentarios) ── */}
      {tieneIG && (
        <div className="cr-inst-section">
          <div className="cr-inst-section-header" style={{ background: 'linear-gradient(135deg, #e1306c22 0%, #e1306c11 100%)' }}>
            <h3>📷 Configuración Instagram</h3>
          </div>
          <div className="cr-inst-section-body">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Columna 1: IG Mensajes */}
              {redesActivas.instagram_mensajes && (
                <div style={{ border: '1px solid var(--tm-border)', borderRadius: 10, padding: 14, background: '#fff' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#e1306c', fontWeight: 700 }}>📨 IG Mensajes</h4>
                  <div className="cr-inst-field">
                    <label>ID_BOT_REDES *</label>
                    <select
                      value={idBotRedesPorRed.instagram_mensajes}
                      onChange={e => setIdBotRedesRed('instagram_mensajes', e.target.value)}
                      disabled={!idBot || loadingBotRedes}
                    >
                      <option value="">— Seleccionar —</option>
                      {opcionesPara('instagram_mensajes').map(br => (
                        <option key={br.ID_BOT_REDES} value={br.ID_BOT_REDES}>
                          {br.ID_BOT_REDES} · {br.NOMBRE_RED}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cr-inst-field" style={{ marginTop: 10 }}>
                    <label>ID Página IG *</label>
                    <input
                      type="text"
                      value={idPaginaIG}
                      onChange={e => setIdPaginaIG(e.target.value)}
                      placeholder="ej. 17841467633325960"
                    />
                  </div>
                  <div className="cr-inst-field" style={{ marginTop: 10 }}>
                    <label>Cuenta Instagram *</label>
                    <input
                      type="text"
                      value={cuentaIG}
                      onChange={e => setCuentaIG(e.target.value)}
                      placeholder="ej. ingacesagt"
                    />
                  </div>
                </div>
              )}
              {/* Columna 2: IG Comentarios */}
              {redesActivas.instagram_comentarios && (
                <div style={{ border: '1px solid var(--tm-border)', borderRadius: 10, padding: 14, background: '#fff' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: '#e1306c', fontWeight: 700 }}>💬 IG Comentarios</h4>
                  <div className="cr-inst-field">
                    <label>ID_BOT_REDES *</label>
                    <select
                      value={idBotRedesPorRed.instagram_comentarios}
                      onChange={e => setIdBotRedesRed('instagram_comentarios', e.target.value)}
                      disabled={!idBot || loadingBotRedes}
                    >
                      <option value="">— Seleccionar —</option>
                      {opcionesPara('instagram_comentarios').map(br => (
                        <option key={br.ID_BOT_REDES} value={br.ID_BOT_REDES}>
                          {br.ID_BOT_REDES} · {br.NOMBRE_RED}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="cr-inst-field" style={{ marginTop: 10 }}>
                    <label>ID Página IG *</label>
                    <input
                      type="text"
                      value={idPaginaIG}
                      onChange={e => setIdPaginaIG(e.target.value)}
                      placeholder="ej. 17841467633325960"
                    />
                  </div>
                  <div className="cr-inst-field" style={{ marginTop: 10 }}>
                    <label>Cuenta Instagram *</label>
                    <input
                      type="text"
                      value={cuentaIG}
                      onChange={e => setCuentaIG(e.target.value)}
                      placeholder="ej. ingacesagt"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* ── ACCIONES ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-body" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            className="cr-inst-btn"
            style={{ background: '#6c757d', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: algunaRed ? 'pointer' : 'not-allowed', opacity: algunaRed ? 1 : 0.5 }}
            onClick={() => { if (!validar()) return; setSqlPreview(generarSQL()); }}
            disabled={!algunaRed}
          >
            🔍 Ver SQL
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={handleProbar}
            disabled={probando || loading || !algunaRed}
          >
            {probando ? '⏳ Probando...' : '🧪 Probar (sin guardar)'}
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-primary"
            onClick={handleEjecutar}
            disabled={loading || probando || !algunaRed}
          >
            {loading ? '⏳ Ejecutando...' : '🚀 Ejecutar Integración'}
          </button>
        </div>
      </div>

      {/* ── MODAL SQL PREVIEW ── */}
      {sqlPreview && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
        }} onClick={() => setSqlPreview(null)}>
          <div style={{
            background: '#1e1e2e', borderRadius: 14, padding: 0,
            width: '80vw', maxWidth: 900, maxHeight: '80vh',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '14px 20px', borderBottom: '1px solid #333',
            }}>
              <span style={{ color: '#e0e0e0', fontWeight: 700, fontSize: 15 }}>🔍 Vista previa SQL</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => { navigator.clipboard.writeText(sqlPreview); toast.success('SQL copiado'); }}
                  style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12 }}
                >
                  📋 Copiar
                </button>
                <button
                  onClick={() => setSqlPreview(null)}
                  style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 6, padding: '5px 14px', cursor: 'pointer', fontSize: 12 }}
                >
                  ✕ Cerrar
                </button>
              </div>
            </div>
            <pre style={{
              margin: 0, padding: '16px 20px',
              overflowY: 'auto', fontSize: 12, lineHeight: 1.6,
              color: '#a8e6cf', fontFamily: 'Consolas, monospace',
              flex: 1,
            }}>{sqlPreview}</pre>
          </div>
        </div>
      )}

      {/* ── RESULTADO PRUEBA ── */}
      {resultadoPrueba && (
        <div className={`cr-inst-section cr-inst-section-full ${resultadoPrueba.success ? 'cr-inst-success' : 'cr-inst-error'}`}>
          <div className="cr-inst-section-header">
            <h3>{resultadoPrueba.success ? '🧪 Prueba Exitosa (sin cambios guardados)' : '❌ Error en la Prueba'}</h3>
          </div>
          <div className="cr-inst-section-body">
            <p><strong>{resultadoPrueba.mensaje || resultadoPrueba.error}</strong></p>
            {resultadoPrueba.resumen && <LogIntegracion resumen={resultadoPrueba.resumen} log={resultadoPrueba.log} />}
            {resultadoPrueba.details && <pre className="cr-inst-error-details">{resultadoPrueba.details}</pre>}
            {resultadoPrueba.success && resultadoPrueba.duracionMs && (
              <p className="cr-inst-help-text">Duración: {resultadoPrueba.duracionMs}ms</p>
            )}
          </div>
        </div>
      )}

      {/* ── RESULTADO EJECUCIÓN ── */}
      {resultado && (
        <div className={`cr-inst-section cr-inst-section-full ${resultado.success ? 'cr-inst-success' : 'cr-inst-error'}`}>
          <div className="cr-inst-section-header">
            <h3>{resultado.success ? '✅ Integración Ejecutada' : '❌ Error en la Operación'}</h3>
          </div>
          <div className="cr-inst-section-body">
            <p><strong>{resultado.mensaje || resultado.error}</strong></p>
            {resultado.resumen && <LogIntegracion resumen={resultado.resumen} log={resultado.log} />}
            {resultado.details && <pre className="cr-inst-error-details">{resultado.details}</pre>}
            {resultado.sqlMessage && <p className="cr-inst-sql-error">SQL: {resultado.sqlMessage}</p>}
          </div>
        </div>
      )}

      <ConfirmModal
        show={showEjecutarModal}
        title="Ejecutar Integración FB/IG"
        confirmText="Ejecutar"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={confirmEjecutar}
        onCancel={() => setShowEjecutarModal(false)}
      >
        <p>¿Ejecutar integración para: {Object.keys(construirParams().redes).join(', ')}?</p>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>Si algunos datos ya existen, se actualizarán (no fallará).</p>
      </ConfirmModal>
    </div>
  );
}
