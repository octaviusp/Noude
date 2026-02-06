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

const nodeAccentBorders: Record<string, string> = {
  'claude-code': 'border-l-amber-500/40',
  bash: 'border-l-indigo-400/40',
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
  const accentBorder = nodeAccentBorders[data.nodeType] || 'border-l-slate-500/40';

  return (
    <div className="w-[360px] bg-[#111827] border-l border-[#1e293b] flex flex-col shrink-0 animate-[configSlideIn_0.25s_cubic-bezier(0.16,1,0.3,1)]">
      <style>{`
        @keyframes configSlideIn {
          from { transform: translateX(20px); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>

      {/* Header */}
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-[#1e293b] border-l-2 ${accentBorder}`}>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClass}`}>
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-slate-200 truncate">{data.label}</div>
          <div className="text-[11px] text-slate-500 capitalize">{data.nodeType.replace('-', ' ')} node</div>
        </div>
        <button
          onClick={() => selectNode(null)}
          className="w-7 h-7 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-300 hover:bg-[#1e2d42] transition-all duration-150 cursor-pointer bg-transparent border-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* General section */}
        <div className="px-5 py-4 border-b border-[#1e293b]/60">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-[0.5px] mb-3">
            General
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[12px] font-medium text-slate-400">
              Label
            </label>
            <Input
              value={data.label}
              onChange={e => onChange({ label: e.target.value })}
            />
          </div>
        </div>

        {/* Type-specific config */}
        {data.nodeType === 'claude-code' && (
          <ClaudeCodeConfig data={data} onChange={onChange} />
        )}
        {data.nodeType === 'bash' && (
          <BashConfig data={data} onChange={onChange} />
        )}

        {/* Danger zone */}
        <div className="px-5 py-4 border-t border-[#1e293b]/60">
          <div className="text-[11px] font-semibold text-red-400/60 uppercase tracking-[0.5px] mb-3">
            Danger Zone
          </div>
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
  );
}
