import { create } from 'zustand';
import type { Edge } from '@xyflow/react';
import type {
  NodeStatus,
  NodeOutput,
  FlowStatus,
  ExecutionPlan,
  AnyNodeData,
  ClaudeCodeNodeData,
  BashNodeData,
  MergedInput,
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
import { useFlowStore } from './flowStore';

interface ExecutionState {
  // Status
  flowStatus: FlowStatus;
  nodeStatuses: Map<string, NodeStatus>;
  nodeOutputs: Map<string, NodeOutput>;
  nodeStreaming: Map<string, string>;
  executionPlan: ExecutionPlan | null;
  activeProcessIds: Map<string, string>; // nodeId -> processId

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
  isRunning: () => boolean;
}

function appendLog(set: (fn: (s: ExecutionState) => Partial<ExecutionState>) => void, msg: string) {
  set((s) => ({ logs: [...s.logs, `[${new Date().toLocaleTimeString()}] ${msg}`] }));
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
  executionPlan: null,
  activeProcessIds: new Map(),
  startedAt: null,
  finishedAt: null,
  logs: [],

  runFlow: async () => {
    const flow = useFlowStore.getState();
    const nodeIds = flow.getEnabledNodeIds();
    const edges = flow.getEnabledEdges();
    const { defaults } = flow;

    if (nodeIds.length === 0) return;

    // Reset state
    set({
      flowStatus: 'running',
      nodeStatuses: new Map(),
      nodeOutputs: new Map(),
      nodeStreaming: new Map(),
      activeProcessIds: new Map(),
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
      executionPlan: null,
      activeProcessIds: new Map(),
      startedAt: null,
      finishedAt: null,
      logs: [],
    });
  },

  getNodeStatus: (nodeId) => get().nodeStatuses.get(nodeId) ?? 'idle',
  getNodeOutput: (nodeId) => get().nodeOutputs.get(nodeId),
  getNodeStreaming: (nodeId) => get().nodeStreaming.get(nodeId) ?? '',
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
  _get: GetFn,
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
        break;
      case 'stdout':
        setNodeStatus(set, nodeId, 'streaming');
        set((s) => {
          const next = new Map(s.nodeStreaming);
          let buf = next.get(nodeId) ?? '';
          buf += (event.chunk ?? '') + '\n';
          if (buf.length > 102400) buf = buf.slice(-102400);
          next.set(nodeId, buf);
          return { nodeStreaming: next };
        });
        break;
      case 'stderr':
        set((s) => {
          const next = new Map(s.nodeStreaming);
          let buf = next.get(nodeId) ?? '';
          buf += `[stderr] ${event.chunk ?? ''}\n`;
          if (buf.length > 102400) buf = buf.slice(-102400);
          next.set(nodeId, buf);
          return { nodeStreaming: next };
        });
        break;
      case 'completed':
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
        break;
      case 'error':
        set((s) => {
          const next = new Map(s.activeProcessIds);
          next.delete(nodeId);
          return { activeProcessIds: next };
        });
        completionReject?.(new Error(event.message ?? 'Unknown process error'));
        break;
      case 'cancelled':
        set((s) => {
          const next = new Map(s.activeProcessIds);
          next.delete(nodeId);
          return { activeProcessIds: next };
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

    const result = await completionPromise;
    const durationMs = Date.now() - startTime;

    const parsed = parseClaudeOutput(data.nodeType, result.stdout, data.nodeType === 'claude-code' ? (data as ClaudeCodeNodeData).outputFormat : undefined);

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
  const prompt = buildClaudePrompt(data.prompt, input);
  const systemPrompt = buildClaudeSystemPrompt(data.label);

  return invokeClaude({
    prompt,
    model: data.model,
    outputFormat: data.outputFormat,
    allowedTools: data.allowedTools.length > 0 ? data.allowedTools : undefined,
    disallowedTools: data.disallowedTools.length > 0 ? data.disallowedTools : undefined,
    appendSystemPrompt: systemPrompt,
    maxBudgetUsd: data.maxBudgetUsd > 0 ? data.maxBudgetUsd : undefined,
    permissionMode: data.permissionMode,
    workingDirectory: workingDir,
    additionalDirs: data.additionalDirs.length > 0 ? data.additionalDirs : undefined,
    continueSession: data.continueSession || undefined,
    jsonSchema: data.jsonSchema,
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
): ParsedClaudeOutput {
  if (nodeType !== 'claude-code') {
    return { text: stdout, meta: {} };
  }

  const extractMeta = (obj: Record<string, unknown>): ParsedClaudeOutput => {
    const result = typeof obj.result === 'string' ? obj.result : stdout;
    const usage = obj.usage as Record<string, number> | undefined;
    return {
      text: result,
      meta: {
        costUsd: typeof obj.total_cost_usd === 'number' ? obj.total_cost_usd : undefined,
        numTurns: typeof obj.num_turns === 'number' ? obj.num_turns : undefined,
        sessionId: typeof obj.session_id === 'string' ? obj.session_id : undefined,
        tokenUsage: usage && typeof usage.input_tokens === 'number' && typeof usage.output_tokens === 'number'
          ? { input: usage.input_tokens, output: usage.output_tokens }
          : undefined,
      },
    };
  };

  if (outputFormat === 'json') {
    try {
      const parsed = JSON.parse(stdout.trim());
      if (parsed && typeof parsed === 'object' && parsed.type === 'result') {
        return extractMeta(parsed as Record<string, unknown>);
      }
    } catch {
      // Not valid JSON, return raw
    }
  }

  if (outputFormat === 'stream-json') {
    const lines = stdout.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(lines[i]);
        if (parsed && typeof parsed === 'object' && parsed.type === 'result') {
          return extractMeta(parsed as Record<string, unknown>);
        }
      } catch {
        continue;
      }
    }
  }

  return { text: stdout, meta: {} };
}
