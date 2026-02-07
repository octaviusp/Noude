import { useState, type MouseEvent } from 'react';
import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData, ClaudeCodeNodeData } from '../types';
import { BaseNode } from './BaseNode';
import { useExecutionStore } from '../store/executionStore';

const MODEL_LABELS: Record<string, string> = {
  opus: 'Opus 4.6',
  sonnet: 'Sonnet 4.5',
  haiku: 'Haiku 4.5',
};

function formatModelLabel(model: string): string {
  if (MODEL_LABELS[model]) return MODEL_LABELS[model];
  if (model.length <= 20) return model;
  const pieces = model.split('-');
  if (pieces.length > 2) return pieces.slice(-3).join('-');
  return `${model.slice(0, 18)}…`;
}

export function ClaudeCodeNode({ id, data, selected }: NodeProps) {
  const d = data as ClaudeCodeNodeData;
  const status = useExecutionStore(s => s.getNodeStatus(id));
  const liveMetrics = useExecutionStore(s => s.nodeLiveMetrics.get(id));
  const output = useExecutionStore(s => s.getNodeOutput(id));
  const isActive = status === 'running' || status === 'streaming';
  const [expanded, setExpanded] = useState(false);
  const prompt = d.prompt.trim();
  const systemPrompt = d.appendSystemPrompt.trim();
  const toolsLabel = `${d.allowedTools.length} ${d.allowedTools.length === 1 ? 'tool' : 'tools'}`;

  const toggleExpanded = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded(prev => !prev);
  };

  return (
    <BaseNode id={id} data={data as AnyNodeData} selected={selected} icon="C">
      <div className="noude-node-badges">
        <span className="noude-node-badge model">{formatModelLabel(d.model)}</span>
        {d.permissionMode === 'bypassPermissions' && (
          <span className="noude-node-badge autonomous">AUTO</span>
        )}
        {d.allowedTools.length > 0 && (
          <span className="noude-node-badge">{toolsLabel}</span>
        )}
        {d.outputFormat === 'stream-json' && (
          <span className="noude-node-badge debug">DEBUG</span>
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
      <div className="noude-node-debug-card">
        <div className="noude-node-debug-header">
          <span className="noude-node-debug-title">Prompt Debug</span>
          <button
            type="button"
            className="noude-node-debug-toggle nodrag nopan"
            onClick={toggleExpanded}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
        <div className={`noude-node-preview ${expanded ? 'expanded' : ''}`}>
          {prompt || 'No prompt configured.'}
        </div>
        <div className="noude-node-preview-subtitle">System Prompt</div>
        <div className={`noude-node-preview noude-node-system-preview ${expanded ? 'expanded' : ''}`}>
          {systemPrompt || 'No appended system prompt.'}
        </div>
      </div>
      {output?.meta.costUsd != null && (
        <div className="noude-node-cost">${output.meta.costUsd.toFixed(3)}</div>
      )}
    </BaseNode>
  );
}
