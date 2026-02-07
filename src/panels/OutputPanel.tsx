import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Play,
  AlertCircle,
  Cpu,
  Copy,
  Braces,
  LoaderCircle,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
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

const FILTER_OPTIONS: Array<{ mode: FilterMode; label: string }> = [
  { mode: 'assistant', label: 'Assistant' },
  { mode: 'tools', label: 'Tools' },
  { mode: 'system', label: 'System' },
  { mode: 'errors', label: 'Errors' },
  { mode: 'all', label: 'All' },
];

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
  if (filter === 'assistant') return event.kind === 'assistant' || event.kind === 'tool_use' || event.kind === 'tool_result' || event.kind === 'result';
  if (filter === 'tools') return event.kind === 'tool_use' || event.kind === 'tool_result';
  if (filter === 'system') return event.kind === 'system' || event.kind === 'lifecycle' || event.kind === 'user' || event.kind === 'stream';
  if (filter === 'errors') return event.level === 'error' || event.kind === 'stderr' || event.kind === 'parser';
  return true;
}

function eventClassName(event: AgentLogEvent): string {
  if (event.level === 'error' || event.status === 'error') return 'is-error';
  if (event.status === 'running') return 'is-running';
  if (event.status === 'completed') return 'is-completed';
  return '';
}

function parseRawEvent(event: AgentLogEvent): Record<string, unknown> | null {
  if (!event.raw) return null;
  try {
    const parsed = JSON.parse(event.raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // raw can be plain text/stderr
  }
  return null;
}

function compactPath(path: string): string {
  if (path.length <= 30) return path;
  const parts = path.split('/').filter(Boolean);
  if (parts.length <= 2) return path;
  return `.../${parts.slice(-2).join('/')}`;
}

function buildEventMetaBadges(event: AgentLogEvent, nodeLabel: string | null): string[] {
  const badges: string[] = [];
  if (nodeLabel) badges.push(`node:${nodeLabel}`);

  const rawObj = parseRawEvent(event);
  if (!rawObj) return badges;

  const subtype = typeof rawObj.subtype === 'string' ? rawObj.subtype : undefined;
  const model = typeof rawObj.model === 'string' ? rawObj.model : undefined;
  const session = typeof rawObj.session_id === 'string' ? rawObj.session_id : undefined;
  const cwd = typeof rawObj.cwd === 'string' ? rawObj.cwd : undefined;
  const turns = typeof rawObj.num_turns === 'number' ? rawObj.num_turns : undefined;
  const cost = typeof rawObj.total_cost_usd === 'number' ? rawObj.total_cost_usd : undefined;

  if (subtype) badges.push(`subtype:${subtype}`);
  if (model) badges.push(`model:${model}`);
  if (session) badges.push(`session:${session.slice(0, 8)}`);
  if (cwd) badges.push(`cwd:${compactPath(cwd)}`);
  if (turns != null) badges.push(`turns:${turns}`);
  if (cost != null) badges.push(`$${cost.toFixed(4)}`);

  return badges;
}

function prettyRaw(raw: string | undefined): string {
  if (!raw) return '';
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function formatToolParamValue(value: unknown): string {
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value && typeof value === 'object') return '{...}';
  return 'null';
}

interface ToolEventDetails {
  toolName: string;
  toolUseId?: string;
  status: 'running' | 'completed' | 'error';
  params: Array<{ key: string; value: string }>;
  output?: string;
}

function toolNameFromTitle(title: string): string | undefined {
  const prefix = 'Tool start: ';
  if (title.startsWith(prefix)) return title.slice(prefix.length);
  return undefined;
}

function getToolEventDetails(event: AgentLogEvent): ToolEventDetails | null {
  if (event.kind !== 'tool_use' && event.kind !== 'tool_result') return null;

  const rawObj = parseRawEvent(event);
  const explicitToolName = typeof rawObj?.toolName === 'string' ? rawObj.toolName : undefined;
  const toolName = explicitToolName || toolNameFromTitle(event.title) || 'Tool';
  const toolUseId = typeof rawObj?.toolUseId === 'string' ? rawObj.toolUseId : undefined;

  if (event.kind === 'tool_use') {
    const inputObj = rawObj?.input && typeof rawObj.input === 'object' && !Array.isArray(rawObj.input)
      ? rawObj.input as Record<string, unknown>
      : rawObj ?? {};

    return {
      toolName,
      toolUseId,
      status: event.status === 'error' ? 'error' : 'running',
      params: Object.entries(inputObj).slice(0, 6).map(([key, value]) => ({ key, value: formatToolParamValue(value) })),
    };
  }

  const output = [
    typeof rawObj?.contentText === 'string' ? rawObj.contentText : undefined,
    typeof rawObj?.stdout === 'string' ? rawObj.stdout : undefined,
    typeof rawObj?.stderr === 'string' ? rawObj.stderr : undefined,
    event.summary,
  ].find(v => Boolean(v && v.trim()));

  return {
    toolName,
    toolUseId,
    status: event.status === 'error' ? 'error' : 'completed',
    params: [],
    output,
  };
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
  const [filter, setFilter] = useState<FilterMode>('assistant');
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
              {FILTER_OPTIONS.map(({ mode, label }) => (
                <button
                  key={mode}
                  type="button"
                  className={['output-filter-chip', filter === mode ? 'is-active' : ''].join(' ').trim()}
                  onClick={() => setFilter(mode)}
                >
                  {label}
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
                const metaBadges = buildEventMetaBadges(event, label);
                const toolDetails = getToolEventDetails(event);
                const ToolIcon = toolDetails
                  ? toolDetails.status === 'running'
                    ? LoaderCircle
                    : toolDetails.status === 'error'
                      ? XCircle
                      : CheckCircle2
                  : null;

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
                    {metaBadges.length > 0 && (
                      <div className="output-event-meta">
                        {metaBadges.map((badge) => (
                          <span key={`${event.id}-${badge}`} className="output-event-meta-badge">
                            {badge}
                          </span>
                        ))}
                      </div>
                    )}
                    {toolDetails ? (
                      <div className={['output-tool-event', `is-${toolDetails.status}`].join(' ')}>
                        <div className="output-tool-event-header">
                          <span className={['output-tool-icon', `is-${toolDetails.status}`].join(' ')}>
                            {ToolIcon && <ToolIcon className={toolDetails.status === 'running' ? 'is-spinning' : ''} />}
                          </span>
                          <span className="output-tool-name">{toolDetails.toolName}</span>
                          {toolDetails.toolUseId && (
                            <span className="output-tool-id">{toolDetails.toolUseId.slice(0, 12)}</span>
                          )}
                        </div>
                        {toolDetails.params.length > 0 && (
                          <div className="output-tool-params">
                            {toolDetails.params.map(({ key, value }) => (
                              <span key={`${event.id}-${key}-${value}`} className="output-tool-param">
                                <strong>{key}</strong>
                                <span>{value}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {toolDetails.output && (
                          <pre className="output-tool-output">{toolDetails.output}</pre>
                        )}
                      </div>
                    ) : (
                      <p className="output-event-summary">{event.summary}</p>
                    )}
                    {expanded && event.raw && (
                      <pre className="output-event-raw">{prettyRaw(event.raw)}</pre>
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
