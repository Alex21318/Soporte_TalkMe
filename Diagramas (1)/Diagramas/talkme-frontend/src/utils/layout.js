import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

// 🔴 RECIBIMOS LOS SETTINGS COMO 3ER PARÁMETRO
export const getLayoutedElements = async (nodes, edges, settings = { showKeywords: true, showNodeTypes: true }) => {
  const structuralEdges = edges.filter(e => !e.isChain && !e.isRouting);

  const graph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.alignment': 'CENTER',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.nodePlacement.bk.fixedAlignment': 'BALANCED', 
      'elk.layered.nodePlacement.favorStraightEdges': 'true',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.spacing.nodeNode': '50', 
      'elk.layered.spacing.nodeNodeBetweenLayers': '80', 
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: nodes.map((node) => {
      const isBotRoot = node.data?.type === 'BOT';
      const nodeTypeStr = node.data?.type ? String(node.data.type).toLowerCase() : '';
      const isMenuNode = nodeTypeStr.includes('menú') || nodeTypeStr.includes('menu') || nodeTypeStr.includes('submenú') || nodeTypeStr.includes('submenu');
      
      let estimatedHeight = 110; 

      if (isBotRoot) {
        estimatedHeight = 100;
      } else if (isMenuNode) {
        // 🔴 SI SE OCULTA EL TIPO DE NODO, SE RESTA ALTURA
        estimatedHeight = settings.showNodeTypes ? 130 : 100; 
      } else {
        const isValido = (val) => val && String(val).trim() !== '' && String(val).trim().toLowerCase() !== 'no aplica';

        // 🔴 REDUCCIÓN DE ALTURA SI SE OCULTAN ELEMENTOS
        if (!settings.showNodeTypes) estimatedHeight -= 30;

        if (isValido(node.data?.imagen)) estimatedHeight += 220; 
        if (isValido(node.data?.archivo) && !isValido(node.data?.imagen)) estimatedHeight += 60; 
        if (isValido(node.data?.latitud) && isValido(node.data?.longitud)) estimatedHeight += 65;

        const text = node.data?.responseText || '';
        if (isValido(text)) {
          const lineCount = String(text).split('\n').reduce((total, line) => total + Math.ceil(line.length / 45), 0);
          estimatedHeight += 45 + (lineCount * 20);
        }
        
        const questions = node.data?.questions || [];
        if (questions.length > 0) {
          estimatedHeight += 50; 
          questions.forEach(q => {
            estimatedHeight += 40; 
            const tipoRespuesta = String(q['tipo de respuesta'] || q['Tipo de respuesta'] || '').toLowerCase();
            if (tipoRespuesta.includes('combo')) {
              const numOptions = String(q.respuestas || q.Respuestas || '').split(',').length;
              estimatedHeight += 25 + (numOptions * 45); 
            } else {
              estimatedHeight += 25; 
            }
          });
        }

        const finalRes = node.data?.respuestaFinal || '';
        if (isValido(finalRes)) {
          const lineCount = String(finalRes).split('\n').reduce((total, line) => total + Math.ceil(line.length / 45), 0);
          estimatedHeight += 55 + (lineCount * 20);
        }

        estimatedHeight += 30; 
        if (isValido(node.data?.cierreTipologia)) estimatedHeight += 45;
        if (isValido(node.data?.skill)) estimatedHeight += 45;
        if (isValido(node.data?.cierreTipologia) || isValido(node.data?.skill)) estimatedHeight += 15;
      }

      if (node.data?.jumpsTo?.length > 0) {
          estimatedHeight += (node.data.jumpsTo.length * 60) + 20;
      }

      return {
        ...node,
        width: 340, 
        height: estimatedHeight + 30,
      };
    }),
    edges: structuralEdges,
  };

  const layoutedGraph = await elk.layout(graph);

  return {
    nodes: layoutedGraph.children.map((node) => ({
      ...node,
      position: { x: node.x, y: node.y },
    })),
    edges: edges, 
  };
};