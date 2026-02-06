import { ClaudeCodeNode } from './ClaudeCodeNode';
import { CodexNode } from './CodexNode';
import { BashNode } from './BashNode';

export const nodeTypes = {
  'noude': ClaudeCodeNode, // default, overridden by type-specific rendering inside BaseNode
  'claude-code': ClaudeCodeNode,
  codex: CodexNode,
  bash: BashNode,
};
