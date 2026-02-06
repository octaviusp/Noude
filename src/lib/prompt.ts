import type { MergedInput } from '../types';

export function buildClaudeSystemPrompt(label: string): string {
  return `You are a node named "${label}" in an automated pipeline (Noude.ai).
You are running in fully autonomous mode with all permissions bypassed.
- All tool uses (Read, Write, Edit, Bash, WebSearch, etc.) are auto-approved.
- You can and SHOULD freely create files, run commands, and make changes.
- Do not hesitate or ask for confirmation. Act decisively.
- Use the Task tool to spawn sub-agents for parallel work when beneficial.
- Output CLEAR, STRUCTURED text. Use markdown headers.
- Be CONCISE. No preamble, no apologies, no meta-commentary.
- If upstream context contains errors, acknowledge and work around them.
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
