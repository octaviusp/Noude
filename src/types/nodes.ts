export type NodeType = 'claude-code' | 'bash';
export type NodeStatus = 'idle' | 'queued' | 'running' | 'streaming' | 'success' | 'error' | 'cancelled' | 'skipped';

export interface BaseNodeData {
  [key: string]: unknown;
  label: string;
  nodeType: NodeType;
  workingDirectory: string;
  enabled: boolean;
  timeoutMs: number;
}

export interface ClaudeCodeNodeData extends BaseNodeData {
  nodeType: 'claude-code';
  prompt: string;
  model: 'sonnet' | 'opus' | 'haiku';
  outputFormat: 'json' | 'stream-json' | 'text';
  allowedTools: string[];
  disallowedTools: string[];
  appendSystemPrompt: string;
  maxBudgetUsd: number;
  permissionMode: 'bypassPermissions' | 'dontAsk' | 'acceptEdits' | 'plan' | 'default' | 'delegate';
  additionalDirs: string[];
  continueSession: boolean;
  jsonSchema?: string;
}

export interface BashNodeData extends BaseNodeData {
  nodeType: 'bash';
  script: string;
  shell: 'bash' | 'sh' | 'zsh';
  env: Record<string, string>;
}

export type AnyNodeData = ClaudeCodeNodeData | BashNodeData;
