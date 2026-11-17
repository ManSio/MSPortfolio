// Guard for the hand-written agent surfaces under public/.
//
// public/llms-full.txt is prose, not generated: nothing in the build reads it
// back, so its tool list and lab counts drift in silence (found 2026-11-17:
// it advertised 16 tools while the server served 18, and 12 experiments while
// the lab carried 59). tests/ covers the JSON, the worker /llms.txt is built
// from TOOLS, but this file had no owner. Same class as P-010 in
// docs/AGENT_DIARY.md (a surface that advertises data without being checked
// against it).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../src/lib/mcp-tools';
import experimentsData from '../src/data/lab/experiments.json';
import diaryData from '../src/data/lab/diary.json';
import knownIssuesData from '../src/data/lab/known-issues.json';
import testSuitesData from '../src/data/lab/test-suites.json';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

const experiments = (experimentsData as { experiments: { verdict: string }[]; negativeResults: unknown[] });
const diary = (diaryData as { entries: unknown[] });
const issues = (knownIssuesData as { issues: { id: string }[] }).issues;
const suites = (testSuitesData as { suites: unknown[]; total: number });

const count = (verdict: string) => experiments.experiments.filter((e) => e.verdict === verdict).length;

describe('public/llms-full.txt matches the data it advertises', () => {
  const text = read('../public/llms-full.txt');

  it('lists every registered MCP tool, with the right count', () => {
    const names = TOOLS.map((t) => t.name);
    expect(text).toContain(`- Tools (${TOOLS.length}): ${names.join(', ')}`);
  });

  it('reports the lab counts that src/data/lab/*.json actually hold', () => {
    const labLine =
      `- ${experiments.experiments.length} experiments with hypothesis → command → verdict ` +
      `(${count('confirmed')} confirmed, ${count('partial')} partial, ${count('refuted')} refuted) ` +
      `+ ${experiments.negativeResults.length} negative results`;
    expect(text).toContain(labLine);
    expect(text).toContain(`- ${diary.entries.length} diary entries`);
    expect(text).toContain(`- ${issues.length} known issues (${issues[0].id}..${issues[issues.length - 1].id})`);
    expect(text).toContain(`- ${suites.suites.length} test suites / ${suites.total} tests`);
  });
});

describe('English public surfaces stay English', () => {
  // The site language is EN; Russian belongs to docs/*.md and *.ru.json.
  const cyrillic = /[а-яА-ЯёЁ]/;
  for (const file of ['../public/llms-full.txt', '../public/llms.txt', '../public/benchmarks.json']) {
    it(`${file} has no Cyrillic`, () => {
      const match = read(file).match(cyrillic);
      expect(match?.[0] ?? null).toBeNull();
    });
  }
});
