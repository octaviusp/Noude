import { invoke, Channel } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';

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

export async function pickFolder(): Promise<string | null> {
  const result = await open({ directory: true, multiple: false });
  return typeof result === 'string' ? result : null;
}
