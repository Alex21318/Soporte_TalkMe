/**
 * ============================================
 * MÓDULO DE CREACIONES
 * ============================================
 * Endpoints para creación de empresas y configuración
 */

const express = require('express');
const router = express.Router();
const dbPools = require('../../../../db');
const fs = require('fs/promises');
const path = require('path');
const { authMiddleware } = require('../../../../auth');

let poolControl = null;
let registrarAuditoria = null;

const instruccionesBloqueadasScript = /\b(DROP|TRUNCATE|ALTER\s+DATABASE|CREATE\s+DATABASE|USE\s+|GRANT|REVOKE)\b/i;
const plantillaSqlPath = path.join(process.cwd(), 'src', 'pages', 'Creaciones', 'Creacion_nueva_instancia.sql');

// Inicializar con referencias necesarias
function init(pool, auditoriaFn) {
  poolControl = pool;
  registrarAuditoria = auditoriaFn;
}

// Obtener el pool correspondiente al dbKey
function getPool(dbKey) {
  const pool = dbPools[dbKey];
  if (!pool) {
    throw new Error(`Pool de base de datos ${dbKey} no encontrado`);
  }
  return pool;
}

router.post('/api/creaciones/instancia/probar-sql', async (req, res) => {
  const { dbKey = 'db_1', sqlScript } = req.body;

  const dbNombreMap = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2',
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
  };

  if (!dbNombreMap[dbKey]) {
    return res.status(400).json({ error: `Base de datos no válida: ${dbKey}` });
  }

  if (!sqlScript || typeof sqlScript !== 'string') {
    return res.status(400).json({ error: 'Debe enviar un script SQL para probar' });
  }

  if (instruccionesBloqueadasScript.test(sqlScript)) {
    return res.status(400).json({
      error: 'El script SQL contiene instrucciones no permitidas para prueba',
    });
  }

  let connection = null;
  const inicio = Date.now();

  try {
    const targetPool = getPool(dbKey);
    connection = await targetPool.getConnection();
    await connection.beginTransaction();
    await connection.query(sqlScript);

    const [idsRows] = await connection.query(
      'SELECT @EmpresaID AS idEmpresa, @BotID AS idBot, @UsuarioNombre AS usuarioRoot'
    );

    await connection.rollback();

    return res.json({
      success: true,
      modo: 'SIMULACION_ROLLBACK',
      dbKey,
      dbNombre: dbNombreMap[dbKey],
      duracionMs: Date.now() - inicio,
      idEmpresaSimulado: idsRows?.[0]?.idEmpresa || null,
      idBotSimulado: idsRows?.[0]?.idBot || null,
      usuarioRootSimulado: idsRows?.[0]?.usuarioRoot || null,
      mensaje: 'Prueba ejecutada correctamente. Se realizó ROLLBACK, no se guardaron cambios.',
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    return res.status(500).json({
      success: false,
      modo: 'SIMULACION_ROLLBACK',
      dbKey,
      dbNombre: dbNombreMap[dbKey],
      duracionMs: Date.now() - inicio,
      error: 'La prueba SQL falló. Se realizó ROLLBACK.',
      details: error.message,
      sqlState: error.sqlState,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

router.get('/api/creaciones/plantilla-sql', async (req, res) => {
  try {
    const contenido = await fs.readFile(plantillaSqlPath, 'utf8');
    const stats = await fs.stat(plantillaSqlPath);

    res.json({
      success: true,
      contenido,
      ruta: plantillaSqlPath,
      actualizadoEl: stats.mtime,
      bytes: stats.size,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'No se pudo leer la plantilla SQL',
      details: error.message,
    });
  }
});

router.post('/api/creaciones/plantilla-sql', async (req, res) => {
  const { contenido } = req.body;

  if (!contenido || typeof contenido !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Debe enviar el contenido SQL de la plantilla',
    });
  }

  const variablesRequeridas = ['EmpresaNombre', 'NombreBOT', 'EmpresaID', 'BotID', 'tokenEmpresa', 'socketUrl', 'URLEnvioNotificaciones'];
  const variablesFaltantes = variablesRequeridas.filter(variable => !contenido.includes(`@${variable}`));

  if (variablesFaltantes.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'La plantilla SQL no contiene todas las variables requeridas',
      variablesFaltantes,
    });
  }

  try {
    const respaldoPath = `${plantillaSqlPath}.bak`;
    const contenidoActual = await fs.readFile(plantillaSqlPath, 'utf8');
    await fs.writeFile(respaldoPath, contenidoActual, 'utf8');
    await fs.writeFile(plantillaSqlPath, contenido, 'utf8');

    const stats = await fs.stat(plantillaSqlPath);

    res.json({
      success: true,
      mensaje: 'Plantilla SQL actualizada correctamente',
      ruta: plantillaSqlPath,
      respaldo: respaldoPath,
      actualizadoEl: stats.mtime,
      bytes: stats.size,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'No se pudo guardar la plantilla SQL',
      details: error.message,
    });
  }
});

/**
 * POST /api/creaciones/instancia
 * Crea una nueva empresa con toda la configuración inicial
 */
router.post('/api/creaciones/instancia', authMiddleware, async (req, res) => {
  if (!poolControl) {
    return res.status(500).json({ error: 'Pool de base de datos no inicializado' });
  }

  // Extraer usuario del token JWT
  const creadoPor = req.user?.usuario || 'sistema';

  const {
    dbKey = 'db_1', // Base de datos destino
    EmpresaNombre,
    NombreBOT,
    EmpresaTelefono = 'NA',
    EmpresaCorreo = 'NA',
    EmpresaDireccion = 'NA',
    socketUrl = 'https://cloud-s4.talkme.pro',
    URLEnvioNotificaciones = 'https://cloud-s4.consystec-corp.com',
    tokenEmpresa,
    tokenConsystec = 'token_consystec',
    fechaInicioPaquete,
    fechaFinPaquete,
    nombreContacto,
    telefonoContacto,
    TELEFONO_WHATSAPP_WEBCHAT,
    Moneda = 'Q',
    CodMoneda = 'GTQ',
    idPais = '1',
    FOLDER_FILES,
    Correo_cliente,
    Correo_interno = 'ventas@consystec-corp.com,vinicio.sanchez@consystec-corp.com',
    Correo_interno_paquetes = 'ventas@consystec-corp.com,soporte.talkme@consystec-corp.com',
    redesSeleccionadas = ['1'], // WhatsApp por defecto
    sqlScript,
  } = req.body;

  // Validar dbKey (solo Talkme S1-S4 y MDD, no Ficohsa)
  const dbNombreMap = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2',
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
  };
  
  if (!dbNombreMap[dbKey]) {
    return res.status(400).json({
      error: `Base de datos no permitida para creación: ${dbKey}`,
      permitidas: Object.keys(dbNombreMap),
    });
  }
  
  const dbNombre = dbNombreMap[dbKey];

  // Validaciones
  if (!EmpresaNombre || !NombreBOT || !tokenEmpresa) {
    return res.status(400).json({
      error: 'Campos requeridos: EmpresaNombre, NombreBOT, tokenEmpresa',
    });
  }

  if (!redesSeleccionadas || redesSeleccionadas.length === 0) {
    return res.status(400).json({
      error: 'Debe seleccionar al menos una red social',
    });
  }

  if (sqlScript) {
    if (instruccionesBloqueadasScript.test(sqlScript)) {
      return res.status(400).json({
        error: 'El script SQL contiene instrucciones no permitidas para creación de instancia',
      });
    }

    let scriptConnection = null;
    try {
      const targetPool = getPool(dbKey);
      scriptConnection = await targetPool.getConnection();
      await scriptConnection.beginTransaction();
      await scriptConnection.query(sqlScript);

      const [idsRows] = await scriptConnection.query(
        'SELECT @EmpresaID AS idEmpresa, @BotID AS idBot, @UsuarioNombre AS usuarioRoot'
      );
      const idEmpresa = idsRows?.[0]?.idEmpresa || null;
      const idBot = idsRows?.[0]?.idBot || null;
      const usuarioRoot = idsRows?.[0]?.usuarioRoot || `ROOT_${EmpresaNombre.replace(/\s+/g, '')}`;

      await scriptConnection.commit();

      if (registrarAuditoria) {
        await registrarAuditoria({
          tipo_accion: 'CREACION_INSTANCIA',
          entidad: 'EMPRESA',
          db_key: dbKey,
          id_entidad: idEmpresa,
          db_nombre: dbNombre,
          metadata: {
            empresa_nombre: EmpresaNombre,
            bot_nombre: NombreBOT,
            id_empresa: idEmpresa,
            id_bot: idBot,
            usuario_root: usuarioRoot,
            redes_sociales: redesSeleccionadas,
            db_key: dbKey,
            db_nombre: dbNombre,
            modo_ejecucion: 'SQL_TEMPLATE',
          },
          descripcion: `CREACION_INSTANCIA [${dbNombre}]: Empresa "${EmpresaNombre}" creada por script SQL completo. ID Empresa: ${idEmpresa}, ID Bot: ${idBot}, Usuario Root: ${usuarioRoot}`,
          exito: true,
        });
      }

      return res.json({
        success: true,
        idEmpresa,
        idBot,
        usuarioRoot,
        dbKey,
        dbNombre,
        mensaje: `Empresa creada exitosamente en ${dbNombre}`,
        redesCreadas: redesSeleccionadas.length,
      });
    } catch (error) {
      if (scriptConnection) {
        await scriptConnection.rollback();
      }

      if (registrarAuditoria) {
        await registrarAuditoria({
          tipo_accion: 'CREACION_INSTANCIA',
          entidad: 'EMPRESA',
          db_key: dbKey,
          db_nombre: dbNombre,
          metadata: { error: error.message, empresa_nombre: EmpresaNombre, db_key: dbKey, db_nombre: dbNombre, modo_ejecucion: 'SQL_TEMPLATE' },
          descripcion: `CREACION_INSTANCIA FALLIDA [${dbNombre}]: Error al ejecutar script SQL completo para empresa "${EmpresaNombre}": ${error.message}`,
          exito: false,
          mensaje_error: error.message,
        });
      }

      return res.status(500).json({
        error: 'Error al ejecutar el script SQL de creación',
        details: error.message,
      });
    } finally {
      if (scriptConnection) {
        scriptConnection.release();
      }
    }
  }

  let connection = null;
  let targetPool;
  try {
    targetPool = getPool(dbKey);
    connection = await targetPool.getConnection();

    // Iniciar transacción
    await connection.beginTransaction();

    // ========================================
    // 1. INSERTAR EMPRESA
    // ========================================
    const [empresaResult] = await connection.query(
      `INSERT INTO EMPRESAS (NOMBRE, TELEFONO, EMAIL, DIRECCION, TIPO_CLIENTE, CREADO_POR, ID_PAIS)
       VALUES (?, ?, ?, ?, 1, ?, ?)`,
      [EmpresaNombre, EmpresaTelefono, EmpresaCorreo, EmpresaDireccion, creadoPor, idPais]
    );
    const idEmpresa = empresaResult.insertId;

    // ========================================
    // 2. INSERTAR BOT
    // ========================================
    const [botResult] = await connection.query(
      `INSERT INTO BOT (DESCRIPCION, ID_EMPRESA, ESTADO, MODO_NAVEGACION, TIPO_CLIENTE, CREADO_EL, CREADO_POR, NIVEL_EXTENDIDO, ID_FORMATO_MP, MONEDA, COD_MONEDA)
       VALUES (?, ?, 1, 1, 1, NOW(), ?, 1, 2, ?, ?)`,
      [NombreBOT, idEmpresa, creadoPor, Moneda, CodMoneda]
    );
    const idBot = botResult.insertId;

    // ========================================
    // 3. INSERTAR HORARIO DEL BOT
    // ========================================
    await connection.query(
      `INSERT INTO HORARIO_BOT (ID_BOT, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
       VALUES (?, '06:00:00', '05:59:00', '1111111', NOW(), ?)`,
      [idBot, creadoPor]
    );

    // ========================================
    // 4. INSERTAR TIPO DE CLIENTE
    // ========================================
    await connection.query(
      `INSERT INTO TIPO_CLIENTE (ID_EMPRESA, NOMBRE_TIPO, ESTADO, SISTEMA, CREADO_POR)
       VALUES (?, 'Otro', 1, 1, ?)`,
      [idEmpresa, creadoPor]
    );

    // ========================================
    // 5. INSERTAR ESTADOS
    // ========================================
    const estados = [
      { nombre: 'ACTIVO', color: 'verde.png', orden: 1, pausa: 0, activo: 1, mostrar: 1 },
      { nombre: 'BOT', color: 'verde.png', orden: 3, pausa: 1, activo: 0, mostrar: 1 },
      { nombre: 'PAUSA', color: 'amarillo.png', orden: 4, pausa: 1, activo: 0, mostrar: 1 },
      { nombre: 'INACTIVO', color: 'rojo.png', orden: 20, pausa: 1, activo: 0, mostrar: 1 },
      { nombre: 'AUSENTE', color: 'rojo.png', orden: 21, pausa: 1, activo: 0, mostrar: 1 },
    ];

    for (const estado of estados) {
      await connection.query(
        `INSERT INTO ESTADOS (ID_EMPRESA, NOMBRE, COLOR_PATH, ORDEN, ESTADO, PAUSA, ELIMINADO, SISTEMA, ACTIVO, MOSTRAR, CREADO_POR)
         VALUES (?, ?, ?, ?, 1, ?, 0, 1, ?, ?, ?)`,
        [idEmpresa, estado.nombre, estado.color, estado.orden, estado.pausa, estado.activo, estado.mostrar, creadoPor]
      );
    }

    // ========================================
    // 6. INSERTAR TIPOS DE GESTIÓN
    // ========================================
    const tiposGestion = [
      'Consultas',
      'Derivacion Bot a Asesor',
      'Derivacion Asesor a Bot',
      'Compra realizada exitosamente',
      'Cierre por inactividad de cliente con Bot',
      'Derivacion De Conversacion a Otro Skill',
      'Cierre por solicitud de orden de pedido',
      'Solicitud de Contacto',
      'Operadores no Disponibles',
      'Fuera de Horario',
      'Caso Finalizado',
      'Cierre de conversación por inactividad del cliente con el operador',
      'Notificaciones',
      'Cierre por rechazo de contacto de Facebook',
      'Inactividad del cliente mayor a 24 horas.',
      'Inactividad del cliente mayor a 7 días.',
      'Sesión Expirada',
      'Términos y condiciones rechazados por el cliente',
      'Conversación Finalizada Contacto',
    ];

    const idsGestion = {};
    for (const gestion of tiposGestion) {
      const [result] = await connection.query(
        `INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE, CREADO_EL)
         VALUES (?, ?, 1, 0, ?, ?, NOW())`,
        [idEmpresa, gestion, creadoPor, ['Consultas', 'Conversación Finalizada Contacto'].includes(gestion) ? 1 : 0]
      );
      idsGestion[gestion] = result.insertId;
    }

    // ========================================
    // 7. INSERTAR SKILL DE SISTEMA
    // ========================================
    const [skillResult] = await connection.query(
      `INSERT INTO SKILLS (ID_EMPRESA, NOMBRE_SKILL, ESTADO, ORDEN, ELIMINADO, SISTEMA, VISIBLE, CREADO_POR, MENSAJE)
       VALUES (?, 'Atención General', 1, 0, 0, 1, 1, ?, 'Lo sentimos nos encontramos fuera de horario. Por favor intente de nuevo en horario hábil de oficina.')`,
      [idEmpresa, creadoPor]
    );
    const idSkill = skillResult.insertId;

    // ========================================
    // 8. INSERTAR HORARIOS DEL SKILL
    // ========================================
    const horariosSkill = [
      { desde: '14:00:00', hasta: '00:00:00', dias: '1111100' },
      { desde: '14:00:00', hasta: '23:00:00', dias: '0000010' },
      { desde: '14:00:00', hasta: '20:00:00', dias: '0000001' },
    ];

    for (const horario of horariosSkill) {
      await connection.query(
        `INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
         VALUES (?, ?, ?, ?, NOW(), ?)`,
        [idSkill, horario.desde, horario.hasta, horario.dias, creadoPor]
      );
    }

    // ========================================
    // 9. INSERTAR TIPOS DE RESOLUCIONES
    // ========================================
    const tiposResoluciones = [
      'Se solvento correctamente',
      'Conversación finalizada por solicitud de orden de pedido',
      'Webchat: Conversación finalizada por el cliente.',
      'Conversación finalizada por no tener operadores disponibles',
      'Conversación finalizada por horario inhabil',
      'Conversación finaliza por ausencia de operadores',
      'Conversación finaliza por caso cerrado',
      'Cierre de conversación por inactividad del cliente con el operador',
      'Cierre por conversación mayor a 24 horas, desde el último mensaje del cliente.',
      'Cierre por conversación mayor a 7 días, desde el último mensaje del cliente.',
      'Cierre de conversación por sesión expirada.',
      'Conversación Finalizada Contacto',
      'Cliente rechaza recontacto fuera de horario.',
    ];

    const idsResolucion = {};
    for (const resolucion of tiposResoluciones) {
      const [result] = await connection.query(
        `INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR, CREADO_EL)
         VALUES (?, ?, 1, 0, ?, ?, NOW())`,
        [idEmpresa, resolucion, resolucion.includes('Webchat') ? 1 : 0, creadoPor]
      );
      idsResolucion[resolucion] = result.insertId;
    }

    // ========================================
    // 10. INSERTAR ATRIBUTOS DE FICHA
    // ========================================
    const atributosFicha = [
      { nombre: 'Nombre completo', valor: 'Sin Nombre completo', tag: 'CF1', requerido: 1, visible: 1, orden: 1, sistema: 1 },
      { nombre: 'Departamento', valor: '460', tag: 'CF4', requerido: 1, visible: 1, orden: 2, sistema: 1 },
      { nombre: 'Municipio', valor: '8246', tag: 'CF5', requerido: 1, visible: 1, orden: 3, sistema: 1 },
      { nombre: 'Zona', valor: '8679', tag: 'CF6', requerido: 1, visible: 1, orden: 4, sistema: 1 },
      { nombre: 'Correo Electrónico', valor: 'Sin Correo Electrónico', tag: 'CF2', requerido: 0, visible: 1, orden: 6, sistema: 1 },
      { nombre: 'Teléfono contacto', valor: 'Sin Teléfono contacto', tag: 'CF3', requerido: 0, visible: 1, orden: 10, sistema: 1 },
      { nombre: 'Dirección', valor: 'Sin Dirección', tag: 'CF11', requerido: 1, visible: 1, orden: 11, sistema: 0 },
      { nombre: 'NIT', valor: 'Sin NIT', tag: 'CF10', requerido: 1, visible: 1, orden: 12, sistema: 0 },
      { nombre: 'Nombre Factura', valor: 'Sin Nombre Factura', tag: 'CF12', requerido: 1, visible: 1, orden: 13, sistema: 0 },
    ];

    for (const attr of atributosFicha) {
      await connection.query(
        `INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [attr.nombre, attr.valor, idEmpresa, attr.requerido, attr.visible, attr.orden, attr.sistema, attr.tag]
      );
    }

    // ========================================
    // 11. INSERTAR PARÁMETROS BÁSICOS
    // ========================================
    await insertarParametrosBasicos(connection, idEmpresa, idBot, NombreBOT, creadoPor, {
      idsGestion,
      idsResolucion,
      socketUrl,
      Correo_cliente,
      Correo_interno,
      Correo_interno_paquetes,
    });

    // ========================================
    // 12. CREAR USUARIO ROOT
    // ========================================
    const usuarioNombre = `ROOT_${EmpresaNombre.replace(/\s+/g, '')}`;
    const usuarioPass = '98ac632a44c85ce48a8e9d34da471796'; // Empresa1234 MD5

    const [usuarioResult] = await connection.query(
      `INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, CONTRASENA, CREADO_POR, TIPO_USUARIO, PRIMER_ACCESO, SEGUNDO_ACCESO, USUARIO_CSTK)
       VALUES (?, 'Administrador', ?, ?, 1, 0, ?, ?, 0, '1111111', '1', '1')`,
      [idEmpresa, `Sistema ${EmpresaNombre}`, usuarioNombre, usuarioPass, creadoPor]
    );
    const idUsuario = usuarioResult.insertId;

    // ========================================
    // 13. CREAR USUARIO BOT
    // ========================================
    const [botUserResult] = await connection.query(
      `INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, TIPO_USUARIO, CREADO_POR)
       VALUES (?, 'Bot', ?, ?, 0, 0, 1, ?)`,
      [idEmpresa, EmpresaNombre, `Bot_${EmpresaNombre.replace(/\s+/g, '_')}`, creadoPor]
    );
    const idUsuarioBot = botUserResult.insertId;

    // Insertar permisos de tipos de cliente para el bot
    await connection.query(
      `INSERT INTO PERMISOS_USUARIOS_CLIENTES (ID_USUARIO, ID_TIPO_CLIENTE, CREADO_EL, CREADO_POR)
       SELECT ?, ID_TIPO, NOW(), ? FROM TIPO_CLIENTE WHERE ID_EMPRESA = ?`,
      [idUsuarioBot, creadoPor, idEmpresa]
    );

    // Insertar estado BOT para el usuario bot
    const [estadoBot] = await connection.query(
      'SELECT ID_ESTADO FROM ESTADOS WHERE ID_EMPRESA = ? AND NOMBRE = ?',
      [idEmpresa, 'BOT']
    );
    if (estadoBot.length > 0) {
      await connection.query(
        `INSERT INTO ESTADOS_USUARIOS (ID_USUARIO, ID_ESTADO, HORA_INICIO)
         VALUES (?, ?, NOW())`,
        [idUsuarioBot, estadoBot[0].ID_ESTADO]
      );
    }

    // ========================================
    // 14. CREAR USUARIO BROADCAST
    // ========================================
    await connection.query(
      `INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, TIPO_USUARIO, CREADO_POR)
       VALUES (?, 'Usuario Broadcast', ?, ?, 0, 0, 2, ?)`,
      [idEmpresa, EmpresaNombre, `Broadcast.${EmpresaNombre.replace(/\s+/g, '.')}`, creadoPor]
    );

    // ========================================
    // 15. INSERTAR CONTACTO DE LA EMPRESA
    // ========================================
    if (nombreContacto) {
      await connection.query(
        `INSERT INTO CONTACTO_EMPRESA (ID_EMPRESA, NOMBRE, CORREO, TELEFONO, CREADO_EL, CREADO_POR)
         VALUES (?, ?, ?, ?, NOW(), ?)`,
        [idEmpresa, nombreContacto, Correo_cliente || `${nombreContacto.toLowerCase().replace(/\s+/g, '.')}@talkme.pro`, telefonoContacto || '', creadoPor]
      );
    }

    // ========================================
    // 16. CREAR BOT_REDES SEGÚN SELECCIÓN
    // ========================================
    const botRedesIds = {};
    for (const redId of redesSeleccionadas) {
      const [botRedResult] = await connection.query(
        `INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR)
         VALUES (?, ?, ?, '1', '1', NOW(), ?)`,
        [idBot, idPais, redId, creadoPor]
      );
      botRedesIds[redId] = botRedResult.insertId;

      // Insertar también en BOT_REDES_BETA
      await connection.query(
        `INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR)
         VALUES (?, ?, ?, '1', NOW(), ?)`,
        [idBot, idPais, redId, creadoPor]
      );
    }

    // ========================================
    // 17. INSERTAR ACUMULADOR
    // ========================================
    if (fechaInicioPaquete && fechaFinPaquete) {
      await connection.query(
        `INSERT INTO ACUMULADOR (ID_PAQUETE, ID_EMPRESA, HITS_INICIAL, HITS_CONSUMIDOS, HITS_DISPONIBLES, HITS_EXCEDENTES, PRIORIDAD, CREADO_EL, FECHA_INICIO, FECHA_FIN)
         VALUES (304, ?, 100, 0, 100, 0, 1, NOW(), ?, ?)`,
        [idEmpresa, fechaInicioPaquete, fechaFinPaquete]
      );

      await connection.query(
        `INSERT INTO ACUMULADOR (ID_PAQUETE, ID_EMPRESA, HITS_INICIAL, HITS_CONSUMIDOS, HITS_DISPONIBLES, HITS_EXCEDENTES, PRIORIDAD, CREADO_EL, FECHA_INICIO, FECHA_FIN)
         VALUES (345, ?, 0, 0, 0, 0, '1', NOW(), ?, ?)`,
        [idEmpresa, fechaInicioPaquete, fechaFinPaquete]
      );

      // INSERTAR PAQUETE_PROVISION
      await connection.query(
        `INSERT INTO PAQUETE_PROVISION (ID_PAQUETE, ID_EMPRESA, ID_PAIS, CREADO_EL, CREADO_POR, FECHA_INICIO_VIGENCIA, FECHA_FIN_VIGENCIA)
         VALUES (304, ?, ?, NOW(), ?, ?, '3000-12-31 05:59:59')`,
        [idEmpresa, idPais, creadoPor, fechaInicioPaquete]
      );

      await connection.query(
        `INSERT INTO PAQUETE_PROVISION (ID_PAQUETE, ID_EMPRESA, ID_PAIS, CREADO_EL, CREADO_POR, FECHA_INICIO_VIGENCIA, FECHA_FIN_VIGENCIA)
         VALUES (345, ?, ?, NOW(), ?, ?, '3000-12-31 05:59:59')`,
        [idEmpresa, idPais, creadoPor, fechaInicioPaquete]
      );
    }

    // ========================================
    // 18. ACTUALIZAR EMPRESA CON TOKENS
    // ========================================
    await connection.query(
      `UPDATE EMPRESAS
       SET API_TOKEN = ?,
           TOKEN_NOTIFICADOR_SMS = 'el1qMpSFvIY:APA91bFx7MatRE__fiG6eFZSxeG-jd6BMXgAPNIZ2OKRpB8Edx0hO2QmbB4OAqyakbc0jvwiyIHIiDZ_bCMCujJv6u47RczsRIstraRZtK826MOAseepuXwBJ5wT_izE_iJQwhM5Ex6m'
       WHERE ID_EMPRESA = ?`,
      [tokenEmpresa, idEmpresa]
    );

    // ========================================
    // 19. INSERTAR BOT_RED_CONF_VALORES PARA WHATSAPP
    // ========================================
    if (botRedesIds['1'] && TELEFONO_WHATSAPP_WEBCHAT) {
      // Configuración 1: Teléfono WhatsApp
      await connection.query(
        `INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)
         VALUES (?, '1', ?, NOW(), ?)`,
        [botRedesIds['1'], TELEFONO_WHATSAPP_WEBCHAT, creadoPor]
      );

      // Configuración 4: Socket URL
      await connection.query(
        `INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)
         VALUES (?, '4', ?, NOW(), ?)`,
        [botRedesIds['1'], socketUrl, creadoPor]
      );
    }

    // ========================================
    // 20. ACTUALIZAR BOT_TEST
    // ========================================
    await connection.query(
      `UPDATE BOT SET ID_BOT_TEST = CONCAT('-', ?) WHERE ID_BOT = ?`,
      [idBot, idBot]
    );

    // ========================================
    // 21. INSERTAR PARÁMETROS ADICIONALES
    // ========================================
    await insertarParametrosAdicionales(connection, idEmpresa, idBot, NombreBOT, creadoPor, {
      idsGestion,
      idsResolucion,
      idSkill,
      socketUrl,
    });

    // ========================================
    // 22. TIPO GESTIÓN Y RESOLUCIÓN PARA CONTACTO AUTOMÁTICO
    // ========================================
    const [tipoGestionContacto] = await connection.query(
      `INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL)
       VALUES (?, 'Contacto Automático', 1, 0, ?, NOW())`,
      [idEmpresa, creadoPor]
    );

    const [tipoResolucionContacto] = await connection.query(
      `INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL)
       VALUES (?, 'Contacto Automático', 1, 0, ?, NOW())`,
      [idEmpresa, creadoPor]
    );

    // Insertar parámetros de contacto automático para cada bot
    const bots = await connection.query('SELECT ID_BOT, DESCRIPCION FROM BOT WHERE ID_EMPRESA = ? AND ESTADO = 1', [idEmpresa]);
    for (const bot of bots[0]) {
      const agrupacion = bot.DESCRIPCION.toUpperCase().replace(/_/g, ' ');

      await connection.query(
        `INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
         VALUES (?, 2, ?, ?, 'TIPO_GESTION_CONTACTO_AUTOMATICO', 'Contactos Automáticos: tipo de gestión que se asociará a las conversaciones cuando el contacto se cree finalizado.', ?, 1, 1, 1, 0, NOW(), ?)`,
        [idEmpresa, bot.ID_BOT, agrupacion, tipoGestionContacto.insertId, creadoPor]
      );

      await connection.query(
        `INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
         VALUES (?, 2, ?, ?, 'TIPO_RESOLUCION_CONTACTO_AUTOMATICO', 'Contactos Automáticos: tipo de resolución que se asociará a las conversaciones cuando el contacto se cree finalizado.', ?, 1, 1, 1, 0, NOW(), ?)`,
        [idEmpresa, bot.ID_BOT, agrupacion, tipoResolucionContacto.insertId, creadoPor]
      );

      await connection.query(
        `INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
         VALUES (?, 7, ?, ?, 'RESOLUCION_CONTACTO_AUTOMATICO', 'Contactos Automáticos: resolución que se asociará a las conversaciones cuando el contacto se cree finalizado.', 'Conversación finalizada, contacto automático.', 1, 1, 1, 0, NOW(), ?)`,
        [idEmpresa, bot.ID_BOT, agrupacion, creadoPor]
      );
    }

    // ========================================
    // 23. CREAR USUARIO NOTIFICACIONES
    // ========================================
    const [notifUserResult] = await connection.query(
      `INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, TIPO_USUARIO, CREADO_EL, CREADO_POR)
       SELECT ?, 'Notificacion', 'Seguimiento Programado', CONCAT('notificaciones.', REPLACE(LOWER(NOMBRE), ' ', '.')), 1, 0, 5, NOW(), 'Sistema.Talkme'
       FROM EMPRESAS WHERE ID_EMPRESA = ?`,
      [idEmpresa, idEmpresa]
    );
    const idUsuarioNotif = notifUserResult.insertId;

    // Asignar estado BOT al usuario de notificaciones
    if (estadoBot.length > 0) {
      await connection.query(
        `INSERT INTO ESTADOS_USUARIOS (ID_USUARIO, ID_ESTADO, HORA_INICIO, MOVIL)
         VALUES (?, ?, NOW(), 0)`,
        [idUsuarioNotif, estadoBot[0].ID_ESTADO]
      );
    }

    // ========================================
    // 24. TIPO GESTIÓN Y RESOLUCIÓN PARA FLOWS
    // ========================================
    await connection.query(
      `INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, NOTIFICAR_CRM, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR, NIVEL_VISIBLE)
       VALUES (?, 'Flow', 0, 1, 0, 1, NOW(), ?, 1)`,
      [idEmpresa, creadoPor]
    );

    await connection.query(
      `INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, NOTIFICAR_CRM, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL, VISIBLE, NIVEL_VISIBLE)
       VALUES (?, 'Flow', 0, 1, 0, ?, NOW(), 1, 1)`,
      [idEmpresa, creadoPor]
    );

    // ========================================
    // COMMIT DE LA TRANSACCIÓN
    // ========================================
    await connection.commit();

    // Registrar auditoría
    if (registrarAuditoria) {
      await registrarAuditoria({
        tipo_accion: 'CREACION_INSTANCIA',
        entidad: 'EMPRESA',
        db_key: dbKey,
        id_entidad: idEmpresa,
        db_nombre: dbNombre,
        metadata: {
          empresa_nombre: EmpresaNombre,
          bot_nombre: NombreBOT,
          id_empresa: idEmpresa,
          id_bot: idBot,
          usuario_root: usuarioNombre,
          redes_sociales: redesSeleccionadas,
          db_key: dbKey,
          db_nombre: dbNombre,
        },
        descripcion: `CREACION_INSTANCIA [${dbNombre}]: Empresa "${EmpresaNombre}" creada exitosamente con BOT "${NombreBOT}". ID Empresa: ${idEmpresa}, ID Bot: ${idBot}, Usuario Root: ${usuarioNombre}`,
        exito: true,
      });
    }

    res.json({
      success: true,
      idEmpresa,
      idBot,
      usuarioRoot: usuarioNombre,
      dbKey,
      dbNombre,
      mensaje: `Empresa creada exitosamente en ${dbNombre}`,
      redesCreadas: redesSeleccionadas.length,
    });

  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    // Registrar error en auditoría
    if (registrarAuditoria) {
      await registrarAuditoria({
        tipo_accion: 'CREACION_INSTANCIA',
        entidad: 'EMPRESA',
        db_key: dbKey,
        db_nombre: dbNombre,
        metadata: { error: error.message, empresa_nombre: EmpresaNombre, db_key: dbKey, db_nombre: dbNombre },
        descripcion: `CREACION_INSTANCIA FALLIDA [${dbNombre}]: Error al crear empresa "${EmpresaNombre}": ${error.message}`,
        exito: false,
        mensaje_error: error.message,
      });
    }

    res.status(500).json({
      error: 'Error al crear la instancia',
      details: error.message,
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

/**
 * Insertar parámetros básicos de la empresa
 */
async function insertarParametrosBasicos(connection, idEmpresa, idBot, nombreBot, creadoPor, config) {
  const parametrosBasicos = [
    // Grupo ALERTAS
    { regex: 1, agrup: 'ALERTAS', nombre: 'ALERTAR_EN_AMARILLO', desc: 'Alerta amarilla: Active esta opción si desea recibir una notificacion cuando se alcance el limite de cola en amarillo.', val: '5', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'LIMITE_COLA_AMARILLO', desc: 'Cola en amarillo: Cantidad de conversaciones en cola (nuevas) que disparara alerta amarilla.', val: '5', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 1, agrup: 'ALERTAS', nombre: 'ALERTAR_EN_ROJO', desc: 'Alerta rojo: Active esta opción si desea recibir una notificacion cuando se alcance el limite de cola en rojo.', val: '10', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'LIMITE_COLA_ROJO', desc: 'Cola en rojo: Cantidad de conversaciones en cola (nuevas) que disparara alerta roja.', val: '10', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 4, agrup: 'ALERTAS', nombre: 'CORREO_ALERTA', desc: 'Correo de alerta: Listado de correos de representantes del cliente (separados por coma) que recibiran las alertas.', val: config.Correo_cliente || 'NA', cstk: 1, vis: 1, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'INTERVALO_NOTIFICACION', desc: 'Intervalo de notificación: establece el tiempo en minutos para cada cuanto se notificara al cliente desde la ultima notificación.', val: '45', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 5, agrup: 'ALERTAS', nombre: 'HORARIO_NOTIFICACION', desc: 'Establece el horario de notificación de correos en formato de H-H(24h)', val: '8-17', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'PORCENTAJE_CONSUMO', desc: 'Porcentaje de consumo para iniciar la alerta', val: '80', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 1, agrup: 'ALERTAS', nombre: 'ACTIVAR_ALERTA_CONSUMO', desc: 'Alerta consumo: active esta opción si desea recibir una notificacion cuando se alcance el limite de consumo.', val: '1', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 4, agrup: 'ALERTAS', nombre: 'CORREO_ALERTA_INTERNO', desc: 'Correo de alerta: Listado de correos de CONSYSTEC (separados por coma) que recibiran las alertas.', val: config.Correo_interno, cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'LIMITE_INTERNO', desc: 'Limite interno: Cantidad de conversaciones en cola (nuevas) que se notificara a CONSYSTEC.', val: '60', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'INTERVALO_NOTIFICACION_INTERNO', desc: 'Intervalo de notificacion interno: establece el tiempo en minutos para cada cuanto se notificara.', val: '30', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 1, agrup: 'ALERTAS', nombre: 'ALERTAR_EN_INTERNO', desc: 'Alerta interna: Active esta opción si desea recibir una notificacion cuando se alcance el limite de interno.', val: '1', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 2, agrup: 'ALERTAS', nombre: 'PORCENTAJE_CONSUMO_INTERNO', desc: 'Porcentaje interno de consumo para iniciar la alerta', val: '80', cstk: 1, vis: 0, obl: 1, ord: 1 },
    { regex: 1, agrup: 'ALERTAS', nombre: 'ACTIVAR_ALERTA_CONSUMO_INTERNO', desc: 'Alerta de consumo interna: active esta opción si desea recibir una notificacion cuando se alcance el limite de consumo interno.', val: '1', cstk: 1, vis: 0, obl: 1, ord: 1 },
  ];

  for (const param of parametrosBasicos) {
    await connection.query(
      `INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idEmpresa, param.regex, param.agrup, param.nombre, param.desc, param.val, param.cstk, param.vis, param.obl, param.ord, creadoPor]
    );
  }
}

