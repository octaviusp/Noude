import type { FlowDefinition } from '../types';
import type { Node, Edge, Viewport } from '@xyflow/react';
import { FLOW_DEFAULTS } from '../constants';

export function exportFlow(
  name: string,
  nodes: Node[],
  edges: Edge[],
  viewport: Viewport
): FlowDefinition {
  return {
    version: 1,
    id: crypto.randomUUID(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    nodes,
    edges,
    viewport,
    defaults: { ...FLOW_DEFAULTS },
  };
}

export function importFlow(json: string): FlowDefinition {
  const flow = JSON.parse(json) as FlowDefinition;
  if (flow.version !== 1) {
    throw new Error(`Unsupported flow version: ${flow.version}`);
  }
  return flow;
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
