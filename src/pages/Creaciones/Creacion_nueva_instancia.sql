/* ************************************* */
/* CONFIGURACION INICIAL DE LA EMPRESA   */
/* -----------------------------------   */
/*                                       */
/* EMPRESA, TIPO DE CLIENTE, ESTADOS,    */
/* TIPOS DE GESTION, SKILLS, HORARIOS    */
/* DE SKILL, TIPOS DE RESOLUCIONES,      */
/* ATRIBUTOS DE FICHA.                   */
/* ************************************* */

/* DATOS DE LA EMPRESA */                   

SET @EmpresaNombre    		:= 'Grupo Master';
SET @NombreBOT        		:= 'Grupo Master';
SET @EmpresaTelefono  		:= 'NA';
SET @EmpresaCorreo    		:= 'NA';
SET @EmpresaDireccion 		:= 'NA';
SET @creadoPor        		:= 'Sistema.TalkMe';
SET @socketUrl              := 'https://cloud-s4.talkme.pro';
SET @URLEnvioNotificaciones := 'https://cloud-s4.consystec-corp.com';


-- SET @socketUrl        		:= 'https://cloud-s4.talkme.pro';
--  SET @URLEnvioNotificaciones := 'https://cloud-s4.consystec-corp.com';
	
SET @tokenEmpresa       := 'QRAjZTfzkAZ3PyUPP4g6cXqAPEsIbrGpNgHnkVVJfCEDRBrVKw';
SET @tokenConsystec     := 'token_consystec';
SET @fechaInicioPaquete := '2026-05-01 06:00:00';
SET @fechaFinPaquete    := '2026-06-01 05:59:59';

/*  DATOS DE CONTACTO    */
SET @nombreContacto   := 'Karla Barrios';
SET @telefonoContacto := '50256333085';

/* TELEFONO DE WHATSAPP PARA WEBCHAT */
SET @TELEFONO_WHATSAPP_WEBCHAT := '502';
SET @Moneda := 'Q';
SET @CodMoneda := 'GTQ';
SET @idPais := 1;

SET @TIEMPO_INACTIVIDAD := 30;
SET @TIEMPO_DESCONEXION := 35;
SET @TIEMPO_CONVERSACION_INATENDIDA := 25;
SET @TIEMPO_DESCONEXION_SOCKET := 10;


/* VARIABLES FTP */

SET @FTP_SIZE      := '5000';
SET @UTILIZAR_S3  := '1'; -- SI LA EMPRESA VA A UTILIZAR S3, COLOCAR EL VALOR 1, DE LO CONTRARIO DEJAR EL VALOR 0

-- ES OBLIGATORIO ASIGNARLE UN VALOR A LA VARIABLE @FOLDER_FILES YA QUE ESTE SERA EL FOLDER DONDE SE COLOCARAN
-- LOS ARCHIVOS DE LA EMPRESA SIN IMPORTAR QUE USEN EL S3 O FTP DE CONSYSTEC.
--
-- TOMAR EN CUENTA LAS SIGUIENTES CONSIDERACIONES PARA EL NOMBRE DEL FOLDER:
--
-- EL VALOR DEBE ESPECIFICARSE EN MINUSCULAS
-- NO DEBE CONTENER LETRAS TILDADAS O Ñ (ÁÉÍÓÚÑ CAMBIARLOS POR AEIUON)
-- NO DEBE TENER ESPACIOS EN BLANCO, ESCRIR TODAS LAS PALARAS JUNTAS
-- SI EL NOMBRE DE LA EMPRESA LLEVA PARENTESIS, REEMPLAZAR EL PARENTESIS QUE ABRE POR UN GUION BAJO, EL PARENTESIS DE CIERRE SE ELIMINA
-- DEBE CONTENER EL NOMBRE DEL BOT CON LAS MISMAS RESTRICCIONES ANTES MENCIONADAS
--
-- ALGUNOS EJEMPLOS:
--
-- Promerica El Salvador (cobros) ---> promericaelsalvador_cobros
-- Grupo Resurrección ---> gruporesurreccion
-- Doña Lucia ---> donalucia
-- 
SET @FOLDER_FILES  := 'grupo_master/grupo_master';

SET @Correo_cliente := 'karla.barrios@talkme.pro';

/* **************************************************************************************************    */
/*  ----------------------- SE TERMINAN DE SETEAR CAMPOS DE INFORMACION -----------------------------    */
/* **************************************************************************************************    */

SET @Correo_interno := 'ventas@consystec-corp.com,vinicio.sanchez@consystec-corp.com,karla.barrios@talkme.pro';
SET @Correo_interno_paquetes := 'ventas@consystec-corp.com,soporte.talkme@consystec-corp.com,karla.barrios@talkme.pro';
SET @intervalo_notificacion_cliente := 45;
SET @activar_alertas_amarillo := 5;
SET @limite_amarillo := 5;
SET @limite_rojo := 10;
SET @horario_noti := '8-17';
SET @activar_alerta_consumo := 1;
SET @alerta_consumo := 80;
SET @activar_alertas_internas := 1;
SET @limite_interno := 60;
SET @intervalo_notificacion_interno := 30;
SET @activar_alerta_consumo_interno := 1;
SET @alerta_consumo_interno := 80;


/* NO MODIFICAR ESTAS VARIABLES */

SET @EmpresaID      := 0;
SET @paramDefecto   := 0;
SET @idSkill        := 0;
SET @idResWebchat   := 0;
SET @UsuarioId      := 0;
SET @vTipoGestionCierreContactoFBComments := 0;
SET @vGestionTyC    := 0;

/* INICIALIZACION DE VARIABLES DE WEBCHAT */
SET @botonesPersistentes := '[{"comando": "MA", "titulo": "Atras", "icono": "back"},{"comando": "M99", "titulo": "ver carrito", "icono": "carrito"},{"comando": "SC", "titulo": "Seguir comprando", "icono": "mas"},{"comando": "__DELETE__","titulo": "Eliminar producto", "icono": "menos"},{"comando": "CC", "titulo": "Cancelar pedido", "icono": "borrar"},{"comando": "TC", "titulo": "Check Out", "icono": "checkout"},{"comando": "CA", "titulo": "Hablar con asesor", "icono": "operador-icon"}]';
SET @botonIniciar        := "Iniciar conversación";
SET @tituloInicio        := "Hola";
SET @subTituloInicio     := "¿Tienes dudas o consultas? inicia una conversación.";
SET @canalOcupado        := "Ya tiene un canal de comunicación activo en otra pestaña.";
SET @finalizado          := "La conversación se ha finalizado. Para iniciar una nueva cierre esta ventana e inicie de nuevo.";
SET @titulo2Inicio       := "Inicia una conversación";
SET @subTitulo2Inicio    := "Sera un gusto atenderlo";
SET @subTituloChat       := "¿Tienes dudas? Contacta con un asesor.";
SET @tituloMenuChat      := "Menú principal";
SET @hablarOperador      := "Hablar con un asesor";
SET @noConectado         := "Conexión perdida";

/* SE INSERTA EL REGISTRO DE LA EMPRESA */

INSERT INTO EMPRESAS(NOMBRE, TELEFONO, EMAIL, DIRECCION, TIPO_CLIENTE, CREADO_POR, ID_PAIS)
VALUES (@EmpresaNombre, @EmpresaTelefono, @EmpresaCorreo, @EmpresaDireccion, 1, @creadoPor, @idPais);

/* SE RECUPERA EL ID DE LA EMPRESA */
SELECT @EmpresaID :=  LAST_INSERT_ID();

INSERT INTO BOT(DESCRIPCION, ID_EMPRESA, ESTADO, MODO_NAVEGACION, TIPO_CLIENTE, CREADO_EL, CREADO_POR, NIVEL_EXTENDIDO,ID_FORMATO_MP,MONEDA,COD_MONEDA)
VALUES (@NombreBOT, @EmpresaID,1,1,1,NOW(),@creadoPor,1,2,@Moneda,@CodMoneda);

SELECT @BotID :=  LAST_INSERT_ID();

/* SE INSERTA EL HORARIO PARA EL HORARIO DEL BOT */

INSERT INTO HORARIO_BOT (ID_BOT, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
VALUES (@BotID, '06:00:00', '05:59:00', '1111111', NOW(), @creadoPor);

/* SE INSERTA EL TIPO DE CLIENTE */

INSERT INTO TIPO_CLIENTE(ID_EMPRESA, NOMBRE_TIPO, ESTADO, SISTEMA, CREADO_POR)
VALUES(@EmpresaID, 'Otro', 1, 1, @creadoPor);

/* SE INSERTAN LOS ESTADOS */

INSERT INTO ESTADOS (ID_EMPRESA, NOMBRE, COLOR_PATH, ORDEN, ESTADO, PAUSA, ELIMINADO, SISTEMA, ACTIVO, MOSTRAR, CREADO_POR)
VALUES (@EmpresaID, 'ACTIVO', 'verde.png', 1, 1, 0, 0, 1, 1, 1, @creadoPor);

INSERT INTO ESTADOS (ID_EMPRESA, NOMBRE, COLOR_PATH, ORDEN, ESTADO, PAUSA, ELIMINADO, SISTEMA, ACTIVO, MOSTRAR, CREADO_POR)
VALUES (@EmpresaID, 'BOT', 'verde.png', 3, 1, 1, 0, 1, 0, 1, @creadoPor);

INSERT INTO ESTADOS (ID_EMPRESA, NOMBRE, COLOR_PATH, ORDEN, ESTADO, PAUSA, ELIMINADO, SISTEMA, ACTIVO, MOSTRAR, CREADO_POR)
VALUES (@EmpresaID, 'PAUSA', 'amarillo.png', 4, 1, 1, 0, 1, 0, 1, @creadoPor);

INSERT INTO ESTADOS (ID_EMPRESA, NOMBRE, COLOR_PATH, ORDEN, ESTADO, PAUSA, ELIMINADO, SISTEMA, ACTIVO, MOSTRAR, CREADO_POR)
VALUES (@EmpresaID, 'INACTIVO', 'rojo.png', 20, 1, 1, 0, 1, 0, 1, @creadoPor);

INSERT INTO ESTADOS (ID_EMPRESA, NOMBRE, COLOR_PATH, ORDEN, ESTADO, PAUSA, ELIMINADO, SISTEMA, ACTIVO, MOSTRAR, CREADO_POR)
VALUES (@EmpresaID, 'AUSENTE', 'rojo.png', 21, 1, 1, 0, 1, 0, 1, @creadoPor);

/* SE INSERTAN LOS TIPOS DE GESTION */

INSERT INTO TIPOS_GESTION(ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES(@EmpresaID, 'Consultas', 1, 0, @creadoPor, 1);

INSERT INTO TIPOS_GESTION(ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES(@EmpresaID, 'Derivacion Bot a Asesor', 1, 0, @creadoPor, 0);

INSERT INTO TIPOS_GESTION(ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES(@EmpresaID, 'Derivacion Asesor a Bot', 1, 0, @creadoPor, 0);

INSERT INTO TIPOS_GESTION(ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES(@EmpresaID, 'Compra realizada exitosamente', 1, 0, @creadoPor, 0);

SELECT @ID_GESTION_COMPRA := LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION(ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES(@EmpresaID, 'Cierre por inactividad de cliente con Bot', 1, 0, @creadoPor, 0);

SELECT @ID_GESTION_INACTIVIDAD := LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION(ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES(@EmpresaID, 'Derivacion De Conversacion a Otro Skill', 1, 0, @creadoPor, 0);

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES (@EmpresaID, 'Cierre por solicitud de orden de pedido', 1, 0, @creadoPor, 0);

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES (@EmpresaID, 'Solicitud de Contacto', 1, 0, @creadoPor, 0);

SELECT @IDTipoGestionContacto :=  LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES (@EmpresaID, 'Operadores no Disponibles', 1, 0, @creadoPor, 0);

SELECT @IDTipoGestionOperadorNoDisponible :=  LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, VISIBLE)
VALUES (@EmpresaID, 'Fuera de Horario', 1, 0, @creadoPor, 0);

SELECT @IDTipoGestionFueraHorario :=  LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Caso Finalizado', 1, 0, 0, NOW(), @creadoPor);

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Cierre de conversación por inactividad del cliente con el operador', 1, 0, 0, NOW(), @creadoPor);

SELECT @IDTipoGestionInactividad := LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Notificaciones', 1, 0, 0, NOW(), @creadoPor);

SELECT @IDTipoGestionNotificaciones := LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_POR, CREADO_EL)
VALUES (@EmpresaID, 'Cierre por rechazo de contacto de Facebook', 1, 0, 0, @creadoPor, NOW());

SET @vTipoGestionCierreContactoFBComments := LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL, VISIBLE) 
VALUES (@EmpresaID, 'Inactividad del cliente mayor a 24 horas.', 1, 0, @creadoPor, NOW(), 0);

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL, VISIBLE) 
VALUES (@EmpresaID, 'Inactividad del cliente mayor a 7 días.', 1, 0, @creadoPor, NOW(), 0);

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_POR, CREADO_EL)
VALUES (@EmpresaID, 'Sesión Expirada', 1, 0, 0, @creadoPor, NOW());

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_POR, CREADO_EL)
VALUES (@EmpresaID, 'Términos y condiciones rechazados por el cliente', 1, 0, 0, @creadoPor, NOW());

SET @vGestionTyC := LAST_INSERT_ID();

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, CREADO_POR, CREADO_EL)
VALUES (@EmpresaID, 'Conversación Finalizada Contacto', 1, 0, 1, @creadoPor, NOW());

SET @V_ID_GESTION_CONTACTO_FINALIZADO := LAST_INSERT_ID();

