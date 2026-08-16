import { useEffect, useMemo, useState } from 'react';
import experimentsData from '../../data/lab/experiments.json';
import experimentsRu from '../../data/lab/experiments.ru.json';
import diaryData from '../../data/lab/diary.json';
import diaryRu from '../../data/lab/diary.ru.json';
import knownIssuesData from '../../data/lab/known-issues.json';
import knownIssuesRu from '../../data/lab/known-issues.ru.json';
import testSuitesData from '../../data/lab/test-suites.json';
import testSuitesRu from '../../data/lab/test-suites.ru.json';
import evidenceData from '../../data/lab/evidence.json';
import evidenceRu from '../../data/lab/evidence.ru.json';
import projectsData from '../../data/projects.json';
import projectsRu from '../../data/projects.ru.json';
import { loadFallbackSnapshot } from '../../lib/api';
import { ARCHITECTURES, runSimulation, SCENARIOS } from '../../lib/mcp-tools';
import type { Experiment, ExperimentVerdict, DiaryEntry, KnownIssue, Project, CommitEntry, LabChart, LabBarDatum, LabDonutSegment, LabLineSeries } from '../../lib/types';
import { useLang } from '../../i18n/LangContext';
import { useUi } from '../../i18n/ui';
import { Badge } from '../ui/Badge';
import { Card, CardHeader } from '../ui/Card';
import { MetricCard } from '../metrics/MetricCard';
import { BarList, Donut, LineChart, StackedBar, type BarDatum, type DonutSegment, type LineSeries } from './charts';

const ALL = 'all';

type ExperimentShape = { experiments: Experiment[]; negativeResults: { attempt: string; whyFailed: string; date: string; ref: string }[] };
type DiaryShape = { entries: DiaryEntry[] };
type IssuesShape = { issues: KnownIssue[] };
type SuitesShape = { suites: { file: string; name: string; tests: number; covers: string; updatedAt: string }[]; total: number };
type EvidenceShape = { claims: { id: string; claim: string; expected: 'supported' | 'refused' }[]; summary: { supported: number; refused: number; total: number } };

interface ProjectsShape {
  projects: Project[];
}

const enExperiments = experimentsData as ExperimentShape;
const ruExperiments = experimentsRu as ExperimentShape;
const enDiary = diaryData as DiaryShape;
const ruDiary = diaryRu as DiaryShape;
const enIssues = knownIssuesData as IssuesShape;
const ruIssues = knownIssuesRu as IssuesShape;
const enSuites = testSuitesData as SuitesShape;
const ruSuites = testSuitesRu as SuitesShape;
const enEvidence = evidenceData as EvidenceShape;
const ruEvidence = evidenceRu as EvidenceShape;
const enProjects = projectsData as ProjectsShape;
const ruProjects = projectsRu as ProjectsShape;

/** Lab data bundle per language — components pick the file by `lang` (EN default). */
function useLabData() {
  const { isRu } = useLang();
  const experiments = (isRu ? ruExperiments : enExperiments).experiments;
  const negativeResults = (isRu ? ruExperiments : enExperiments).negativeResults;
  const diary = (isRu ? ruDiary : enDiary).entries;
  const issues = (isRu ? ruIssues : enIssues).issues;
  const suites = (isRu ? ruSuites : enSuites).suites;
  const testTotal = (isRu ? ruSuites : enSuites).total;
  const evidenceClaims = (isRu ? ruEvidence : enEvidence).claims;
  const evidenceSummary = (isRu ? ruEvidence : enEvidence).summary;
  const projects = (isRu ? ruProjects : enProjects).projects;
  return { experiments, negativeResults, diary, issues, suites, testTotal, evidenceClaims, evidenceSummary, projects };
}

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

function projectName(projects: Project[], id: string): string {
  return projects.find((p) => p.id === id)?.name ?? id;
}

/** GitHub repo name for a project (project.repo = 'Owner/name'). */
function repoName(p: Project): string {
  return p.repo.split('/')[1] ?? p.repo;
}

function verdictSegments(list: Experiment[], ui: ReturnType<typeof useUi>): DonutSegment[] {
  const counts = { confirmed: 0, refuted: 0, partial: 0 };
  for (const e of list) counts[e.verdict]++;
  return [
    { label: ui.lab.verdicts.confirmed, value: counts.confirmed, color: VERDICT_COLORS.confirmed },
    { label: ui.lab.verdicts.partial, value: counts.partial, color: VERDICT_COLORS.partial },
    { label: ui.lab.verdicts.refuted, value: counts.refuted, color: VERDICT_COLORS.refuted },
  ].filter((s) => s.value > 0);
}

