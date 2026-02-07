import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type {
  AgentLogEvent,
  ClaudeResultMeta,
  ClaudeStreamParserState,
  NodeStatus,
  NodeOutput,
  FlowStatus,
  ExecutionPlan,
  AnyNodeData,
  ClaudeCodeNodeData,
  BashNodeData,
  MergedInput,
  SubAgent,
  ToolActivity,
  LiveMetrics,
  ParsedClaudeStreamMessage,
} from '../types';
import { buildExecutionPlan } from '../engine/dag';
import { mergeInputs } from '../engine/inputMerger';
import { checkConvergence, getOutputHashes, shouldContinueCycle } from '../engine/cycleHandler';
import { Semaphore } from '../engine/scheduler';
import {
  invokeClaude,
  invokeBash,
  cancelProcess,
  cancelAllProcesses,
  type ProcessEvent,
} from '../lib/tauri';
import { buildClaudePrompt, buildClaudeSystemPrompt, buildBashScript } from '../lib/prompt';
import {
  createClaudeStreamParserState,
  parseClaudeJsonResult,
  parseClaudeStreamChunk,
  parseClaudeStreamResult,
} from '../lib/claudeStream';
import { useFlowStore } from './flowStore';

interface ExecutionState {
  // Status
  flowStatus: FlowStatus;
  nodeStatuses: Map<string, NodeStatus>;
  nodeOutputs: Map<string, NodeOutput>;
  nodeStreaming: Map<string, string>;
  nodeLogs: Map<string, AgentLogEvent[]>;
  nodeParsers: Map<string, ClaudeStreamParserState>;
  nodeResultMeta: Map<string, ClaudeResultMeta>;
  executionPlan: ExecutionPlan | null;
  activeProcessIds: Map<string, string>; // nodeId -> processId

  // Live tracking
  subAgents: Map<string, SubAgent>;
  nodeToolActivity: Map<string, ToolActivity[]>;
  nodeLiveMetrics: Map<string, LiveMetrics>;

  // Timing
  startedAt: number | null;
  finishedAt: number | null;

  // Logs
  logs: string[];

  // Actions
  runFlow: () => Promise<void>;
  cancelFlow: () => Promise<void>;
  cancelNode: (nodeId: string) => Promise<void>;
  resetExecution: () => void;

  // Status helpers
  getNodeStatus: (nodeId: string) => NodeStatus;
  getNodeOutput: (nodeId: string) => NodeOutput | undefined;
  getNodeStreaming: (nodeId: string) => string;
  getNodeLogs: (nodeId: string) => AgentLogEvent[];
  isRunning: () => boolean;
}

function appendLog(set: (fn: (s: ExecutionState) => Partial<ExecutionState>) => void, msg: string) {
  set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] }));
}

const MAX_STREAMING_CHARS = 102400;
const MAX_NODE_LOG_EVENTS = 1200;
const EMPTY_AGENT_LOGS: AgentLogEvent[] = [];

function appendNodeStreaming(
  set: (fn: (s: ExecutionState) => Partial<ExecutionState>) => void,
  nodeId: string,
  line: string,
) {
  set((s) => {
    const next = new Map(s.nodeStreaming);
    let buf = next.get(nodeId) ?? '';
    buf += line.endsWith('\n') ? line : `${line}\n`;
    if (buf.length > MAX_STREAMING_CHARS) {
      buf = buf.slice(-MAX_STREAMING_CHARS);
    }
    next.set(nodeId, buf);
    return { nodeStreaming: next };
  });
}

function createNodeLogEvent(
  nodeId: string,
  event: Omit<AgentLogEvent, 'id' | 'nodeId' | 'at'> & { at?: number }
): AgentLogEvent {
  return {
    id: crypto.randomUUID(),
    nodeId,
    at: event.at ?? Date.now(),
    kind: event.kind,
    level: event.level,
    title: event.title,
    summary: event.summary,
    raw: event.raw,
    status: event.status,
  };
}

function appendNodeLogEvent(
  set: (fn: (s: ExecutionState) => Partial<ExecutionState>) => void,
  nodeId: string,
  event: Omit<AgentLogEvent, 'id' | 'nodeId' | 'at'> & { at?: number }
) {
  const nextEvent = createNodeLogEvent(nodeId, event);
  set((s) => {
    const nextLogs = new Map(s.nodeLogs);
    const list = [...(nextLogs.get(nodeId) ?? []), nextEvent];
    nextLogs.set(nodeId, list.length > MAX_NODE_LOG_EVENTS ? list.slice(-MAX_NODE_LOG_EVENTS) : list);
    return { nodeLogs: nextLogs };
  });
}

