import {
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  LayoutGrid,
  Save,
  Sparkles,
  Terminal,
  Upload,
  X,
} from 'lucide-react';
import { useAutoLayout } from '../hooks/useAutoLayout';
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
  const addNode = useFlowStore(s => s.addNode);
  const workingDirectory = useFlowStore(s => s.defaults.workingDirectory);
  const setDefaults = useFlowStore(s => s.setDefaults);
  const sidebarCollapsed = useUiStore(s => s.sidebarCollapsed);
  const sidebarMobileOpen = useUiStore(s => s.sidebarMobileOpen);
  const toggleSidebarCollapsed = useUiStore(s => s.toggleSidebarCollapsed);
  const setSidebarMobileOpen = useUiStore(s => s.setSidebarMobileOpen);
  const autoLayout = useAutoLayout();

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
          <input
            className="sidebar-flow-name"
            value={flowName}
            onChange={e => setFlowName(e.target.value)}
            aria-label="Flow name"
          />

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
    </aside>
  );
}
