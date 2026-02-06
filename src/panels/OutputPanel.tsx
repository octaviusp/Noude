import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Play, AlertCircle, Cpu } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { Badge } from '../components/ui/badge';
import type { ToolActivity } from '../types';

const EMPTY_TOOLS: ToolActivity[] = [];
const MIN_HEIGHT = 36;
const DEFAULT_HEIGHT = 220;
const MAX_HEIGHT_RATIO = 0.6;

const statusBadgeVariant: Record<string, 'default' | 'amber' | 'indigo' | 'green' | 'red' | 'purple' | 'slate' | 'blue'> = {
  idle: 'slate',
  running: 'blue',
  success: 'green',
  error: 'red',
  cancelled: 'slate',
};

const statusIcons: Record<string, typeof Play> = {
  running: Cpu,
  error: AlertCircle,
};

export function OutputPanel() {
  const [collapsed, setCollapsed] = useState(false);
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
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
  const toolActivity = useExecutionStore(s => displayNodeId ? s.nodeToolActivity.get(displayNodeId) ?? EMPTY_TOOLS : EMPTY_TOOLS);
  const liveMetrics = useExecutionStore(s => displayNodeId ? s.nodeLiveMetrics.get(displayNodeId) : undefined);
  const label = displayNodeId ? useFlowStore.getState().getNodeLabel(displayNodeId) : null;
  const logs = useExecutionStore(s => s.logs);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [streaming, logs]);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    const startY = e.clientY;
    const startHeight = height;
    const maxH = window.innerHeight * MAX_HEIGHT_RATIO;

    const onMove = (ev: MouseEvent) => {
      const delta = startY - ev.clientY;
      const next = Math.max(MIN_HEIGHT, Math.min(maxH, startHeight + delta));
      setHeight(next);
    };
    const onUp = () => {
      setIsResizing(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [height]);

  const StatusIcon = statusIcons[flowStatus];

  return (
    <div
      className="bg-[#0a0f1a] border-t border-[#1e293b] flex flex-col shrink-0 transition-[height] duration-200"
      style={{ height: collapsed ? MIN_HEIGHT : height }}
    >
      {/* Resize Handle */}
      {!collapsed && (
        <div
          onMouseDown={handleResizeStart}
          className={[
            'h-1 shrink-0 cursor-ns-resize relative group',
            isResizing ? 'bg-indigo-500/30' : '',
          ].join(' ')}
        >
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-[3px] rounded-full bg-slate-600/0 group-hover:bg-slate-500/60 transition-colors duration-150" />
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 h-9 border-b border-[#1e293b]/60 shrink-0 cursor-pointer select-none hover:bg-[#0f172a] transition-colors duration-150"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px]">
          Output
        </span>
        {label && (
          <span className="text-[11px] text-slate-600 truncate max-w-[120px]">
            {label}
          </span>
        )}
        {liveMetrics && (
          <span className="text-[10px] text-sky-400 font-mono tabular-nums">
            Turn {liveMetrics.turns}
          </span>
        )}
        {flowStatus !== 'idle' && (
          <Badge variant={statusBadgeVariant[flowStatus] || 'slate'}>
            {StatusIcon && <StatusIcon className="w-2.5 h-2.5 mr-0.5" />}
            {flowStatus}
          </Badge>
        )}
        {output?.meta && (
          <span className="text-[10px] text-slate-600 font-mono tabular-nums">
            {output.meta.numTurns != null && `${output.meta.numTurns} turns`}
            {output.meta.costUsd != null && ` · $${output.meta.costUsd.toFixed(3)}`}
            {output.meta.durationMs != null && ` · ${(output.meta.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
        <div className="ml-auto">
          {collapsed ? (
            <ChevronUp className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition-colors" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-slate-600 hover:text-slate-400 transition-colors" />
          )}
        </div>
      </div>

      {/* Body */}
      {!collapsed && (
        <div
          ref={bodyRef}
          className="flex-1 overflow-y-auto px-4 py-3 font-mono text-[12px] leading-[1.6] text-slate-500 whitespace-pre-wrap break-words"
        >
          {/* Tool Activity Pills */}
          {toolActivity.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3 pb-2.5 border-b border-[#1e293b]/60">
              {toolActivity.slice(-8).map(t => (
                <span
                  key={t.toolUseId}
                  className={[
                    'text-[10px] px-2 py-0.5 rounded-md font-mono inline-flex items-center gap-1 transition-colors duration-200',
                    t.status === 'running'
                      ? 'bg-violet-500/12 text-violet-400 border border-violet-500/20'
                      : t.status === 'error'
                        ? 'bg-red-500/8 text-red-400/60 border border-red-500/10'
                        : 'bg-slate-800/40 text-slate-600 border border-slate-700/30',
                  ].join(' ')}
                >
                  {t.status === 'running' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                  )}
                  {t.toolName}
                </span>
              ))}
            </div>
          )}

          {/* Content */}
          {streaming ? (
            <span className="text-[#c9d1d9]">{streaming}</span>
          ) : output?.result.text ? (
            <span className="text-[#c9d1d9]">{output.result.text}</span>
          ) : logs.length > 0 ? (
            <span className="text-[#c9d1d9]">{logs.join('\n')}</span>
          ) : (
            <div className="flex items-center justify-center gap-2 h-full text-[13px] text-slate-700">
              <Play className="w-3.5 h-3.5" />
              <span>{flowStatus === 'idle' ? 'Run a flow to see output here' : 'Waiting for output...'}</span>
            </div>
          )}

          {/* Metrics Footer */}
          {output?.meta && (output.meta.costUsd != null || output.meta.numTurns != null || output.meta.tokenUsage || output.meta.sessionId) && (
            <div className="mt-3 pt-2.5 border-t border-[#1e293b]/60 text-[10px] text-slate-600 font-mono tabular-nums flex flex-wrap gap-x-4 gap-y-1">
              {output.meta.model && <span>model: {output.meta.model}</span>}
              {output.meta.numTurns != null && <span>turns: {output.meta.numTurns}</span>}
              {output.meta.costUsd != null && <span>cost: ${output.meta.costUsd.toFixed(4)}</span>}
              {output.meta.tokenUsage && (
                <span>tokens: {output.meta.tokenUsage.input.toLocaleString()} in / {output.meta.tokenUsage.output.toLocaleString()} out</span>
              )}
              {output.meta.durationMs != null && <span>duration: {(output.meta.durationMs / 1000).toFixed(1)}s</span>}
              {output.meta.sessionId && <span>session: {output.meta.sessionId.slice(0, 8)}</span>}
            </div>
          )}

          {/* Error Display */}
          {output?.error && (
            <div className="mt-2 p-2.5 rounded-md bg-red-900/15 border border-red-700/20">
              <span className="text-red-400">
                Error: {output.error.message}
                {output.error.stderr && `\n${output.error.stderr}`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