function setNodeStatus(
  set: (fn: (s: ExecutionState) => Partial<ExecutionState>) => void,
  nodeId: string,
  status: NodeStatus
) {
  set((s) => {
    const next = new Map(s.nodeStatuses);
    next.set(nodeId, status);
    return { nodeStatuses: next };
  });
}

export const useExecutionStore = create<ExecutionState>((set, get) => ({
  flowStatus: 'idle',
  nodeStatuses: new Map(),
  nodeOutputs: new Map(),
  nodeStreaming: new Map(),
  nodeLogs: new Map(),
  nodeParsers: new Map(),
  nodeResultMeta: new Map(),
  executionPlan: null,
  activeProcessIds: new Map(),
  subAgents: new Map(),
  nodeToolActivity: new Map(),
  nodeLiveMetrics: new Map(),
  startedAt: null,
  finishedAt: null,
  logs: [],

  runFlow: async () => {
    if (get().flowStatus === 'running') return;

    const flow = useFlowStore.getState();
    const nodeIds = flow.getEnabledNodeIds();
    const edges = flow.getEnabledEdges();
    const { defaults } = flow;

    if (nodeIds.length === 0) return;

    // Pre-run validation: check for empty prompts/scripts
    const validationErrors: string[] = [];
    for (const nodeId of nodeIds) {
      const node = flow.getNode(nodeId);
      if (!node) continue;
      const d = node.data;
      if (d.nodeType === 'claude-code' && !d.prompt.trim()) {
        validationErrors.push(`"${d.label}" has an empty prompt`);
      } else if (d.nodeType === 'bash' && !d.script.trim()) {
        validationErrors.push(`"${d.label}" has an empty script`);
      }
    }
    if (validationErrors.length > 0) {
      set({
        flowStatus: 'failed',
        logs: validationErrors.map(e => `[Validation] ${e}`),
        startedAt: Date.now(),
        finishedAt: Date.now(),
      });
      return;
    }

    // Reset state
    set({
      flowStatus: 'running',
      nodeStatuses: new Map(),
      nodeOutputs: new Map(),
      nodeStreaming: new Map(),
      nodeLogs: new Map(),
      nodeParsers: new Map(),
      nodeResultMeta: new Map(),
      activeProcessIds: new Map(),
      subAgents: new Map(),
      nodeToolActivity: new Map(),
      nodeLiveMetrics: new Map(),
      startedAt: Date.now(),
      finishedAt: null,
      logs: [],
    });

    const plan = buildExecutionPlan(nodeIds, edges, defaults.globalIterationLimit);
    set({ executionPlan: plan });
    appendLog(set, `Execution plan: ${plan.layers.length} layers, ${plan.cycleGroups.length} cycle groups, acyclic=${plan.isAcyclic}`);

    for (const id of nodeIds) {
      setNodeStatus(set, id, 'queued');
    }

    const sem = new Semaphore(defaults.maxConcurrency);
    const outputs = new Map<string, NodeOutput>();
    const previousHashes = new Map<string, Map<string, string>>();

    try {
      for (let layerIdx = 0; layerIdx < plan.layers.length; layerIdx++) {
        if (get().flowStatus !== 'running') break;

        const layer = plan.layers[layerIdx];
        appendLog(set, `Layer ${layerIdx + 1}: [${layer.join(', ')}]`);

        const cycleGroup = plan.cycleGroups.find(g =>
          g.nodeIds.some(id => layer.includes(id))
        );

        if (cycleGroup) {
          while (shouldContinueCycle(cycleGroup)) {
            if (get().flowStatus !== 'running') break;

            cycleGroup.currentIteration++;
            appendLog(set, `Cycle iteration ${cycleGroup.currentIteration}/${cycleGroup.maxIterations}`);

            await executeLayer(cycleGroup.nodeIds, edges, flow, defaults, sem, outputs, set, get);

            for (const nodeId of cycleGroup.nodeIds) {
              const output = get().nodeOutputs.get(nodeId);
              if (output) outputs.set(nodeId, output);
            }

            const groupKey = cycleGroup.nodeIds.join(',');
            const prevHash = previousHashes.get(groupKey);
            if (prevHash && checkConvergence(cycleGroup, prevHash, outputs)) {
              cycleGroup.converged = true;
              appendLog(set, 'Cycle converged');
              break;
            }
            previousHashes.set(groupKey, getOutputHashes(cycleGroup, outputs));

            if (defaults.stopOnError) {
              const hasError = cycleGroup.nodeIds.some(id => get().nodeStatuses.get(id) === 'error');
              if (hasError) {
                appendLog(set, 'Stopping cycle due to error');
                break;
              }
            }
          }
        } else {
          await executeLayer(layer, edges, flow, defaults, sem, outputs, set, get);

          for (const nodeId of layer) {
            const output = get().nodeOutputs.get(nodeId);
            if (output) outputs.set(nodeId, output);
          }

          if (defaults.stopOnError) {
            const hasError = layer.some(id => get().nodeStatuses.get(id) === 'error');
            if (hasError) {
              appendLog(set, 'Stopping flow due to error (stopOnError=true)');
              set({ flowStatus: 'failed' });
              break;
            }
          }
        }
      }

      if (get().flowStatus === 'running') {
        set({ flowStatus: 'completed' });
        appendLog(set, 'Flow completed');
      }
    } catch (err) {
      appendLog(set, `Flow error: ${err}`);
      set({ flowStatus: 'failed' });
    }

    set({ finishedAt: Date.now() });
  },

  cancelFlow: async () => {
    appendLog(set, 'Cancelling flow');
    set({ flowStatus: 'cancelled' });
    await cancelAllProcesses();

    const statuses = get().nodeStatuses;
    for (const [nodeId, status] of statuses) {
      if (status === 'running' || status === 'streaming' || status === 'queued') {
        setNodeStatus(set, nodeId, 'cancelled');
      }
    }
    set({ finishedAt: Date.now() });
  },

  cancelNode: async (nodeId) => {
    const processId = get().activeProcessIds.get(nodeId);
    if (processId) {
      await cancelProcess(processId);
      setNodeStatus(set, nodeId, 'cancelled');
    }
  },

  resetExecution: () => {
    set({
      flowStatus: 'idle',
      nodeStatuses: new Map(),
      nodeOutputs: new Map(),
      nodeStreaming: new Map(),
      nodeLogs: new Map(),
      nodeParsers: new Map(),
      nodeResultMeta: new Map(),
      executionPlan: null,
      activeProcessIds: new Map(),
      subAgents: new Map(),
      nodeToolActivity: new Map(),
      nodeLiveMetrics: new Map(),
      startedAt: null,
      finishedAt: null,
      logs: [],
    });
  },

  getNodeStatus: (nodeId) => get().nodeStatuses.get(nodeId) ?? 'idle',
  getNodeOutput: (nodeId) => get().nodeOutputs.get(nodeId),
  getNodeStreaming: (nodeId) => get().nodeStreaming.get(nodeId) ?? '',
  getNodeLogs: (nodeId) => get().nodeLogs.get(nodeId) ?? EMPTY_AGENT_LOGS,
  isRunning: () => get().flowStatus === 'running',
}));

