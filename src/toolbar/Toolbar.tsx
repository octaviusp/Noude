import { useState, useCallback } from 'react';
import { useFlowStore } from '../store/flowStore';
import { useExecution } from '../hooks/useExecution';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { downloadFlow, loadFlowFromFile } from '../lib/serialization';
import type { NodeType } from '../types';

const nodeOptions: { type: NodeType; label: string; color: string }[] = [
  { type: 'claude-code', label: 'Claude Code', color: '#d97706' },
  { type: 'codex', label: 'Codex', color: '#10b981' },
  { type: 'bash', label: 'Bash', color: '#6366f1' },
];

export function Toolbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const addNode = useFlowStore(s => s.addNode);
  const flowName = useFlowStore(s => s.flowName);
  const setFlowName = useFlowStore(s => s.setFlowName);
  const { run, stop, isRunning } = useExecution();
  const autoLayout = useAutoLayout();

  const handleAddNode = useCallback(
    (type: NodeType) => {
      addNode(type);
      setDropdownOpen(false);
    },
    [addNode]
  );

  const handleSave = useCallback(() => {
    const flow = useFlowStore.getState().exportToJson();
    downloadFlow(flow);
  }, []);

  const handleLoad = useCallback(async () => {
    try {
      const flow = await loadFlowFromFile();
      useFlowStore.getState().importFromJson(JSON.stringify(flow));
    } catch {
      // user cancelled
    }
  }, []);

  return (
    <div className="noude-toolbar">
      <div className="dropdown">
        <button onClick={() => setDropdownOpen(!dropdownOpen)}>+ Add Node</button>
        {dropdownOpen && (
          <div className="dropdown-menu">
            {nodeOptions.map(opt => (
              <button
                key={opt.type}
                className="dropdown-item"
                onClick={() => handleAddNode(opt.type)}
              >
                <div className="dot" style={{ background: opt.color }} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="separator" />

      {isRunning ? (
        <button className="btn-stop" onClick={stop}>
          ■ Stop
        </button>
      ) : (
        <button className="btn-run" onClick={run}>
          ▶ Run
        </button>
      )}

      <div className="separator" />

      <button onClick={autoLayout}>Layout</button>
      <button onClick={handleSave}>Save</button>
      <button onClick={handleLoad}>Load</button>

      <input
        className="flow-name"
        value={flowName}
        onChange={e => setFlowName(e.target.value)}
      />
    </div>
  );
}
