import { useCallback, useEffect } from 'react';
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
import { useUiStore } from './store/uiStore';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { NodeConfigPanel } from './panels/NodeConfigPanel';
import { OutputPanel } from './panels/OutputPanel';
import { Sidebar } from './layout/Sidebar';
import { AppShell } from './layout/AppShell';
import { MainWorkspace } from './layout/MainWorkspace';

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
      <h2 className="noude-empty-title">Canvas Ready</h2>
      <p className="noude-empty-desc">
        Add your first Claude or Bash step to start composing this flow.
      </p>
      <div className="noude-empty-actions">
        <button
          className="ui-button ui-button--primary ui-button--default"
          onClick={() => addNode('claude-code')}
        >
          New Claude Step
        </button>
        <button
          className="ui-button ui-button--outline ui-button--default"
          onClick={() => addNode('bash')}
        >
          New Bash Step
        </button>
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
  const sidebarMobileOpen = useUiStore(s => s.sidebarMobileOpen);
  const setSidebarMobileOpen = useUiStore(s => s.setSidebarMobileOpen);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarMobileOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [setSidebarMobileOpen]);

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
    <AppShell
      sidebar={<Sidebar />}
      sidebarOpen={sidebarMobileOpen}
      onSidebarClose={() => setSidebarMobileOpen(false)}
    >
      <MainWorkspace onOpenSidebar={() => setSidebarMobileOpen(true)}>
        <div className="workspace-top">
          <div className={['noude-canvas', isEmpty ? 'is-empty' : ''].join(' ').trim()}>
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
                gap={24}
                size={1.4}
                color="rgba(255, 255, 255, 0.08)"
              />
              <Controls />
              {nodes.length > 1 && (
                <MiniMap
                  nodeColor={() => '#6678ff'}
                  maskColor="rgba(14, 14, 19, 0.75)"
                />
              )}
              {isEmpty && <EmptyCanvasState />}
            </ReactFlow>
          </div>
          {selectedNodeId && <NodeConfigPanel />}
        </div>
        <OutputPanel />
      </MainWorkspace>
    </AppShell>
  );
}
