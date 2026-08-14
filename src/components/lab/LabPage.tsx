import experimentsData from '../../data/lab/experiments.json';
import diaryData from '../../data/lab/diary.json';
import knownIssuesData from '../../data/lab/known-issues.json';
import testSuitesData from '../../data/lab/test-suites.json';
import projectsData from '../../data/projects.json';
import type { Experiment, ExperimentVerdict, DiaryEntry, KnownIssue } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card, CardHeader } from '../ui/Card';
import { MetricCard } from '../metrics/MetricCard';
import { BarList, Donut, StackedBar, type DonutSegment } from './charts';

const experiments = (experimentsData as { experiments: Experiment[]; negativeResults: { attempt: string; whyFailed: string; date: string; ref: string }[] }).experiments;
const negativeResults = (experimentsData as { negativeResults: { attempt: string; whyFailed: string; date: string; ref: string }[] }).negativeResults;
const diary = (diaryData as { entries: DiaryEntry[] }).entries;
const issues = (knownIssuesData as { issues: KnownIssue[] }).issues;
const suites = (testSuitesData as { suites: { file: string; name: string; tests: number; covers: string; updatedAt: string }[]; total: number }).suites;
const testTotal = (testSuitesData as { total: number }).total;
const projects = (projectsData as { projects: { id: string; name: string; stack: string[] }[] }).projects;

const VERDICT_COLORS: Record<ExperimentVerdict, string> = {
  confirmed: '#10b981', // emerald-500
  refuted: '#ef4444', // red-500
  partial: '#f59e0b', // amber-500
};
const VERDICT_TONES: Record<ExperimentVerdict, 'success' | 'danger' | 'warn'> = {
  confirmed: 'success',
  refuted: 'danger',
  partial: 'warn',
};
const VERDICT_LABELS: Record<ExperimentVerdict, string> = {
  confirmed: 'confirmed',
  refuted: 'refuted',
  partial: 'partial',
};

function verdictSegments(): DonutSegment[] {
  const counts = { confirmed: 0, refuted: 0, partial: 0 };
  for (const e of experiments) counts[e.verdict]++;
  return [
    { label: 'Confirmed', value: counts.confirmed, color: VERDICT_COLORS.confirmed },
    { label: 'Partial', value: counts.partial, color: VERDICT_COLORS.partial },
    { label: 'Refuted', value: counts.refuted, color: VERDICT_COLORS.refuted },
  ].filter((s) => s.value > 0);
}

function diaryStatus(): DonutSegment[] {
  const fixed = diary.filter((d) => d.status === 'fixed').length;
  const partial = diary.filter((d) => d.status === 'partial').length;
  return [
    { label: 'Fixed', value: fixed, color: '#10b981' },
    { label: 'Partial', value: partial, color: '#f59e0b' },
  ].filter((s) => s.value > 0);
}

