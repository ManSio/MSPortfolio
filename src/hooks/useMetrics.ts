import { useEffect, useState } from 'react';
import { getDevToArticles, getGithubRepos, getGithubUser, loadFallbackSnapshot } from '../lib/api';
import type { GithubRepoMetric, MetricsSnapshot } from '../lib/types';

export interface MetricsState {
  status: 'loading' | 'live' | 'fallback' | 'error';
  snapshot: MetricsSnapshot | null;
  error?: string;
}

/**
 * Tries live GitHub + Dev.to APIs (cached 1h), then the committed static snapshot.
 * The dashboard must never be blank: rate-limited visitors get the snapshot.
 */
export function useMetrics(): MetricsState {
  const [state, setState] = useState<MetricsState>({ status: 'loading', snapshot: null });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [user, repos, devtoRaw] = await Promise.all([
          getGithubUser(),
          getGithubRepos(),
          getDevToArticles('mansio').catch(() => [] as { title: string; reading_time_minutes: number; url: string }[]),
        ]);
        if (cancelled) return;
        const live: MetricsSnapshot = {
          fetchedAt: new Date().toISOString(),
          source: 'live',
          user: {
            login: String(user.login),
            publicRepos: Number(user.public_repos),
            followers: Number(user.followers),
            following: Number(user.following),
          },
          repos: repos as GithubRepoMetric[],
          npm: [],
          devto: devtoRaw.map((a) => ({
            title: a.title,
            readingTimeMinutes: Number(a.reading_time_minutes ?? 0),
            url: a.url,
          })),
        };
        setState({ status: 'live', snapshot: live });
      } catch {
        const fallback = await loadFallbackSnapshot();
        if (cancelled) return;
        if (fallback) {
          setState({ status: 'fallback', snapshot: fallback });
        } else {
          setState({ status: 'error', snapshot: null, error: 'Metrics unavailable (rate-limited and no snapshot).' });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
