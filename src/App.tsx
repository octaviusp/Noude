import { useCallback, useEffect, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type ReactFlowInstance,
  type OnSelectionChangeParams,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useFlowStore } from './store/flowStore';
import { useUiStore } from './store/uiStore';
import { nodeTypes } from './nodes';
import { edgeTypes } from './edges';
import { OutputPanel } from './panels/OutputPanel';
import { NodeContextMenu } from './panels/NodeContextMenu';
import { NodeSettingsSheet } from './panels/NodeSettingsSheet';
import { QuickSettingsPopover } from './panels/QuickSettingsPopover';
import { Sidebar } from './layout/Sidebar';
import { AppShell } from './layout/AppShell';
import { MainWorkspace } from './layout/MainWorkspace';
import { CanvasCommandBar } from './layout/CanvasCommandBar';
import { ActionPalette } from './layout/ActionPalette';

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
  const actionPaletteOpen = useUiStore(s => s.actionPaletteOpen);
  const setActionPaletteOpen = useUiStore(s => s.setActionPaletteOpen);
  const nodeContextMenu = useUiStore(s => s.nodeContextMenu);
  const setNodeContextMenu = useUiStore(s => s.setNodeContextMenu);
  const quickSettings = useUiStore(s => s.quickSettings);
  const setQuickSettings = useUiStore(s => s.setQuickSettings);
  const nodeSettingsSheetNodeId = useUiStore(s => s.nodeSettingsSheetNodeId);
  const setNodeSettingsSheetNodeId = useUiStore(s => s.setNodeSettingsSheetNodeId);
  const outputCollapsed = useUiStore(s => s.outputCollapsed);
  const setOutputCollapsed = useUiStore(s => s.setOutputCollapsed);
  const reactFlowRef = useRef<ReactFlowInstance<any, any> | null>(null);
  const previousNodeCountRef = useRef(nodes.length);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target != null &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setActionPaletteOpen(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === ',' && selectedNodeId) {
        event.preventDefault();
        setNodeSettingsSheetNodeId(selectedNodeId);
        return;
      }

      if (!isTyping && (event.key === 'Enter' || event.key === ' ') && selectedNodeId) {
        event.preventDefault();
        const nodeEl = document.querySelector(`.react-flow__node[data-id="${selectedNodeId}"]`) as HTMLElement | null;
        if (nodeEl) {
          const rect = nodeEl.getBoundingClientRect();
          setQuickSettings({
            nodeId: selectedNodeId,
            x: rect.right + 10,
            y: rect.top + 8,
          });
        }
        return;
      }

      if (event.key === 'Escape') {
        if (nodeContextMenu) {
          setNodeContextMenu(null);
          return;
        }
        if (quickSettings) {
          setQuickSettings(null);
          return;
        }
        if (nodeSettingsSheetNodeId) {
          setNodeSettingsSheetNodeId(null);
          return;
        }
        if (actionPaletteOpen) {
          setActionPaletteOpen(false);
          return;
        }
        if (sidebarMobileOpen) {
          setSidebarMobileOpen(false);
          return;
        }
        if (!outputCollapsed) {
          setOutputCollapsed(true);
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    actionPaletteOpen,
    nodeContextMenu,
    nodeSettingsSheetNodeId,
    outputCollapsed,
    quickSettings,
    selectedNodeId,
    setActionPaletteOpen,
    setNodeContextMenu,
    setNodeSettingsSheetNodeId,
    setOutputCollapsed,
    setQuickSettings,
    setSidebarMobileOpen,
    sidebarMobileOpen,
  ]);

  useEffect(() => {
    const previousNodeCount = previousNodeCountRef.current;

    if (previousNodeCount === 0 && nodes.length === 1 && reactFlowRef.current) {
      window.requestAnimationFrame(() => {
        reactFlowRef.current?.fitView({
          duration: 220,
          padding: 0.24,
          minZoom: 0.55,
          maxZoom: 0.82,
        });
      });
    }

    previousNodeCountRef.current = nodes.length;
  }, [nodes.length]);

  const onSelectionChange = useCallback(
    ({ nodes: selected }: OnSelectionChangeParams) => {
      if (selected.length === 1) {
        selectNode(selected[0].id);
      } else if (selected.length === 0) {
        selectNode(null);
        setNodeContextMenu(null);
      }
    },
    [selectNode, setNodeContextMenu]
  );

  const isEmpty = nodes.length === 0;

  return (
    <AppShell
      sidebar={<Sidebar />}
      sidebarOpen={sidebarMobileOpen}
      onSidebarClose={() => setSidebarMobileOpen(false)}
    >
      <MainWorkspace>
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
              onInit={instance => {
                reactFlowRef.current = instance;
              }}
              onMoveEnd={(_, viewport) => setViewport(viewport)}
              onSelectionChange={onSelectionChange}
              onPaneClick={() => {
                selectNode(null);
                setNodeContextMenu(null);
                setQuickSettings(null);
              }}
              minZoom={0.45}
              maxZoom={1.25}
              fitViewOptions={{
                padding: 0.24,
                minZoom: 0.55,
                maxZoom: 0.82,
              }}
              proOptions={{ hideAttribution: true }}
              defaultEdgeOptions={{ type: 'noude' }}
              colorMode="dark"
            >
              <Background
                variant={BackgroundVariant.Dots}
                gap={28}
                size={1.1}
                color="rgba(255, 255, 255, 0.045)"
              />
              <Controls />
              {nodes.length > 1 && (
                <MiniMap
                  nodeColor={() => 'rgba(91, 111, 255, 0.5)'}
                  maskColor="rgba(14, 14, 19, 0.82)"
                />
              )}
            </ReactFlow>
            {isEmpty && <EmptyCanvasState />}
            <CanvasCommandBar onOpenSidebar={() => setSidebarMobileOpen(true)} />
          </div>
        </div>
        <OutputPanel />
        <NodeContextMenu />
        <QuickSettingsPopover />
        <NodeSettingsSheet />
        <ActionPalette />
      </MainWorkspace>
    </AppShell>
  );
}
