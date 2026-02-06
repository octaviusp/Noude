import { Sparkles, Terminal, X, Trash2 } from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import type { AnyNodeData } from '../types';
import { ClaudeCodeConfig } from './ClaudeCodeConfig';
import { BashConfig } from './BashConfig';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const nodeIcons: Record<string, typeof Sparkles> = {
  'claude-code': Sparkles,
  bash: Terminal,
};

const nodeColors: Record<string, string> = {
  'claude-code': 'text-amber-500 bg-amber-500/10',
  bash: 'text-indigo-400 bg-indigo-500/10',
};

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
  const Icon = nodeIcons[data.nodeType] || Sparkles;
  const colorClass = nodeColors[data.nodeType] || 'text-slate-400 bg-slate-500/10';

  return (
    <div className="w-[380px] bg-slate-900 border-l border-slate-700/50 flex flex-col shrink-0 animate-[slideIn_0.2s_ease-out]">
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/50">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-200 truncate">{data.label}</div>
          <div className="text-[11px] text-slate-500 capitalize">{data.nodeType.replace('-', ' ')}</div>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer bg-transparent border-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-4">
          {/* Label */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Label
            </label>
            <Input
              value={data.label}
              onChange={e => onChange({ label: e.target.value })}
            />
          </div>

          {/* Type-specific config */}
          {data.nodeType === 'claude-code' && (
            <ClaudeCodeConfig data={data} onChange={onChange} />
          )}
          {data.nodeType === 'bash' && (
            <BashConfig data={data} onChange={onChange} />
          )}

          {/* Delete */}
          <div className="pt-2 mt-2 border-t border-slate-800">
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => {
                removeNode(selectedNodeId);
                selectNode(null);
              }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete Node
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
