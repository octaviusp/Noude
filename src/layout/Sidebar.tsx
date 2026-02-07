import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  Play,
  Save,
  Sparkles,
  Square,
  Terminal,
  Upload,
  X,
} from 'lucide-react';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { useExecution } from '../hooks/useExecution';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { downloadFlow, loadFlowFromFile } from '../lib/serialization';
import { pickFolder } from '../lib/tauri';

function truncatePath(path: string, maxLen = 36): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  if (parts.length <= 3) return `...${path.slice(-maxLen)}`;
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`;
}

export function Sidebar() {
  const flowName = useFlowStore(s => s.flowName);
  const setFlowName = useFlowStore(s => s.setFlowName);
  const isDirty = useFlowStore(s => s.isDirty);
  const addNode = useFlowStore(s => s.addNode);
  const defaults = useFlowStore(s => s.defaults);
  const workingDirectory = defaults.workingDirectory;
  const setDefaults = useFlowStore(s => s.setDefaults);
  const sidebarCollapsed = useUiStore(s => s.sidebarCollapsed);
  const sidebarMobileOpen = useUiStore(s => s.sidebarMobileOpen);
  const toggleSidebarCollapsed = useUiStore(s => s.toggleSidebarCollapsed);
  const setSidebarMobileOpen = useUiStore(s => s.setSidebarMobileOpen);
  const autoLayout = useAutoLayout();
  const { run, stop, isRunning } = useExecution();

  const handlePickWorkspace = async () => {
    const folder = await pickFolder();
    if (folder) {
      setDefaults({ workingDirectory: folder });
    }
  };

  const handleSave = () => {
    const flow = useFlowStore.getState().exportToJson();
    downloadFlow(flow);
    useFlowStore.getState().markClean();
  };

  const handleLoad = async () => {
    const state = useFlowStore.getState();
    if (state.isDirty && state.nodes.length > 0) {
      const confirmed = window.confirm('Loading a flow will replace your current unsaved work. Continue?');
      if (!confirmed) return;
    }
    try {
      const flow = await loadFlowFromFile();
      state.importFromJson(JSON.stringify(flow));
      state.markClean();
    } catch {
      // user cancelled
    }
  };

  const actions = [
    {
      id: 'add-claude',
      label: 'Add Claude Node',
      icon: Sparkles,
      onClick: () => addNode('claude-code'),
      count: null,
    },
    {
      id: 'add-bash',
      label: 'Add Bash Node',
      icon: Terminal,
      onClick: () => addNode('bash'),
      count: null,
    },
    {
      id: 'auto-layout',
      label: 'Auto Layout',
      icon: LayoutGrid,
      onClick: autoLayout,
      count: null,
    },
    {
      id: 'save',
      label: 'Save Flow',
      icon: Save,
      onClick: handleSave,
      count: null,
    },
    {
      id: 'load',
      label: 'Load Flow',
      icon: Upload,
      onClick: handleLoad,
      count: null,
    },
  ];

  const closeMobile = () => setSidebarMobileOpen(false);

  if (sidebarCollapsed) {
    return (
      <aside
        className={[
          'app-sidebar',
          'is-collapsed',
          sidebarMobileOpen ? 'is-open' : '',
        ].join(' ').trim()}
        aria-label="Primary navigation"
      >
        <div className="sidebar-rail">
          <div className="rail-logo">N</div>
          <div className="rail-separator" />
          <button type="button" className="rail-btn" onClick={() => addNode('claude-code')} title="Add Claude Node" aria-label="Add Claude Node">
            <Sparkles className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={() => addNode('bash')} title="Add Bash Node" aria-label="Add Bash Node">
            <Terminal className="rail-icon" />
          </button>
          <div className="rail-separator" />
          <button type="button" className="rail-btn" onClick={autoLayout} title="Auto Layout" aria-label="Auto Layout">
            <LayoutGrid className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={handleSave} title="Save Flow" aria-label="Save Flow">
            <Save className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={handleLoad} title="Load Flow" aria-label="Load Flow">
            <Upload className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={handlePickWorkspace} title={workingDirectory || 'Set Workspace'} aria-label="Set Workspace">
            <FolderOpen className="rail-icon" />
          </button>
          <div className="rail-separator" />
          <button
            type="button"
            className={['rail-btn', isRunning ? 'is-running' : ''].join(' ').trim()}
            onClick={() => { if (isRunning) { stop(); } else { run(); } }}
            title={isRunning ? 'Stop Flow' : 'Run Flow'}
            aria-label={isRunning ? 'Stop Flow' : 'Run Flow'}
          >
            {isRunning ? <Square className="rail-icon" /> : <Play className="rail-icon" />}
          </button>
          <div className="rail-separator" />
          <button type="button" className="rail-btn" onClick={toggleSidebarCollapsed} title="Expand Sidebar" aria-label="Expand Sidebar">
            <ChevronRight className="rail-icon" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={[
        'app-sidebar',
        sidebarMobileOpen ? 'is-open' : '',
      ].join(' ').trim()}
      aria-label="Primary navigation"
    >
      <div className="sidebar-header">
        <div className="app-logo">N</div>
        <div className="app-name">Noude</div>
        <div className="header-actions">
          <button
            type="button"
            className="sidebar-icon-btn sidebar-mobile-close"
            onClick={closeMobile}
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="sidebar-icon-btn"
            onClick={toggleSidebarCollapsed}
            aria-label="Collapse sidebar"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="sidebar-flow">
        <div className="section-label">Flow</div>
        <div className="sidebar-flow-fields">
          <div className="sidebar-flow-name-row">
            <input
              className="sidebar-flow-name"
              value={flowName}
              onChange={e => setFlowName(e.target.value)}
              aria-label="Flow name"
            />
            {isDirty && <span className="sidebar-dirty-dot" title="Unsaved changes" />}
          </div>

          <button
            type="button"
            className={[
              'nav-item',
              'is-context',
              !workingDirectory ? 'is-alert' : '',
            ].join(' ').trim()}
            onClick={handlePickWorkspace}
            title={workingDirectory || 'Set workspace directory'}
          >
            <FolderOpen className="nav-icon" />
            <span className="nav-label">
              {workingDirectory ? truncatePath(workingDirectory, 28) : 'Set Workspace'}
            </span>
            {!workingDirectory && <span className="nav-count">!</span>}
          </button>
        </div>
      </div>

      <div className="sidebar-flow">
        <div className="section-label">Settings</div>
        <div className="sidebar-flow-fields">
          <label className="sidebar-setting">
            <span className="sidebar-setting-label">Concurrency</span>
            <input
              type="number"
              className="sidebar-setting-input"
              min={1}
              max={20}
              value={defaults.maxConcurrency}
              onChange={e => setDefaults({ maxConcurrency: Math.max(1, parseInt(e.target.value) || 1) })}
              aria-label="Max concurrency"
            />
          </label>
          <label className="sidebar-setting">
            <span className="sidebar-setting-label">Iteration limit</span>
            <input
              type="number"
              className="sidebar-setting-input"
              min={1}
              max={100}
              value={defaults.globalIterationLimit}
              onChange={e => setDefaults({ globalIterationLimit: Math.max(1, parseInt(e.target.value) || 1) })}
              aria-label="Global iteration limit"
            />
          </label>
          <label className="sidebar-setting">
            <span className="sidebar-setting-label">Stop on error</span>
            <input
              type="checkbox"
              className="sidebar-setting-checkbox"
              checked={defaults.stopOnError}
              onChange={e => setDefaults({ stopOnError: e.target.checked })}
              aria-label="Stop on error"
            />
          </label>
        </div>
      </div>

      <div className="nav-section">
        <div className="section-label">Build</div>
        {actions.map(action => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.id}
              onClick={() => {
                action.onClick();
                closeMobile();
              }}
              className="nav-item"
              title={action.label}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{action.label}</span>
              {action.count != null && <span className="nav-count">{action.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="nav-section">
        <div className="section-label">Execute</div>
        <button
          type="button"
          className={['nav-item', isRunning ? 'is-running' : ''].join(' ').trim()}
          onClick={() => {
            if (isRunning) { stop(); } else { run(); }
            closeMobile();
          }}
          title={isRunning ? 'Stop Flow' : 'Run Flow (⌘Enter)'}
        >
          {isRunning
            ? <Square className="nav-icon" />
            : <Play className="nav-icon" />
          }
          <span className="nav-label">{isRunning ? 'Stop Flow' : 'Run Flow'}</span>
        </button>
      </div>
    </aside>
  );
}
