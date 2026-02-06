export type NodeType = 'claude-code' | 'codex' | 'bash';
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
  permissionMode: 'default' | 'plan' | 'bypassPermissions';
  additionalDirs: string[];
  continueSession: boolean;
  jsonSchema?: string;
}

export interface CodexNodeData extends BaseNodeData {
  nodeType: 'codex';
  prompt: string;
  model: string;
  fullAuto: boolean;
  sandboxMode: 'read-only' | 'workspace-write' | 'danger-full-access';
  jsonOutput: boolean;
  outputLastMessage?: string;
  additionalDirs: string[];
}

export interface BashNodeData extends BaseNodeData {
  nodeType: 'bash';
  script: string;
  shell: 'bash' | 'sh' | 'zsh';
  env: Record<string, string>;
}

export type AnyNodeData = ClaudeCodeNodeData | CodexNodeData | BashNodeData;