/*	SE INSERTA EL SKILL DE SISTEMA	*/
INSERT INTO SKILLS (ID_EMPRESA, NOMBRE_SKILL, ESTADO, ORDEN, ELIMINADO, SISTEMA, VISIBLE, CREADO_POR, MENSAJE)
VALUES (@EmpresaID, 'Atención General', 1, 0, 0, 1, 1, @creadoPor, 'Lo sentimos nos encontramos fuera de horario. Por favor intente de nuevo en horario hábil de oficina.');

SELECT @idSkill := LAST_INSERT_ID();

/* SE INSERTA EL REGISTRO PARA EL HORARIO DEL SKILL */

INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
VALUES (@idSkill, '14:00:00', '00:00:00', '1111100', NOW(), @creadoPor);

INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
VALUES (@idSkill, '14:00:00', '23:00:00', '0000010', NOW(), @creadoPor);

INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
VALUES (@idSkill, '14:00:00', '20:00:00', '0000001', NOW(), @creadoPor);

/* SE INSERTAN LOS TIPOS DE RESOLUCIONES */

INSERT INTO TIPOS_RESOLUCIONES(ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR)
VALUES(@EmpresaID, 'Se solvento correctamente', 1, 0, 0, @creadoPor);

SELECT @paramDefecto := CAST(ID_TIPO_RESOLUCION as char(200)) FROM TIPOS_RESOLUCIONES WHERE ID_EMPRESA = @EmpresaID AND RESOLUCION = 'Se solvento correctamente' ;

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR)
VALUES(@EmpresaID, 'Conversación finalizada por solicitud de orden de pedido', 1, 0, 0, @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR)
VALUES (@EmpresaID, 'Webchat: Conversación finalizada por el cliente.', 1, 0, 1, @creadoPor);

SELECT @idResWebchat := LAST_INSERT_ID();

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR)
VALUES (@EmpresaID, 'Conversación finalizada por no tener operadores disponibles', 1, 0, 1, @creadoPor);

SELECT @IDTipoResolucionOperadorNoDisponible := LAST_INSERT_ID();

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_POR)
VALUES (@EmpresaID, 'Conversación finalizada por horario inhabil', 1, 0, 1, @creadoPor);

SELECT @IDTipoResolucionFueraHorario := LAST_INSERT_ID();

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Conversación finaliza por ausencia de operadores', 1, 0, 1, NOW(), @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Conversación finaliza por caso cerrado', 1, 0, 1, NOW(), @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Cierre de conversación por inactividad del cliente con el operador', 1, 0, 1, NOW(), @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 'Cierre por conversación mayor a 24 horas, desde el último mensaje del cliente.', 1, 0, 1, NOW(), @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 'Cierre por conversación mayor a 7 días, desde el último mensaje del cliente.', 1, 0, 1, NOW(), @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES(ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 'Cierre de conversación por sesión expirada.', 1, 0, 1, NOW(), @creadoPor);

INSERT INTO TIPOS_RESOLUCIONES(ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 'Conversación Finalizada Contacto', 1, 0, 1, NOW(), @creadoPor);

SET @V_ID_RESOLUCION_CONTACTO_FINALIZADO := LAST_INSERT_ID();

INSERT INTO TIPOS_RESOLUCIONES(ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 'Cliente rechaza recontacto fuera de horario.', 1, 0, 1, NOW(), @creadoPor);

SET @IDClienteRechazarecontacto := LAST_INSERT_ID();


/* SE INSERTAN REGISTROS DE CARTERAS */

-- INSERT INTO CARTERA (ID_EMPRESA, CARTERA, ORDEN, CREADO_POR) VALUES
-- (@EmpresaID, 'Tarjeta de Crédito', 1, @creadoPor),
-- (@EmpresaID, 'Hipoteca', 2, @creadoPor),
-- (@EmpresaID, 'Seguro', 3, @creadoPor);

/* SE INSERTAN LOS ATRIBUTOS DE LA FICHA */

INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Nombre completo','Sin Nombre completo', @EmpresaID, 1, 1, 1, 1, 'CF1', 1);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Departamento',460, @EmpresaID, 1, 1, 2, 1, 'CF4', 0);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Municipio',8246, @EmpresaID, 1, 1, 3, 1, 'CF5', 0);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Zona',8679, @EmpresaID, 1, 1, 4, 1, 'CF6', 0);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Correo Electrónico','Sin Correo Electrónico', @EmpresaID, 0, 1, 6, 1, 'CF2', 1);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Teléfono contacto','Sin Teléfono contacto', @EmpresaID, 0, 1, 10, 1, 'CF3', 1);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Dirección','Sin Dirección', @EmpresaID, 1, 1, 11, 0, 'CF11', 0);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('NIT','Sin NIT', @EmpresaID, 1, 1, 12, 0, 'CF10', 0);
INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, VALOR_PREDETERMINADO, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG, ESTADO) VALUES ('Nombre Factura','Sin Nombre Factura', @EmpresaID, 1, 1, 13, 0, 'CF12', 0);

-- INSERT INTO ATRIBUTOS_FICHA_CLIENTE (NOMBRE, ID_EMPRESA, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG) VALUES ('Cartera', @EmpresaID, 0, 1, 11, 1, 'CF7');
-- INSERT INTO ATRIBUTOS_FICHA_CLIENTE (ID_EMPRESA, NOMBRE, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG) VALUES (@EmpresaID, 'Código Moto', 1, 1, 12, 0, 'CF8');
-- INSERT INTO ATRIBUTOS_FICHA_CLIENTE (ID_EMPRESA, NOMBRE, REQUERIDO, VISIBLE, ORDEN, SISTEMA, TAG) VALUES (@EmpresaID, 'Placa', 1, 1, 12, 0, 'CF9');

/* ****************************************** */
/* SE INSERTAN LOS PARAMETROS DE LA EMRPESA   */ 
/* ****************************************** */

/* Grupo de ALERTAS */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,1,'ALERTAS','ALERTAR_EN_AMARILLO','Alerta amarilla: Active esta opción si desea recibir una notificacion cuando se alcance el limite de cola en amarillo.',@activar_alertas_amarillo,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','LIMITE_COLA_AMARILLO','Cola en amarillo: Cantidad de conversaciones en cola (nuevas) que disparara alerta amarilla.',@limite_amarillo,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,1,'ALERTAS','ALERTAR_EN_ROJO','Alerta rojo: Active esta opción si desea recibir una notificacion cuando se alcance el limite de cola en rojo.',@limite_rojo,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','LIMITE_COLA_ROJO','Cola en rojo: Cantidad de conversaciones en cola (nuevas) que disparara alerta roja.','10',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,4,'ALERTAS','CORREO_ALERTA','Correo de alerta: Listado de correos de representantes del cliente (separados por coma) que recibiran las alertas.',@Correo_cliente,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','INTERVALO_NOTIFICACION','Intervalo de notificación: establece el tiempo en minutos para cada cuanto se notificara al cliente desde la ultima notificación. ',@intervalo_notificacion_cliente,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,5,'ALERTAS','HORARIO_NOTIFICACION','Establece el horario de notificación de correos en formato de H-H(24h)',@horario_noti,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','PORCENTAJE_CONSUMO','Porcentaje de consumo para iniciar la alerta',@alerta_consumo,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,1,'ALERTAS','ACTIVAR_ALERTA_CONSUMO','Alerta consumo: active esta opción si desea recibir una notificacion cuando se alcance el limite de consumo.',@activar_alerta_consumo,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,4,'ALERTAS','CORREO_ALERTA_INTERNO','Correo de alerta: Listado de correos de CONSYSTEC (separados por coma) que recibiran las alertas.',@Correo_interno,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','LIMITE_INTERNO','Limite interno: Cantidad de conversaciones en cola (nuevas) que se notificara a CONSYSTEC. ',@limite_interno,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','INTERVALO_NOTIFICACION_INTERNO','Intervalo de notificacion interno: establece el tiempo en minutos para cada cuanto se notificara.',@intervalo_notificacion_interno,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,1,'ALERTAS','ALERTAR_EN_INTERNO','Alerta interna: Active esta opción si desea recibir una notificacion cuando se alcance el limite de interno.',@activar_alertas_internas,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'ALERTAS','PORCENTAJE_CONSUMO_INTERNO','Porcentaje interno de consumo para iniciar la alerta',@alerta_consumo_interno,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,1,'ALERTAS','ACTIVAR_ALERTA_CONSUMO_INTERNO','Alerta de consumo interna: active esta opción si desea recibir una notificacion cuando se alcance el limite de consumo interno..',@activar_alerta_consumo_interno,1,0,1,1,@creadoPor);

