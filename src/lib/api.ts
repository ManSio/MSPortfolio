// Metric fetchers: GitHub / npm / Dev.to with localStorage cache (1h TTL)
// and graceful fallback to the committed static snapshot (public/metrics.json).
//
// GitHub unauthenticated limit is 60 req/h per IP — the cache plus the static
// fallback keep the dashboard alive even when the API rate-limits the visitor.

import { readCache, writeCache } from './cache';
import type { GithubRepoMetric, MetricsSnapshot } from './types';

const TTL = 60 * 60 * 1000; // 1 hour

const GH_OWNER = 'ManSio';

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, {
    headers: { Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return (await res.json()) as T;
}

export async function getGithubUser() {
  const key = `github-user:${GH_OWNER}`;
  const cached = readCache<Awaited<ReturnType<typeof fetchGithubUser>>>(key, TTL);
  if (cached) return cached.data;

  const data = await fetchGithubUser();
  writeCache(key, data);
  return data;
}

interface GithubUser {
  login: string;
  public_repos: number;
  followers: number;
  following: number;
}

async function fetchGithubUser(): Promise<GithubUser> {
  return fetchJson<GithubUser>(`https://api.github.com/users/${GH_OWNER}`);
}

export async function getGithubRepos(): Promise<GithubRepoMetric[]> {
  const key = `github-repos:${GH_OWNER}`;
  const cached = readCache<GithubRepoMetric[]>(key, TTL);
  if (cached) return cached.data;

  const raw = await fetchJson<Array<Record<string, unknown>>>(
    `https://api.github.com/users/${GH_OWNER}/repos?per_page=100&sort=updated`,
  );
  const repos: GithubRepoMetric[] = raw.map((r) => ({
    name: String(r.name),
    stars: Number(r.stargazers_count ?? 0),
    forks: Number(r.forks_count ?? 0),
    openIssues: Number(r.open_issues_count ?? 0),
    pushedAt: String(r.pushed_at ?? ''),
    language: (r.language as string | null) ?? null,
  }));
  writeCache(key, repos);
  return repos;
}

export async function getNpmDownloads(pkg: string): Promise<number> {
  const key = `npm:${pkg}`;
  const cached = readCache<number>(key, TTL);
  if (cached) return cached.data;

  const data = await fetchJson<{ downloads: number }>(
    `https://api.npmjs.org/downloads/point/last-month/${encodeURIComponent(pkg)}`,
  );
  writeCache(key, data.downloads);
  return data.downloads;
}

export async function getDevToArticles(username: string) {
  const key = `devto:${username}`;
  const cached = readCache(key, TTL);
  if (cached) return cached.data as { title: string; reading_time_minutes: number; url: string }[];

  const data = await fetchJson<{ title: string; reading_time_minutes: number; url: string }[]>(
    `https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=3`,
  );
  writeCache(key, data);
  return data;
}

// ── Static fallback snapshot ──

export async function loadFallbackSnapshot(): Promise<MetricsSnapshot | null> {
  try {
    const res = await fetch(import.meta.env.BASE_URL + 'metrics.json', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as MetricsSnapshot;
  } catch {
    return null;
  }
}
