// ==========================================================================
//   DIAGRAMAS BD - Endpoint para obtener datos de BOT_MENU y generar diagrama
//   Tablas: BOT_MENU, BOT_FORMULARIO, TIPOS_PRODUCTO, BOT_PREGUNTA, BOT
// ==========================================================================
const express = require('express');
const router = express.Router();
const pools = require('../../../../db');

// POST /diagramas/bot-menu - Obtiene datos de BOT_MENU y genera nodos/edges
router.post('/diagramas/bot-menu', async (req, res) => {
    const { db_key, id_empresa, id_bot } = req.body;
    
    if (!db_key || !id_empresa || !id_bot) {
        return res.status(400).json({ 
            error: 'Faltan parámetros requeridos (db_key, id_empresa, id_bot)' 
        });
    }
    
    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: 'Base de datos no válida' });
    }

    try {
        // 1. Obtener información del bot (nombre y mensaje de bienvenida)
        const [botInfo] = await pool.query(`
            SELECT 
                B.DESCRIPCION as BOT_DESCRIPCION,
                P.VALOR as MENSAJE_BIENVENIDA
            FROM BOT B
            LEFT JOIN PARAMETROS P ON B.ID_BOT = P.ID_BOT AND P.NOMBRE = 'MENSAJE_BIENVENIDA'
            WHERE B.ID_BOT = ?
        `, [id_bot]);

        const botDescripcion = botInfo[0]?.BOT_DESCRIPCION || `Bot ${id_bot}`;
        const mensajeBienvenida = botInfo[0]?.MENSAJE_BIENVENIDA || '';

        // 2. Obtener todos los menús del bot usando el query completo proporcionado
        const [menus] = await pool.query(`
            SELECT
                BM.ID_BOT_MENU_REF,
                BM.ID_BOT_MENU_PADRE_REF AS ID_PADRE_REF,
                BM.ARCHIVO,

                BF.ID_BOT_FORMULARIO_REF,

                BM.IMAGEN,
                BM.ID_BOT_MENU,
                BM.NOMBRE,

                BMP.PALABRA_CLAVE,

                BM.ID_PADRE,
                BM.ORDEN,

                BP.TITULO AS Opcion,

                BM.NRO_MONTO AS 'Valor del producto',

                BT.RESPUESTA AS 'Texto de Respuesta',

                BM.FB_BOTON AS 'Titulo Facebook',

                BW.NOMBRE AS 'Nombre del servicio web',
                BW.URL AS 'Url del servicio',

                BWR.RESPUESTA AS 'Respuesta Final Formulario',

                BM.TAGS,
                BM.VISIBLE,
                BM.ID_SKILL,

                FF.TXT_DESC AS 'Formato Menú',

                BM.VISIBLE_MENU_FORMATO_TEXTO,
                BM.DESCRIPCION,

                TG.GESTION AS 'Cierre de tipologia',

                BM.TIENE_EXISTENCIA,

                BM.SN_SUSCRIPCION AS 'Suscripción',

                BM.LATITUD,
                BM.LONGITUD,

                BM.ID_DERIVAR AS 'ID menú a derivar',

                BM.ID_BOT_MENU_ENCADENAR AS 'ID menú encadenar',

                BM.TXT_JSON AS 'JSON'

            FROM BOT_MENU BM

            LEFT JOIN BOT_PROCESO BP
                ON BM.ID_BOT_PROCESO = BP.ID_BOT_PROCESO

            LEFT JOIN (
                SELECT ID_BOT_MENU, MAX(RESPUESTA) AS RESPUESTA
                FROM BOT_TXT
                GROUP BY ID_BOT_MENU
            ) BT
                ON BM.ID_BOT_MENU = BT.ID_BOT_MENU

            LEFT JOIN (
                SELECT ID_BOT_MENU, MAX(ID_BOT_FORMULARIO_REF) AS ID_BOT_FORMULARIO_REF
                FROM BOT_FORMULARIO
                GROUP BY ID_BOT_MENU
            ) BF
                ON BM.ID_BOT_MENU = BF.ID_BOT_MENU

            LEFT JOIN (
                SELECT
                    ID_BOT_MENU,
                    MAX(PALABRA_CLAVE) AS PALABRA_CLAVE,
                    MAX(ID_FORMATO_FB) AS ID_FORMATO_FB
                FROM BOT_MENU_PALABRAS_VW
                GROUP BY ID_BOT_MENU
            ) BMP
                ON BM.ID_BOT_MENU = BMP.ID_BOT_MENU

            LEFT JOIN (
                SELECT
                    ID_BOT_MENU,
                    MAX(NOMBRE) AS NOMBRE,
                    MAX(URL) AS URL
                FROM BOT_WS
                GROUP BY ID_BOT_MENU
            ) BW
                ON BM.ID_BOT_MENU = BW.ID_BOT_MENU

            LEFT JOIN (
                SELECT
                    PALABRA_CLAVE,
                    MAX(RESPUESTA) AS RESPUESTA
                FROM BOT_WS_RESPUESTA
                GROUP BY PALABRA_CLAVE
            ) BWR
                ON BMP.PALABRA_CLAVE = BWR.PALABRA_CLAVE

            LEFT JOIN FORMATO_FB FF
                ON BMP.ID_FORMATO_FB = FF.ID_FORMATO_FB

            LEFT JOIN TIPOS_GESTION TG
                ON BM.ID_TIPO_GESTION = TG.ID_TIPO_GESTION

            WHERE BM.ID_BOT = ?
        `, [id_bot]);

        // 2. Obtener preguntas, opciones, derivaciones y textos de respuesta para cada menú
        const menuIds = menus.map(m => m.ID_BOT_MENU);
        let questionsData = [];
        let routingData = [];
        let textResponsesMap = {};
        
        if (menuIds.length > 0) {
            // Obtener preguntas con el query exacto proporcionado (incluye GROUP_CONCAT para respuestas)
            const [preguntas] = await pool.query(`
                SELECT 
                    bm.ID_BOT_MENU AS 'Id del menú',
                    bp.PREGUNTA AS 'Pregunta',
                    bp.ORDEN AS 'Orden',
                    CASE bp.ID_EXPRESION
                        WHEN 1 THEN 'Solo Texto'
                        WHEN 2 THEN 'Solo Números'
                        WHEN 3 THEN 'Correo'
                        WHEN 4 THEN 'Teléfono'
                        ELSE CONCAT('ID: ', bp.ID_EXPRESION)
                    END AS 'Expresion regular',
                    bp.PLACEHOLDER AS 'Marcador',
                    bp.PARAMETRO AS 'Parametro',
                    btr.TXT_DESC AS 'Tipo de respuesta',

                    GROUP_CONCAT(
                        DISTINCT CONCAT(
                            IFNULL(botr.TXT_INCISO, ''),
                            CASE 
                                WHEN botr.TXT_INCISO IS NOT NULL 
                                     AND botr.TXT_INCISO <> '' 
                                THEN '-' 
                                ELSE '' 
                            END,
                            botr.TXT_DESC
                        )
                        ORDER BY botr.TXT_INCISO
                        SEPARATOR ','
                    ) AS 'Respuestas',

                    bp.ID_ATRIBUTO AS 'Ficha Atributo'

                FROM BOT_MENU bm

                INNER JOIN BOT_FORMULARIO bf 
                    ON bf.ID_BOT_MENU = bm.ID_BOT_MENU

                INNER JOIN BOT_PREGUNTA bp 
                    ON bp.ID_BOT_FORMULARIO = bf.ID_BOT_FORMULARIO

                LEFT JOIN BOT_TIPO_RESP btr 
                    ON btr.ID_BOT_TIPO_RESP = bp.ID_BOT_TIPO_RESP

                LEFT JOIN BOT_OPCIONES_TIPO_RESP botr 
                    ON botr.ID_BOT_PREGUNTA = bp.ID_BOT_PREGUNTA

                WHERE bm.ID_BOT_MENU IN (?)
                  AND bf.ESTADO = 1

                GROUP BY 
                    bm.ID_BOT_MENU,
                    bp.ID_BOT_PREGUNTA,
                    bp.PREGUNTA,
                    bp.ORDEN,
                    bp.ID_EXPRESION,
                    bp.PLACEHOLDER,
                    bp.PARAMETRO,
                    btr.TXT_DESC,
                    bp.ID_ATRIBUTO

                ORDER BY 
                    bm.ID_BOT_MENU,
                    bp.ORDEN
            `, [menuIds]);
            
            // Formatear las preguntas para el frontend
            questionsData = preguntas.map(p => ({
                'id del menu': String(p['Id del menú']),
                pregunta: p['Pregunta'] || '',
                'tipo de respuesta': p['Tipo de respuesta'] || 'Texto',
                respuestas: p['Respuestas'] || p['Parametro'] || '',
                orden: p['Orden'],
                'Expresion regular': p['Expresion regular'] || '',
                'Marcador': p['Marcador'] || '',
                'Parametro': p['Parametro'] || '',
                'Ficha Atributo': p['Ficha Atributo'] || ''
            }));

            // Obtener derivaciones (routings) desde BOT_MENU_DERIVACION
            const [derivaciones] = await pool.query(`
                SELECT 
                    ID_BOT_MENU,
                    ID_BOT_MENU_DERIVAR,
                    TXT_VALOR
                FROM BOT_MENU_DERIVACION
                WHERE ID_BOT_MENU IN (?)
            `, [menuIds]);
            
            routingData = derivaciones.map(d => {
                const routingObj = {};
                // El excelParser espera el formato: { [id_menu]: id_menu, [id_derivar]: id_derivar, valor: texto }
                routingObj[String(d.ID_BOT_MENU)] = String(d.ID_BOT_MENU);
                routingObj[String(d.ID_BOT_MENU_DERIVAR)] = String(d.ID_BOT_MENU_DERIVAR);
                routingObj['valor'] = d.TXT_VALOR || '';
                return routingObj;
            });

            // Obtener textos de respuesta desde BOT_TXT
            const [textResponses] = await pool.query(`
                SELECT 
                    ID_BOT_MENU,
                    RESPUESTA
                FROM BOT_TXT
                WHERE ID_BOT_MENU IN (?)
                  AND ESTADO = 1
            `, [menuIds]);
            
            textResponsesMap = textResponses.reduce((acc, txt) => {
                acc[String(txt.ID_BOT_MENU)] = txt.RESPUESTA || '';
                return acc;
            }, {});
        }

        // 3. Generar nodos y edges exactamente como el excelParser.js
        const nodes = [];
        const edges = [];
        
        // Crear mapa de ID a nombre (como en excelParser)
        const idToNameMap = {};
        menus.forEach(menu => {
            idToNameMap[String(menu.ID_BOT_MENU)] = menu.NOMBRE || 'Desconocido';
        });

        // Ordenar por ORDEN (como en excelParser)
        menus.sort((a, b) => {
            const numA = parseInt(a.ORDEN, 10) || 999;
            const numB = parseInt(b.ORDEN, 10) || 999;
            return numA - numB;
        });

        // Procesar cada menú como si fuera una fila del Excel (idéntico a excelParser)
        menus.forEach(menu => {
            const id = String(menu.ID_BOT_MENU);
            const parentId = menu.ID_PADRE ? String(menu.ID_PADRE) : null;
            
            const rawIdEncadenar = menu['ID menú encadenar'];
            const idEncadenar = rawIdEncadenar !== undefined && rawIdEncadenar !== null ? String(rawIdEncadenar).trim() : '';
            
            // Filtrar preguntas para este menú (como en excelParser)
            const nodeQuestions = questionsData.filter(q => 
                String(q['id del menu']).trim() === id
            );
            
            // Determinar si es tipo menú (corregido para detectar correctamente)
            // Un menú es aquel que tiene hijos o no tiene padre pero tiene ID_PADRE = 0 o null
            const hasChildren = menus.some(m => String(m.ID_PADRE) === id);
            const isRootMenu = (!parentId || parentId === '0' || parentId === 'null') && hasChildren;
            const isSubMenu = parentId && (parentId !== '0' && parentId !== 'null') && hasChildren;
            const isMenuType = isRootMenu || isSubMenu;
            
            // --- Construir jumpsTo (exactamente como en excelParser) ---
            const jumpsTo = [];
            if (idEncadenar) {
                jumpsTo.push({
                    type: 'chain',
                    targetId: idEncadenar,
                    targetName: idToNameMap[idEncadenar] || idEncadenar,
                });
            }

            // Procesar derivaciones desde BOT_MENU_DERIVACION (exactamente como excelParser)
            const nodeRoutings = routingData.filter(r => {
                // Buscar si alguna clave (que no sea 'valor') coincide con el ID del menú actual
                return Object.keys(r).some(k => {
                    if (k === 'valor' || k.includes('derivar') || k.includes('destino')) return false;
                    return String(r[k]).trim() === id;
                });
            });
            
            nodeRoutings.forEach(routing => {
                // Encontrar la clave que contiene el ID del menú a derivar
                const derivarKey = Object.keys(routing).find(k => k !== 'valor' && String(routing[k]).trim() !== id);
                const targetId = derivarKey ? String(routing[derivarKey]).trim() : null;
                
                if (!targetId || targetId === id) return; // Evitar derivaciones a sí mismo
                
                const rawSourceValue = String(routing.valor || '').trim();
                
                // 🔴 DIVIDIR SI CONTIENE COMAS (múltiples opciones en una misma línea) - igual que excelParser
                const sourceValues = rawSourceValue
                  .split(',')
                  .map(s => s.trim())
                  .filter(s => s !== '');

                // Si no hay valores, ignorar
                if (sourceValues.length === 0) return;

                // Crear una entrada por cada valor individual - igual que excelParser
                sourceValues.forEach(sv => {
                    jumpsTo.push({
                        type: 'route',
                        targetId: targetId,
                        targetName: idToNameMap[targetId] || targetId,
                        sourceValue: sv,
                    });
                });
            });

            // Función getDetails (idéntica a excelParser)
            const getDetails = (url) => {
                if (!url || typeof url !== 'string' || !url.startsWith('http')) return { type: 'none', url: '' };
                const cleanUrl = url.trim();
                const ext = cleanUrl.split('.').pop().toLowerCase().split('?')[0];
                
                if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return { type: 'image', url: cleanUrl };
                if (ext === 'pdf') return { type: 'pdf', url: cleanUrl };
                if (['doc', 'docx'].includes(ext)) return { type: 'word', url: cleanUrl };
                if (['xls', 'xlsx', 'csv'].includes(ext)) return { type: 'excel', url: cleanUrl };
                if (['mp4', 'mov', 'avi'].includes(ext)) return { type: 'video', url: cleanUrl };
                
                return { type: 'file', url: cleanUrl };
            };

            const rawImg = String(menu.IMAGEN || '').trim();
            const rawFile = String(menu.ARCHIVO || '').trim();
            
            let fileDetails = getDetails(rawImg);
            if (fileDetails.type === 'none') {
                fileDetails = getDetails(rawFile);
            }

            // --- Crear nodo exactamente como en excelParser ---
            // Solo mostrar respuestaFinal si el nodo tiene preguntas (tiene formulario)
            const tieneFormulario = nodeQuestions && nodeQuestions.length > 0;
            
            nodes.push({
                id: id,
                type: 'botNode',
                data: {
                    label: menu.NOMBRE || 'Sin Título',
                    type: menu.Opcion || 'Desconocido',
                    keyword: menu.PALABRA_CLAVE || '',
                    responseText: textResponsesMap[id] || menu.DESCRIPCION || '', // Usar BOT_TXT primero, luego DESCRIPCION
                    
                    latitud: menu.LATITUD || '',
                    longitud: menu.LONGITUD || '',
                    
                    imagen: fileDetails.type === 'image' ? fileDetails.url : '',
                    fileType: fileDetails.type, 
                    fileUrl: fileDetails.type !== 'image' ? fileDetails.url : '',
                    archivo: fileDetails.type === 'none' ? (rawImg || rawFile) : '', 

                    respuestaFinal: tieneFormulario ? (menu['Respuesta Final Formulario'] || '') : '', // Solo si tiene formulario
                    skill: menu.ID_SKILL ? `Skill ${menu.ID_SKILL}` : '',
                    visible: menu.VISIBLE === 1 ? 'Visible' : 'No Visible',
                    cierreTipologia: menu['Cierre de tipologia'] || '',
                    parentId: parentId,
                    isMenuType: isMenuType,
                    isRootMenu: isRootMenu,
                    isSubMenu: isSubMenu,
                    questions: nodeQuestions,
                    jumpsTo: jumpsTo 
                }
            });

            // --- Crear edge hacia padre (exactamente como en excelParser) ---
            if (parentId && parentId !== '0' && parentId !== 'undefined' && parentId !== 'null') {
                edges.push({
                    id: `e${parentId}-${id}`,
                    source: parentId,
                    target: id,
                    sourceHandle: 'source-bottom',
                    targetHandle: 'target-top',
                    type: 'treeEdge' 
                });
            }
        });
        
        res.json({ 
            success: true,
            nodes: nodes,
            edges: edges,
            count: nodes.length,
            botId: id_bot,
            empresaId: id_empresa,
            dbKey: db_key,
            botName: botDescripcion,
            welcomeMessage: mensajeBienvenida
        });
        
    } catch (error) {
        console.error('Error en /api/diagramas/bot-menu:', error);
        res.status(500).json({ 
            error: 'Error al generar diagrama desde BD: ' + error.message 
        });
    }
});

// GET /diagramas/bot-info - Obtener lista de bots con descripción para el filtro
router.post('/bot-info', async (req, res) => {
    const { db_key, id_empresa } = req.body;
    
    if (!db_key || !id_empresa) {
        return res.status(400).json({ 
            error: 'Faltan parámetros requeridos (db_key, id_empresa)' 
        });
    }
    
    const pool = pools[db_key];
    if (!pool) {
        return res.status(400).json({ error: 'Base de datos no válida' });
    }

    try {
        const [bots] = await pool.query(`
            SELECT 
                ID_BOT,
                DESCRIPCION
            FROM BOT
            WHERE ESTADO = 1
            ORDER BY DESCRIPCION ASC
        `);
        
        res.json(bots);
        
    } catch (error) {
        console.error('Error en /api/diagramas/bot-info:', error);
        res.status(500).json({ 
            error: 'Error al obtener bots: ' + error.message 
        });
    }
});

module.exports = router;
