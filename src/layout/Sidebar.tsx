import { useState } from 'react';
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
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { useExecution } from '../hooks/useExecution';
import { useAutoLayout } from '../hooks/useAutoLayout';
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { downloadFlow, loadFlowFromFile } from '../lib/serialization';
import { pickFolder } from '../lib/tauri';
import { Button } from '../components/ui/button';

function truncatePath(path: string, maxLen = 36): string {
  if (path.length <= maxLen) return path;
  const parts = path.split('/');
  if (parts.length <= 3) return `...${path.slice(-maxLen)}`;
  return `${parts[0]}/.../${parts.slice(-2).join('/')}`;
}

export function Sidebar() {
  const [query, setQuery] = useState('');
  const [activeActionId, setActiveActionId] = useState('add-claude');
  const [profileExpanded, setProfileExpanded] = useState(false);
  const flowName = useFlowStore(s => s.flowName);
  const setFlowName = useFlowStore(s => s.setFlowName);
  const addNode = useFlowStore(s => s.addNode);
  const workingDirectory = useFlowStore(s => s.defaults.workingDirectory);
  const setDefaults = useFlowStore(s => s.setDefaults);
  const sidebarCollapsed = useUiStore(s => s.sidebarCollapsed);
  const sidebarMobileOpen = useUiStore(s => s.sidebarMobileOpen);
  const toggleSidebarCollapsed = useUiStore(s => s.toggleSidebarCollapsed);
  const setSidebarMobileOpen = useUiStore(s => s.setSidebarMobileOpen);
  const { run, stop, isRunning } = useExecution();
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

  const filteredActions = actions.filter(action =>
    action.label.toLowerCase().includes(query.toLowerCase())
  );

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
          <button type="button" className="rail-btn" onClick={() => addNode('claude-code')} title="Add Claude node">
            <Sparkles className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={() => addNode('bash')} title="Add Bash node">
            <Terminal className="rail-icon" />
          </button>
          <div className="rail-separator" />
          <button type="button" className="rail-btn" onClick={autoLayout} title="Auto Layout">
            <LayoutGrid className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={handleSave} title="Save flow">
            <Save className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={handleLoad} title="Load flow">
            <Upload className="rail-icon" />
          </button>
          <button type="button" className="rail-btn" onClick={handlePickWorkspace} title={workingDirectory || 'Set workspace'}>
            <FolderOpen className="rail-icon" />
          </button>
          <div className="rail-separator" />
          <button type="button" className="rail-btn" onClick={toggleSidebarCollapsed} title="Expand sidebar">
            <ChevronRight className="rail-icon" />
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            className="rail-avatar"
            onClick={() => setProfileExpanded(prev => !prev)}
          >
            N
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

      <div className="search-container">
        <Search className="search-icon" />
        <input
          className="search-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search actions"
        />
        <div className="search-shortcut" aria-hidden="true">
          <span className="kbd">⌘</span>
          <span className="kbd">K</span>
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
        {filteredActions.map(action => {
          const Icon = action.icon;
          return (
            <button
              type="button"
              key={action.id}
              onClick={() => {
                setActiveActionId(action.id);
                action.onClick();
                closeMobile();
              }}
              className={[
                'nav-item',
                action.id === activeActionId ? 'is-active' : '',
              ].join(' ').trim()}
              title={action.label}
            >
              <Icon className="nav-icon" />
              <span className="nav-label">{action.label}</span>
              {action.count != null && <span className="nav-count">{action.count}</span>}
            </button>
          );
        })}
      </div>

      <div className="promo-card">
        <div className="promo-title">
          <SlidersHorizontal className="promo-icon" />
          Execution
        </div>
        <p className="promo-description">
          Run the pipeline with live streaming output and metrics.
        </p>
        <Button
          variant={isRunning ? 'destructive' : 'primary'}
          size="lg"
          className="promo-button"
          onClick={() => {
            if (isRunning) {
              stop();
            } else {
              run();
            }
            closeMobile();
          }}
        >
          {isRunning ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          {isRunning ? 'Stop Flow' : 'Run Flow'}
        </Button>
      </div>

      <button
        type="button"
        className={['user-profile', profileExpanded ? 'expanded' : ''].join(' ').trim()}
        onClick={() => setProfileExpanded(prev => !prev)}
        aria-expanded={profileExpanded}
      >
        <div className="user-avatar">N</div>
        <div className="user-info">
          <div className="user-name">Noude Studio</div>
          <div className="user-email">visual orchestration</div>
        </div>
        <ChevronRight className="user-expand" />
      </button>
    </aside>
  );
}
