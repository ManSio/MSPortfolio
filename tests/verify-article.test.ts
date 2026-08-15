import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTool } from '../src/lib/mcp-tools';

/**
 * verify_article — Dev.to primary-source verification (15th tool).
 * All Dev.to responses are mocked; the live path is verified against the
 * deployed endpoint in the prod smoke.
 */

interface ArticleResult {
  query: string;
  available: boolean;
  found?: boolean;
  matches?: Array<{ title: string; reactions: number; url: string | null }>;
  totalArticles?: number;
  error?: string;
}

function stubDevTo(articles: Array<Record<string, unknown>>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
      expect(String(url)).toContain('dev.to/api/articles');
      expect(init.headers['User-Agent']).toBe('msp-portfolio-server');
      return new Response(JSON.stringify(articles), { status: 200, headers: { 'content-type': 'application/json' } });
    }),
  );
}

const callArticle = async (query: string): Promise<ArticleResult> => {
  const tool = getTool('verify_article');
  if (!tool) throw new Error('verify_article tool missing');
  return (await tool.execute({ query })) as ArticleResult;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verify_article — Dev.to primary-source verification', () => {
  it('finds a real article by title fragment with platform data', async () => {
    stubDevTo([
      { id: 1, title: 'What I learned building a long-lived AI agent', published_at: '2026-08-01T00:00:00Z', public_reactions_count: 14, comments_count: 28, url: 'https://dev.to/mansio/x', tag_list: ['ai', 'python'] },
      { id: 2, title: 'MCP-native portfolio', published_at: '2026-08-10T00:00:00Z', public_reactions_count: 5, comments_count: 2, url: 'https://dev.to/mansio/y', tag_list: ['mcp'] },
    ]);
    const res = await callArticle('long-lived AI agent');
    expect(res.available).toBe(true);
    expect(res.found).toBe(true);
    expect(res.matches?.[0]?.title).toContain('long-lived AI agent');
    expect(res.matches?.[0]?.reactions).toBe(14);
    expect(res.totalArticles).toBe(2);
  });

  it('honestly reports not found when the owner has no matching article', async () => {
    stubDevTo([{ id: 1, title: 'MCP-native portfolio', public_reactions_count: 5, comments_count: 2, url: 'https://dev.to/mansio/y', tag_list: ['mcp'] }]);
    const res = await callArticle('kubernetes disaster story');
    expect(res.available).toBe(true);
    expect(res.found).toBe(false);
    expect(res.matches).toEqual([]);
  });

  it('API failure degrades to an honest error, not a false negative', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('rate limited', { status: 429 })));
    const res = await callArticle('agent memory');
    expect(res.available).toBe(false);
    expect(res.error).toContain('429');
  });

  it('short query is refused without a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await callArticle('ab');
    expect(res.available).toBe(false);
    expect(res.error).toContain('too short');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
