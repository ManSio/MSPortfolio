import { useMetrics, displayedSource } from '../../hooks/useMetrics';
import { fmt, useUi } from '../../i18n/ui';
import { Card, CardHeader } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { FreshnessBadge, LiveDot, MetricCard } from './MetricCard';
import type { ReactNode } from 'react';

function renderMetricRow(label: ReactNode, value: ReactNode) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-line/50 py-1.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}

const STAR_SPARK = [1, 1, 1, 2, 2, 2, 2, 3, 3, 4, 4, 5, 6];

export function GithubStats() {
  const t = useUi();
  const { status, snapshot, error } = useMetrics();
  // Both the dot and the badge must describe what this visitor is looking at.
  // The committed file's own `source` says how it was produced, not how fresh
  // it is here, so a live-looking snapshot served from disk reads as static.
  const shownSource = displayedSource(status, snapshot?.source);

  if (status === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-surface/60 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
            <Skeleton className="mt-3 h-8 w-full" />
          </div>
        ))}
      </div>
    );
  }

  if (status === 'error' || !snapshot) {
    return (
      <Card className="border-red-500/30">
        <p className="text-sm text-red-400">{error ?? t.metrics.unavailable}</p>
      </Card>
    );
  }

  const { user, repos } = snapshot;
  const totalStars = repos.reduce((s, r) => s + r.stars, 0);
  const totalForks = repos.reduce((s, r) => s + r.forks, 0);
  const langCount = new Set(repos.map((r) => r.language).filter(Boolean)).size;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard label={t.metrics.stars} value={String(totalStars)} spark={STAR_SPARK} tone="accent" hint={t.metrics.acrossRepos} />
      <MetricCard
        label={t.metrics.publicRepos}
        value={String(user?.publicRepos ?? repos.length)}
        hint={fmt(t.metrics.languages, { n: langCount })}
      />
      <MetricCard label={t.metrics.followers} value={String(user?.followers ?? 0)} />
      <MetricCard label={t.metrics.forks} value={String(totalForks)} />
      <Card className="sm:col-span-2 lg:col-span-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LiveDot state={shownSource} />
            <span className="text-sm font-semibold">{t.metrics.activity}</span>
          </div>
          <FreshnessBadge source={shownSource} fetchedAt={snapshot.fetchedAt} />
        </CardHeader>
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {repos.map((r) => (
            <div key={r.name}>
              {renderMetricRow(
                <a href={`https://github.com/ManSio/${r.name}`} target="_blank" rel="noreferrer" className="hover:text-accent">
                  {r.name}
                </a>,
                <span className="flex items-center gap-2">
                  <Badge tone="accent">★ {r.stars}</Badge>
                  <Badge>⑂ {r.forks}</Badge>
                  {r.language ? <span className="text-xs text-faint">{r.language}</span> : null}
                </span>,
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
