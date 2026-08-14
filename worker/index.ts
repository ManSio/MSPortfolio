/**
 * MSPortfolio MCP server for Cloudflare Workers.
 *
 * GitHub Pages is static-only, so the MCP endpoint needs a process host.
 * Workers is the zero-ops option: same tools as the Node server and the
 * browser demo (`src/lib/mcp-tools.ts`), served at a public URL like
 * https://msp-portfolio.<your-subdomain>.workers.dev/mcp
 *
 * The SDK's `createMcpHandler` returns a web-standard (Request) => Response
 * handler, so no Node adapter is needed here — this is the workerd-native path
 * (the SDK ships workerd shims and is tested on Cloudflare Workers upstream).
 *
 * Local test (no Cloudflare account needed):
 *   node -e "import('./worker/index.ts').then(m=>m.default.fetch(new Request('http://x/mcp/health')).then(r=>r.text().then(console.log)))"
 *
 * Deploy:
 *   pnpm cf:deploy        (wrangler deploy)
 */
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { getTool, TOOLS } from '../src/lib/mcp-tools.ts';

const NAME = 'msp-portfolio';
const VERSION = '1.0.0';

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: NAME, version: VERSION });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: z.fromJSONSchema(tool.inputSchema), annotations: tool.annotations },
      async (args) => {
        try {
          const result = await tool.execute(args as Record<string, unknown>);
          return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
        } catch (err) {
          return {
            content: [{ type: 'text', text: `Tool error: ${err instanceof Error ? err.message : String(err)}` }],
            isError: true,
          };
        }
      },
    );
  }
  return server;
});

interface RateLimiter {
  limit(args: { key: string }): Promise<{ success: boolean }>;
}

interface AnalyticsEngine {
  writeDataPoint(data: { blobs?: string[]; doubles?: number[]; indexes?: string[] }): void;
}

interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string): Promise<void>;
}

interface ExecutionContextLike {
  waitUntil(promise: Promise<unknown>): void;
}

interface Env {
  /** Comma-separated browser origins allowed to call /mcp (e.g. https://mansio.github.io) */
  ALLOWED_ORIGINS?: string;
  /** Optional server-side OpenRouter key for the /chat agent demo. */
  OPENROUTER_API_KEY?: string;
  /** OpenRouter model id (default: a free model with function calling). */
  OPENROUTER_MODEL?: string;
  /** CF Rate Limiting API binding for /mcp (wrangler.toml [[ratelimits]]). Absent in local tests. */
  MCP_RATE_LIMITER?: RateLimiter;
  /** CF Rate Limiting API binding for /chat. Absent in local tests. */
  CHAT_RATE_LIMITER?: RateLimiter;
  /** CF Analytics Engine binding for /mcp telemetry (dataset auto-creates on first write). */
  ANALYTICS?: AnalyticsEngine;
  /** CF KV namespace for the agent counter (wrangler.toml [[kv_namespaces]]). */
  MCP_STATS?: KVNamespaceLike;
}

const CORS_ALLOW_HEADERS =
  'content-type,accept,mcp-session-id,mcp-protocol-version,last-event-id';
const CORS_EXPOSE_HEADERS = 'mcp-session-id,mcp-protocol-version';

function corsHeaders(origins: string[], requestOrigin: string | null): Record<string, string> {
  if (!requestOrigin || origins.length === 0) return {};
  if (origins.includes('*') || origins.includes(requestOrigin)) {
    return {
      'Access-Control-Allow-Origin': requestOrigin,
      'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': CORS_ALLOW_HEADERS,
      'Access-Control-Expose-Headers': CORS_EXPOSE_HEADERS,
      'Access-Control-Max-Age': '86400',
    };
  }
  return {};
}

const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
};

/** Applies security + CORS headers to a response (preserves existing headers). */
function finalize(res: Response, cors: Record<string, string>): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) headers.set(k, v);
  for (const [k, v] of Object.entries(cors)) headers.set(k, v);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

/** Returns a 429 Response when the per-IP+path limit is exceeded, else null. */
async function enforceRateLimit(env: Env, pathname: string, request: Request): Promise<Response | null> {
  const limiter = pathname === '/chat' ? env.CHAT_RATE_LIMITER : env.MCP_RATE_LIMITER;
  if (!limiter) return null; // binding absent (local tests / misconfig) — fail open
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  const { success } = await limiter.limit({ key: `${pathname}|${ip}` });
  if (!success) return new Response(`Rate limit exceeded for ${pathname}`, { status: 429 });
  return null;
}

