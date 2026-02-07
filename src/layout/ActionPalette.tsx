import { useEffect, useMemo, useState, type ComponentType } from 'react';
import {
  FolderOpen,
  LayoutGrid,
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
import { useFlowStore } from '../store/flowStore';
import { useUiStore } from '../store/uiStore';
import { downloadFlow, loadFlowFromFile } from '../lib/serialization';
import { pickFolder } from '../lib/tauri';

interface ActionItem {
  id: string;
  label: string;
  hint: string;
  run: () => void | Promise<void>;
  icon: ComponentType<{ className?: string }>;
}

export function ActionPalette() {
  const [query, setQuery] = useState('');
  const open = useUiStore(s => s.actionPaletteOpen);
  const setOpen = useUiStore(s => s.setActionPaletteOpen);
  const addNode = useFlowStore(s => s.addNode);
  const setDefaults = useFlowStore(s => s.setDefaults);
  const autoLayout = useAutoLayout();
  const { run, stop, isRunning } = useExecution();

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  const actions: ActionItem[] = [
    {
      id: 'add-claude',
      label: 'Add Claude Node',
      hint: 'Create a Claude Code node on canvas',
      run: () => addNode('claude-code'),
      icon: Sparkles,
    },
    {
      id: 'add-bash',
      label: 'Add Bash Node',
      hint: 'Create a Bash node on canvas',
      run: () => addNode('bash'),
      icon: Terminal,
    },
    {
      id: 'run',
      label: isRunning ? 'Stop Flow' : 'Run Flow',
      hint: isRunning ? 'Cancel current execution' : 'Execute current flow',
      run: () => (isRunning ? stop() : run()),
      icon: isRunning ? Square : Play,
    },
    {
      id: 'auto-layout',
      label: 'Auto Layout',
      hint: 'Arrange nodes automatically',
      run: () => autoLayout(),
      icon: LayoutGrid,
    },
    {
      id: 'save',
      label: 'Save Flow',
      hint: 'Export current flow as JSON',
      run: () => {
        const flow = useFlowStore.getState().exportToJson();
        downloadFlow(flow);
      },
      icon: Save,
    },
    {
      id: 'load',
      label: 'Load Flow',
      hint: 'Import flow from local file',
      run: async () => {
        try {
          const flow = await loadFlowFromFile();
          useFlowStore.getState().importFromJson(JSON.stringify(flow));
        } catch {
          // user cancelled
        }
      },
      icon: Upload,
    },
    {
      id: 'workspace',
      label: 'Set Workspace',
      hint: 'Choose default working directory',
      run: async () => {
        const folder = await pickFolder();
        if (folder) setDefaults({ workingDirectory: folder });
      },
      icon: FolderOpen,
    },
  ];

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return actions;
    return actions.filter(item =>
      item.label.toLowerCase().includes(normalized) ||
      item.hint.toLowerCase().includes(normalized)
    );
  }, [actions, query]);

  return (
    <>
      <button
        type="button"
        className="action-palette-scrim"
        aria-label="Close command palette"
        onClick={() => setOpen(false)}
      />
      <section className="action-palette" aria-label="Command palette">
        <div className="action-palette-search">
          <Search className="action-palette-search-icon" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Type a command..."
            className="action-palette-input"
          />
        </div>

        <div className="action-palette-list">
          {filtered.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                className="action-palette-item"
                onClick={async () => {
                  await item.run();
                  setOpen(false);
                }}
              >
                <Icon className="w-4 h-4" />
                <span className="action-palette-item-label">{item.label}</span>
                <span className="action-palette-item-hint">{item.hint}</span>
              </button>
            );
          })}

          {filtered.length === 0 && (
            <div className="action-palette-empty">No commands found.</div>
          )}
        </div>
      </section>
    </>
  );
}
