import { getBezierPath, type EdgeProps } from '@xyflow/react';
import { useExecutionStore } from '../store/executionStore';

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
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const sourceStatus = useExecutionStore(s => s.getNodeStatus(source));
  const targetStatus = useExecutionStore(s => s.getNodeStatus(target));

  const isRunning = sourceStatus === 'running' || sourceStatus === 'streaming' || targetStatus === 'running';
  const isSuccess = sourceStatus === 'success' && targetStatus === 'success';
  const isError = sourceStatus === 'error' || targetStatus === 'error';

  let className = 'noude-edge-path';
  if (isRunning) className += ' running';
  else if (isSuccess) className += ' success';
  else if (isError) className += ' error';

  return (
    <g>
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
    </g>
  );
}
