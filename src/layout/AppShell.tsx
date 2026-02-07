interface AppShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  sidebarOpen?: boolean;
  onSidebarClose?: () => void;
}

export function AppShell({
  sidebar,
  children,
  sidebarOpen = false,
  onSidebarClose,
}: AppShellProps) {
  return (
    <div className="noude-shell">
      {sidebar}
      <div className="noude-shell-main">{children}</div>
      {sidebarOpen && (
        <button
          type="button"
          className="noude-sidebar-scrim"
          onClick={onSidebarClose}
          aria-label="Close sidebar"
        />
      )}
    </div>
  );
}
