import type { NodeProps } from '@xyflow/react';
import './nodeStyles.css';

export function SubAgentNode({ data }: NodeProps) {
  const status = (data.status as string) || 'spawning';
  const description = data.description as string | undefined;
  return (
    <div className={`sub-agent-node ${status}`}>
      <div className="sub-agent-header">
        <div className="sub-agent-icon">A</div>
        <div className="sub-agent-name">{data.label as string}</div>
        <div className={`noude-node-status ${status === 'running' ? 'streaming' : status}`} />
      </div>
      {description && (
        <div className="sub-agent-desc">{description.slice(0, 60)}</div>
      )}
    </div>
  );
}
