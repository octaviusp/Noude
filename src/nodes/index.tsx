import type { NodeProps } from '@xyflow/react';
import type { AnyNodeData } from '../types';
import { ClaudeCodeNode } from './ClaudeCodeNode';
import { BashNode } from './BashNode';
import { SubAgentNode } from './SubAgentNode';

function NoudeNode(props: NodeProps) {
  const data = props.data as AnyNodeData;
  switch (data.nodeType) {
    case 'bash':
      return <BashNode {...props} />;
    case 'claude-code':
    default:
      return <ClaudeCodeNode {...props} />;
  }
}

export const nodeTypes = {
  noude: NoudeNode,
  'sub-agent': SubAgentNode,
};
