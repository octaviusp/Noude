import type { MergedInput } from '../types';

export function buildClaudeSystemPrompt(label: string): string {
  return `You are a node named "${label}" in an automated pipeline (Noude.ai).
You are running in non-interactive mode. All tool uses will be automatically approved.
Rules:
- Output CLEAR, STRUCTURED text. Use markdown headers.
- Be CONCISE. No preamble, no apologies, no meta-commentary.
- If upstream context contains errors, acknowledge and work around them.
- Do NOT ask for clarification. Make reasonable assumptions.
- Complete the task in minimum steps.`;
}

export function buildClaudePrompt(userPrompt: string, input: MergedInput): string {
  if (!input.sources.length) return userPrompt;

  if (userPrompt.includes('{{input}}')) {
    return userPrompt.replace(/\{\{input\}\}/g, input.combinedText);
  }

  return `## Context from upstream nodes\n${input.combinedText}\n\n---\n\n${userPrompt}`;
}

export function buildBashScript(
  script: string,
  input: MergedInput
): { script: string; env: Record<string, string> } {
  const escapedText = input.combinedText.replace(/'/g, "'\\''");
  const env: Record<string, string> = {
    NOUDE_INPUT: input.combinedText,
    NOUDE_DATA: JSON.stringify(input.combinedData),
  };

  let finalScript = script;
  if (script.includes('{{input}}')) {
    finalScript = script.replace(/\{\{input\}\}/g, escapedText);
  }

  return { script: finalScript, env };
}
