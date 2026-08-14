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

export interface LinePoint {
  x: number;
  y: number;
}

export interface LineSeries {
  label: string;
  color: string;
  points: LinePoint[];
}

/** Multi-series SVG line chart with axes, grid, points and a hover legend. */
export function LineChart({
  series,
  width = 560,
  height = 220,
  xLabel = 'load (×)',
  yLabel = 'latency (ms)',
  yPad = 1.15,
}: {
  series: LineSeries[];
  width?: number;
  height?: number;
  xLabel?: string;
  yLabel?: string;
  yPad?: number;
}) {
  const [hovered, setHovered] = useState<string | null>(null);
  const allPoints = series.flatMap((s) => s.points);
  const maxX = Math.max(...allPoints.map((p) => p.x), 1);
  const maxY = Math.max(...allPoints.map((p) => p.y), 1) * yPad;
  const padL = 44;
  const padR = 14;
  const padT = 14;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;
  const x = (v: number) => padL + (v / maxX) * innerW;
  const y = (v: number) => padT + innerH - (v / maxY) * innerH;

  const path = (pts: LinePoint[]) =>
    pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.x).toFixed(1)},${y(p.y).toFixed(1)}`).join(' ');

  // 5 horizontal grid lines with tick labels
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const v = (maxY / 4) * i;
    return { v, y: y(v) };
  });
  const xTicks = [...new Set(allPoints.map((p) => p.x))].sort((a, b) => a - b);

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full rounded-lg border border-line bg-surface-2/40" role="img" aria-label={`${yLabel} vs ${xLabel}`}>
        {/* grid + y labels */}
        {gridLines.map((g, i) => (
          <g key={i}>
            <line x1={padL} y1={g.y} x2={width - padR} y2={g.y} stroke="var(--color-line)" strokeDasharray="3 4" opacity="0.6" />
            <text x={padL - 6} y={g.y + 3} textAnchor="end" className="fill-faint" fontSize="9" fontFamily="var(--font-mono)">
              {Math.round(g.v)}
            </text>
          </g>
        ))}
        {/* axes */}
        <line x1={padL} y1={padT} x2={padL} y2={height - padB} stroke="var(--color-line)" />
        <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="var(--color-line)" />
        {/* series */}
        {series.map((s) => (
          <g key={s.label}>
            <path
              d={path(s.points)}
              fill="none"
              stroke={s.color}
              strokeWidth={hovered === s.label ? 3 : 2}
              strokeLinecap="round"
              opacity={hovered === null || hovered === s.label ? 1 : 0.3}
              style={{ transition: 'stroke-width 0.2s ease, opacity 0.2s ease' }}
            />
            {s.points.map((p, i) => (
              <circle key={i} cx={x(p.x)} cy={y(p.y)} r="3" fill={s.color} opacity={hovered === null || hovered === s.label ? 1 : 0.3}>
                <title>{`${s.label}: ${p.y.toFixed(0)}ms at ${p.x}×`}</title>
              </circle>
            ))}
          </g>
        ))}
        {/* x ticks */}
        {xTicks.map((t) => (
          <text key={t} x={x(t)} y={height - padB + 14} textAnchor="middle" className="fill-faint" fontSize="9" fontFamily="var(--font-mono)">
            ×{t}
          </text>
        ))}
        <text x={width - padR} y={height - 6} textAnchor="end" className="fill-paper" opacity="0.5" fontSize="10" fontFamily="var(--font-mono)">
          {xLabel}
        </text>
        <text x={10} y={padT - 2} className="fill-paper" opacity="0.5" fontSize="10" fontFamily="var(--font-mono)">
          {yLabel}
        </text>
      </svg>
      {/* hover legend */}
      <div className="mt-2 flex flex-wrap gap-3">
        {series.map((s) => (
          <button
            key={s.label}
            onMouseEnter={() => setHovered(s.label)}
            onMouseLeave={() => setHovered(null)}
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 font-mono text-[11px] transition-colors ${
              hovered === s.label ? 'bg-surface-2 text-paper' : 'text-faint'
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
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
