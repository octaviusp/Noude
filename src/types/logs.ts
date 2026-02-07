export type AgentLogKind =
  | 'lifecycle'
  | 'system'
  | 'assistant'
  | 'user'
  | 'tool_use'
  | 'tool_result'
  | 'result'
  | 'stderr'
  | 'stdout'
  | 'parser';

export type AgentLogLevel = 'info' | 'warn' | 'error';

export interface AgentLogEvent {
  id: string;
  nodeId: string;
  at: number;
  kind: AgentLogKind;
  level: AgentLogLevel;
  title: string;
  summary: string;
  raw?: string;
  status?: 'running' | 'completed' | 'error';
}

export interface ClaudeStreamParserState {
  carry: string;
}

export interface ClaudeResultMeta {
  resultText?: string;
  costUsd?: number;
  numTurns?: number;
  sessionId?: string;
  tokenUsage?: { input: number; output: number };
  isError?: boolean;
  subtype?: string;
  durationMs?: number;
  durationApiMs?: number;
}

export interface ParsedToolUse {
  toolUseId: string;
  toolName: string;
  input?: Record<string, unknown>;
}

export interface ParsedToolResult {
  toolUseId: string;
  isError: boolean;
}

export interface ParsedClaudeStreamMessage {
  type: string;
  subtype?: string;
  raw: string;
  summary: string;
  assistantText?: string;
  assistantTurn: boolean;
  toolUses: ParsedToolUse[];
  toolResults: ParsedToolResult[];
  resultMeta?: ClaudeResultMeta;
}

export interface ParsedClaudeStreamChunk {
  nextState: ClaudeStreamParserState;
  messages: ParsedClaudeStreamMessage[];
  parseErrors: string[];
}
