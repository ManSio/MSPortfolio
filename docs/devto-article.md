---
title: "I turned my portfolio into an MCP server"
published: false
description: "A GitHub Pages portfolio that is also a production MCP server on Cloudflare Workers — 12 tools, an interactive load simulator with failure events, an agent loop whose every tool call is visible, a live query counter, and a lab page of diaries/experiments/tests."
tags: mcp, ai, cloudflare, portfolio
cover_image: https://raw.githubusercontent.com/ManSio/MSPortfolio/main/docs/devto-cover1.png
---

# I turned my portfolio into an MCP server

Every portfolio claims "I know distributed systems." Mine lets you break one and watch p95 degrade in real time.

And if you're an AI agent reading this — you can query it directly:

```bash
claude mcp add --transport http msp-portfolio \
  https://msp-portfolio.mansio-dev.workers.dev/mcp
```

Ask it *"what projects did Mikhail build?"*, *"does his stack match a job I have?"*, *"what has he shipped recently?"*, or *"simulate his search architecture under 20x load."* It answers with the same tools its human owner maintains — live data, not a resume's frozen claims.

This is the story of how I built it, and the mistakes I hit along the way.

## 1. The problem with portfolios

A résumé and a portfolio site both make the same silent promise: "trust that this is still true." They're a snapshot from whenever you last updated them, and there's no way for anyone — human or AI — to verify a claim against anything live.

I wanted the opposite: a portfolio that answers questions instead of just displaying them, backed by the same code that runs in production, so a claim like "I know Kubernetes" turns into something you can actually interrogate — and if the evidence isn't there, the tool says so instead of bluffing.

## 2. The idea: one tool layer, three surfaces

Instead of building "a website" and "an API" as separate things, I built one set of MCP tools and exposed it three ways:

1. **Browser agent demo** — a React app that calls the tools live, in your tab
2. **Local Node MCP server** — Fastify + Streamable HTTP, for local dev / CLI use
3. **Production Cloudflare Worker** — the public `/mcp` endpoint any agent can add

The site you're reading and the server an agent queries are, literally, the same source of truth.

## 3. Technical decisions

### 3.1 One source of truth for the whole portfolio

The unusual part isn't the MCP endpoint — it's that the **same tool module** (`src/lib/mcp-tools.ts`) powers all three surfaces above. One `TOOLS` array. One `inputSchema` per tool. No drift between "what the site shows" and "what the server answers."

### 3.2 Registering a tool: raw JSON Schema → zod

The v2 SDK rejects raw JSON Schema and wants zod. The fix is one line:

```ts
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { TOOLS } from '../src/lib/mcp-tools.ts';

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'msp-portfolio', version: '1.0.0' });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: z.fromJSONSchema(tool.inputSchema),
        annotations: tool.annotations, // readOnlyHint: true on every tool
      },
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
```

Every tool is marked `readOnlyHint: true` (the SDK serializes annotations into `tools/list`, so agents see the surface is read-only), and network-facing tools are `openWorldHint: true`.

> 💡 **Pitfall:** `@fastify/mcp` does **not** exist on npm. The official Fastify integration is `@modelcontextprotocol/fastify` (middleware for v2). Learned that the hard way.

### 3.3 Hosting: GitHub Pages is static, so the MCP server lives on Workers

GitHub Pages can't run a process, so the MCP endpoint is a Cloudflare Worker. The SDK's `createMcpHandler` returns a web-standard `(Request) => Response`, so the worker is Node-free:

```ts
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/mcp/health') {
      return Response.json({ ok: true, tools: TOOLS.map((t) => t.name) });
    }
    if (url.pathname !== '/mcp') return new Response('Not found', { status: 404 });
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const res = await handler.fetch(request); // workerd-native, no toNodeHandler
    for (const [k, v] of Object.entries(cors)) res.headers.set(k, v);
    return res;
  },
};
```

> 💡 **Pitfall:** `toNodeHandler()` breaks on Workers. The web-standard path is the whole point of the v2 SDK — use `handler.fetch()` directly.

### 3.4 The twelve tools

| Tool | What it does |
|---|---|
| `get_profile` | Owner's professional summary |
| `get_projects` | Projects with stack, highlights, decision logs; filter by stack tag |
| `get_engineering_principles` | Principles with real examples and A/B counterfactuals |
| `get_timeline` | The engineering decision timeline |
| `get_articles` | Live fetch of recent Dev.to articles (tags, reading time) |
| `get_commit_history` | Recent commits across the owner's repos — powers "what has he been building lately" |
| `get_antipatterns` | The antipattern museum: real mistakes with why they were bad and the lesson |
| `get_experiments` | Engineering experiments: hypothesis → command → verdict (confirmed/refuted/partial) + negative results |
| `get_diary` | The engineering diary: incidents, root causes, fixes, guards — "what broke and how did you fix it" |
| `get_known_issues` | The known-issues board (KI-*): open debt with status, temperature and deadlines |
| `analyze_stack` | Compares the owner's stack against a job's required skills — per-skill evidence + coverage |
| `simulate_architecture` | Simulates a project's architecture under load spike / node loss / cache cold / LLM saturation; returns p50 / p95 / throughput / bottleneck / failure events |

`analyze_stack` is the recruiters' favorite: paste a job description, get a per-skill match with evidence — instead of a human's "I know Kubernetes."

### 3.5 The interactive simulator

