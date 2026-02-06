import type { NodeType } from './nodes';

export interface NodeOutput {
  nodeId: string;
  nodeType: NodeType;
  nodeLabel: string;
  timestamp: number;
  status: 'success' | 'error';
  result: {
    text: string;
    data?: Record<string, unknown>;
    exitCode?: number;
  };
  meta: {
    durationMs: number;
    model?: string;
    costUsd?: number;
    tokenUsage?: { input: number; output: number };
    sessionId?: string;
    iteration?: number;
  };
  error?: {
    message: string;
    code?: 'timeout' | 'cancelled' | 'process_error' | 'parse_error';
    stderr?: string;
  };
}

export interface MergedInput {
  sources: NodeOutput[];
  combinedText: string;
  combinedData: Record<string, unknown>;
  hasErrors: boolean;
}