// --- Execution helpers (module-level) ---

type SetFn = (fn: (s: ExecutionState) => Partial<ExecutionState>) => void;
type GetFn = () => ExecutionState;

interface FlowSnapshot {
  getNode: (id: string) => { data: AnyNodeData } | undefined;
  getNodeLabel: (id: string) => string;
  defaults: { workingDirectory: string };
}

interface FlowDefaultsSnapshot {
  stopOnError: boolean;
  maxConcurrency: number;
  globalIterationLimit: number;
  workingDirectory: string;
}

async function executeLayer(
  nodeIds: string[],
  edges: Edge[],
  flow: FlowSnapshot,
  defaults: FlowDefaultsSnapshot,
  sem: Semaphore,
  outputs: Map<string, NodeOutput>,
  set: SetFn,
  get: GetFn,
): Promise<void> {
  const tasks = nodeIds.map(async (nodeId) => {
    if (get().flowStatus !== 'running') return;
    await sem.acquire();
    try {
      if (get().flowStatus !== 'running') return;
      await executeNode(nodeId, edges, flow, defaults, outputs, set, get);
    } finally {
      sem.release();
    }
  });
  await Promise.all(tasks);
}

async function executeNode(
  nodeId: string,
  edges: Edge[],
  flow: FlowSnapshot,
  defaults: FlowDefaultsSnapshot,
  outputs: Map<string, NodeOutput>,
  set: SetFn,
  get: GetFn,
): Promise<void> {
  const node = flow.getNode(nodeId);
  if (!node) return;

  const data = node.data;
  if (!data.enabled) {
    setNodeStatus(set, nodeId, 'skipped');
    return;
  }

  setNodeStatus(set, nodeId, 'running');
  const startTime = Date.now();
  appendNodeLogEvent(set, nodeId, {
    kind: 'lifecycle',
    level: 'info',
    title: 'Node started',
    summary: `${data.label} started`,
    status: 'running',
  });

  if (data.nodeType === 'claude-code') {
    set((s) => {
      const next = new Map(s.nodeParsers);
      next.set(nodeId, createClaudeStreamParserState());
      return { nodeParsers: next };
    });
  }

  // Build merged input from upstream nodes
  const nodeLabels = new Map<string, string>();
  for (const [id] of outputs) {
    nodeLabels.set(id, flow.getNodeLabel(id));
  }
  const mergedInput = mergeInputs(nodeId, edges, outputs, nodeLabels);
  const workingDir = data.workingDirectory || defaults.workingDirectory || undefined;

  // Completion tracking via promise
  let completionResolve: ((r: CompletionResult) => void) | null = null;
  let completionReject: ((e: Error) => void) | null = null;
  const completionPromise = new Promise<CompletionResult>((resolve, reject) => {
    completionResolve = resolve;
    completionReject = reject;
  });

  const onEvent = (event: ProcessEvent) => {
    switch (event.type) {
      case 'started':
        set((s) => {
          const next = new Map(s.activeProcessIds);
          next.set(nodeId, event.processId);
          return { activeProcessIds: next };
        });
        appendNodeLogEvent(set, nodeId, {
          kind: 'lifecycle',
          level: 'info',
          title: 'Process started',
          summary: `pid=${event.pid ?? 0} processId=${event.processId}`,
        });
        break;
      case 'stdout':
        setNodeStatus(set, nodeId, 'streaming');
        appendNodeStreaming(set, nodeId, event.chunk ?? '');

        // Parse stream-json events for live tracking and structured logs.
        if (data.nodeType === 'claude-code' && (data as ClaudeCodeNodeData).outputFormat === 'stream-json') {
          parseStreamChunk(nodeId, event.chunk ?? '', set, get);
        } else if (event.chunk) {
          appendNodeLogEvent(set, nodeId, {
            kind: 'stdout',
            level: 'info',
            title: 'stdout',
            summary: event.chunk,
            raw: event.chunk,
          });
        }
        break;
      case 'stderr':
        appendNodeStreaming(set, nodeId, `[stderr] ${event.chunk ?? ''}`);
        appendNodeLogEvent(set, nodeId, {
          kind: 'stderr',
          level: 'error',
          title: 'stderr',
          summary: event.chunk ?? '',
          raw: event.chunk,
          status: 'error',
        });
        break;
      case 'completed':
        if (data.nodeType === 'claude-code' && (data as ClaudeCodeNodeData).outputFormat === 'stream-json') {
          const pendingCarry = get().nodeParsers.get(nodeId)?.carry ?? '';
          if (pendingCarry.trim().length > 0) {
            parseStreamChunk(nodeId, '\n', set, get);
          }
        }
        set((s) => {
          const next = new Map(s.activeProcessIds);
          next.delete(nodeId);
          return { activeProcessIds: next };
        });
        completionResolve?.({
          stdout: event.stdoutFull ?? '',
          stderr: event.stderrFull ?? '',
          exitCode: event.exitCode ?? null,
        });
        appendNodeLogEvent(set, nodeId, {
          kind: 'lifecycle',
          level: event.exitCode === 0 || event.exitCode == null ? 'info' : 'error',
          title: 'Process completed',
          summary: `exitCode=${event.exitCode ?? 'n/a'}`,
          status: event.exitCode === 0 || event.exitCode == null ? 'completed' : 'error',
        });
        break;
      case 'error':
        set((s) => {
          const next = new Map(s.activeProcessIds);
          next.delete(nodeId);
          return { activeProcessIds: next };
        });
        appendNodeLogEvent(set, nodeId, {
          kind: 'lifecycle',
          level: 'error',
          title: 'Process error',
          summary: event.message ?? 'Unknown process error',
          status: 'error',
        });
        completionReject?.(new Error(event.message ?? 'Unknown process error'));
        break;
      case 'cancelled':
        set((s) => {
          const next = new Map(s.activeProcessIds);
          next.delete(nodeId);
          return { activeProcessIds: next };
        });
        appendNodeLogEvent(set, nodeId, {
          kind: 'lifecycle',
          level: 'warn',
          title: 'Process cancelled',
          summary: 'Cancellation received',
        });
        completionReject?.(new Error('Process cancelled'));
        break;
    }
  };

  try {
    switch (data.nodeType) {
      case 'claude-code':
        await executeClaudeNode(data, mergedInput, workingDir, onEvent);
        break;
      case 'bash':
        await executeBashNode(data, mergedInput, workingDir, onEvent);
        break;
    }

    // JS-side safety timeout: if Rust panics or hangs, don't freeze the flow forever
    const JS_TIMEOUT_MS = data.timeoutMs > 0 ? data.timeoutMs + 10_000 : 300_000; // node timeout + 10s buffer, or 5min default
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('Node execution timed out (JS safety timeout)')), JS_TIMEOUT_MS);
    });
    const result = await Promise.race([completionPromise, timeoutPromise]);
    const durationMs = Date.now() - startTime;

    const streamMeta = get().nodeResultMeta.get(nodeId);
    const parsed = parseClaudeOutput(
      data.nodeType,
      result.stdout,
      data.nodeType === 'claude-code' ? (data as ClaudeCodeNodeData).outputFormat : undefined,
      streamMeta,
    );

    const nodeOutput: NodeOutput = {
      nodeId,
      nodeType: data.nodeType,
      nodeLabel: data.label,
      timestamp: Date.now(),
      status: result.exitCode === 0 || result.exitCode === null ? 'success' : 'error',
      result: {
        text: parsed.text,
        exitCode: result.exitCode ?? undefined,
        data: tryParseJson(parsed.text),
      },
      meta: {
        durationMs,
        model: 'model' in data ? (data as ClaudeCodeNodeData).model : undefined,
        ...parsed.meta,
      },
      error: result.exitCode !== 0 && result.exitCode !== null
        ? {
            message: result.stderr || `Process exited with code ${result.exitCode}`,
            code: 'process_error',
            stderr: result.stderr,
          }
        : undefined,
    };

    set((s) => {
      const next = new Map(s.nodeOutputs);
      next.set(nodeId, nodeOutput);
      return { nodeOutputs: next };
    });

    // Cleanup sub-agents and live tracking for this node
    useFlowStore.getState().removeSubAgentNodes(nodeId);
    set((s) => {
      const nextAgents = new Map(s.subAgents);
      for (const [key, agent] of nextAgents) {
        if (agent.parentNodeId === nodeId) nextAgents.delete(key);
      }
      const nextActivity = new Map(s.nodeToolActivity);
      nextActivity.delete(nodeId);
      const nextMetrics = new Map(s.nodeLiveMetrics);
      nextMetrics.delete(nodeId);
      const nextParsers = new Map(s.nodeParsers);
      nextParsers.delete(nodeId);
      const nextResultMeta = new Map(s.nodeResultMeta);
      nextResultMeta.delete(nodeId);
      return {
        subAgents: nextAgents,
        nodeToolActivity: nextActivity,
        nodeLiveMetrics: nextMetrics,
        nodeParsers: nextParsers,
        nodeResultMeta: nextResultMeta,
      };
    });

    setNodeStatus(set, nodeId, nodeOutput.status === 'success' ? 'success' : 'error');
    appendLog(set, `${data.label} ${nodeOutput.status} (${durationMs}ms)`);
  } catch (err) {
    const durationMs = Date.now() - startTime;
    const errorMsg = err instanceof Error ? err.message : String(err);

    const nodeOutput: NodeOutput = {
      nodeId,
      nodeType: data.nodeType,
      nodeLabel: data.label,
      timestamp: Date.now(),
      status: 'error',
      result: { text: '' },
      meta: { durationMs },
      error: { message: errorMsg, code: 'process_error' },
    };

    set((s) => {
      const next = new Map(s.nodeOutputs);
      next.set(nodeId, nodeOutput);
      return { nodeOutputs: next };
    });

    // Cleanup sub-agents and live tracking on error
    useFlowStore.getState().removeSubAgentNodes(nodeId);
    set((s) => {
      const nextAgents = new Map(s.subAgents);
      for (const [key, agent] of nextAgents) {
        if (agent.parentNodeId === nodeId) nextAgents.delete(key);
      }
      const nextActivity = new Map(s.nodeToolActivity);
      nextActivity.delete(nodeId);
      const nextMetrics = new Map(s.nodeLiveMetrics);
      nextMetrics.delete(nodeId);
      const nextParsers = new Map(s.nodeParsers);
      nextParsers.delete(nodeId);
      const nextResultMeta = new Map(s.nodeResultMeta);
      nextResultMeta.delete(nodeId);
      return {
        subAgents: nextAgents,
        nodeToolActivity: nextActivity,
        nodeLiveMetrics: nextMetrics,
        nodeParsers: nextParsers,
        nodeResultMeta: nextResultMeta,
      };
    });

    setNodeStatus(set, nodeId, 'error');
    appendLog(set, `${data.label} error: ${errorMsg}`);
  }
}

