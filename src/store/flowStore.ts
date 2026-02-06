import { create } from 'zustand';
import {
  type Node,
  type Edge,
  type Viewport,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
} from '@xyflow/react';
import type { AnyNodeData, NoudeEdgeData, FlowDefinition } from '../types';
import { NODE_DEFAULTS, FLOW_DEFAULTS } from '../constants';
import { layoutNodes } from '../lib/elk';
import { exportFlow, importFlow } from '../lib/serialization';

interface FlowDefaults {
  workingDirectory: string;
  maxConcurrency: number;
  stopOnError: boolean;
  globalIterationLimit: number;
}

interface FlowState {
  // Core React Flow state
  nodes: Node<AnyNodeData>[];
  edges: Edge<NoudeEdgeData>[];
  viewport: Viewport;
  flowName: string;
  flowId: string;
  defaults: FlowDefaults;

  // Selection
  selectedNodeId: string | null;

  // React Flow handlers
  onNodesChange: OnNodesChange<Node<AnyNodeData>>;
  onEdgesChange: OnEdgesChange<Edge<NoudeEdgeData>>;
  onConnect: OnConnect;
  setViewport: (viewport: Viewport) => void;

  // Node CRUD
  addNode: (type: AnyNodeData['nodeType'], position?: { x: number; y: number }) => string;
  updateNodeData: (id: string, data: Partial<AnyNodeData>) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => string | null;
  selectNode: (id: string | null) => void;

  // Edge operations
  removeEdge: (id: string) => void;
  updateEdgeData: (id: string, data: Partial<NoudeEdgeData>) => void;

  // Flow operations
  setFlowName: (name: string) => void;
  setDefaults: (defaults: Partial<FlowDefaults>) => void;
  autoLayout: () => Promise<void>;
  clearFlow: () => void;

  // Serialization
  exportToJson: () => FlowDefinition;
  importFromJson: (json: string) => void;

  // Sub-agent management
  addSubAgentNode: (parentNodeId: string, agent: { id: string; name: string; description: string; status: string }) => string | null;
  removeSubAgentNodes: (parentNodeId: string) => void;
  updateSubAgentStatus: (nodeId: string, status: string) => void;