/** Best-effort, non-atomic daily/total counter (KV is eventually consistent). */
async function bumpAgentCounter(stats: KVNamespaceLike): Promise<void> {
  try {
    const date = new Date().toISOString().slice(0, 10);
    const todayKey = `calls:${date}`;
    const [todayRaw, totalRaw] = await Promise.all([stats.get(todayKey), stats.get('calls:total')]);
    await Promise.all([
      stats.put(todayKey, String((Number(todayRaw) || 0) + 1)),
      stats.put('calls:total', String((Number(totalRaw) || 0) + 1)),
    ]);
  } catch {
    // best-effort — a failed counter write must never fail the request
  }
}

const CHAT_MODEL_CHAIN = [
  // The free router picks a random free model — great for distributing load;
  // the specific models below are fallbacks when the pick is rate-limited.
  'openrouter/free',
  'google/gemma-4-31b-it:free',
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openai/gpt-oss-20b:free',
  'poolside/laguna-s-2.1:free',
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const CHAT_SYSTEM_PROMPT = `You are the interactive CV of Mikhail (ManSio), an AI/Backend engineer who builds MCP-native tooling.

Rules:
- Answer questions about his experience using ONLY the provided tools (get_projects, get_engineering_principles, analyze_stack, simulate_architecture, get_timeline, get_articles, get_commit_history, get_antipatterns, get_profile).
- NEVER invent projects, metrics, links or facts that the tools did not return.
- If the tools return nothing relevant, say that honestly instead of guessing.
- Be concise (3-6 sentences). Answer in the language the user wrote in (RU or EN).
- You may call several tools in sequence to compose a full answer.`;

interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content?: string;
  tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

interface ChatStep {
  type: 'tool_call' | 'tool_result';
  name: string;
  args?: unknown;
  result?: unknown;
}

function openAiTools() {
  return TOOLS.map((t) => ({
    type: 'function',
    function: { name: t.name, description: t.description, parameters: t.inputSchema },
  }));
}

function parseArgs(raw: string | undefined): unknown {
  try {
    return JSON.parse(raw ?? '{}');
  } catch {
    return {};
  }
}

interface ChatCompletionResponse {
  choices?: Array<{ message?: ChatMessage }>;
}

async function runAgentWithModel(apiKey: string, model: string, history: ChatMessage[]): Promise<{ steps: ChatStep[]; answer: string; model: string }> {
  const messages: ChatMessage[] = [{ role: 'system', content: CHAT_SYSTEM_PROMPT }, ...history];
  const steps: ChatStep[] = [];
  let response: ChatCompletionResponse | null = null;

  for (let round = 0; round < 5; round++) {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://mansio.github.io/MSPortfolio/',
        'X-Title': 'MSPortfolio agent demo',
      },
      body: JSON.stringify({
        model,
        messages,
        tools: openAiTools(),
        tool_choice: 'auto',
        temperature: 0.3,
      }),
      signal: AbortSignal.timeout(90000),
    });
    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      throw new Error(`OpenRouter ${res.status}: ${text}`);
    }
    response = (await res.json()) as ChatCompletionResponse;
    const msg = response?.choices?.[0]?.message;
    const toolCalls = msg?.tool_calls;
    if (!toolCalls || toolCalls.length === 0) break;

    messages.push({ role: 'assistant', content: msg?.content ?? '', tool_calls: toolCalls });
    for (const call of toolCalls) {
      const name = call.function?.name ?? '?';
      const args = parseArgs(call.function?.arguments);
      const tool = getTool(name);
      let result: unknown = { error: `Unknown tool: ${name}` };
      if (tool) {
        try {
          result = await tool.execute((args ?? {}) as Record<string, unknown>);
        } catch (e) {
          result = { error: e instanceof Error ? e.message : String(e) };
        }
      }
      steps.push({ type: 'tool_call', name, args });
      steps.push({ type: 'tool_result', name, result });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
  }

  return { steps, answer: response?.choices?.[0]?.message?.content ?? '', model };
}

/** Try each model in the chain; retry on rate-limit/5xx and free-router 4xx,
 * fail fast only on auth errors (401/403 = bad key). */
