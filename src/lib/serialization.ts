import type { FlowDefinition } from '../types';
import type { Node, Edge, Viewport } from '@xyflow/react';

export function exportFlow(
  name: string,
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport,
  flowId: string,
  defaults: FlowDefinition['defaults'],
  createdAt?: string,
): FlowDefinition {
  return {
    version: 1,
    id: flowId,
    name,
    createdAt: createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
    viewport,
    defaults,
  };
}

export function importFlow(json: string): FlowDefinition {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error('Invalid JSON: could not parse flow file');
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Flow file must contain a JSON object');
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.version !== 1) throw new Error(`Unsupported flow version: ${obj.version}`);
  if (!Array.isArray(obj.nodes)) throw new Error('Flow is missing "nodes" array');
  if (!Array.isArray(obj.edges)) throw new Error('Flow is missing "edges" array');
  if (!obj.viewport || typeof obj.viewport !== 'object') throw new Error('Flow is missing "viewport"');
  if (typeof obj.name !== 'string' || !obj.name) throw new Error('Flow is missing "name"');
  if (typeof obj.id !== 'string' || !obj.id) throw new Error('Flow is missing "id"');
  if (!obj.defaults || typeof obj.defaults !== 'object') throw new Error('Flow is missing "defaults"');

  return obj as unknown as FlowDefinition;
}

export function downloadFlow(flow: FlowDefinition): void {
  const json = JSON.stringify(flow, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${flow.name.replace(/\s+/g, '-').toLowerCase()}.noude.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function loadFlowFromFile(): Promise<FlowDefinition> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.noude.json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(importFlow(reader.result as string));
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    };
    input.click();
  });
}
