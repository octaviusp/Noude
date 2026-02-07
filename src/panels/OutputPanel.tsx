import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Play, AlertCircle, Cpu, Copy, Braces } from 'lucide-react';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { Badge } from '../components/ui/badge';
import type { AgentLogEvent, ToolActivity } from '../types';

const EMPTY_TOOLS: ToolActivity[] = [];
const EMPTY_EVENTS: AgentLogEvent[] = [];
const MIN_HEIGHT = 36;
const MAX_HEIGHT_RATIO = 0.6;

type FilterMode = 'all' | 'assistant' | 'tools' | 'system' | 'errors';

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

function matchesFilter(event: AgentLogEvent, filter: FilterMode): boolean {
  if (filter === 'all') return true;
  if (filter === 'assistant') return event.kind === 'assistant';
  if (filter === 'tools') return event.kind === 'tool_use' || event.kind === 'tool_result';
  if (filter === 'system') return event.kind === 'system' || event.kind === 'lifecycle' || event.kind === 'result' || event.kind === 'user';
  if (filter === 'errors') return event.level === 'error' || event.kind === 'stderr' || event.kind === 'parser';
  return true;
}

function eventClassName(event: AgentLogEvent): string {
  if (event.level === 'error' || event.status === 'error') return 'is-error';
  if (event.status === 'running') return 'is-running';
  if (event.status === 'completed') return 'is-completed';
  return '';
}

async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // ignore clipboard errors
  }
}

