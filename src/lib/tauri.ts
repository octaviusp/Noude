import { invoke, Channel } from '@tauri-apps/api/core';

export interface ProcessEvent {
  type: 'started' | 'stdout' | 'stderr' | 'completed' | 'error' | 'cancelled';
  processId: string;
  pid?: number;
  chunk?: string;
  exitCode?: number | null;
  stdoutFull?: string;
  stderrFull?: string;
  message?: string;
}

export interface ClaudeInvokeArgs {
  prompt: string;
  model?: string;
  outputFormat?: string;
  allowedTools?: string[];
  disallowedTools?: string[];
  appendSystemPrompt?: string;
  maxBudgetUsd?: number;
  permissionMode?: string;
  workingDirectory?: string;
  additionalDirs?: string[];
  continueSession?: boolean;
  jsonSchema?: string;
  timeoutMs?: number;
}

export interface CodexInvokeArgs {
  prompt: string;
  model?: string;
  fullAuto?: boolean;
  sandboxMode?: string;
  jsonOutput?: boolean;
  workingDirectory?: string;
  additionalDirs?: string[];
  outputLastMessage?: string;
  timeoutMs?: number;
}

export interface BashInvokeArgs {
  script: string;
  shell?: string;
  workingDirectory?: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

function createChannel(onEvent: (event: ProcessEvent) => void): Channel<ProcessEvent> {
  const channel = new Channel<ProcessEvent>();
  channel.onmessage = onEvent;
  return channel;
}

export async function invokeClaude(
  args: ClaudeInvokeArgs,
  onEvent: (event: ProcessEvent) => void
): Promise<string> {
  const channel = createChannel(onEvent);
  return invoke<string>('invoke_claude', { args, onEvent: channel });
}

export async function invokeCodex(
  args: CodexInvokeArgs,
  onEvent: (event: ProcessEvent) => void
): Promise<string> {
  const channel = createChannel(onEvent);
  return invoke<string>('invoke_codex', { args, onEvent: channel });
}

export async function invokeBash(
  args: BashInvokeArgs,
  onEvent: (event: ProcessEvent) => void
): Promise<string> {
  const channel = createChannel(onEvent);
  return invoke<string>('invoke_bash', { args, onEvent: channel });
}

export async function cancelProcess(processId: string): Promise<boolean> {
  return invoke<boolean>('cancel_process', { processId });
}

export async function cancelAllProcesses(): Promise<void> {
  return invoke<void>('cancel_all_processes');
}
