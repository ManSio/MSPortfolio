import { useEffect, useState } from 'react';
import { getDevToArticles, getGithubRepos, getGithubUser, loadFallbackSnapshot } from '../lib/api';
import { FALLBACK_ARTICLES } from '../data/articles';
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
      // Snapshot first — it's the guaranteed fallback for both GitHub and Dev.to
      const fallback = await loadFallbackSnapshot().catch(() => null);
      try {
        const [user, repos, devto] = await Promise.all([
          getGithubUser(),
          getGithubRepos(),
          getDevToArticles('mansio').catch(() => []),
        ]);
        if (cancelled) return;
        // Layered fallback: live Dev.to -> snapshot -> bundled copy (never empty)
        const articles =
          devto.length > 0 ? devto : fallback?.devto?.length ? fallback.devto : FALLBACK_ARTICLES;
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
          devto: articles,
          commits: [], // frontend doesn't consume commits — the MCP tool reads the committed snapshot
        };
        setState({ status: 'live', snapshot: live });
      } catch {
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
