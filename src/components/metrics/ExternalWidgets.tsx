// npm widget — Dev.to articles live in the dedicated Blog section.

export function ExternalWidgets() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-faint uppercase tracking-wide">npm downloads</p>
        <p className="mt-1.5 text-sm text-muted">
          No public packages yet — the <span className="font-mono text-accent">MCP servers</span> are the
          distribution channel instead.
        </p>
      </div>
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-faint uppercase tracking-wide">Writing</p>
        <p className="mt-1.5 text-sm text-muted">
          Full articles live in the <a href="#blog" className="text-accent hover:underline">Blog section</a> — deep
          dives on AI memory, agents and RAG.
        </p>
      </div>
    </div>
  );
}
