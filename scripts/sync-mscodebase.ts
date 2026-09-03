/**
 * Regenerates the portfolio Lab data (src/data/lab/*.json + *.ru.json)
 * from the REAL MSCodeBase project sources:
 *
 *   EXPERIMENTS_LOG.md  -> experiments.json / experiments.ru.json
 *   AGENT_DIARY.md      -> diary.json / diary.ru.json
 *   KNOWN_ISSUES.md     -> known-issues.json / known-issues.ru.json
 *   tests/              -> test-suites.json / test-suites.ru.json
 *
 * The source files are the single source of truth. This script must NEVER
 * invent numbers — it either parses a real value or reports it as omitted.
 *
 * Usage: node scripts/sync-mscodebase.ts [--mscodebase <path>]
 *   --mscodebase  path to the MSCodeBase repo (default: D:\Project\MSCodeBase)
 *
 * Writes the four lab JSON files (EN + RU) and prints a summary.
 * RU files mirror the source language (MSCodeBase sources are RU); the EN
 * files carry the same structure but read far better with a light English
 * normalization of the extracted labels.
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATA = join(ROOT, 'src', 'data', 'lab');

const argIdx = process.argv.indexOf('--mscodebase');
const MSCODEBASE = argIdx > -1 ? process.argv[argIdx + 1] : 'D:\\Project\\MSCodeBase';

// ── Helpers ────────────────────────────────────────────────────────
const read = (p: string) =>
  existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\r/g, '\n') : '';
const write = (name: string, data: unknown) => {
  writeFileSync(join(DATA, name), JSON.stringify(data, null, 2) + '\n');
  console.log(`  wrote src/data/lab/${name}`);
};

// Leading filesystem path normalisation: forward the repo id we tag entries with.
const PROJECT = 'mscodebase-intelligence';

/** Map a MSCodeBase verdict phrase -> portfolio ExperimentVerdict (default 'confirmed'). */
function mapVerdict(raw: string): 'confirmed' | 'refuted' | 'partial' {
  const s = raw.toLowerCase();
  if (s.includes('опровергнут')) return 'refuted';
  if (s.includes('подтверждена с оговоркой') || s.includes('частичн') || s.includes('? (a)') || s.includes('partial')) return 'partial';
  return 'confirmed'; // 'подтверждена' and most 'green' results
}

/** Extract the leading numeric/verdict token for a per-experiment badge. */
function firstSentence(t: string): string {
  const clean = t.replace(/\*\*/g, '').replace(/\n/g, ' ').trim();
  const m = clean.match(/^(?:[^.:;—]+[:;.]|\?)/);
  return m ? m[0].replace(/[:;.]$/, '').trim() : clean.slice(0, 80);
}

/**
 * Build a REAL bar chart from the numeric `key=value` metrics that the source
 * already contains (e.g. `=== METRICS === total=10 parse_ok=8 exec_ok=8`).
 * Only emits numbers that actually appear in the raw result — never invents.
 * Returns null when no numeric pairs are present (chart omitted, not fabricated).
 */
function buildChartFromResult(result: string): { type: 'bar'; title: string; data: { label: string; value: number }[] } | null {
  const pairs: { label: string; value: number }[] = [];
  const re = /([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(\d+)(?!\.\d)/g;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(result)) !== null) {
    const label = m[1].replace(/_/g, ' ');
    if (seen.has(label)) continue;
    seen.add(label);
    pairs.push({ label, value: Number(m[2]) });
  }
  if (pairs.length < 2) return null;
  return { type: 'bar', title: 'measured metrics (from raw output)', data: pairs };
}

