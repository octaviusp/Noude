import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, BashNodeData } from '../types';
import { BaseNode } from './BaseNode';

export function BashNode({ id, data, selected }: NodeProps) {
  const d = data as BashNodeData;

  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="$">
      <div className="noude-node-badges">
        <span className="noude-node-badge shell">{d.shell}</span>
      </div>
      <div className="noude-node-summary">
        {d.script.trim() || 'No script configured.'}
      </div>
    </BaseNode>
  );
}
