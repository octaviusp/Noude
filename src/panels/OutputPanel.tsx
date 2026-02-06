import { useEffect, useRef } from 'react';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';

export function OutputPanel() {
  const selectedNodeId = useFlowStore(s => s.selectedNodeId);
  const flowStatus = useExecutionStore(s => s.flowStatus);
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Find the node to display: selected, or first running/streaming node
  let displayNodeId = selectedNodeId;
  if (!displayNodeId) {
    for (const [id, status] of nodeStatuses) {
      if (status === 'streaming' || status === 'running') {
        displayNodeId = id;
        break;
      }
    }
  }

  const streaming = useExecutionStore(s => displayNodeId ? s.getNodeStreaming(displayNodeId) : '');
  const output = useExecutionStore(s => displayNodeId ? s.getNodeOutput(displayNodeId) : undefined);
  const label = displayNodeId ? useFlowStore.getState().getNodeLabel(displayNodeId) : null;
  const logs = useExecutionStore(s => s.logs);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [streaming, logs]);

  return (
    <div className="noude-output-panel">
      <div className="output-header">
        <span>
          OUTPUT
          {label && ` — ${label}`}
          {flowStatus !== 'idle' && ` [${flowStatus}]`}
        </span>
      </div>
      <div className="output-body" ref={bodyRef}>
        {streaming ? (
          <span className="stdout">{streaming}</span>
        ) : output?.result.text ? (
          <span className="stdout">{output.result.text}</span>
        ) : logs.length > 0 ? (
          <span className="stdout">{logs.join('\n')}</span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>
            {flowStatus === 'idle' ? 'Run a flow to see output here...' : 'Waiting for output...'}
          </span>
        )}
        {output?.error && (
          <span className="stderr">
            {'\n'}Error: {output.error.message}
            {output.error.stderr && `\n${output.error.stderr}`}
          </span>
        )}
      </div>
    </div>
  );
}
