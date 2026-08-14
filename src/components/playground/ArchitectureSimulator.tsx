import { useMemo, useState } from 'react';
import { ARCHITECTURES, runSimulation, SCENARIOS } from '../../lib/mcp-tools';
import projectsData from '../../data/projects.json';
import type { ProjectsData } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

const projects = (projectsData as ProjectsData).projects;
const PROJECT_IDS = Object.keys(ARCHITECTURES);

function chartPath(points: Array<{ load: number; p95: number }>, width: number, height: number) {
  const maxLoad = Math.max(...points.map((p) => p.load));
  const maxY = Math.max(...points.map((p) => p.p95)) * 1.15;
  const x = (load: number) => (load / maxLoad) * (width - 24) + 12;
  const y = (v: number) => height - 16 - (v / maxY) * (height - 32);
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.load).toFixed(1)},${y(p.p95).toFixed(1)}`).join(' ');
}

export function ArchitectureSimulator() {
  const [projectId, setProjectId] = useState<string>(PROJECT_IDS[0]);
  const [scenario, setScenario] = useState<string>(SCENARIOS[0].id);

  const sim = useMemo(() => {
    const model = ARCHITECTURES[projectId];
    const { points, findings } = runSimulation(model, scenario);
    const def = SCENARIOS.find((s) => s.id === scenario)!;
    const recommendation =
      scenario === 'llm_saturation'
        ? 'Scale the LLM tier horizontally; batch requests with backpressure.'
        : scenario === 'node_loss'
          ? 'Keep ≥2 replicas per parallel group; add a passive standby.'
          : scenario === 'cache_cold'
            ? 'Pre-warm caches on deploy; serve from last-good snapshot while warming.'
            : `Autoscale the ${points[points.length - 1].bottleneck} stage before it saturates.`;
    return { points, findings, def, recommendation };
  }, [projectId, scenario]);

  const project = projects.find((p) => p.id === projectId);
  const [w, h] = [560, 220];

  return (
    <Card className="p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PROJECT_IDS.map((id) => (
            <button
              key={id}
              onClick={() => setProjectId(id)}
              className={`inline-flex min-h-11 items-center rounded-lg border px-3 text-sm transition-colors ${
                id === projectId ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent/40'
              }`}
            >
              {projects.find((p) => p.id === id)?.name ?? id}
            </button>
          ))}
        </div>
        <Badge tone="accent">{sim.def.label}</Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div>
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full rounded-lg border border-line bg-surface-2/40">
            <line x1={12} y1={h - 16} x2={w - 12} y2={h - 16} stroke="var(--color-line)" />
            <line x1={12} y1={16} x2={12} y2={h - 16} stroke="var(--color-line)" />
            <path d={chartPath(sim.points, w, h)} fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" />
            {sim.points.map((p) => (
              <circle key={p.load} cx={chartX(p.load, sim.points, w)} cy={chartY(p.p95, sim.points, h)} r="3.5" fill="var(--color-accent)" />
            ))}
            <text x={w - 40} y={h - 24} fill="var(--color-paper)" opacity="0.5" fontSize="10" fontFamily="var(--font-mono)">
              load (×)
            </text>
            <text x={8} y={12} fill="var(--color-paper)" opacity="0.5" fontSize="10" fontFamily="var(--font-mono)">
              p95 (ms)
            </text>
          </svg>
          <div className="mt-2 flex justify-between font-mono text-[11px] text-faint">
            {sim.points.map((p) => (
              <span key={p.load}>×{p.load}</span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {SCENARIOS.map((s) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`inline-flex min-h-11 items-center rounded-lg border p-3 text-left transition-colors ${
                s.id === scenario ? 'border-accent/60 bg-accent/5' : 'border-line hover:border-accent/40'
              }`}
            >
              <p className="text-sm font-semibold text-paper">{s.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-faint">{s.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-line bg-surface-2/50 p-4">
        <p className="font-mono text-xs text-accent">simulator output</p>
        <ul className="mt-2 space-y-1 text-sm text-muted">
          {sim.findings.map((f, i) => (
            <li key={i}>• {f}</li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-2 text-sm">
          <span className="font-semibold text-emerald-600 dark:text-emerald-400">recommendation:</span>{' '}
          <span className="text-muted">{sim.recommendation}</span>
        </p>
        <p className="mt-2 text-xs text-faint">
          Model: {project?.name} — the same engine the <span className="font-mono">simulate_architecture</span> MCP tool exposes.
        </p>
      </div>
    </Card>
  );
}

function chartX(load: number, points: Array<{ load: number }>, width: number) {
  const max = Math.max(...points.map((p) => p.load));
  return (load / max) * (width - 24) + 12;
}
function chartY(v: number, points: Array<{ p95: number }>, height: number) {
  const max = Math.max(...points.map((p) => p.p95)) * 1.15;
  return height - 16 - (v / max) * (height - 32);
}
