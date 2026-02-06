import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AnyNodeData } from '../types';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import '../nodes/nodeStyles.css';

interface BaseNodeProps {
  id: string;
  data: AnyNodeData;
  selected?: boolean;
  icon: string;
  children?: React.ReactNode;
}

export function BaseNode({ id, data, selected, icon, children }: BaseNodeProps) {
  const status = useExecutionStore(s => s.getNodeStatus(id));
  const output = useExecutionStore(s => s.getNodeOutput(id));
  const selectNode = useFlowStore(s => s.selectNode);
  const isActive = status === 'running' || status === 'streaming';

  return (
    <div
      className={`noude-node type-${data.nodeType} ${selected ? 'selected' : ''} ${isActive ? 'executing' : ''}`}
      onClick={() => selectNode(id)}
    >
      <Handle type="target" position={Position.Left} id="in" className="noude-handle" />

      <div className="noude-node-header">
        <div className="noude-node-icon">{icon}</div>
        <div className="noude-node-label">{data.label}</div>
        <div className={`noude-node-status ${status}`} />
      </div>

      <div className="noude-node-body">
        {children}
        {status === 'streaming' && (
          <div className="noude-node-streaming">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}
        {output && output.meta.durationMs > 0 && (
          <div className="noude-node-duration">
            {(output.meta.durationMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" className="noude-handle" />
    </div>
  );
}

export function createNodeComponent(
  icon: string,
  renderBody: (data: AnyNodeData) => React.ReactNode
) {
  return function NodeComponent({ id, data, selected }: NodeProps) {
    return (
      <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon={icon}>
        {renderBody(data as AnyNodeData)}
      </BaseNode>
    );
  };
}
