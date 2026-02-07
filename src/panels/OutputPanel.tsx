import { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, ChevronUp, Play, AlertCircle, Cpu } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { Badge } from '../components/ui/badge';
import type { ToolActivity } from '../types';

const EMPTY_TOOLS: ToolActivity[] = [];
const MIN_HEIGHT = 36;
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
  const [isResizing, setIsResizing] = useState(false);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const flowStatus = useExecutionStore(s => s.flowStatus);
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses);
  const collapsed = useUiStore(s => s.outputCollapsed);
  const setCollapsed = useUiStore(s => s.setOutputCollapsed);
  const height = useUiStore(s => s.outputHeight);
  const setHeight = useUiStore(s => s.setOutputHeight);
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
  }, [height, setHeight]);

  const StatusIcon = statusIcons[flowStatus];

  return (
    <section
      className="output-panel"
      style={{ height: collapsed ? MIN_HEIGHT : height }}
      aria-label="Execution output"
    >
      {!collapsed && (
        <div
          onMouseDown={handleResizeStart}
          className={[
            'output-resize-handle',
            isResizing ? 'is-resizing' : '',
          ].join(' ').trim()}
        >
          <div className="output-resize-grip" />
        </div>
      )}

      <button
        type="button"
        className="output-header"
        onClick={() => setCollapsed(!collapsed)}
        aria-expanded={!collapsed}
      >
        <span className="output-title">Output</span>
        {label && <span className="output-node-label">{label}</span>}
        {liveMetrics && (
          <span className="output-metric">Turn {liveMetrics.turns}</span>
        )}
        {flowStatus !== 'idle' && (
          <Badge variant={statusBadgeVariant[flowStatus] || 'slate'}>
            {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
            {flowStatus}
          </Badge>
        )}
        {output?.meta && (
          <span className="output-inline-meta">
            {output.meta.numTurns != null && `${output.meta.numTurns} turns`}
            {output.meta.costUsd != null && ` · $${output.meta.costUsd.toFixed(3)}`}
            {output.meta.durationMs != null && ` · ${(output.meta.durationMs / 1000).toFixed(1)}s`}
          </span>
        )}
        <span className="output-collapse-icon">
          {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </span>
      </button>

      {!collapsed && (
        <div ref={bodyRef} className="output-body">
          {toolActivity.length > 0 && (
            <div className="output-tool-strip">
              {toolActivity.slice(-8).map(t => (
                <span
                  key={t.toolUseId}
                  className={[
                    'output-tool-pill',
                    t.status === 'running'
                      ? 'is-running'
                      : t.status === 'error'
                        ? 'is-error'
                        : '',
                  ].join(' ').trim()}
                >
                  {t.status === 'running' && (
                    <span className="output-tool-dot" />
                  )}
                  {t.toolName}
                </span>
              ))}
            </div>
          )}

          {streaming ? (
            <span className="output-text">{streaming}</span>
          ) : output?.result.text ? (
            <span className="output-text">{output.result.text}</span>
          ) : logs.length > 0 ? (
            <span className="output-text">{logs.join('\n')}</span>
          ) : (
            <div className="output-empty">
              <Play className="w-3.5 h-3.5" />
              <span>{flowStatus === 'idle' ? 'No execution output yet' : 'Awaiting task output...'}</span>
            </div>
          )}

          {output?.meta && (output.meta.costUsd != null || output.meta.numTurns != null || output.meta.tokenUsage || output.meta.sessionId) && (
            <div className="output-meta-grid">
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

          {output?.error && (
            <div className="output-error">
              <span>
                Error: {output.error.message}
                {output.error.stderr && `\n${output.error.stderr}`}
              </span>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
