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
    numTurns?: number;
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

export interface SubAgent {
  id: string;
  parentNodeId: string;
  name: string;
  description: string;
  status: 'spawning' | 'running' | 'completed' | 'error';
  spawnedAt: number;
  flowNodeId?: string;
}

export interface ToolActivity {
  toolUseId: string;
  toolName: string;
  status: 'running' | 'completed' | 'error';
  startedAt: number;
}

export interface LiveMetrics {
  turns: number;
  activeTools: string[];
}
