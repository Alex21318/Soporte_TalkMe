import React from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';

export default function RoutingEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
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

  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  const label = data?.label || 'Derivar';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: '#0ea5e9',
          strokeWidth: 2.5,
          strokeDasharray: '4 4',
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
            backgroundColor: '#f0f9ff',
            padding: '4px 8px',
            borderRadius: '8px',
            border: '1.5px solid #38bdf8',
            color: '#0369a1',
            fontSize: '9px',
            fontWeight: '900',
            whiteSpace: 'nowrap',
            fontFamily: 'monospace',
            textTransform: 'uppercase',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            zIndex: 20,
          }}
          className="nodrag nopan"
        >
          {label}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
