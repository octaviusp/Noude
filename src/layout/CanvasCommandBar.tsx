import {
  Activity,
  FolderOpen,
  LayoutGrid,
  Menu,
  Play,
  Save,
  Search,
  Sparkles,
  Square,
  Terminal,
  Upload,
} from 'lucide-react';
import { useExecution } from '../hooks/useExecution';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { useExecutionStore } from '../store/executionStore';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { downloadFlow, loadFlowFromFile } from '../lib/serialization';
import { pickFolder } from '../lib/tauri';

interface CanvasCommandBarProps {
  onOpenSidebar: () => void;
}

export function CanvasCommandBar({ onOpenSidebar }: CanvasCommandBarProps) {
  const flowName = useFlowStore(s => s.flowName);
  const nodes = useFlowStore(s => s.nodes);
  const edges = useFlowStore(s => s.edges);
  const addNode = useFlowStore(s => s.addNode);
  const workingDirectory = useFlowStore(s => s.defaults.workingDirectory);
  const setDefaults = useFlowStore(s => s.setDefaults);
  const setActionPaletteOpen = useUiStore(s => s.setActionPaletteOpen);
  const outputCollapsed = useUiStore(s => s.outputCollapsed);
  const setOutputCollapsed = useUiStore(s => s.setOutputCollapsed);
  const { run, stop, flowStatus, isRunning } = useExecution();
  const nodeStatuses = useExecutionStore(s => s.nodeStatuses);
  const autoLayout = useAutoLayout();

  const errorCount = Array.from(nodeStatuses.values()).filter(status => status === 'error').length;

  const handlePickWorkspace = async () => {
    const folder = await pickFolder();
    if (folder) {
      setDefaults({ workingDirectory: folder });
    }
  };

  const handleSave = () => {
    const flow = useFlowStore.getState().exportToJson();
    downloadFlow(flow);
  };

  const handleLoad = async () => {
    try {
      const flow = await loadFlowFromFile();
      useFlowStore.getState().importFromJson(JSON.stringify(flow));
    } catch {
      // user cancelled
    }
  };

  return (
    <div className="canvas-command-bar">
      <button
        type="button"
        className="commandbar-icon-btn commandbar-mobile-menu"
        onClick={onOpenSidebar}
        aria-label="Open sidebar"
      >
        <Menu className="w-4 h-4" />
      </button>

      <div className="commandbar-group">
        <div className="commandbar-flow-meta">
          <div className="commandbar-flow-name">{flowName}</div>
          <div className="commandbar-flow-stats">{nodes.length}N · {edges.length}E</div>
        </div>
      </div>

      <div className="commandbar-divider" />

      <div className="commandbar-group">
        <button type="button" className="commandbar-icon-btn" onClick={() => addNode('claude-code')} title="Add Claude node">
          <Sparkles className="commandbar-btn-icon" />
        </button>
        <button type="button" className="commandbar-icon-btn" onClick={() => addNode('bash')} title="Add Bash node">
          <Terminal className="commandbar-btn-icon" />
        </button>
        <button type="button" className="commandbar-icon-btn" onClick={autoLayout} title="Auto layout">
          <LayoutGrid className="commandbar-btn-icon" />
        </button>
      </div>

      <div className="commandbar-divider" />

      <div className="commandbar-group">
        <button type="button" className="commandbar-icon-btn" onClick={handleSave} title="Save flow">
          <Save className="commandbar-btn-icon" />
        </button>
        <button type="button" className="commandbar-icon-btn" onClick={handleLoad} title="Load flow">
          <Upload className="commandbar-btn-icon" />
        </button>
        <button type="button" className="commandbar-icon-btn" onClick={handlePickWorkspace} title={workingDirectory || 'Set workspace'}>
          <FolderOpen className="commandbar-btn-icon" />
        </button>
      </div>

      <div className="commandbar-divider" />

      <div className="commandbar-group">
        <button type="button" className="commandbar-icon-btn" onClick={() => setOutputCollapsed(!outputCollapsed)} title={outputCollapsed ? 'Show logs' : 'Hide logs'}>
          <Activity className="commandbar-btn-icon" />
        </button>
        <button type="button" className="commandbar-icon-btn" onClick={() => setActionPaletteOpen(true)} title="Open command palette (Cmd/Ctrl+K)">
          <Search className="commandbar-btn-icon" />
        </button>
      </div>

      <div className={`commandbar-status-chip is-${flowStatus} ${errorCount > 0 ? 'has-errors' : ''}`.trim()}>
        <span className="commandbar-status-dot" />
        <span>{flowStatus}</span>
        {errorCount > 0 && <span>{errorCount} error{errorCount === 1 ? '' : 's'}</span>}
      </div>

      <button
        type="button"
        className={['commandbar-run-btn', isRunning ? 'is-running' : ''].join(' ').trim()}
        onClick={() => { if (isRunning) { stop(); } else { run(); } }}
      >
        {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        {isRunning ? 'Stop' : 'Run'}
      </button>
    </div>
  );
}
