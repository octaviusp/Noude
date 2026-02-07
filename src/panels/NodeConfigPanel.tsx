import { Sparkles, Terminal, X, Trash2 } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { useExecutionStore } from '../store/executionStore';
import type { AnyNodeData } from '../types';
import { ClaudeCodeConfig } from './ClaudeCodeConfig';
import { BashConfig } from './BashConfig';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';

const nodeIcons: Record<string, typeof Sparkles> = {
  'claude-code': Sparkles,
  bash: Terminal,
};

const nodeAccentClass: Record<string, string> = {
  'claude-code': 'node-accent-claude',
  bash: 'node-accent-bash',
};

const statusBadgeVariant: Record<string, 'default' | 'amber' | 'indigo' | 'green' | 'red' | 'purple' | 'slate' | 'blue'> = {
  idle: 'slate',
  queued: 'amber',
  running: 'blue',
  streaming: 'indigo',
  success: 'green',
  error: 'red',
  cancelled: 'slate',
  skipped: 'slate',
};

interface NodeConfigPanelProps {
  nodeId?: string | null;
  className?: string;
  onClose?: () => void;
}

export function NodeConfigPanel({ nodeId, className, onClose }: NodeConfigPanelProps = {}) {
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const getNode = useFlowStore(s => s.getNode);
  const updateNodeData = useFlowStore(s => s.updateNodeData);
  const removeNode = useFlowStore(s => s.removeNode);
  const selectNode = useFlowStore(s => s.selectNode);
  const getNodeStatus = useExecutionStore(s => s.getNodeStatus);
  const activeNodeId = nodeId ?? selectedNodeId;

  if (!activeNodeId) return null;

  const node = getNode(activeNodeId);
  if (!node) return null;

  const data = node.data as AnyNodeData;
  const onChange = (partial: Partial<AnyNodeData>) => updateNodeData(activeNodeId, partial);
  const Icon = nodeIcons[data.nodeType] || Sparkles;
  const accentClass = nodeAccentClass[data.nodeType] || 'node-accent-default';
  const nodeStatus = getNodeStatus(activeNodeId);
  const statusVariant = statusBadgeVariant[nodeStatus] || 'slate';

  return (
    <aside className={['config-panel', className ?? ''].join(' ').trim()} aria-label="Node configuration panel">
      <div className={`config-panel-header ${accentClass}`}>
        <div className="config-panel-icon">
          <Icon className="w-4 h-4" />
        </div>
        <div className="config-panel-title-wrap">
          <div className="config-panel-title">{data.label}</div>
          <div className="config-panel-subtitle">{data.nodeType.replace('-', ' ')} node</div>
        </div>
        <Badge variant={statusVariant}>{nodeStatus}</Badge>
        <button
          type="button"
          onClick={() => {
            if (onClose) onClose();
            else selectNode(null);
          }}
          className="config-panel-close"
          aria-label="Close node configuration"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="config-panel-body">
        <section className="config-section">
          <button type="button" className="config-section-heading is-static">
            <span>General</span>
          </button>
          <div className="config-section-content">
            <label className="config-field">
              <span className="config-label">Label</span>
              <Input
                value={data.label}
                onChange={e => onChange({ label: e.target.value })}
              />
            </label>
            <div className="config-field">
              <span className="config-label">Node ID</span>
              <code className="config-inline-code">{activeNodeId}</code>
            </div>
          </div>
        </section>

        {data.nodeType === 'claude-code' && (
          <ClaudeCodeConfig data={data} onChange={onChange} />
        )}
        {data.nodeType === 'bash' && (
          <BashConfig data={data} onChange={onChange} />
        )}

        <section className="config-section danger-zone">
          <button type="button" className="config-section-heading is-static">
            <span>Danger Zone</span>
          </button>
          <div className="config-section-content">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                removeNode(activeNodeId);
                if (onClose) onClose();
                else selectNode(null);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Node
            </Button>
          </div>
        </section>
      </div>
    </aside>
  );
}
