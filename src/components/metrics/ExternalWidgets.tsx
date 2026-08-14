import { useMetrics } from '../../hooks/useMetrics';
import { Skeleton } from '../ui/Skeleton';
import { Badge } from '../ui/Badge';

// npm widget (no published packages yet) + Dev.to articles (live).
export function ExternalWidgets() {
  const { status, snapshot } = useMetrics();

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="reveal rounded-xl border border-dashed border-line p-5">
        <p className="text-xs font-medium text-faint uppercase tracking-wide">npm downloads</p>
        <p className="mt-1.5 text-sm text-muted">
          No public packages yet — the <span className="font-mono text-accent">MCP servers</span> are the
          distribution channel instead.
        </p>
      </div>

      <div className="reveal rounded-xl border border-line bg-surface/60 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium text-faint uppercase tracking-wide">Dev.to articles</p>
          <a
            href="https://dev.to/mansio"
            target="_blank"
            rel="noreferrer"
            className="text-xs text-accent hover:underline"
          >
            dev.to/mansio ↗
          </a>
        </div>
        {status === 'loading' ? (
          <div className="mt-3 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {(snapshot?.devto ?? []).map((a) => (
              <li key={a.url}>
                <a href={a.url} target="_blank" rel="noreferrer" className="group block">
                  <span className="text-sm text-paper transition-colors group-hover:text-accent">{a.title}</span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <Badge>~{a.readingTimeMinutes} min</Badge>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
