import { useEffect, useState } from 'react';
import { getDevToArticles, getGithubRepos, getGithubUser, loadFallbackSnapshot } from '../lib/api';
import { FALLBACK_ARTICLES } from '../data/articles';
import type { GithubRepoMetric, MetricsSnapshot } from '../lib/types';

export interface MetricsState {
  status: 'loading' | 'live' | 'partial' | 'fallback' | 'error';
  snapshot: MetricsSnapshot | null;
  error?: string;
}

/**
 * A `partial` source is not the same as a fallback for a visitor: the GitHub
 * numbers still came from GitHub, so the dashboard stays interactive. Only a
 * full fallback clears the live path.
 */
export function isLiveCall(status: MetricsState['status']): boolean {
  return status === 'live' || status === 'partial';
}

/**
 * GitHub is always fetched live on this path, so the only question is the
 * articles: live Dev.to, then the committed snapshot, then the bundled copy.
 * The last one is not even a snapshot, hence `fallback` rather than `partial`.
 */
export function resolveSource(devtoCount: number, snapshotArticleCount: number): MetricsSnapshot['source'] {
  if (devtoCount > 0) return 'live';
  return snapshotArticleCount > 0 ? 'partial' : 'fallback';
}

/**
 * What the freshness badge is allowed to claim. The committed file's own
 * `source` describes how that file was produced, not how fresh it is for this
 * visitor: a snapshot captured while live would otherwise announce "Live" to
 * someone reading a static file.
 */
export function displayedSource(status: MetricsState['status'], snapshotSource?: MetricsSnapshot['source']): MetricsSnapshot['source'] {
  if (!isLiveCall(status)) return 'fallback';
  return snapshotSource ?? 'fallback';
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
        // The GitHub half always comes from a live call here, but the articles
        // may not. Stamping `live` over a half-substituted payload is the same
        // lie KI-021 found in the snapshot, only on the client, and the badge
        // is the one thing a visitor can check the numbers against.
        const source = resolveSource(devto.length, fallback?.devto?.length ?? 0);
        const live: MetricsSnapshot = {
          fetchedAt: new Date().toISOString(),
          source,
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
        setState({ status: source === 'fallback' ? 'fallback' : source, snapshot: live });
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
