import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, ClaudeCodeNodeData } from '../types';
import { BaseNode } from './BaseNode';
import { useExecutionStore } from '../store/executionStore';

const MODEL_LABELS: Record<string, string> = {
  opus: 'Opus 4.6',
  sonnet: 'Sonnet 4.5',
  haiku: 'Haiku 4.5',
};

export function ClaudeCodeNode({ id, data, selected }: NodeProps) {
  const d = data as ClaudeCodeNodeData;
  const status = useExecutionStore(s => s.getNodeStatus(id));
  const liveMetrics = useExecutionStore(s => s.nodeLiveMetrics.get(id));
  const output = useExecutionStore(s => s.getNodeOutput(id));
  const isActive = status === 'running' || status === 'streaming';

  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="C">
      <div className="noude-node-badges">
        <span className="noude-node-badge model">{MODEL_LABELS[d.model] ?? d.model}</span>
        {d.permissionMode === 'bypassPermissions' && (
          <span className="noude-node-badge autonomous">AUTO</span>
        )}
        {d.allowedTools.length > 0 && (
          <span className="noude-node-badge">{d.allowedTools.length} tools</span>
        )}
      </div>
      {isActive && liveMetrics && (
        <div className="noude-node-live-metrics">
          {liveMetrics.turns > 0 && <span>Turn {liveMetrics.turns}</span>}
          {liveMetrics.activeTools.length > 0 && (
            <span className="noude-tool-indicator">
              {liveMetrics.activeTools[liveMetrics.activeTools.length - 1]}
            </span>
          )}
        </div>
      )}
      {d.prompt && (
        <div className="noude-node-preview">{d.prompt.slice(0, 120)}</div>
      )}
      {output?.meta.costUsd != null && (
        <div className="noude-node-cost">${output.meta.costUsd.toFixed(3)}</div>
      )}
    </BaseNode>
  );
}
