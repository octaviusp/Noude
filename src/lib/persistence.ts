import { useFlowStore } from '../store/flowStore';
import type { Node, Edge, Viewport } from '@xyflow/react';
import type { AnyNodeData, NoudeEdgeData } from '../types';

const STORAGE_KEY = 'noude-flow-autosave';
const DEBOUNCE_MS = 1000;

interface PersistedFlow {
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  flowName: string;
  flowId: string;
  defaults: {
    workingDirectory: string;
    maxConcurrency: number;
    stopOnError: boolean;
    globalIterationLimit: number;
  };
  savedAt: string;
}

function saveToLocalStorage() {
  const { nodes, edges, viewport, flowName, flowId, defaults } = useFlowStore.getState();

  // Filter out sub-agent nodes — they're ephemeral
  const persistNodes = nodes.filter(n => n.type !== 'sub-agent');
  const subIds = new Set(nodes.filter(n => n.type === 'sub-agent').map(n => n.id));
  const persistEdges = edges.filter(e => !subIds.has(e.source) && !subIds.has(e.target));

  const data: PersistedFlow = {
    nodes: persistNodes,
    edges: persistEdges,
    viewport,
    flowName,
    flowId,
    defaults,
    savedAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage full or unavailable — silently skip
  }
}

function loadFromLocalStorage(): PersistedFlow | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as PersistedFlow;
    if (!data.nodes || !Array.isArray(data.nodes)) return null;
    return data;
  } catch {
    return null;
  }
}

export function hydrateFlowStore() {
  const saved = loadFromLocalStorage();
  if (!saved || saved.nodes.length === 0) return;

  useFlowStore.setState({
    nodes: saved.nodes as Node<AnyNodeData>[],
    edges: saved.edges as Edge<NoudeEdgeData>[],
    viewport: saved.viewport,
    flowName: saved.flowName,
    flowId: saved.flowId,
    defaults: saved.defaults,
    selectedNodeId: null,
  });
}

export function initAutoPersistence() {
  let timer: ReturnType<typeof setTimeout> | null = null;

  useFlowStore.subscribe(() => {
    // Mark dirty (skip if already dirty to avoid re-trigger loop)
    if (!useFlowStore.getState().isDirty) {
      useFlowStore.setState({ isDirty: true });
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(saveToLocalStorage, DEBOUNCE_MS);
  });
}

export function clearPersistedFlow() {
  localStorage.removeItem(STORAGE_KEY);
}