async function runAgentLoop(apiKey: string, models: string[], history: ChatMessage[]): Promise<{ steps: ChatStep[]; answer: string; model: string }> {
  let lastError: Error | null = null;
  for (const model of models) {
    try {
      return await runAgentWithModel(apiKey, model, history);
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      lastError = err;
      if (/401|403/.test(err.message)) throw err; // bad key — no point trying other models
      await sleep(1200);
    }
  }
  throw lastError ?? new Error('all chat models failed');
}

async function handleChat(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const body = (await request.json().catch(() => null)) as { messages?: ChatMessage[]; apiKey?: string } | null;
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return Response.json({ error: 'messages[] is required' }, { status: 400 });
  }

  const apiKey = typeof body.apiKey === 'string' && body.apiKey.trim() ? body.apiKey.trim() : (env.OPENROUTER_API_KEY ?? '');
  if (!apiKey) {
    return Response.json(
      { error: 'No API key: set OPENROUTER_API_KEY on the worker or send one from the browser.' },
      { status: 400 },
    );
  }

  const configured = env.OPENROUTER_MODEL;
  const models = configured
    ? [configured, ...CHAT_MODEL_CHAIN.filter((m) => m !== configured)]
    : CHAT_MODEL_CHAIN;
  const history: ChatMessage[] = body.messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant'));
  const { steps, answer, model } = await runAgentLoop(apiKey, models, history);
  return Response.json({ model, steps, answer });
}

export default {
  async fetch(request: Request, env: Env, ctx?: ExecutionContextLike): Promise<Response> {
    const url = new URL(request.url);

    const origins = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origins, origin);

    if (url.pathname === '/mcp/health') {
      return finalize(
        Response.json({
          ok: true,
          name: NAME,
          version: VERSION,
          tools: TOOLS.map((t) => t.name),
          chatConfigured: Boolean(env.OPENROUTER_API_KEY),
        }),
        cors,
      );
    }

    if (url.pathname === '/mcp/stats') {
      const stats = env.MCP_STATS;
      let today = 0;
      let total = 0;
      if (stats) {
        try {
          const date = new Date().toISOString().slice(0, 10);
          const [t, tot] = await Promise.all([stats.get(`calls:${date}`), stats.get('calls:total')]);
          today = Number(t) || 0;
          total = Number(tot) || 0;
        } catch {
          // counters unavailable — report zeros
        }
      }
      return finalize(Response.json({ ok: true, enabled: Boolean(stats), today, total }), cors);
    }

    if (url.pathname === '/chat') {
      if (request.method === 'OPTIONS') return finalize(new Response(null, { status: 204 }), cors);
      const limited = await enforceRateLimit(env, '/chat', request);
      if (limited) return finalize(limited, cors);
      try {
        const res = await handleChat(request, env);
        return finalize(res, cors);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        return finalize(Response.json({ error: `chat failed: ${msg}` }, { status: 500 }), cors);
      }
    }

    if (url.pathname !== '/mcp') {
      return finalize(new Response('Not found', { status: 404 }), cors);
    }

    if (request.method === 'OPTIONS') {
      return finalize(new Response(null, { status: 204 }), cors);
    }

    // Fire-and-forget telemetry + agent counter. Never blocks or fails the request.
    // NOTE: must run inside ctx.waitUntil — pending work that is not awaited is
    // cancelled by the workerd runtime once the response returns (KV was empty
    // on deploy 8cc4c86f until this was fixed).
    if (request.method === 'POST') {
      const analytics = env.ANALYTICS;
      const stats = env.MCP_STATS;
      if (analytics || stats) {
        const task = request
          .clone()
          .text()
          .then((bodyText) => {
            let method = 'unknown';
            let tool: string | undefined;
            try {
              const parsed = JSON.parse(bodyText) as { method?: string; params?: { name?: string } };
              if (parsed.method) method = parsed.method;
              tool = parsed.params?.name;
            } catch {
              // non-JSON body — keep 'unknown'
            }
            if (analytics) analytics.writeDataPoint({ blobs: tool ? [method, tool] : [method], indexes: ['/mcp'] });
            // Count real tool invocations (not discovery) for the agent counter.
            if (stats && method === 'tools/call') return bumpAgentCounter(stats);
          })
          .catch(() => {});
        if (ctx?.waitUntil) ctx.waitUntil(task);
        else void task; // tests (no ctx) rely on Node not cancelling pending work
      }
    }

    const limited = await enforceRateLimit(env, '/mcp', request);
    if (limited) return finalize(limited, cors);

    const res = await handler.fetch(request);
    return finalize(res, cors);
  },
};
