import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
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

  let className = 'noude-edge-path';
  if (sourceStatus === 'running' || sourceStatus === 'streaming' || targetStatus === 'running') {
    className += ' running';
  } else if (sourceStatus === 'success' && targetStatus === 'success') {
    className += ' success';
  } else if (sourceStatus === 'error' || targetStatus === 'error') {
    className += ' error';
  }

  return <BaseEdge id={id} path={edgePath} className={className} />;
}
