interface MainWorkspaceProps {
  children: React.ReactNode;
}

export function MainWorkspace({ children }: MainWorkspaceProps) {
  return (
    <section className="workspace">
      <div className="workspace-content">{children}</div>
    </section>
  );
}
