import { useEffect, useMemo, useState } from 'react';
import experimentsData from '../../data/lab/experiments.json';
import diaryData from '../../data/lab/diary.json';
import knownIssuesData from '../../data/lab/known-issues.json';
import testSuitesData from '../../data/lab/test-suites.json';
import projectsData from '../../data/projects.json';
import { loadFallbackSnapshot } from '../../lib/api';
import { ARCHITECTURES, runSimulation, SCENARIOS } from '../../lib/mcp-tools';
import type { Experiment, ExperimentVerdict, DiaryEntry, KnownIssue, Project, CommitEntry, LabChart, LabBarDatum, LabDonutSegment, LabLineSeries } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card, CardHeader } from '../ui/Card';
import { MetricCard } from '../metrics/MetricCard';
import { BarList, Donut, LineChart, StackedBar, type BarDatum, type DonutSegment, type LineSeries } from './charts';

const experiments = (experimentsData as { experiments: Experiment[]; negativeResults: { attempt: string; whyFailed: string; date: string; ref: string }[] }).experiments;
const negativeResults = (experimentsData as { negativeResults: { attempt: string; whyFailed: string; date: string; ref: string }[] }).negativeResults;
const diary = (diaryData as { entries: DiaryEntry[] }).entries;
const issues = (knownIssuesData as { issues: KnownIssue[] }).issues;
const suites = (testSuitesData as { suites: { file: string; name: string; tests: number; covers: string; updatedAt: string }[]; total: number }).suites;
const testTotal = (testSuitesData as { total: number }).total;
const projects = (projectsData as ProjectsShape).projects;

interface ProjectsShape {
  projects: Project[];
}

const ALL = 'all';

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

function projectName(id: string): string {
  return projects.find((p) => p.id === id)?.name ?? id;
}

/** GitHub repo name for a project (project.repo = 'Owner/name'). */
function repoName(p: Project): string {
  return p.repo.split('/')[1] ?? p.repo;
}

function verdictSegments(list: Experiment[]): DonutSegment[] {
  const counts = { confirmed: 0, refuted: 0, partial: 0 };
  for (const e of list) counts[e.verdict]++;
  return [
    { label: 'Confirmed', value: counts.confirmed, color: VERDICT_COLORS.confirmed },
    { label: 'Partial', value: counts.partial, color: VERDICT_COLORS.partial },
    { label: 'Refuted', value: counts.refuted, color: VERDICT_COLORS.refuted },
  ].filter((s) => s.value > 0);
}

function diaryStatus(list: DiaryEntry[]): DonutSegment[] {
  const fixed = list.filter((d) => d.status === 'fixed').length;
  const partial = list.filter((d) => d.status === 'partial').length;
  return [
    { label: 'Fixed', value: fixed, color: '#10b981' },
    { label: 'Partial', value: partial, color: '#f59e0b' },
  ].filter((s) => s.value > 0);
}

/** Per-experiment chart renderer: the JSON drives the same SVG primitives as the rest of the page. */
function renderLabChart(c: LabChart) {
  switch (c.type) {
    case 'bar':
      return <BarList data={c.data as LabBarDatum[]} />;
    case 'donut':
      return <Donut segments={c.data as LabDonutSegment[]} centerLabel={c.title} />;
    case 'line':
      return <LineChart series={c.data as LabLineSeries[]} xLabel={c.xLabel} yLabel={c.yLabel} />;
    case 'stacked':
      return <StackedBar parts={c.data as BarDatum[]} />;
  }
}

function ExperimentChart({ chart }: { chart?: LabChart | LabChart[] }) {
  if (!chart) return null;
  const charts = Array.isArray(chart) ? chart : [chart];
  return (
    <div className="mt-4 grid gap-4 border-t border-line pt-3 lg:grid-cols-2">
      {charts.map((c, i) => (
        <div key={i} className="rounded-lg border border-line bg-surface-2/40 p-3">
          <p className="mb-2 font-mono text-[11px] leading-snug text-faint">{c.title}</p>
          {renderLabChart(c)}
        </div>
      ))}
    </div>
  );
}

