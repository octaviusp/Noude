import type { Edge } from '@xyflow/react';
import type { ExecutionPlan, CycleGroup } from '../types';

interface AdjList {
  [nodeId: string]: string[];
}

function buildAdjacency(nodeIds: string[], edges: Edge[]): AdjList {
  const adj: AdjList = {};
  for (const id of nodeIds) adj[id] = [];
  for (const edge of edges) {
    if (adj[edge.source]) {
      adj[edge.source].push(edge.target);
    }
  }
  return adj;
}

function tarjanSCC(nodeIds: string[], adj: AdjList): string[][] {
  let index = 0;
  const stack: string[] = [];
  const onStack = new Set<string>();
  const indices: Record<string, number> = {};
  const lowlinks: Record<string, number> = {};
  const sccs: string[][] = [];

  function strongConnect(v: string) {
    indices[v] = index;
    lowlinks[v] = index;
    index++;
    stack.push(v);
    onStack.add(v);

    for (const w of adj[v] || []) {
      if (indices[w] === undefined) {
        strongConnect(w);
        lowlinks[v] = Math.min(lowlinks[v], lowlinks[w]);
      } else if (onStack.has(w)) {
        lowlinks[v] = Math.min(lowlinks[v], indices[w]);
      }
    }

    if (lowlinks[v] === indices[v]) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      sccs.push(scc);
    }
  }

  for (const v of nodeIds) {
    if (indices[v] === undefined) {
      strongConnect(v);
    }
  }

  return sccs;
}

function kahnTopologicalLayers(
  superNodes: string[][],
  edges: Edge[],
  sccMap: Map<string, number>
): string[][] {
  const n = superNodes.length;
  const superAdj: number[][] = Array.from({ length: n }, () => []);
  const inDegree = new Array(n).fill(0);

  const seen = new Set<string>();
  for (const edge of edges) {
    const from = sccMap.get(edge.source)!;
    const to = sccMap.get(edge.target)!;
    if (from !== to) {
      const key = `${from}-${to}`;
      if (!seen.has(key)) {
        seen.add(key);
        superAdj[from].push(to);
        inDegree[to]++;
      }
    }
  }

  const layers: string[][] = [];
  let queue = Array.from({ length: n }, (_, i) => i).filter(i => inDegree[i] === 0);

  while (queue.length > 0) {
    const layer: string[] = [];
    const next: number[] = [];

    for (const idx of queue) {
      for (const id of superNodes[idx]) {
        layer.push(id);
      }
      for (const neighbor of superAdj[idx]) {
        inDegree[neighbor]--;
        if (inDegree[neighbor] === 0) {
          next.push(neighbor);
        }
      }
    }

    layers.push(layer);
    queue = next;
  }

  return layers;
}

export function buildExecutionPlan(
  nodeIds: string[],
  edges: Edge[],
  globalIterationLimit: number = 10
): ExecutionPlan {
  if (nodeIds.length === 0) {
    return { layers: [], cycleGroups: [], isAcyclic: true };
  }

  const adj = buildAdjacency(nodeIds, edges);
  const sccs = tarjanSCC(nodeIds, adj);

  const sccMap = new Map<string, number>();
  sccs.forEach((scc, idx) => {
    for (const id of scc) sccMap.set(id, idx);
  });

  const cycleGroups: CycleGroup[] = [];
  const isAcyclic = sccs.every(scc => {
    if (scc.length > 1) {
      cycleGroups.push({
        nodeIds: scc,
        maxIterations: globalIterationLimit,
        currentIteration: 0,
        converged: false,
      });
      return false;
    }
    // Check for self-loop
    const id = scc[0];
    if (adj[id]?.includes(id)) {
      cycleGroups.push({
        nodeIds: scc,
        maxIterations: globalIterationLimit,
        currentIteration: 0,
        converged: false,
      });
      return false;
    }
    return true;
  });

  const layers = kahnTopologicalLayers(sccs, edges, sccMap);

  return { layers, cycleGroups, isAcyclic };
}
