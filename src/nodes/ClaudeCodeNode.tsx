import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, ClaudeCodeNodeData } from '../types';
import { BaseNode } from './BaseNode';

export function ClaudeCodeNode({ id, data, selected }: NodeProps) {
  const d = data as ClaudeCodeNodeData;
  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="C">
      <div className="noude-node-badges">
        <span className="noude-node-badge model">{d.model}</span>
        {d.allowedTools.length > 0 && (
          <span className="noude-node-badge">{d.allowedTools.length} tools</span>
        )}
      </div>
      {d.prompt && (
        <div className="noude-node-preview">{d.prompt.slice(0, 120)}</div>
      )}
    </BaseNode>
  );
}
