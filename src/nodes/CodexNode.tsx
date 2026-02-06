import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, CodexNodeData } from '../types';
import { BaseNode } from './BaseNode';

export function CodexNode({ id, data, selected }: NodeProps) {
  const d = data as CodexNodeData;
  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="X">
      <div className="noude-node-badges">
        <span className="noude-node-badge codex-model">{d.model || 'o3'}</span>
        {d.fullAuto && <span className="noude-node-badge full-auto">auto</span>}
      </div>
      {d.prompt && (
        <div className="noude-node-preview">{d.prompt.slice(0, 120)}</div>
      )}
    </BaseNode>
  );
}
