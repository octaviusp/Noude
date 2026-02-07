import { useState } from 'react';
import { getBezierPath, EdgeLabelRenderer, type EdgeProps } from '@xyflow/react';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';

export function AnimatedEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  source,
  target,
}: EdgeProps) {
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const sourceStatus = useExecutionStore(s => s.getNodeStatus(source));
  const targetStatus = useExecutionStore(s => s.getNodeStatus(target));
  const flowRunning = useExecutionStore(s => s.flowStatus === 'running');

  const isRunning = sourceStatus === 'running' || sourceStatus === 'streaming' || targetStatus === 'running';
  const isSuccess = sourceStatus === 'success' && targetStatus === 'success';
  const isError = sourceStatus === 'error' || targetStatus === 'error';

  let className = 'noude-edge-path';
  if (isRunning) className += ' running';
  else if (isSuccess) className += ' success';
  else if (isError) className += ' error';

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    useFlowStore.getState().removeEdge(id);
  };

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Invisible wider path for easier hover targeting */}
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={16}
      />
      <path
        id={`edge-path-${id}`}
        className={className}
        d={edgePath}
      />
      {isRunning && (
        <circle r="3" className="noude-edge-particle">
          <animateMotion dur="1.5s" repeatCount="indefinite">
            <mpath href={`#edge-path-${id}`} />
          </animateMotion>
        </circle>
      )}
      {hovered && !flowRunning && (
        <EdgeLabelRenderer>
          <button
            className="noude-edge-delete-btn"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
            }}
            onClick={handleDelete}
            title="Delete connection"
          >
            ×
          </button>
        </EdgeLabelRenderer>
      )}
    </g>
  );
}