/**
 * Insertar parámetros adicionales del bot
 */
async function insertarParametrosAdicionales(connection, idEmpresa, idBot, nombreBot, creadoPor, config) {
  const agrupacion = nombreBot;
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

  // Parámetros del bot específicos
  const parametrosBot = [
    { id_bot: idBot, id_regex: 6, agrup: agrupacion, nombre: 'BOTS_WHATSAPP_RESUMEN_VENTA', desc: 'URL para finalizar la compra', val: `${config.socketUrl}/BotVentas/ResumenVenta.zul?confirma=@@Confirma&noventa=@@NoVenta&IdFicha=@@IdFicha&cIdEmpresa=@@IdEmpresa&cIdBotRedes=@@cIdBotRedes`, cstk: 0, vis: 1, obl: 1, ord: 0 },
    { id_bot: idBot, id_regex: 6, agrup: agrupacion, nombre: 'BOTS_WHATSAPP_FICHA_CLIENTE', desc: 'URL para ficha de cliente', val: `${config.socketUrl}/BotVentas/FichaCliente.zul?IdFicha=@@IdFicha&cIdEmpresa=@@IdEmpresa&noventa=@@NoVenta&confirma=@@Confirma&cIdBotRedes=@@cIdBotRedes`, cstk: 0, vis: 0, obl: 1, ord: 0 },
    { id_bot: idBot, id_regex: 1, agrup: agrupacion, nombre: 'BOT_ARBOL_ACTIVO', desc: 'Indica si el bot de arboles se encuentra activo', val: '1', cstk: 1, vis: 1, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 2, agrup: agrupacion, nombre: 'BOT_USUARIO_INICIA', desc: 'Indica que usuario debe iniciar las conversaciones: 1 - Asesores, 2 - Bot de Arboles, 3 - IA', val: '2', cstk: 1, vis: 1, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 1, agrup: agrupacion, nombre: 'BOT_IA_ACTIVO', desc: 'Indica si la inteligencia artificial se encuentra activa', val: '0', cstk: 1, vis: 1, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 2, agrup: agrupacion, nombre: 'TIPO_GESTION_1', desc: 'ID Tipo Gestion al finalizar una venta exitosa', val: config.idsGestion['Compra realizada exitosamente'] || 0, cstk: 1, vis: 0, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 2, agrup: agrupacion, nombre: 'TIPO_GESTION_2', desc: 'ID Tipo Gestion cuando una venta es cancelada por cierre desde la consola', val: config.idsGestion['Cierre por inactividad de cliente con Bot'] || 0, cstk: 1, vis: 0, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 2, agrup: agrupacion, nombre: 'TIPO_GESTION_3', desc: 'ID Tipo Gestion cuando la venta es cancelada por timeout', val: config.idsGestion['Cierre por inactividad de cliente con Bot'] || 0, cstk: 1, vis: 0, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 2, agrup: agrupacion, nombre: 'BOT_HORA_DEL', desc: 'Minutos para eliminar una venta', val: '1', cstk: 1, vis: 1, obl: 1, ord: 1 },
    { id_bot: idBot, id_regex: 2, agrup: agrupacion, nombre: 'BOT_HORA_DEL_WEB', desc: 'Minutos de expiracion de la venta en la pagina Web', val: '45', cstk: 1, vis: 0, obl: 1, ord: 1 },
  ];

  for (const param of parametrosBot) {
    await connection.query(
      `INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idEmpresa, param.id_bot, param.id_regex, param.agrup, param.nombre, param.desc, param.val, param.cstk, param.vis, param.obl, param.ord, creadoPor]
    );
  }

  // Parámetros a nivel de empresa
  const parametrosEmpresa = [
    { id_regex: 2, agrup: 'EMPRESA', nombre: 'LIMITE_CATALOGOS_DE_ARCHIVOS', desc: 'Indica la cantidad maxima de catalogos de archivos activos permitidos por empresa.', val: '15', cstk: 1, vis: 0 },
    { id_regex: 2, agrup: 'EMPRESA', nombre: 'LIMITE_ARCHIVOS_POR_CATALOGO', desc: 'Indica la cantidad maxima de archivos activos permitidos por cada catalogo de archivos.', val: '10', cstk: 1, vis: 0 },
    { id_regex: 2, agrup: 'EMPRESA', nombre: 'LIMITE_PESO_ARCHIVOS_POR_CATALOGO', desc: 'Indica la cantidad maxima de peso en megas permitidos por cada archivo de catalogo de archivos.', val: '5', cstk: 1, vis: 0 },
  ];

  for (const param of parametrosEmpresa) {
    await connection.query(
      `INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, CREADO_POR)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [idEmpresa, param.id_regex, param.agrup, param.nombre, param.desc, param.val, param.cstk, param.vis, creadoPor]
    );
  }
}