/* BOTS */

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,6 , @NombreBOT, 'BOTS_WHATSAPP_RESUMEN_VENTA','URL para finalizar la compra',CONCAT(@socketUrl,'/BotVentas/ResumenVenta.zul?confirma=@@Confirma&noventa=@@NoVenta&IdFicha=@@IdFicha&cIdEmpresa=@@IdEmpresa&cIdBotRedes=@@cIdBotRedes'),0,1,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,6 , @NombreBOT, 'BOTS_WHATSAPP_FICHA_CLIENTE','URL para ficha de cliente',CONCAT(@socketUrl,'/BotVentas/FichaCliente.zul?IdFicha=@@IdFicha&cIdEmpresa=@@IdEmpresa&noventa=@@NoVenta&confirma=@@Confirma&cIdBotRedes=@@cIdBotRedes'),0,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOT_ARBOL_ACTIVO','Indica si el bot de arboles se encuentra activo','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'BOT_USUARIO_INICIA','Indica que usuario debe iniciar las conversaciones:
1 - Asesores
2 - Bot de Arboles
3 - IA','2',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID, @BotID ,1 , @NombreBOT, 'BOT_IA_ACTIVO','Indica si la inteligencia artificial se encuentra activa','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_MENSAJE_SELECCION','Mensaje de selección: Mensaje que se muestra en las opciones de seleccion en whatsapp','Por favor selecciona una de nuestras siguientes opciones…',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_MENSAJE_REGRESAR_A_MENU','Mensaje ir a menú:Texto que se muestra en los menus de whatsapp como opcion a regresar al menu principal','Regresar al menú principal',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_MENSAJE_IR_A_CONSOLA','Mensaje contactar asesor: Indica la opcion a seleccionar para iniciar una conversacion con un asesor','Contacta a uno de nuestros asesores',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_MENSAJE_REGRESAR_NIVEL','Mensaje menú anterior:Texto que se muestra en los menus de whatsapp como opcion para regresar al menu anterior','Regresar al menú anterior',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_TEXTO_BOTON_SIGUIENTE','Boton siguiente: Texto de boton que se muestra en el paginador','_Siguiente..._ 🔜',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_TEXTO_BOTON_MENUS','Boton menú: Texto de boton que se muestra en los menus','_Ir a..._ 👈🏻',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,6 , @NombreBOT, 'BOTS_TEXTO_BOTON_COMPRA','Boton compra: Texto de boton que se muestra para realizar compra de paquete','_Realizar Compra_ 🛍',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_FINALIZAR COMPRA','Texto fin compra: Texto para finalizar compra','Si tus datos están correctos ingresa a la siguiente dirección\n@@LINK_VENTA\n\nSi deseas actualizar tus datos ingresa a la siguiente dirección\n@@LINK_CLIENTE',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'TIPO_GESTION_1','ID Tipo Gestion al finalizar una venta exitosa',@ID_GESTION_COMPRA,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'TIPO_GESTION_2','ID Tipo Gestion cuando una venta es cancelada por cierre desde la consola',@ID_GESTION_INACTIVIDAD,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'TIPO_GESTION_3','ID Tipo Gestion cuando la venta es cancelada por timeout',@ID_GESTION_INACTIVIDAD,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'BOT_HORA_DEL','Minutos para eliminar una venta','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'BOT_HORA_DEL_WEB','Minutos de expiracion de la venta en la pagina Web','45',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_CARRITO_VACIO','Mensaje cuando el carrito de compras se encuentra vacio','_Tu carrito se encuentra vacio_ 🛒',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOT_WHATSAPP_ENCABEZADO_CARRITO','ENCABEZADO DE CARRITO DE COMPRAS','_*Tu carrito de compras:*_ 🛒',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'BOT_CANCELAR_DERIVACION_ASESOR','Tiempo para la cancelacion de una venta cuando se ha derivado a un asesor','45',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,2 , @NombreBOT, 'TIEMPO_INACTIVIDAD_BOT','(Seguimiento/Cierre) - Tiempo de inactividad del cliente con el BOT (expresado en minutos)',@TIEMPO_INACTIVIDAD,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'MENSAJE_BIENVENIDA','Mensaje de bienvenida (Coloca @@Nombre y @@Apellido para enviar el nombre y apellido del cliente)','👋🏻😊 *Bienvenido @@Nombre @@Apellido al sistema de atención al cliente, cuéntanos en que te podemos servir?.*',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_OPCION_INCORRECTA','Mensaje de Opcion incorrecta','Ups… vuelve a intentarlo, recuerda debes enviar la opción que deseas del menú.',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOT_WHATSAPP_SEGUIR_COMPRANDO','Mensaje a mostrar para indicar que puede seguir comprando','_Seguir comprando_ 🧺',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_INSTRUCCIONES_BUSCADOR','Mensaje de las instrucciones a ser enviadas cuando se envia el nodo del buscador','Por favor selecciona una de nuestras siguientes opciones…',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_HOJAS','Indica si se deben enviar las hojas cuando el cliente envia un comando incorrecto','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_RAMAS','Indica si solo se deben enviar menus y submenus cuando el cliente envia un comando incorrecto','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,3 , @NombreBOT, 'BOTS_PORCENTAJE_COINCIDENCIAS_BUSCADOR','Porcentaje de coincidencias para el buscador','0.0001',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_CA','Indica si se debe enviar el comando de contactar a un asesor','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_CC','Indica si se debe enviar el comando de cancelar compra','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_E','Indica si se debe enviar el comando de eliminar producto','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_FC','Indica si se debe enviar el comando de finalizar conversacion','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_M99','Indica si se debe enviar el comando de consultar carrito','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_MA','Indica si se debe enviar el comando de menu anterior','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_MP','Indica si se debe enviar el comando de menu principal','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_SC','Indica si se debe enviar el comando de continuar comprando','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_ENVIAR_TC','Indica si se debe enviar el comando de finalizar compra','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_ERROR_CONSULTA_WS','Mensaje de error cuando no se puede obtener una respuesta de un Webservice','🤭 Lo sentimos, en estos momentos no es posible atender tu solicitud, favor intenta de nuevo más tarde.',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_FORMULARIO_FINALIZADO','Mensaje final de formularios','_ Es un gusto atenderle en nuestro servicio automático de atención al cliente_🤖',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_FINALIZAR_CONVERSACION','Mensaje de instrucciones para finalizar conversaciones de whatsapp','_Finalizar Conversación_ 📵',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'MENSAJE_INSTRUCCIONES_BUSCADOR','Mensaje de instrucciones como encabezado del resultado del buscador','Hemos encontrado lo siguiente, para responder envía el comando que se encuentra entre paréntesis.',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID, 7 , @NombreBOT, 'MENSAJE_MANTENIMIENTO','Mensaje para ser enviado cuando se encuentre un bot en mantenimiento','Lo sentimos, en este momento no es posible atender tu solicitud, nos encontramos fuera de linea, favor intenta de nuevo más tarde.',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,6 , @NombreBOT, 'URL_FORMULARIO_WS_RESPUESTA','Url para que los formularios puedan responder al final de la encuesta',CONCAT(@socketUrl,'/WsBotsRRSS/rest/wsformresponse/get_response/@@bot/@@palabra_clave'),1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_MENSAJE_DESPEDIDA','Mensaje de despedida cuando el cliente finaliza la conversacion.','_*Gracias por tu atención, esperamos que vuelvas!*_ 🙋‍♀',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOT_WHATSAPP_ELIMINAR_PRODUCTO','Mensaje para eliminar un producto','_Eliminar un producto_ ⛔',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_TERMINAR_COMPRA','Mensaje para terminar una compra','_Terminar tu compra_ 🛍',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_PRODUCTO_AGREGADO','Mensaje cuando un producto es agregado al carrito','*Producto agregado al carrito correctamente.*  🧺',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_MONTO_CARRITO','Mensaje que indica el monto total del carrito de compras de un cliente','_El monto de tu carrito es:_  *@@MONTO*  🛍',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_PRODUCTO_ELIMINADO','Mensaje de confirmando la eliminación de un producto del carrito','*Producto eliminado del carrito.* ⛔',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_CONSULTAR_CARRITO','Mensaje del comando para consultar el carrito','_Consultar Carrito_',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_WHATSAPP_CANCELAR_COMPRA','Mensaje del comando de cancelar compra','_Cancelar Compra_',0,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_CONSULTAR_ASESOR','Mensaje cuando el cliente es transferido a un operador por el BOT de Atencion','_Por favor espere, en unos instantes estará siendo atendido por uno de nuestros representantes._👩🏻‍💻',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_GENERAL_COMMANDO_BOLD','Indica si el comando se debe colocar el NEGRILLA','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_GENERAL_COMANDO_CURSIVA','Indica si el comando se debe colocar el CURSIVA','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 , @NombreBOT, 'BOTS_GENERAL_SEPARADOR','Separador utilizado para los mensajes de whatsapp','',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1 , @NombreBOT, 'BOTS_GENERAL_MOSTRAR_MENU_RESPUESTA_TEXTOS','Indica si se debe incluir el titulo del menu en las respuestas de texto','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,6 , @NombreBOT, 'WS_FACEBOOK_USERNAME_URL','URL para obtener nombre y apellido de facebook','https://graph.facebook.com/v4.0/@@IDFACEBOOK?fields=first_name,last_name&access_token=@@PAGEACCESSTOKEN',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) VALUES (@EmpresaID, @BotID, 1 , @NombreBOT, 'BOTS_MOSTRAR_CARRITO_AGREGAR_PRODUCTO','Indica si se debe mostrar el carrito al agregar un producto al mismo','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) VALUES (@EmpresaID, @BotID, 7 , @NombreBOT, 'BOTS_PRODUCTO_ENVIO','Comando a ser ejecutado al agregar un producto al carrito indicando el envio','ENVIO',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) VALUES (@EmpresaID, @BotID, 7 , @NombreBOT, 'BOTS_COMANDO_CONSULTAR_CARRITO_ALT','Comando alterno para consultar el carrito','9999999',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) VALUES (@EmpresaID, @BotID, 7 , @NombreBOT, 'BOTS_COMANDO_FINALIZAR_COMPRA_ALT','Comando alterno para finalizar la compra','99999990',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) VALUES (@EmpresaID, @BotID, 7 , @NombreBOT, 'BOTS_COMANDO_CANCELAR_COMPRA_ALT','Comando alterno para cancelar la compra','*99999933',1,1,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) VALUES (@EmpresaID, @BotID, 1 , @NombreBOT, 'BOTS_DERIVAR_FINALIZAR_COMPRA','Indica si se debe derivar a un asesor al finalizar una compra','0',1,1,1,1,@creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`,`ID_BOT`,`ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) 
VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'BOTS_FORMATO_OPCIONES_COMPRAS', 'Formato del menu inferior para el carrito de compras al mostrarlo cuando se agrega un producto al mismo', '_Envía_ *@comando* para @accion', @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`)
VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOTS_VALIDAR_OPERADORES_SKILLS', 'Indica si se deben validar los operadores conectados al realizar una derivacion por skill', 0, @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOTS_PREGUNTAR_RECONTACTO_CLIENTE', 'Indica si se desea preguntar al cliente ser contactado en horario habil cuando el cliente contacta en horario inhabil', '1', @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) 
VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'BOTS_LIMITE_BUSCADOR', 'Cantidad de registros ha ser devuelto al realizar la busqueda por TAGS', '10', @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'CONTACTO_PROGRAMADO', 'Habilita la funcionalidad de Contacto Programado en este Canal.', 0, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'PERMITIR_CONTACTO', 'WhatsApp: Permite contactar al cliente si este no cuenta con una sesión activa.', 1, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID,1,@BotID,@NombreBOT,'ENVIAR_MENU_INTERACTIVO','Indica si los menús del canal deben enviarse como interactivos.','1', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'BOTS_INSTRUCCIONES_RECONTACTO', 'Mensaje de instrucciones para indicar si se desea que el cliente sea contactado en el siguiente horario habil', '👋🏻 Saludos, gracias por contactarnos, 🤳🏻  en este momento no podemos atenderle o nos encontramos fuera de horario 🕜.\n\n¿Desea ser contactado 📲 en cuanto estemos disponibles o retomemos labores, en el horario hábil?\n\nPor favor responda SI ó NO.', @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'BOT_CONFIRMACION_RECONTACTO', 'Mensaje de confirmacion cuando el cliente solicita ser recontactado en horario habil', 'Gracias por su comunicación, 📲 nos estaremos comunicando en cuanto retomemos labores, en nuestro horario hábil ! 👩🏻‍💻', @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'BOT_TIPO_GESTION_RECONTACTO', 'Tipo Gestion para solicitud de contacto en horario inhabil', @IDTipoGestionContacto, @creadoPor,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'MENSAJE_OPERADORES_NO_DISPONIBLES', 'Mensaje cuando no hay operadores conectados para atender a una solicitud de un cliente', '👋🏻 *Saludos, gracias por contactarnos,* 🤳🏻  _en este momento no podemos atenderle_ 👤.\n\n_*Favor intenta de nuevo más tarde.*_', @creadoPor,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'ID_RESOLUCION_SIN_OPERADORES', 'ID Tipo Resolucion cuando no hay operadores disponibles', @IDTipoResolucionOperadorNoDisponible, @creadoPor,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'ID_RESOLUCION_HORARIO_INHABIL', 'ID Tipo Resolucion cuando no hay horario hábil', @IDTipoResolucionFueraHorario, @creadoPor,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'ID_TIPO_GESTION_SIN_OPERADORES', 'ID Tipo Gestion cuando no hay operadores disponibles', @IDTipoGestionOperadorNoDisponible, @creadoPor,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'ID_TIPO_GESTION_HORARIO_INHABIL', 'ID Tipo Gestion cuando no hay horario hábil', @IDTipoGestionFueraHorario, @creadoPor,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOT_ENVIAR_PARENTESIS_COMANDOS', 'Indica si se debe enviar el comando entre parentesis', 1, @creadoPor,1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOT_FACEBOOK_ENVIAR_MENU_TEXTO', 'Indica si se debe enviar el menu de Facebook como texto acompañado del listado de opciones', 1, @creadoPor,1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOT_ENVIAR_COMANDO', 'Indica si se debe enviar el comando', 1, @creadoPor,1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOT_CERRAR_CONVERSACION_FUERA_HORARIO', 'Indica si se debe cerrar la conversacion cuando se encuentra en fuera de horario', 1, @creadoPor,1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOT_SIEMPRE_ENVIAR_MSJ_BIENVENIDA', 'Indica si siempre se debe enviar el mensaje de bienvenida', 0, @creadoPor,1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'BOT_TRUNCAR_NOMBRE', 'Indica si se debe truncar el nombre a la hora de enviar el mensaje de bienvenida', 0, @creadoPor,1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'DERIVACION_SKILL_PASARELA_PAGO', 'Indica si se debe realizar una derivacion a skill al finalizar una compra desde la pasarela de pagos', '1', @creadoPor, 1);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `OBLIGATORIO`, `CREADO_POR`, VISIBLE) 
VALUES (@EmpresaID, @BotID, 6, @NombreBOT, 'BOT_URL_WS_NOTIFICACIONES', 'URL para el consumo de envio de notificaciones', CONCAT(@URLEnvioNotificaciones,'/WsBotsRRSS/rest/notifications'), 1, @creadoPor,0);


INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`, `CREADO_POR`) 
VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'WS_NOTIFICACION', 'Parametro de ID gestion para la tipificacion de conversaciones al realizar una notificacion', @IDTipoGestionNotificaciones, 1, 0, 1, 1, 'renato.jop');

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`,`CREADO_POR`) 
VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'BOT_INTENTOS_FALLIDOS', 'Indica la cantidad de intentos fallidos antes de derivar la conversacion a la cola de atencion', '3', 1, 1, 1, 1,@creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`,`CREADO_POR`) 
VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'BOT_PWA_MENSAJE_CARRITO', 'Mensaje de instrucciones enviados desde el e-commerce', 'Te enviamos el resumen de tu compra', 1, 1, 1, 1,@creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_BOT`, `ID_REGEX`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`, VISIBLE) 
VALUES (@EmpresaID, @BotID, 1, @NombreBOT, 'PAY_ENVIAR_BANCO', 'Indica si se debe realizar la accion de compra con la pasarela del Banco', '0', @creadoPor, 0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`,`CREADO_POR`) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'CANCELA_DERIVA', 'Indica la acción que se debe realizar por el proceso de inactividad del cliente con el bot: 0 = Cierre de conversación 1 = Siempre derivar la conversación a consola 2 = Derivación de la conversación a consola únicamente por intentos fallidos', '0', 1, 1, 1, 1,@creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'BOT_RADIO_BUSQUEDA_SUCURSALES', 'Radio de busqueda para el envio de sucursales representado en Kilometros', '5', @creadoPor);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `CREADO_POR`) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'BOT_LIMITE_BUSQUEDA_SUCURSALES', 'Indica la cantidad de sucursales que serán presentados al cliente a la hora de una busqueda geolocalizada', '10', @creadoPor);

INSERT INTO `PARAMETROS` (`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`, `CREADO_POR`) 
VALUES (@EmpresaID, '1', @BotID, @NombreBOT, 'TIPO_SUSCRIPCION_OPTIN', 'Indica si la suscripción a notificaciones de Whatsapp es por Suscripción General (activado) o Suscripción por Categorías (desactivado).', '1', '1', '1', '1', '0', @creadoPor);

INSERT INTO `PARAMETROS` (`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`, `CREADO_POR`) 
VALUES (@EmpresaID, '1', @BotID, @NombreBOT, 'OPTIN_ALTA_AUTOMATICA', 'Indica si se puede hacer un alta de optin automatica a un numero no suscrito al utilizar el servicio de notificaciones (0=no, 1=si)', '0', '1', '1', '1', '0', @creadoPor);

INSERT INTO `PARAMETROS` (`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`, `VISIBLE_CSTK`, `VISIBLE`, `OBLIGATORIO`, `ORDEN`, `CREADO_POR`) 
VALUES (@EmpresaID, '1', @BotID, @NombreBOT, 'SUSCRIPCION_PLANTILLA', '(OPTIN) Indica si se permite suscribir al cliente desde el contacto por plantilla.', '0', '1', '0', '1', '0', @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'BOT_REVISAR_TERMINOS_CONDICIONES_IMPLICITO', 'Indica si se debe solicitar al cliente aceptar los términos y condiciones de forma implícita para poder continuar interactuando con el Bot.', 0, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'BOT_MENSAJE_TERMINOS_CONDICIONES_IMPLICITO', 'Mensaje que se debe enviar indicando las instrucciones de los términos y condiciones que deben ser aceptados por el cliente cuando los términos y condiciones se acepten de forma implicita.', 'Al continuar con esta conversación, usted está aceptando los términos y condiciones de uso para nuestro servicio.', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'BOT_REVISAR_TERMINOS_CONDICIONES','Indica si se debe solicitar al cliente aceptar los términos y condiciones para poder continuar interactuando con el Bot.', 0, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'BOT_MENSAJE_TERMINOS_CONDICIONES', 'Mensaje que se debe enviar indicando las instrucciones de los términos y condiciones que deben ser aceptados por el cliente.', 'Para usar este servicio debes aceptar nuestros términos y condiciones. 
 
 ¿Aceptas nuestros términos y condiciones? Envía *SI* o *NO*', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'BOT_MENSAJE_TERMINOS_CONDICIONES_RECHAZADOS', 'Mensaje que se debe enviar cuando el cliente rechaza los términos y condiciones.', 'Lo sentimos, para poder utilizar este servicio, debes aceptar nuestros términos y condiciones.', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'BOT_GESTION_TYC_RECHAZADOS', 'ID tipo gestion cuando el cliente rechaza los términos y condiciones.', @vGestionTyC, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'DERIVACION_DETALLADA_SKILL', 'Habilita el cierre detallado para la derivación por skill en este canal.', '1', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'MENSAJE_RECONTACTO', 'Mensaje que se enviará a los clientes cuando sea recontactado.', 'Saludos, estamos dando seguimiento a su solicitud de contactarlo, podría indicarnos en que podemos ayudarlo.', 1, 1, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'VALIDAR_CONVERSACION_NUEVA_SKILL', '(Deriva directo) Habilita derivación directa a operador por cierre menor a X minutos.', 0, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'TIEMPO_CONVERSACION_NUEVA_SKILL', '(Deriva directo) Tiempo máximo en minutos que será considerado para enviar a cola una conversación nueva con el Skill de la ultima conversación del cliente.', 0, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'BROADCAST_SUSCRIPCION_AUTOMATICA_OPTIN', 'Parametro para habilitar carga de numeros para broadcast (Individual/Masivo) que no tengan optin activado previamente, su suscripcion de optin sera realizada automaticamente en el envio del mensaje.', '1', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'ACCION_CONVERSACION_SP_WS_24_HORAS', 'Indica si las conversaciones de WhatsApp, Facebook e Instagram se deben finalizar o bloquear luego de alcanzar y/o superar las 24 horas de inactividad (Activado=finaliza; Desactivado=bloquea).', 1, 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS(ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'BOT_TIPO_GESTION_NO_RECONTACTO', 'Tipo Gestion Resolución para rechazar solicitud de contacto en horario inhabil', @IDClienteRechazarecontacto, 1, 1, 1, 1, NOW(), @creadoPor);

/* PARAMETROS DE S3 */
INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`,CREADO_POR,VISIBLE_CSTK,VISIBLE) 
VALUES (@EmpresaID,7,@BotID,CONCAT('FTP - BOT ',@NombreBOT),'PATH_ARCHIVOS_CONSOLA','Path relativo a colocar los archivos enviados cliente a consola y viceversa',CONCAT('archivos_consola/',@FOLDER_FILES),@creadoPor,1,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`,CREADO_POR,VISIBLE_CSTK,VISIBLE) 
VALUES (@EmpresaID,7,@BotID,CONCAT('FTP - BOT ',@NombreBOT),'PATH_ARCHIVOS_BOT','Path relativo a colocar los archivos del administrador de BOTS',CONCAT('archivos_bot/',@FOLDER_FILES),@creadoPor,1,0);

INSERT INTO `PARAMETROS`(`ID_EMPRESA`, `ID_REGEX`, `ID_BOT`, `AGRUPACION`, `NOMBRE`, `DESCRIPCION`, `VALOR`,CREADO_POR,VISIBLE_CSTK,VISIBLE) 
VALUES (@EmpresaID,1,@BotID,CONCAT('FTP - BOT ',@NombreBOT),'REPOSITORIO_S3','Utilizar Amazon S3 para el alojamiento de archivos de las conversaciones.',@UTILIZAR_S3, @creadoPor,1,0);

-- -----------------------------------------------
-- INICIO - PARAMETROS CONTACTO FACEBOOK/INSTAGRAM
-- -----------------------------------------------

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'PERMITIR_CONTACTO_FACEBOOK', 'FACEBOOK: Permite contactar al cliente sin ventana activa, (último mensaje de cliente superior a 24h).', 1, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'PERMITIR_CONTACTO_INSTAGRAM', 'INSTAGRAM: Permite contactar al cliente sin ventana activa, (último mensaje de cliente superior a 24h).', 0, 1, 0, 1, 1, NOW(), @creadoPor);

-- -----------------------------------------------
-- FIN - PARAMETROS CONTACTO FACEBOOK/INSTAGRAM
-- -----------------------------------------------

-- -----------------------------------------------
-- INICIO - PARAMETROS CONTACTO FINALIZADO
-- -----------------------------------------------

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'CONVERSACION_CERRADA_CONTACTO', 'API WhatsApp: Indica si la conversación de contacto se crea finalizada o en atención (activado=finalizada, desactivado=atención).', '1', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'TIPO_GESTION_CONTACTO_CERRADO', 'Tipo de Gestión para las conversación de contacto que se crean finalizadas.', @V_ID_GESTION_CONTACTO_FINALIZADO, 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'TIPO_RESOLUCION_CONTACTO_CERRADO', 'Tipo de resolución para las conversación de contacto que se crean finalizadas.', @V_ID_RESOLUCION_CONTACTO_FINALIZADO, 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'DESCRIPCION_RESOLUCION_CONTACTO_CERRADO', 'Descripción de resolución para las conversación de contacto que se crean finalizadas.', 'Contactos, conversación finalizada.', 1, 0, 1, 0, NOW(), @creadoPor);

-- -----------------------------------------------
-- FIN - PARAMETROS CONTACTO FINALIZADO
-- -----------------------------------------------

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'RECONTACTO_PLANTILLA_B11', 'Indica si se habilitara por canal la opcion "Recontacto cliente" en conversaciones bloqueadas (estado 11) para api whatsapp oficial, 1-Mostrar , 0-Ocultar.', '1', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'CANAL_SKILL_PREDETERMINADO', 'Skill al que se asociaran las conversaciones del canal cuando estas sean enviadas a la cola de atención si como parte del flujo no se especifica un skill (para deshabilitar el parámetro especifique un valor menor o igual a cero).', '0', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES(@EmpresaID, 1, @BotID, @NombreBOT, 'VOICE_MSJ_WHATSAPP', 'Notas de voz: Habilita el envío de mensajes de audio en WhatsApp desde la seccion de operador y supervisor.', 0, 1, 0, 1, 0, @creadoPor);

-- -----------------------------------------------
-- INICIO - PARAMETROS FTD CONSYSTEC
-- -----------------------------------------------

-- INSERT FTD_MAIL_TO

INSERT INTO PARAMETROS(ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, 4,'FTD', 'FTD_MAIL_TO',
        'Destinatario del correo electrónico, se pueden agregar más correos separados con comas.',
        'jose.castellanos@consystec-corp.com,giovani.montalvo@consystec-corp.com', 1, 0, 1, 1, @creadoPor);

-- INSERT FTD_INSTANCIA_HOST
INSERT INTO PARAMETROS(ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, 6 ,'FTD', 'FTD_INSTANCIA_HOST', 'URL del host para envio al repositorio de la empresa indicado.','certificacion.talkme.pro', 0, 0, 0, 1, @creadoPor);

-- INSERT FTD_INSTANCIA_PORT
INSERT INTO PARAMETROS(ID_EMPRESA,ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, 2 ,'FTD', 'FTD_INSTANCIA_PORT', 'Puerto para envio de ftp a la empresa indicada.',22, 0, 0, 0, 1, @creadoPor);


-- INSERT FTD_INSTANCIA_USER
INSERT INTO PARAMETROS(ID_EMPRESA,ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID,7 ,'FTD', 'FTD_INSTANCIA_USER', 'Usuario para envio por ftp de la empresa indicada.','archivos_talkme', 0, 0, 0, 1, @creadoPor);

-- INSERT FTD_INSTANCIA_PASSWORD
INSERT INTO PARAMETROS(ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, 7 ,'FTD', 'FTD_INSTANCIA_PASSWORD', 'Contraseña para envio por ftp de la empresa indicada.','nU2$uQ4*eG1<gJ5?', 0, 0, 0, 1, @creadoPor);

-- INSERT FTD_INSTANCIA_PATH
INSERT INTO PARAMETROS(ID_EMPRESA,ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, 7 ,'FTD', 'FTD_INSTANCIA_PATH', 'Ruta para el envio del archivo por ftp a la empresa indicada.','/archivos/FTD_Consystec/', 0, 0, 0, 1, @creadoPor);

-- INSERT FTD_ENVIO_CONVERSACIONES
INSERT INTO PARAMETROS(ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, 1,'FTD', 'FTD_ENVIO_CONVERSACIONES', 'Parametro utilizado para habilitar el envio por ftp de las conversaciones al repositorio del cliente indicado',1, 0, 0, 0, 1, @creadoPor);

-- INSERT FTD_FECHA_INICIO_EXTRACCION_DATOS
INSERT INTO PARAMETROS(ID_EMPRESA,ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, null,'FTD', 'FTD_FECHA_INICIO_EXTRACCION_DATOS', 'fecha inicial para la extracción de conversaciones','NOW()', 0, 0, 0, 1, @creadoPor);

-- INSERT FTD_FECHA_INICIO_EXTRACCION_DATOS
INSERT INTO PARAMETROS(ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, null ,'FTD', 'FTD_FECHA_FIN_EXTRACCION_DATOS', 'fecha final para la extracción de conversaciones','NOW()', 0, 0, 0, 1, @creadoPor);


-- INSERT SN_REP_FTD
INSERT INTO PARAMETROS(ID_EMPRESA, ID_BOT,ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO,ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 1 ,@NombreBOT, 'SN_REP_FTD', '(Activa/Desactiva) Funcionalidad completa para el envio de chats.',0, 1, 0, 0, 1, @creadoPor);

-- -----------------------------------------------
-- FIN - PARAMETROS FTD CONSYSTEC
-- -----------------------------------------------

/* BROADCAST */
INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'BROADCAST','BROADCAST_API_URL','URL a consumir para el envío de los SMS','http://159.89.32.139:4002',0,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'BROADCAST','BROADCAST_API_PASSWORD','Contraseña del API para el envío de los SMS','c0n5y5t3c.',0,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'BROADCAST','BROADCAST_API_USERNAME','Usuario del API para el envío de los SMS','consystec',0,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,3,'BROADCAST','COSTO_SMS','Indica el costo de envío de cada mensaje para sms','0.5',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,9,'BROADCAST','FECHA_FIN_TRIAL','Fin periodo de prueba: Especifica la fecha de fin del periodo de prueba de broadcast para la empresa. Especificar la fecha en el formato yyyy-MM-dd, ej. 2019-01-31','',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,9,'BROADCAST','FECHA_INICIO_TRIAL','Inicio periodo de prueba: Especifica la fecha de inicio del periodo de prueba de broadcast para la empresa. Especificar la fecha en el formato yyyy-MM-dd, ej. 2019-01-05','',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'BROADCAST','LIMITE_SMS','Indica la cantidad de mensajes máximos que se pueden configurar para sms, -1 indica que es ilimitado','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'BROADCAST','MAX_NUMEROS','Cantidad Máxima de Números: Indica la cantidad máxima de números permitidos por broadcast.','50',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'BROADCAST','MONEDA_SMS','Moneda que se mostrará para el costo de sms.','Q',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'BROADCAST','SKILL_PREDETERMINADO','Skill Predeterminado: ID del skill que se utilizará para las conversaciones creadas desde el servicio de broadcast.',CONVERT(@idSkill, CHAR),0,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'BROADCAST','TRIAL','Periodo de prueba: Indica si la empresa tiene activo un periodo de prueba para broadcast.','0',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'BROADCAST','LIMITE_WHATSAPP','Indica la cantidad de mensajes máximos que se pueden configurar para whatsapp, -1 indica que es ilimitado.','2',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,3,'BROADCAST','COSTO_WHATSAPP','Indica el costo de envío de cada mensaje para whatsapp.','0.25',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'BROADCAST','MONEDA_WHATSAPP','Moneda que se mostrará para el costo de whatsapp.','Q',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'BROADCAST','MOSTRAR COSTO WHATSAPP','Indica si se muestra o no el costo del envío de mensajes por whatsapp.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'BROADCAST','MOSTRAR COSTO SMS','Indica si se muestra o no el costo del envío de mensajes por sms.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'BROADCAST','ID_BOT_REDES_CONVERSACION','ID del canal que se asociará a los broadcast de SMS para la creación de conversaciones.','0',1,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'BROADCAST','DIVIDIR_MENSAJE','Cantidad máxima de caracteres que el usuario podrá redactar en un mensaje de Broadcast SMS.','700',1,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'BROADCAST','LONGITUD_MENSAJE','Cantidad de caracteres que delimitan la longitud de una mensaje SMS y que corresponderá al consumo de 1 Hit.','160',1,0,1,0,@creadoPor);

/* ESTILOS */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'ESTILOS','CSS','Archivo CSS que contiene el look and feel de la aplicación.','',1,0,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'ESTILOS','FONDO MENU','Fondo aplicativo: Imagen que se utiliza de fondo para la seccion de inicio del menú principal.','',1,0,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'ESTILOS','IMG_FONDO','Imagen de fondo: Imagen que se utiliza como fondo en el chat del operador','',1,0,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'ESTILOS','LOGOTIPO','Logotipo: este indica el logo de la empresa que aparecerá en la pantalla principal.','',1,0,0,1,@creadoPor);

/* FICHA CLIENTE */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'FICHA CLIENTE','FICHA_UNICA','Indica si se habilita la funcionalidad de ficha única.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'FICHA CLIENTE','FICHA_UNICA_REQUERIDA','Formato que debe cumplir el campo que sirve de enlace en la ficha única [area-numero].','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'FICHA CLIENTE','FORMATO_CAMPO_ID','Formato que debe cumplir el campo que sirve de enlace en la ficha única [area-numero].','3-8',1,0,1,1,@creadoPor);

/* FTP */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'FTP','ALTO_IMAGEN_PX','Alto maximo de las imagenes en pixeles','1600',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'FTP','ANCHO_IMAGEN_PX','Ancho maximo de las imagenes en pixeles','1600',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'FTP','FTP Size','Peso máximo de los archivos de Consola',@FTP_SIZE,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'FTP','TAMANO_IMAGEN','Peso máximo de los archivos de BOT','5120',1,0,1,1,@creadoPor);

/* HISTORIAL */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'HISTORIAL','MAX_DIAS_BUSQUEDA','Cantidad Máxima de Días: Valor que indica la cantidad de días que abarcará la búsqueda.','30',1,0,1,1,@creadoPor);


INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR)
VALUES (@EmpresaID,2,'HISTORIAL','CONVERSACIONES_PAGINA','Número de conversaciones que se mostrarán por cada pagina en el listado de conversaciones.','10',1,1,1,0,NOW(),@creadoPor);

/* LICENCIA */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'LICENCIA','URL_VALIDAR_LICENCIA','Url donde se validará la licencia.','https://4viy2peggd.execute-api.us-east-1.amazonaws.com/prod/?CustomerId=',0,0,0,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'LICENCIA','VALIDAR_LICENCIA','Indica si a esta empresa se le valida la licencia','1',0,0,1,0,@creadoPor);

/* MENSAJES */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'MENSAJES','LONGITUD_MAXIMA_MENSAJE','LONGITUD MAXIMA DEL MENSAJE','4000',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,ID_BOT,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7, @BotID,@NombreBOT,'MENSAJE_FUERA_DE_HORARIO','Mensaje de Fuera de Horario',' 👋🏻 *Saludos, gracias por contactarnos,* 🤳🏻  _en este momento no podemos atenderle, nos encontramos fuera de horario_ 🕖. \n\n_*Favor intenta de nuevo más tarde.*_',1,1,1,1,@creadoPor);

/* OPERADOR */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'OPERADOR','CIERRE_DETALLADO','Indica si se debe mostrar la ventana para cierre detallado para finalizar una conversación.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','CONVERSACIONES_PAGINA','Número de conversaciones que se mostrarán por cada página en el listado de conversaciones.','10',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','DEFAULT_RESOLUCION','Resolución por defecto al efectuar un cierre directo.','Conversación finalizada mediante cierre directo.',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','DEFAULT_TIPO_RESOLUCION','Indica el tipo de resolución por defecto al efectuar un cierre directo.',@paramDefecto,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','LONGITUD_MAXIMA_MENSAJE','Longitud máxima de los mensajes. Valor máximo permitido 4000.','4000',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','MAX_CONVERSACIONES','Máximo de conversaciones: Cantidad máxima de conversaciones que se pueden asignar a un operador','10',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','MAX_TIME_RANGE','Cantidad de días máximo entre filtros de fechas para reportes y dashboard.','31',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','MENSAJE_NOTIFICACION_INACTIVIDAD','Mensaje de Inactividad: Este mensaje se enviará apartir de que un operador haya alcanzado o superado un 80% de inactividad.','Por favor, verifique su actividad, ah superado mas del 80% del tiempo de inactividad.',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'OPERADOR','OP_SHOW_NOTIFICATIONS','Indica si que quiere recibir la notificación de las conversaciones desatendidas en escritorio.','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'OPERADOR','REASIGNACION_CONVERSACION_INATENDIDA','Reasignar conversaciones: Este parámetro indica si una conversación deben rotarse si lleva demasiado tiempo sin actividad.','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','RESOLUCION_POR_DEFECTO','Resolución Predeternimada: Valor que se utilizará cuando un operador no agregue una descripción a la resolución de una conversación.','Resolución predeterminada, el operador no especificó una descripción para la resolución.',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'OPERADOR','SOCKET URL','Url del soket que se esta utilizando en ese momento',@socketUrl,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','TIEMPO_CONVERSACION_INATENDIDA','Tiempo de conversación desatendida: Cantidad de tiempo en minutos que se esperará antes de rotar una conversación por inactividad.',@TIEMPO_CONVERSACION_INATENDIDA,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','TIEMPO_DESCONEXION','Tiempo de desconexión: Cantidad máxima de minutos que se esperará antes de cerrar la sesión de un usuario si este entra en inactividad.',@TIEMPO_DESCONEXION,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','TIEMPO_DESCONEXION_SOCKET','Cantidad de tiempo en minutos que se esperará antes de rotar las conversaciones de un usuario que perdió conexión con el socket.',@TIEMPO_DESCONEXION_SOCKET,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','TIEMPO_INACTIVIDAD','Tiempo de inactividad: Cantidad máxima de minutos que se esperará antes de colocar un usuario como inactivo.','15',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'OPERADOR','VALIDAR_DESATENCION_CONVERSACION_SKILL','Validar Inactividad por Skill en Conversaciones Nuevas: Indica si se deben validar las conversaciones nuevas para determinar si es necesario cambiar el skill de las conversaciones para que sean atendidas.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','MENSAJE_REASIGNACION_CONVERSACION','Mensaje que se enviará en una notificación push a TalkMe Movil cuando se reasigne una conversación','Se ha reasignado una conversación.',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','MENSAJE_ASIGNACION_CONVERSACION','Mensaje que se enviará en una notificación push a TalkMe Movil cuando se asigne una conversación','Se ha asignado una conversación.',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'OPERADOR','VERSION DE ARCHIVOS','Cache Busting: Control de versiones para evitar el cache en los navegadores web','7',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'OPERADOR','SONIDO MENSAJE','Emitir sonido con los mensajes no leidos','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','KEY_URL_SHORTENER','URL Shortener: Llave para el servicio acortador de url\'s.','16e55a1eeba6ded680285b6a5dd9ee3f2d177cbf',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'OPERADOR','DASHBOARD_FORMATO_VALORES','Establece el formato numérico en el que se mostrarán las cantidades en el dashboard de Operador/Supervisor.','###,###',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID,7,'OPERADOR','AGRUPAR_PLANTILLA_CATEGORIA','Agrupación de Plantillas: Indica si las categorías se muestran agrupadas por categoría.','1',1,0,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,7,'OPERADOR','MENSAJE_INVITACION_OPTIN','Mensaje que se enviará a los clientes para invitarlos a que activen Optin.','Lo invitamos a que se suscriba a nuestro servicio de notifiaciones Optin.',1,1,1,0,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR)
VALUES (@EmpresaID,2,'OPERADOR','TIEMPO_ELIMINACION_MENSAJE','Cantidad de minutos a partir de la cual ya no se podrán eliminar mensajes de las conversaciones que se encuentren en atención.','4096',1,0,1,0,NOW(),@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR)
VALUES (@EmpresaID,1,'OPERADOR','DESPLEGAR_FICHA','Indica si la ficha del cliente debe mostrarse al seleccionar una conversación.','1',1,0,1,0,NOW(),@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR)
VALUES (@EmpresaID,7,'OPERADOR','SIN_MENSAJES','Mensaje por defecto que se respondera al cliente en caso no se reciban mensajes en la conversación.','Lo sentimos, no fue posible procesar su solicitud. Por favor intente de nuevo.',1,0,1,0,NOW(),@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, 'OPERADOR', 'TG_CIERRE_CONVERSACION_FB_ERROR', 'Tipo de gestión para el cierre de conversaciones de Facebook entre Fanpages.', @vTipoGestionCierreContactoFBComments, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, 'OPERADOR', 'ENVIAR_CONVERSACION_A_COLA', 'Contacto Comentarios FB/IG: permitir el envío de conversaciones a la cola de atención.', 0, 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, 'OPERADOR', 'MOSTRAR_COMP_ZONA_HORARIA', 'Indica si se debe mostrar el componente de zona horaria para la configuración de horarios de skill y de canales.', '0', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 1, 'OPERADOR', 'UNIFICACION_FB_MESSENGER_COMMENTS', 'Habilita la unificación de conversaciones de Facebook Messenger y Facebook Comments de un cliente con un único operador.', '0', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, 'OPERADOR', 'MENSAJE_SEGUIMIENTO_FB_MESSENGER_COMMENTS', 'Mensaje de seguimiento que se agregará a todos los mensajes de las conversaciones unificadas de Facebook Messenger y Facebook Comments de un cliente con un único operador.', 'Seguimiento de caso', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, 'OPERADOR', 'LIMITE_NOTAS_FICHA', 'Cantidad de notas que se pueden crear sobre una ficha de cliente.', '10', 1, 0, 1, 1, NOW(), @creadoPor);

/* PAQUETES EMAIL */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,4,'PAQUETES_EMAIL','FROM','Remitente del correo electrónico.','no-reply@talkme.pro',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'PAQUETES_EMAIL','HOST','URL del host de correo electrónico.','smtp.office365.com',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'PAQUETES_EMAIL','PORT','Puerto del host de correo electrónico.','587',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PAQUETES_EMAIL','SUBJECT','Asunto del correo electrónico.','TalkMe: Solicitud de Paquete Adicional',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PAQUETES_EMAIL','TEMPLATE','Plantilla del correo electrónico.','<table style="width: 100%;" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td style="background-color: #4fb7ff; text-align: center;" colspan="2">&nbsp;</td></tr><tr><td><img src="@@logotalkme" width="60" /></td><td width="100%">&nbsp;&nbsp;&nbsp;<strong>TALKME - SOLICITUD DE PAQUETE ADICIONAL</strong></td></tr><tr><td style="background-color: #4fb7ff; text-align: center;" colspan="2">&nbsp;</td></tr><tr><td colspan="2"><p><strong>Estimado Asesor de Ventas</strong></p><p style="text-align: justify;">Por este medio se le solicita que se contacte con el representante de la empresa <strong>@@empresa</strong>&nbsp;ya que dicha empresa desea adquirir un paquete adicional de mensajes&nbsp;@@descripcion.</p>@@contactos<p style="text-align: justify;">Saludos.</p></td></tr><tr><td style="text-align: center;" colspan="2">&nbsp;</td></tr><tr><td style="text-align: center;" colspan="2"><img src="@@logoconsystec" width="126" /></td></tr><tr><td style="text-align: center;" colspan="2">&nbsp;</td></tr></tbody></table>',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,4,'PAQUETES_EMAIL','TO','Destinatario del correo electrónico.',@Correo_interno_paquetes,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'PAQUETES_EMAIL','LOGO_HEADER','Dirección del logo del header.',CONCAT(@socketUrl,'/images/robot-circulo-inverso-celeste.png'),1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'PAQUETES_EMAIL','LOGO_BODY','Dirección del logo del body.',CONCAT(@socketUrl,'/TalkMe/img/iconos/logo-consystec.png'),1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PAQUETES_EMAIL','USER','Usuario para acceso al SMTP utilizado para el envío de correos electrónicos.','no-reply@talkme.pro',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PAQUETES_EMAIL','PASS','Contraseña para acceso al SMTP utilizado para el envío de correos electrónicos.','9ed5KJ8+9fCmQGU',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PAQUETES_EMAIL','TLS','Indica si se habilita el TLS/StartTLS del SMTP utilizado para el envío de correos electrónicos.','enabled',1,0,1,1,@creadoPor);

/* PARCEL */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PARCEL','RESOLUCION_CONVERSACION','Resolución que se asignará a las conversaciones finalizadas por orden de pedido.','Conversación finalizada por solicitud de orden de pedido.',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'PARCEL','FLUJO_REEENVIO','Indica si el reenvío se efectua solo a: 0 - Conversaciones; 1 - Grupos; 2 - Grupos y Conversaciones.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PARCEL','PREFIJO','Prefijo para la creación del código de pedido necesario para la referencia entre la conversación del cliente que realiza el pedido y el repartidor.','ORDEN',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,6,'PARCEL','URL_API_WHATSAPP','URL del API de Whatsapp para el reenvío de mensajes a grupos.','',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'PARCEL','GENERAR_URL','Indica si se debe generar URL del API de Whatsapp para el reenvío de mensajes a grupos.','0',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'PARCEL','DATOS_REPARTIDOR','Mensaje se utiliza para compartir la información de los repartidores.','👤 Los datos de tu motorista asignado son:
🔢 código motorista: @COD@
🛵 número de placa: @PLA@',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'PARCEL','MOSTRAR_GRUPOS_OPERADOR','Indica si se muestran los grupos en la pantalla operador.','0',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, 'PARCEL', 'MENSAJE_OPERADORES_INACTIVOS', 'Mensaje que se envía al repartidor sino hay operadores activos cuando el repartidor solicitar llevar un pedido.', 'No hay usuarios disponibles para procesar su solicitud.', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, 'PARCEL', 'MENSAJE_CASO_CERRADO', 'Mensaje que se envía al repartidor si el caso por el cual se postula ya se encuentra cerrado.', 'El caso por el que se postuló ya se encuentra cerrado.', 1, 0, 1, 1, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,1,'EMPRESA','GET_BLOCKED_NUMBER_LAMBDA','Parametro que habilita/deshabilita la validación de numeros bloqueados al realizar un contacto.',0,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR)
VALUES (@EmpresaID,2,'FTP','VOICE_NOTE_SIZE','Peso máximo para carga de notas de voz.','15360',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR)
VALUES (@EmpresaID,1,'OPERADOR','REDIRECCION_PANTALLA_OPERADOR','Habilita la redirección automática a la pantalla de operador/supervisor al iniciar sesión.',1,1,0,1,1,NOW(),@creadoPor);


/* SEMAFORO */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'SEMAFORO','TIEMPO_CONVERSACION_ACTIVA','Tiempo activa: Minutos en los que se encuentra activa una conversación, al superarse la cantidad de minutos establecidos se levantara una alerta.','5',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,2,'SEMAFORO','MINUTOS_CONVERSACION_DESATENDIDA','Tiempo desatendida: Minutos en los que se encuentra activa una conversación, al superarse la cantidad de minutos establecidos se levantara una alerta.','10',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,1,'SEMAFORO','CONTROL_SEMAFORO','Control Semáforo: Indica si se activa el semáforo del cliente.','1',1,1,1,1,@creadoPor);

/* MOVIL */

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,7,'TRIAL2','TRIAL2','Trial2','2WDFQxjhH9cRHDkgbgm2pqUBt5TCDpYHVWAZNzabHejwmjYqTGz8mGvtgzkKUHKmTsRkkGdwzTgAbNHCRdGVjv3CGCmyBZ8Hub3v',0,0,1,0,@creadoPor);

/* WEBCHAT */

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7 ,CONCAT('WEB_CHAT BOT ',@NombreBOT) , 'BOTS_WEBCHAT_TITULO_ELIMINAR','Instrucciones de eliminacion para el Webchat','*Selecciona el articulo que deseas eliminar* ⛔',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'ANIMACION_PERSISTENTE','Inidica si se anima o no el menu persistente den el chat del bot.','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'botonIniciar','Texto del boton de inicio de la pantalla principal. [Máximo 18 caracteres]',@botonIniciar,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'canalOcupado','Mensaje cuando ya se tiene abierto un canal anterior.',@canalOcupado,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'EMOJIS','Listado de emojis a mostrarse en el Web Chat','\'grinning\',\'smiley\',\'smile\',\'grin\',\'laughing\',\'sweat_smile\',\'joy\',\'Rolling on the Floor Laughing\',\'relaxed\',\'blush\',\'innocent\',\'slight_smile\',\'Upside-Down Face\',\'wink\',\'relieved\',\'heart_eyes\',\'kissing_heart\',\'kissing\',\'kissing_smiling_eyes\',\'kissing_closed_eyes\',\'yum\',\'ok_hand\',\'thumb_up\',\'thumb_down\'',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'finalizado','Mensaje que se muestra al finalizar la conversacion por parte de consola o bot.',@finalizado,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'hablarOperador','Texto que se muestra para la opcion de comunicarse con un asesor. [Máximo 20 caracteres]',@hablarOperador,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'MSJ_ERROR','Mensaje cuando ocurre un error inesperado','Ha ocurrido un error, por favor intente de nuevo más tarde',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'MSJ_INICIAL','Mensaje a ser enviado cuando se inicia una conversacion','Envía tu consulta',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'noConectado','Texto a mostrar cuando no esta conectado a internet.',@noConectado,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'NOTIFY_MESSAGES','Mostrar contador para los mensajes no leidos.','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'NOTIFY_SOUND','Emitir sonido con los mensajes no leidos.','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,8,CONCAT('WEB_CHAT BOT ',@NombreBOT),'PERSISTENTES','botones persistentes.',@botonesPersistentes,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,2,CONCAT('WEB_CHAT BOT ',@NombreBOT),'RESOLUCION_CIERRE_CONVERSACION_WEBCHAT','ID de la resolución por defecto para el cierre de conversaciones realizado por el cliente.',@idResWebchat,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'SHOW_INIT_MENU','Indica si se muestra o no el menu de bot al inicio.','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'subTitulo2Inicio','Texto pequeño de contenido en pantalla de inicio sobre el boton de inicio. [Máximo 17 caracteres]',@subTitulo2Inicio,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'subTituloChat','Subtitulo de la segunda pantalla de chat. [Máximo 40 caracteres]',@subTituloChat,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'subTituloInicio','Subtitulo de la pantalla principal [Máximo 50 caracteres].',@subTituloInicio,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'titulo2Inicio','Texto grande de contenido en pantalla de inicios sobre el boton de inicio. [Máximo 18 caracteres]',@titulo2Inicio,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'tituloChat','Titulo de la segunda pantalla de chat. [Máximo 29 caracteres]',@NombreBOT,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'tituloInicio','Titulo principal de pantalla inicial. [Máximo 18 caracteres]',@tituloInicio,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'tituloMenuChat','Titulo de la pantalla de opciones de bot de lado izquierdo superior. [Máximo 20 caracteres]',@tituloMenuChat,1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,6,CONCAT('WEB_CHAT BOT ',@NombreBOT),'URL_LOGO','Logotipo de la empresa.',CONCAT(@socketUrl,'/images/logo2.png'),1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_CONTENIDO','Contenido a mostrar en la burbuja de mensaje de WhatsApp. (maximo 100 letras)','¿Tienes dudas? Contacta con un asesor.',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_ENABLE','Habilitar módulo de WhatsApp','1',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_HIDE_ON_MOBILE','Ocultar la pantalla del mensaje para telefonos.','0',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_INVERT_POS','Invertir la posición de los botones.','0',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_MENSAJE_ENVIAR','Mensaje que sera enviado de parte del cliente a la consola. (Evitar caracteres especiales)','Hablar con un asesor\n',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,10,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_NUMERO','Número de teléfono a contactar. (incluir código de área 50212345678)',@TELEFONO_WHATSAPP_WEBCHAT,1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,6,CONCAT('WEB_CHAT BOT ',@NombreBOT),'IMAGEN_CHAT','Imagen que remplaza al texto de titulo','',1,0,0,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_SEND_DIRECT','Enviar directamente a whatsapp sin mostrar la ventana con el contenido.','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_SHOW_ON_START','Mostrar la pantalla de whatsApp desplegada al inicio.','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_TITULO_VENTANA','Titulo de la ventana de whatsApp (maximo 25 caracteres).','WhatsApp',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'WHA_VERTICAL_ALIGN','Mostrar los iconos de forma vertical.','0',1,1,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,1,CONCAT('WEB_CHAT BOT ',@NombreBOT),'DEMO_ACTIVADO','Indica si esta empresa sera un contenedor de demos','0',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'DEMO_VENCIDO','Mensaje cuando el demo ha vencido','Su demo ha vencido',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'DEMO_TOKEN_INVALIDO','Mensaje cuando el token ingresado no es valido','El token ingresado no es valido',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID,@BotID,7,CONCAT('WEB_CHAT BOT ',@NombreBOT),'DEMO_TOKEN_REQUERIDO','Mensaje cuando no ingresan un token','El token es requerido',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT,ID_REGEX,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_POR) 
VALUES (@EmpresaID, @BotID, 1, @NombreBOT,'BOTS_WEBCHAT_ENVIAR_FORMULARIO','Indica si se debe enviar el formulario en Webchat al solicitar hablar con un asesor','1',1,0,1,1,@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, '7', @BotID, @NombreBOT, 'BOTS_REDES_MENSAJE_SELECCION', 'Mensaje de selección: Mensaje que se muestra en las opciones de seleccion en redes que no son whatsapp', 'Por favor selecciona una de la opciones:', '1', '1', '1', '1', now(), @creadoPor);


/* VENTAS */

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, 'VENTAS', 'KEY_TALKME_LINK', 'Clave usada para cifrar los parámetros del TalkMe Link.', 'n90nYvgn8FnB6hbN', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, 'VENTAS', 'MENSAJE_LINK_VENTA', 'Mensaje para el TalkMe Link.', 'Para realizar tu pago ingresa al siguiente link:', 1, 1, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, 'VENTAS', 'CANTIDAD_MAXIMA_ARTICULO', 'Cantidad máxima a comprar de un mismo artículo.', '999', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, 'VENTAS', 'LONGITUD_MAXIMA_DESCRIPCION', 'Cantidad máxima de caracteres (incluidos espacios en blanco) que puede tener la descripción de un artículo.', '100', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 3, 'VENTAS', 'PRECIO_UNITARIO_MAXIMO', 'Indica el precio maximo que se pueda dar a un artículo.', '99999.99', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, 'VENTAS', 'CANTIDAD_DECIMALES', 'Cantidad de decimales permitidos para los montos de una venta.', '2', 1, 0, 1, 0, NOW(), @creadoPor);

/*  CIERRE Y SEGUIMIENTO */

-- CIERRE
INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'TIME_MINUTES_CLOSE_CONV', '(Cierre) - Tiempo de inactividad del cliente con el operador (expresado en minutos), para cerrar la conversación',20, '1', '1', '1', '1', NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'SN_CLOSE_CONV', '(Cierre) - Indica si la funcionalidad de cerrar la conversación por inactividad del cliente con el operador se encuentra habilitada', 1, '1', '1', '1', '1', NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'REQUEST_CLOSE_GESTION', '(Cierre) - Tipo de gestión con el que se desea cerrar la conversación cuando el tiempo de inactividad del ciente con el operador ha transcurrido',@IDTipoGestionInactividad, '1', 0, '1', '1', NOW(), @creadoPor);

-- SEGUIMIENTO
INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'TIME_MINUTES_REQUEST_MESSAGE', '(Seguimiento) - Tiempo de inactividad del cliente con el operador (expresado en minutos), previo a enviar el primer mensaje de notificación',10, '1', '1', '1', '1', NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'SN_REQUEST_MESSAGE', '(Seguimiento) - Indica si la funcionalidad de enviar el mensaje de notificación de inactividad del cliente con el operador se encuentra habilitada',0, '1', '1', '1', '1', NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'REQUEST_MESSAGE', '(Seguimiento) - Mensaje de notificación que se le enviará al cliente por inactividad con el operador','Gracias por contactarnos, algo más en que te podemos servir?.', '1', '1', '1', '1', NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,ID_BOT,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR) 
VALUES (@EmpresaID,7,@BotID, @NombreBOT,'BOT_REQUEST_MESSAGE','(seguimiento) Mensaje de notificacion que se le enviará al cliente por inactividad con el Bot','¿Aún continúas aquí? Recuerda que estamos para servirte, estamos a la espera de tu respuesta.',1,1,1,1,NOW(),@creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA,ID_REGEX,ID_BOT,AGRUPACION,NOMBRE,DESCRIPCION,VALOR,VISIBLE_CSTK,VISIBLE,OBLIGATORIO,ORDEN,CREADO_EL,CREADO_POR) 
VALUES (@EmpresaID,1,@BotID, @NombreBOT,'BOT_SN_REQUEST_MESSAGE','(seguimiento) Indica si la funcionalidad de enviar el mensaje de notificación de inactividad del cliente con el bot se encuentra habilitada','0',1,1,1,1,NOW(),@creadoPor);

-- RECONTACTO

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 7, @BotID, @NombreBOT, 'BOT_NO_RECONTACTO', 'Mensaje de confirmacion de no recontacto en horario habil', 'Gracias por su comunicación.', 1, 1, 1, 1, now(), @creadoPor);

-- 3 BOTONES
INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 1, @BotID, @NombreBOT, 'HABILITAR_USO_3BOTONES_INTERACTIVO', 'Habilita el uso en interactivos para enviar 3 botones al seleccionar un Menu', '0', 1, 1, 1, 1, now(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR) 
VALUES (@EmpresaID, 2, null, 'Dashboard Indicadores', 'FILTRO_DIAS_DASHBOARD_INDICADORES', 'cantidad máximo de rango dias para filtrar en el dashboard indicadores', '31', 1, 1, 0, 1, now(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 7, @BotID, @NombreBOT,'BOT_COMENTARIOS_FACEBOOK_MSJ_AUTO','Mensaje automatico por ser enviado cuando se recibe un comentario por Facebook','Gracias por contactarnos, es un total gusto que interactúes en nuestro webinar, estaremos en comunicación contigo.',1,1,1,1,now(), @creadoPor);

-- DESMARCAR RECONTACTOS AUTOMATICOS VIEJOS
INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT,'MAX_CONV_RECONTACTO','(Inactividad) Valor en dias, requeridos para descartar conversaciones marcadas como recontacto','3',1,0,1,1,now(), @creadoPor);

/* **************************  */
/* ACTUALIZACION CACHE BUSTING */
/* **************************  */

SET @MAX_VAL_CACHE := (SELECT MAX(CONVERT(VALOR, UNSIGNED)) FROM PARAMETROS WHERE AGRUPACION='OPERADOR' AND NOMBRE='VERSION DE ARCHIVOS');

UPDATE PARAMETROS SET VALOR=@MAX_VAL_CACHE, MODIFICADO_POR=@creadoPor, MODIFICADO_EL=NOW() WHERE AGRUPACION='OPERADOR' AND NOMBRE='VERSION DE ARCHIVOS';

/*****************************/
/* CREACION DEL USUARIO ROOT */
/*****************************/

/* CREACION DE CREDENCIALES */

SET @UsuarioNombre := CONCAT('ROOT_',REPLACE(@EmpresaNombre , ' ', ''));

SET @UsuarioPass := '98ac632a44c85ce48a8e9d34da471796'; /* Empresa1234 */

/* SE INSERTA EL USUARIO */ -- USUARIO_CSTK=1 24-07-2025

INSERT INTO USUARIOS(ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, CONTRASENA, CREADO_POR, TIPO_USUARIO,PRIMER_ACCESO,SEGUNDO_ACCESO,USUARIO_CSTK)
VALUES(@EmpresaID, 'Administrador', CONCAT('Sistema ', @EmpresaNombre), @UsuarioNombre, 1, 0, @UsuarioPass, @CreadoPor, 0,'1111111','1','1');

SELECT @UsuarioId :=  LAST_INSERT_ID();

/**********************************/
/* CREACION DEL USUARIO COMERCIAL */
/**********************************/
/*
SET @UsuarioNombreComercial1 := 'ahorrent.cristian.aguilar ';
SET @UsuarioPassComercial1 := MD5('Emanuel.2k25');  -- Contraseña en hash

INSERT INTO USUARIOS(ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, CONTRASENA, CREADO_POR, TIPO_USUARIO, PRIMER_ACCESO, SEGUNDO_ACCESO, USUARIO_CSTK)
VALUES(@EmpresaID, 'Cristian', 'Aguilar', @UsuarioNombreComercial1, 1, 0, @UsuarioPassComercial1, @CreadoPor, 0, '1111111', '1', '1');

SELECT @UsuarioId := LAST_INSERT_ID();

SET @UsuarioNombreComercial2 := 'hotelmarket.karla';
SET @UsuarioPassComercial2 := MD5('Prueba123');  -- Contraseña en hash

INSERT INTO USUARIOS(ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, CONTRASENA, CREADO_POR, TIPO_USUARIO, PRIMER_ACCESO, SEGUNDO_ACCESO, USUARIO_CSTK)
VALUES(@EmpresaID, 'Karla', 'Barrios', @UsuarioNombreComercial2, 1, 0, @UsuarioPassComercial2, @CreadoPor, 0, '1111111', '1', '1');

SELECT @UsuarioId := LAST_INSERT_ID();
*/

/***********************/
/* CREANDO USUARIO BOT */
/***********************/

/* SE INSERTA EL USUARIO */

INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, TIPO_USUARIO, CREADO_POR)
VALUES (@EmpresaID, 'Bot', @EmpresaNombre ,CONCAT('Bot_', REPLACE(@EmpresaNombre, ' ', '_')), 0, 0, 1, @creadoPor);

SELECT @UsuarioId := LAST_INSERT_ID();

/* SE INSERTAN LOS PERMISOS PARA TIPOS DE CLIENTES */

INSERT INTO PERMISOS_USUARIOS_CLIENTES (ID_USUARIO, ID_TIPO_CLIENTE, CREADO_EL, CREADO_POR)
SELECT @UsuarioId, TC.ID_TIPO, NOW(), @creadoPor FROM TIPO_CLIENTE TC WHERE TC.ID_EMPRESA=@EmpresaID;


/* SE INSERTAN LOS PERMISOS DE SKILLS */

-- NO SE AGREGA INSERT PARA PERMISOS_USUARIOS_SKILLS DEBIDO A QUE HAY UN TRIGGER QUE LO HACE AUTOMATICAMENTE
-- CUANDO SE CREA UN USUARIO NUEVO

/* SE INSERTA EL REGISTRO DEL USUARIO BOT AL ESTADO BOT */

INSERT INTO ESTADOS_USUARIOS (ID_USUARIO, ID_ESTADO, HORA_INICIO)
VALUES (@UsuarioId, (SELECT ID_ESTADO FROM ESTADOS WHERE ID_EMPRESA=@EmpresaID AND NOMBRE='BOT'), NOW());

/*****************************/
/* CREANDO USUARIO BROADCAST */
/*****************************/

INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, TIPO_USUARIO, CREADO_POR)
VALUES (@EmpresaID, 'Usuario Broadcast', @EmpresaNombre, CONCAT('Broadcast.', REPLACE(@EmpresaNombre, ' ', '.')), 0, 0, 2, @creadoPor);

/* --------------------- */
/*  Modificacion SLujan  */
/* --------------------- */

/*  SE CREA EL CONTACTO DE LA EMPRESA   */

INSERT INTO CONTACTO_EMPRESA(ID_EMPRESA, NOMBRE, CORREO, TELEFONO, CREADO_EL, CREADO_POR)
VALUES(@EmpresaID,@nombreContacto, @Correo_cliente, @telefonoContacto, NOW(), @creadoPor);

/*****************************/
/* CREANDO BOT REDES Y BOT REDES BETA */
/*****************************/

/* BOT_REDES  */

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '1', '1', '1', NOW(), @creadoPor);

SELECT @BotRedesWhatsapp :=  LAST_INSERT_ID();
/*
INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO,BAJO_DEMANDA, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '7', '1',1,1, NOW(), @creadoPor);

SELECT @BotRedesWebChat :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, BAJO_DEMANDA, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '2', '1', 1,1, NOW(), @creadoPor);

SELECT @BtoRedesFB :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '11', '1',1, NOW(), @creadoPor);

SELECT @BtoRedesComentsFB :=  LAST_INSERT_ID(); 

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, BAJO_DEMANDA,TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '10', '1', 1,1, NOW(), @creadoPor);

SELECT @BtoRedesIG :=  LAST_INSERT_ID(); 

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '12', '1',1, NOW(), @creadoPor);

SELECT @BtoRedesComentsIG :=  LAST_INSERT_ID(); 

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO,TIPO_CLIENTE, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '5', '0',1, NOW(), @creadoPor);

SELECT @BtoRedesBroadcastWhatsapp :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '6', '0', NOW(), @creadoPor);

SELECT @BtoRedesBroadcastSMS :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '9', '1', NOW(), @creadoPor);

SELECT @BtoRedesVentas :=  LAST_INSERT_ID(); 
*/

/*  BOT REDES BETA  */

INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '1', '1', NOW(), @creadoPor);

SELECT @BotRedesWhatsappBeta :=  LAST_INSERT_ID();

/*
INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '7', '1', NOW(), @creadoPor);

SELECT @BotRedesWebChatBeta :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '2', '1', NOW(), @creadoPor);

SELECT @BtoRedesFB :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES_BETA(ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '11', '1', NOW(), @creadoPor);

SELECT @BtoRedesComentsFB :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES_BETA(ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '10', '1', NOW(), @creadoPor);

SELECT @BtoRedesIG :=  LAST_INSERT_ID(); 

INSERT INTO BOT_REDES_BETA(ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '12', '1', NOW(), @creadoPor);

SELECT @BtoRedesComentsIG :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '5', '0', NOW(), @creadoPor);

SELECT @BtoRedesBroadcastWhatsapp :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '6', '0', NOW(), @creadoPor);

SELECT @BtoRedesBroadcastSMS :=  LAST_INSERT_ID();

INSERT INTO BOT_REDES_BETA (ID_BOT, ID_PAIS, ID_RED_SOCIAL, ESTADO, CREADO_EL, CREADO_POR) 
VALUES (@BotID, @idPais, '9', '1', NOW(), @creadoPor);

SELECT @BtoRedesWebCatalogo := LAST_INSERT_ID();

/* SE INSERTA EL REGISTRO EN ACUMULADOR */

INSERT INTO ACUMULADOR(ID_PAQUETE, ID_EMPRESA, HITS_INICIAL, HITS_CONSUMIDOS, HITS_DISPONIBLES, HITS_EXCEDENTES, PRIORIDAD, CREADO_EL, FECHA_INICIO, FECHA_FIN) 
VALUES (304, @EmpresaID, 100, 0, 100, 0, 1, NOW(), @fechaInicioPaquete, @fechaFinPaquete);  

INSERT INTO ACUMULADOR(ID_PAQUETE, ID_EMPRESA, HITS_INICIAL, HITS_CONSUMIDOS, HITS_DISPONIBLES, HITS_EXCEDENTES, PRIORIDAD, CREADO_EL, FECHA_INICIO, FECHA_FIN) 
VALUES (345, @EmpresaID, 0, 0, 0, 0, '1', NOW(), @fechaInicioPaquete, @fechaFinPaquete);

/*  INSERT PAQUETE EN LA TABLA PAQUETES_PROVISION  */
INSERT INTO PAQUETE_PROVISION (ID_PAQUETE, ID_EMPRESA, ID_PAIS, CREADO_EL, CREADO_POR, FECHA_INICIO_VIGENCIA, FECHA_FIN_VIGENCIA) 
VALUES (304, @EmpresaID, @idPais, now(), @creadoPor, @fechaInicioPaquete, '3000-12-31 05:59:59'); 

INSERT INTO PAQUETE_PROVISION (ID_PAQUETE, ID_EMPRESA, ID_PAIS, CREADO_EL, CREADO_POR, FECHA_INICIO_VIGENCIA, FECHA_FIN_VIGENCIA) 
VALUES (345, @EmpresaID, @idPais, now(), @creadoPor, @fechaInicioPaquete, '3000-12-31 05:59:59'); 

/*  SE ACTUALIZA LA EMPRESA CON LOS TOKENS  */

UPDATE EMPRESAS
SET API_TOKEN = @tokenEmpresa,
	TOKEN_NOTIFICADOR_SMS = 'el1qMpSFvIY:APA91bFx7MatRE__fiG6eFZSxeG-jd6BMXgAPNIZ2OKRpB8Edx0hO2QmbB4OAqyakbc0jvwiyIHIiDZ_bCMCujJv6u47RczsRIstraRZtK826MOAseepuXwBJ5wT_izE_iJQwhM5Ex6m'
WHERE ID_EMPRESA = @EmpresaID;

/* SE INSERTA EN LA BOT_RED_CONF_VALORES */

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BotRedesWhatsapp, '1', @TELEFONO_WHATSAPP_WEBCHAT, NOW(), @creadoPor);

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BotRedesWhatsapp, '4', @socketUrl, NOW(), @creadoPor);

/*
INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BotRedesWebChat, '4', @socketUrl, NOW(), @creadoPor);

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR) 
VALUES (@BtoRedesWebCatalogo, '4', @socketUrl, NOW(), @creadoPor);
*/

/*  SE ACTUALIZA EL PARAMETRO PARA CREAR CONVERSACIONES DE BROADCAST */
UPDATE PARAMETROS
SET VALOR = 0
WHERE AGRUPACION = 'BROADCAST'
AND NOMBRE = 'ID_BOT_REDES_CONVERSACION'
AND ID_EMPRESA  = @EmpresaID;

/* ACTUALIZA ID_BOT_TEST */
UPDATE BOT
SET ID_BOT_TEST = CONCAT('-',@BotID)
WHERE ID_BOT = @BotID;

/*
	[PP-2024-15]
	SE AGREGAN PARAMETROS PARA LA FUNCIONALIDAD DE STICKERS, UNO PARA LIMITAR LA CANTIDAD DE CATALOGOS DE STICKERS Y UNO PARA LIMITAR LA CANTIDAD DE STICKERS POR CATALOGO.
*/

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'LIMITE_CATALOGO_STICKERS', 'Indica la cantidad maxima de catalogos de stickers permitidos por canal en el que exista whatsapp.', '5', 1, 0, 1, 0, NOW(), @creadoPor);

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'LIMITE_STICKERS_POR_CATALOGO', 'Indica la cantidad maxima de stickers permitidos por cada catalogo de stickers en canales que posean whatsapp.', '10', 1, 0, 1, 0, NOW(), @creadoPor);

/*
	[PP-2024-39]
	PARAMETRO DE INACTIVIDAD DEL CLIENTE CON EL BOT EXPRESADO EN MINUTOS QUE SERA TOMADO EN CUENTA CUANDO SE DE UN CIERRE DETALLADO CON DERIVACION A NODO TIPO FORMULARIO.
*/

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 2, @BotID, @NombreBOT, 'TIEMPO_INACTIVIDAD_BOT_NODO_DERIVACION', '(Cierre derivacion nodo) - Tiempo de inactividad del cliente con el BOT cuando se encuentra en un nodo resultado de un cierre detallado (expresado en minutos)', '30', 1, 1, 1, 1, NOW(), @creadoPor);

/*
	===============================================================
	[PP-2025-08] INTEGRACION CATALOGOS WHATSAPP
	===============================================================
*/

-- SE AGREGA CONFIGURACION PARA EL TOKEN DE META PARA OBTENER INFORMACION DE PRODUCTOS,
-- SI LA EMPRESA NO TIENE CANAL DE WHATSAPP NO ES NECESARIO AGREGAR ESTA CONFIGURACION (LA DEL TOKEN).

SET @V_TOKEN := 'YOUR_META_CATALOGS_TOKEN_HERE';

SET @V_ID_BOT_RED_CONFIGURACION_CATALOGO := (SELECT ID_BOT_RED_CONFIGURACION FROM BOT_RED_CONFIGURACION WHERE NOMBRE_PARAMETRO='TOKEN_CATALOGOS_WHATSAPP');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)
VALUES (@BotRedesWhatsapp, @V_ID_BOT_RED_CONFIGURACION_CATALOGO, @V_TOKEN, NOW(), @creadoPor);

-- SE CREA EL SKILL PARA CATALOGOS

INSERT INTO SKILLS (ID_EMPRESA, NOMBRE_SKILL, ESTADO, ORDEN, ELIMINADO, SISTEMA, VISIBLE, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Catalogo WA', 1, 0, 0, 0, 0, NOW(), @creadoPor);

SET @V_ID_SKILL_CATALOGO := LAST_INSERT_ID();

-- SE CREA EL HORARIO PARA EL SKILL DE CATALOGOS

INSERT INTO HORARIO_SKILL (ID_SKILL, DESDE, HASTA, DIAS, CREADO_EL, CREADO_POR)
VALUES (@V_ID_SKILL_CATALOGO, '06:00:00', '05:59:00', '1111111', NOW(), @creadoPor);

-- SE CREA EL TIPO DE GESTION PARA CATALOGOS

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, VISIBLE, NIVEL_VISIBLE, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Catalogo WA', 1, 0, 1, 1, NOW(), @creadoPor);

SET @V_ID_TIPO_GESTION_CATALOGO := LAST_INSERT_ID();

-- SE CREA EL TIPO DE RESOLUCION PARA CATALOGOS

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, SISTEMA, NIVEL_VISIBLE, CREADO_EL, CREADO_POR)
VALUES (@EmpresaID, 'Catalogo WA', 1, 0, 0, 1, NOW(), @creadoPor);

SET @V_ID_TIPO_RESOLUCION_CATALOGO := LAST_INSERT_ID();

-- PARAMETRO QUE CONTIENE EL LISTADO DE CAMPOS QUE SE SOLICITAN AL API DE META PARA CADA PRODUCTO DE CATALOGO

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'WA_CATALOGO_CAMPOS_PRODUCTO',
'Catálogos WhatsApp: listado de atributos que se solicitarán al API Graph de Meta para los productos.

Los atributos deben separarse con comas, sin espacios en blanco y la lista no debe finalizar con coma.

Los atributos retailer_id, name, description, brand, price, availability, image_url son obligatorios y no deben eliminarse de la lista.',
'retailer_id,name,description,brand,price,availability,image_url,id,additional_image_urls,additional_variant_attributes,age_group,applinks,category,category_specific_fields,color,commerce_insights,condition,currency,custom_data,custom_label_0,custom_label_1,custom_label_2,custom_label_3,custom_label_4,expiration_date,gender,gtin,manufacturer_part_number,material,ordering_index,pattern,product_catalog,product_feed,product_group,product_type,retailer_product_group_id,review_rejection_reasons,review_status,sale_price,sale_price_end_date,sale_price_start_date,shipping_weight_unit,shipping_weight_value,short_description,size,url,visibility',
1, 0, 1, 1, @creadoPor);

-- PARAMETRO DEL SKILL QUE SE UTILIZARA EN LAS CONVERSACIONES DERIVADAS DEL BOT A ASESOR POR ACCIONES DE CATALOGOS.

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'WA_CATALOGO_ID_SKILL',
'Catálogos WhatsApp: skill que se asignará a las conversaciones nuevas creadas cuando se reciba un carrito de compras o un mensaje sobre producto.',
@V_ID_SKILL_CATALOGO,
1, 0, 1, 1, @creadoPor);

-- PARAMETRO DEL TIPO DE GESTIÓN QUE SE UTILIZARA EN LAS CONVERSACIONES CERRADAS DEL BOT PARA INDICAR QUE SE FINALIZO POR UNA ACCION DE CATALOGOS.

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'WA_CATALOGO_ID_TIPO_GESTION',
'Catálogos WhatsApp: tipo de gestión que se asignará a las conversaciones finalizadas cuando se reciba un carrito de compras o un mensaje sobre producto.',
@V_ID_TIPO_GESTION_CATALOGO,
1, 0, 1, 1, @creadoPor);

-- PARAMETRO DEL TIPO DE RESOLUCION QUE SE UTILIZARA EN LAS CONVERSACIONES CERRADAS DEL BOT PARA INDICAR QUE SE FINALIZO POR UNA ACCION DE CATALOGOS.

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 2, @NombreBOT, 'WA_CATALOGO_ID_TIPO_RESOLUCION',
'Catálogos WhatsApp: tipo de resolución que se asignará a las conversaciones finalizadas cuando se reciba un carrito de compras o un mensaje sobre producto.',
@V_ID_TIPO_RESOLUCION_CATALOGO,
1, 0, 1, 1, @creadoPor);

-- PARAMETRO DE RESOLUCION QUE SE UTILIZARA EN LAS CONVERSACIONES CERRADAS DEL BOT PARA INDICAR QUE SE FINALIZO POR UNA ACCION DE CATALOGOS.

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 7, @NombreBOT, 'WA_CATALOGO_RESOLUCION',
'Catálogos WhatsApp: resolución que se asignará a las conversaciones finalizadas cuando se reciba un carrito de compras o un mensaje sobre producto.',
'Conversación finalizada por acción recibida desde la tienda de WhatsApp.',
1, 0, 1, 1, @creadoPor);

-- [PP-2025-20] PARAMETRO PARA LA RUTA DONDE EL ADMINISTRADOR DE PLANTILLAS DEBE CARGAR LOS ARCHIVOS DE LAS PLANTILLAS DE WHATSAPP,
--              POR ESO MISMO, SI EL BOT QUE SE ESTA CONFIGURANDO NO ES PARA WHATSAPP ENTONCE COMENTAR EL INSERT PARA QUE EL PARAMETRO
--              NO SE CREE YA QUE ES EXCLUSIVO PARA BOTS QUE USAN WHATSAPP.

INSERT INTO PARAMETROS (ID_EMPRESA, ID_BOT, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_POR)
VALUES (@EmpresaID, @BotID, 7, UPPER(REPLACE(@NombreBOT, '_', ' ')), 'PATH_ARCHIVOS_PLANTILLAS', 'Path relativo a colocar los archivos del administrador de plantillas.',
CONCAT('archivos_plantillas/', LOWER(REPLACE(@EmpresaNombre, ' ', '_')), '/', LOWER(REPLACE(@NombreBOT, ' ', '_'))), 1, 0, 1, 1, @creadoPor);

/*
	============
	[PP-2025-26]
	============
*/

-- SE AGREGA CONFIGURACION PARA INDICAR LA VERSION DEL API DE GUPSHUP QUE USARA EL CANAL.
-- SI LA EMPRESA NO TIENE CANAL DE WHATSAPP NO ES NECESARIO AGREGAR ESTA CONFIGURACION.

SET @V_VERSION_API_GUPSHUP := '3'; -- EL VALOR PARA ESTA VARIABLE DEBE SER '2' O '3'

SET @V_ID_CONF_VERSION_API_WHATSAPP := (SELECT ID_BOT_RED_CONFIGURACION FROM BOT_RED_CONFIGURACION WHERE NOMBRE_PARAMETRO='VERSION_API_WHATSAPP');

INSERT INTO BOT_RED_CONF_VALORES (ID_BOT_REDES, ID_BOT_RED_CONFIGURACION, VALOR, CREADO_EL, CREADO_POR)
VALUES (@BotRedesWhatsapp, @V_ID_CONF_VERSION_API_WHATSAPP, @V_VERSION_API_GUPSHUP, NOW(), @creadoPor);

-- Se crean parametros a nivel de empresa para especificar el maximo de catalogos de archivos activos, default 15
INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, CREADO_POR) VALUES (@EmpresaID, 2, "EMPRESA", "LIMITE_CATALOGOS_DE_ARCHIVOS", "Indica la cantidad maxima de catalogos de archivos activos permitidos por empresa.", 15, 1, 0, "Sistema.Talkme");

-- Se crean parametros a nivel de empresa para especificar el maximo de archivos activos por catalogo de archivos, default 10
INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, CREADO_POR) VALUES (@EmpresaID, 2, "EMPRESA", "LIMITE_ARCHIVOS_POR_CATALOGO", "Indica la cantidad maxima de archivos activos permitidos por cada catalogo de archivos.", 10, 1, 0, "Sistema.Talkme");

-- Se crean parametros a nivel de empresa para especificar el peso maximo de archivos por catalogo, default 5mb

-- 22-09-2025

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, CREADO_POR) VALUES (@EmpresaID, 2, "EMPRESA", "LIMITE_PESO_ARCHIVOS_POR_CATALOGO", "Indica la cantidad maxima de peso en megas permitidos por cada archivo de catalogo de archivos.", 5, 1, 0, "Sistema.Talkme");

UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/NOMBRE%20CONTACTO.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF1';

-- Update para CF2
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/CORREO.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF2';

-- Update para CF3
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/CELULAR.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF3';

-- Update para CF11
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/DIRECCIÓN.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF11';

-- Update para CF13
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/IDENTIFICACIÓN.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF13';

-- Departamento  CF4
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/DEPARTAMENTO.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF4';

-- Municipio  CF5
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/MUNICIPIO.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF5';

-- Zona  CF6
UPDATE ATRIBUTOS_FICHA_CLIENTE SET Icono = 'https://cdn.talkme.pro/TalkMe/FICHA_CLIENTE/ZONA.svg' WHERE ID_EMPRESA = @EmpresaID AND TAG = 'CF6';

/*
===================================================
[PP-2026-04] - Seguimientos Programados Automaticos
===================================================
*/

-- Creacion del tipo de gestion

INSERT INTO TIPOS_GESTION (ID_EMPRESA, GESTION, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL)
VALUES (@EmpresaID, 'Contacto Automático', 1, 0, @creadoPor, NOW());

SET @V_ID_TIPO_GESTION_SEGUIMIENTO := LAST_INSERT_ID();

-- Creacion del tipo de resolucion

INSERT INTO TIPOS_RESOLUCIONES (ID_EMPRESA, RESOLUCION, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL)
VALUES (@EmpresaID, 'Contacto Automático', 1, 0, @creadoPor, NOW());

SET @V_ID_TIPO_RESOLUCION_SEGUIMIENTO := LAST_INSERT_ID();

-- Creacion del parametro para el tipo de gestion

SET @V_DESCRIPCION := 'Contactos Automáticos: tipo de gestión que se asociará a las conversaciones cuando el contacto se cree finalizado.';
SET @V_NOMBRE_PARAMETRO := 'TIPO_GESTION_CONTACTO_AUTOMATICO';

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
SELECT B.ID_EMPRESA, 2, B.ID_BOT, REPLACE(UPPER(B.DESCRIPCION), '_', ' '), @V_NOMBRE_PARAMETRO, @V_DESCRIPCION, @V_ID_TIPO_GESTION_SEGUIMIENTO, 1, 1, 1, 0, @V_CREADO_EL, @V_CREADO_POR
FROM BOT B
	JOIN BOT_REDES BR ON BR.ID_BOT=B.ID_BOT AND BR.ESTADO=1 AND BR.ID_RED_SOCIAL=1
WHERE B.ID_EMPRESA=@EmpresaID AND B.ESTADO=1
ORDER BY B.ID_BOT;

-- Creacion del parametro para el tipo de resolucion

SET @V_DESCRIPCION := 'Contactos Automáticos: tipo de resolución que se asociará a las conversaciones cuando el contacto se cree finalizado.';
SET @V_NOMBRE_PARAMETRO := 'TIPO_RESOLUCION_CONTACTO_AUTOMATICO';

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
SELECT B.ID_EMPRESA, 2, B.ID_BOT, REPLACE(UPPER(B.DESCRIPCION), '_', ' '), @V_NOMBRE_PARAMETRO, @V_DESCRIPCION, @V_ID_TIPO_RESOLUCION_SEGUIMIENTO, 1, 1, 1, 0, @V_CREADO_EL, @V_CREADO_POR
FROM BOT B
	JOIN BOT_REDES BR ON BR.ID_BOT=B.ID_BOT AND BR.ESTADO=1 AND BR.ID_RED_SOCIAL=1
WHERE B.ID_EMPRESA=@EmpresaID AND B.ESTADO=1
ORDER BY B.ID_BOT;

-- Creacion del parametro para la resolucion

SET @V_VALOR := 'Conversación finalizada, contacto automático.';
SET @V_DESCRIPCION := 'Contactos Automáticos: resolución que se asociará a las conversaciones cuando el contacto se cree finalizado.';
SET @V_NOMBRE_PARAMETRO := 'RESOLUCION_CONTACTO_AUTOMATICO';

INSERT INTO PARAMETROS (ID_EMPRESA, ID_REGEX, ID_BOT, AGRUPACION, NOMBRE, DESCRIPCION, VALOR, VISIBLE_CSTK, VISIBLE, OBLIGATORIO, ORDEN, CREADO_EL, CREADO_POR)
SELECT B.ID_EMPRESA, 7, B.ID_BOT, REPLACE(UPPER(B.DESCRIPCION), '_', ' '), @V_NOMBRE_PARAMETRO, @V_DESCRIPCION, @V_VALOR, 1, 1, 1, 0, @V_CREADO_EL, @V_CREADO_POR
FROM BOT B
	JOIN BOT_REDES BR ON BR.ID_BOT=B.ID_BOT AND BR.ESTADO=1 AND BR.ID_RED_SOCIAL=1
WHERE B.ID_EMPRESA=@EmpresaID AND B.ESTADO=1
ORDER BY B.ID_EMPRESA, B.ID_BOT;

-- Creación del usuario tipo notificación
INSERT INTO USUARIOS (ID_EMPRESA, NOMBRE, APELLIDO, NOMBRE_USUARIO, ESTADO, CONECTADO, TIPO_USUARIO, CREADO_EL, CREADO_POR)
SELECT @EmpresaID, 'Notificacion', 'Seguimiento Programado', CONCAT('notificaciones.', REPLACE(LOWER(E.NOMBRE), ' ', '.')),1, 0, 5, NOW(), 'Sistema.Talkme'
FROM EMPRESAS E
WHERE E.ID_EMPRESA = @EmpresaID;

SET @V_ID_USUARIO_NOTIFICACION := LAST_INSERT_ID();

-- Se registra usuario de notificacion en el estado bot

INSERT INTO ESTADOS_USUARIOS (ID_USUARIO, ID_ESTADO, HORA_INICIO, MOVIL)
SELECT U.ID_USUARIO, ES.ID_ESTADO, @V_CREADO_EL, 0
FROM USUARIOS U
	JOIN ESTADOS ES ON ES.ID_EMPRESA=@EmpresaID AND ES.NOMBRE='BOT'
WHERE U.ID_USUARIO=@V_ID_USUARIO_NOTIFICACION;

/*
	===============================================================
	[PP-2026-09] WHATSAPP FLOWS
	===============================================================
*/

-- Se registra tipo de gestion y resolucion para uso de flows

INSERT INTO TIPOS_RESOLUCIONES (ID_TIPO_RESOLUCION, ID_EMPRESA, RESOLUCION, NOTIFICAR_CRM, ESTADO, ELIMINADO, SISTEMA, CREADO_EL, CREADO_POR, MODIFICADO_EL, MODIFICADO_POR, NIVEL_VISIBLE) VALUES 
(null, @EmpresaID, 'Flow', 0, 1, 0, 1, now(), @creadoPor, null, null, 1);
INSERT INTO TIPOS_GESTION (ID_TIPO_GESTION, ID_EMPRESA, GESTION, NOTIFICAR_CRM, ESTADO, ELIMINADO, CREADO_POR, CREADO_EL, MODIFICADO_POR, MODIFICADO_EL, VISIBLE, NIVEL_VISIBLE) VALUES 
(null, @EmpresaID, 'Flow', 0, 1, 0, @creadoPor, now(), null, null, 1, 1);

-- FINALIZA CREACION DE EMPRESA 