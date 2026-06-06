import { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import sqlTemplate from './Creacion_nueva_instancia.sql?raw';
import ConfirmModal from '../../components/ConfirmModal';

// ── Bases de datos disponibles (solo Talkme, no Ficohsa) ───────────────────
const DB_NAMES = {
  'db_1': 'Talkme S1 (wss.talkme.pro)',
  'db_2': 'Talkme S2 (cloud-s2)',
  'db_3': 'Talkme S3 (cloud-s3)',
  'db_4': 'Talkme S4 (cloud-s4)',
  'db_5': 'Talkme MDD (cloud-mdd)',
};

// Mapeo de DB key a Socket URL correspondiente
const DB_SOCKET_URLS = {
  'db_1': 'https://wss.talkme.pro',        // S1 usa wss
  'db_2': 'https://cloud-s2.talkme.pro',   // S2 usa cloud-s2
  'db_3': 'https://cloud-s3.talkme.pro',   // S3 usa cloud-s3
  'db_4': 'https://cloud-s4.talkme.pro',   // S4 usa cloud-s4
  'db_5': 'https://cloud-mdd.talkme.pro',  // MDD usa cloud-mdd
};

// Mapeo de DB key a URL de notificaciones correspondiente
const DB_NOTIFICACION_URLS = {
  'db_1': 'https://cloud.consystec-corp.com',  // S1
  'db_2': 'https://cloud-s2.consystec-corp.com',  // S2
  'db_3': 'https://cloud-s3.consystec-corp.com',  // S3
  'db_4': 'https://cloud-s4.consystec-corp.com',  // S4
  'db_5': 'https://cloud-mdd.consystec-corp.com', // MDD
};

// ── URLs disponibles ───────────────────────────────────────────────────────
const SOCKET_URLS = [
  { value: 'https://cloud-s2.talkme.pro', label: 'cloud-s2.talkme.pro' },
  { value: 'https://cloud-s3.talkme.pro', label: 'cloud-s3.talkme.pro' },
  { value: 'https://cloud-s4.talkme.pro', label: 'cloud-s4.talkme.pro' },
  { value: 'https://cloud-mdd.talkme.pro', label: 'cloud-mdd.talkme.pro' },
  { value: 'https://wss.talkme.pro', label: 'wss.talkme.pro' },
];

const NOTIFICACION_URLS = [
  { value: 'https://cloud.consystec-corp.com', label: 'cloud.consystec-corp.com' },
  { value: 'https://cloud-s2.consystec-corp.com', label: 'cloud-s2.consystec-corp.com' },
  { value: 'https://cloud-s3.consystec-corp.com', label: 'cloud-s3.consystec-corp.com' },
  { value: 'https://cloud-s4.consystec-corp.com', label: 'cloud-s4.consystec-corp.com' },
  { value: 'https://cloud-mdd.consystec-corp.com', label: 'cloud-mdd.consystec-corp.com' },
];

// ── Países mapeados (ID, Nombre, Moneda, Código Moneda) ─────────────────────
const PAISES_MAPEADOS = [
  { ID_PAIS: 1, NOMBRE: 'GUATEMALA', ABREVIATURA: 'GT', MONEDA: 'Q', COD_MONEDA: 'GTQ' },
  { ID_PAIS: 2, NOMBRE: 'EL SALVADOR', ABREVIATURA: 'SV', MONEDA: '$', COD_MONEDA: 'USD' },
  { ID_PAIS: 3, NOMBRE: 'HONDURAS', ABREVIATURA: 'HN', MONEDA: 'L', COD_MONEDA: 'HNL' },
  { ID_PAIS: 4, NOMBRE: 'NICARAGUA', ABREVIATURA: 'NI', MONEDA: 'C$', COD_MONEDA: 'NIO' },
  { ID_PAIS: 5, NOMBRE: 'COSTA RICA', ABREVIATURA: 'CR', MONEDA: '₡', COD_MONEDA: 'CRC' },
  { ID_PAIS: 6, NOMBRE: 'PANAMA', ABREVIATURA: 'PA', MONEDA: 'B/.', COD_MONEDA: 'PAB' },
  { ID_PAIS: 7, NOMBRE: 'PERU', ABREVIATURA: 'PE', MONEDA: 'S/', COD_MONEDA: 'PEN' },
  { ID_PAIS: 8, NOMBRE: 'COLOMBIA', ABREVIATURA: 'CO', MONEDA: '$', COD_MONEDA: 'COP' },
];

// ── Redes sociales disponibles ─────────────────────────────────────────────
const REDES_SOCIALES = [
  { id: '1', nombre: 'WhatsApp', icono: '/assets/whatsapp.png', color: '#25D366' },
  { id: '2', nombre: 'Facebook', icono: '/assets/messenger.png', color: '#1877F2' },
  { id: '5', nombre: 'Broadcast WhatsApp', icono: '/assets/broadcast_whatsapp.png', color: '#128C7E' },
  { id: '6', nombre: 'Broadcast SMS', icono: '/assets/sms.png', color: '#FF6B6B' },
  { id: '7', nombre: 'WebChat', icono: '/assets/webchat.png', color: '#6366F1' },
  { id: '9', nombre: 'Web Catalogo', icono: '/assets/WEB_CATALOGO.png', color: '#F59E0B' },
  { id: '10', nombre: 'Instagram', icono: '/assets/instagram_messenger.svg', color: '#E4405F' },
  { id: '11', nombre: 'FB Comentarios', icono: '/assets/facebook_comnetarios.png', color: '#1877F2' },
  { id: '12', nombre: 'IG Comentarios', icono: '/assets/instagram_comentarios.png', color: '#E4405F' },
];

const SQL_REDES_CONFIG = {
  '1': {
    nombre: 'WhatsApp',
    variable: 'BotRedesWhatsapp',
    variableBeta: 'BotRedesWhatsappBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '1', '1', '1', NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '1', '1', NOW(), @creadoPor);`,
  },
  '7': {
    nombre: 'WebChat',
    variable: 'BotRedesWebChat',
    variableBeta: 'BotRedesWebChatBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, BAJO_DEMANDA, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '7', '1', 1, 1, NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '7', '1', NOW(), @creadoPor);`,
  },
  '2': {
    nombre: 'Facebook',
    variable: 'BtoRedesFB',
    variableBeta: 'BtoRedesFBBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, BAJO_DEMANDA, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '2', '1', 1, 1, NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '2', '1', NOW(), @creadoPor);`,
  },
  '11': {
    nombre: 'FB Comentarios',
    variable: 'BtoRedesComentsFB',
    variableBeta: 'BtoRedesComentsFBBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '11', '1', 1, NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '11', '1', NOW(), @creadoPor);`,
  },
  '10': {
    nombre: 'Instagram',
    variable: 'BtoRedesIG',
    variableBeta: 'BtoRedesIGBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, BAJO_DEMANDA, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '10', '1', 1, 1, NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '10', '1', NOW(), @creadoPor);`,
  },
  '12': {
    nombre: 'IG Comentarios',
    variable: 'BtoRedesComentsIG',
    variableBeta: 'BtoRedesComentsIGBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '12', '1', 1, NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '12', '1', NOW(), @creadoPor);`,
  },
  '5': {
    nombre: 'Broadcast WhatsApp',
    variable: 'BtoRedesBroadcastWhatsapp',
    variableBeta: 'BtoRedesBroadcastWhatsappBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '5', '0', 1, NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '5', '0', NOW(), @creadoPor);`,
  },
  '6': {
    nombre: 'Broadcast SMS',
    variable: 'BtoRedesBroadcastSMS',
    variableBeta: 'BtoRedesBroadcastSMSBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '6', '0', NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '6', '0', NOW(), @creadoPor);`,
  },
  '9': {
    nombre: 'Web Catalogo',
    variable: 'BtoRedesWebCatalogo',
    variableBeta: 'BtoRedesWebCatalogoBeta',
    insert: `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '9', '1', NOW(), @creadoPor);`,
    insertBeta: `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '9', '1', NOW(), @creadoPor);`,
  },
};

// ── Helper para obtener usuario logueado ─────────────────────────────────────
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

// ── Valores por defecto ───────────────────────────────────────────────────────
const DEFAULT_VALUES = {
  // Base de datos
  dbKey: 'db_1',
  
  // Datos empresa
  EmpresaNombre: '',
  NombreBOT: '',
  EmpresaTelefono: 'NA',
  EmpresaCorreo: 'NA',
  EmpresaDireccion: 'NA',
  creadoPor: getUsuarioLogueado(),
  socketUrl: 'https://wss.talkme.pro',  // db_1 usa wss por defecto
  URLEnvioNotificaciones: 'https://cloud.consystec-corp.com',

  // Tokens y fechas
  tokenEmpresa: '',
  tokenConsystec: 'token_consystec',
  fechaInicioPaquete: '',
  fechaFinPaquete: '',

  // Contacto
  nombreContacto: '',
  telefonoContacto: '',

  // WhatsApp WebChat
  TELEFONO_WHATSAPP_WEBCHAT: '',
  Moneda: 'Q',
  CodMoneda: 'GTQ',
  idPais: '1',

  // Folder
  FOLDER_FILES: '',
  Correo_cliente: '',

  // Correos internos
  Correo_interno: 'ventas@consystec-corp.com,vinicio.sanchez@consystec-corp.com',
  Correo_interno_paquetes: 'ventas@consystec-corp.com,soporte.talkme@consystec-corp.com',

  // Redes seleccionadas (solo WhatsApp por defecto)
  redesSeleccionadas: ['1'],
};

function CreacionInstancia() {
  const [formData, setFormData] = useState(DEFAULT_VALUES);
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [sqlPreview, setSqlPreview] = useState('');
  const [probandoSQL, setProbandoSQL] = useState(false);
  const [resultadoPruebaSQL, setResultadoPruebaSQL] = useState(null);
  const [plantillaSQL, setPlantillaSQL] = useState(sqlTemplate);
  const [plantillaEditor, setPlantillaEditor] = useState('');
  const [showPlantillaEditor, setShowPlantillaEditor] = useState(false);
  const [guardandoPlantilla, setGuardandoPlantilla] = useState(false);
  const [metadataPlantilla, setMetadataPlantilla] = useState(null);
  const [paises] = useState(PAISES_MAPEADOS); // Usar mapeo estático
  const [generandoToken, setGenerandoToken] = useState(false);

  // ── Estados de modales de confirmación ──
  const [showGuardarPlantillaModal, setShowGuardarPlantillaModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // ── Calcular fechas por defecto al cargar (lógica UTC para Guatemala) ──
  useEffect(() => {
    const hoy = new Date();
    const año = hoy.getFullYear();
    const mes = hoy.getMonth(); // 0-11
    
    // Mes actual: día 1 a las 06:00:00
    const inicio = new Date(Date.UTC(año, mes, 1, 6, 0, 0));
    
    // Mes siguiente: día 1 a las 05:59:59 (que es 23:59:59 en Guatemala UTC-6)
    const fin = new Date(Date.UTC(año, mes + 1, 1, 5, 59, 59));

    const formatFechaSQL = (date) => {
      const y = date.getUTCFullYear();
      const m = String(date.getUTCMonth() + 1).padStart(2, '0');
      const d = String(date.getUTCDate()).padStart(2, '0');
      const h = String(date.getUTCHours()).padStart(2, '0');
      const min = String(date.getUTCMinutes()).padStart(2, '0');
      const s = String(date.getUTCSeconds()).padStart(2, '0');
      return `${y}-${m}-${d} ${h}:${min}:${s}`;
    };

    setFormData(prev => ({
      ...prev,
      fechaInicioPaquete: formatFechaSQL(inicio),
      fechaFinPaquete: formatFechaSQL(fin),
    }));
  }, []);

  useEffect(() => {
    const cargarPlantillaSQL = async () => {
      try {
        const response = await fetchWithAuth(API_URLS.creacionesPlantillaSQL());
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'No se pudo cargar la plantilla SQL');
        }

        setPlantillaSQL(data.contenido);
        setPlantillaEditor(data.contenido);
        setMetadataPlantilla(data);
      } catch (error) {
        setPlantillaEditor(sqlTemplate);
      }
    };

    cargarPlantillaSQL();
  }, []);

  // ── Auto-generar FOLDER_FILES cuando cambia el nombre ──
  useEffect(() => {
    if (formData.EmpresaNombre && formData.NombreBOT) {
      const folderEmpresa = formData.EmpresaNombre
        .toLowerCase()
        .replace(/[áéíóúñ]/g, c => ({ 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n' })[c] || c)
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

      const folderBot = formData.NombreBOT
        .toLowerCase()
        .replace(/[áéíóúñ]/g, c => ({ 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u', 'ñ': 'n' })[c] || c)
        .replace(/[^a-z0-9]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '');

      setFormData(prev => ({
        ...prev,
        FOLDER_FILES: `${folderEmpresa}/${folderBot}`,
      }));
    }
  }, [formData.EmpresaNombre, formData.NombreBOT]);

  // ── Auto-generar Correo_cliente cuando cambia nombreContacto ──
  useEffect(() => {
    if (formData.nombreContacto) {
      const email = formData.nombreContacto
        .toLowerCase()
        .replace(/[^a-z\s]/g, '')
        .trim()
        .replace(/\s+/g, '.')
        + '@talkme.pro';

      setFormData(prev => ({
        ...prev,
        Correo_cliente: email,
      }));
    }
  }, [formData.nombreContacto]);

  // ── Correos base fijos (siempre presentes en internos) ──
  const CORREOS_BASE_INTERNO = DEFAULT_VALUES.Correo_interno.split(',').map(c => c.trim());
  const CORREOS_BASE_PAQUETES = DEFAULT_VALUES.Correo_interno_paquetes.split(',').map(c => c.trim());

  // ── Al salir del campo Correo_cliente: sincronizar con correos internos ──
  // Solo agrega si es un email válido. Reconstruye desde base + nuevo correo cliente.
  const esEmailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleCorreoClienteBlur = () => {
    const correo = formData.Correo_cliente?.trim();
    // Si el campo tiene comas o no es email válido, limpiar a solo el correo válido que haya
    if (correo && correo.includes(',')) {
      const soloCorreo = correo.split(',').map(c => c.trim()).find(esEmailValido) || '';
      setFormData(prev => ({ ...prev, Correo_cliente: soloCorreo }));
      return;
    }
    if (!correo || !esEmailValido(correo)) return;

    // Reconstruir listas: base + correo cliente (sin duplicados)
    setFormData(prev => ({
      ...prev,
      Correo_interno: [...CORREOS_BASE_INTERNO, correo]
        .filter((c, i, arr) => arr.indexOf(c) === i).join(','),
      Correo_interno_paquetes: [...CORREOS_BASE_PAQUETES, correo]
        .filter((c, i, arr) => arr.indexOf(c) === i).join(','),
    }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // ── Manejar cambio de base de datos y actualizar URLs automáticamente ──
  const handleDbChange = (e) => {
    const dbKey = e.target.value;
    const socketUrl = DB_SOCKET_URLS[dbKey] || 'https://wss.talkme.pro';
    const notifUrl = DB_NOTIFICACION_URLS[dbKey] || 'https://wss.talkme.pro';
    
    setFormData(prev => ({
      ...prev,
      dbKey: dbKey,
      socketUrl: socketUrl,
      URLEnvioNotificaciones: notifUrl,
    }));
    
    toast.info(`Base de datos cambiada a ${DB_NAMES[dbKey]}`);
  };

  // ── Manejar cambio de país y actualizar moneda automáticamente ──
  const handlePaisChange = (e) => {
    const idPais = e.target.value;
    const pais = paises.find(p => p.ID_PAIS.toString() === idPais);
    if (pais) {
      setFormData(prev => ({
        ...prev,
        idPais: idPais,
        Moneda: pais.MONEDA || 'Q',
        CodMoneda: pais.COD_MONEDA || 'GTQ',
      }));
    }
  };

  // ── Generar token aleatorio de 50 caracteres ──
  const generarToken = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    // Excluyendo caracteres similares: i, I, 1, l, o, O, 0
    const charsFiltrados = chars.replace(/[iIlLoO0]/g, '');
    let token = '';
    for (let i = 0; i < 50; i++) {
      token += charsFiltrados.charAt(Math.floor(Math.random() * charsFiltrados.length));
    }
    setFormData(prev => ({ ...prev, tokenEmpresa: token }));
    toast.success('Token generado automáticamente');
  };

  const toggleRed = (id) => {
    setFormData(prev => ({
      ...prev,
      redesSeleccionadas: prev.redesSeleccionadas.includes(id)
        ? prev.redesSeleccionadas.filter(r => r !== id)
        : [...prev.redesSeleccionadas, id],
    }));
  };

  const generarBloqueRedesSQL = () => {
    const redesOrdenadas = ['1', '7', '2', '11', '10', '12', '5', '6', '9']
      .filter(id => formData.redesSeleccionadas.includes(id));

    const botRedes = redesOrdenadas.map(id => {
      const red = SQL_REDES_CONFIG[id];
      return `-- ${red.nombre}
${red.insert}

SELECT @${red.variable} := LAST_INSERT_ID();`;
    }).join('\n\n');

    const botRedesBeta = redesOrdenadas.map(id => {
      const red = SQL_REDES_CONFIG[id];
      return `-- ${red.nombre}
${red.insertBeta}

SELECT @${red.variableBeta} := LAST_INSERT_ID();`;
    }).join('\n\n');

    return `/*****************************/
/* CREANDO BOT REDES Y BOT REDES BETA */
/*****************************/

/* BOT_REDES - Generado según selección de la ventana */

${botRedes}

/* BOT_REDES_BETA - Generado según selección de la ventana */

${botRedesBeta}

`;
  };

  const aplicarRedesSeleccionadasSQL = (sql) => {
    const marcadorInicio = '/* CREANDO BOT REDES Y BOT REDES BETA */';
    const posicionMarcador = sql.indexOf(marcadorInicio);
    const inicio = posicionMarcador === -1
      ? -1
      : sql.lastIndexOf('/*****************************/', posicionMarcador);
    const fin = sql.indexOf('/* SE INSERTA EL REGISTRO EN ACUMULADOR */');

    if (inicio === -1 || fin === -1 || fin <= inicio) {
      return sql;
    }

    return `${sql.slice(0, inicio)}${generarBloqueRedesSQL()}${sql.slice(fin)}`;
  };

  const generarBotRedConfValoresSQL = () => {
    const inserts = [];

    if (formData.redesSeleccionadas.includes('1')) {
      inserts.push(`-- WhatsApp
INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BotRedesWhatsapp, '1', @TELEFONO_WHATSAPP_WEBCHAT, NOW(), @creadoPor);

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BotRedesWhatsapp, '4', @socketUrl, NOW(), @creadoPor);`);
    }

    if (formData.redesSeleccionadas.includes('7')) {
      inserts.push(`-- WebChat
INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BotRedesWebChat, '4', @socketUrl, NOW(), @creadoPor);`);
    }

    if (formData.redesSeleccionadas.includes('9')) {
      inserts.push(`-- Web Catalogo
INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BtoRedesWebCatalogo, '4', @socketUrl, NOW(), @creadoPor);`);
    }

    return `/* SE INSERTA EN LA BOT_RED_CONF_VALORES - Generado según selección de la ventana */

${inserts.join('\n\n')}

`;
  };

  const aplicarBotRedConfValoresSQL = (sql) => {
    const inicio = sql.indexOf('/* SE INSERTA EN LA BOT_RED_CONF_VALORES */');
    const fin = sql.indexOf('/*  SE ACTUALIZA EL PARAMETRO PARA CREAR CONVERSACIONES DE BROADCAST */');

    if (inicio === -1 || fin === -1 || fin <= inicio) {
      return sql;
    }

    return `${sql.slice(0, inicio)}${generarBotRedConfValoresSQL()}${sql.slice(fin)}`;
  };

  const generarSQL = () => {
    const escapeSql = (value) => String(value ?? '').replace(/\\/g, '\\\\').replace(/'/g, "''");
    const replaceSet = (sql, variable, value, quote = true) => {
      const formattedValue = quote ? `'${escapeSql(value)}'` : String(value ?? '');
      // Soportar espacios y tabulaciones \t que están en el archivo .sql original
      const regex = new RegExp(`SET\\s+@${variable}[\\s\\t]*:=[\\s\\t]*[^;]*;`, 'i');
      return sql.replace(regex, `SET @${variable} := ${formattedValue};`);
    };

    return [
      ['EmpresaNombre', formData.EmpresaNombre],
      ['NombreBOT', formData.NombreBOT],
      ['EmpresaTelefono', formData.EmpresaTelefono],
      ['EmpresaCorreo', formData.EmpresaCorreo],
      ['EmpresaDireccion', formData.EmpresaDireccion],
      ['creadoPor', formData.creadoPor],
      ['socketUrl', formData.socketUrl],
      ['URLEnvioNotificaciones', formData.URLEnvioNotificaciones],
      ['tokenEmpresa', formData.tokenEmpresa],
      ['tokenConsystec', formData.tokenConsystec],
      ['fechaInicioPaquete', formData.fechaInicioPaquete],
      ['fechaFinPaquete', formData.fechaFinPaquete],
      ['nombreContacto', formData.nombreContacto],
      ['telefonoContacto', formData.telefonoContacto],
      ['TELEFONO_WHATSAPP_WEBCHAT', formData.TELEFONO_WHATSAPP_WEBCHAT],
      ['Moneda', formData.Moneda],
      ['CodMoneda', formData.CodMoneda],
      ['FOLDER_FILES', formData.FOLDER_FILES],
      ['Correo_cliente', formData.Correo_cliente],
      ['Correo_interno', formData.Correo_interno],
      ['Correo_interno_paquetes', formData.Correo_interno_paquetes],
    ].reduce(
      (sql, [variable, value]) => replaceSet(sql, variable, value),
      aplicarBotRedConfValoresSQL(
        aplicarRedesSeleccionadasSQL(
          replaceSet(plantillaSQL, 'idPais', formData.idPais, false)
        )
      )
    );
  };

  const handlePreview = () => {
    setSqlPreview(generarSQL());
    setResultadoPruebaSQL(null);
    setShowPreview(true);
  };

  const handleCopiarSQL = async () => {
    try {
      const sql = sqlPreview || generarSQL();
      await navigator.clipboard.writeText(sql);
      toast.success('SQL copiado al portapapeles');
    } catch (error) {
      toast.error('No se pudo copiar el SQL');
    }
  };

  const handleGuardarPlantillaSQL = async () => {
    setShowGuardarPlantillaModal(true);
  };

  const confirmGuardarPlantilla = async () => {
    setShowGuardarPlantillaModal(false);

    setGuardandoPlantilla(true);

    try {
      const response = await fetchWithAuth(API_URLS.creacionesPlantillaSQL(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: plantillaEditor }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw data;
      }

      setPlantillaSQL(plantillaEditor);
      setMetadataPlantilla(data);
      setShowPlantillaEditor(false);
      setSqlPreview('');
      setResultadoPruebaSQL(null);
      toast.success('Plantilla SQL actualizada correctamente');
    } catch (error) {
      toast.error(error.variablesFaltantes?.length
        ? `Faltan variables: ${error.variablesFaltantes.join(', ')}`
        : (error.details || error.error || 'No se pudo guardar la plantilla SQL')
      );
    } finally {
      setGuardandoPlantilla(false);
    }
  };

  const handleProbarSQL = async () => {
    const sql = sqlPreview || generarSQL();
    setProbandoSQL(true);
    setResultadoPruebaSQL(null);

    try {
      const response = await fetchWithAuth(API_URLS.creacionesInstanciaProbarSQL(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dbKey: formData.dbKey,
          sqlScript: sql,
        }),
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw { error: 'Respuesta no válida del servidor', details: text };
      }

      if (!response.ok) {
        throw data;
      }

      setResultadoPruebaSQL(data);
      toast.success('Prueba SQL exitosa. No se guardaron cambios.');
    } catch (error) {
      setResultadoPruebaSQL({
        success: false,
        error: error.error || 'La prueba SQL falló',
        details: error.details || error.message || 'Error desconocido',
        sqlMessage: error.sqlMessage,
        errno: error.errno,
        sqlState: error.sqlState,
      });
      toast.error(error.details || error.error || 'La prueba SQL falló');
    } finally {
      setProbandoSQL(false);
    }
  };

  const handleSubmit = async () => {
    // Validaciones
    if (!formData.EmpresaNombre.trim()) {
      toast.error('El nombre de la empresa es obligatorio');
      return;
    }
    if (!formData.NombreBOT.trim()) {
      toast.error('El nombre del BOT es obligatorio');
      return;
    }
    if (!formData.tokenEmpresa.trim()) {
      toast.error('El token de empresa es obligatorio');
      return;
    }
    if (formData.redesSeleccionadas.length === 0) {
      toast.error('Debe seleccionar al menos una red social');
      return;
    }

    setLoading(true);
    setResultado(null);

    try {
      const response = await fetchWithAuth(API_URLS.creacionesInstancia(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          sqlScript: generarSQL(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear la instancia');
      }

      setResultado({
        success: true,
        ...data,
      });
      toast.success(`Empresa creada exitosamente. ID: ${data.idEmpresa}`);

      // Limpiar formulario
      setFormData(DEFAULT_VALUES);
      setShowPreview(false);

    } catch (error) {
      setResultado({
        success: false,
        error: error.message,
      });
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setShowResetModal(true);
  };

  const confirmReset = () => {
    setShowResetModal(false);
    setFormData(DEFAULT_VALUES);
    setResultado(null);
    setResultadoPruebaSQL(null);
    setShowPreview(false);
  };

  const resaltarSQL = (sql) => {
    const escapeHtml = (text) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escapeHtml(sql)
      .replace(/(--.*)$/gm, '<span class="sql-comment">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="sql-comment">$1</span>')
      .replace(/('[^']*(?:''[^']*)*')/g, '<span class="sql-string">$1</span>')
      .replace(/\b(SET|INSERT|INTO|VALUES|SELECT|UPDATE|FROM|WHERE|JOIN|ON|CONCAT|LAST_INSERT_ID|NOW|CAST|ORDER BY)\b/gi, '<span class="sql-keyword">$1</span>')
      .replace(/\b(EMPRESAS|BOT|HORARIO_BOT|TIPO_CLIENTE|ESTADOS|TIPOS_GESTION|SKILLS|HORARIO_SKILL|TIPOS_RESOLUCIONES|ATRIBUTOS_FICHA_CLIENTE|PARAMETROS|USUARIOS|BOT_REDES|BOT_REDES_BETA|ACUMULADOR|PAQUETE_PROVISION|BOT_RED_CONF_VALORES)\b/g, '<span class="sql-table">$1</span>')
      .replace(/(@[A-Za-z0-9_]+)/g, '<span class="sql-variable">$1</span>');
  };

  return (
    <div className="cr-inst-container">
      <div className="cr-inst-header">
        <h2>
          <span className="cr-inst-header-icon">🏢</span>
          Creación de Instancia
        </h2>
        <div className="cr-inst-actions">
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={handlePreview}
          >
            👁️ Vista SQL
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={() => setShowPlantillaEditor(prev => !prev)}
          >
            🧩 Actualizar Plantilla SQL
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-secondary"
            onClick={handleReset}
          >
            Limpiar
          </button>
          <button
            className="cr-inst-btn cr-inst-btn-primary"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? '⏳ Creando...' : '✅ Crear Empresa'}
          </button>
        </div>
      </div>

      {showPlantillaEditor && (
        <div className="cr-inst-section cr-inst-section-full cr-inst-template-editor">
          <div className="cr-inst-section-header">
            <h3>🧩 Actualizar Plantilla SQL Local</h3>
            <span className="cr-inst-section-badge">
              {metadataPlantilla?.bytes ? `${metadataPlantilla.bytes} bytes` : 'Plantilla local'}
            </span>
          </div>
          <div className="cr-inst-section-body">
            <p className="cr-inst-template-help">
              Pega aquí el query actualizado de la última empresa creada. Al guardar, se reemplaza el archivo local y se crea un respaldo .bak automáticamente.
            </p>
            {metadataPlantilla?.actualizadoEl && (
              <span className="cr-inst-field-hint">
                Última actualización local: {new Date(metadataPlantilla.actualizadoEl).toLocaleString('es-GT')}
              </span>
            )}
            <textarea
              className="cr-inst-template-textarea"
              value={plantillaEditor}
              onChange={(e) => setPlantillaEditor(e.target.value)}
              spellCheck="false"
            />
            <div className="cr-inst-template-actions">
              <button
                className="cr-inst-btn cr-inst-btn-primary"
                onClick={handleGuardarPlantillaSQL}
                disabled={guardandoPlantilla}
              >
                {guardandoPlantilla ? 'Guardando...' : 'Guardar Plantilla SQL'}
              </button>
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={() => setPlantillaEditor(plantillaSQL)}
                disabled={guardandoPlantilla}
              >
                Restaurar contenido cargado
              </button>
              <button
                className="cr-inst-btn cr-inst-btn-secondary"
                onClick={() => setShowPlantillaEditor(false)}
                disabled={guardandoPlantilla}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sección: Base de Datos (ancho completo) ── */}
      <div className="cr-inst-section cr-inst-section-full">
        <div className="cr-inst-section-header">
          <h3>🗄️ Base de Datos Destino</h3>
          <span className="cr-inst-section-badge">Obligatorio</span>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid">
            <div className="cr-inst-field">
              <label className="cr-inst-required">Seleccionar Base de Datos</label>
              <select
                name="dbKey"
                value={formData.dbKey}
                onChange={handleDbChange}
              >
                {Object.entries(DB_NAMES).map(([key, name]) => (
                  <option key={key} value={key}>{name}</option>
                ))}
              </select>
              <span className="cr-inst-field-hint">Base de datos donde se creará la empresa. Las URLs se actualizan automáticamente.</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de 2 columnas para el resto de secciones */}
      <div className="cr-inst-sections-grid">

      {/* ── Sección: Datos de la Empresa ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>📋 Datos de la Empresa</h3>
          <span className="cr-inst-section-badge">Obligatorio</span>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-2">
            <div className="cr-inst-field">
              <label className="cr-inst-required">Nombre de la Empresa</label>
              <input
                type="text"
                name="EmpresaNombre"
                value={formData.EmpresaNombre}
                onChange={handleChange}
                placeholder="Ej: Grupo Master"
              />
              <span className="cr-inst-field-hint">Nombre oficial de la empresa</span>
            </div>

            <div className="cr-inst-field">
              <label className="cr-inst-required">Nombre del BOT</label>
              <input
                type="text"
                name="NombreBOT"
                value={formData.NombreBOT}
                onChange={handleChange}
                placeholder="Ej: Grupo Master"
              />
              <span className="cr-inst-field-hint">Nombre que se mostrará en el bot</span>
            </div>

            <div className="cr-inst-field">
              <label>Teléfono de la Empresa</label>
              <input
                type="text"
                name="EmpresaTelefono"
                value={formData.EmpresaTelefono}
                onChange={handleChange}
                placeholder="NA"
              />
            </div>

            <div className="cr-inst-field">
              <label>Correo de la Empresa</label>
              <input
                type="text"
                name="EmpresaCorreo"
                value={formData.EmpresaCorreo}
                onChange={handleChange}
                placeholder="NA"
              />
            </div>

            <div className="cr-inst-field">
              <label>Dirección</label>
              <input
                type="text"
                name="EmpresaDireccion"
                value={formData.EmpresaDireccion}
                onChange={handleChange}
                placeholder="NA"
              />
            </div>

            <div className="cr-inst-field">
              <label>Creado Por</label>
              <input
                type="text"
                name="creadoPor"
                value={formData.creadoPor}
                onChange={handleChange}
                disabled
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: URLs y Tokens ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>🔗 URLs y Tokens</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-2">
            <div className="cr-inst-field">
              <label>Socket URL</label>
              <select
                name="socketUrl"
                value={formData.socketUrl}
                onChange={handleChange}
              >
                {SOCKET_URLS.map(url => (
                  <option key={url.value} value={url.value}>{url.label}</option>
                ))}
              </select>
            </div>

            <div className="cr-inst-field">
              <label>URL Envío Notificaciones</label>
              <select
                name="URLEnvioNotificaciones"
                value={formData.URLEnvioNotificaciones}
                onChange={handleChange}
              >
                {NOTIFICACION_URLS.map(url => (
                  <option key={url.value} value={url.value}>{url.label}</option>
                ))}
              </select>
            </div>

            <div className="cr-inst-field">
              <label className="cr-inst-required">Token Empresa</label>
              <div className="cr-inst-field-row">
                <input
                  type="text"
                  name="tokenEmpresa"
                  value={formData.tokenEmpresa}
                  onChange={handleChange}
                  placeholder="Ingrese el token de la empresa"
                  className="cr-inst-input-token"
                />
                <button
                  type="button"
                  className="cr-inst-btn cr-inst-btn-sm"
                  onClick={generarToken}
                  title="Generar token aleatorio de 50 caracteres"
                >
                  🔑 Generar
                </button>
              </div>
              <span className="cr-inst-field-hint">50 caracteres (A-Z, a-z, 0-9, sin caracteres similares)</span>
            </div>

            <div className="cr-inst-field">
              <label>Token Consystec</label>
              <input
                type="text"
                name="tokenConsystec"
                value={formData.tokenConsystec}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Fechas del Paquete ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>📅 Fechas del Paquete</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-2">
            <div className="cr-inst-field">
              <label>Fecha Inicio Paquete</label>
              <input
                type="text"
                name="fechaInicioPaquete"
                value={formData.fechaInicioPaquete}
                onChange={handleChange}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </div>

            <div className="cr-inst-field">
              <label>Fecha Fin Paquete</label>
              <input
                type="text"
                name="fechaFinPaquete"
                value={formData.fechaFinPaquete}
                onChange={handleChange}
                placeholder="YYYY-MM-DD HH:MM:SS"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Contacto ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>👤 Datos de Contacto</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-2">
            <div className="cr-inst-field">
              <label>Nombre del Contacto</label>
              <input
                type="text"
                name="nombreContacto"
                value={formData.nombreContacto}
                onChange={handleChange}
                placeholder="Ej: Karla Barrios"
              />
            </div>

            <div className="cr-inst-field">
              <label>Teléfono del Contacto</label>
              <input
                type="text"
                name="telefonoContacto"
                value={formData.telefonoContacto}
                onChange={handleChange}
                placeholder="Ej: 50256333085"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Configuración WhatsApp ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>💬 Configuración WhatsApp</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-3">
            <div className="cr-inst-field">
              <label>Teléfono WhatsApp WebChat</label>
              <input
                type="text"
                name="TELEFONO_WHATSAPP_WEBCHAT"
                value={formData.TELEFONO_WHATSAPP_WEBCHAT}
                onChange={handleChange}
                placeholder="Ej: 502"
              />
            </div>

            <div className="cr-inst-field">
              <label>Moneda (auto)</label>
              <input
                type="text"
                name="Moneda"
                value={formData.Moneda}
                disabled
                className="cr-inst-field-disabled"
              />
              <span className="cr-inst-field-hint">Se actualiza según el país seleccionado</span>
            </div>

            <div className="cr-inst-field">
              <label>Código Moneda (auto)</label>
              <input
                type="text"
                name="CodMoneda"
                value={formData.CodMoneda}
                disabled
                className="cr-inst-field-disabled"
              />
            </div>

            <div className="cr-inst-field">
              <label>País</label>
              <select
                name="idPais"
                value={formData.idPais}
                onChange={handlePaisChange}
              >
                {paises.map(pais => (
                  <option key={pais.ID_PAIS} value={pais.ID_PAIS}>
                    {pais.NOMBRE} ({pais.ABREVIATURA})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Carpetas ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>📁 Configuración de Carpetas</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-2">
            <div className="cr-inst-field">
              <label>FOLDER_FILES</label>
              <input
                type="text"
                name="FOLDER_FILES"
                value={formData.FOLDER_FILES}
                onChange={handleChange}
                placeholder="empresa/bot"
              />
              <span className="cr-inst-field-hint">Formato: empresa/bot (minúsculas, sin espacios ni tildes)</span>
            </div>

            <div className="cr-inst-field">
              <label>Correo del Cliente</label>
              <input
                type="text"
                name="Correo_cliente"
                value={formData.Correo_cliente}
                onChange={handleChange}
                onBlur={handleCorreoClienteBlur}
                placeholder="correo@talkme.pro"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Correos Internos ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>📧 Correos Internos</h3>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-grid cr-inst-grid-2">
            <div className="cr-inst-field">
              <label>Correo Interno General</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid var(--tm-border)', borderRadius: 8, background: 'var(--tm-surface)', minHeight: 44 }}>
                {formData.Correo_interno.split(',').map(c => c.trim()).filter(Boolean).map((correo, i) => (
                  <span key={i} style={{ background: '#e8f4fd', color: '#1877f2', border: '1px solid #b3d7f5', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {correo}
                  </span>
                ))}
              </div>
              <textarea
                name="Correo_interno"
                value={formData.Correo_interno}
                onChange={handleChange}
                placeholder="correo1@dominio.com,correo2@dominio.com"
                rows={2}
                style={{ marginTop: 6, resize: 'vertical', fontSize: 12 }}
              />
              <span className="cr-inst-field-hint">Separados por coma</span>
            </div>

            <div className="cr-inst-field">
              <label>Correo Interno Paquetes</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '8px 10px', border: '1px solid var(--tm-border)', borderRadius: 8, background: 'var(--tm-surface)', minHeight: 44 }}>
                {formData.Correo_interno_paquetes.split(',').map(c => c.trim()).filter(Boolean).map((correo, i) => (
                  <span key={i} style={{ background: '#fff0f6', color: '#e1306c', border: '1px solid #f5b8d0', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap' }}>
                    {correo}
                  </span>
                ))}
              </div>
              <textarea
                name="Correo_interno_paquetes"
                value={formData.Correo_interno_paquetes}
                onChange={handleChange}
                placeholder="correo1@dominio.com,correo2@dominio.com"
                rows={2}
                style={{ marginTop: 6, resize: 'vertical', fontSize: 12 }}
              />
              <span className="cr-inst-field-hint">Separados por coma</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sección: Redes Sociales ── */}
      <div className="cr-inst-section">
        <div className="cr-inst-section-header">
          <h3>🌐 Redes Sociales Disponibles</h3>
          <span className="cr-inst-section-badge">{formData.redesSeleccionadas.length} seleccionadas</span>
        </div>
        <div className="cr-inst-section-body">
          <div className="cr-inst-redes-grid">
            {REDES_SOCIALES.map(red => (
              <div
                key={red.id}
                className={`cr-inst-red-card ${formData.redesSeleccionadas.includes(red.id) ? 'active' : ''}`}
                onClick={() => toggleRed(red.id)}
              >
                <div className="cr-inst-red-icon" style={{ background: red.color + '20' }}>
                  <img src={red.icono} alt={red.nombre} />
                </div>
                <div className="cr-inst-red-info">
                  <div className="cr-inst-red-name">{red.nombre}</div>
                  <div className="cr-inst-red-id">ID: {red.id}</div>
                </div>
                <div className="cr-inst-checkbox">
                  {formData.redesSeleccionadas.includes(red.id) && '✓'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      </div>{/* Cierre del grid de 2 columnas */}

      {/* ── Preview SQL (ancho completo) ── */}
      {showPreview && (
        <div className="cr-inst-section cr-inst-section-full">
          <div className="cr-inst-preview">
            <div className="cr-inst-preview-header">
              <span className="cr-inst-preview-title">📝 Vista Previa del SQL</span>
              <div className="cr-inst-preview-actions">
                <button
                  className="cr-inst-btn cr-inst-btn-secondary cr-inst-btn-sm"
                  onClick={handleCopiarSQL}
                  disabled={probandoSQL}
                >
                  Copiar SQL
                </button>
                <button
                  className="cr-inst-btn cr-inst-btn-primary cr-inst-btn-sm"
                  onClick={handleProbarSQL}
                  disabled={probandoSQL}
                >
                  {probandoSQL ? 'Probando...' : 'Probar ejecución'}
                </button>
                <button
                  className="cr-inst-btn cr-inst-btn-secondary cr-inst-btn-sm"
                  onClick={() => setShowPreview(false)}
                  disabled={probandoSQL}
                >
                  Cerrar
                </button>
              </div>
            </div>
            {resultadoPruebaSQL && (
              <div className={`cr-inst-sql-test ${resultadoPruebaSQL.success ? 'success' : 'error'}`}>
                <strong>
                  {resultadoPruebaSQL.success ? '✅ Prueba exitosa con ROLLBACK' : '❌ Prueba fallida con ROLLBACK'}
                </strong>
                <span>{resultadoPruebaSQL.mensaje || resultadoPruebaSQL.error}</span>
                {resultadoPruebaSQL.details && <code>{resultadoPruebaSQL.details}</code>}
                {resultadoPruebaSQL.sqlMessage && <code>{resultadoPruebaSQL.sqlMessage}</code>}
                {resultadoPruebaSQL.success && (
                  <span>
                    Empresa simulada: {resultadoPruebaSQL.idEmpresaSimulado || 'N/A'} · Bot simulado: {resultadoPruebaSQL.idBotSimulado || 'N/A'} · Duración: {resultadoPruebaSQL.duracionMs}ms
                  </span>
                )}
              </div>
            )}
            <div className="cr-inst-preview-body">
              <pre dangerouslySetInnerHTML={{ __html: resaltarSQL(sqlPreview) }} />
            </div>
          </div>
        </div>
      )}

      {/* ── Resultado (ancho completo) ── */}
      {resultado && (
        <div className={`cr-inst-result cr-inst-section-full ${resultado.success ? '' : 'error'}`}>
          <h4>
            {resultado.success ? '✅ Creación Exitosa' : '❌ Error en la Creación'}
          </h4>
          <div className="cr-inst-result-content">
            {resultado.success ? (
              <>
                <p><strong>ID Empresa:</strong> {resultado.idEmpresa}</p>
                <p><strong>ID Bot:</strong> {resultado.idBot}</p>
                <p><strong>Usuario Root:</strong> {resultado.usuarioRoot}</p>
                <p><strong>Contraseña:</strong> Empresa1234</p>
              </>
            ) : (
              <p>{resultado.error}</p>
            )}
          </div>
        </div>
      )}

      {/* ── Loading (ancho completo) ── */}
      {loading && (
        <div className="cr-inst-loading cr-inst-section-full">
          <div className="cr-inst-spinner"></div>
          <span className="cr-inst-loading-text">Creando empresa, por favor espere...</span>
        </div>
      )}

      <ConfirmModal
        show={showGuardarPlantillaModal}
        title="Guardar Plantilla SQL"
        confirmText="Guardar"
        cancelText="Cancelar"
        confirmVariant="primary"
        onConfirm={confirmGuardarPlantilla}
        onCancel={() => setShowGuardarPlantillaModal(false)}
      >
        <p>¿Desea reemplazar la plantilla SQL local con el contenido pegado?</p>
        <p style={{ marginTop: '8px', fontSize: '13px' }}>Se creará un respaldo .bak.</p>
      </ConfirmModal>

      <ConfirmModal
        show={showResetModal}
        title="Limpiar Campos"
        confirmText="Limpiar"
        cancelText="Cancelar"
        confirmVariant="danger"
        onConfirm={confirmReset}
        onCancel={() => setShowResetModal(false)}
      >
        <p>¿Está seguro de limpiar todos los campos?</p>
      </ConfirmModal>
    </div>
  );
}

export default CreacionInstancia;
