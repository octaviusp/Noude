function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

function isMacOS(): boolean {
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('Mac');
}

async function startWindowDrag(): Promise<void> {
  if (!isTauriRuntime()) return;

  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  const appWindow = getCurrentWindow();
  await appWindow.startDragging();
}

export function WindowBar() {
  const canDragWindow = isTauriRuntime();
  const isMac = isMacOS();

  const handleDragMouseDown = (event: React.MouseEvent<HTMLElement>) => {
    if (!canDragWindow) return;
    if (event.button !== 0) return;

    const target = event.target as HTMLElement | null;
    if (target?.closest('button, a, input, textarea, select')) return;

    void startWindowDrag();
  };

  return (
    <header
      className={['noude-window-bar', isMac ? 'is-macos' : '']
        .join(' ')
        .trim()}
      onMouseDown={handleDragMouseDown}
      data-tauri-drag-region
    >
      <div className="window-drag-zone">
        <span className="window-title">Noude</span>
      </div>
    </header>
  );
}
