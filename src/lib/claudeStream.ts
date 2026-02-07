import type {
  ClaudeResultMeta,
  ClaudeStreamParserState,
  ParsedClaudeStreamChunk,
  ParsedClaudeStreamMessage,
  ParsedToolResult,
  ParsedToolUse,
} from '../types';

const MAX_SUMMARY = 220;

function asRecord(value: unknown): Record<string, unknown> | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function asNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function truncate(text: string, max = MAX_SUMMARY): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}…`;
}

function getContentBlocks(message: Record<string, unknown> | undefined): Record<string, unknown>[] {
  if (!message) return [];
  const content = message.content;
  if (!Array.isArray(content)) return [];
  return content.filter((v): v is Record<string, unknown> => !!asRecord(v));
}

function extractTextBlocks(content: Record<string, unknown>[]): string {
  const parts: string[] = [];
  for (const block of content) {
    if (block.type !== 'text') continue;
    const text = asString(block.text);
    if (text) parts.push(text);
  }
  return parts.join('\n').trim();
}

function extractToolUses(content: Record<string, unknown>[]): ParsedToolUse[] {
  const tools: ParsedToolUse[] = [];
  for (const block of content) {
    if (block.type !== 'tool_use') continue;
    const toolUseId = asString(block.id);
    const toolName = asString(block.name);
    if (!toolUseId || !toolName) continue;
    tools.push({
      toolUseId,
      toolName,
      input: asRecord(block.input),
    });
  }
  return tools;
}

function extractToolResults(content: Record<string, unknown>[]): ParsedToolResult[] {
  const results: ParsedToolResult[] = [];
  for (const block of content) {
    if (block.type !== 'tool_result') continue;
    const toolUseId = asString(block.tool_use_id);
    if (!toolUseId) continue;
    results.push({
      toolUseId,
      isError: block.is_error === true,
    });
  }
  return results;
}

export function createClaudeStreamParserState(): ClaudeStreamParserState {
  return { carry: '' };
}

export function extractClaudeResultMeta(obj: Record<string, unknown>): ClaudeResultMeta {
  const usage = asRecord(obj.usage);
  const inputTokens = asNumber(usage?.input_tokens);
  const outputTokens = asNumber(usage?.output_tokens);

  return {
    resultText: asString(obj.result),
    costUsd: asNumber(obj.total_cost_usd),
    numTurns: asNumber(obj.num_turns),
    sessionId: asString(obj.session_id),
    tokenUsage: inputTokens != null && outputTokens != null
      ? { input: inputTokens, output: outputTokens }
      : undefined,
    isError: obj.is_error === true,
    subtype: asString(obj.subtype),
    durationMs: asNumber(obj.duration_ms),
    durationApiMs: asNumber(obj.duration_api_ms),
  };
}

function summarizeMessage(type: string, text: string, tools: ParsedToolUse[], results: ParsedToolResult[]): string {
  if (type === 'assistant') {
    if (text) return text;
    if (tools.length > 0) return `Assistant invoked ${tools.length} tool${tools.length > 1 ? 's' : ''}`;
    return 'Assistant message';
  }
  if (type === 'user') {
    if (results.length > 0) return `Tool returned ${results.length} result${results.length > 1 ? 's' : ''}`;
    return text ? truncate(text) : 'User message';
  }
  if (type === 'system') {
    return text ? truncate(text) : 'System event';
  }
  if (type === 'result') {
    return text || 'Final result';
  }
  return text ? truncate(text) : `Stream event: ${type}`;
}

function summarizeSystemMessage(obj: Record<string, unknown>): string {
  const subtype = asString(obj.subtype);
  if (subtype === 'init') {
    const cwd = asString(obj.cwd);
    const model = asString(obj.model);
    const sessionId = asString(obj.session_id);
    const tools = Array.isArray(obj.tools) ? obj.tools.length : undefined;

    const parts = [
      'Session initialized',
      model ? `model=${model}` : undefined,
      cwd ? `cwd=${cwd}` : undefined,
      sessionId ? `session=${sessionId.slice(0, 8)}` : undefined,
      tools != null ? `tools=${tools}` : undefined,
    ].filter(Boolean);

    return parts.join(' | ');
  }

  if (subtype) return `System event: ${subtype}`;
  return 'System event';
}

function parseMessageObject(rawLine: string, obj: Record<string, unknown>): ParsedClaudeStreamMessage {
  const type = asString(obj.type) ?? 'unknown';
  const message = asRecord(obj.message);
  const content = getContentBlocks(message);

  const assistantText = extractTextBlocks(content);
  const resultText = asString(obj.result);
  const toolUses = extractToolUses(content);
  const contentToolResults = extractToolResults(content);

  const topLevelToolResults: ParsedToolResult[] = type === 'tool_result' && asString(obj.tool_use_id)
    ? [{ toolUseId: asString(obj.tool_use_id) as string, isError: obj.is_error === true }]
    : [];

  const toolResults = [...contentToolResults, ...topLevelToolResults];
  const hasPartialSubtype = (asString(obj.subtype) ?? '').toLowerCase().includes('partial');
  const systemSummary = type === 'system' ? summarizeSystemMessage(obj) : '';
  const messageSummary = summarizeMessage(type, resultText ?? assistantText, toolUses, toolResults);

  return {
    type,
    subtype: asString(obj.subtype),
    raw: rawLine,
    summary: type === 'system' ? systemSummary : messageSummary,
    assistantText: assistantText || undefined,
    assistantTurn: type === 'assistant' && !hasPartialSubtype,
    toolUses,
    toolResults,
    resultMeta: type === 'result' ? extractClaudeResultMeta(obj) : undefined,
  };
}

export function parseClaudeStreamChunk(
  parserState: ClaudeStreamParserState,
  chunk: string,
): ParsedClaudeStreamChunk {
  const text = `${parserState.carry}${chunk}`;
  const lines = text.split('\n');
  const carry = lines.pop() ?? '';

  const messages: ParsedClaudeStreamMessage[] = [];
  const parseErrors: string[] = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    try {
      const json = JSON.parse(line) as unknown;
      const obj = asRecord(json);
      if (!obj) {
        parseErrors.push(`Non-object stream payload: ${truncate(line, 120)}`);
        continue;
      }
      messages.push(parseMessageObject(line, obj));
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      parseErrors.push(`JSON parse error: ${msg}. line=${truncate(line, 120)}`);
    }
  }

  return {
    nextState: { carry },
    messages,
    parseErrors,
  };
}

export function parseClaudeJsonResult(stdout: string): ClaudeResultMeta | undefined {
  const text = stdout.trim();
  if (!text) return undefined;

  try {
    const obj = asRecord(JSON.parse(text));
    if (!obj || asString(obj.type) !== 'result') return undefined;
    return extractClaudeResultMeta(obj);
  } catch {
    return undefined;
  }
}

export function parseClaudeStreamResult(stdout: string): ClaudeResultMeta | undefined {
  const lines = stdout.split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const obj = asRecord(JSON.parse(line));
      if (!obj || asString(obj.type) !== 'result') continue;
      return extractClaudeResultMeta(obj);
    } catch {
      continue;
    }
  }

  return undefined;
}
