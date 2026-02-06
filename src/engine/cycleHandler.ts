import type { CycleGroup, NodeOutput } from '../types';

function hashOutput(text: string): string {
  // Simple string hash for convergence detection
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

export function checkConvergence(
  group: CycleGroup,
  previousOutputs: Map<string, string>,
  currentOutputs: Map<string, NodeOutput>
): boolean {
  for (const nodeId of group.nodeIds) {
    const current = currentOutputs.get(nodeId);
    if (!current) return false;

    const currentHash = hashOutput(current.result.text);
    const prevHash = previousOutputs.get(nodeId);

    if (prevHash !== currentHash) return false;
  }
  return true;
}

export function getOutputHashes(
  group: CycleGroup,
  outputs: Map<string, NodeOutput>
): Map<string, string> {
  const hashes = new Map<string, string>();
  for (const nodeId of group.nodeIds) {
    const output = outputs.get(nodeId);
    if (output) {
      hashes.set(nodeId, hashOutput(output.result.text));
    }
  }
  return hashes;
}

export function shouldContinueCycle(group: CycleGroup): boolean {
  return !group.converged && group.currentIteration < group.maxIterations;
}
