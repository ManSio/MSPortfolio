// Metric fetchers: GitHub / npm / Dev.to with localStorage cache (1h TTL)
// and graceful fallback to the committed static snapshot (public/metrics.json).
//
// GitHub unauthenticated limit is 60 req/h per IP — the cache plus the static
// fallback keep the dashboard alive even when the API rate-limits the visitor.

import { readCache, writeCache } from './cache';
import { STATS_ENDPOINT } from './config';
import type { DevToArticle, GithubRepoMetric, MetricsSnapshot } from './types';

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
  // Forks are someone else's work — never display them as the owner's projects.
  const repos: GithubRepoMetric[] = raw
    .filter((r) => r.fork !== true)
    .map((r) => ({
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

export async function getDevToArticles(username: string): Promise<DevToArticle[]> {
  const key = `devto:${username}`;
  const cached = readCache<DevToArticle[]>(key, TTL);
  if (cached) return cached.data;

  const data = await fetchJson<
    Array<{
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
    }>
  >(`https://dev.to/api/articles?username=${encodeURIComponent(username)}&per_page=6&state=published`);
  const mapped: DevToArticle[] = data.map((a) => ({
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
  }));
  writeCache(key, mapped);
  return mapped;
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

// ── Live MCP agent counter (worker /mcp/stats) ──

export interface McpStats {
  ok?: boolean;
  enabled?: boolean;
  today?: number;
  total?: number;
}

export async function getMcpStats(): Promise<McpStats | null> {
  try {
    const res = await fetch(STATS_ENDPOINT, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    return (await res.json()) as McpStats;
  } catch {
    return null;
  }
}