function diaryStatus(list: DiaryEntry[], ui: ReturnType<typeof useUi>): DonutSegment[] {
  const fixed = list.filter((d) => d.status === 'fixed').length;
  const partial = list.filter((d) => d.status === 'partial').length;
  return [
    { label: ui.lab.diaryStatus.fixed, value: fixed, color: '#10b981' },
    { label: ui.lab.diaryStatus.partial, value: partial, color: '#f59e0b' },
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
function stackMatrix(projects: Project[]) {
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
  const { experiments, negativeResults, diary, issues, suites, testTotal, evidenceClaims, evidenceSummary, projects } = useLabData();
  const ui = useUi();
  const { techs, projects: projs } = stackMatrix(projects);
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
  }, [commits, project, projects]);

  const commitCounts = useMemo(() => {
    if (!commits) return [];
    return projects
      .map((p) => ({
        label: p.name,
        value: commits.filter((c) => c.repo.toLowerCase() === repoName(p).toLowerCase()).length,
        sub: repoName(p),
      }))
      .sort((a, b) => b.value - a.value);
  }, [commits, projects]);

  const tabs = [ALL, ...projects.map((p) => p.id)];
  const status = diaryStatus(scoped.diary, ui);
  const hasLabData = project === ALL || scoped.experiments.length > 0 || scoped.diary.length > 0 || scoped.issues.length > 0;
  const projectHasNoLab = project !== ALL && !hasLabData;

  return (
    <main id="top" className="mx-auto max-w-5xl px-5 pb-16">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-16 pb-10 sm:pt-24">
        <div className="reveal">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">{ui.lab.badge1}</Badge>
            <Badge>{ui.lab.badge2}</Badge>
            <Badge tone="success">{ui.lab.badge3}</Badge>
          </div>
          <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
            {ui.lab.title}{' '}
            <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">{ui.lab.titleAccent}</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{ui.lab.blurb}</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={ui.lab.metricExperiments} value={String(experiments.length)} hint={ui.lab.metricExperimentsHint} tone="accent" />
            <MetricCard label={ui.lab.metricDiary} value={String(diary.length)} hint={ui.lab.metricDiaryHint} />
            <MetricCard label={ui.lab.metricIssues} value={String(issues.length)} hint={ui.lab.metricIssuesHint} />
            <MetricCard label={ui.lab.metricTests} value={String(testTotal)} hint={`${suites.length} ${ui.lab.metricTestsHint}`} />
          </div>
        </div>
      </section>

      {/* ── TL;DR — entry point for first-time visitors ─────── */}
      <section className="pt-6 pb-2">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.tlDr.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.tlDr.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.tlDr.note}</p>
        </div>
        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {ui.lab.tlDr.items.map((f) => (
            <a key={f.id} href={`#${f.id}`} className="group flex flex-col rounded-xl border border-line bg-surface/60 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/50">
              <p className="font-mono text-[10px] text-accent">{f.id}</p>
              <h3 className="mt-1 text-sm font-semibold text-paper transition-colors group-hover:text-accent">{f.title}</h3>
              <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{f.text}</p>
              <p className="mt-3 font-mono text-[10px] text-faint">→ {ui.lab.tlDr.openRecord}</p>
            </a>
          ))}
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
            {id === ALL ? ui.lab.allProjects : projectName(projects, id)}
          </button>
        ))}
        <span className="ml-auto hidden text-xs text-faint sm:block">
          {project === ALL ? ui.lab.fullLab : `${ui.lab.showing} ${projectName(projects, project)}`}
        </span>
      </div>

      {/* ── Decision logs per project ────────────────────────── */}
      <section className="pt-8 sm:pt-10">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secDecisionLog.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secDecisionLog.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.secDecisionLogNote}</p>
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
                        <span className="text-muted">{ui.lab.considered} </span>
                        {d.alternatives.join(' · ')}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-faint">
                        <span className="text-muted">{ui.lab.why} </span>
                        {d.reason}
                      </p>
                      <p className="mt-0.5 text-xs leading-relaxed text-amber-600/90 dark:text-amber-400/90">
                        <span className="text-faint">{ui.lab.cost} </span>
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
          <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secCommitLog.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secCommitLog.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.secCommitLogNote}</p>
        </div>

        {commitCounts.length > 0 ? (
          <Card className="glass-card mt-8 p-5">
            <BarList data={commitCounts} />
          </Card>
        ) : null}

        <div className="mt-6 space-y-2">
          {scopedCommits === null ? (
            <p className="text-sm text-faint">{ui.lab.loading}</p>
          ) : scopedCommits.length === 0 ? (
            <p className="text-sm text-faint">{ui.lab.noCommits}</p>
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
            <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secExperiments.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secExperiments.title}</h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <Card className="glass-card self-start p-5 transition-all duration-300 hover:border-accent/30">
              <CardHeader>
                <span className="text-sm font-semibold">{ui.lab.verdictDistribution}</span>
              </CardHeader>
              <Donut segments={verdictSegments(scoped.experiments, ui)} centerLabel={ui.lab.experimentsCenter} />
            </Card>

            <div className="space-y-4">
              {scoped.experiments.map((e) => (
                <Card key={e.id} id={e.id} className="glass-card scroll-mt-28 p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/40">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[11px] text-faint">
                        {e.date} · {e.id}
                        {e.project ? <span className="ml-2 text-accent">#{projectName(projects, e.project)}</span> : null}
                      </p>
                      <h3 className="mt-0.5 font-semibold text-paper">{e.title}</h3>
                    </div>
                    <Badge tone={VERDICT_TONES[e.verdict]}>{ui.lab.verdicts[e.verdict]}</Badge>
                  </div>
                  <details className="group mt-3">
                    <summary className="cursor-pointer font-mono text-xs text-accent select-none transition-colors hover:text-paper">
                      {ui.lab.summary}
                    </summary>
                    <div className="mt-3 space-y-3 text-sm">
                      <div>
                        <p className="font-mono text-[11px] text-faint">{ui.lab.fieldHypothesis}</p>
                        <p className="mt-0.5 leading-relaxed text-muted">{e.hypothesis}</p>
                      </div>
                      <div>
                        <p className="font-mono text-[11px] text-faint">{ui.lab.fieldCommand}</p>
                        <pre className="mt-0.5 overflow-x-auto rounded-lg border border-line bg-surface-2/60 px-3 py-2 font-mono text-xs leading-relaxed whitespace-pre-wrap text-paper">{e.command}</pre>
                      </div>
                      <div>
                        <p className="font-mono text-[11px] text-faint">{ui.lab.fieldResult}</p>
                        <p className="mt-0.5 leading-relaxed text-muted">{e.result}</p>
                      </div>
                      <div className="border-t border-line pt-2">
                        <span className="font-mono text-[11px] text-accent">{ui.lab.finding} </span>
                        <span className="text-muted">{e.finding}</span>
                      </div>
                    </div>
                  </details>
                  {e.chart ? <ExperimentChart chart={e.chart} /> : null}
                  {e.conclusion ? (
                    <p className="mt-3 rounded-lg border border-accent/25 bg-accent/5 px-3 py-2 text-sm leading-relaxed text-muted">
                      <span className="font-mono text-[11px] text-accent">{ui.lab.conclusion} </span>
                      {e.conclusion}
                    </p>
                  ) : null}
                  {e.links && e.links.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="font-mono text-[11px] text-faint">{ui.lab.related}:</span>
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
            <p className="font-mono text-xs tracking-widest text-amber-600 uppercase dark:text-amber-400">{ui.lab.secNegative.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secNegative.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.secNegativeNote}</p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {negativeResults.map((n) => (
              <Card key={n.attempt} className="glass-card border-red-500/25 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-red-500/50">
                <p className="font-mono text-[11px] text-faint">{n.date} · {n.ref}</p>
                <h3 className="mt-1 text-sm font-semibold text-paper">{n.attempt}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  <span className="text-red-500/90 dark:text-red-400/90">{ui.lab.whyFailed} </span>
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
            <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secDiary.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secDiary.title}</h2>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
            <div className="space-y-4">
              <Card className="glass-card p-5 transition-all duration-300 hover:border-accent/30">
                <CardHeader>
                  <span className="text-sm font-semibold">{ui.lab.status}</span>
                </CardHeader>
                <Donut segments={status} centerLabel={ui.lab.entriesCenter} />
              </Card>
              <Card className="glass-card p-5 transition-all duration-300 hover:border-accent/30">
                <CardHeader>
                  <span className="text-sm font-semibold">{ui.lab.patterns}</span>
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
                        {d.project ? <span className="ml-2 text-accent">#{projectName(projects, d.project)}</span> : null}
                      </p>
                      <h3 className="mt-0.5 font-semibold text-paper">{d.title}</h3>
                    </div>
                    <div className="flex gap-1.5">
                      <Badge tone={d.status === 'fixed' ? 'success' : 'warn'}>{ui.lab.diaryStatus[d.status]}</Badge>
                      <Badge>{d.pattern}</Badge>
                    </div>
                  </div>
                  <details className="group mt-2">
                    <summary className="cursor-pointer font-mono text-xs text-accent select-none transition-colors hover:text-paper">{ui.lab.rootCauseSummary}</summary>
                    <div className="mt-3 space-y-2 text-sm">
                      <p className="leading-relaxed text-muted"><span className="text-faint">{ui.lab.rootCause} </span>{d.rootCause}</p>
                      <p className="leading-relaxed text-muted"><span className="text-faint">{ui.lab.fix} </span>{d.fix}</p>
                      <p className="leading-relaxed text-muted"><span className="text-faint">{ui.lab.guard} </span>{d.guard}</p>
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
            <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secIssues.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secIssues.title}</h2>
          </div>
          <div className="mt-8 space-y-3">
            {scoped.issues.map((i) => (
              <Card key={i.id} className="glass-card p-4 transition-all duration-300 hover:border-accent/40">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11px] text-accent">
                      {i.id}
                      {i.project ? <span className="ml-2 text-faint">#{projectName(projects, i.project)}</span> : null}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{i.problem}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={i.temperature === 'watching' ? 'warn' : 'default'}>{i.temperature}</Badge>
                    <Badge tone={i.status.includes('Fixed') ? 'success' : i.status.includes('Fix in code') ? 'warn' : 'default'}>{i.status}</Badge>
                  </div>
                </div>
                {i.deadline ? <p className="mt-2 font-mono text-xs text-faint">{ui.lab.deadline} {i.deadline}</p> : null}
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Honest note for projects without lab logs ────────── */}
      {projectHasNoLab ? (
        <section className="pt-16 sm:pt-20">
          <div className="reveal">
            <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secNoLab.kicker}</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secNoLab.title}</h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.secNoLabNote}</p>
          </div>
        </section>
      ) : null}

      {/* ── Tests ────────────────────────────────────────────── */}
      <section className="pt-16 sm:pt-20">
        <div className="reveal">
          <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secTests.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secTests.title}</h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {suites.map((s) => (
            <Card key={s.file} className="glass-card flex flex-col p-5 transition-all duration-300 hover:-translate-y-1 hover:border-accent/40">
              <p className="font-mono text-[11px] text-faint">{s.file}</p>
              <h3 className="mt-1 font-semibold text-paper">{s.name}</h3>
              <p className="mt-3 font-mono text-3xl font-bold tabular-nums text-accent">{s.tests}</p>
              <p className="mt-1 text-xs text-faint">{ui.lab.testsLabel} · {s.updatedAt}</p>
              <p className="mt-3 text-sm leading-relaxed text-muted">{s.covers}</p>
            </Card>
          ))}
        </div>
        <div className="mt-6">
          <Card className="glass-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-semibold text-paper">{ui.lab.evidenceScoreTitle}</span>
              <span className="font-mono text-xs text-faint">{ui.lab.evidenceScoreSub}</span>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-faint">{ui.lab.evidenceScoreNote}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="success">{evidenceSummary.supported} {ui.lab.supported}</Badge>
              <Badge tone="warn">{evidenceSummary.refused} {ui.lab.refused}</Badge>
              <Badge>{evidenceSummary.total} {ui.lab.claims}</Badge>
            </div>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {evidenceClaims.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border border-line bg-surface-2/60 px-3 py-2">
                  <span className="font-mono text-[11px] text-faint">{c.id}</span>
                  <span className="min-w-0 flex-1 text-sm leading-snug text-muted">{c.claim}</span>
                  <Badge tone={c.expected === 'supported' ? 'success' : 'warn'}>{c.expected === 'supported' ? ui.lab.supported : ui.lab.refused}</Badge>
                </li>
              ))}
            </ul>
          </Card>
        </div>
        <div className="mt-4">
          <Card className="glass-card p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{ui.lab.total}</span>
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
          <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secDeps.kicker}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secDeps.title}</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.secDepsNote}</p>
        </div>
        <div className="glass-card mt-8 overflow-x-auto rounded-xl border border-line bg-surface/70">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line">
                <th className="px-4 py-3 text-left font-mono text-xs font-medium text-faint">{ui.lab.project}</th>
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
  const { projects } = useLabData();
  const ui = useUi();

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
        <p className="font-mono text-xs tracking-widest text-accent uppercase">{ui.lab.secLoadCurves.kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{ui.lab.secLoadCurves.title}</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">{ui.lab.secLoadCurvesNote}</p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-4">
          <div>
            <p className="mb-2 font-mono text-[11px] text-faint">{ui.lab.project}</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(ARCHITECTURES).map((id) => (
                <button
                  key={id}
                  onClick={() => setProjectId(id)}
                  className={`inline-flex min-h-9 items-center rounded-full border px-3 text-xs transition-all duration-200 hover:-translate-y-0.5 ${
                    id === projectId ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line text-muted hover:border-accent/40'
                  }`}
                >
                  {projectName(projects, id)}
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