async function executeClaudeNode(
  data: ClaudeCodeNodeData,
  input: MergedInput,
  workingDir: string | undefined,
  onEvent: (event: ProcessEvent) => void,
): Promise<string> {
  const normalizeModel = (value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const key = trimmed.toLowerCase().replace(/\s+/g, '-');
    if (key === 'sonnet-latest' || key === 'latest-sonnet' || key === 'claude-sonnet-latest') return 'sonnet';
    if (key === 'opus-latest' || key === 'latest-opus' || key === 'claude-opus-latest') return 'opus';
    if (key === 'haiku-latest' || key === 'latest-haiku' || key === 'claude-haiku-latest') return 'haiku';
    return trimmed;
  };

  const prompt = buildClaudePrompt(data.prompt, input);
  const extraPrompt = data.appendSystemPrompt?.trim();
  const systemPrompt = [buildClaudeSystemPrompt(data.label), extraPrompt].filter(Boolean).join('\n\n');

  // Default to bypassPermissions to prevent Claude blocking forever waiting for stdin
  const permissionMode = data.permissionMode || 'bypassPermissions';

  return invokeClaude({
    prompt,
    model: normalizeModel(data.model),
    outputFormat: data.outputFormat,
    allowedTools: data.allowedTools.length > 0 ? data.allowedTools : undefined,
    disallowedTools: data.disallowedTools.length > 0 ? data.disallowedTools : undefined,
    appendSystemPrompt: systemPrompt,
    maxBudgetUsd: data.maxBudgetUsd > 0 ? data.maxBudgetUsd : undefined,
    permissionMode,
    workingDirectory: workingDir,
    additionalDirs: data.additionalDirs.length > 0 ? data.additionalDirs : undefined,
    maxTurns: data.maxTurns > 0 ? data.maxTurns : undefined,
    continueSession: data.continueSession || undefined,
    jsonSchema: data.jsonSchema?.trim() || undefined,
    timeoutMs: data.timeoutMs > 0 ? data.timeoutMs : undefined,
  }, onEvent);
}