function patternCounts() {
  const m = new Map<string, number>();
  for (const d of diary) m.set(d.pattern, (m.get(d.pattern) ?? 0) + 1);
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Project × technology dependency matrix from the same data that feeds get_projects. */
function stackMatrix() {
  const techs = [...new Set(projects.flatMap((p) => p.stack))].sort();
  return { techs, projects };
}

export function LabPage() {
  const { techs, projects: projs } = stackMatrix();
  const status = diaryStatus();

  return (
    <main id="top" className="mx-auto max-w-5xl px-5 pb-16">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-16 pb-10 sm:pt-24">
        <div className="reveal">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">The Laboratory</Badge>
            <Badge>diaries · experiments · tests</Badge>
            <Badge tone="success">real data, rendered from source</Badge>
          </div>
          <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
            The evidence trail behind{' '}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">this portfolio</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            Every claim on the front page is backed by a logged experiment, a diary entry, or a test. This page is the
            machine-readable projection of those logs — the same data the MCP tools{' '}
            <span className="font-mono text-accent">get_experiments</span>, <span className="font-mono text-accent">get_diary</span> and{' '}
            <span className="font-mono text-accent">get_known_issues</span> expose to agents.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Experiments" value={String(experiments.length)} hint="hypothesis → command → verdict" tone="accent" />
            <MetricCard label="Diary entries" value={String(diary.length)} hint="incidents, root causes, guards" />
            <MetricCard label="Known issues" value={String(issues.length)} hint="open debt with temperature" />
            <MetricCard label="Tests" value={String(testTotal)} hint={`${suites.length} suites`} />
          </div>
        </div>
      </section>

      {/* ── Experiments ──────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">01 · experiments</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Hypotheses, commands, verdicts</h2>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <Card>
            <CardHeader>
              <span className="text-sm font-semibold">Verdict distribution</span>
            </CardHeader>
            <Donut segments={verdictSegments()} centerLabel="experiments" />
          </Card>

          <div className="space-y-4">
            {experiments.map((e) => (
              <Card key={e.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-faint">{e.date} · {e.id}</p>
                    <h3 className="mt-0.5 font-semibold text-paper">{e.title}</h3>
                  </div>
                  <Badge tone={VERDICT_TONES[e.verdict]}>{VERDICT_LABELS[e.verdict]}</Badge>
                </div>
                <details className="group mt-3">
                  <summary className="cursor-pointer font-mono text-xs text-accent select-none hover:underline">
                    hypothesis · command · raw result
                  </summary>
                  <div className="mt-3 space-y-3 text-sm">
                    <div>
                      <p className="font-mono text-[11px] text-faint">hypothesis</p>
                      <p className="mt-0.5 leading-relaxed text-muted">{e.hypothesis}</p>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] text-faint">command</p>
                      <pre className="mt-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs leading-relaxed text-paper whitespace-pre-wrap">{e.command}</pre>
                    </div>
                    <div>
                      <p className="font-mono text-[11px] text-faint">raw result</p>
                      <p className="mt-0.5 leading-relaxed text-muted">{e.result}</p>
                    </div>
                    <div className="border-t border-line pt-2">
                      <span className="font-mono text-[11px] text-accent">finding: </span>
                      <span className="text-muted">{e.finding}</span>
                    </div>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Negative results ─────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-amber-600 uppercase dark:text-amber-400">02 · do not repeat</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Negative results</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            Approaches that were tried and failed — recorded so a future agent or the owner never re-runs them.
          </p>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {negativeResults.map((n) => (
            <Card key={n.attempt} className="border-red-500/25 p-5">
              <p className="font-mono text-[11px] text-faint">{n.date} · {n.ref}</p>
              <h3 className="mt-1 text-sm font-semibold text-paper">{n.attempt}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                <span className="text-red-500/90 dark:text-red-400/90">why it failed: </span>
                {n.whyFailed}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Diary ────────────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">03 · the diary</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Incidents, root causes, guards</h2>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <span className="text-sm font-semibold">Status</span>
              </CardHeader>
              <Donut segments={status} centerLabel="entries" />
            </Card>
            <Card>
              <CardHeader>
                <span className="text-sm font-semibold">Patterns</span>
              </CardHeader>
              <BarList data={patternCounts()} />
            </Card>
          </div>

          <div className="space-y-3">
            {[...diary].reverse().map((d) => (
              <Card key={d.date + d.title} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-faint">{d.date}</p>
                    <h3 className="mt-0.5 font-semibold text-paper">{d.title}</h3>
                  </div>
                  <div className="flex gap-1.5">
                    <Badge tone={d.status === 'fixed' ? 'success' : 'warn'}>{d.status}</Badge>
                    <Badge>{d.pattern}</Badge>
                  </div>
                </div>
                <details className="group mt-2">
                  <summary className="cursor-pointer font-mono text-xs text-accent select-none hover:underline">root cause · fix · guard</summary>
                  <div className="mt-3 space-y-2 text-sm">
                    <p className="leading-relaxed text-muted"><span className="text-faint">root cause: </span>{d.rootCause}</p>
                    <p className="leading-relaxed text-muted"><span className="text-faint">fix: </span>{d.fix}</p>
                    <p className="leading-relaxed text-muted"><span className="text-faint">guard: </span>{d.guard}</p>
                  </div>
                </details>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Known issues ─────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">04 · known issues</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Open debt, with temperature</h2>
        </div>
        <div className="mt-8 space-y-3">
          {issues.map((i) => (
            <Card key={i.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-mono text-[11px] text-accent">{i.id}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{i.problem}</p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={i.temperature === 'watching' ? 'warn' : 'default'}>{i.temperature}</Badge>
                  <Badge tone={i.status.includes('Исправлено') ? 'success' : i.status.includes('Фикс в коде') ? 'warn' : 'default'}>{i.status}</Badge>
                </div>
              </div>
              {i.deadline ? <p className="mt-2 font-mono text-xs text-faint">deadline: {i.deadline}</p> : null}
            </Card>
          ))}
        </div>
      </section>

      {/* ── Tests ────────────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">05 · tests</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">The suites behind the claims</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {suites.map((s) => (
            <Card key={s.file} className="flex flex-col p-5">
              <p className="font-mono text-[11px] text-faint">{s.file}</p>
              <h3 className="mt-1 font-semibold text-paper">{s.name}</h3>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-accent">{s.tests}</p>
              <p className="mt-1 text-xs text-faint">tests · {s.updatedAt}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.covers}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Total</span>
              <span className="font-mono text-xl font-bold tabular-nums text-paper">{testTotal}</span>
            </div>
            <StackedBar
              className="mt-2 h-4"
              parts={suites.map((s, idx) => ({ label: s.file, value: s.tests, color: ['var(--color-accent)', 'var(--color-primary)', '#10b981'][idx % 3] }))}
            />
          </Card>
        </div>
      </section>

      {/* ── Dependencies ─────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">06 · dependencies</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Project × technology matrix</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The same single source of truth (<span className="font-mono">src/data/projects.json</span>) that feeds{' '}
            <span className="font-mono">get_projects</span> and <span className="font-mono">analyze_stack</span>.
          </p>
        </div>
        <div className="mt-8 overflow-x-auto rounded-xl border border-line bg-surface/70">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left font-mono text-xs font-medium text-faint">project</th>
                {techs.map((t) => (
                  <th key={t} className="px-2 py-3 text-center font-mono text-[11px] font-medium text-faint">{t}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projs.map((p) => (
                <tr key={p.id} className="border-b border-line/50 last:border-0">
                  <td className="px-4 py-3 font-medium text-paper">{p.name}</td>
                  {techs.map((t) => (
                    <td key={t} className="px-2 py-3 text-center">
                      {p.stack.some((s) => s.toLowerCase() === t.toLowerCase()) ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent" />
                      ) : (
                        <span className="inline-block h-2.5 w-2.5 rounded-full border border-line" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
