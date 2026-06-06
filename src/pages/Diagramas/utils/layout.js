import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

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
      'elk.spacing.nodeNode': '60',                // ▲ Más espacio horizontal/vertical
      'elk.layered.spacing.nodeNodeBetweenLayers': '80', // ▲ Más separación entre capas
      'elk.layered.considerModelOrder.strategy': 'NODES_AND_EDGES',
    },
    children: nodes.map((node) => {
      const isBotRoot = node.data?.type === 'BOT';
      const nodeTypeStr = node.data?.type ? String(node.data.type).toLowerCase() : '';
      const isMenuNode = nodeTypeStr.includes('menú') || nodeTypeStr.includes('menu') || nodeTypeStr.includes('submenú') || nodeTypeStr.includes('submenu');

      let estimatedHeight = 120; // base

      if (isBotRoot) {
        estimatedHeight = 100;
      } else if (isMenuNode) {
        estimatedHeight = settings.showNodeTypes ? 135 : 105;
      } else {
        const isValido = (val) => val && String(val).trim() !== '' && String(val).trim().toLowerCase() !== 'no aplica';

        if (!settings.showNodeTypes) estimatedHeight -= 30;

        if (isValido(node.data?.imagen)) estimatedHeight += 230; // un poco más de margen
        if (isValido(node.data?.archivo) && !isValido(node.data?.imagen)) estimatedHeight += 70;
        if (isValido(node.data?.latitud) && isValido(node.data?.longitud)) estimatedHeight += 70;

        const text = node.data?.responseText || '';
        if (isValido(text)) {
          const lineCount = String(text).split('\n').reduce((total, line) => total + Math.ceil(line.length / 45), 0);
          estimatedHeight += 55 + (lineCount * 22);
        }

        const questions = node.data?.questions || [];
        if (questions.length > 0) {
          estimatedHeight += 60; // margen de sección
          questions.forEach(q => {
            estimatedHeight += 50; // espacio por pregunta (título + relleno)
            const tipoRespuesta = String(q['tipo de respuesta'] || q['Tipo de respuesta'] || '').toLowerCase();
            if (tipoRespuesta.includes('combo')) {
              const numOptions = String(q.respuestas || q.Respuestas || '').split(',').length;
              estimatedHeight += 30 + (numOptions * 50); // cada opción ahora 50px en lugar de 45
            } else {
              estimatedHeight += 30; // línea de entrada de texto
            }
          });
          estimatedHeight += 10; // margen final
        }

        const finalRes = node.data?.respuestaFinal || '';
        if (isValido(finalRes)) {
          const lineCount = String(finalRes).split('\n').reduce((total, line) => total + Math.ceil(line.length / 45), 0);
          estimatedHeight += 65 + (lineCount * 22);
        }

        estimatedHeight += 40; // padding interior extra
        if (isValido(node.data?.cierreTipologia)) estimatedHeight += 50;
        if (isValido(node.data?.skill)) estimatedHeight += 50;
        if (isValido(node.data?.cierreTipologia) || isValido(node.data?.skill)) estimatedHeight += 20;
      }

      if (node.data?.jumpsTo?.length > 0) {
        // los saltos unificados ocupan menos espacio, pero mantenemos margen generoso
        const uniqueJumps = node.data.jumpsTo.filter(
          (jump, index, self) => index === self.findIndex(j => j.targetId === jump.targetId && j.type === jump.type)
        );
        estimatedHeight += (uniqueJumps.length * 70) + 30;
      }

      return {
        ...node,
        width: 360,
        height: estimatedHeight + 40, // margen global extra
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