/**
 * GET /api/creaciones/paises?db_key=db_1
 * Obtiene la lista de países disponibles desde la base de datos seleccionada
 */
router.get('/api/creaciones/paises', async (req, res) => {
  // Obtener db_key de query params (igual que en reportes)
  const dbKey = req.query.db_key || 'db_1';
  
  // Validar que sea una BD válida (solo Talkme S1-MDD)
  const validDbs = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5'];
  if (!validDbs.includes(dbKey)) {
    return res.status(400).json({ 
      error: 'Base de datos no válida', 
      permitidas: validDbs 
    });
  }
  
  const poolPaises = dbPools[dbKey];
  if (!poolPaises) {
    return res.status(500).json({ error: `Pool de base de datos ${dbKey} no inicializado` });
  }

  try {
    const connection = await poolPaises.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT ID_PAIS, NOMBRE, COD_AREA, ESTADO, MONEDA, COD_MONEDA, ABREVIATURA
        FROM PAISES
        WHERE ESTADO = 1
        ORDER BY ID_PAIS
      `);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Creaciones] Error al obtener países:', error.message);
    res.status(500).json({ error: 'Error al obtener países', details: error.message });
  }
});

// ============================================================================
// HELPER: Ejecutar integración FACEBOOK / INSTAGRAM de forma IDEMPOTENTE
// Soporta 4 redes: facebook_mensajes, facebook_comentarios, instagram_mensajes, instagram_comentarios
// Cada red configura su propio set de BOT_RED_CONF_VALORES + tablas opcionales
// ============================================================================
async function ejecutarIntegracionFBIGIdempotente(connection, params) {
  const {
    idBot,                       // requerido para nombres de tabla
    creadoPor = 'sistema',
    redes = {},                  // { facebook_mensajes: {...}, facebook_comentarios: {...}, instagram_mensajes: {...}, instagram_comentarios: {...} }
    // Datos FB_INFOBOT (opcional, solo si se crean tablas FB)
    fbInfobot = null,            // { verifToken, pageAccessToken, appSecret, appId }
    // Datos IG_INFOBOT (opcional, solo si se crean tablas IG)
    igInfobot = null,            // { verifToken, appSecret, appId }
  } = params;

  const log = [];
  const resumen = { creados: 0, actualizados: 0, existentes: 0, sin_cambios: 0 };

  // ── Helper: upsert de BOT_RED_CONF_VALORES ─────────────────────────────
  const upsertConfig = async (idBotRedes, configId, valor, label) => {
    const [rows] = await connection.query(
      `SELECT VALOR FROM BOT_RED_CONF_VALORES WHERE ID_BOT_REDES = ? AND ID_BOT_RED_CONFIGURACION = ?`,
      [idBotRedes, configId]
    );
    if (rows.length > 0) {
      if (String(rows[0].VALOR) === String(valor)) {
        log.push({ tipo: 'config', accion: 'sin_cambios', detalle: `[${label}] BOT_RED_CONF_VALORES bot_redes=${idBotRedes} config=${configId}: valor ya correcto` });
        resumen.sin_cambios++;
      } else {
        await connection.query(
          `UPDATE BOT_RED_CONF_VALORES SET VALOR = ? WHERE ID_BOT_REDES = ? AND ID_BOT_RED_CONFIGURACION = ?`,
          [valor, idBotRedes, configId]
        );
        log.push({ tipo: 'config', accion: 'actualizado', detalle: `[${label}] BOT_RED_CONF_VALORES bot_redes=${idBotRedes} config=${configId}: "${rows[0].VALOR}" → "${valor}"` });
        resumen.actualizados++;
      }
    } else {
      await connection.query(
        `INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) VALUES (?, ?, ?, NOW(), ?)`,
        [idBotRedes, configId, valor, creadoPor]
      );
      log.push({ tipo: 'config', accion: 'creado', detalle: `[${label}] BOT_RED_CONF_VALORES bot_redes=${idBotRedes} config=${configId} creado: "${valor}"` });
      resumen.creados++;
    }
  };

  // ── FACEBOOK MENSAJES ────────────────────────────────────────────────────
  if (redes.facebook_mensajes) {
    const { idBotRedes, token, idPagina } = redes.facebook_mensajes;
    if (!idBotRedes || !token || !idPagina) throw new Error('facebook_mensajes: faltan idBotRedes, token o idPagina');
    await upsertConfig(idBotRedes, 6, token, 'FB Mensajes');
    await upsertConfig(idBotRedes, 3, idPagina, 'FB Mensajes');
  }

  // ── FACEBOOK COMENTARIOS ─────────────────────────────────────────────────
  if (redes.facebook_comentarios) {
    const { idBotRedes, token, idPagina } = redes.facebook_comentarios;
    if (!idBotRedes || !token || !idPagina) throw new Error('facebook_comentarios: faltan idBotRedes, token o idPagina');
    await upsertConfig(idBotRedes, 6, token, 'FB Comentarios');
    await upsertConfig(idBotRedes, 3, idPagina, 'FB Comentarios');
  }

  // ── INSTAGRAM MENSAJES ───────────────────────────────────────────────────
  if (redes.instagram_mensajes) {
    const { idBotRedes, token, idPaginaIG, cuentaIG } = redes.instagram_mensajes;
    if (!idBotRedes || !token || !idPaginaIG || !cuentaIG) throw new Error('instagram_mensajes: faltan idBotRedes, token, idPaginaIG o cuentaIG');
    await upsertConfig(idBotRedes, 6, token, 'IG Mensajes');
    await upsertConfig(idBotRedes, 11, idPaginaIG, 'IG Mensajes');
    await upsertConfig(idBotRedes, 7, cuentaIG, 'IG Mensajes');
  }

  // ── INSTAGRAM COMENTARIOS ────────────────────────────────────────────────
  if (redes.instagram_comentarios) {
    const { idBotRedes, token, idPaginaIG, cuentaIG } = redes.instagram_comentarios;
    if (!idBotRedes || !token || !idPaginaIG || !cuentaIG) throw new Error('instagram_comentarios: faltan idBotRedes, token, idPaginaIG o cuentaIG');
    await upsertConfig(idBotRedes, 6, token, 'IG Comentarios');
    await upsertConfig(idBotRedes, 11, idPaginaIG, 'IG Comentarios');
    await upsertConfig(idBotRedes, 7, cuentaIG, 'IG Comentarios');
  }

  // ── CREAR TABLAS FACEBOOK (FB_X_COMMENTS, FB_X_POSTS, FB_X_MESSAGES) ─────
  const tieneFB = redes.facebook_mensajes || redes.facebook_comentarios;
  if (tieneFB) {
    if (!idBot) throw new Error('idBot es requerido para crear tablas FB');

    const tablasFB = [
      {
        nombre: `FB_${idBot}_COMMENTS`,
        ddl: `CREATE TABLE facebook.FB_${idBot}_COMMENTS (
          ID bigint(11) NOT NULL AUTO_INCREMENT,
          COMMENT_ID varchar(255) NOT NULL,
          USER_ID varchar(255) NOT NULL,
          PRIMARY KEY (ID),
          UNIQUE INDEX (COMMENT_ID) USING BTREE
        )`,
      },
      {
        nombre: `FB_${idBot}_POSTS`,
        ddl: `CREATE TABLE facebook.FB_${idBot}_POSTS (
          ID bigint(11) NOT NULL AUTO_INCREMENT,
          POST_ID varchar(255) NOT NULL,
          POST_BODY LONGTEXT NOT NULL,
          PRIMARY KEY (ID),
          UNIQUE INDEX (POST_ID) USING BTREE
        )`,
      },
      {
        nombre: `FB_${idBot}_MESSAGES`,
        ddl: `CREATE TABLE facebook.FB_${idBot}_MESSAGES (
          MESSAGE_ID bigint(20) NOT NULL AUTO_INCREMENT,
          MID text NOT NULL,
          PSID text NOT NULL,
          MESSAGE_DIR enum('E','R','L') NOT NULL,
          MESSAGE_TYPE varchar(10) NOT NULL,
          ESTADO tinyint(4) NOT NULL,
          EXTERNAL_ID BIGINT NOT NULL,
          MESSAGE_DATE datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          MESSAGE_TEXT text,
          MEDIA_URL text,
          MEDIA_FILE_PATH text,
          PRIMARY KEY (MESSAGE_ID) USING BTREE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
        indices: [
          `ALTER TABLE facebook.FB_${idBot}_MESSAGES ADD INDEX \`FB_${idBot}_MESSAGES_IDX_EXTERNALID\`(EXTERNAL_ID)`,
          `ALTER TABLE facebook.FB_${idBot}_MESSAGES ADD INDEX \`FB_${idBot}_MESSAGES_IDX_MESSAGE_DATE\`(MESSAGE_DATE)`,
        ],
      },
    ];

    for (const t of tablasFB) {
      const [exists] = await connection.query(
        `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'facebook' AND TABLE_NAME = ?`,
        [t.nombre]
      );
      if (exists.length > 0) {
        log.push({ tipo: 'tabla', accion: 'ya_existia', detalle: `Tabla facebook.${t.nombre} ya existía (no se modificó)` });
        resumen.existentes++;
      } else {
        await connection.query(t.ddl);
        log.push({ tipo: 'tabla', accion: 'creada', detalle: `Tabla facebook.${t.nombre} creada` });
        resumen.creados++;
        if (t.indices) {
          for (const idx of t.indices) {
            try {
              await connection.query(idx);
              log.push({ tipo: 'tabla', accion: 'creado', detalle: `Índice creado en facebook.${t.nombre}` });
            } catch (e) {
              log.push({ tipo: 'tabla', accion: 'advertencia', detalle: `Índice falló en facebook.${t.nombre}: ${e.message}` });
            }
          }
        }
      }
    }

    // FB_INFOBOT (idempotente)
    if (fbInfobot) {
      const { verifToken, pageAccessToken, appSecret, appId } = fbInfobot;
      const [infoRows] = await connection.query(`SELECT ID FROM facebook.FB_INFOBOT WHERE ID = ?`, [idBot]);
      if (infoRows.length > 0) {
        await connection.query(
          `UPDATE facebook.FB_INFOBOT SET VERIF_TOKEN = ?, PAGE_ACCESS_TOKEN = ?, APP_SECRET = ?, APP_ID = ? WHERE ID = ?`,
          [verifToken, pageAccessToken, appSecret, appId, idBot]
        );
        log.push({ tipo: 'tabla', accion: 'actualizado', detalle: `facebook.FB_INFOBOT id=${idBot} actualizado` });
        resumen.actualizados++;
      } else {
        await connection.query(
          `INSERT INTO facebook.FB_INFOBOT (ID, VERIF_TOKEN, PAGE_ACCESS_TOKEN, APP_SECRET, APP_ID) VALUES (?, ?, ?, ?, ?)`,
          [idBot, verifToken, pageAccessToken, appSecret, appId]
        );
        log.push({ tipo: 'tabla', accion: 'creado', detalle: `facebook.FB_INFOBOT id=${idBot} insertado` });
        resumen.creados++;
      }
    }
  }

  // ── CREAR TABLAS INSTAGRAM (IG_X_MESSAGES) ───────────────────────────────
  const tieneIG = redes.instagram_mensajes || redes.instagram_comentarios;
  if (tieneIG) {
    if (!idBot) throw new Error('idBot es requerido para crear tablas IG');

    const tablaIG = `IG_${idBot}_MESSAGES`;
    const [existsIG] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'instagram' AND TABLE_NAME = ?`,
      [tablaIG]
    );
    if (existsIG.length > 0) {
      log.push({ tipo: 'tabla', accion: 'ya_existia', detalle: `Tabla instagram.${tablaIG} ya existía (no se modificó)` });
      resumen.existentes++;
    } else {
      await connection.query(`
        CREATE TABLE instagram.${tablaIG} (
          MESSAGE_ID bigint(20) NOT NULL AUTO_INCREMENT,
          MID text NOT NULL,
          PSID text NOT NULL,
          MESSAGE_DIR enum('E','R','L') NOT NULL,
          MESSAGE_TYPE varchar(10) NOT NULL,
          ESTADO tinyint(4) NOT NULL,
          EXTERNAL_ID BIGINT(11) NOT NULL,
          MESSAGE_DATE datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
          MESSAGE_TEXT text,
          MEDIA_URL text,
          MEDIA_FILE_PATH text,
          PRIMARY KEY (MESSAGE_ID) USING BTREE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
      log.push({ tipo: 'tabla', accion: 'creada', detalle: `Tabla instagram.${tablaIG} creada` });
      resumen.creados++;
    }

    // IG_INFOBOT (idempotente)
    if (igInfobot) {
      const { verifToken, appSecret, appId } = igInfobot;
      const [infoRows] = await connection.query(`SELECT ID FROM instagram.IG_INFOBOT WHERE ID = ?`, [idBot]);
      if (infoRows.length > 0) {
        await connection.query(
          `UPDATE instagram.IG_INFOBOT SET VERIF_TOKEN = ?, APP_SECRET = ?, APP_ID = ? WHERE ID = ?`,
          [verifToken, appSecret, appId, idBot]
        );
        log.push({ tipo: 'tabla', accion: 'actualizado', detalle: `instagram.IG_INFOBOT id=${idBot} actualizado` });
        resumen.actualizados++;
      } else {
        await connection.query(
          `INSERT INTO instagram.IG_INFOBOT (ID, VERIF_TOKEN, APP_SECRET, APP_ID) VALUES (?, ?, ?, ?)`,
          [idBot, verifToken, appSecret, appId]
        );
        log.push({ tipo: 'tabla', accion: 'creado', detalle: `instagram.IG_INFOBOT id=${idBot} insertado` });
        resumen.creados++;
      }
    }
  }

  return { log, resumen };
}

