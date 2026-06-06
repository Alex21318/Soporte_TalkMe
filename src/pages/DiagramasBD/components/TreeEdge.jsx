import React, { useMemo } from 'react';
import { BaseEdge, useNodes, useEdges } from 'reactflow';

export default function TreeEdge({
  id,
  source,
  sourceX,
  sourceY,
  targetX,
  targetY,
  style,
  markerEnd,
}) {
  const nodes = useNodes();
  const edges = useEdges();

  const path = useMemo(() => {
    const horizontalGap = Math.abs(targetX - sourceX);

    // CASO 1: Casi alineados verticalmente
    if (horizontalGap < 5) {
      return `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`;
    }

    // 1. Rango total de la rama (Bus)
    const siblingEdges = edges.filter(e => e.source === source && e.type === 'treeEdge');
    const siblingTargets = siblingEdges.map(e => nodes.find(n => n.id === e.target)).filter(Boolean);
    
    const minTargetX = Math.min(...siblingTargets.map(n => n.positionAbsolute?.x ?? n.position.x), sourceX) - 30;
    const maxTargetX = Math.max(...siblingTargets.map(n => (n.positionAbsolute?.x ?? n.position.x) + (n.measured?.width ?? 340)), sourceX) + 30;

    // 2. Mapear obstáculos
    const obstacles = nodes.map((n) => {
      const x = n.positionAbsolute?.x ?? n.position?.x ?? 0;
      const y = n.positionAbsolute?.y ?? n.position?.y ?? 0;
      const w = n.measured?.width ?? n.width ?? 340;
      const h = n.measured?.height ?? n.height ?? n.data?.estimatedHeight ?? 150;
      return { top: y, bottom: y + h, left: x, right: x + w };
    });

    const PADDING_Y = 25;

    // 3. Lógica de búsqueda de Y segura
    const getBlockingObstacles = (testY) => {
      return obstacles.filter((obs) => {
        const yOverlap = testY >= (obs.top - 10) && testY <= (obs.bottom + PADDING_Y);
        const xOverlap = maxTargetX >= obs.left && minTargetX <= obs.right;
        return yOverlap && xOverlap;
      });
    };

    let commonY = sourceY + 40; 
    let foundSafePath = false;

    // Intentamos encontrar un hueco en el espacio entre padre e hijo
    for (let y = sourceY + 40; y < targetY - 30; y += 10) {
      if (getBlockingObstacles(y).length === 0) {
        commonY = y;
        foundSafePath = true;
        break;
      }
    }

    // Si no encontramos un hueco libre (foundSafePath es false), 
    // buscamos el obstáculo más bajo que está bloqueando el camino y saltamos debajo de él.
    if (!foundSafePath) {
      const blockers = obstacles.filter(obs => {
        return maxTargetX >= obs.left && minTargetX <= obs.right && obs.top < targetY;
      });

      if (blockers.length > 0) {
        const lowestBottom = Math.max(...blockers.map(b => b.bottom));
        commonY = lowestBottom + PADDING_Y;
      }
    }

    // Límite final: si después de todo commonY empuja demasiado al hijo,
    // usamos un margen mínimo antes del targetY para que no se vea que la línea "sube"
    if (commonY > targetY - 20) {
        commonY = targetY - 25;
    }

    return `M ${sourceX} ${sourceY} L ${sourceX} ${commonY} L ${targetX} ${commonY} L ${targetX} ${targetY}`;
    
  }, [sourceX, sourceY, targetX, targetY, nodes, edges, source]);

  return (
    <BaseEdge
      id={id}
      path={path}
      style={{ stroke: '#94a3b8', strokeWidth: 2, ...style }} 
      markerEnd={markerEnd}
    />
  );
}
