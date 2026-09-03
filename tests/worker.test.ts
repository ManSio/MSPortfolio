import { describe, expect, it } from 'vitest';
import worker from '../worker/index';

const BASE = 'https://msp-portfolio.mansio-dev.workers.dev';

interface Env {
  ALLOWED_ORIGINS?: string;
  MCP_RATE_LIMITER?: { limit(args: { key: string }): Promise<{ success: boolean }> };
  CHAT_RATE_LIMITER?: { limit(args: { key: string }): Promise<{ success: boolean }> };
  ANALYTICS?: { writeDataPoint(data: unknown): void };
}

function makeEnv(overrides: Partial<Env> = {}): Env {
  return { ALLOWED_ORIGINS: 'https://mansio.github.io', ...overrides };
}

/** Extract the first `data:` payload from a Streamable HTTP response. */
function ssePayload(text: string): Record<string, any> {
  const line = text.split('\n').find((l) => l.startsWith('data:'));
  if (!line) throw new Error(`no SSE data line in: ${text.slice(0, 200)}`);
  return JSON.parse(line.slice(5));
}

function postMcp(env: Env, body: unknown, headers: Record<string, string> = {}) {
  return worker.fetch(
    new Request(`${BASE}/mcp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', ...headers },
      body: JSON.stringify(body),
    }),
    env as never,
  );
}

describe('worker /mcp integration', () => {
  it('tools/list exposes 18 tools with readOnlyHint annotations', async () => {
    const res = await postMcp(makeEnv(), { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(200);
    const payload = ssePayload(await res.text());
    const tools = payload.result.tools as Array<{ name: string; annotations?: { readOnlyHint?: boolean; openWorldHint?: boolean } }>;
    expect(tools).toHaveLength(18);
    for (const t of tools) {
      expect(t.annotations?.readOnlyHint, `readOnlyHint missing on ${t.name}`).toBe(true);
    }
    const articles = tools.find((t) => t.name === 'get_articles');
    expect(articles?.annotations?.openWorldHint).toBe(true);
    const commits = tools.find((t) => t.name === 'get_commit_history');
    expect(commits?.annotations?.openWorldHint).toBe(true);
    const antipatterns = tools.find((t) => t.name === 'get_antipatterns');
    expect(antipatterns?.annotations?.openWorldHint).toBe(false);
  });

  it('health is not rate limited and returns tool names', async () => {
    const env = makeEnv({
      MCP_RATE_LIMITER: {
        limit: async () => {
          throw new Error('rate limiter must not be called for /mcp/health');
        },
      },
    });
    const res = await worker.fetch(new Request(`${BASE}/mcp/health`), env as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; tools: string[] };
    expect(body.ok).toBe(true);
    expect(body.tools).toContain('simulate_architecture');
  });

  it('/mcp/stats returns daily and total counters from KV', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const kv = new Map<string, string>([
      [`calls:${date}`, '7'],
      ['calls:total', '42'],
    ]);
    const env = makeEnv({ MCP_STATS: { get: async (k) => kv.get(k) ?? null, put: async () => {} } });
    const res = await worker.fetch(new Request(`${BASE}/mcp/stats`), env as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { enabled: boolean; today: number; total: number };
    expect(body.enabled).toBe(true);
    expect(body.today).toBe(7);
    expect(body.total).toBe(42);
  });

  it('/mcp/stats reports disabled without the KV binding', async () => {
    const res = await worker.fetch(new Request(`${BASE}/mcp/stats`), makeEnv() as never);
    const body = (await res.json()) as { enabled: boolean; today: number; total: number };
    expect(body.enabled).toBe(false);
    expect(body.today).toBe(0);
  });

  it('/mcp/live returns today/total and recent invocations from KV', async () => {
    const date = new Date().toISOString().slice(0, 10);
    const ts = new Date().toISOString();
    const kv = new Map<string, string>([
      [`calls:${date}`, '3'],
      ['calls:total', '11'],
      ['recent:calls', JSON.stringify([{ ts, tool: 'get_profile' }, { ts, tool: 'verify_claim' }])],
    ]);
    const env = makeEnv({ MCP_STATS: { get: async (k) => kv.get(k) ?? null, put: async () => {} } });
    const res = await worker.fetch(new Request(`${BASE}/mcp/live`), env as never);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { enabled: boolean; today: number; total: number; recent: { ts: string; tool: string }[] };
    expect(body.enabled).toBe(true);
    expect(body.today).toBe(3);
    expect(body.total).toBe(11);
    expect(body.recent).toHaveLength(2);
    expect(body.recent[0].tool).toBe('get_profile');
  });

  it('/mcp/live reports disabled without the KV binding', async () => {
    const res = await worker.fetch(new Request(`${BASE}/mcp/live`), makeEnv() as never);
    const body = (await res.json()) as { enabled: boolean; recent: unknown[] };
    expect(body.enabled).toBe(false);
    expect(body.recent).toEqual([]);
  });

  it('increments the agent counter on tools/call (best-effort, fire-and-forget)', async () => {
    const kv = new Map<string, string>();
    const env = makeEnv({
      MCP_STATS: {
        get: async (k) => kv.get(k) ?? null,
        put: async (k, v) => {
          kv.set(k, v);
        },
      },
    });
    const res = await postMcp(env, { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'get_profile', arguments: {} } });
    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50)); // counter bump is async fire-and-forget
    const date = new Date().toISOString().slice(0, 10);
    expect(kv.get(`calls:${date}`)).toBe('1');
    expect(kv.get('calls:total')).toBe('1');
  });

  it('does not count tools/list against the agent counter', async () => {
    const kv = new Map<string, string>();
    const env = makeEnv({
      MCP_STATS: {
        get: async (k) => kv.get(k) ?? null,
        put: async (k, v) => {
          kv.set(k, v);
        },
      },
    });
    await postMcp(env, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    await new Promise((r) => setTimeout(r, 50));
    const hasCounterKeys = [...kv.keys()].some((k) => k.startsWith('calls:'));
    expect(hasCounterKeys).toBe(false);
  });

  it('returns 429 when the rate limit is exceeded', async () => {
    const env = makeEnv({
      MCP_RATE_LIMITER: { limit: async () => ({ success: false }) },
    });
    const res = await postMcp(env, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(429);
  });

  it('passes the request through when the rate limit allows it', async () => {
    const calls: string[] = [];
    const env = makeEnv({
      MCP_RATE_LIMITER: {
        limit: async (args) => {
          calls.push(args.key);
          return { success: true };
        },
      },
    });
    const res = await postMcp(env, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(200);
    expect(calls.length).toBe(1);
    expect(calls[0]).toContain('/mcp|');
  });

  it('returns 429 on /chat when the chat rate limit is exceeded', async () => {
    const env = makeEnv({
      CHAT_RATE_LIMITER: { limit: async () => ({ success: false }) },
      OPENROUTER_API_KEY: 'test-key',
    });
    const res = await worker.fetch(
      new Request(`${BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: 'hi' }] }),
      }),
      env as never,
    );
    expect(res.status).toBe(429);
  });

  it('adds security headers to every response', async () => {
    const res = await worker.fetch(new Request(`${BASE}/mcp/health`), makeEnv() as never);
    expect(res.headers.get('x-content-type-options')).toBe('nosniff');
    expect(res.headers.get('x-frame-options')).toBe('DENY');
    expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  });

  it('CORS: allows configured browser origins, denies strangers', async () => {
    const allowed = await worker.fetch(
      new Request(`${BASE}/mcp`, { method: 'OPTIONS', headers: { Origin: 'https://mansio.github.io', 'Access-Control-Request-Method': 'POST' } }),
      makeEnv() as never,
    );
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('access-control-allow-origin')).toBe('https://mansio.github.io');

    const evil = await worker.fetch(
      new Request(`${BASE}/mcp`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }),
      makeEnv() as never,
    );
    expect(evil.headers.get('access-control-allow-origin')).toBeNull();
  });

  it('unknown path returns 404', async () => {
    const res = await worker.fetch(new Request(`${BASE}/nope`), makeEnv() as never);
    expect(res.status).toBe(404);
  });

  it('/resume.txt renders a plain-text CV from the same tools (D2)', async () => {
    const res = await worker.fetch(new Request(`${BASE}/resume.txt`), makeEnv() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('Mikhail');
    expect(text).toContain('AI / Backend Engineer');
    expect(text).toContain('## Projects');
    expect(text).toContain('MSCodeBase Intelligence');
    expect(text).toContain('/mcp');
  });

  it('/llms.txt describes the server and its tools (D2/D5)', async () => {
    const res = await worker.fetch(new Request(`${BASE}/llms.txt`), makeEnv() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/plain');
    const text = await res.text();
    expect(text).toContain('/mcp');
    expect(text).toContain('simulate_architecture');
    expect(text).toContain('get_profile');
    expect(text).toContain('resume.txt');
  });

  it('/resume.txt and /llms.txt reject non-GET methods', async () => {
    const post = await worker.fetch(new Request(`${BASE}/resume.txt`, { method: 'POST' }), makeEnv() as never);
    expect(post.status).toBe(405);
    const put = await worker.fetch(new Request(`${BASE}/llms.txt`, { method: 'PUT' }), makeEnv() as never);
    expect(put.status).toBe(405);
  });

  it('adversarial: malformed JSON body is rejected', async () => {
    const res = await worker.fetch(
      new Request(`${BASE}/mcp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
        body: '{not json',
      }),
      makeEnv() as never,
    );
    expect(res.status).toBe(400);
  });

  it('adversarial: unknown tool returns an error, not a crash', async () => {
    const res = await postMcp(makeEnv(), { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'nope', arguments: {} } });
    const payload = ssePayload(await res.text());
    const hasError = Boolean(payload.error) || Boolean(payload.result?.isError);
    expect(hasError).toBe(true);
  });

  it('adversarial: unknown method returns a JSON-RPC error', async () => {
    const res = await postMcp(makeEnv(), { jsonrpc: '2.0', id: 3, method: 'bogus/method' });
    const payload = ssePayload(await res.text());
    expect(payload.error).toBeTruthy();
  });

  it('quota (D4): adds X-RateLimit headers on successful /mcp POST', async () => {
    const kv = new Map<string, string>();
    const env = makeEnv({ MCP_STATS: { get: async (k) => kv.get(k) ?? null, put: async (k, v) => { kv.set(k, v); } } });
    const res = await postMcp(env, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(200);
    expect(res.headers.get('x-ratelimit-limit')).toBe('100');
    expect(res.headers.get('x-ratelimit-remaining')).toBe('99');
  });

  it('quota (D4): returns 429 when the anonymous monthly quota is exceeded', async () => {
    const env = makeEnv({
      MCP_STATS: { get: async (k) => (k.startsWith('quota:') ? '100' : null), put: async () => {} },
    });
    const res = await postMcp(env, { jsonrpc: '2.0', id: 1, method: 'tools/list' });
    expect(res.status).toBe(429);
    expect(res.headers.get('x-ratelimit-remaining')).toBe('0');
  });

  it('/openapi.json (D5): valid OpenAPI doc describing /mcp and listing 18 tools', async () => {
    const res = await worker.fetch(new Request(`${BASE}/openapi.json`), makeEnv() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const doc = (await res.json()) as { openapi: string; paths: Record<string, unknown>; 'x-mcp-tools'?: unknown[] };
    expect(doc.openapi).toBe('3.0.3');
    expect(doc.paths['/mcp']).toBeTruthy();
    expect(doc.paths['/resume.txt']).toBeTruthy();
    expect(doc['x-mcp-tools']).toHaveLength(18);
  });

  it('/.well-known/mcp.json exposes the MCP discovery document', async () => {
    const res = await worker.fetch(new Request(`${BASE}/.well-known/mcp.json`), makeEnv() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const doc = (await res.json()) as { name: string; endpoints: Array<{ url: string; transport: string }> };
    expect(doc.name).toBe('MSPortfolio');
    expect(doc.endpoints[0].transport).toBe('streamable-http');
    expect(doc.endpoints[0].url).toBe(`${BASE}/mcp`);
  });

  it('/api/* serves the single-source-of-truth data files (no fork)', async () => {
    const res = await worker.fetch(new Request(`${BASE}/api/projects`), makeEnv() as never);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const body = (await res.json()) as { projects: Array<{ name: string }> };
    expect(body.projects.length).toBeGreaterThan(0);
    expect(body.projects[0].name).toBeTruthy();
  });

  it('/api/* 404s with a helpful list for unknown resources', async () => {
    const res = await worker.fetch(new Request(`${BASE}/api/nope`), makeEnv() as never);
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string; available: string[] };
    expect(body.error).toBe('unknown resource');
    expect(body.available).toContain('projects');
  });

  it('/.well-known/mcp.json and /api/* reject non-GET methods', async () => {
    const wk = await worker.fetch(new Request(`${BASE}/.well-known/mcp.json`, { method: 'POST' }), makeEnv() as never);
    expect(wk.status).toBe(405);
    const api = await worker.fetch(new Request(`${BASE}/api/projects`, { method: 'PUT' }), makeEnv() as never);
    expect(api.status).toBe(405);
  });

  it('concurrency: 8 parallel tools/call return the correct result per filter', async () => {
    const filters = ['all', 'mcp', 'python', 'typescript', 'mcp', 'python', 'typescript', 'all'];
    const results = await Promise.all(
      filters.map((filter, i) =>
        postMcp(makeEnv(), {
          jsonrpc: '2.0',
          id: 100 + i,
          method: 'tools/call',
          params: { name: 'get_projects', arguments: { filter } },
        }).then(async (r) => ({ filter, payload: ssePayload(await r.text()) })),
      ),
    );
    for (const { filter, payload } of results) {
      const content = payload.result?.content?.[0];
      expect(content, `no content for filter=${filter}`).toBeTruthy();
      const parsed = JSON.parse(content.text) as { count: number; projects: Array<{ stack: string[] }> };
      if (filter === 'all') {
        expect(parsed.count).toBeGreaterThanOrEqual(3);
      } else {
        expect(parsed.count).toBeGreaterThan(0);
        for (const p of parsed.projects) {
          expect(p.stack.map((s) => s.toLowerCase())).toContain(filter);
        }
      }
    }
  });
});