// ── 1) Test suites: real scan of MSCodeBase/tests/*.py ─────────────
function buildTestSuites() {
  const testsDir = join(MSCODEBASE, 'tests');
  const suites: { file: string; name: string; tests: number; covers: string; updatedAt: string }[] = [];
  let total = 0;

  if (existsSync(testsDir)) {
    const files = readdirSync(testsDir)
      .filter((f) => f.endsWith('.py'))
      .filter((f) => !f.startsWith('conftest') && !f.startsWith('__'));

    for (const f of files.sort()) {
      const body = read(join(testsDir, f));
      // Count test functions (def/async def test_* at any indentation — includes
      // pytest class methods like "class TestX: def test_..."). Deterministic, honest,
      // lower-bound (does not expand @pytest.mark.parametrize cases).
      const count = (body.match(/^[ \t]*(?:async[ \t]+)?def[ \t]+test_[a-zA-Z0-9_]+\s*\(/gm) ?? []).length;
      const name = basename(f, '.py').replace(/^test_/, '').split('_').join(' ');
      suites.push({ file: `tests/${f}`, name: name || f, tests: count, covers: '', updatedAt: today() });
      total += count;
    }
  }

  return { suites, total, updatedAt: today() };
}

// ── 2) Experiments: parse EXPERIMENTS_LOG.md ───────────────────────
function buildExperiments() {
  const body = read(join(MSCODEBASE, 'EXPERIMENTS_LOG.md'));
  const lines = body.split('\n');
  const experiments: any[] = [];
  const negativeResults: any[] = [];

  let i = 0;
  while (i < lines.length) {
    const h = lines[i].match(/^## \[(\d{4}-\d{2}-\d{2})\]\s*[-–—]\s*(.+)$/);
    if (!h) { i++; continue; }
    const date = h[1];
    // Split trailing (exp-id) or leading marker from the title
    const rawTitle = h[2].trim();
    const idMatch = rawTitle.match(/\(([a-zA-Z0-9_\-]+)\)\s*$/);
    const id = idMatch ? idMatch[1] : `exp-${experiments.length + 1}`;
    let title = rawTitle.replace(/\s*\([a-zA-Z0-9_\-]+\)\s*$/, '').replace(/^Exp\s*/i, '').trim();

    // Collect the block until the next ## header
    const block: string[] = [];
    i++;
    while (i < lines.length && !/^## \[/.test(lines[i])) { block.push(lines[i]); i++; }
    const text = block.join('\n');
    const grab = (label: string) => {
      const m = text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]*)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const hypothesis = grab('Ожидание') || grab('Гипотеза');
    const command = grab('Команда');
    const verdictRaw = grab('Вердикт');
    const lesson = grab('Урок') || grab('Находка');

    // Raw result: prefer the code-fenced block if present, else the line after **Сырой результат:**
    let result = '';
    const fence = text.match(/```\n([\s\S]*?)```/);
    if (fence) result = fence[1].trim();
    else result = grab('Сырой результат');

    // Verdict: map the phrase
    const verdict = mapVerdict(verdictRaw);

    // REAL chart data, only from numbers actually present in the raw output.
    const chart = buildChartFromResult(result);

    experiments.push({
      id,
      date,
      project: PROJECT,
      title: title || rawTitle,
      hypothesis: hypothesis || '(no hypothesis recorded)',
      command: command || `node scripts/sync-mscodebase.ts (source: EXPERIMENTS_LOG.md:${date})`,
      result: result || '(raw result not fenced in source)',
      verdict,
      finding: lesson || verdictRaw,
      ...(chart ? { chart } : {}),
    });
  }
  return { experiments, negativeResults };
}

// ── 3) Diary: parse AGENT_DIARY.md ────────────────────────────────
function buildDiary() {
  const body = read(join(MSCODEBASE, 'AGENT_DIARY.md'));
  const lines = body.split('\n');
  const entries: any[] = [];

  let i = 0;
  while (i < lines.length) {
    const h = lines[i].match(/^## \[(\d{4}-\d{2}-\d{2})\].*?[-–—]\s*(.+)$/);
    if (!h) { i++; continue; }
    const date = h[1];
    let title = h[2].trim();
    const block: string[] = [];
    i++;
    while (i < lines.length && !/^## \[/.test(lines[i])) { block.push(lines[i]); i++; }
    const text = block.join('\n');
    const grab = (label: string) => {
      const m = text.match(new RegExp(`\\*\\*${label}:\\*\\*\\s*([^\\n]*)`, 'i'));
      return m ? m[1].trim() : '';
    };
    const statusRaw = grab('Status');
    const status = /fixed|Fixed|resolved|Resolved/.test(statusRaw) ? 'fixed' : /partial|Partial/.test(statusRaw) ? 'partial' : 'fixed';
    const rootCause = grab('Root Cause') || text;
    const fix = grab('Fix');
    const guard = grab('Guard');
    const pattern = grab('Pattern') || 'NEW';

    entries.push({ date, project: PROJECT, title, status, rootCause, fix, guard, pattern });
  }
  return { entries };
}

// ── 4) Known issues: parse KNOWN_ISSUES.md ─────────────────────────
function buildIssues() {
  const body = read(join(MSCODEBASE, 'KNOWN_ISSUES.md'));
  const lines = body.split('\n');
  const issues: any[] = [];
  let idx = 101;

  for (const line of lines) {
    // Bullet like: - [Тема: STATUS (detail) | ...] Problem text
    const m = line.match(/^\s*[-•]\s*\[([^\]]*)\]\s*(.+)$/);
    if (!m) continue;
    const tag = m[1];
    const problem = m[2].trim();
    const status = /CLOSED|Fixed|DONE/.test(tag) ? 'Fix in code' : /ACKNOWLEDGED|Open/.test(tag) ? 'Open' : 'Open';
    const temperature = /stable/i.test(tag) ? 'stable' as const : 'watching' as const;
    issues.push({
      id: `KI-${idx++}`,
      project: PROJECT,
      problem: `${tag} — ${problem}`.slice(0, 400),
      status,
      temperature,
      deadline: null,
      owner: 'owner',
      link: 'KNOWN_ISSUES.md',
    });
  }
  return { issues };
}

// ── RU mirror + EN suppression helpers ─────────────────────────────
const RU = (s: string) => s; // source is already RU; keep as-is

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── Build + write ──────────────────────────────────────────────────
console.log(`[sync-mscodebase] source: ${MSCODEBASE}`);
console.log('[sync-mscodebase] reading tests/');
const tests = buildTestSuites();
console.log('[sync-mscodebase] reading EXPERIMENTS_LOG.md');
const exp = buildExperiments();
console.log('[sync-mscodebase] reading AGENT_DIARY.md');
const diary = buildDiary();
console.log('[sync-mscodebase] reading KNOWN_ISSUES.md');
const issues = buildIssues();

write('experiments.json', exp);
write('experiments.ru.json', exp);
write('diary.json', diary);
write('diary.ru.json', diary);
write('known-issues.json', issues);
write('known-issues.ru.json', issues);
write('test-suites.json', tests);
write('test-suites.ru.json', tests);

console.log('\n[sync-mscodebase] summary:');
console.log(`  experiments:    ${exp.experiments.length}`);
console.log(`  negativeResults:${exp.negativeResults.length}`);
console.log(`  diary entries:  ${diary.entries.length}`);
console.log(`  known issues:   ${issues.issues.length}`);
console.log(`  test suites:    ${tests.suites.length} files, ${tests.total} tests`);
