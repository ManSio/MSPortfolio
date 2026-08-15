import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTool } from '../src/lib/mcp-tools';

/**
 * verify_repo — live GitHub verification (14th tool).
 *
 * Fetches the actual repo metadata from the GitHub API and cross-checks it with
 * the portfolio's curated project record (language/stack agreement). All GitHub
 * responses here are mocked; the live path is verified against the deployed
 * endpoint in the prod smoke.
 */

interface RepoResult {
  repo: string;
  available: boolean;
  exists?: boolean;
  fullName?: string;
  language?: string | null;
  portfolioProject?: {
    id: string;
    name: string;
    claimedLanguage: string;
    liveLanguage: string | null;
    languageMatches: boolean;
  } | null;
  readmeExcerpt?: string | null;
  error?: string;
  note?: string;
}

function stubGitHub(status: number, body: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
      expect(String(url)).toContain('https://api.github.com/repos/');
      expect(init.headers['User-Agent']).toBe('msp-portfolio-server');
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }),
  );
}

const callRepo = async (repo: string, readme?: boolean): Promise<RepoResult> => {
  const tool = getTool('verify_repo');
  if (!tool) throw new Error('verify_repo tool missing');
  return (await tool.execute({ repo, readme })) as RepoResult;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verify_repo — live GitHub verification', () => {
  it('bare repo name defaults to owner ManSio and cross-checks the portfolio project', async () => {
    stubGitHub(200, {
      full_name: 'ManSio/mscodebase-intelligence',
      language: 'Python',
      description: 'Async MCP server with hybrid search',
      topics: ['mcp', 'rag'],
      stargazers_count: 2,
      pushed_at: '2026-08-10T00:00:00Z',
      archived: false,
    });
    const res = await callRepo('mscodebase-intelligence');
    expect(res.available).toBe(true);
    expect(res.exists).toBe(true);
    expect(res.fullName).toBe('ManSio/mscodebase-intelligence');
    expect(res.language).toBe('Python');
    expect(res.portfolioProject).not.toBeNull();
    expect(res.portfolioProject?.id).toBe('mscodebase-intelligence');
    expect(res.portfolioProject?.languageMatches).toBe(true);
  });

  it('full owner/name input works', async () => {
    stubGitHub(200, { full_name: 'ManSio/gemma_agent', language: 'Python', topics: [], stargazers_count: 2 });
    const res = await callRepo('ManSio/gemma_agent');
    expect(res.exists).toBe(true);
    expect(res.fullName).toBe('ManSio/gemma_agent');
  });

  it('reports an honest language mismatch when live data contradicts the curated record', async () => {
    stubGitHub(200, { full_name: 'ManSio/mscodebase-intelligence', language: 'TypeScript', topics: [], stargazers_count: 2 });
    const res = await callRepo('mscodebase-intelligence');
    expect(res.portfolioProject?.languageMatches).toBe(false);
    expect(res.portfolioProject?.claimedLanguage).toBe('Python');
    expect(res.portfolioProject?.liveLanguage).toBe('TypeScript');
  });

  it('404 means the repository does not exist (honest answer)', async () => {
    stubGitHub(404, { message: 'Not Found' });
    const res = await callRepo('manSio/no-such-repo-xyz');
    expect(res.available).toBe(true);
    expect(res.exists).toBe(false);
    expect(res.note).toContain('not found');
  });

  it('rate limit (403/429) is reported honestly, not as a false negative', async () => {
    stubGitHub(403, { message: 'API rate limit exceeded' });
    const res = await callRepo('mscodebase-intelligence');
    expect(res.available).toBe(false);
    expect(res.error).toContain('rate limit');
  });

  it('network failure degrades to an honest error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ENOTFOUND'))));
    const res = await callRepo('mscodebase-intelligence');
    expect(res.available).toBe(false);
    expect(res.error).toContain('GitHub unreachable');
  });

  it('normalizes a github.com URL input', async () => {
    stubGitHub(200, { full_name: 'ManSio/mscodebase-intelligence', language: 'Python', topics: [], stargazers_count: 2 });
    const res = await callRepo('https://github.com/ManSio/mscodebase-intelligence');
    expect(res.exists).toBe(true);
    expect(res.fullName).toBe('ManSio/mscodebase-intelligence');
  });

  it('empty input returns an error without a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await callRepo('   ');
    expect(res.available).toBe(false);
    expect(res.error).toContain('Provide a repository name');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('readme:true also returns the actual README text (claims about what the repo does)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        if (String(url).includes('api.github.com')) {
          return new Response(
            JSON.stringify({ full_name: 'ManSio/mscodebase-intelligence', language: 'Python', topics: ['mcp'], stargazers_count: 2 }),
            { status: 200, headers: { 'content-type': 'application/json' } },
          );
        }
        if (String(url).includes('raw.githubusercontent.com')) {
          return new Response('# MSCodeBase Intelligence\n\nAn async MCP server for code search.', { status: 200 });
        }
        throw new Error(`unexpected url ${url}`);
      }),
    );
    const res = await callRepo('mscodebase-intelligence', true);
    expect(res.exists).toBe(true);
    expect(res.readmeExcerpt).toContain('MSCodeBase Intelligence');
    expect(res.readmeExcerpt).toContain('MCP server');
  });
});