async function executeBashNode(
  data: BashNodeData,
  input: MergedInput,
  workingDir: string | undefined,
  onEvent: (event: ProcessEvent) => void,
): Promise<string> {
  const { script, env } = buildBashScript(data.script, input);
  const mergedEnv = { ...data.env, ...env };

  return invokeBash({
    script,
    shell: data.shell,
    workingDirectory: workingDir,
    env: Object.keys(mergedEnv).length > 0 ? mergedEnv : undefined,
    timeoutMs: data.timeoutMs > 0 ? data.timeoutMs : undefined,
  }, onEvent);
}

interface CompletionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
}

function tryParseJson(text: string): Record<string, unknown> | undefined {
  try {
    const parsed = JSON.parse(text.trim());
    if (typeof parsed === 'object' && parsed !== null) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Not JSON
  }
  return undefined;
}

function parseStreamChunk(nodeId: string, chunk: string, set: SetFn, get: GetFn) {
  const parserState = get().nodeParsers.get(nodeId) ?? createClaudeStreamParserState();
  const normalizedChunk = chunk.endsWith('\n') ? chunk : `${chunk}\n`;
  const parsedChunk = parseClaudeStreamChunk(parserState, normalizedChunk);

  set((s) => {
    const next = new Map(s.nodeParsers);
    next.set(nodeId, parsedChunk.nextState);
    return { nodeParsers: next };
  });

  for (const warning of parsedChunk.parseErrors) {
    appendNodeLogEvent(set, nodeId, {
      kind: 'parser',
      level: 'warn',
      title: 'Parser warning',
      summary: warning,
      raw: normalizedChunk,
    });
  }

  for (const message of parsedChunk.messages) {
    handleParsedStreamMessage(nodeId, message, set, get);
  }
}

