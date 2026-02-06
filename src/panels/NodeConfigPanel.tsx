import { useFlowStore } from '../store/flowStore';
import type { AnyNodeData } from '../types';
import { ClaudeCodeConfig } from './ClaudeCodeConfig';
import { BashConfig } from './BashConfig';

export function NodeConfigPanel() {
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const getNode = useFlowStore(s => s.getNode);
  const updateNodeData = useFlowStore(s => s.updateNodeData);
  const removeNode = useFlowStore(s => s.removeNode);
  const selectNode = useFlowStore(s => s.selectNode);

  if (!selectedNodeId) return null;

  const node = getNode(selectedNodeId);
  if (!node) return null;

  const data = node.data as AnyNodeData;
  const onChange = (partial: Partial<AnyNodeData>) => updateNodeData(selectedNodeId, partial);

  return (
    <div className="noude-config-panel">
      <div className="panel-header">
        <h3>{data.label}</h3>
        <button className="panel-close" onClick={() => selectNode(null)}>×</button>
      </div>

      <div className="panel-body">
        <label>
          Label
          <input
            value={data.label}
            onChange={e => onChange({ label: e.target.value })}
          />
        </label>

        {data.nodeType === 'claude-code' && (
          <ClaudeCodeConfig data={data} onChange={onChange} />
        )}
        {data.nodeType === 'bash' && (
          <BashConfig data={data} onChange={onChange} />
        )}

        <button
          onClick={() => {
            removeNode(selectedNodeId);
            selectNode(null);
          }}
          style={{
            marginTop: '8px',
            padding: '8px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--status-error)',
            borderRadius: '6px',
            color: 'var(--status-error)',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          Delete Node
        </button>
      </div>
    </div>
  );
}
