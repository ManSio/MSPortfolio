# MSPortfolio — MCP-Native Engineering Portfolio

[![Deploy status](https://github.com/ManSio/MSPortfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/ManSio/MSPortfolio/actions/workflows/deploy.yml)

A portfolio that is simultaneously three things:

1. **A live dashboard** — real GitHub metrics with freshness indicators and a static fallback, so numbers can never be fake.
2. **An MCP server** — the CV as a machine-readable surface. Any AI agent (Claude Code, Cursor, Copilot) can connect and query `get_projects`, `analyze_stack`, `simulate_architecture` and more.
3. **A proof-of-work engine** — a browser agent loop that *shows* the tool calls behind every answer, plus an interactive architecture simulator where visitors can "break" the systems.
4. **A laboratory** (`#/lab`) — the diaries, experiments, decision logs and tests behind every claim, rendered as glassmorphism charts from the same JSON files that feed the MCP server. Per-project filter included.

## Why this exists

Most portfolios show **results**. This one shows **process** — the decision logs,
the tool calls, the degradation curves — and the **evidence** behind every claim:
any statement an agent makes about the owner can be traced to a data record
(`verify_claim`, the evidence score), and every chat answer shows which tool calls
grounded it. Everything on the page is generated from the same data files that
feed the MCP server (single source of truth).

> This is how I build.
> Here is a system that lets you verify how I build.
> And here is a system you can actually use.
> And here is how I know when it is wrong.

## Stack

- **Site**: React 19 + TypeScript + Vite + Tailwind CSS v4 (static, GitHub Pages)
- **MCP server**: `@modelcontextprotocol/server@2` + Fastify middleware (Streamable HTTP), runs as a separate entrypoint (`server/`)
- **Metrics**: GitHub API with 1h localStorage cache → committed static snapshot (`public/metrics.json`) refreshed hourly by CI

## Getting started

```sh
pnpm install
pnpm dev            # site at http://localhost:5173, /mcp proxied to :3000
pnpm server         # MCP server at http://127.0.0.1:3000/mcp
pnpm typecheck      # app + server + worker
pnpm build
```

## Connect the MCP server

```sh
node server/index.ts
claude mcp add --transport http msp-portfolio http://127.0.0.1:3000/mcp
```

Full docs (tools, env, deploy options): [`server/README.md`](server/README.md).

## MCP server at a public URL (Cloudflare Workers)

GitHub Pages cannot run processes, so the MCP endpoint ships a second,
workerd-native entrypoint in [`worker/`](worker/index.ts) — the same tools,
zero-ops hosting, free tier (100k req/day):

```sh
pnpm cf:deploy   # first run: logs in to your Cloudflare account
# -> https://msp-portfolio.mansio-dev.workers.dev/mcp  (live)
claude mcp add --transport http msp-portfolio https://msp-portfolio.mansio-dev.workers.dev/mcp
```

## AI chat on the site (OpenRouter, free models)

The Agent demo can run as a **grounded LLM agent**: the model picks MCP tools,
the worker executes them, and the answer is composed from real tool results
(no hallucinated facts). The same worker exposes `POST /chat`.

Enable it with a free OpenRouter key (models with function calling, e.g.
`google/gemma-4-31b-it:free`):

```sh
# Option A — server key (visitors need no key)
npx wrangler secret put OPENROUTER_API_KEY
# Option B — bring-your-own-key: visitors paste their key in the chat UI (stored in localStorage)
```

Model is configurable via the `OPENROUTER_MODEL` variable in `wrangler.toml`.
Without any key the chat falls back to the deterministic rule-based engine.

On the **Agent** section, a **Verify a claim** widget runs the same `verify_claim`
tool the MCP server exposes: paste any claim about the owner and see the source
records behind it — or an honest refusal when the data does not support it.
When the worker has an OpenRouter key, the tool also uses a **LLM paraphrase
arm** (v2): a deterministic keyword miss may be rescued by an AI check that must
cite the exact record behind the claim (badge `LLM arm`, source still shown) —
and it still refuses rather than guess when no record supports the claim.
Every chat answer ends with an `evidence:` line (tool calls · grounded · failed)
so a visitor can see what the answer was based on.

The section also ships a **connect-in-30-seconds** onboarding block: one
copy-paste `claude mcp add` command, the MCP Inspector entry point
(`npx @modelcontextprotocol/inspector`), and three pre-built questions grounded
in real tools (`analyze_stack`, `verify_claim`, `get_known_issues`). And
`get_profile` returns a `nextSteps` list (LinkedIn, GitHub, MCP connect) — so an
agent that just learned about the owner knows how to continue the interview.

## Repository layout

```
server/              MCP server entrypoint (+ README, tsconfig)
scripts/             update-metrics.ts — CI refresh of the static snapshot
src/
  data/              projects.json · principles.json · timeline.json · lab/ (experiments · diary · known-issues · test-suites)
  lib/               mcp-tools.ts (shared tool logic) · intents.ts · api.ts · mcp-client.ts
  components/        metrics/ · projects/ · playground/ · mcp/ · timeline/ · lab/ · ui/
.github/workflows/   deploy.yml — build → GitHub Pages + hourly metrics refresh
Dockerfile           MCP server container for any Node host
```

## Deploy

Pushing to `main` triggers the workflow: type-check → build → refresh metrics →
publish to `gh-pages`. The MCP server itself needs a process host (GitHub Pages
is static-only) — see [`server/README.md`](server/README.md) for options
(Docker / Workers / local).

## Verification

```sh
# MCP smoke test against the running server
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```
