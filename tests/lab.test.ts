import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LabPage } from '../src/components/lab/LabPage';
import experimentsData from '../src/data/lab/experiments.json' with { type: 'json' };
import diaryData from '../src/data/lab/diary.json' with { type: 'json' };
import knownIssuesData from '../src/data/lab/known-issues.json' with { type: 'json' };
import testSuitesData from '../src/data/lab/test-suites.json' with { type: 'json' };

interface Experiment {
  id: string;
  date: string;
  project?: string;
  title: string;
  hypothesis: string;
  command: string;
  result: string;
  verdict: 'confirmed' | 'refuted' | 'partial';
  finding: string;
}
interface NegativeResult {
  attempt: string;
  whyFailed: string;
  date: string;
  ref: string;
}
interface DiaryEntry {
  date: string;
  project?: string;
  title: string;
  status: 'fixed' | 'partial';
  rootCause: string;
  fix: string;
  guard: string;
  pattern: string;
}
interface KnownIssue {
  id: string;
  project?: string;
  problem: string;
  status: string;
  temperature: 'stable' | 'watching';
  deadline: string | null;
  owner: string;
  link: string;
}
interface TestSuite {
  file: string;
  name: string;
  tests: number;
  covers: string;
  updatedAt: string;
}

// Every assertion here guards the "lab" page + MCP tools: the data files are
// the single machine-readable projection of docs/*.md — keep them in sync.
// NOTE: lab data is English (site language); docs/*.md stay Russian (internal logs).
describe('lab data integrity', () => {
  it('experiments: every entry is complete, verdicts valid, project tagged', () => {
    const exps = (experimentsData as { experiments: Experiment[] }).experiments;
    expect(exps.length).toBeGreaterThanOrEqual(7);
    for (const e of exps) {
      expect(e.id).toMatch(/^exp-\d+$/);
      expect(e.title.length).toBeGreaterThan(10);
      expect(e.hypothesis.length).toBeGreaterThan(20);
      expect(e.command.length).toBeGreaterThan(10);
      expect(e.result.length).toBeGreaterThan(20);
      expect(e.finding.length).toBeGreaterThan(10);
      expect(['confirmed', 'refuted', 'partial']).toContain(e.verdict);
      expect(e.project).toBeTruthy(); // per-project attribution
    }
    const ids = new Set(exps.map((e) => e.id));
    expect(ids.size).toBe(exps.length); // unique ids
  });

  it('experiments: negative results reference real experiments when applicable', () => {
    const neg = (experimentsData as { negativeResults: NegativeResult[] }).negativeResults;
    expect(neg.length).toBeGreaterThanOrEqual(3);
    const expIds = new Set((experimentsData as { experiments: Experiment[] }).experiments.map((e) => e.id));
    for (const n of neg) {
      expect(n.attempt.length).toBeGreaterThan(5);
      expect(n.whyFailed.length).toBeGreaterThan(5);
      if (n.ref.startsWith('exp-')) expect(expIds.has(n.ref)).toBe(true);
    }
  });

  it('diary: entries are complete, statuses valid, project tagged', () => {
    const entries = (diaryData as { entries: DiaryEntry[] }).entries;
    expect(entries.length).toBeGreaterThanOrEqual(15);
    for (const e of entries) {
      expect(e.date).toMatch(/^\d{4}-\d{2}-\d{2}/);
      expect(e.title.length).toBeGreaterThan(5);
      expect(e.rootCause.length).toBeGreaterThan(0);
      expect(e.fix.length).toBeGreaterThan(0);
      expect(e.guard.length).toBeGreaterThan(0);
      expect(e.pattern.length).toBeGreaterThan(0);
      expect(['fixed', 'partial']).toContain(e.status);
      expect(e.project).toBeTruthy();
    }
  });

  it('known issues: ids are KI-N, temperatures valid, project tagged', () => {
    const issues = (knownIssuesData as { issues: KnownIssue[] }).issues;
    expect(issues.length).toBeGreaterThanOrEqual(10);
    const ids = new Set(issues.map((i) => i.id));
    expect(ids.size).toBe(issues.length);
    for (const i of issues) {
      expect(i.id).toMatch(/^KI-\d+$/);
      expect(['stable', 'watching']).toContain(i.temperature);
      expect(i.problem.length).toBeGreaterThan(10);
      expect(i.owner.length).toBeGreaterThan(0);
      expect(i.project).toBeTruthy();
    }
  });

  it('test suites: per-file counts sum to the declared total', () => {
    const suites = (testSuitesData as { suites: TestSuite[]; total: number }).suites;
    const total = (testSuitesData as { total: number }).total;
    expect(suites.length).toBeGreaterThanOrEqual(3);
    const sum = suites.reduce((s, t) => s + t.tests, 0);
    expect(sum).toBe(total);
    for (const s of suites) {
      expect(s.file).toMatch(/^tests\/.+\.test\.ts$/);
      expect(s.tests).toBeGreaterThan(0);
      expect(s.covers.length).toBeGreaterThan(10);
      expect(s.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('LabPage renders server-side with all sections + project filter', () => {
    const html = renderToStaticMarkup(createElement(LabPage));
    // Hero + numbered sections (decision logs, commit log, experiments, negative results, diary, known issues, tests, dependencies)
    for (const needle of [
      'The evidence trail',
      '01 · decision logs',
      '02 · commit log',
      '03 · experiments',
      '04 · do not repeat',
      '05 · the diary',
      '06 · known issues',
      '07 · tests',
      '08 · dependencies',
      'All projects',
      'get_experiments',
      'get_diary',
      'get_known_issues',
      'get_commit_history',
    ]) {
      expect(html).toContain(needle);
    }
    // Every experiment, diary entry and known issue is present in the DOM
    const exps = (experimentsData as { experiments: Experiment[] }).experiments;
    for (const e of exps) expect(html).toContain(e.title.slice(0, 20));
    const entries = (diaryData as { entries: DiaryEntry[] }).entries;
    for (const d of entries) expect(html).toContain(d.title.slice(0, 20));
    const issues = (knownIssuesData as { issues: KnownIssue[] }).issues;
    for (const i of issues) expect(html).toContain(i.id);
  });

  it('lab data is English (site language); only docs/*.md stay Russian', () => {
    const exps = (experimentsData as { experiments: Experiment[] }).experiments;
    const entries = (diaryData as { entries: DiaryEntry[] }).entries;
    const issues = (knownIssuesData as { issues: KnownIssue[] }).issues;
    // Cyrillic is not allowed in lab projections (would leak Russian into the EN site)
    const cyrillic = /[а-яА-ЯёЁ]/;
    const texts = [
      ...exps.map((e) => e.title + e.hypothesis + e.result + e.finding),
      ...entries.map((d) => d.title + d.rootCause + d.fix + d.guard),
      ...issues.map((i) => i.problem),
    ];
    for (const t of texts) expect(t.match(cyrillic)).toBeNull();
  });
});
