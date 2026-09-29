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
import { classifySnapshot } from './metrics-source.ts';

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

// Dev.to articles (public API, no auth). `state=published` is a real API
// param that changes the Varnish cache key — the plain list endpoint can serve
// stale copies for some egresses after publication.
let devto: {
  id?: number;
  title: string;
  description?: string;
  reading_time_minutes?: number;
  url: string;
  tag_list?: string[];
  public_reactions_count?: number;
  comments_count?: number;
  cover_image?: string | null;
  social_image?: string | null;
  readable_publish_date?: string;
}[] = [];
let devtoOk = false;
try {
  // per_page=8 (was 6): real param, busts stale dev.to Varnish entries and leaves headroom (2026-08-15)
  const res = await fetch('https://dev.to/api/articles?username=mansio&per_page=8&state=published', { headers: { 'User-Agent': 'msp-portfolio-ci' } });
  if (res.ok) {
    devto = (await res.json()) as typeof devto;
    devtoOk = true;
  } else {
    console.warn(`[metrics] dev.to answered ${res.status} - snapshot will be marked partial`);
  }
} catch (e) {
  console.warn('[metrics] dev.to unreachable - snapshot will be marked partial:', String(e));
}

// Commit history (top 3 per repo) — powers the get_commit_history MCP tool.
// Drops the cron snapshot noise so agents see real work, not bot commits.
const COMMIT_FILTER = /^chore: refresh metrics snapshot|\[skip ci\]/;
let commitsOk = 0;
const commitLists = await Promise.all(
  repos.map(async (r) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${OWNER}/${r.name}/commits?per_page=3`, { headers });
      if (!res.ok) return [];
      commitsOk += 1;
      const data = (await res.json()) as Array<{ sha: string; commit: { message: string; author?: { name?: string; date?: string } } }>;
      return data
        .filter((c) => !COMMIT_FILTER.test(c.commit.message))
        .map((c) => ({
          repo: r.name,
          sha: c.sha.slice(0, 10),
          date: c.commit.author?.date ?? '',
          message: c.commit.message.split('\n')[0],
          author: c.commit.author?.name ?? '',
        }));
    } catch {
      return [];
    }
  }),
);
const commits = commitLists.flat().slice(0, 30);

// A silent `return []` above is indistinguishable from "no commits" for the
// reader, so the degradation is recorded in the snapshot itself (KI-021).
const source = classifySnapshot({ github: true, devto: devtoOk, commitsOk, commitsTotal: repos.length });
if (source !== 'live') {
  console.warn(`[metrics] degraded sources: devto=${devtoOk} commits=${commitsOk}/${repos.length} -> source=${source}`);
}

const snapshot = {
  fetchedAt: new Date().toISOString(),
  source,
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
    id: a.id,
    title: a.title,
    description: a.description ?? '',
    readingTimeMinutes: a.reading_time_minutes ?? 0,
    url: a.url,
    tags: Array.isArray(a.tag_list) ? a.tag_list : [],
    reactions: a.public_reactions_count ?? 0,
    comments: a.comments_count ?? 0,
    coverImage: a.cover_image ?? null,
    socialImage: a.social_image ?? null,
    readablePublishDate: a.readable_publish_date ?? '',
  })),
  commits,
};

writeFileSync(TARGET, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`[metrics] wrote ${TARGET} (${repos.length} repos, source=${source}, commits=${commitsOk}/${repos.length} repos, devto=${devto.length})`);

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
      // Non-fatal on purpose. The snapshot file itself is already written
      // above and the deploy ships it in dist/, so the site is correct
      // regardless of whether this bookkeeping commit lands. Failing the
      // process here broke the whole deploy: once main is protected the bot
      // push is rejected, which killed the "Refresh metrics snapshot" step
      // and with it the site. Surfaced as a warning instead — visible in the
      // log, no longer able to take the deploy down.
      console.warn('[metrics] commit/push failed (non-fatal, deploy unaffected):', String(e));
    }
  } else {
    console.log('[metrics] no changes');
  }
}
