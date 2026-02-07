import { useEffect, useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Settings2 } from 'lucide-react';
import type { AnyNodeData } from '../types';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import '../nodes/nodeStyles.css';

interface BaseNodeProps {
  id: string;
  data: AnyNodeData;
  selected?: boolean;
  icon: string;
  children?: React.ReactNode;
}

export function BaseNode({ id, data, selected, icon, children }: BaseNodeProps) {
  const status = useExecutionStore(s => s.getNodeStatus(id));
  const output = useExecutionStore(s => s.getNodeOutput(id));
  const selectNode = useFlowStore(s => s.selectNode);
  const updateNodeData = useFlowStore(s => s.updateNodeData);
  const setNodeContextMenu = useUiStore(s => s.setNodeContextMenu);
  const setQuickSettings = useUiStore(s => s.setQuickSettings);
  const isActive = status === 'running' || status === 'streaming';
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);

  useEffect(() => {
    if (!isEditingLabel) {
      setDraftLabel(data.label);
    }
  }, [data.label, isEditingLabel]);

  const startLabelEdit = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setDraftLabel(data.label);
    setIsEditingLabel(true);
  };

  const commitLabel = () => {
    const next = draftLabel.trim();
    if (next && next !== data.label) {
      updateNodeData(id, { label: next });
    } else {
      setDraftLabel(data.label);
    }
    setIsEditingLabel(false);
  };

  const cancelLabelEdit = () => {
    setDraftLabel(data.label);
    setIsEditingLabel(false);
  };

  const onLabelKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitLabel();
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      cancelLabelEdit();
    }
  };

  const openQuickSettings = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    selectNode(id);
    setNodeContextMenu(null);
    setQuickSettings({
      nodeId: id,
      x: event.clientX + 10,
      y: event.clientY + 10,
    });
  };

  const openContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    selectNode(id);
    setQuickSettings(null);
    setNodeContextMenu({
      nodeId: id,
      x: event.clientX,
      y: event.clientY,
    });
  };

  return (
    <div
      className={`noude-node type-${data.nodeType} ${selected ? 'selected' : ''} ${isActive ? 'executing' : ''} ${data.enabled ? '' : 'is-disabled'}`}
      onClick={() => selectNode(id)}
      onContextMenu={openContextMenu}
    >
      <Handle type="target" position={Position.Left} id="in" className="noude-handle" />

      <div className="noude-node-header">
        <div className="noude-node-icon">{icon}</div>
        <div className="noude-node-title-wrap">
          {isEditingLabel ? (
            <input
              value={draftLabel}
              onChange={event => setDraftLabel(event.target.value)}
              onBlur={commitLabel}
              onKeyDown={onLabelKeyDown}
              onMouseDown={event => event.stopPropagation()}
              onClick={event => event.stopPropagation()}
              className="noude-node-label-input nodrag nopan"
              aria-label="Edit node name"
              autoFocus
            />
          ) : (
            <button
              type="button"
              className="noude-node-label noude-node-label-button nodrag nopan"
              onDoubleClick={startLabelEdit}
              title="Double-click to rename"
            >
              {data.label}
            </button>
          )}
        </div>
        <div className="noude-node-header-actions">
          <button
            type="button"
            className="noude-node-settings-btn nodrag nopan"
            onClick={openQuickSettings}
            aria-label="Open quick settings"
            title="Quick settings"
          >
            <Settings2 className="w-3 h-3" />
          </button>
          <div className={`noude-node-status ${status}`} />
        </div>
      </div>

      <div className="noude-node-body">
        {children}
        {status === 'streaming' && (
          <div className="noude-node-streaming">
            <div className="dot" />
            <div className="dot" />
            <div className="dot" />
          </div>
        )}
        {output && output.meta.durationMs > 0 && (
          <div className="noude-node-duration">
            {(output.meta.durationMs / 1000).toFixed(1)}s
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} id="out" className="noude-handle" />
    </div>
  );
}
