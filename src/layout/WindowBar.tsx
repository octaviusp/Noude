import { Minus, Square, X } from 'lucide-react';

type WindowAction = 'minimize' | 'toggle-maximize' | 'close';

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function runWindowAction(action: WindowAction): Promise<void> {
  if (!isTauriRuntime()) return;

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const appWindow = getCurrentWindow();

  if (action === 'minimize') {
    await appWindow.minimize();
    return;
  }

  if (action === 'toggle-maximize') {
    await appWindow.toggleMaximize();
    return;
  }

  await appWindow.close();
}

export function WindowBar() {
  const canControlWindow = isTauriRuntime();

  const handleWindowAction = (action: WindowAction) => {
    void runWindowAction(action);
  };

  return (
    <header className="noude-window-bar">
      <div className="window-controls" aria-label="Window controls">
        <button
          type="button"
          className="window-control window-control--minimize"
          onClick={() => handleWindowAction('minimize')}
          disabled={!canControlWindow}
          aria-label="Minimize window"
        >
          <Minus className="window-control-icon" />
        </button>
        <button
          type="button"
          className="window-control window-control--maximize"
          onClick={() => handleWindowAction('toggle-maximize')}
          disabled={!canControlWindow}
          aria-label="Toggle maximize"
        >
          <Square className="window-control-icon" />
        </button>
        <button
          type="button"
          className="window-control window-control--close"
          onClick={() => handleWindowAction('close')}
          disabled={!canControlWindow}
          aria-label="Close window"
        >
          <X className="window-control-icon" />
        </button>
      </div>

      <div className="window-drag-zone" data-tauri-drag-region>
        <span className="window-title">Noude.ai</span>
      </div>

      <div className="window-bar-meta" data-tauri-drag-region>
        <span className="window-meta-dot" />
        <span className="window-meta-label">Flow Studio</span>
      </div>
    </header>
  );
}
