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
  MiniMap
} from 'reactflow';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import 'reactflow/dist/style.css';
import { getLayoutedElements } from './utils/layout';
import { parseTalkMeExcel } from './utils/excelParser';
import BotNode from './components/BotNode';
import Sidebar from './components/Sidebar';
import ChainEdge from './components/ChainEdge';
import RoutingEdge from './components/RoutingEdge';
import TreeEdge from './components/TreeEdge'; 

const nodeTypes = { botNode: BotNode };
const edgeTypes = { chainEdge: ChainEdge, routingEdge: RoutingEdge, treeEdge: TreeEdge }; 

export default function App() {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [rawProjectData, setRawProjectData] = useState(null); 
  const [selectedNode, setSelectedNode] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // 🔴 Cambios: BotName arranca vacío y el mensaje de bienvenida también.
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

  const { getNodes, setCenter } = useReactFlow();

  const showToast = (message, type = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'info' }), 4000);
  };

  const fetchSavedBots = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/bots');
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
    if (!botName.trim()) return showToast("Por favor, ingresa un nombre para el bot.", "error");
    
    const existingBot = savedBots.find(b => b.bot_name.trim().toLowerCase() === botName.trim().toLowerCase());
    
    if (existingBot) {
      setConfirmModal({
        show: true,
        title: "Proyecto Existente",
        message: `El proyecto "${botName}" ya existe en la base de datos. ¿Deseas sobreescribir los datos anteriores?`,
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

      const response = await fetch('http://localhost:3001/api/bots', {
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
    try {
      const response = await fetch(`http://localhost:3001/api/bots/${botId}`);
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

  const onNodeContextMenu = useCallback(
    (event, node) => {
      event.preventDefault(); 
      if (node.id === 'bot-root' || node.id === 'welcome-node' || node.data?.type === 'LOGO') return;

      setContextMenu({
        id: node.id,
        label: node.data?.label || node.id,
        top: event.clientY,
        left: event.clientX,
      });
    },
    [setContextMenu]
  );

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

  useEffect(() => {
    if (!rawProjectData) return;

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
        if (edge.isChain) return { ...baseProps, type: 'chainEdge', animated: true, zIndex: 10, markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' } };
        if (edge.isRouting) return { 
          ...baseProps, 
          type: 'routingEdge', 
          targetHandle: 'target-routing',
          animated: true, 
          zIndex: 10, 
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0ea5e9' } 
        };
        return { ...baseProps, type: 'treeEdge', targetHandle: 'target-top', zIndex: 1, style: { stroke: '#94a3b8', strokeWidth: 2 }, markerEnd: { type: MarkerType.ArrowClosed, color: '#94a3b8' } };
      });

      let finalNodes = [...layouted.nodes];
      const rootNodePosition = finalNodes.find(n => n.id === 'bot-root')?.position;
      
      if (rootNodePosition) {
        finalNodes.push({
          id: 'logo-talkme',
          type: 'botNode',
          position: { x: rootNodePosition.x + 380, y: rootNodePosition.y - 20 },
          data: { type: 'LOGO', imageUrl: 'https://portal.talkme.pro/portal_talkme/login/img/talkmeservices.png' },
          draggable: false, selectable: false
        });

        if (clientLogo) {
          finalNodes.push({
            id: 'logo-client',
            type: 'botNode',
            position: { x: rootNodePosition.x - 300, y: rootNodePosition.y - 20 },
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

  const processFile = async (file) => {
    if (!file || !file.name.endsWith('.xlsx')) return showToast("Por favor, sube un archivo Excel (.xlsx)", "error");
    
    // 🔴 Guarda el nombre del archivo y lo establece como el nombre del bot (sin la extensión .xlsx)
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

  const exportToPDFLogic = async () => {
    const currentNodes = getNodes();
    if (currentNodes.length === 0) return;
    
    const nodesBounds = getRectOfNodes(currentNodes);
    const imageWidth = nodesBounds.width + 400; 
    const imageHeight = nodesBounds.height + 400;
    
    const viewportElement = document.querySelector('.react-flow__viewport');
    
    const dataUrl = await toJpeg(viewportElement, {
      backgroundColor: '#f8fafc', 
      width: imageWidth, 
      height: imageHeight,
      style: { 
        width: `${imageWidth}px`, 
        height: `${imageHeight}px`, 
        transform: `translate(${-nodesBounds.x + 200}px, ${-nodesBounds.y + 200}px) scale(1)` 
      },
      quality: 0.8, 
      pixelRatio: 1.5,
      fetchRequest: { cache: 'no-cache' } 
    });
    
    const pdf = new jsPDF({ 
      orientation: imageWidth > imageHeight ? 'l' : 'p', 
      unit: 'px', 
      format: [imageWidth, imageHeight], 
      compress: true 
    });
    
    pdf.addImage(dataUrl, 'JPEG', 0, 0, imageWidth, imageHeight);
    pdf.setFontSize(30);
    pdf.setTextColor(51, 65, 85);
    pdf.text(`Flujo Estratégico: ${botName}`, 40, 60);
    
    // Si no hay botName asignado, le pone un nombre por defecto al PDF
    const safeName = botName.trim() ? botName.replace(/\s+/g, '_') : 'Diagrama';
    pdf.save(`Flujo_${safeName}.pdf`);
  };

  const handleExportClick = () => {
    if (isExporting) return;
    setIsExporting(true);
    showToast('Generando mapa en alta calidad...', 'info');
    
    setTimeout(() => {
      exportToPDFLogic().then(() => {
        setIsExporting(false);
        showToast('PDF descargado correctamente.', 'success');
      }).catch((e) => {
        console.error(e);
        setIsExporting(false);
        showToast('Error al generar el PDF.', 'error');
      });
    }, 400);
  };

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

  return (
    <div className="w-screen h-screen flex bg-slate-50 overflow-hidden font-sans relative">
      
      {/* MODAL DE CONFIRMACIÓN */}
      {confirmModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animation-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 m-4">
            <h3 className="text-lg font-black text-slate-800 mb-2 flex items-center gap-2">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
              {confirmModal.title}
            </h3>
            <p className="text-sm text-slate-600 mb-8 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmModal({ show: false, title: '', message: '', onConfirm: null })} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
              <button onClick={confirmModal.onConfirm} className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition-colors">Sobreescribir</button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICACIONES */}
      {toast.show && (
        <div className={`fixed top-6 left-1/2 transform -translate-x-1/2 z-[100] flex items-center gap-3 px-6 py-3.5 rounded-full shadow-2xl font-bold text-sm transition-all duration-300 ${toast.type === 'error' ? 'bg-rose-600 text-white' : toast.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'}`}>
           {toast.type === 'error' ? (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           ) : toast.type === 'success' ? (
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
           ) : (
             <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           )}
           {toast.message}
        </div>
      )}

      {/* BARRA LATERAL PREMIUM */}
      <aside className={`${isSidebarOpen ? 'w-[360px] translate-x-0' : 'w-0 -translate-x-full opacity-0'} shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col z-40 shadow-2xl transition-all duration-300 relative`}>
        <div className="h-full w-[360px] flex flex-col overflow-y-auto custom-scrollbar">
          
          {/* 🔴 Cabecera con Logo de TalkMe */}
          <div className="sticky top-0 bg-slate-50/90 backdrop-blur-md z-10 px-6 py-5 border-b border-slate-200/60 flex items-center justify-center">
            <img src="/Logo%20Talkme.png" alt="TalkMe" className="h-10 object-contain drop-shadow-sm" />
          </div>

          <div className="p-5 space-y-6">

            {/* SECCIÓN 1: ORIGEN DE DATOS */}
            <div className="space-y-3">
              <label className="group relative overflow-hidden border-2 border-dashed border-blue-200 hover:border-blue-400 rounded-2xl p-5 flex flex-col items-center justify-center text-center cursor-pointer bg-white hover:bg-blue-50/50 transition-all duration-300 shadow-sm">
                <svg className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                <span className="text-sm font-black text-slate-700 uppercase tracking-wide group-hover:text-blue-700">{fileName ? 'Reemplazar Excel' : 'Cargar Reporte .xlsx'}</span>
                <span className="text-[10px] text-slate-500 mt-1 font-medium px-2">{fileName || 'Selecciona tu archivo para generar el mapa'}</span>
                <input type="file" accept=".xlsx" className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            {/* SECCIÓN 2: PROYECTO */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Proyecto</h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 tracking-wider">Nombre del Bot</label>
                  <input type="text" value={botName} onChange={(e) => setBotName(e.target.value)} placeholder="Ej: BOT DE VENTAS" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all shadow-inner" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5 tracking-wider">Logo del Cliente</label>
                  <div className="flex items-center gap-3">
                    {clientLogo && <img src={clientLogo} alt="Logo" className="w-10 h-10 rounded-lg object-contain border border-slate-200 bg-slate-50 p-1" />}
                    <label className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-bold bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-blue-600 cursor-pointer transition-all shadow-sm">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                      {clientLogo ? 'Cambiar Logo' : 'Subir Imagen'}
                      <input type="file" accept="image/*" className="hidden" onChange={handleClientLogoUpload} />
                    </label>
                    {clientLogo && (
                      <button onClick={() => setClientLogo(null)} className="p-2 text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-colors" title="Quitar logo">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN 3: CONFIGURACIÓN VISUAL (LOS TOGGLES) */}
            <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Apariencia</h3>
              </div>
              
              <div className="divide-y divide-slate-100">
                {/* 1. Nodo Bienvenida */}
                <div className="flex flex-col">
                  <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded bg-pink-100 text-pink-500 flex items-center justify-center shrink-0">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                      <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">Mensaje de Bienvenida</span>
                    </div>
                    <div className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input type="checkbox" className="sr-only peer" checked={showWelcome} onChange={(e) => setShowWelcome(e.target.checked)} />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                    </div>
                  </label>
                  {showWelcome && (
                    <div className="px-4 pb-4 bg-white animate-fade-in-up">
                      <textarea rows={2} value={welcomeMessage} onChange={(e) => setWelcomeMessage(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none shadow-inner" placeholder="Ej: ¡Hola! Soy tu asistente virtual..." />
                    </div>
                  )}
                </div>

                {/* 2. Mostrar Tipo de Nodo */}
                <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-indigo-100 text-indigo-500 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">Etiquetas de Tipología</span>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={showNodeTypes} onChange={(e) => setShowNodeTypes(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </div>
                </label>

                {/* 3. Mostrar Palabra Clave */}
                <label className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded bg-amber-100 text-amber-500 flex items-center justify-center shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>
                    </div>
                    <span className="text-xs font-bold text-slate-700 group-hover:text-slate-900">Palabras Clave (Keywords)</span>
                  </div>
                  <div className="relative inline-flex items-center cursor-pointer shrink-0">
                    <input type="checkbox" className="sr-only peer" checked={showKeywords} onChange={(e) => setShowKeywords(e.target.checked)} />
                    <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500"></div>
                  </div>
                </label>
              </div>
            </div>

            {/* SECCIÓN 4: NUBE DE PROYECTOS (ESTILO DARK PREMIUM) */}
            <div className="bg-slate-800 rounded-2xl shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
              <div className="p-5 relative z-10 space-y-4">
                <h3 className="text-[10px] font-black text-blue-300 uppercase tracking-widest flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" /></svg>
                  Nube Segura
                </h3>
                
                {savedBots && savedBots.length > 0 && (
                  <div className="relative">
                    <select 
                      onChange={(e) => loadFromDatabase(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 text-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer appearance-none shadow-inner"
                      defaultValue=""
                    >
                      <option value="" disabled>📁 Abrir proyecto guardado...</option>
                      {savedBots.map(bot => (
                        <option key={bot.id} value={bot.id}>
                          {bot.bot_name} ({new Date(bot.updated_at).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                    <svg className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </div>
                )}

                <button onClick={handleSaveClick} disabled={!hasDiagram} className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md ${hasDiagram ? 'bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/25' : 'bg-slate-700 text-slate-500 cursor-not-allowed border border-slate-600/50'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                  Guardar en la Nube
                </button>
              </div>
            </div>

            {/* SECCIÓN 5: NODOS OCULTOS */}
            {hiddenNodesList.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-end border-b border-slate-200 pb-2">
                  <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.556c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
                    Nodos Ocultos ({hiddenNodesList.length})
                  </h3>
                  <button onClick={restoreAllHiddenNodes} className="text-[9px] text-blue-600 hover:text-blue-800 font-bold underline">Restaurar Todos</button>
                </div>
                <div className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar pr-1">
                  {hiddenNodesList.map(n => (
                    <div key={n.id} className="flex items-center justify-between bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-sm">
                      <span className="text-[10px] font-bold text-slate-600 truncate max-w-[200px]" title={n.data?.label}>{n.data?.label || n.id}</span>
                      <button onClick={() => restoreHiddenNode(n.id)} className="text-[10px] bg-slate-100 hover:bg-emerald-50 text-slate-500 hover:text-emerald-600 px-2.5 py-1 rounded-md font-bold transition-colors">Mostrar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECCIÓN 6: EXPORTAR */}
            {hasDiagram && (
              <div className="pt-2">
                <button onClick={handleExportClick} disabled={isExporting} className={`w-full flex items-center justify-center gap-2 py-4 rounded-2xl font-black uppercase tracking-wider text-xs transition-all duration-300 shadow-lg ${isExporting ? 'bg-blue-100 text-blue-400 shadow-none' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02] hover:shadow-blue-500/30'}`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>
                  {isExporting ? 'Generando PDF...' : 'Descargar Mapa (PDF)'}
                </button>
              </div>
            )}
            
            <div className="h-4"></div> {/* Safe margin bottom */}
          </div>
        </div>
      </aside>

      <main className="flex-grow flex relative bg-slate-50/50 w-full h-full" onClick={onPaneClick}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
          className="absolute top-5 left-5 z-40 bg-white p-3 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-all hover:scale-105"
          title={isSidebarOpen ? "Ocultar Panel" : "Mostrar Panel"}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M4 6h16M4 12h16M4 18h16"} /></svg>
        </button>

        {/* 🔴 PANTALLA INICIAL SIN CUADRO DE SUBIDA, SOLO CON EL LOGO */}
        {!hasDiagram && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-transparent z-20 pointer-events-none">
            <img src="/Logo%20Talkme.png" alt="TalkMe" className="w-72 md:w-96 object-contain opacity-20 drop-shadow-sm grayscale-[30%]" />
          </div>
        )}
        
        <div className={`flex-grow w-full h-full transition-opacity duration-500 ${hasDiagram ? 'opacity-100' : 'opacity-0'}`}>
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
            minZoom={0.02}   
            maxZoom={5}      
            attributionPosition="bottom-right"
          >
            <Background color="#cbd5e1" gap={20} size={1.5} />
            <Controls className="!bg-white/90 !backdrop-blur-sm !border-none !shadow-2xl !rounded-xl overflow-hidden mb-6 ml-6" />
            
            <MiniMap 
              nodeColor={getMiniMapColor}
              nodeStrokeWidth={3}
              nodeBorderRadius={6}
              onNodeClick={handleMiniMapClick}
              className="!bg-white/70 !backdrop-blur-md border border-white/80 !shadow-[0_8px_30px_rgb(0,0,0,0.12)] !rounded-2xl overflow-hidden cursor-crosshair m-6 transition-all hover:!shadow-[0_12px_40px_rgb(0,0,0,0.18)]"
              maskColor="rgba(241, 245, 249, 0.65)"
              pannable={true} 
              zoomable={true} 
            />
          </ReactFlow>
        </div>

        {contextMenu && (
          <div 
            className="absolute z-50 bg-white border border-slate-200 shadow-2xl rounded-xl overflow-hidden py-1 w-64 animate-fade-in-up"
            style={{ top: contextMenu.top, left: contextMenu.left }}
          >
            <div className="px-3 py-2 border-b border-slate-100 bg-slate-50">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Nodo Seleccionado:</span>
              <span className="text-xs font-bold text-slate-700 truncate block">{contextMenu.label}</span>
            </div>
            <button onClick={hideNodeAndBranch} className="w-full text-left px-4 py-3 text-sm font-bold text-rose-600 hover:bg-rose-50 flex items-center gap-2 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a10.05 10.05 0 015.188-1.556c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0l-3.29-3.29" /></svg>
              Ocultar nodo y su rama
            </button>
          </div>
        )}

        {selectedNode && (
          <div className="absolute right-0 top-0 h-full z-30 shadow-2xl transition-transform duration-300">
            <Sidebar selectedNode={selectedNode} onClose={() => setSelectedNode(null)} onUpdateNode={updateNodeData} />
          </div>
        )}
      </main>
    </div>
  );
}