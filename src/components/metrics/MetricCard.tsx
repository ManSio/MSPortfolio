import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { Badge } from '../ui/Badge';

export function MetricCard({
  label,
  value,
  unit,
  hint,
  tone,
  spark,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  hint?: string;
  tone?: 'accent' | 'default';
  spark?: number[];
  children?: ReactNode;
}) {
  return (
    <div className="glass-card reveal rounded-xl p-4">
      <p className="text-xs font-medium text-faint uppercase tracking-wide">{label}</p>
      <p className={cn('mt-1.5 font-mono text-2xl font-semibold tabular-nums', tone === 'accent' ? 'text-accent' : 'text-paper')}>
        {value}
        {unit ? <span className="ml-0.5 text-sm text-faint">{unit}</span> : null}
      </p>
      {spark && spark.length > 0 ? <Sparkline data={spark} className="mt-2" /> : null}
      {hint ? (
        <p className="mt-2 text-xs text-faint">
          {hint}
        </p>
      ) : null}
      {children}
    </div>
  );
}

function Sparkline({ data, className }: { data: number[]; className?: string }) {
  const max = Math.max(...data, 1);
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 100}`)
    .join(' ');
  return (
    <div className={cn('h-8 w-full', className)}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full">
        <polyline points={pts} fill="none" stroke="var(--color-accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" opacity={0.85} />
      </svg>
    </div>
  );
}

export function FreshnessBadge({ source, fetchedAt }: { source: 'live' | 'partial' | 'fallback'; fetchedAt: string }) {
  const when = new Date(fetchedAt);
  // The badge reads the snapshot's own field, not the UI status: a visitor who
  // gets the committed file deserves to see what that file claims about itself,
  // and a `partial` must be visibly different from both other states.
  const label =
    source === 'live'
      ? `Live · ${when.toLocaleString()}`
      : source === 'partial'
        ? `Partly live · ${when.toLocaleString()}`
        : `Static snapshot · ${when.toLocaleDateString()}`;
  const tone = source === 'live' ? 'success' : 'warn';
  return <Badge tone={tone}>{label}</Badge>;
}

/**
 * `state` defaults to 'live' so unrelated callers (the agent connection dot)
 * keep the pulsing green. A dot that pulses green above a static snapshot is
 * the same lie as the badge would be, so the caller passes the real state.
 */
export function LiveDot({ state = 'live' }: { state?: 'live' | 'partial' | 'fallback' }) {
  if (state === 'live') {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
      </span>
    );
  }
  return (
    <span className="relative flex h-2 w-2">
      <span className={cn('relative inline-flex h-2 w-2 rounded-full', state === 'partial' ? 'bg-amber-400' : 'bg-slate-400')} />
    </span>
  );
}
