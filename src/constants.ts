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

export const FLOW_DEFAULTS = {
  workingDirectory: '',
  maxConcurrency: 3,
  stopOnError: true,
  globalIterationLimit: 10,
};
