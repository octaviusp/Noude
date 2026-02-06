import { useState, useCallback, useEffect, useRef } from 'react';
import {
  Play,
  Square,
  LayoutGrid,
  Save,
  Upload,
  FolderOpen,
  Plus,
  ChevronDown,
  Sparkles,
  Terminal,
} from 'lucide-react';
import { useFlowStore } from '../store/flowStore';
import { useExecution } from '../hooks/useExecution';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { downloadFlow, loadFlowFromFile } from '../lib/serialization';
import { pickFolder } from '../lib/tauri';
import { Button } from '../components/ui/button';
import { Separator } from '../components/ui/separator';
import type { NodeType } from '../types';

const nodeOptions: { type: NodeType; label: string; icon: typeof Sparkles }[] = [
  { type: 'claude-code', label: 'Claude Code', icon: Sparkles },
  { type: 'bash', label: 'Bash', icon: Terminal },
];

function truncatePath(path: string, maxLen = 36): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  if (parts.length <= 3) return '...' + path.slice(-maxLen);
  return parts[0] + '/.../' + parts.slice(-2).join('/');
}

export function Toolbar() {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const addNode = useFlowStore(s => s.addNode);
  const flowName = useFlowStore(s => s.flowName);
  const setFlowName = useFlowStore(s => s.setFlowName);
  const workingDirectory = useFlowStore(s => s.defaults.workingDirectory);
  const setDefaults = useFlowStore(s => s.setDefaults);
  const { run, stop, isRunning } = useExecution();
  const autoLayout = useAutoLayout();

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  const handleAddNode = useCallback(
    (type: NodeType) => {
      addNode(type);
      setDropdownOpen(false);
    },
    [addNode]
  );

  const handlePickWorkspace = useCallback(async () => {
    const folder = await pickFolder();
    if (folder) {
      setDefaults({ workingDirectory: folder });
    }
  }, [setDefaults]);

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
    <div className="flex items-center gap-1.5 px-3 h-[52px] bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 shrink-0">
      {/* Workspace picker */}
      <Button
        variant="ghost"
        size="sm"
        onClick={handlePickWorkspace}
        title={workingDirectory || 'Set workspace directory'}
        className="max-w-[240px]"
      >
        <FolderOpen className="w-3.5 h-3.5 shrink-0" />
        {workingDirectory ? (
          <span className="truncate font-mono text-[11px]">
            {truncatePath(workingDirectory)}
          </span>
        ) : (
          <span className="text-slate-500 italic">Set Workspace...</span>
        )}
      </Button>

      <Separator />

      {/* Add Node dropdown */}
      <div className="relative" ref={dropdownRef}>
        <Button variant="outline" size="sm" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <Plus className="w-3.5 h-3.5" />
          Add Node
          <ChevronDown className="w-3 h-3 opacity-50" />
        </Button>
        {dropdownOpen && (
          <div className="absolute top-full left-0 mt-1.5 bg-slate-800 border border-slate-700/60 rounded-lg p-1 min-w-[180px] z-50 shadow-xl shadow-black/30">
            {nodeOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-slate-200 rounded-md cursor-pointer bg-transparent border-none hover:bg-slate-700/60 transition-colors"
                  onClick={() => handleAddNode(opt.type)}
                >
                  <Icon className="w-4 h-4 shrink-0 text-slate-400" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Run / Stop */}
      {isRunning ? (
        <Button
          variant="destructive"
          size="sm"
          onClick={stop}
        >
          <Square className="w-3.5 h-3.5" />
          Stop
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={run}
          className="bg-emerald-700/60 border-emerald-600/50 text-emerald-200 hover:bg-emerald-600/70 hover:border-emerald-500/60"
        >
          <Play className="w-3.5 h-3.5" />
          Run
        </Button>
      )}

      <Separator />

      {/* Utility buttons */}
      <Button variant="ghost" size="sm" onClick={autoLayout} title="Auto Layout">
        <LayoutGrid className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleSave} title="Save Flow">
        <Save className="w-3.5 h-3.5" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleLoad} title="Load Flow">
        <Upload className="w-3.5 h-3.5" />
      </Button>

      {/* Flow name - pushed to the right */}
      <input
        className="ml-auto bg-transparent border border-transparent text-sm font-semibold text-slate-200 px-2 py-1 rounded-md w-[180px] text-right hover:border-slate-700/50 focus:border-indigo-500/50 focus:outline-none transition-colors"
        value={flowName}
        onChange={e => setFlowName(e.target.value)}
      />
    </div>
  );
}
