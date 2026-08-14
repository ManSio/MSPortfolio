// npm / Dev.to widgets with graceful empty states (the owner currently has
// no published packages or articles — the widgets explain that honestly
// instead of showing zeros).

export function ExternalWidgets() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-paper/50 uppercase tracking-wide">npm downloads</p>
        <p className="mt-1.5 text-sm text-paper/70">
          No public packages yet — the <span className="font-mono text-accent">MCP servers</span> are the
          distribution channel instead.
        </p>
      </div>
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-paper/50 uppercase tracking-wide">Dev.to articles</p>
        <p className="mt-1.5 text-sm text-paper/70">
          Writing is in progress. Until then, the <span className="text-accent">decision logs</span> on this
          page are the public record of thinking.
        </p>
      </div>
    </div>
  );
}
