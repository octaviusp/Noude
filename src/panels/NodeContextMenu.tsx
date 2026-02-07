import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';

function clampMenuPosition(x: number, y: number) {
  if (typeof window === 'undefined') return { left: x, top: y };
  return {
    left: Math.max(8, Math.min(x, window.innerWidth - 220)),
    top: Math.max(8, Math.min(y, window.innerHeight - 260)),
  };
}

export function NodeContextMenu() {
  const menu = useUiStore(s => s.nodeContextMenu);
  const setNodeContextMenu = useUiStore(s => s.setNodeContextMenu);
  const setQuickSettings = useUiStore(s => s.setQuickSettings);
  const setNodeSettingsSheetNodeId = useUiStore(s => s.setNodeSettingsSheetNodeId);

  const getNode = useFlowStore(s => s.getNode);
  const duplicateNode = useFlowStore(s => s.duplicateNode);
  const removeNode = useFlowStore(s => s.removeNode);
  const selectNode = useFlowStore(s => s.selectNode);
  const getNodeStatus = useExecutionStore(s => s.getNodeStatus);
  const cancelNode = useExecutionStore(s => s.cancelNode);

  if (!menu) return null;

  const node = getNode(menu.nodeId);
  if (!node) return null;

  const status = getNodeStatus(node.id);
  const position = clampMenuPosition(menu.x, menu.y);
  const isRunning = status === 'running' || status === 'streaming';

  return (
    <>
      <button
        type="button"
        className="node-context-scrim"
        aria-label="Close context menu"
        onClick={() => setNodeContextMenu(null)}
      />
      <section
        className="node-context-menu"
        style={{ left: position.left, top: position.top }}
        aria-label="Node context menu"
      >
        <div className="node-context-title">{node.data.label}</div>
        <button
          type="button"
          className="node-context-item"
          onClick={() => {
            setNodeContextMenu(null);
            setQuickSettings({ nodeId: node.id, x: position.left + 10, y: position.top + 10 });
            selectNode(node.id);
          }}
        >
          Quick settings
        </button>
        <button
          type="button"
          className="node-context-item"
          onClick={() => {
            setNodeContextMenu(null);
            setNodeSettingsSheetNodeId(node.id);
            selectNode(node.id);
          }}
        >
          Full settings
        </button>
        {isRunning && (
          <button
            type="button"
            className="node-context-item"
            onClick={async () => {
              await cancelNode(node.id);
              setNodeContextMenu(null);
            }}
          >
            Cancel node
          </button>
        )}
        <button
          type="button"
          className="node-context-item"
          onClick={() => {
            const copyId = duplicateNode(node.id);
            if (copyId) selectNode(copyId);
            setNodeContextMenu(null);
          }}
        >
          Duplicate
        </button>
        <button
          type="button"
          className="node-context-item is-danger"
          onClick={() => {
            removeNode(node.id);
            setNodeContextMenu(null);
          }}
        >
          Delete
        </button>
      </section>
    </>
  );
}