function patternCounts(list: DiaryEntry[]) {
  const m = new Map<string, number>();
  for (const d of list) m.set(d.pattern, (m.get(d.pattern) ?? 0) + 1);
  return [...m.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

/** Project × technology dependency matrix from the same data that feeds get_projects. */
function stackMatrix() {
  const techs = [...new Set(projects.flatMap((p) => p.stack))].sort();
  return { techs, projects };
}

/** Commits per project from the hourly metrics snapshot (same source as get_commit_history). */
function useCommits() {
  const [commits, setCommits] = useState<CommitEntry[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    loadFallbackSnapshot()
      .then((snap) => {
        if (!cancelled && snap?.commits) setCommits(snap.commits);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);
  return commits;
}

export function LabPage() {
  const { techs, projects: projs } = stackMatrix();
  const [project, setProject] = useState<string>(ALL);
  const commits = useCommits();

  const scoped = useMemo(() => {
    const isAll = project === ALL;
    return {
      experiments: isAll ? experiments : experiments.filter((e) => e.project === project),
      diary: isAll ? diary : diary.filter((d) => d.project === project),
      issues: isAll ? issues : issues.filter((i) => i.project === project),
    };
  }, [project]);

  const scopedCommits = useMemo(() => {
    if (!commits) return null;
    if (project === ALL) return commits;
    const proj = projects.find((p) => p.id === project);
    if (!proj) return [];
    const name = repoName(proj);
    return commits.filter((c) => c.repo.toLowerCase() === name.toLowerCase());
  }, [commits, project]);

  const commitCounts = useMemo(() => {
    if (!commits) return [];
    return projects
      .map((p) => ({
        label: p.name,
        value: commits.filter((c) => c.repo.toLowerCase() === repoName(p).toLowerCase()).length,
        sub: repoName(p),
      }))
      .sort((a, b) => b.value - a.value);
  }, [commits]);

  const tabs = [ALL, ...projects.map((p) => p.id)];
  const status = diaryStatus(scoped.diary);
  const hasLabData = project === ALL || scoped.experiments.length > 0 || scoped.diary.length > 0 || scoped.issues.length > 0;
  const projectHasNoLab = project !== ALL && !hasLabData;

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
            Every claim on the front page is backed by a logged experiment, a diary entry, a test, or a commit. This
            page is the machine-readable projection of those logs — the same data the MCP tools{' '}
            <span className="font-mono text-accent">get_experiments</span>, <span className="font-mono text-accent">get_diary</span>,{' '}
            <span className="font-mono text-accent">get_known_issues</span> and <span className="font-mono text-accent">get_commit_history</span>{' '}
            expose to agents.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Experiments" value={String(experiments.length)} hint="lab-wide · hypothesis → verdict" tone="accent" />
            <MetricCard label="Diary entries" value={String(diary.length)} hint="lab-wide · incidents, guards" />
            <MetricCard label="Known issues" value={String(issues.length)} hint="lab-wide · open debt" />
            <MetricCard label="Tests" value={String(testTotal)} hint={`${suites.length} suites`} />
          </div>
        </div>
      </section>

      {/* ── Project filter ───────────────────────────────────── */}
      <div className="reveal -mt-2 mb-10 flex flex-wrap items-center gap-2">
        {tabs.map((id) => (
          <button
            key={id}
            onClick={() => setProject(id)}
            className={`inline-flex min-h-10 items-center rounded-full border px-4 text-sm transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 ${
              id === project ? 'border-accent/60 bg-accent/10 text-accent shadow-[0_0_20px_-6px_var(--color-accent)]' : 'border-line text-muted hover:border-accent/40 hover:text-paper'
            }`}
          >
            {id === ALL ? 'All projects' : projectName(id)}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-faint sm:block">
          {project === ALL ? 'full lab' : `showing ${projectName(project)}`}
        </span>
      </div>

      {/* ── Decision logs per project ────────────────────────── */}
      <section className="pt-8 sm:pt-10">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">01 · decision logs</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Architecture decisions, per project</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            From <span className="font-mono">src/data/projects.json</span> — the same single source of truth that feeds{' '}
            <span className="font-mono">get_projects</span>. Each entry: considered → chosen → why → what it cost.
          </p>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {(project === ALL ? projs : projs.filter((p) => p.id === project)).map((p) => (
            <div key={p.id} className="reveal">
              <Card className="glass-card flex h-full flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]">
                <p className="font-mono text-[11px] text-accent">{p.id}</p>
                <h3 className="mt-0.5 text-base font-semibold text-paper">{p.name}</h3>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span key={s} className="rounded border border-line bg-surface-2/60 px-1.5 py-0.5 font-mono text-[10px] text-faint">
                      {s}
                    </span>
                  ))}
                </div>
                <div className="mt-4 space-y-3 border-t border-line pt-3">
                  {p.decisionLog.map((d, i) => (
                    <div key={i} className="group">
                      <p className="text-sm font-medium text-paper transition-colors group-hover:text-accent">▸ {d.decision}</p>
                      <p className="mt-1 text-xs leading-relaxed text-faint">
                        <span className="text-muted">considered: </span>
                        {d.alternatives.join(' · ')}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-faint">
                        <span className="text-muted">why: </span>
                        {d.reason}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-amber-600/90 dark:text-amber-400/90">
                        <span className="text-faint">cost: </span>
                        {d.tradeoff}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      </section>

      {/* ── Commit log per project ───────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">02 · commit log</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">What was shipped, per project</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            From <span className="font-mono">public/metrics.json</span> — the hourly CI snapshot behind{' '}
            <span className="font-mono">get_commit_history</span>. Every project has its own commits here.
          </p>
        </div>

        {commitCounts.length > 0 ? (
          <Card className="glass-card mt-8 p-5">
            <BarList data={commitCounts} />
          </Card>
        ) : null}

        <div className="mt-6 space-y-2">
          {scopedCommits === null ? (
            <p className="text-sm text-faint">loading commit snapshot…</p>
          ) : scopedCommits.length === 0 ? (
            <p className="text-sm text-faint">no commits in the snapshot for this project.</p>
          ) : (
            scopedCommits.map((c) => (
              <div key={c.sha} className="glass-card group flex flex-wrap items-baseline gap-x-3 gap-y-0.5 rounded-lg border px-3 py-2 text-sm transition-colors hover:border-accent/40">
                <span className="font-mono text-[10px] text-accent">{c.repo}</span>
                <span className="font-mono text-[10px] text-faint">{c.date.slice(0, 10)}</span>
                <span className="min-w-0 flex-1 truncate text-muted transition-colors group-hover:text-paper">{c.message}</span>
                <span className="font-mono text-[10px] text-faint">{c.sha}</span>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Experiments ──────────────────────────────────────── */}
      {scoped.experiments.length > 0 ? (
        <section className="pt-16 sm:pt-20">
          <div className="reveal">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">03 · experiments</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Hypotheses, commands, verdicts</h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <Card className="glass-card self-start p-5 transition-all duration-300 hover:border-accent/30">
              <CardHeader>
                <span className="text-sm font-semibold">Verdict distribution</span>
              </CardHeader>
              <Donut segments={verdictSegments(scoped.experiments)} centerLabel="experiments" />
            </Card>

            <div className="space-y-4">
              {scoped.experiments.map((e) => (
                <Card key={e.id} className="glass-card p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-faint">
                        {e.date} · {e.id}
                        {e.project ? <span className="ml-2 text-accent">#{projectName(e.project)}</span> : null}
                      </p>
                      <h3 className="mt-0.5 font-semibold text-paper">{e.title}</h3>
                    </div>
                    <Badge tone={VERDICT_TONES[e.verdict]}>{VERDICT_LABELS[e.verdict]}</Badge>
                  </div>
                  <details className="group mt-3">
                    <summary className="cursor-pointer font-mono text-xs text-accent select-none transition-colors hover:text-paper">
                      hypothesis · command · raw result
                    </summary>
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <p className="font-mono text-[11px] text-faint">hypothesis</p>
                        <p className="mt-0.5 leading-relaxed text-muted">{e.hypothesis}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[11px] text-faint">command</p>
                        <pre className="mt-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-paper">{e.command}</pre>
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
                  {e.chart ? <ExperimentChart chart={e.chart} /> : null}
                  {e.conclusion ? (
                    <p className="mt-3 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm leading-relaxed text-muted">
                      <span className="font-mono text-[11px] text-accent">conclusion: </span>
                      {e.conclusion}
                    </p>
                  ) : null}
                  {e.links && e.links.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-faint">related:</span>
                      {e.links.map((id) => {
                        const target = experiments.find((x) => x.id === id);
                        if (!target) return null;
                        return (
                          <span key={id} className="rounded-full border border-line bg-surface-2/60 px-2 py-0.5 font-mono text-[10px] text-muted">
                            {target.id} · {target.title.slice(0, 44)}
                          </span>
                        );
                      })}
                    </div>
                  ) : null}
                </Card>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ── Negative results ─────────────────────────────────── */}
      {project === ALL ? (
        <section className="pt-16 sm:pt-20">
          <div className="reveal">
            <p className="font-mono text-xs tracking-widest text-amber-600 uppercase dark:text-amber-400">04 · do not repeat</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Negative results</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Approaches that were tried and failed — recorded so a future agent or the owner never re-runs them.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {negativeResults.map((n) => (
              <Card key={n.attempt} className="glass-card border-red-500/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50">
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
      ) : null}

      {/* ── Diary ────────────────────────────────────────────── */}
      {scoped.diary.length > 0 ? (
        <section className="pt-16 sm:pt-20">
          <div className="reveal">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">05 · the diary</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Incidents, root causes, guards</h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-4">
              <Card className="glass-card p-5 transition-all duration-300 hover:border-accent/30">
                <CardHeader>
                  <span className="text-sm font-semibold">Status</span>
                </CardHeader>
                <Donut segments={status} centerLabel="entries" />
              </Card>
              <Card className="glass-card p-5 transition-all duration-300 hover:border-accent/30">
                <CardHeader>
                  <span className="text-sm font-semibold">Patterns</span>
                </CardHeader>
                <BarList data={patternCounts(scoped.diary)} />
              </Card>
            </div>

            <div className="space-y-3">
              {[...scoped.diary].reverse().map((d) => (
                <Card key={d.date + d.title} className="glass-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-faint">
                        {d.date}
                        {d.project ? <span className="ml-2 text-accent">#{projectName(d.project)}</span> : null}
                      </p>
                      <h3 className="mt-0.5 font-semibold text-paper">{d.title}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge tone={d.status === 'fixed' ? 'success' : 'warn'}>{d.status}</Badge>
                      <Badge>{d.pattern}</Badge>
                    </div>
                  </div>
                  <details className="group mt-2">
                    <summary className="cursor-pointer font-mono text-xs text-accent select-none transition-colors hover:text-paper">root cause · fix · guard</summary>
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
      ) : null}

      {/* ── Known issues ─────────────────────────────────────── */}
      {scoped.issues.length > 0 ? (
        <section className="pt-16 sm:pt-20">
          <div className="reveal">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">06 · known issues</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Open debt, with temperature</h2>
          </div>
          <div className="mt-8 space-y-3">
            {scoped.issues.map((i) => (
              <Card key={i.id} className="glass-card p-4 transition-all duration-300 hover:border-accent/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-accent">
                      {i.id}
                      {i.project ? <span className="ml-2 text-faint">#{projectName(i.project)}</span> : null}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{i.problem}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={i.temperature === 'watching' ? 'warn' : 'default'}>{i.temperature}</Badge>
                    <Badge tone={i.status.includes('Fixed') ? 'success' : i.status.includes('Fix in code') ? 'warn' : 'default'}>{i.status}</Badge>
                  </div>
                </div>
                {i.deadline ? <p className="mt-2 font-mono text-xs text-faint">deadline: {i.deadline}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Honest note for projects without lab logs ────────── */}
      {projectHasNoLab ? (
        <section className="pt-16 sm:pt-20">
          <div className="reveal">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">03 · lab logs</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">No lab pages for this project</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              The portfolio lab (<span className="font-mono">get_experiments</span> · <span className="font-mono">get_diary</span> ·{' '}
              <span className="font-mono">get_known_issues</span>) documents the build of this portfolio itself. Other
              projects keep their evidence in their own repositories — see their decision log (01) and commit history
              (02) above, or query <span className="font-mono">get_commit_history</span> for the live snapshot.
            </p>
          </div>
        </section>
      ) : null}

      {/* ── Tests ────────────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">07 · tests</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">The suites behind the claims</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {suites.map((s) => (
            <Card key={s.file} className="glass-card flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
              <p className="font-mono text-[11px] text-faint">{s.file}</p>
              <h3 className="mt-1 font-semibold text-paper">{s.name}</h3>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-accent">{s.tests}</p>
              <p className="mt-1 text-xs text-faint">tests · {s.updatedAt}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.covers}</p>
            </Card>
          ))}
        </div>
        <div className="mt-4">
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">Total</span>
              <span className="font-mono text-xl font-bold tabular-nums text-paper">{testTotal}</span>
            </div>
            <StackedBar
              className="mt-2 h-4"
              parts={suites.map((s, idx) => ({ label: s.file, value: s.tests, color: ['var(--color-accent)', 'var(--color-primary)', '#10b981', '#f59e0b'][idx % 4] }))}
            />
          </Card>
        </div>
      </section>

      {/* ── Dependencies ─────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">08 · dependencies</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Project × technology matrix</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">
            The same single source of truth (<span className="font-mono">src/data/projects.json</span>) that feeds{' '}
            <span className="font-mono">get_projects</span> and <span className="font-mono">analyze_stack</span>.
          </p>
        </div>
        <div className="glass-card mt-8 overflow-x-auto rounded-xl border border-line bg-surface/70">
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
                <tr key={p.id} className="border-b border-line/50 transition-colors last:border-0 hover:bg-accent/5">
                  <td className="px-4 py-3 font-medium text-paper">{p.name}</td>
                  {techs.map((t) => (
                    <td key={t} className="px-2 py-3 text-center">
                      {p.stack.some((s) => s.toLowerCase() === t.toLowerCase()) ? (
                        <span className="inline-block h-2.5 w-2.5 rounded-full bg-accent transition-transform duration-200 hover:scale-150" />
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

      {/* ── Load curves ──────────────────────────────────────── */}
      <LoadCurves />
    </main>
  );
}

/** Degradation curves from the same simulation engine as simulate_architecture. */
function LoadCurves() {
  const [projectId, setProjectId] = useState<string>(Object.keys(ARCHITECTURES)[0]);
  const [scenario, setScenario] = useState<string>(SCENARIOS[0].id);

  const curves = useMemo(() => buildCurves(projectId, scenario), [projectId, scenario]);
  const sim = useMemo(() => {
    const model = ARCHITECTURES[projectId];
    if (!model) return null;
    return runSimulation(model, scenario);
  }, [projectId, scenario]);
  const scenarioDef = SCENARIOS.find((s) => s.id === scenario)!;

  return (
    <section className="pt-16 sm:pt-20">
      <div className="reveal">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">09 · load curves</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Watch latency degrade under load</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          The same engine the <span className="font-mono">simulate_architecture</span> MCP tool exposes — real p50/p95
          percentiles per load step, per project, per failure scenario.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 font-mono text-[11px] text-faint">project</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ARCHITECTURES).map((id) => (
                <button
                  key={id}
                  onClick={() => setProjectId(id)}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs transition-all duration-200 hover:-translate-y-0.5 ${
                    id === projectId ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent/40'
                  }`}
                >
                  {projectName(id)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-mono text-[11px] text-faint">scenario</p>
            <div className="space-y-1.5">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`block w-full rounded-lg border p-2.5 text-left transition-all duration-200 ${
                    s.id === scenario ? 'border-accent/60 bg-accent/5' : 'border-line hover:border-accent/40'
                  }`}
                >
                  <p className="text-xs font-semibold text-paper">{s.label}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-faint">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <Card className="glass-card p-5">
            <LineChart series={curves} />
          </Card>
          {sim?.findings.length ? (
            <Card className="glass-card mt-4 p-4">
              <p className="font-mono text-xs text-accent">{scenarioDef.label} — findings</p>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {sim.findings.map((f, i) => (
                  <li key={i}>• {f}</li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function buildCurves(projectId: string, scenario: string): LineSeries[] {
  const model = ARCHITECTURES[projectId];
  if (!model) return [];
  const { points } = runSimulation(model, scenario);
  return [
    {
      label: 'p50',
      color: 'var(--color-accent)',
      points: points.map((p) => ({ x: p.load, y: p.p50 })),
    },
    {
      label: 'p95',
      color: '#f59e0b',
      points: points.map((p) => ({ x: p.load, y: p.p95 })),
    },
  ];
}
