import type { MouseEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, BashNodeData } from '../types';
import { BaseNode } from './BaseNode';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';

export function BashNode({ id, data, selected }: NodeProps) {
  const d = data as BashNodeData;
  const selectNode = useFlowStore(s => s.selectNode);
  const setQuickSettings = useUiStore(s => s.setQuickSettings);
  const script = d.script.trim();

  const openScriptSettings = (event: MouseEvent) => {
    event.stopPropagation();
    selectNode(id);
    setQuickSettings({ nodeId: id, x: event.clientX + 10, y: event.clientY + 10 });
  };

  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="$">
      <div className="noude-node-badges">
        <span className="noude-node-badge shell">{d.shell}</span>
      </div>
      <div
        className={['noude-node-summary', !script ? 'is-empty' : ''].join(' ').trim()}
        onClick={!script ? openScriptSettings : undefined}
      >
        {script || 'Click to add script...'}
      </div>
    </BaseNode>
  );
}
