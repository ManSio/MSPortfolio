# MSPortfolio — MCP-Native Engineering Portfolio

A portfolio that is simultaneously three things:

1. **A live dashboard** — real GitHub metrics with freshness indicators and a static fallback, so numbers can never be fake.
2. **An MCP server** — the CV as a machine-readable surface. Any AI agent (Claude Code, Cursor, Copilot) can connect and query `get_projects`, `analyze_stack`, `simulate_architecture` and more.
3. **A proof-of-work engine** — a browser agent loop that *shows* the tool calls behind every answer, plus an interactive architecture simulator where visitors can "break" the systems.

## Why this exists

Most portfolios show **results**. This one shows **process** — the decision logs,
the tool calls, the degradation curves. Everything on the page is generated from
the same data files that feed the MCP server (single source of truth).

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

## Repository layout

```
server/              MCP server entrypoint (+ README, tsconfig)
scripts/             update-metrics.ts — CI refresh of the static snapshot
src/
  data/              projects.json · principles.json · timeline.json (single source of truth)
  lib/               mcp-tools.ts (shared tool logic) · intents.ts · api.ts · mcp-client.ts
  components/        metrics/ · projects/ · playground/ · mcp/ · timeline/ · ui/
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
