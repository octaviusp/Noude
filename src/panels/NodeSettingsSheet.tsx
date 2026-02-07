import { useUiStore } from '../store/uiStore';
import { NodeConfigPanel } from './NodeConfigPanel';

export function NodeSettingsSheet() {
  const nodeId = useUiStore(s => s.nodeSettingsSheetNodeId);
  const setNodeSettingsSheetNodeId = useUiStore(s => s.setNodeSettingsSheetNodeId);

  if (!nodeId) return null;

  return (
    <>
      <button
        type="button"
        className="node-settings-sheet-scrim"
        aria-label="Close node settings"
        onClick={() => setNodeSettingsSheetNodeId(null)}
      />
      <div className="node-settings-sheet">
        <NodeConfigPanel
          nodeId={nodeId}
          className="node-settings-sheet-panel"
          onClose={() => setNodeSettingsSheetNodeId(null)}
        />
      </div>
    </>
  );
}