function handleParsedStreamMessage(
  nodeId: string,
  message: ParsedClaudeStreamMessage,
  set: SetFn,
  get: GetFn,
) {
  const type = message.type;
  const level = type === 'result' && message.resultMeta?.isError ? 'error' : 'info';
  const kind = streamTypeToLogKind(type);

  appendNodeLogEvent(set, nodeId, {
    kind,
    level,
    title: streamTypeToTitle(type, message.subtype, message.streamEventType),
    summary: message.summary,
    raw: message.raw,
    status: type === 'result'
      ? message.resultMeta?.isError
        ? 'error'
        : 'completed'
      : undefined,
  });

  if (message.assistantTurn) {
    set((s) => {
      const nextMetrics = new Map(s.nodeLiveMetrics);
      const prev = nextMetrics.get(nodeId) ?? { turns: 0, activeTools: [] };
      nextMetrics.set(nodeId, { ...prev, turns: prev.turns + 1 });
      return { nodeLiveMetrics: nextMetrics };
    });
  }

  for (const tool of message.toolUses) {
    trackToolStart(nodeId, tool.toolUseId, tool.toolName, tool.input, set);
  }

  for (const toolResult of message.toolResults) {
    trackToolResult(nodeId, toolResult, set, get);
  }

  if (message.resultMeta) {
    set((s) => {
      const next = new Map(s.nodeResultMeta);
      next.set(nodeId, message.resultMeta as ClaudeResultMeta);
      return { nodeResultMeta: next };
    });
  }
}