export function OutputPanel() {
  const [isResizing, setIsResizing] = useState(false);
  const [activeNodeId, setActiveNodeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>('all');
  const [expandedRaw, setExpandedRaw] = useState<Set<string>>(new Set());

  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const nodes = useFlowStore(s => s.nodes);
  const flowStatus = useExecutionStore(s => s.flowStatus);
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses);
  const collapsed = useUiStore(s => s.outputCollapsed);
  const setCollapsed = useUiStore(s => s.setOutputCollapsed);
  const height = useUiStore(s => s.outputHeight);
  const setHeight = useUiStore(s => s.setOutputHeight);
  const logs = useExecutionStore(s => s.logs);

  const bodyRef = useRef<HTMLDivElement>(null);
  const stickyBottomRef = useRef(true);

  const claudeNodes = useMemo(
    () => nodes
      .filter(n => n.data.nodeType === 'claude-code')
      .map(n => ({ id: n.id, label: n.data.label })),
    [nodes]
  );

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : undefined;
  const selectedIsClaude = selectedNode?.data.nodeType === 'claude-code';

  useEffect(() => {
    if (selectedNodeId && selectedIsClaude) {
      setActiveNodeId(selectedNodeId);
    }
  }, [selectedNodeId, selectedIsClaude]);

  useEffect(() => {
    if (activeNodeId && claudeNodes.some(n => n.id === activeNodeId)) return;
    setActiveNodeId(claudeNodes[0]?.id ?? null);
  }, [activeNodeId, claudeNodes]);

  let displayNodeId: string | null = null;
  if (selectedNodeId && selectedIsClaude) {
    displayNodeId = selectedNodeId;
  } else if (activeNodeId) {
    displayNodeId = activeNodeId;
  } else if (selectedNodeId && !selectedIsClaude) {
    displayNodeId = selectedNodeId;
  } else {
    const runningClaude = claudeNodes.find(n => {
      const status = nodeStatuses.get(n.id);
      return status === 'running' || status === 'streaming';
    });
    displayNodeId = runningClaude?.id ?? claudeNodes[0]?.id ?? null;
  }

  const streaming = useExecutionStore(s => displayNodeId ? s.getNodeStreaming(displayNodeId) : '');
  const output = useExecutionStore(s => displayNodeId ? s.getNodeOutput(displayNodeId) : undefined);
  const timeline = useExecutionStore(s => displayNodeId ? s.getNodeLogs(displayNodeId) : EMPTY_EVENTS);
  const toolActivity = useExecutionStore(s => displayNodeId ? s.nodeToolActivity.get(displayNodeId) ?? EMPTY_TOOLS : EMPTY_TOOLS);
  const liveMetrics = useExecutionStore(s => displayNodeId ? s.nodeLiveMetrics.get(displayNodeId) : undefined);
  const label = displayNodeId ? useFlowStore.getState().getNodeLabel(displayNodeId) : null;

  const filteredTimeline = useMemo(
    () => timeline.filter(event => matchesFilter(event, filter)),
    [timeline, filter]
  );

  const lastEventId = filteredTimeline[filteredTimeline.length - 1]?.id;

  useEffect(() => {
    if (!bodyRef.current || !stickyBottomRef.current) return;
    bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [lastEventId, streaming, logs.length]);

  const handleBodyScroll = useCallback(() => {
    if (!bodyRef.current) return;
    const node = bodyRef.current;
    const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
    stickyBottomRef.current = distance < 20;
  }, []);

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

  const toggleRaw = useCallback((id: string) => {
    setExpandedRaw((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const terminalText = streaming || output?.result.text || filteredTimeline.map(event => `${event.title}: ${event.summary}`).join('\n');
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
        <div ref={bodyRef} className="output-body" onScroll={handleBodyScroll}>
          {claudeNodes.length > 0 && (
            <div className="output-node-tabs">
              {claudeNodes.map((node) => {
                const tabStatus = nodeStatuses.get(node.id) ?? 'idle';
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={[
                      'output-node-tab',
                      activeNodeId === node.id ? 'is-active' : '',
                      tabStatus === 'running' || tabStatus === 'streaming' ? 'is-running' : '',
                    ].join(' ').trim()}
                    onClick={() => setActiveNodeId(node.id)}
                  >
                    <span className="output-node-tab-label">{node.label}</span>
                    <span className="output-node-tab-status">{tabStatus}</span>
                  </button>
                );
              })}
            </div>
          )}

          <div className="output-actions-row">
            <div className="output-filters">
              {(['all', 'assistant', 'tools', 'system', 'errors'] as FilterMode[]).map(mode => (
                <button
                  key={mode}
                  type="button"
                  className={['output-filter-chip', filter === mode ? 'is-active' : ''].join(' ').trim()}
                  onClick={() => setFilter(mode)}
                >
                  {mode}
                </button>
              ))}
            </div>
            <button type="button" className="output-action-btn" onClick={() => copyText(terminalText)}>
              <Copy className="w-3 h-3" />
              Copy
            </button>
          </div>

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

          {filteredTimeline.length > 0 ? (
            <div className="output-timeline">
              {filteredTimeline.map(event => {
                const canExpandRaw = Boolean(event.raw);
                const expanded = expandedRaw.has(event.id);

                return (
                  <article key={event.id} className={['output-event', eventClassName(event)].join(' ').trim()}>
                    <header className="output-event-header">
                      <span className="output-event-time">{new Date(event.at).toLocaleTimeString()}</span>
                      <span className={['output-event-kind', `is-${event.kind}`].join(' ')}>{event.kind}</span>
                      <span className="output-event-title">{event.title}</span>
                      {canExpandRaw && (
                        <button type="button" className="output-inline-btn" onClick={() => toggleRaw(event.id)}>
                          <Braces className="w-3 h-3" />
                          {expanded ? 'Hide raw' : 'Raw'}
                        </button>
                      )}
                      {event.raw && (
                        <button type="button" className="output-inline-btn" onClick={() => copyText(event.raw ?? '')}>
                          <Copy className="w-3 h-3" />
                          Copy raw
                        </button>
                      )}
                    </header>
                    <p className="output-event-summary">{event.summary}</p>
                    {expanded && event.raw && (
                      <pre className="output-event-raw">{event.raw}</pre>
                    )}
                  </article>
                );
              })}
            </div>
          ) : timeline.length > 0 ? (
            <div className="output-empty">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>No events for filter: {filter}</span>
            </div>
          ) : streaming ? (
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
