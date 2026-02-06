import type { NodeType } from './types';

export const NODE_DEFAULTS = {
  'claude-code': {
    label: 'Claude Code',
    nodeType: 'claude-code' as NodeType,
    workingDirectory: '',
    enabled: true,
    timeoutMs: 0,
    prompt: '',
    model: 'sonnet' as const,
    outputFormat: 'stream-json' as const,
    allowedTools: [],
    disallowedTools: [],
    appendSystemPrompt: '',
    maxBudgetUsd: 0,
    maxTurns: 0,
    permissionMode: 'bypassPermissions' as const,
    additionalDirs: [],
    continueSession: false,
  },
  bash: {
    label: 'Bash',
    nodeType: 'bash' as NodeType,
    workingDirectory: '',
    enabled: true,
    timeoutMs: 0,
    script: '',
    shell: 'bash' as const,
    env: {},
  },
};

export const NODE_COLORS: Record<NodeType, string> = {
  'claude-code': '#d97706',
  bash: '#6366f1',
};

export const STATUS_COLORS = {
  idle: '#6b7280',
  queued: '#f59e0b',
  running: '#3b82f6',
  streaming: '#8b5cf6',
  success: '#10b981',
  error: '#ef4444',
  cancelled: '#9ca3af',
  skipped: '#9ca3af',
};

export const FLOW_DEFAULTS = {
  workingDirectory: '',
  maxConcurrency: 3,
  stopOnError: true,
  globalIterationLimit: 10,
};