/**
 * POST /api/creaciones/facebook-instagram
 * Ejecuta integración Facebook/Instagram idempotente.
 * Body: { dbKey, params: { idBot, creadoPor, redes: {...}, fbInfobot?, igInfobot? }, probar?: bool }
 */
router.post('/api/creaciones/facebook-instagram', async (req, res) => {
  const { dbKey = 'db_1', params, probar = false } = req.body;

  const dbNombreMap = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2',
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
  };

  if (!dbNombreMap[dbKey]) {
    return res.status(400).json({ error: `Base de datos no válida: ${dbKey}` });
  }

  if (!params || typeof params !== 'object') {
    return res.status(400).json({ error: 'Debe enviar params con la estructura de integración FB/IG' });
  }

  if (!params.redes || Object.keys(params.redes).length === 0) {
    return res.status(400).json({ error: 'Debe seleccionar al menos una red (facebook_mensajes, facebook_comentarios, instagram_mensajes, instagram_comentarios)' });
  }

  let connection = null;
  const inicio = Date.now();
  const dbNombre = dbNombreMap[dbKey];

  try {
    const targetPool = getPool(dbKey);
    connection = await targetPool.getConnection();
    await connection.beginTransaction();

    const { log, resumen } = await ejecutarIntegracionFBIGIdempotente(connection, params);

    if (probar) {
      await connection.rollback();
    } else {
      await connection.commit();
    }

    // Auditoría sólo al confirmar
    if (!probar && registrarAuditoria) {
      const redesActivas = Object.keys(params.redes || {}).join(', ');
      await registrarAuditoria({
        tipo_accion: 'INTEGRACION_FB_IG',
        entidad: 'BOT_RED_CONF_VALORES',
        db_key: dbKey,
        db_nombre: dbNombre,
        metadata: { db_key: dbKey, db_nombre: dbNombre, resumen, redes: redesActivas, idBot: params.idBot },
        descripcion: `INTEGRACION_FB_IG [${dbNombre}] bot=${params.idBot} redes=[${redesActivas}]: ${resumen.creados} creados, ${resumen.actualizados} actualizados, ${resumen.existentes} ya existían, ${resumen.sin_cambios} sin cambios`,
        exito: true,
      });
    }

    return res.json({
      success: true,
      dbKey,
      dbNombre,
      duracionMs: Date.now() - inicio,
      mensaje: probar ? 'Prueba FB/IG exitosa (sin cambios guardados)' : 'Integración FB/IG ejecutada',
      log,
      resumen,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) { /* noop */ }
    }
    if (!probar && registrarAuditoria) {
      await registrarAuditoria({
        tipo_accion: 'INTEGRACION_FB_IG',
        entidad: 'BOT_RED_CONF_VALORES',
        db_key: dbKey,
        db_nombre: dbNombre,
        metadata: { error: error.message, db_key: dbKey, db_nombre: dbNombre },
        descripcion: `INTEGRACION_FB_IG FALLIDA [${dbNombre}]: ${error.message}`,
        exito: false,
        mensaje_error: error.message,
      });
    }
    return res.status(500).json({
      success: false,
      dbKey,
      dbNombre,
      duracionMs: Date.now() - inicio,
      error: 'Error al ejecutar la integración FB/IG',
      details: error.message,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    if (connection) connection.release();
  }
});

// ============================================================================
// HELPER: Ejecutar integración WhatsApp de forma IDEMPOTENTE
// Si los datos ya existen, hace UPDATE. Si no, hace INSERT.
// Si la tabla ya existe, lo registra en el log sin fallar.
// Retorna un log estructurado con cada operación realizada.
// ============================================================================
async function ejecutarIntegracionWhatsappIdempotente(connection, params) {
  const {
    idEmpresa,
    idBot,
    idBotRedes,
    nombreApp,
    numero,
    appId,
    authCode,
    creadoPor = 'sistema',
    urlsConfig4 = [],
    paramFijo10 = process.env.WA_PARAM_FIJO_10 || '',
    paramFijo17 = process.env.WA_PARAM_FIJO_17 || '',
  } = params;

  const log = [];
  const resumen = { creados: 0, actualizados: 0, existentes: 0, sin_cambios: 0 };

  // ── Configuraciones simples (1 valor por config) ──────────────────────────
  const configs = [
    { id: '18', valor: '3', label: 'Tipo (3)' },
    { id: '19', valor: `https://partner.gupshup.io/partner/app/${appId}/v3`, label: 'Partner URL v3' },
    { id: '20', valor: authCode, label: 'Auth Code' },
    { id: '21', valor: appId, label: 'App ID' },
    { id: '22', valor: '1', label: 'Bandera (1)' },
    { id: '23', valor: `https://partner.gupshup.io/partner/app/${appId}/onboarding/marketing`, label: 'Onboarding URL' },
    { id: '1',  valor: numero, label: 'Número WhatsApp' },
    { id: '10', valor: paramFijo10, label: 'Token fijo (10)' },
    { id: '9',  valor: 'https://api.gupshup.io/wa/api/v1', label: 'API URL' },
    { id: '13', valor: 'GUPSHUP', label: 'Proveedor' },
    { id: '14', valor: nombreApp, label: 'Nombre App' },
    { id: '17', valor: paramFijo17, label: 'Token fijo (17)' },
  ];

  for (const c of configs) {
    const [rows] = await connection.query(
      `SELECT VALOR FROM BOT_RED_CONF_VALORES WHERE ID_BOT_REDES = ? AND ID_BOT_RED_CONFIGURACION = ?`,
      [idBotRedes, c.id]
    );
    if (rows.length > 0) {
      if (String(rows[0].VALOR) === String(c.valor)) {
        log.push({ tipo: 'config', accion: 'sin_cambios', detalle: `BOT_RED_CONF_VALORES config=${c.id} (${c.label}): valor ya correcto` });
        resumen.sin_cambios++;
      } else {
        await connection.query(
          `UPDATE BOT_RED_CONF_VALORES SET VALOR = ? WHERE ID_BOT_REDES = ? AND ID_BOT_RED_CONFIGURACION = ?`,
          [c.valor, idBotRedes, c.id]
        );
        log.push({ tipo: 'config', accion: 'actualizado', detalle: `BOT_RED_CONF_VALORES config=${c.id} (${c.label}): "${rows[0].VALOR}" → "${c.valor}"` });
        resumen.actualizados++;
      }
    } else {
      await connection.query(
        `INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) VALUES (?, ?, ?, NOW(), ?)`,
        [idBotRedes, c.id, c.valor, creadoPor]
      );
      log.push({ tipo: 'config', accion: 'creado', detalle: `BOT_RED_CONF_VALORES config=${c.id} (${c.label}) creado: "${c.valor}"` });
      resumen.creados++;
    }
  }

  // ── Config 4: URLs múltiples — solo insertar las que faltan ───────────────
  if (urlsConfig4.length > 0) {
    const [existingUrls] = await connection.query(
      `SELECT VALOR FROM BOT_RED_CONF_VALORES WHERE ID_BOT_REDES = ? AND ID_BOT_RED_CONFIGURACION = '4'`,
      [idBotRedes]
    );
    const existingSet = new Set(existingUrls.map(r => String(r.VALOR)));
    for (const url of urlsConfig4) {
      if (existingSet.has(url)) {
        log.push({ tipo: 'config', accion: 'sin_cambios', detalle: `BOT_RED_CONF_VALORES config=4 URL ya existía: "${url}"` });
        resumen.sin_cambios++;
      } else {
        await connection.query(
          `INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) VALUES (?, '4', ?, NOW(), ?)`,
          [idBotRedes, url, creadoPor]
        );
        log.push({ tipo: 'config', accion: 'creado', detalle: `BOT_RED_CONF_VALORES config=4 URL insertada: "${url}"` });
        resumen.creados++;
      }
    }
  }

  // ── APLICACION_PLANTILLAS_WHATSAPP ────────────────────────────────────────
  const [appPlanRows] = await connection.query(
    `SELECT NOMBRE_APP, APP_ID, AUTH_CODE FROM APLICACION_PLANTILLAS_WHATSAPP WHERE ID_EMPRESA = ? AND ID_BOT_REDES = ?`,
    [idEmpresa, idBotRedes]
  );
  if (appPlanRows.length > 0) {
    const r = appPlanRows[0];
    if (r.NOMBRE_APP === nombreApp && String(r.APP_ID) === String(appId) && r.AUTH_CODE === authCode) {
      log.push({ tipo: 'tabla', accion: 'sin_cambios', detalle: 'APLICACION_PLANTILLAS_WHATSAPP ya tenía los mismos valores' });
      resumen.sin_cambios++;
    } else {
      await connection.query(
        `UPDATE APLICACION_PLANTILLAS_WHATSAPP SET NOMBRE_APP = ?, APP_ID = ?, AUTH_CODE = ? WHERE ID_EMPRESA = ? AND ID_BOT_REDES = ?`,
        [nombreApp, appId, authCode, idEmpresa, idBotRedes]
      );
      log.push({ tipo: 'tabla', accion: 'actualizado', detalle: `APLICACION_PLANTILLAS_WHATSAPP actualizada (empresa=${idEmpresa}, bot_redes=${idBotRedes})` });
      resumen.actualizados++;
    }
  } else {
    await connection.query(
      `INSERT INTO APLICACION_PLANTILLAS_WHATSAPP (ID_EMPRESA, ID_BOT_REDES, NOMBRE_APP, APP_ID, AUTH_CODE, CREADO_POR) VALUES (?, ?, ?, ?, ?, ?)`,
      [idEmpresa, idBotRedes, nombreApp, appId, authCode, creadoPor]
    );
    log.push({ tipo: 'tabla', accion: 'creado', detalle: `APLICACION_PLANTILLAS_WHATSAPP insertado (empresa=${idEmpresa}, bot_redes=${idBotRedes})` });
    resumen.creados++;
  }

  // ── BROADCAST_PROCESOS_DETALLE ───────────────────────────────────────────
  const [bpdRows] = await connection.query(
    `SELECT 1 FROM BROADCAST_PROCESOS_DETALLE WHERE ID_BROADCAST_PROCESO = 2 AND ID_BOT_REDES = ? LIMIT 1`,
    [idBotRedes]
  );
  if (bpdRows.length > 0) {
    log.push({ tipo: 'tabla', accion: 'sin_cambios', detalle: 'BROADCAST_PROCESOS_DETALLE ya existía para este bot_redes' });
    resumen.sin_cambios++;
  } else {
    await connection.query(
      `INSERT INTO BROADCAST_PROCESOS_DETALLE (ID_BROADCAST_PROCESO, ID_BOT_REDES, CREADO_POR, CREADO_EL) VALUES ('2', ?, ?, NOW())`,
      [idBotRedes, creadoPor]
    );
    log.push({ tipo: 'tabla', accion: 'creado', detalle: `BROADCAST_PROCESOS_DETALLE insertado (id_broadcast=2, bot_redes=${idBotRedes})` });
    resumen.creados++;
  }

  // ── UPDATE BOT_REDES ─────────────────────────────────────────────────────
  const [botRedesRows] = await connection.query(
    `SELECT API, BAJO_DEMANDA FROM BOT_REDES WHERE ID_BOT_REDES = ? AND ID_RED_SOCIAL = 1`,
    [idBotRedes]
  );
  if (botRedesRows.length === 0) {
    log.push({ tipo: 'tabla', accion: 'advertencia', detalle: `BOT_REDES no encontrada (id_bot_redes=${idBotRedes}, id_red_social=1)` });
  } else {
    const br = botRedesRows[0];
    if (br.API === 1 && br.BAJO_DEMANDA === 1) {
      log.push({ tipo: 'tabla', accion: 'sin_cambios', detalle: `BOT_REDES ya tenía API=1, BAJO_DEMANDA=1` });
      resumen.sin_cambios++;
    } else {
      await connection.query(
        `UPDATE BOT_REDES SET API = 1, BAJO_DEMANDA = 1 WHERE ID_BOT_REDES = ? AND ID_RED_SOCIAL = 1`,
        [idBotRedes]
      );
      log.push({ tipo: 'tabla', accion: 'actualizado', detalle: `BOT_REDES actualizado: API=1, BAJO_DEMANDA=1 (bot_redes=${idBotRedes})` });
      resumen.actualizados++;
    }
  }

  // ── CREATE TABLE whatsapp.WA_<idBot>_MESSAGES ────────────────────────────
  const tableName = `WA_${idBot}_MESSAGES`;
  const [tableExists] = await connection.query(
    `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = 'whatsapp' AND TABLE_NAME = ?`,
    [tableName]
  );
  if (tableExists.length > 0) {
    log.push({ tipo: 'tabla', accion: 'ya_existia', detalle: `Tabla whatsapp.${tableName} ya existía (no se modificó)` });
    resumen.existentes++;
  } else {
    await connection.query(`
      CREATE TABLE whatsapp.${tableName} (
        MESSAGE_ID BIGINT NOT NULL AUTO_INCREMENT,
        MID TEXT NOT NULL,
        PSID TEXT NOT NULL,
        MESSAGE_DIR ENUM('E', 'R') NOT NULL,
        MESSAGE_TYPE VARCHAR(10) NOT NULL,
        ESTADO TINYINT(4) NOT NULL,
        EXTERNAL_ID BIGINT NOT NULL,
        MESSAGE_DATE DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        MESSAGE_TEXT TEXT,
        MEDIA_URL TEXT,
        MEDIA_FILE_PATH TEXT,
        PRIMARY KEY (MESSAGE_ID)
      ) ENGINE=InnoDB DEFAULT CHARACTER SET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        COMMENT='Registro de los mensajes procesados para API Oficial de Whatsapp'
    `);
    log.push({ tipo: 'tabla', accion: 'creada', detalle: `Tabla whatsapp.${tableName} creada` });
    resumen.creados++;

    // Índices (try/catch por si fallan)
    try {
      await connection.query(`ALTER TABLE whatsapp.${tableName} ADD INDEX \`${tableName}_IDX_EXTERNALID\`(EXTERNAL_ID)`);
      log.push({ tipo: 'tabla', accion: 'creado', detalle: `Índice ${tableName}_IDX_EXTERNALID creado` });
    } catch (e) {
      log.push({ tipo: 'tabla', accion: 'advertencia', detalle: `No se pudo crear índice EXTERNALID: ${e.message}` });
    }
    try {
      await connection.query(`ALTER TABLE whatsapp.${tableName} ADD INDEX \`${tableName}_IDX_MESSAGE_DATE\`(MESSAGE_DATE)`);
      log.push({ tipo: 'tabla', accion: 'creado', detalle: `Índice ${tableName}_IDX_MESSAGE_DATE creado` });
    } catch (e) {
      log.push({ tipo: 'tabla', accion: 'advertencia', detalle: `No se pudo crear índice MESSAGE_DATE: ${e.message}` });
    }
  }

  // ── UPDATE PARAMETROS ────────────────────────────────────────────────────
  const [paramsResult] = await connection.query(
    `UPDATE PARAMETROS SET VALOR = 1 WHERE ID_BOT = ? AND NOMBRE IN ('ENVIAR_MENU_INTERACTIVO','HABILITAR_USO_3BOTONES_INTERACTIVO','OPTIN_ALTA_AUTOMATICA','SUSCRIPCION_PLANTILLA')`,
    [idBot]
  );
  log.push({
    tipo: 'parametros',
    accion: paramsResult.affectedRows > 0 ? 'actualizado' : 'sin_cambios',
    detalle: `PARAMETROS (id_bot=${idBot}): ${paramsResult.affectedRows} fila(s) afectada(s) / ${paramsResult.changedRows} modificada(s)`,
  });
  if (paramsResult.changedRows > 0) resumen.actualizados++;
  else resumen.sin_cambios++;

  return { log, resumen };
}

/**
 * POST /api/creaciones/whatsapp
 * Ejecuta la integración WhatsApp de forma IDEMPOTENTE.
 *
 * Acepta dos modos:
 *  1. Modo nuevo (recomendado): { dbKey, params: {...} } — ejecuta lógica idempotente con log
 *  2. Modo legacy: { dbKey, sqlScript } — ejecuta SQL crudo (mantiene compatibilidad)
 */
router.post('/api/creaciones/whatsapp', async (req, res) => {
  const { dbKey = 'db_1', sqlScript, params } = req.body;

  const dbNombreMap = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2',
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
  };

  if (!dbNombreMap[dbKey]) {
    return res.status(400).json({ error: `Base de datos no válida: ${dbKey}` });
  }

  const modoIdempotente = !!(params && typeof params === 'object');

  if (!modoIdempotente && (!sqlScript || typeof sqlScript !== 'string')) {
    return res.status(400).json({ error: 'Debe enviar params (modo idempotente) o sqlScript (modo legacy)' });
  }

  // Bloquear instrucciones peligrosas si viene sqlScript
  if (!modoIdempotente) {
    const instruccionesBloqueadas = /\b(DROP\s+DATABASE|TRUNCATE\s+DATABASE|ALTER\s+DATABASE|CREATE\s+DATABASE|GRANT|REVOKE)\b/i;
    if (instruccionesBloqueadas.test(sqlScript)) {
      return res.status(400).json({ error: 'El script SQL contiene instrucciones no permitidas' });
    }
  }

  let connection = null;
  const inicio = Date.now();
  const dbNombre = dbNombreMap[dbKey];

  try {
    const targetPool = getPool(dbKey);
    connection = await targetPool.getConnection();
    await connection.beginTransaction();

    let log = null;
    let resumen = null;

    if (modoIdempotente) {
      // Validar campos mínimos
      const required = ['idEmpresa', 'idBot', 'idBotRedes', 'nombreApp', 'numero', 'appId', 'authCode'];
      for (const f of required) {
        if (!params[f]) {
          await connection.rollback();
          return res.status(400).json({ error: `Falta el campo requerido: ${f}` });
        }
      }
      const resultado = await ejecutarIntegracionWhatsappIdempotente(connection, params);
      log = resultado.log;
      resumen = resultado.resumen;
    } else {
      await connection.query(sqlScript);
    }

    await connection.commit();

    // Auditoría
    if (registrarAuditoria) {
      const desc = modoIdempotente
        ? `INTEGRACION_WHATSAPP [${dbNombre}] bot=${params.idBot} bot_redes=${params.idBotRedes}: ${resumen.creados} creados, ${resumen.actualizados} actualizados, ${resumen.existentes} ya existían, ${resumen.sin_cambios} sin cambios`
        : `INTEGRACION_WHATSAPP [${dbNombre}]: Integración de WhatsApp ejecutada exitosamente (modo legacy SQL)`;
      await registrarAuditoria({
        tipo_accion: 'INTEGRACION_WHATSAPP',
        entidad: 'BOT_RED_CONF_VALORES',
        db_key: dbKey,
        db_nombre: dbNombre,
        metadata: { db_key: dbKey, db_nombre: dbNombre, resumen, params: modoIdempotente ? { idEmpresa: params.idEmpresa, idBot: params.idBot, idBotRedes: params.idBotRedes, nombreApp: params.nombreApp } : undefined },
        descripcion: desc,
        exito: true,
      });
    }

    return res.json({
      success: true,
      dbKey,
      dbNombre,
      duracionMs: Date.now() - inicio,
      mensaje: modoIdempotente ? 'Integración de WhatsApp ejecutada (idempotente)' : 'Integración de WhatsApp ejecutada exitosamente',
      log,
      resumen,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) { /* noop */ }
    }

    if (registrarAuditoria) {
      await registrarAuditoria({
        tipo_accion: 'INTEGRACION_WHATSAPP',
        entidad: 'BOT_RED_CONF_VALORES',
        db_key: dbKey,
        db_nombre: dbNombre,
        metadata: { error: error.message, db_key: dbKey, db_nombre: dbNombre },
        descripcion: `INTEGRACION_WHATSAPP FALLIDA [${dbNombre}]: ${error.message}`,
        exito: false,
        mensaje_error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      dbKey,
      dbNombre,
      duracionMs: Date.now() - inicio,
      error: 'Error al ejecutar la integración de WhatsApp',
      details: error.message,
      sqlMessage: error.sqlMessage,
    });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * POST /api/creaciones/whatsapp/probar
 * Prueba el SQL de integración WhatsApp con rollback (sin guardar cambios)
 */
router.post('/api/creaciones/whatsapp/probar', async (req, res) => {
  const { dbKey = 'db_1', sqlScript, params } = req.body;

  const dbNombreMap = {
    'db_1': 'Talkme S1',
    'db_2': 'Talkme S2',
    'db_3': 'Talkme S3',
    'db_4': 'Talkme S4',
    'db_5': 'Talkme MDD',
  };

  if (!dbNombreMap[dbKey]) {
    return res.status(400).json({ error: `Base de datos no válida: ${dbKey}` });
  }

  const modoIdempotente = !!(params && typeof params === 'object');
  if (!modoIdempotente && (!sqlScript || typeof sqlScript !== 'string')) {
    return res.status(400).json({ error: 'Debe enviar params (idempotente) o sqlScript (legacy)' });
  }

  let connection = null;
  const inicio = Date.now();
  const dbNombre = dbNombreMap[dbKey];

  try {
    const targetPool = getPool(dbKey);
    connection = await targetPool.getConnection();
    await connection.beginTransaction();

    let log = null;
    let resumen = null;

    if (modoIdempotente) {
      const resultado = await ejecutarIntegracionWhatsappIdempotente(connection, params);
      log = resultado.log;
      resumen = resultado.resumen;
    } else {
      await connection.query(sqlScript);
    }

    // SIEMPRE rollback en modo probar
    await connection.rollback();

    return res.json({
      success: true,
      dbKey,
      dbNombre,
      duracionMs: Date.now() - inicio,
      mensaje: modoIdempotente ? 'Prueba idempotente exitosa (sin cambios guardados)' : 'SQL válido - Prueba exitosa (sin cambios guardados)',
      nota: 'Se ejecutó con rollback, no se guardaron cambios en la base de datos',
      log,
      resumen,
    });
  } catch (error) {
    if (connection) {
      try { await connection.rollback(); } catch (e) { /* noop */ }
    }
    return res.status(500).json({
      success: false,
      dbKey,
      dbNombre,
      duracionMs: Date.now() - inicio,
      error: 'Error al probar la integración',
      details: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
    });
  } finally {
    if (connection) connection.release();
  }
});

/**
 * GET /api/creaciones/empresas?db_key=db_1
 * Obtiene la lista de empresas con ESTADO=1 desde la base de datos seleccionada
 */
router.get('/api/creaciones/empresas', async (req, res) => {
  const dbKey = req.query.db_key || 'db_1';
  
  const validDbs = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5'];
  if (!validDbs.includes(dbKey)) {
    return res.status(400).json({ 
      error: 'Base de datos no válida', 
      permitidas: validDbs 
    });
  }
  
  const poolEmpresas = dbPools[dbKey];
  if (!poolEmpresas) {
    return res.status(500).json({ error: `Pool de base de datos ${dbKey} no inicializado` });
  }

  try {
    const connection = await poolEmpresas.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT ID_EMPRESA, NOMBRE, TELEFONO, EMAIL, ESTADO
        FROM EMPRESAS
        WHERE ESTADO = 1
        ORDER BY NOMBRE
      `);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Creaciones] Error al obtener empresas:', error.message);
    res.status(500).json({ error: 'Error al obtener empresas', details: error.message });
  }
});

/**
 * GET /api/creaciones/bots?db_key=db_1&id_empresa=123
 * Obtiene la lista de bots según el ID_EMPRESA desde la base de datos seleccionada
 */
router.get('/api/creaciones/bots', async (req, res) => {
  const dbKey = req.query.db_key || 'db_1';
  const idEmpresa = req.query.id_empresa;
  
  if (!idEmpresa) {
    return res.status(400).json({ error: 'Debe especificar id_empresa' });
  }
  
  const validDbs = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5'];
  if (!validDbs.includes(dbKey)) {
    return res.status(400).json({ 
      error: 'Base de datos no válida', 
      permitidas: validDbs 
    });
  }
  
  const poolBots = dbPools[dbKey];
  if (!poolBots) {
    return res.status(500).json({ error: `Pool de base de datos ${dbKey} no inicializado` });
  }

  try {
    const connection = await poolBots.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT ID_BOT, DESCRIPCION, ID_EMPRESA, ESTADO
        FROM BOT
        WHERE ID_EMPRESA = ? AND ESTADO = 1
        ORDER BY DESCRIPCION
      `, [idEmpresa]);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Creaciones] Error al obtener bots:', error.message);
    res.status(500).json({ error: 'Error al obtener bots', details: error.message });
  }
});

/**
 * GET /api/creaciones/bot-redes?db_key=db_1&id_bot=123
 * Obtiene la lista de bot_redes (WhatsApp) según el ID_BOT desde la base de datos seleccionada
 */
router.get('/api/creaciones/bot-redes', async (req, res) => {
  const dbKey = req.query.db_key || 'db_1';
  const idBot = req.query.id_bot;
  
  if (!idBot) {
    return res.status(400).json({ error: 'Debe especificar id_bot' });
  }
  
  const validDbs = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5'];
  if (!validDbs.includes(dbKey)) {
    return res.status(400).json({ 
      error: 'Base de datos no válida', 
      permitidas: validDbs 
    });
  }
  
  const poolBotRedes = dbPools[dbKey];
  if (!poolBotRedes) {
    return res.status(500).json({ error: `Pool de base de datos ${dbKey} no inicializado` });
  }

  try {
    const connection = await poolBotRedes.getConnection();
    try {
      const [rows] = await connection.query(`
        SELECT br.ID_BOT_REDES, br.ID_BOT, br.ID_RED_SOCIAL, br.ID_PAIS, br.ESTADO, rs.NOMBRE AS NOMBRE_RED
        FROM BOT_REDES br
        JOIN REDES_SOCIALES rs ON br.ID_RED_SOCIAL = rs.ID_RED_SOCIAL
        WHERE br.ID_BOT = ? AND br.ESTADO = 1 AND rs.ESTADO = 1
        ORDER BY rs.NOMBRE
      `, [idBot]);
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[Creaciones] Error al obtener bot_redes:', error.message);
    res.status(500).json({ error: 'Error al obtener bot_redes', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINTS PARA GESTIÓN DE NÚMEROS DEMOS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/numeros-demos
 * Obtiene todos los números demos (usa db_1 como default)
 */
router.get('/api/numeros-demos', async (req, res) => {
  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      const [rows] = await connection.query(
        `SELECT * FROM NUMEROS_DEMOS ORDER BY 
          CASE ESTADO 
            WHEN 'DISPONIBLE' THEN 1 
            WHEN 'OCUPADO' THEN 2 
            ELSE 3 
          END, 
          NOMBRE_APP ASC`
      );
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al obtener números:', error.message);
    res.status(500).json({ error: 'Error al obtener números', details: error.message });
  }
});

/**
 * GET /api/numeros-demos/disponibles
 * Obtiene solo los números disponibles
 */
router.get('/api/numeros-demos/disponibles', async (req, res) => {
  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      const [rows] = await connection.query(
        `SELECT * FROM NUMEROS_DEMOS 
         WHERE ESTADO = 'DISPONIBLE' 
         ORDER BY NOMBRE_APP ASC`
      );
      res.json(rows);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error:', error.message);
    res.status(500).json({ error: 'Error al obtener números disponibles', details: error.message });
  }
});

/**
 * POST /api/numeros-demos
 * Crea un nuevo número demo
 */
router.post('/api/numeros-demos', async (req, res) => {
  const { nombreApp, numero, authCode, appId, ambiente, estado } = req.body;
  
  if (!nombreApp || !numero) {
    return res.status(400).json({ error: 'Nombre y número son obligatorios' });
  }

  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      // Verificar si el número ya existe
      const [existe] = await connection.query(
        'SELECT ID_NUMERO FROM NUMEROS_DEMOS WHERE NUMERO = ?',
        [numero]
      );
      
      if (existe.length > 0) {
        return res.status(400).json({ error: 'El número ya existe en la base de datos' });
      }

      const [result] = await connection.query(
        `INSERT INTO NUMEROS_DEMOS 
         (NOMBRE_APP, NUMERO, AUTH_CODE, APP_ID, AMBIENTE, ESTADO, CREADO_POR) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombreApp, numero, authCode || null, appId || null, ambiente || 'DEMO_TALKME', estado || 'DISPONIBLE', 'alex.carrera']
      );

      // Registrar en auditoría
      if (registrarAuditoria) {
        await registrarAuditoria({
          tipo_accion: 'CREAR_NUMERO_DEMO',
          entidad: 'NUMEROS_DEMOS',
          db_key: 'control',
          metadata: { idNumero: result.insertId, nombreApp, numero },
          descripcion: `Número demo creado: ${nombreApp} (${numero})`,
          exito: true,
        });
      }

      res.json({ 
        success: true, 
        id: result.insertId,
        mensaje: 'Número creado exitosamente' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al crear:', error.message);
    res.status(500).json({ error: 'Error al crear número', details: error.message });
  }
});

/**
 * PUT /api/numeros-demos/:id
 * Actualiza un número demo
 */
router.put('/api/numeros-demos/:id', async (req, res) => {
  const { id } = req.params;
  const { nombreApp, numero, authCode, appId, ambiente, estado } = req.body;
  
  if (!nombreApp || !numero) {
    return res.status(400).json({ error: 'Nombre y número son obligatorios' });
  }

  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      // Verificar si el nuevo número ya existe en otro registro
      const [existe] = await connection.query(
        'SELECT ID_NUMERO FROM NUMEROS_DEMOS WHERE NUMERO = ? AND ID_NUMERO != ?',
        [numero, id]
      );
      
      if (existe.length > 0) {
        return res.status(400).json({ error: 'El número ya existe en otro registro' });
      }

      await connection.query(
        `UPDATE NUMEROS_DEMOS 
         SET NOMBRE_APP = ?, NUMERO = ?, AUTH_CODE = ?, APP_ID = ?, 
             AMBIENTE = ?, ESTADO = ?, ACTUALIZADO_POR = ?, ACTUALIZADO_EL = NOW()
         WHERE ID_NUMERO = ?`,
        [nombreApp, numero, authCode || null, appId || null, ambiente, estado, 'alex.carrera', id]
      );

      // Registrar en auditoría
      if (registrarAuditoria) {
        await registrarAuditoria({
          tipo_accion: 'ACTUALIZAR_NUMERO_DEMO',
          entidad: 'NUMEROS_DEMOS',
          db_key: 'control',
          metadata: { idNumero: id, nombreApp, numero },
          descripcion: `Número demo actualizado: ${nombreApp} (${numero})`,
          exito: true,
        });
      }

      res.json({ 
        success: true,
        mensaje: 'Número actualizado exitosamente' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al actualizar:', error.message);
    res.status(500).json({ error: 'Error al actualizar número', details: error.message });
  }
});

/**
 * DELETE /api/numeros-demos/:id
 * Elimina un número demo
 */
router.delete('/api/numeros-demos/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      // Obtener info antes de eliminar para auditoría
      const [numeroInfo] = await connection.query(
        'SELECT NOMBRE_APP, NUMERO FROM NUMEROS_DEMOS WHERE ID_NUMERO = ?',
        [id]
      );

      await connection.query(
        'DELETE FROM NUMEROS_DEMOS WHERE ID_NUMERO = ?',
        [id]
      );

      // Registrar en auditoría
      if (registrarAuditoria && numeroInfo.length > 0) {
        await registrarAuditoria({
          tipo_accion: 'ELIMINAR_NUMERO_DEMO',
          entidad: 'NUMEROS_DEMOS',
          db_key: 'control',
          metadata: { idNumero: id, ...numeroInfo[0] },
          descripcion: `Número demo eliminado: ${numeroInfo[0].NOMBRE_APP} (${numeroInfo[0].NUMERO})`,
          exito: true,
        });
      }

      res.json({ 
        success: true,
        mensaje: 'Número eliminado exitosamente' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al eliminar:', error.message);
    res.status(500).json({ error: 'Error al eliminar número', details: error.message });
  }
});

/**
 * POST /api/numeros-demos/:id/liberar
 * Libera un número demo (marca como DISPONIBLE y limpia campos de uso)
 */
router.post('/api/numeros-demos/:id/liberar', async (req, res) => {
  const { id } = req.params;

  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      const [numeroInfo] = await connection.query(
        'SELECT NOMBRE_APP, NUMERO, ID_EMPRESA FROM NUMEROS_DEMOS WHERE ID_NUMERO = ?',
        [id]
      );

      await connection.query(
        `UPDATE NUMEROS_DEMOS 
         SET ESTADO = 'DISPONIBLE', 
             ID_EMPRESA = NULL, 
             ID_BOT = NULL, 
             ID_BOT_REDES = NULL, 
             NOMBRE_EMPRESA = NULL,
             USADO_EL = NULL,
             ACTUALIZADO_POR = ?,
             ACTUALIZADO_EL = NOW()
         WHERE ID_NUMERO = ?`,
        ['alex.carrera', id]
      );

      // Registrar en auditoría
      if (registrarAuditoria && numeroInfo.length > 0) {
        await registrarAuditoria({
          tipo_accion: 'LIBERAR_NUMERO_DEMO',
          entidad: 'NUMEROS_DEMOS',
          db_key: 'control',
          metadata: { 
            idNumero: id, 
            nombreApp: numeroInfo[0].NOMBRE_APP,
            numero: numeroInfo[0].NUMERO,
            empresaAnterior: numeroInfo[0].ID_EMPRESA 
          },
          descripcion: `Número demo liberado: ${numeroInfo[0].NOMBRE_APP} (${numeroInfo[0].NUMERO})`,
          exito: true,
        });
      }

      res.json({ 
        success: true,
        mensaje: 'Número liberado exitosamente' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al liberar:', error.message);
    res.status(500).json({ error: 'Error al liberar número', details: error.message });
  }
});

/**
 * POST /api/numeros-demos/:id/ocupar
 * Marca un número como OCUPADO (usado desde integración WhatsApp)
 */
router.post('/api/numeros-demos/:id/ocupar', async (req, res) => {
  const { id } = req.params;
  const { idEmpresa, idBot, idBotRedes, nombreEmpresa } = req.body;

  try {
    const connection = await dbPools.control.getConnection();
    
    try {
      const [numeroInfo] = await connection.query(
        'SELECT NOMBRE_APP, NUMERO, ESTADO FROM NUMEROS_DEMOS WHERE ID_NUMERO = ?',
        [id]
      );

      if (numeroInfo.length === 0) {
        return res.status(404).json({ error: 'Número no encontrado' });
      }

      if (numeroInfo[0].ESTADO === 'OCUPADO') {
        return res.status(400).json({ error: 'El número ya está ocupado' });
      }

      await connection.query(
        `UPDATE NUMEROS_DEMOS 
         SET ESTADO = 'OCUPADO', 
             ID_EMPRESA = ?, 
             ID_BOT = ?, 
             ID_BOT_REDES = ?, 
             NOMBRE_EMPRESA = ?,
             USADO_EL = NOW(),
             ACTUALIZADO_POR = ?,
             ACTUALIZADO_EL = NOW()
         WHERE ID_NUMERO = ?`,
        [idEmpresa, idBot, idBotRedes, nombreEmpresa, 'alex.carrera', id]
      );

      // Registrar en auditoría
      if (registrarAuditoria) {
        await registrarAuditoria({
          tipo_accion: 'OCUPAR_NUMERO_DEMO',
          entidad: 'NUMEROS_DEMOS',
          db_key: 'control',
          metadata: { 
            idNumero: id, 
            nombreApp: numeroInfo[0].NOMBRE_APP,
            numero: numeroInfo[0].NUMERO,
            idEmpresa, idBot, idBotRedes, nombreEmpresa
          },
          descripcion: `Número demo ocupado: ${numeroInfo[0].NOMBRE_APP} (${numeroInfo[0].NUMERO}) -> ${nombreEmpresa}`,
          exito: true,
        });
      }

      res.json({ 
        success: true,
        mensaje: 'Número marcado como ocupado' 
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al ocupar:', error.message);
    res.status(500).json({ error: 'Error al ocupar número', details: error.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENDPOINT: Validar números demos en bases de datos de segmentos
// ═══════════════════════════════════════════════════════════════════════════════
router.post('/api/numeros-demos/validar', async (req, res) => {
  const { dbKey } = req.body;
  
  const VALID_DBS = ['db_1', 'db_2', 'db_3', 'db_4', 'db_5', 'db_6', 'db_7', 'db_8'];
  const SEGMENTO_MAP = {
    'db_1': 'S1',
    'db_2': 'S2',
    'db_3': 'S3',
    'db_4': 'S4',
    'db_5': 'MDD',
    'db_6': 'FS1',
    'db_7': 'FS2',
    'db_8': 'FS3'
  };
  
  if (!VALID_DBS.includes(dbKey)) {
    return res.status(400).json({ error: 'Base de datos no válida' });
  }

  const segmento = SEGMENTO_MAP[dbKey];
  
  // Para Ficohsa S1 (db_6) y S3 (db_8) usar config 13, para las demás usar 14
  const nombreAppConfigId = (dbKey === 'db_6' || dbKey === 'db_8') ? 13 : 14;

  try {
    const pool = getPool(dbKey);
    if (!pool) {
      return res.status(400).json({ error: `Pool de base de datos ${dbKey} no encontrado` });
    }

    const connection = await pool.getConnection();
    
    try {
      // Query para obtener números activos de WhatsApp
      const [numerosDB] = await connection.query(`
        SELECT 
            A.ID_EMPRESA,
            A.NOMBRE AS NOMBRE_EMPRESA,
            B.ID_BOT,
            B.DESCRIPCION AS NOMBRE_BOT,
            C.ID_BOT_REDES,
            D.VALOR AS NUMERO_ASOCIADO,
            D2.VALOR AS NOMBRE_DEL_APP,
            D3.VALOR AS AUTH_CODE,
            D4.VALOR AS APP_ID,
            D5.VALOR AS ACCESS_TOKEN,
            D6.VALOR AS BUSINESS_ID,
            D7.VALOR AS VERSION
        FROM EMPRESAS A
        JOIN BOT B 
            ON B.ID_EMPRESA = A.ID_EMPRESA
        JOIN BOT_REDES C 
            ON B.ID_BOT = C.ID_BOT
        JOIN BOT_RED_CONF_VALORES D 
            ON C.ID_BOT_REDES = D.ID_BOT_REDES 
            AND D.ID_BOT_RED_CONFIGURACION = 1
        LEFT JOIN BOT_RED_CONF_VALORES D2 
            ON C.ID_BOT_REDES = D2.ID_BOT_REDES 
            AND D2.ID_BOT_RED_CONFIGURACION = ?
        LEFT JOIN BOT_RED_CONF_VALORES D3 
            ON C.ID_BOT_REDES = D3.ID_BOT_REDES 
            AND D3.ID_BOT_RED_CONFIGURACION = 20
        LEFT JOIN BOT_RED_CONF_VALORES D4 
            ON C.ID_BOT_REDES = D4.ID_BOT_REDES 
            AND D4.ID_BOT_RED_CONFIGURACION = 21
        LEFT JOIN BOT_RED_CONF_VALORES D5 
            ON C.ID_BOT_REDES = D5.ID_BOT_REDES 
            AND D5.ID_BOT_RED_CONFIGURACION = 19
        LEFT JOIN BOT_RED_CONF_VALORES D6 
            ON C.ID_BOT_REDES = D6.ID_BOT_REDES 
            AND D6.ID_BOT_RED_CONFIGURACION = 23
        LEFT JOIN BOT_RED_CONF_VALORES D7
            ON C.ID_BOT_REDES = D7.ID_BOT_REDES
            AND D7.ID_BOT_RED_CONFIGURACION = 18
        WHERE C.ID_RED_SOCIAL = 1
        AND A.ESTADO = 1
        AND B.ESTADO = 1
      `, [nombreAppConfigId]);

      // Ahora buscar coincidencias en NUMEROS_DEMOS (desde la DB de control)
      const controlConnection = await dbPools.control.getConnection();
      
      try {
        // Obtener todos los números de demos para comparar
        const [numerosDemos] = await controlConnection.query(
          'SELECT ID_NUMERO, NOMBRE_APP, NUMERO FROM NUMEROS_DEMOS WHERE ESTADO != "INACTIVO"'
        );

        // Encontrar coincidencias
        const coincidencias = [];
        const actualizados = [];

        for (const numDB of numerosDB) {
          // Buscar por número o por nombre de app
          const match = numerosDemos.find(nd => 
            nd.NUMERO === numDB.NUMERO_ASOCIADO ||
            nd.NOMBRE_APP === numDB.NOMBRE_DEL_APP
          );

          if (match) {
            coincidencias.push({
              idNumero: match.ID_NUMERO,
              nombreApp: match.NOMBRE_APP,
              numero: match.NUMERO,
              encontradoEn: {
                idEmpresa: numDB.ID_EMPRESA,
                nombreEmpresa: numDB.NOMBRE_EMPRESA,
                idBot: numDB.ID_BOT,
                nombreBot: numDB.NOMBRE_BOT,
                idBotRedes: numDB.ID_BOT_REDES,
                numeroAsociado: numDB.NUMERO_ASOCIADO,
                nombreDelApp: numDB.NOMBRE_DEL_APP,
                authCode: numDB.AUTH_CODE,
                appId: numDB.APP_ID,
                segmento: segmento
              }
            });

            // Actualizar la tabla NUMEROS_DEMOS
            await controlConnection.query(
              `UPDATE NUMEROS_DEMOS 
               SET ID_EMPRESA = ?, 
                   ID_BOT = ?, 
                   ID_BOT_REDES = ?, 
                   NOMBRE_EMPRESA = ?, 
                   SEGMENTO = ?,
                   ESTADO = 'OCUPADO',
                   USADO_EL = NOW(),
                   ACTUALIZADO_POR = 'alex.carrera',
                   ACTUALIZADO_EL = NOW()
               WHERE ID_NUMERO = ?`,
              [
                numDB.ID_EMPRESA, 
                numDB.ID_BOT, 
                numDB.ID_BOT_REDES, 
                numDB.NOMBRE_EMPRESA, 
                segmento,
                match.ID_NUMERO
              ]
            );

            actualizados.push(match.ID_NUMERO);
          }
        }

        // Registrar en auditoría
        if (registrarAuditoria && coincidencias.length > 0) {
          await registrarAuditoria({
            tipo_accion: 'VALIDAR_NUMEROS_DEMOS',
            entidad: 'NUMEROS_DEMOS',
            db_key: 'control',
            metadata: { 
              dbKey,
              segmento,
              encontrados: coincidencias.length,
              idsActualizados: actualizados
            },
            descripcion: `Validación ${segmento}: ${coincidencias.length} números mapeados y actualizados`,
            exito: true,
          });
        }

        res.json({
          success: true,
          segmento,
          dbKey,
          totalConsultados: numerosDB.length,
          coincidenciasEncontradas: coincidencias.length,
          numerosActualizados: actualizados.length,
          detalles: coincidencias
        });

      } finally {
        controlConnection.release();
      }

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('[NumerosDemos] Error al validar:', error.message);
    res.status(500).json({ error: 'Error al validar números', details: error.message });
  }
});

module.exports = {
  router,
  init,
};
