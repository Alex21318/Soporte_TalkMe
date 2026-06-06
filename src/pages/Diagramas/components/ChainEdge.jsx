import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';

export default function ChainEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
}) {
  const [edgePath] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  // Posición media para la etiqueta (funciona bien para rutas suaves)
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#f59e0b',
          strokeWidth: 3,
          strokeDasharray: '6 6',
          ...style,
        }}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
            pointerEvents: 'none',
            zIndex: 20,
          }}
          className="nodrag nopan"
        >
          <div className="bg-amber-100 border-2 border-amber-400 text-amber-700 text-[9px] font-black px-3 py-1 rounded-lg shadow-md tracking-widest uppercase whitespace-nowrap">
            Encadenado
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}