function streamTypeToLogKind(type: string): AgentLogEvent['kind'] {
  if (type === 'assistant') return 'assistant';
  if (type === 'system') return 'system';
  if (type === 'stream_event') return 'stream';
  if (type === 'user') return 'user';
  if (type === 'result') return 'result';
  if (type === 'tool_result') return 'tool_result';
  return 'stdout';
}

function streamTypeToTitle(type: string, subtype?: string, streamEventType?: string): string {
  if (type === 'assistant') return 'Assistant';
  if (type === 'system') return subtype ? `System ${subtype}` : 'System';
  if (type === 'stream_event') return streamEventType ? `Stream ${streamEventType}` : 'Stream event';
  if (type === 'user') return 'User';
  if (type === 'result') return subtype ? `Result ${subtype}` : 'Result';
  if (type === 'tool_result') return 'Tool result';
  return `Event: ${type}`;
}

function formatToolInputValue(value: unknown): string {
  if (typeof value === 'string') return value.length > 80 ? `${value.slice(0, 77)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (value && typeof value === 'object') return '{...}';
  return 'null';
}

function trackToolStart(
  nodeId: string,
  toolUseId: string,
  toolName: string,
  input: Record<string, unknown> | undefined,
  set: SetFn,
) {
  const inputEntries = input ? Object.entries(input).slice(0, 3) : [];
  const summary = inputEntries.length > 0
    ? inputEntries
        .map(([key, value]) => `${key}=${formatToolInputValue(value)}`)
        .join(' · ')
    : `toolUseId=${toolUseId}`;

  appendNodeLogEvent(set, nodeId, {
    kind: 'tool_use',
    level: 'info',
    title: `Tool start: ${toolName}`,
    summary,
    raw: JSON.stringify({
      toolUseId,
      toolName,
      input: input ?? {},
    }),
    status: 'running',
  });

  if (toolName === 'Task') {
    const agentName = typeof input?.name === 'string' ? input.name : 'Sub-agent';
    const agentDesc = typeof input?.description === 'string' ? input.description : '';
    const agent: SubAgent = {
      id: toolUseId,
      parentNodeId: nodeId,
      name: agentName,
      description: agentDesc,
      status: 'spawning',
      spawnedAt: Date.now(),
    };

    set((s) => {
      const next = new Map(s.subAgents);
      next.set(toolUseId, agent);
      return { subAgents: next };
    });

    const flowNodeId = useFlowStore.getState().addSubAgentNode(nodeId, {
      id: toolUseId,
      name: agentName,
      description: agentDesc,
      status: 'spawning',
    });

    if (flowNodeId) {
      set((s) => {
        const next = new Map(s.subAgents);
        const current = next.get(toolUseId);
        if (current) {
          next.set(toolUseId, { ...current, flowNodeId, status: 'running' });
        }
        return { subAgents: next };
      });
      useFlowStore.getState().updateSubAgentStatus(flowNodeId, 'running');
    }
  }

  const activity: ToolActivity = {
    toolUseId,
    toolName,
    status: 'running',
    startedAt: Date.now(),
  };

  set((s) => {
    const nextActivity = new Map(s.nodeToolActivity);
    const current = nextActivity.get(nodeId) ?? [];
    const hasExisting = current.some((item) => item.toolUseId === toolUseId);
    const list = hasExisting ? current : [...current, activity];
    nextActivity.set(nodeId, list);

    const nextMetrics = new Map(s.nodeLiveMetrics);
    const metrics = nextMetrics.get(nodeId) ?? { turns: 0, activeTools: [] };
    nextMetrics.set(nodeId, { ...metrics, activeTools: [...metrics.activeTools, toolName] });

    return { nodeToolActivity: nextActivity, nodeLiveMetrics: nextMetrics };
  });
}

function trackToolResult(
  nodeId: string,
  toolResult: ParsedClaudeStreamMessage['toolResults'][number],
  set: SetFn,
  get: GetFn,
) {
  const { toolUseId, isError } = toolResult;
  const activeTool = get().nodeToolActivity.get(nodeId)?.find(item => item.toolUseId === toolUseId);
  const toolName = toolResult.toolName ?? activeTool?.toolName;
  const fallbackSummary = `${toolName ?? toolUseId} ${isError ? 'failed' : 'completed'}`;

  appendNodeLogEvent(set, nodeId, {
    kind: 'tool_result',
    level: isError ? 'error' : 'info',
    title: 'Tool result',
    summary: toolResult.contentText || fallbackSummary,
    raw: JSON.stringify({
      toolUseId,
      isError,
      stdout: toolResult.stdout,
      stderr: toolResult.stderr,
      contentText: toolResult.contentText,
      toolName,
    }),
    status: isError ? 'error' : 'completed',
  });

  set((s) => {
    const nextActivity = new Map(s.nodeToolActivity);
    const current = nextActivity.get(nodeId) ?? [];
    const list = current.map((item) =>
      item.toolUseId === toolUseId
        ? { ...item, status: isError ? ('error' as const) : ('completed' as const) }
        : item
    );
    nextActivity.set(nodeId, list);

    const nextMetrics = new Map(s.nodeLiveMetrics);
    const metrics = nextMetrics.get(nodeId);
    if (metrics) {
      const completedTool = list.find((item) => item.toolUseId === toolUseId);
      const toolName = completedTool?.toolName;
      const idx = toolName ? metrics.activeTools.indexOf(toolName) : -1;
      const activeTools = idx >= 0
        ? [...metrics.activeTools.slice(0, idx), ...metrics.activeTools.slice(idx + 1)]
        : metrics.activeTools;
      nextMetrics.set(nodeId, { ...metrics, activeTools });
    }

    const agent = s.subAgents.get(toolUseId);
    if (agent?.flowNodeId) {
      useFlowStore.getState().updateSubAgentStatus(agent.flowNodeId, isError ? 'error' : 'completed');
      const nextAgents = new Map(s.subAgents);
      nextAgents.set(toolUseId, { ...agent, status: isError ? 'error' : 'completed' });
      return { nodeToolActivity: nextActivity, nodeLiveMetrics: nextMetrics, subAgents: nextAgents };
    }

    return { nodeToolActivity: nextActivity, nodeLiveMetrics: nextMetrics };
  });
}

interface ParsedClaudeOutput {
  text: string;
  meta: {
    costUsd?: number;
    numTurns?: number;
    sessionId?: string;
    tokenUsage?: { input: number; output: number };
  };
}

function parseClaudeOutput(
  nodeType: string,
  stdout: string,
  outputFormat?: string,
  streamMeta?: ClaudeResultMeta,
): ParsedClaudeOutput {
  if (nodeType !== 'claude-code') {
    return { text: stdout, meta: {} };
  }

  const extractMeta = (meta: ClaudeResultMeta): ParsedClaudeOutput => ({
    text: typeof meta.resultText === 'string' ? meta.resultText : stdout,
    meta: {
      costUsd: meta.costUsd,
      numTurns: meta.numTurns,
      sessionId: meta.sessionId,
      tokenUsage: meta.tokenUsage,
    },
  });

  if (streamMeta) {
    return extractMeta(streamMeta);
  }

  if (outputFormat === 'json') {
    const parsed = parseClaudeJsonResult(stdout);
    if (parsed) {
      return extractMeta(parsed);
    }
  }

  if (outputFormat === 'stream-json') {
    const parsed = parseClaudeStreamResult(stdout);
    if (parsed) {
      return extractMeta(parsed);
    }
  }

  return { text: stdout, meta: {} };
}
