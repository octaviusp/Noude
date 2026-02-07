import ELK from 'elkjs/lib/elk.bundled.js';
import type { Node, Edge } from '@xyflow/react';

const elk = new ELK();

const ELK_OPTIONS = {
  'elk.algorithm': 'layered',
  'elk.direction': 'RIGHT',
  'elk.layered.spacing.nodeNodeBetweenLayers': '120',
  'elk.spacing.nodeNode': '80',
  'elk.layered.nodePlacement.strategy': 'SIMPLE',
};

export async function layoutNodes(
  nodes: Node[],
  edges: Edge[]
): Promise<Node[]> {
  const graph = {
    id: 'root',
    layoutOptions: ELK_OPTIONS,
    children: nodes.map(node => ({
      id: node.id,
      width: 280,
      height: 120,
    })),
    edges: edges.map(edge => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const layout = await elk.layout(graph);

  return nodes.map(node => {
    const layoutNode = layout.children?.find(n => n.id === node.id);
    if (layoutNode) {
      return {
        ...node,
        position: {
          x: layoutNode.x ?? node.position.x,
          y: layoutNode.y ?? node.position.y,
        },
      };
    }
    return node;
  });
}