  // Helpers
  getNode: (id: string) => Node<AnyNodeData> | undefined;
  getNodeLabel: (id: string) => string;
  getEnabledNodeIds: () => string[];
  getEnabledEdges: () => Edge[];
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  flowName: 'Untitled Flow',
  flowId: crypto.randomUUID(),
  defaults: { ...FLOW_DEFAULTS },
  selectedNodeId: null,

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<AnyNodeData>[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) as Edge<NoudeEdgeData>[] });
  },

  onConnect: (connection: Connection) => {
    const edgeData: NoudeEdgeData = { priority: 0, animated: false };
    set({
      edges: addEdge(
        { ...connection, data: edgeData, type: 'noude' },
        get().edges
      ) as Edge<NoudeEdgeData>[],
    });
  },

  setViewport: (viewport) => set({ viewport }),

  addNode: (type, position) => {
    const id = crypto.randomUUID();
    const defaults = NODE_DEFAULTS[type];
    const { workingDirectory } = get().defaults;
    const count = get().nodes.filter(n => n.data.nodeType === type).length + 1;

    const node: Node<AnyNodeData> = {
      id,
      type: 'noude',
      position: position ?? { x: 100 + count * 40, y: 100 + count * 40 },
      data: {
        ...defaults,
        label: `${defaults.label} ${count}`,
        workingDirectory: workingDirectory || defaults.workingDirectory,
      } as AnyNodeData,
    };

    set({ nodes: [...get().nodes, node] });
    return id;
  },

  updateNodeData: (id, data) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as AnyNodeData } : n
      ),
    });
  },

  removeNode: (id) => {
    set({
      nodes: get().nodes.filter(n => n.id !== id),
      edges: get().edges.filter(e => e.source !== id && e.target !== id),
      selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId,
    });
  },

  duplicateNode: (id) => {
    const source = get().nodes.find(n => n.id === id);
    if (!source) return null;

    const newId = crypto.randomUUID();
    const node: Node<AnyNodeData> = {
      ...source,
      id: newId,
      position: { x: source.position.x + 50, y: source.position.y + 50 },
      data: { ...source.data, label: `${source.data.label} (copy)` },
      selected: false,
    };

    set({ nodes: [...get().nodes, node] });
    return newId;
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  removeEdge: (id) => {
    set({ edges: get().edges.filter(e => e.id !== id) });
  },

  updateEdgeData: (id, data) => {
    set({
      edges: get().edges.map(e =>
        e.id === id ? { ...e, data: { ...e.data, ...data } as NoudeEdgeData } : e
      ),
    });
  },

  setFlowName: (name) => set({ flowName: name }),

  setDefaults: (defaults) => {
    set({ defaults: { ...get().defaults, ...defaults } });
  },

  autoLayout: async () => {
    const { nodes, edges } = get();
    if (nodes.length === 0) return;
    const laid = await layoutNodes(nodes, edges);
    set({ nodes: laid as Node<AnyNodeData>[] });
  },

  clearFlow: () => {
    set({
      nodes: [],
      edges: [],
      flowName: 'Untitled Flow',
      flowId: crypto.randomUUID(),
      defaults: { ...FLOW_DEFAULTS },
      selectedNodeId: null,
    });
  },

  exportToJson: () => {
    const { flowName, nodes, edges, viewport } = get();
    return exportFlow(flowName, nodes, edges, viewport);
  },

  importFromJson: (json) => {
    const flow = importFlow(json);
    set({
      nodes: flow.nodes as Node<AnyNodeData>[],
      edges: flow.edges as Edge<NoudeEdgeData>[],
      viewport: flow.viewport,
      flowName: flow.name,
      flowId: flow.id,
      defaults: flow.defaults,
      selectedNodeId: null,
    });
  },

  addSubAgentNode: (parentNodeId, agent) => {
    const parent = get().nodes.find(n => n.id === parentNodeId);
    if (!parent) return null;
    const siblings = get().nodes.filter(
      n => n.type === 'sub-agent' && (n.data as Record<string, unknown>).parentNodeId === parentNodeId
    );
    const x = parent.position.x - 40 + siblings.length * 90;
    const y = parent.position.y + 130;
    const nodeId = `sub-${agent.id}`;
    const node: Node = {
      id: nodeId,
      type: 'sub-agent',
      position: { x, y },
      draggable: false,
      selectable: false,
      connectable: false,
      data: {
        label: agent.name,
        description: agent.description,
        status: agent.status,
        parentNodeId,
        nodeType: 'sub-agent',
      },
    };
    const edge: Edge = {
      id: `edge-${nodeId}`,
      source: parentNodeId,
      sourceHandle: 'out',
      target: nodeId,
      type: 'noude',
    };
    set({
      nodes: [...get().nodes, node] as Node<AnyNodeData>[],
      edges: [...get().edges, edge] as Edge<NoudeEdgeData>[],
    });
    return nodeId;
  },

  removeSubAgentNodes: (parentNodeId) => {
    const subIds = new Set(
      get().nodes
        .filter(n => n.type === 'sub-agent' && (n.data as Record<string, unknown>).parentNodeId === parentNodeId)
        .map(n => n.id)
    );
    set({
      nodes: get().nodes.filter(n => !subIds.has(n.id)) as Node<AnyNodeData>[],
      edges: get().edges.filter(e => !subIds.has(e.target) && !subIds.has(e.source)) as Edge<NoudeEdgeData>[],
    });
  },

  updateSubAgentStatus: (nodeId, status) => {
    set({
      nodes: get().nodes.map(n =>
        n.id === nodeId ? { ...n, data: { ...n.data, status } } : n
      ) as Node<AnyNodeData>[],
    });
  },

  getNode: (id) => get().nodes.find(n => n.id === id),

  getNodeLabel: (id) => {
    const node = get().nodes.find(n => n.id === id);
    return node?.data.label ?? id;
  },

  getEnabledNodeIds: () =>
    get()
      .nodes.filter(n => n.data.enabled)
      .map(n => n.id),

  getEnabledEdges: () => {
    const enabledIds = new Set(get().getEnabledNodeIds());
    return get().edges.filter(e => enabledIds.has(e.source) && enabledIds.has(e.target));
  },
}));
