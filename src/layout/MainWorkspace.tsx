import { Menu, Activity } from 'lucide-react';
import { useExecution } from '../hooks/useExecution';
import { useFlowStore } from '../store/flowStore';

interface MainWorkspaceProps {
  onOpenSidebar: () => void;
  children: React.ReactNode;
}

export function MainWorkspace({ onOpenSidebar, children }: MainWorkspaceProps) {
  const { flowStatus, isRunning } = useExecution();
  const flowName = useFlowStore(s => s.flowName);
  const nodes = useFlowStore(s => s.nodes);
  const edges = useFlowStore(s => s.edges);

  return (
    <section className="workspace">
      <header className="workspace-header">
        <button
          type="button"
          className="workspace-mobile-menu"
          onClick={onOpenSidebar}
          aria-label="Open sidebar"
        >
          <Menu className="w-4 h-4" />
        </button>

        <div className="workspace-header-title">
          <h1 className="workspace-page-title">{flowName}</h1>
          <p className="workspace-page-subtitle">
            {nodes.length} nodes · {edges.length} edges
          </p>
        </div>

        <div className={`workspace-header-status is-${flowStatus}`} aria-live="polite">
          <Activity className={`workspace-status-icon ${isRunning ? 'running' : ''}`} />
          <span>{flowStatus}</span>
        </div>
      </header>

      <div className="workspace-content">{children}</div>
    </section>
  );
}
