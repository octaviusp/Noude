import { useState, type MouseEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, BashNodeData } from '../types';
import { BaseNode } from './BaseNode';

export function BashNode({ id, data, selected }: NodeProps) {
  const d = data as BashNodeData;
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded(prev => !prev);
  };

  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="$">
      <div className="noude-node-badges">
        <span className="noude-node-badge shell">{d.shell}</span>
      </div>
      <div className="noude-node-debug-card">
        <div className="noude-node-debug-header">
          <span className="noude-node-debug-title">Script Preview</span>
          <button
            type="button"
            className="noude-node-debug-toggle nodrag nopan"
            onClick={toggleExpanded}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <div className={`noude-node-preview ${expanded ? 'expanded' : ''}`}>
          {d.script.trim() || 'No script configured.'}
        </div>
      </div>
    </BaseNode>
  );
}
