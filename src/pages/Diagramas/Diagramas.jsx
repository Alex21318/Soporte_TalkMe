// Diagramas.jsx - Versión Final Estable (Tailwind v3)
import React, { useState, useCallback, useEffect } from 'react';
import ReactFlow, { 
  Background, 
  Controls, 
  applyNodeChanges, 
  applyEdgeChanges,
  useReactFlow,
  getRectOfNodes,
  MarkerType,
  addEdge,
  updateEdge,
  MiniMap,
  ReactFlowProvider
} from 'reactflow';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import 'reactflow/dist/style.css';
import './Diagramas.css';
import { API_URLS } from '../../config/api';
import { fetchWithAuth } from '../../utils/fetchWithAuth';
import { getLayoutedElements } from './utils/layout';
import { parseTalkMeExcel } from './utils/excelParser';
import BotNode from './components/BotNode';
import Sidebar from './components/Sidebar'; 
import ChainEdge from './components/ChainEdge';
import RoutingEdge from './components/RoutingEdge';
import TreeEdge from './components/TreeEdge'; 

const nodeTypes = { botNode: BotNode };
const edgeTypes = { chainEdge: ChainEdge, routingEdge: RoutingEdge, treeEdge: TreeEdge }; 

function DiagramasContent() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rawProjectData, setRawProjectData] = useState(null); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isReady, setIsReady] = useState(false);
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [botName, setBotName] = useState('');
  const [welcomeMessage, setWelcomeMessage] = useState('');
  
  const [showWelcome, setShowWelcome] = useState(true);
  const [showKeywords, setShowKeywords] = useState(true);
  const [showNodeTypes, setShowNodeTypes] = useState(true);
  
  const [contextMenu, setContextMenu] = useState(null);
  const [clientLogo, setClientLogo] = useState(null);
  const [savedBots, setSavedBots] = useState([]);
  const [toast, setToast] = useState({ show: false, message: '', type: 'info' });
  const [confirmModal, setConfirmModal] = useState({ show: false, title: '', message: '', onConfirm: null });

  const { getNodes, setCenter, fitView } = useReactFlow();

  // --- Persistencia en localStorage ---
  useEffect(() => {
    const savedSession = localStorage.getItem('talkme_last_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.rawProjectData) setRawProjectData(parsed.rawProjectData);
        if (parsed.botName) setBotName(parsed.botName);
        if (parsed.fileName) setFileName(parsed.fileName);
        if (parsed.welcomeMessage) setWelcomeMessage(parsed.welcomeMessage);
        if (parsed.showWelcome !== undefined) setShowWelcome(parsed.showWelcome);
        if (parsed.clientLogo) setClientLogo(parsed.clientLogo);
      } catch (e) {
        console.error("Error al cargar sesión:", e);
        localStorage.removeItem('talkme_last_session');
      }
    }

    // Inicializar inmediatamente
    setIsReady(true);
    
    // Hacer fitView si hay nodos
    setTimeout(() => {
      if (nodes.length > 0) {
        fitView({ duration: 300 });
      }
    }, 100);
  }, []);

  useEffect(() => {
    if (rawProjectData || botName !== '') {
      const sessionData = {
        rawProjectData, botName, fileName, welcomeMessage, showWelcome, clientLogo
      };
      localStorage.setItem('talkme_last_session', JSON.stringify(sessionData));
    }
  }, [rawProjectData, botName, fileName, welcomeMessage, showWelcome, clientLogo]);

  // --- Limpiar trabajo ---
  const handleClearWork = () => {
    setConfirmModal({
      show: true,
      title: "Limpiar pantalla",
      message: "¿Deseas borrar el diagrama actual? Esto limpiará la pantalla y la memoria temporal.",
      onConfirm: () => {
        localStorage.removeItem('talkme_last_session');
        setRawProjectData(null);
        setNodes([]);
        setEdges([]);
        setBotName('');
        setFileName(null);
        setWelcomeMessage('');
        setClientLogo(null);
        setConfirmModal({ show: false });
        showToast("Pantalla limpiada correctamente", "info");
      }
    });
  };

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
  };

  // --- Persistencia en base de datos (MySQL) ---
  const fetchSavedBots = async () => {
    try {
      const response = await fetchWithAuth(API_URLS.bots());
      const data = await response.json();
      setSavedBots(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error conectando con MySQL", error);
    }
  };

  useEffect(() => {
    fetchSavedBots();
  }, []);

  const handleSaveClick = async () => {
    if (!rawProjectData) return showToast("No hay flujo cargado para guardar.", "error");
    if (!botName.trim()) return showToast("Por favor, ingresa un nombre para el proyecto arriba.", "error");
    
    const existingBot = savedBots.find(b => b.bot_name.trim().toLowerCase() === botName.trim().toLowerCase());
    
    if (existingBot) {
      setConfirmModal({
        show: true,
        title: "Proyecto Existente",
        message: `El proyecto "${botName}" ya existe en la nube. ¿Deseas sobreescribir los datos?`,
        onConfirm: executeSaveToDatabase
      });
    } else {
      executeSaveToDatabase();
    }
  };

  const executeSaveToDatabase = async () => {
    setConfirmModal({ show: false, title: '', message: '', onConfirm: null }); 

    try {
      let payloadNodes = [...rawProjectData.rawNodes];
      if (clientLogo) {
        payloadNodes.push({ id: 'SYSTEM_CONFIG_LOGO', data: { clientLogo } });
      }

      const response = await fetchWithAuth(API_URLS.bots(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          botName, 
          welcomeMessage: showWelcome ? welcomeMessage : '', 
          fileName, 
          nodes: payloadNodes, 
          edges: rawProjectData.rawEdges 
        })
      });
      if (response.ok) {
        showToast("Proyecto guardado en la nube exitosamente.", "success");
        fetchSavedBots();
      } else {
        showToast("Error al guardar el proyecto.", "error");
      }
    } catch (error) {
      showToast("Error de conexión con el servidor.", "error");
    }
  };

  const loadFromDatabase = async (botId) => {
    if (!botId) return;
    try {
      const response = await fetchWithAuth(API_URLS.bot(botId));
      const data = await response.json();
      
      if (data) {
        setBotName(data.bot_name || '');
        setWelcomeMessage(data.welcome_message || '');
        setFileName(data.file_name || null);
        setShowWelcome(!!data.welcome_message && data.welcome_message.trim() !== '');

        let loadedNodes = [];
        let loadedEdges = [];
        try {
          loadedNodes = typeof data.nodes_data === 'string' ? JSON.parse(data.nodes_data) : data.nodes_data;
          loadedEdges = typeof data.edges_data === 'string' ? JSON.parse(data.edges_data) : data.edges_data;
        } catch (e) {
          console.error("Error parseando nodos/edges:", e);
        }
        
        const logoConfigNode = loadedNodes.find(n => n.id === 'SYSTEM_CONFIG_LOGO');
        if (logoConfigNode) {
          setClientLogo(logoConfigNode.data.clientLogo);
          loadedNodes = loadedNodes.filter(n => n.id !== 'SYSTEM_CONFIG_LOGO');
        } else {
          setClientLogo(null);
        }
        
        setRawProjectData({ rawNodes: loadedNodes, rawEdges: loadedEdges });
        showToast("Proyecto cargado con éxito.", "success");
      }
    } catch (error) {
      showToast("Error al cargar el proyecto.", "error");
    }
  };

  const handleClientLogoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setClientLogo(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  // --- Handlers de React Flow ---
  const onNodesChange = useCallback((changes) => setNodes((ns) => applyNodeChanges(changes, ns)), []);
  const onEdgesChange = useCallback((changes) => setEdges((es) => applyEdgeChanges(changes, es)), []);
  const onNodeClick = useCallback((_, node) => { setSelectedNode(node); setContextMenu(null); }, []);
  const onPaneClick = useCallback(() => setContextMenu(null), []);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge({ ...params, type: 'treeEdge', style: { stroke: '#94a3b8', strokeWidth: 2 }, updatable: true, selectable: true }, eds)),
    []
  );

  const onEdgeUpdate = useCallback(
    (oldEdge, newConnection) => setEdges((els) => updateEdge(oldEdge, newConnection, els)),
    []
  );

  const updateNodeData = (nodeId, newData) => {
    setNodes((nds) => nds.map((node) => {
      if (node.id === nodeId) {
        return { ...node, data: { ...node.data, ...newData } };
      }
      return node;
    }));
    
    if (rawProjectData) {
      setRawProjectData(prev => ({
        ...prev,
        rawNodes: prev.rawNodes.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n)
      }));
    }
  };

  // --- Menú contextual con posición inteligente ---
  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault(); 
      if (node.id === 'bot-root' || node.id === 'welcome-node' || node.data?.type === 'LOGO') return;

      let left = event.clientX;
      let top = event.clientY;
      const menuWidth = 280;
      const menuHeight = 120;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      if (left + menuWidth > viewportWidth) {
        left = viewportWidth - menuWidth - 10;
      }
      if (left < 10) left = 10;
      if (top + menuHeight > viewportHeight) {
        top = viewportHeight - menuHeight - 10;
      }
      if (top < 10) top = 10;

      setContextMenu({
        id: node.id,
        label: node.data?.label || node.id,
        top: top,
        left: left,
      });
    },
    [setContextMenu]
  );

  // --- Ocultar nodo y toda su rama ---
  const hideNodeAndBranch = () => {
    if (!contextMenu || !rawProjectData) return;
    
    const startNodeId = contextMenu.id;
    let idsToHide = new Set([startNodeId]);
    
    let changed = true;
    while (changed) {
      changed = false;
      rawProjectData.rawEdges.forEach(e => {
        if (!e.isChain && idsToHide.has(e.source) && !idsToHide.has(e.target)) {
          idsToHide.add(e.target);
          changed = true;
        }
      });
    }

    const newNodes = rawProjectData.rawNodes.map(n => {
      if (idsToHide.has(n.id)) return { ...n, data: { ...n.data, isHiddenManually: true } };
      return n;
    });

    setRawProjectData({ ...rawProjectData, rawNodes: newNodes });
    setContextMenu(null);
    showToast(`Se ocultaron ${idsToHide.size} nodos en esta rama.`, "info");
  };

  const restoreHiddenNode = (nodeId) => {
    const newNodes = rawProjectData.rawNodes.map(n => {
      if (n.id === nodeId) return { ...n, data: { ...n.data, isHiddenManually: false } };
      return n;
    });
    setRawProjectData({ ...rawProjectData, rawNodes: newNodes });
    showToast("Nodo restaurado al diagrama.", "success");
  };

  const restoreAllHiddenNodes = () => {
    const newNodes = rawProjectData.rawNodes.map(n => ({
      ...n,
      data: { ...n.data, isHiddenManually: false }
    }));
    setRawProjectData({ ...rawProjectData, rawNodes: newNodes });
    showToast("Todos los nodos han sido restaurados.", "success");
  };

  // --- Construcción del diagrama (layout, nodos, aristas) ---
  useEffect(() => {
    if (!rawProjectData) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const buildDiagram = async () => {
      const { rawNodes, rawEdges } = rawProjectData;
      
      let currentNodes = rawNodes.filter(n => !n.data?.isHiddenManually);
      const validNodeIds = new Set(currentNodes.map(n => n.id));
      let currentEdges = rawEdges.filter(e => validNodeIds.has(e.source) && validNodeIds.has(e.target));

      const nodesWithSettings = currentNodes.map(n => ({
        ...n,
        data: { ...n.data, showKeywords, showNodeTypes }
      }));

      const virtualNodes = [
        { id: 'bot-root', type: 'botNode', data: { label: botName || 'BOT', type: 'BOT', isVirtual: true, showKeywords, showNodeTypes } }
      ];

      let rootSourceId = 'bot-root';

      if (showWelcome && welcomeMessage.trim() !== '') {
        virtualNodes.push({ 
          id: 'welcome-node', 
          type: 'botNode', 
          data: { label: 'Mensaje de Bienvenida', type: 'BIENVENIDA', responseText: welcomeMessage, isVirtual: true, showKeywords, showNodeTypes } 
        });
        currentEdges.push({ id: 'edge-bot-welcome', source: 'bot-root', target: 'welcome-node', sourceHandle: 'source-bottom', targetHandle: 'target-top', type: 'treeEdge' });
        rootSourceId = 'welcome-node';
      }

      const excelRoots = nodesWithSettings.filter(node => {
        const hasParentInActiveEdges = currentEdges.some(edge => edge.target === node.id && !edge.isChain);
        return !hasParentInActiveEdges;
      });

      const connectionEdges = excelRoots.map(root => ({
        id: `edge-root-${root.id}`,
        source: rootSourceId,
        target: root.id,
        sourceHandle: 'source-bottom',
        targetHandle: 'target-top',
        type: 'treeEdge'
      }));

      const layouted = await getLayoutedElements(
        [...virtualNodes, ...nodesWithSettings], 
        [...currentEdges, ...connectionEdges],
        { showKeywords, showNodeTypes }
      );
      
      const styledEdges = layouted.edges.map(edge => {
        const baseProps = { ...edge, updatable: true, selectable: true, interactionWidth: 20 };
        
        const isClientResponse = edge.label?.toLowerCase().includes('escribe') || edge.isRouting;
        const className = isClientResponse ? 'edge-punteada-simple' : '';

        if (edge.isChain) return { ...baseProps, type: 'chainEdge', animated: true, zIndex: 10, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } };
        if (edge.isRouting) return { 
          ...baseProps, 
          type: 'routingEdge', 
          targetHandle: 'target-routing',
          className: className,
          animated: true, 
          zIndex: 10, 
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' } 
        };
        return { ...baseProps, type: 'treeEdge', className: className, targetHandle: 'target-top', zIndex: 1, style: { stroke: '#94a3b8', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } };
      });

      const shouldCenterLabel = !showNodeTypes && !showKeywords;
      let finalNodes = layouted.nodes.map(node => ({
        ...node,
        className: shouldCenterLabel && node.type === 'botNode' ? 'centered-label-node' : node.className
      }));
      
      const rootNodePosition = finalNodes.find(n => n.id === 'bot-root')?.position;
      
      if (rootNodePosition) {
        // bot-root: 360px ancho. Logo: 200px ancho. Gap: 60px a cada lado.
        // TalkMe: borde izq = rootNodePosition.x + 360 + 60
        // Cliente: borde izq = rootNodePosition.x - 60 - 200
        const GAP = 60;
        const LOGO_W = 120;
        const ROOT_W = 360;
        finalNodes.push({
          id: 'logo-talkme',
          type: 'botNode',
          position: { x: rootNodePosition.x + ROOT_W + GAP, y: rootNodePosition.y },
          data: { type: 'LOGO', imageUrl: '/assets/Talkme.png' },
          draggable: false, selectable: false
        });

        if (clientLogo) {
          finalNodes.push({
            id: 'logo-client',
            type: 'botNode',
            position: { x: rootNodePosition.x - GAP - LOGO_W, y: rootNodePosition.y },
            data: { type: 'LOGO', imageUrl: clientLogo },
            draggable: false, selectable: false
          });
        }
      }

      setNodes(finalNodes);
      setEdges(styledEdges);
    };

    buildDiagram();
  }, [rawProjectData, botName, welcomeMessage, showWelcome, clientLogo, showKeywords, showNodeTypes]);

  // --- Importar archivo Excel ---
  const processFile = async (file) => {
    if (!file || !file.name.endsWith('.xlsx')) return showToast("Por favor, sube un archivo Excel (.xlsx)", "error");
    
    setFileName(file.name);
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    setBotName(nameWithoutExt);

    try {
      const rawData = await parseTalkMeExcel(file);
      if (rawData.nodes.length === 0) return showToast("No se encontraron Nodos legibles.", "error");
      
      setRawProjectData({ rawNodes: rawData.nodes, rawEdges: rawData.edges });
      setSelectedNode(null);
      showToast("Reporte importado correctamente.", "success");
    } catch (error) {
      showToast("Error al leer el archivo: " + error.message, "error");
    }
  };

  const handleFileUpload = (event) => {
    if (event.target.files && event.target.files.length > 0) processFile(event.target.files[0]);
  };

  // --- Exportar a PDF ---
  const exportToPDFLogic = async () => {
    const currentNodes = getNodes();
    if (currentNodes.length === 0) {
      console.error('PDF Export: No hay nodos');
      return;
    }
    
    const nodesBounds = getRectOfNodes(currentNodes);
    console.log('PDF Export: bounds=', nodesBounds);
    
    let imageWidth = Math.ceil(nodesBounds.width + 400);
    let imageHeight = Math.ceil(nodesBounds.height + 400);
    
    // Límite seguro de jsPDF es 14400, usamos 10000 para dejar margen y mejor compatibilidad
    const maxSafeSize = 10000;
    let pdfScale = 1;
    if (imageWidth > maxSafeSize || imageHeight > maxSafeSize) {
      pdfScale = Math.min(maxSafeSize / imageWidth, maxSafeSize / imageHeight);
      imageWidth = Math.ceil(imageWidth * pdfScale);
      imageHeight = Math.ceil(imageHeight * pdfScale);
      console.log(`PDF Export: escalado a ${pdfScale.toFixed(3)} -> ${imageWidth}x${imageHeight} px`);
    }
    
    console.log(`PDF Export: dimensiones finales=${imageWidth}x${imageHeight} px`);
    
    const tileSize = 4096;
    const totalPixels = imageWidth * imageHeight;
    // Calidad máxima balanceada: mejor calidad manteniendo < 5MB
    const pixelRatio = totalPixels > 80000000 ? 1.25 : totalPixels > 40000000 ? 1.5 : 1.75;
    const quality = totalPixels > 80000000 ? 0.78 : totalPixels > 40000000 ? 0.88 : 0.95;
    
    console.log(`PDF Export: tiles=${Math.ceil(imageWidth/tileSize)}x${Math.ceil(imageHeight/tileSize)}, quality=${quality}, pixelRatio=${pixelRatio}`);
    
    const viewportElement = document.querySelector('.react-flow__viewport');
    if (!viewportElement) {
      console.error('PDF Export: No se encontró viewport element');
      throw new Error('Viewport no encontrado');
    }

    const pdf = new jsPDF({ 
      orientation: imageWidth > imageHeight ? 'l' : 'p',
      unit: 'px', 
      format: [imageWidth, imageHeight],
      compress: true 
    });

    let tileCount = 0;
    const totalTiles = Math.ceil(imageWidth / tileSize) * Math.ceil(imageHeight / tileSize);
    
    for (let tileY = 0; tileY < imageHeight; tileY += tileSize) {
      for (let tileX = 0; tileX < imageWidth; tileX += tileSize) {
        tileCount++;
        const tileWidth = Math.min(tileSize, imageWidth - tileX);
        const tileHeight = Math.min(tileSize, imageHeight - tileY);
        
        console.log(`PDF Export: tile ${tileCount}/${totalTiles} en (${tileX},${tileY}) tamaño ${tileWidth}x${tileHeight}`);
        
        try {
          // Pequeño delay para no bloquear el UI
          if (tileCount > 1) await new Promise(r => setTimeout(r, 50));
          
          const dataUrl = await toJpeg(viewportElement, {
            backgroundColor: '#f8fafc',
            width: tileWidth,
            height: tileHeight,
            style: {
              width: `${Math.ceil(tileWidth / pdfScale)}px`,
              height: `${Math.ceil(tileHeight / pdfScale)}px`,
              transform: `translate(${(-nodesBounds.x + 200) * pdfScale - tileX}px, ${(-nodesBounds.y + 200) * pdfScale - tileY}px) scale(${pdfScale})`,
              transformOrigin: 'top left'
            },
            quality,
            pixelRatio,
            cacheBust: true,
            fetchRequest: { cache: 'no-store' }
          });

          if (!dataUrl || dataUrl.length < 100) {
            console.error(`PDF Export: tile ${tileCount} generó imagen vacía`);
            continue;
          }

          pdf.addImage(dataUrl, 'JPEG', tileX, tileY, tileWidth, tileHeight);
          console.log(`PDF Export: tile ${tileCount} agregado OK`);
          
        } catch (tileError) {
          console.error(`PDF Export: ERROR en tile ${tileCount}:`, tileError);
          // Continuar con el siguiente tile, no abortar todo
        }
      }
    }
    
    console.log('PDF Export: Guardando archivo...');
    const safeName = botName.trim() ? botName.replace(/\s+/g, '_') : 'Diagrama';
    pdf.save(`Flujo_${safeName}.pdf`);
    console.log('PDF Export: COMPLETADO');
  };

  const handleExportClick = async () => {
    if (isExporting) return;
    setIsExporting(true);
    showToast('Generando PDF en tiles (puede tardar en diagramas grandes)...', 'info');
    
    // Dar tiempo al UI para mostrar el mensaje antes de empezar
    await new Promise(r => setTimeout(r, 100));
    
    try {
      await exportToPDFLogic();
      setIsExporting(false);
      showToast('PDF descargado correctamente.', 'success');
    } catch (e) {
      console.error('PDF Export Error:', e);
      setIsExporting(false);
      showToast('Error al generar PDF: ' + (e.message || 'Revisa la consola (F12)'), 'error');
    }
  };

  // --- Colores para el MiniMap ---
  const getMiniMapColor = (node) => {
    if (node.id === 'bot-root') return '#8b5cf6'; 
    if (node.id === 'logo-talkme' || node.id === 'logo-client') return '#cbd5e1'; 
    
    const type = node.data?.type ? String(node.data.type).toLowerCase() : '';
    if (node.data?.isMenuType) return node.data?.isRootMenu ? '#10b981' : '#f59e0b'; 
    if (type.includes('bienvenida')) return '#ec4899'; 
    if (type.includes('texto')) return '#3b82f6'; 
    if (type.includes('skill')) return '#22c55e'; 
    if (type.includes('formulario')) return '#f97316'; 
    if (type.includes('consumo') || type.includes('dinamico') || type.includes('servicio web')) return '#f43f5e'; 
    if (type.includes('sucursal')) return '#6366f1'; 
    
    return '#94a3b8'; 
  };

  const handleMiniMapClick = useCallback((event, node) => {
    event.preventDefault();
    if (node.id === 'logo-talkme' || node.id === 'logo-client') return;
    const x = node.position.x + (node.width || 340) / 2;
    const y = node.position.y + (node.height || 150) / 2;
    setCenter(x, y, { zoom: 1.3, duration: 800 });
    setSelectedNode(node);
    setContextMenu(null);
  }, [setCenter, setSelectedNode, setContextMenu]);

  const hasDiagram = nodes.length > 0;
  const hiddenNodesList = rawProjectData?.rawNodes.filter(n => n.data?.isHiddenManually) || [];

  const getTypeTooltip = () => showNodeTypes ? "Ocultar tipo de Nodo" : "Mostrar tipo de Nodo";
  const getKeywordTooltip = () => showKeywords ? "Ocultar Palabra Clave" : "Mostrar Palabra Clave";

  return (
    <div id="modulo-diagramas-root" className="w-full h-full flex flex-col font-sans relative" style={{ minHeight: '100vh' }}>
      
      {/* BARRA SUPERIOR */}
      <header className="top-navbar flex-shrink-0 z-50">
        <div className="nav-logo">
          <img src="/assets/Logo_Talkme.png" alt="TalkMe" />
        </div>

        <div className="project-info">
          <input
            type="text"
            value={botName}
            onChange={(e) => setBotName(e.target.value)}
            placeholder="Nombre del proyecto"
            className="project-name-input"
          />
          {fileName && (
            <span className="file-name" title={fileName}>
              📄 {fileName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          
          <div className="toggle-group">
            <button 
              className={`toggle-btn ${showNodeTypes ? 'active' : ''}`}
              onClick={() => setShowNodeTypes(!showNodeTypes)}
              title={getTypeTooltip()}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l5 5a2 2 0 01.586 1.414V19a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" />
                </svg>
                Tipo
              </span>
            </button>
            <button 
              className={`toggle-btn ${showKeywords ? 'active' : ''}`}
              onClick={() => setShowKeywords(!showKeywords)}
              title={getKeywordTooltip()}
            >
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                </svg>
                Keyword
              </span>
            </button>
          </div>

          <div className="nav-divider"></div>

          <label className="nav-btn nav-btn-secondary cursor-pointer">
            <img src="/assets/EXCEL.png" alt="Excel" className="w-4 h-4 object-contain" onError={(e) => e.target.style.display = 'none'} />
            <span>Importar</span>
            <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
          </label>

          <button onClick={handleClearWork} className="nav-btn nav-btn-outline">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Limpiar</span>
          </button>

          <div className="nav-divider"></div>

          <div className="relative">
            <select 
              onChange={(e) => loadFromDatabase(e.target.value)}
              className="custom-select"
              defaultValue=""
            >
              <option value="" disabled>📁 Abrir desde nube</option>
              {savedBots.map(bot => (
                <option key={bot.id} value={bot.id}>
                  {bot.bot_name} ({new Date(bot.updated_at).toLocaleDateString()})
                </option>
              ))}
            </select>
            <svg className="w-3.5 h-3.5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <button 
            onClick={handleSaveClick} 
            disabled={!hasDiagram} 
            className={`nav-btn ${hasDiagram ? 'nav-btn-primary' : 'nav-btn-outline opacity-50 cursor-not-allowed'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            <span>Guardar</span>
          </button>

          <div className="nav-divider"></div>

          <button 
            onClick={handleExportClick} 
            disabled={!hasDiagram || isExporting} 
            className={`nav-btn ${(!hasDiagram || isExporting) ? 'nav-btn-outline opacity-50 cursor-not-allowed' : 'nav-btn-danger'}`}
          >
            <img src="/assets/PDF.png" alt="PDF" className="w-4 h-4 object-contain" onError={(e) => e.target.style.display = 'none'} />
            <span>{isExporting ? 'Procesando...' : 'Exportar PDF'}</span>
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="nav-btn nav-btn-secondary"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Ajustes</span>
          </button>
        </div>
      </header>

      {/* ÁREA PRINCIPAL DEL DIAGRAMA */}
      <main className="flex-grow flex relative w-full" style={{ height: 'calc(100vh - 73px)', minHeight: '500px' }} onClick={onPaneClick}>
        {!hasDiagram && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-20 pointer-events-none">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl p-8 shadow-xl border border-slate-100">
              <img src="/assets/Logo_Talkme.png" alt="TalkMe" className="w-64 object-contain opacity-60" />
              <p className="mt-4 text-slate-400 font-bold tracking-widest text-xs uppercase text-center">Importa un archivo Excel para comenzar</p>
            </div>
          </div>
        )}
        
        <div className={`absolute inset-0 transition-opacity duration-500 ${hasDiagram ? 'opacity-100 z-10' : 'opacity-0 -z-10'}`} style={{ width: '100%', height: '100%' }}>
          <ReactFlow 
            nodes={nodes} 
            edges={edges} 
            onNodesChange={onNodesChange} 
            onEdgesChange={onEdgesChange} 
            onNodeClick={onNodeClick} 
            onNodeContextMenu={onNodeContextMenu} 
            onConnect={onConnect} 
            onEdgeUpdate={onEdgeUpdate}
            deleteKeyCode="Backspace"
            nodeTypes={nodeTypes} 
            edgeTypes={edgeTypes} 
            fitView 
            fitViewOptions={{ padding: 0.2, duration: 500 }}
            minZoom={0.1} 
            maxZoom={4} 
            attributionPosition="bottom-right"
            defaultViewport={{ x: 0, y: 0, zoom: 1 }}
          >
            <Background color="#cbd5e1" gap={20} size={1.2} />
            <Controls className="!bg-white/90 !backdrop-blur-sm !border-none !shadow-2xl !rounded-xl overflow-hidden mb-6 ml-6" />
            <MiniMap 
              nodeColor={getMiniMapColor} 
              nodeStrokeWidth={3} 
              nodeBorderRadius={8}
              onNodeClick={handleMiniMapClick}
              className="!bg-white/80 !backdrop-blur-md border border-white/50 !shadow-[0_8px_30px_rgb(0,0,0,0.12)] !rounded-2xl overflow-hidden cursor-crosshair m-6 transition-all hover:!shadow-[0_12px_40px_rgb(0,0,0,0.18)]"
              maskColor="rgba(241, 245, 249, 0.6)"
              pannable={true} 
              zoomable={true} 
            />
          </ReactFlow>
        </div>

        {/* MENÚ CONTEXTUAL */}
        {contextMenu && (
          <div 
            className="context-menu"
            style={{ top: contextMenu.top, left: contextMenu.left }}
          >
            <div className="px-4 py-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block mb-1">Nodo seleccionado</span>
              <span className="text-sm font-bold text-slate-800 truncate block">{contextMenu.label}</span>
            </div>
            <button 
              onClick={hideNodeAndBranch} 
              className="context-menu-item w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-3 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
              Ocultar este nodo y toda su rama
            </button>
            <div className="px-4 py-2 bg-slate-50 border-t border-slate-100">
              <span className="text-[9px] text-slate-400">Puedes restaurar los nodos ocultos desde Ajustes</span>
            </div>
          </div>
        )}

        {/* SIDEBAR DERECHO */}
        {selectedNode && (
          <div className="absolute right-0 top-0 h-full z-40 shadow-2xl transition-transform duration-300">
            <Sidebar selectedNode={selectedNode} onClose={() => setSelectedNode(null)} onUpdateNode={updateNodeData} />
          </div>
        )}
      </main>

      {/* MODAL DE AJUSTES */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animation-fade-in p-4">
          <div className="settings-modal">
            <div className="settings-header">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-800 to-slate-700 rounded-2xl flex items-center justify-center shadow-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Configuración</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Personaliza tu experiencia</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSettingsOpen(false)} 
                  className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="settings-body custom-scrollbar">
              <div className="settings-section">
                <div className="settings-section-title">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <h3 className="font-bold text-slate-700">Identidad visual</h3>
                </div>
                <div className="flex items-center gap-4">
                  {clientLogo ? (
                    <div className="relative">
                      <img src={clientLogo} alt="Logo" className="w-16 h-16 rounded-2xl object-contain border-2 border-slate-200 bg-white p-2 shadow-sm" />
                      <button 
                        onClick={() => setClientLogo(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-rose-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium bg-white text-slate-600 border-2 border-slate-200 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition-all">
                    {clientLogo ? 'Cambiar logo' : 'Subir logo del cliente'}
                    <input type="file" accept="image/*" className="hidden" onChange={handleClientLogoUpload} />
                  </label>
                </div>
              </div>

              <div className="settings-section">
                <div className="settings-section-title">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <h3 className="font-bold text-slate-700">Saludo inicial</h3>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-600">Mostrar mensaje de bienvenida</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={showWelcome} onChange={(e) => setShowWelcome(e.target.checked)} />
                    <div className="w-11 h-6 bg-slate-200 rounded-full peer peer-checked:bg-blue-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5"></div>
                  </label>
                </div>
                {showWelcome && (
                  <div className="mt-3">
                    <textarea 
                      rows={3} 
                      value={welcomeMessage} 
                      onChange={(e) => setWelcomeMessage(e.target.value)} 
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 resize-none transition-all" 
                      placeholder="¡Hola! Bienvenido a nuestro asistente virtual. ¿En qué puedo ayudarte hoy?" 
                    />
                  </div>
                )}
              </div>

              {hiddenNodesList.length > 0 && (
                <div className="settings-section" style={{ background: '#fef2f2', borderColor: '#fecaca' }}>
                  <div className="settings-section-title" style={{ borderBottomColor: '#fecaca' }}>
                    <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                    <h3 className="font-bold text-rose-700">Nodos ocultos ({hiddenNodesList.length})</h3>
                    <button onClick={restoreAllHiddenNodes} className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-medium underline">
                      Restaurar todos
                    </button>
                  </div>
                  <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                    {hiddenNodesList.map(n => (
                      <div key={n.id} className="flex items-center justify-between bg-white border border-rose-200 px-3 py-2.5 rounded-xl shadow-sm">
                        <span className="text-sm font-medium text-slate-700 truncate max-w-[250px]">{n.data?.label || n.id}</span>
                        <button 
                          onClick={() => restoreHiddenNode(n.id)} 
                          className="text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg font-medium transition-all"
                        >
                          Mostrar
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="settings-footer">
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="px-6 py-2.5 bg-gradient-to-r from-slate-800 to-slate-700 text-white rounded-xl text-sm font-semibold hover:from-slate-700 hover:to-slate-600 shadow-md transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animation-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 m-4 transform transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-black text-slate-800">{confirmModal.title}</h3>
            </div>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors border border-slate-200"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICACIONES */}
      {toast.show && (
        <div className={`fixed top-20 left-1/2 transform -translate-x-1/2 z-[300] flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl font-bold text-sm transition-all duration-300 ${
          toast.type === 'success' ? 'bg-emerald-600 text-white' : 
          toast.type === 'error' ? 'bg-rose-600 text-white' : 
          'bg-slate-800 text-white'
        }`}>
          {toast.type === 'success' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

// Componente principal SIN inyección de CDN
export default function Diagramas() {
  return (
    <div style={{ width: '100%', height: '100%', minHeight: '100vh', display: 'flex' }}>
      <ReactFlowProvider>
        <DiagramasContent />
      </ReactFlowProvider>
    </div>
  );
}