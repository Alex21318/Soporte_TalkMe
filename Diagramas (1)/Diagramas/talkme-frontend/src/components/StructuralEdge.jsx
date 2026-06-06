import React from 'react';
import { BaseEdge, getSmoothStepPath } from 'reactflow';

export default function StructuralEdge({
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
    borderRadius: 12,
  });

  return (
    <BaseEdge
      id={id}
      path={edgePath}
      style={{ stroke: '#64748b', strokeWidth: 2.5, ...style }}
      markerEnd={markerEnd}
    />
  );
}