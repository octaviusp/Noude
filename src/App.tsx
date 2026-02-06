import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from './store/flowStore';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { Toolbar } from './toolbar/Toolbar';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { OutputPanel } from './panels/OutputPanel';

function EmptyCanvasState() {
  const addNode = useFlowStore(s => s.addNode);

  return (
    <div className="noude-empty-state">
      <div className="noude-empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9h4V5" />
          <path d="M17 15h4v4" />
          <path d="M21 9V5h-4" />
          <path d="M7 15H3v4" />
          <path d="M8 12h8" />
          <path d="M12 8v8" />
        </svg>
      </div>
      <h2 className="noude-empty-title">Build your agent pipeline</h2>
      <p className="noude-empty-desc">
        Add Claude Code and Bash nodes, connect them, and run your AI workflow.
      </p>
      <div className="flex items-center justify-center gap-2">
        <button
          className="px-4 py-2 rounded-md text-[13px] font-medium bg-indigo-600 text-white border-none cursor-pointer hover:bg-indigo-500 transition-colors"
          onClick={() => addNode('claude-code')}
        >
          Add Claude Code Node
        </button>
        <button
          className="px-4 py-2 rounded-md text-[13px] font-medium border cursor-pointer transition-colors"
          style={{
            background: 'rgba(30, 41, 59, 0.6)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.9)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'rgba(30, 41, 59, 0.6)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onClick={() => addNode('bash')}
        >
          Add Bash Node
        </button>
      </div>
      <div className="noude-empty-shortcuts">
        Use the toolbar <kbd>Add Node</kbd> button or <kbd>Cmd+Enter</kbd> to run
      </div>
    </div>
  );
}

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

  const isEmpty = nodes.length === 0;

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
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1.2}
              color="rgba(148, 163, 184, 0.08)"
            />
            <Controls />
            <MiniMap
              nodeColor={() => '#2a3a4e'}
              maskColor="rgba(15, 23, 42, 0.75)"
            />
            {isEmpty && <EmptyCanvasState />}
          </ReactFlow>
        </div>
        {selectedNodeId && <NodeConfigPanel />}
      </div>
      <OutputPanel />
    </div>
  );
}
