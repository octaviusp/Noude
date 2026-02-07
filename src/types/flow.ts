import type { Node, Edge, Viewport } from '@xyflow/react';

export interface FlowDefinition {
  version: 1;
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  nodes: Node[];
  edges: Edge[];
  viewport: Viewport;
  defaults: {
    workingDirectory: string;
    maxConcurrency: number;
    stopOnError: boolean;
    globalIterationLimit: number;
  };
}