The same engine `simulate_architecture` exposes is interactive on the page itself. Real architectures are modeled as stages with base latency and a contention factor — e.g. the search architecture with a parallel retrieval group (`vector_search` + `bm25_search`, 2 replicas each). Abridged; the full model also has a `context_build` stage and a cache `{hitRatio, saveMs}`:

```ts
// src/lib/mcp-tools.ts — abridged
const model = {
  stages: [
    { name: 'query_parse',   baseMs: 1,  contention: 0.1 },
    { name: 'vector_search', baseMs: 10, contention: 0.45, group: 'retrieval', replicas: 2 },
    { name: 'bm25_search',   baseMs: 4,  contention: 0.25, group: 'retrieval', replicas: 2 },
    { name: 'fusion_rerank', baseMs: 3,  contention: 0.3 },
  ],
};
```

Visitors pick a scenario — *kill a node*, *cold the cache*, *saturate the LLM* — and watch p50 / p95 / throughput degrade in real time. The simulator also derives **failure events** from the same latency numbers: when a stage crosses a budget, a chip appears — `circuit_open @×10`, `fallback_engaged @×20`, `degraded_mode`, `queue_backpressure`. No static claims, only process.

### 3.6 The agent loop

`/chat` on the Worker runs a grounded agent loop: an OpenRouter model with tools attached, up to 5 rounds of tool calls, and the worker returns the full trace, which the UI replays step-by-step so you watch *why* the answer is what it is:

```ts
// simplified — the real call also sends referer/title headers and a 90s timeout
const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify({
    model, messages, tools: openAiTools(), tool_choice: 'auto', temperature: 0.3,
  }),
});
```

A model fallback chain, with fail-fast on 401/403 and retry on 5xx/rate-limit, keeps the demo alive on the free tier. Every real tool invocation is also counted: a KV-backed `/mcp/stats` endpoint returns today's and total queries, and a card on the page shows "live agent traffic".

### 3.7 CI as infrastructure

One push does everything (`.github/workflows/deploy.yml`):

1. Typecheck + unit tests (vitest)
2. `pnpm build` → GitHub Pages
3. Hourly cron refreshes the metrics snapshot (GitHub stats, Dev.to articles, **recent commits** — before the build, so deployments always ship fresh data)
4. A `smoke` job curls the **live** endpoint — health, `tools/list` must contain `simulate_architecture` / `get_commit_history` / `get_antipatterns`, and a `tools/call` on `get_articles` must return a structured result
5. Auto-deploy of the Worker when `CLOUDFLARE_API_TOKEN` is set (it now is)

The smoke job is the important one: the endpoint is a product, not a demo, and CI treats it that way.

## 4. Pitfalls, collected

- `@fastify/mcp` doesn't exist — use `@modelcontextprotocol/fastify`
- `toNodeHandler()` fails on Cloudflare Workers — use `handler.fetch()` directly, it's web-standard
- Stale `rebase-merge` directories can linger from interrupted sessions — check `git status` before assuming a rebase is active, then clear it per git's own instructions
- An hourly cron commit (`chore: refresh metrics snapshot [skip ci]`) can silently diverge `main` from what you have locally — always `git fetch` before pushing rather than force-pushing over it
- **A platform binding can deploy and do nothing.** The Cloudflare rate-limit binding deployed cleanly, but `limit()` returned `success: true` on every call — enforcement simply wasn't active on the free plan. I verified it with a deliberately low limit and a burst test before trusting it; the bindings stay for when the plan upgrades. Configuration acceptance and runtime enforcement are different contracts.
- **Fire-and-forget work dies with the response in Workers.** An unawaited promise after `return` gets cancelled by the runtime — my KV counter silently never wrote. Local tests in Node don't cancel pending promises, so the code was green while production lost the work. Fix: `ctx.waitUntil(task)`.

## 5. Results

*(All numbers verified against the live endpoint.)*

- `tools/list` responds in **~100ms** (health: ~97ms).
- `simulate_architecture` at 20× load, search architecture: **p95 239ms** (load spike), **401ms** (node loss), **301ms** (cold cache). Under node loss the circuit breaker trips at ×10; the design absorbs the spike otherwise.
- The endpoint now serves **12 tools**, all read-only-annotated, and a live counter tracks how many MCP queries it serves per day.
- A lab page (`#/lab`) renders the diaries, experiments and test suites from the same JSON files the tools read — `get_experiments` (10 experiments, 7 confirmed / 1 partial / 2 refuted, across projects), `get_diary` (23 entries), `get_known_issues` (KI-001..015). The evidence behind every claim is a URL you can open, not a bullet point.
- `get_articles` fetches live Dev.to data (`source: live`); the CI smoke exercises a real `tools/call`, not just `tools/list`.
- An antipattern museum (`get_antipatterns`) turns the build's own mistakes — a forked repo claimed as mine, a JSON-Schema 500, a silently-broken live source, a cancelled fire-and-forget — into honest lessons.

## 6. Try it yourself

- Portfolio: [mansio.github.io/MSPortfolio](https://mansio.github.io/MSPortfolio/)
- Source: [github.com/ManSio/MSPortfolio](https://github.com/ManSio/MSPortfolio)
- Add the MCP server to Claude:
  ```bash
  claude mcp add --transport http msp-portfolio \
    https://msp-portfolio.mansio-dev.workers.dev/mcp
  ```
- Then ask it what it's learned: *"what did your mistakes teach you?"*

If you build something similar, I'd genuinely like to see it — drop a comment.
