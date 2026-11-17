// Guard for the hand-written agent surfaces under public/.
//
// public/llms-full.txt and its siblings are prose, not generated: nothing in
// the build reads them back, so their tool lists and lab counts drift in
// silence (found 2026-11-17: llms-full.txt advertised 16 tools while the server
// served 18, and 12 experiments while the lab carried 59). The JSON has tests
// and the worker's /llms.txt is built from TOOLS, but these files had no owner.
// Same class as P-010 in docs/AGENT_DIARY.md.
//
// The assertions are section-scoped and count-anchored on purpose: a plain
// `toContain(<correct line>)` anywhere in the file is satisfied by a decoy
// line while the real section stays stale. That bypass was reproduced on
// 2026-11-17 before this version of the guard existed.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { TOOLS } from '../src/lib/mcp-tools';
import experimentsData from '../src/data/lab/experiments.json';
import diaryData from '../src/data/lab/diary.json';
import knownIssuesData from '../src/data/lab/known-issues.json';
import testSuitesData from '../src/data/lab/test-suites.json';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');

const toolNames = TOOLS.map((t) => t.name);

const experiments = experimentsData as { experiments: { verdict: string }[]; negativeResults: unknown[] };
const diary = diaryData as { entries: unknown[] };
const issues = (knownIssuesData as { issues: { id: string }[] }).issues;
const suites = testSuitesData as { suites: unknown[]; total: number };

const count = (verdict: string) => experiments.experiments.filter((e) => e.verdict === verdict).length;

/** Text of one `## <heading>` section, up to the next `## ` heading. */
function section(text: string, heading: string): string {
  const start = text.indexOf(`\n## ${heading}`);
  if (start === -1) throw new Error(`section "${heading}" not found`);
  const rest = text.slice(start + 3);
  const end = rest.indexOf('\n## ');
  return end === -1 ? rest : rest.slice(0, end);
}

/** Exactly one match of `re` in `where`, returned as captured groups. */
function once(where: string, re: RegExp, label: string): string[] {
  const all = [...where.matchAll(new RegExp(re.source, `${re.flags.replace('g', '')}g`))];
  if (all.length !== 1) throw new Error(`${label}: expected exactly 1 match, got ${all.length}`);
  return all[0].slice(1);
}

const sorted = (xs: string[]) => [...xs].sort();

describe('public/llms-full.txt matches the data it advertises', () => {
  const text = read('../public/llms-full.txt');

  it('lists every registered MCP tool exactly once, in the Live MCP server section', () => {
    const [n, list] = once(section(text, 'Live MCP server'), /^- Tools \((\d+)\): (.+)$/m, 'tools line');
    expect(Number(n)).toBe(TOOLS.length);
    const names = list.split(',').map((s) => s.trim());
    expect(names).toHaveLength(TOOLS.length); // no duplicates padding the count
    expect(sorted(names)).toEqual(sorted(toolNames));
  });

  it('reports the lab counts that src/data/lab/*.json actually hold', () => {
    const lab = section(text, 'Lab');
    const exps = once(
      lab,
      /^- (\d+) experiments with hypothesis .* \((\d+) confirmed, (\d+) partial, (\d+) refuted\) \+ (\d+) negative results$/m,
      'experiments line',
    );
    expect(exps.map(Number)).toEqual([
      experiments.experiments.length,
      count('confirmed'),
      count('partial'),
      count('refuted'),
      experiments.negativeResults.length,
    ]);

    const [diaryCount] = once(lab, /^- (\d+) diary entries/m, 'diary line');
    expect(Number(diaryCount)).toBe(diary.entries.length);

    const [issueCount, idRange] = once(lab, /^- (\d+) known issues \(([^)]*)\)/m, 'issues line');
    expect(Number(issueCount)).toBe(issues.length);
    expect(idRange).toBe(`${issues[0].id}..${issues[issues.length - 1].id}`);

    const [suiteCount, testTotal] = once(lab, /^- (\d+) test suites \/ (\d+) tests in the lab registry/m, 'suites line');
    expect(Number(suiteCount)).toBe(suites.suites.length);
    expect(Number(testTotal)).toBe(suites.total);
  });
});

describe('public/llms.txt and the skill sheet list the same tool surface', () => {
  it('llms.txt: heading count and bullets match TOOLS', () => {
    const text = read('../public/llms.txt');
    const [n] = once(text, /^## MCP tools \((\d+)\)$/m, 'llms.txt heading');
    expect(Number(n)).toBe(TOOLS.length);
    const bullets = [...section(text, `MCP tools (${n})`).matchAll(/^- (\w+) — /gm)].map((m) => m[1]);
    expect(bullets).toHaveLength(TOOLS.length);
    expect(sorted(bullets)).toEqual(sorted(toolNames));
  });

  it('msp-portfolio.skill.md: heading count and table rows match TOOLS', () => {
    const text = read('../public/msp-portfolio.skill.md');
    const [n] = once(text, /^## Tools \((\d+)\)$/m, 'skill.md heading');
    expect(Number(n)).toBe(TOOLS.length);
    const rows = [...section(text, `Tools (${n})`).matchAll(/^\| `(\w+)(?:\([^)]*\))?` \|/gm)].map((m) => m[1]);
    expect(rows).toHaveLength(TOOLS.length);
    expect(sorted(rows)).toEqual(sorted(toolNames));
  });
});

describe('the benchmark generator cannot write Cyrillic into the EN artifact', () => {
  // public/benchmarks.json is produced by scripts/bench-claims.ts. The artifact
  // was translated but its generator still emitted Russian, so the next
  // `pnpm bench` would silently undo the fix (found in review, 2026-11-17).
  it('no Cyrillic in the source/command literals of the artifact builder', () => {
    const src = read('../scripts/bench-claims.ts');
    const lines = src.split(/\r?\n/).filter((l) => /^\s*(source|command):/.test(l));
    expect(lines.length).toBeGreaterThanOrEqual(4); // the parser must actually see them
    for (const line of lines) expect(line.match(/[а-яА-ЯёЁ]/)?.[0] ?? null).toBeNull();
  });
});

describe('English public surfaces stay English', () => {
  // The site language is EN; Russian belongs to docs/*.md and *.ru.json.
  // ⏳ Not covered: homoglyphs and HTML entities — a transliteration attack
  // would pass. Out of scope until such a surface is generated, not typed.
  const cyrillic = /[а-яА-ЯёЁ]/;
  for (const file of [
    '../public/llms-full.txt',
    '../public/llms.txt',
    '../public/msp-portfolio.skill.md',
    '../public/benchmarks.json',
  ]) {
    it(`${file} has no Cyrillic`, () => {
      const match = read(file).match(cyrillic);
      expect(match?.[0] ?? null).toBeNull();
    });
  }
});
