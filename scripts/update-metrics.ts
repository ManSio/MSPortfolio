/**
 * Refreshes public/metrics.json from the live GitHub API and commits it.
 * Runs in CI (GitHub Actions) on a schedule and on push. The commit message
 * contains "[skip ci]" so the refresh never re-triggers the deploy workflow.
 *
 * Usage: node scripts/update-metrics.ts
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TARGET = join(ROOT, 'public', 'metrics.json');
const OWNER = process.env.GH_OWNER ?? 'ManSio';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const headers = GITHUB_TOKEN ? { Authorization: `Bearer ${GITHUB_TOKEN}`, 'User-Agent': 'msp-portfolio-ci' } : { 'User-Agent': 'msp-portfolio-ci' };

async function gh(path: string) {
  const res = await fetch(`https://api.github.com${path}`, { headers });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
}

const [user, repos] = await Promise.all([
  gh(`/users/${OWNER}`),
  gh(`/users/${OWNER}/repos?per_page=100&sort=updated`),
]);

// Dev.to articles (public API, no auth).
let devto: { title: string; reading_time_minutes: number; url: string }[] = [];
try {
  const res = await fetch('https://dev.to/api/articles?username=mansio&per_page=6', { headers: { 'User-Agent': 'msp-portfolio-ci' } });
  if (res.ok) devto = (await res.json()) as typeof devto;
} catch {
  devto = [];
}

const snapshot = {
  fetchedAt: new Date().toISOString(),
  source: 'fallback' as const,
  user: {
    login: user.login,
    publicRepos: user.public_repos,
    followers: user.followers,
    following: user.following,
  },
  repos: repos
    .filter((r) => r.fork !== true)
    .map((r) => ({
      name: r.name,
      stars: r.stargazers_count ?? 0,
      forks: r.forks_count ?? 0,
      openIssues: r.open_issues_count ?? 0,
      pushedAt: r.pushed_at ?? '',
      language: r.language ?? null,
    })),
  npm: [],
  devto: devto.map((a) => ({
    title: a.title,
    readingTimeMinutes: a.reading_time_minutes ?? 0,
    url: a.url,
  })),
};

writeFileSync(TARGET, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`[metrics] wrote ${TARGET} (${repos.length} repos)`);

// Commit + push (only when a token is present, i.e. in CI).
if (GITHUB_TOKEN) {
  const git = (args: string[]) => execFileSync('git', args, { cwd: ROOT, stdio: 'pipe' });
  git(['add', 'public/metrics.json']);
  let hasChanges = true;
  try {
    git(['diff', '--cached', '--quiet']);
    hasChanges = false;
  } catch {
    hasChanges = true;
  }
  if (hasChanges) {
    try {
      git(['config', 'user.email', 'actions@github.com']);
      git(['config', 'user.name', 'metrics-bot']);
      git(['commit', '-m', 'chore: refresh metrics snapshot [skip ci]']);
      git(['push', 'origin', 'HEAD']);
      console.log('[metrics] committed and pushed');
    } catch (e) {
      console.error('[metrics] commit failed:', String(e));
      process.exitCode = 1;
    }
  } else {
    console.log('[metrics] no changes');
  }
}
