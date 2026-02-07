import type { Edge } from '@xyflow/react';
import type { NodeOutput, MergedInput, NoudeEdgeData } from '../types';

export function mergeInputs(
  targetNodeId: string,
  edges: Edge[],
  outputs: Map<string, NodeOutput>,
  nodeLabels: Map<string, string>
): MergedInput {
  const incomingEdges = edges
    .filter(e => e.target === targetNodeId)
    .sort((a, b) => {
      const pa = (a.data as NoudeEdgeData | undefined)?.priority ?? 0;
      const pb = (b.data as NoudeEdgeData | undefined)?.priority ?? 0;
      return pa - pb;
    });

  const sources: NodeOutput[] = [];
  const textParts: string[] = [];
  const combinedData: Record<string, unknown> = {};
  let hasErrors = false;

  for (const edge of incomingEdges) {
    const output = outputs.get(edge.source);
    if (!output) continue;

    sources.push(output);

    if (output.status === 'error') hasErrors = true;

    const label = nodeLabels.get(edge.source) || output.nodeLabel;
    textParts.push(`--- Output from ${label} (${output.nodeType}) ---\n${output.result.text}`);

    if (output.result.data) {
      combinedData[edge.source] = output.result.data;
    }
  }

  return {
    sources,
    combinedText: textParts.join('\n\n'),
    combinedData,
    hasErrors,
  };
}
