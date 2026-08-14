import { useState } from 'react';
import { cn } from '../../lib/cn';

/**
 * Dependency-free SVG chart primitives for the Lab page.
 * No chart library: the bundle stays ~79KB gzip and the chart code itself
 * is part of the "proof of work" narrative (same approach as <Sparkline/>).
 */

export interface DonutSegment {
  label: string;
  value: number;
  /** CSS color (use semantic tokens or tailwind-safe hexes that work in both themes). */
  color: string;
}

/** Ring/donut chart with a center total. Pure SVG, viewBox-scaled. */
export function Donut({ segments, size = 180, thickness = 26, centerLabel }: { segments: DonutSegment[]; size?: number; thickness?: number; centerLabel?: string }) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  let acc = 0;
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-4">
      <svg viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={centerLabel ?? 'chart'} style={{ width: size, height: size }}>
        {total > 0 &&
          segments.map((seg) => {
            const frac = seg.value / total;
            const dash = frac * c;
            const offset = -acc * c;
            acc += frac;
            const active = hovered === seg.label;
            return (
              <circle
                key={seg.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={active ? thickness + 4 : thickness}
                strokeDasharray={`${dash} ${c - dash}`}
                strokeDashoffset={offset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                opacity={hovered === null || active ? 1 : 0.45}
                style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease', cursor: 'pointer' }}
                onMouseEnter={() => setHovered(seg.label)}
                onMouseLeave={() => setHovered(null)}
              />
            );
          })}
        <text x="50%" y="47%" textAnchor="middle" className="fill-paper" fontSize={size * 0.16} fontWeight={700} fontFamily="var(--font-mono)">
          {hovered ? total : total}
        </text>
        <text x="50%" y="60%" textAnchor="middle" className="fill-faint" fontSize={size * 0.07} fontFamily="var(--font-mono)">
          {centerLabel}
        </text>
      </svg>
      <div className="space-y-1.5">
        {segments.map((seg) => (
          <div
            key={seg.label}
            onMouseEnter={() => setHovered(seg.label)}
            onMouseLeave={() => setHovered(null)}
            className={`flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm transition-colors ${hovered === seg.label ? 'bg-surface-2' : ''}`}
          >
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: seg.color }} />
            <span className="text-muted">{seg.label}</span>
            <span className="ml-auto font-mono tabular-nums text-paper">{seg.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}

/** Horizontal bar list (single value per label) — best for discrete counts. */
export function BarList({ data, color = 'var(--color-accent)' }: { data: BarDatum[]; color?: string }) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2.5">
      {data.map((d) => (
        <div key={d.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate text-muted">{d.label}</span>
            <span className="font-mono tabular-nums text-paper">{d.value}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-surface-2">
            <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${(d.value / max) * 100}%`, background: color }} />
          </div>
          {d.sub ? <p className="mt-0.5 text-xs text-faint">{d.sub}</p> : null}
        </div>
      ))}
    </div>
  );
}

/** Stacked horizontal bar showing one series split into parts. */
export function StackedBar({ parts, className }: { parts: BarDatum[]; className?: string }) {
  const total = parts.reduce((s, p) => s + p.value, 0);
  if (total === 0) return null;
  return (
    <div className={cn('overflow-hidden rounded-full bg-surface-2', className)}>
      <div className="flex h-4">
        {parts.map((p) => (
          <div key={p.label} title={`${p.label}: ${p.value}`} style={{ width: `${(p.value / total) * 100}%`, background: p.color ?? 'var(--color-accent)' }} />
        ))}
      </div>
    </div>
  );
}
