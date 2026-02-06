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
    <div
      className="flex items-center gap-1.5 px-4 h-11 shrink-0 select-none"
      style={{
        background: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-subtle)',
        WebkitAppRegion: 'drag',
      } as React.CSSProperties}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2 mr-1" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <div className="w-5 h-5 rounded-[5px] bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0">
          N
        </div>
      </div>

      <Separator />

      {/* Workspace picker */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
            <span className="italic" style={{ color: 'var(--text-faint)' }}>Set Workspace...</span>
          )}
        </Button>
      </div>

      <Separator />

      {/* Add Node dropdown */}
      <div className="relative" ref={dropdownRef} style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Button variant="outline" size="sm" onClick={() => setDropdownOpen(!dropdownOpen)}>
          <Plus className="w-3.5 h-3.5" />
          Add Node
          <ChevronDown className={`w-3 h-3 opacity-50 transition-transform duration-150 ${dropdownOpen ? 'rotate-180' : ''}`} />
        </Button>
        {dropdownOpen && (
          <div
            className="absolute top-full left-0 mt-1.5 rounded-lg p-1 min-w-[180px] z-50"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {nodeOptions.map(opt => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.type}
                  className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] rounded-md cursor-pointer bg-transparent border-none transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                  onClick={() => handleAddNode(opt.type)}
                >
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <Separator />

      {/* Run / Stop */}
      <div style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
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
            className="bg-emerald-600/80 border-emerald-500/50 text-emerald-50 hover:bg-emerald-500/90 hover:border-emerald-400/60"
          >
            <Play className="w-3.5 h-3.5" />
            Run
          </Button>
        )}
      </div>

      {/* Running status indicator */}
      {isRunning && (
        <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
          <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Running</span>
        </div>
      )}

      <Separator />

      {/* Utility buttons */}
      <div className="flex items-center gap-0.5" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <Button variant="ghost" size="sm" onClick={autoLayout} title="Auto Layout">
          <LayoutGrid className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleSave} title="Save Flow">
          <Save className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={handleLoad} title="Load Flow">
          <Upload className="w-3.5 h-3.5" />
        </Button>
      </div>

      {/* Flow name — pushed to the right */}
      <input
        className="ml-auto bg-transparent border border-transparent text-sm font-semibold px-2 py-1 rounded-md w-[180px] text-right focus:outline-none transition-colors"
        style={{
          color: 'var(--text-primary)',
          WebkitAppRegion: 'no-drag',
        } as React.CSSProperties}
        onFocus={e => { e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.5)'; }}
        onBlur={e => { e.currentTarget.style.borderColor = 'transparent'; }}
        onMouseEnter={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
        onMouseLeave={e => { if (document.activeElement !== e.currentTarget) e.currentTarget.style.borderColor = 'transparent'; }}
        value={flowName}
        onChange={e => setFlowName(e.target.value)}
      />
    </div>
  );
}
