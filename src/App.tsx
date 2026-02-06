import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from './store/flowStore';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { Toolbar } from './toolbar/Toolbar';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { OutputPanel } from './panels/OutputPanel';

export default function App() {
  const nodes = useFlowStore(s => s.nodes);
  const edges = useFlowStore(s => s.edges);
  const onNodesChange = useFlowStore(s => s.onNodesChange);
  const onEdgesChange = useFlowStore(s => s.onEdgesChange);
  const onConnect = useFlowStore(s => s.onConnect);
  const setViewport = useFlowStore(s => s.setViewport);
  const selectNode = useFlowStore(s => s.selectNode);
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      if (selected.length === 1) {
        selectNode(selected[0].id);
      } else if (selected.length === 0) {
        selectNode(null);
      }
    },
    [selectNode]
  );

  return (
    <div className="noude-app">
      <Toolbar />
      <div className="noude-main">
        <div className="noude-canvas">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onMoveEnd={(_, viewport) => setViewport(viewport)}
            onSelectionChange={onSelectionChange}
            onPaneClick={() => selectNode(null)}
            fitView
            proOptions={{ hideAttribution: true }}
            defaultEdgeOptions={{ type: 'noude' }}
            colorMode="dark"
          >
            <Background gap={20} size={1} />
            <Controls />
            <MiniMap
              nodeColor={() => '#334155'}
              maskColor="rgba(15, 23, 42, 0.7)"
            />
          </ReactFlow>
        </div>
        {selectedNodeId && <NodeConfigPanel />}
      </div>
      <OutputPanel />
    </div>
  );
}
