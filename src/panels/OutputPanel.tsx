import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { Badge } from '../components/ui/badge';

const statusBadgeVariant: Record<string, 'default' | 'amber' | 'indigo' | 'green' | 'red' | 'purple' | 'slate'> = {
  idle: 'slate',
  running: 'indigo',
  success: 'green',
  error: 'red',
  cancelled: 'slate',
};

export function OutputPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const flowStatus = useExecutionStore(s => s.flowStatus);
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses);
  const bodyRef = useRef<HTMLDivElement>(null);

  let displayNodeId = selectedNodeId;
  if (!displayNodeId) {
    for (const [id, status] of nodeStatuses) {
      if (status === 'streaming' || status === 'running') {
        displayNodeId = id;
        break;
      }
    }
  }

  const streaming = useExecutionStore(s => displayNodeId ? s.getNodeStreaming(displayNodeId) : '');
  const output = useExecutionStore(s => displayNodeId ? s.getNodeOutput(displayNodeId) : undefined);
  const label = displayNodeId ? useFlowStore.getState().getNodeLabel(displayNodeId) : null;
  const logs = useExecutionStore(s => s.logs);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [streaming, logs]);

  return (
    <div
      className="bg-slate-900 border-t border-slate-700/50 flex flex-col shrink-0 transition-[height] duration-200"
      style={{ height: collapsed ? 36 : 200 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 h-9 border-b border-slate-800/50 shrink-0 cursor-pointer select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Output
        </span>
        {label && (
          <span className="text-[11px] text-slate-500">
            {label}
          </span>
        )}
        {flowStatus !== 'idle' && (
          <Badge variant={statusBadgeVariant[flowStatus] || 'slate'}>
            {flowStatus}
          </Badge>
        )}
        {output?.meta && (
          <span className="text-[10px] text-slate-500 font-mono">
            {output.meta.numTurns != null && `${output.meta.numTurns} turns`}
            {output.meta.costUsd != null && ` · $${output.meta.costUsd.toFixed(3)}`}
            {output.meta.durationMs != null && ` · ${(output.meta.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
        <div className="ml-auto">
          {collapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-xs leading-relaxed text-slate-400 whitespace-pre-wrap break-words"
        >
          {streaming ? (
            <span className="text-slate-200">{streaming}</span>
          ) : output?.result.text ? (
            <span className="text-slate-200">{output.result.text}</span>
          ) : logs.length > 0 ? (
            <span className="text-slate-200">{logs.join('\n')}</span>
          ) : (
            <span className="text-slate-600">
              {flowStatus === 'idle' ? 'Run a flow to see output here...' : 'Waiting for output...'}
            </span>
          )}
          {output?.meta && (output.meta.costUsd != null || output.meta.numTurns != null || output.meta.tokenUsage || output.meta.sessionId) && (
            <div className="mt-3 pt-2 border-t border-slate-800/50 text-[10px] text-slate-500 font-mono flex flex-wrap gap-x-4 gap-y-1">
              {output.meta.model && <span>Model: {output.meta.model}</span>}
              {output.meta.numTurns != null && <span>Turns: {output.meta.numTurns}</span>}
              {output.meta.costUsd != null && <span>Cost: ${output.meta.costUsd.toFixed(4)}</span>}
              {output.meta.tokenUsage && <span>Tokens: {output.meta.tokenUsage.input.toLocaleString()} in / {output.meta.tokenUsage.output.toLocaleString()} out</span>}
              {output.meta.durationMs != null && <span>Duration: {(output.meta.durationMs / 1000).toFixed(1)}s</span>}
              {output.meta.sessionId && <span>Session: {output.meta.sessionId.slice(0, 8)}</span>}
            </div>
          )}
          {output?.error && (
            <span className="text-red-400">
              {'\n'}Error: {output.error.message}
              {output.error.stderr && `\n${output.error.stderr}`}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
