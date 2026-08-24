# MSPortfolio MCP Server

The portfolio's CV as a **machine-readable MCP server**. Any MCP client —
Claude Code, Cursor, Claude Desktop, GitHub Copilot — can connect and ask
structured questions about Mikhail's experience. The tools are the same module
the browser agent demo uses (`src/lib/mcp-tools.ts`) — one source of truth.

## Tools

| Tool | Description |
|------|-------------|
| `get_profile` | Professional profile summary |
| `get_projects(filter?)` | Projects with stack, highlights, decision logs |
| `get_engineering_principles` | Engineering principles with A/B counterfactuals |
| `get_timeline` | Engineering decision timeline |
| `analyze_stack(required_skills)` | Compare stack vs job requirements → coverage + verdict |
| `simulate_architecture(project_id, scenario)` | Simulate architecture under load / failure scenarios |
| `verify_claim(claim)` | Evidence score: ground a claim about the owner against portfolio data |
| `verify_repo(repo, readme?)` | Live GitHub verification: repo metadata (+README) + cross-check with the portfolio record |
| `verify_article(query)` | Live Dev.to verification: has the owner published a matching article? |
| `verify_package(package)` | Live npm verification: does the package exist, who maintains it? |

Protocol: **Streamable HTTP** (2025-11-25 / 2026-07-28), single endpoint `POST/GET /mcp`.

> Note: this Fastify entrypoint exposes only `/mcp` (+ `/mcp/health`). The Cloudflare
> Workers entrypoint ([`worker/index.ts`](../worker/index.ts)) additionally serves the
> MCP discovery file (`/.well-known/mcp.json`), a read-only REST pass-through
> (`/api/{projects|principles|timeline|antipatterns}`), and the doc endpoints
> (`/openapi.json`, `/llms.txt`, `/resume.txt`).

## Run locally

```sh
node server/index.ts
# or with pnpm
pnpm server
```

Verify:

```sh
curl -s -X POST http://127.0.0.1:3000/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

Health: `GET http://127.0.0.1:3000/mcp/health`

## Connect from Claude Code

```sh
claude mcp add --transport http msp-portfolio http://127.0.0.1:3000/mcp
```

Then in Claude Code: *"Which projects did Mikhail build with MCP?"*

## Connect from any MCP client

MCP clients talk JSON-RPC over HTTP — configure a remote MCP server pointing
at your deployed URL:

```
https://your-host.example/mcp
```

Requests without an `Origin` header (i.e. all non-browser MCP clients) pass
unconditionally. The server validates `Host`/`Origin` to prevent DNS-rebinding
attacks when bound locally, and CORS is enabled for the site's browser demo.

## Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | Listen port |
| `HOST` | `0.0.0.0` | Bind address |
| `ALLOWED_HOSTS` | `localhost,127.0.0.1,::1` | Hostnames accepted by Host validation |
| `ALLOWED_ORIGINS` | *(empty)* | Browser origins allowed via CORS (e.g. `https://ManSio.github.io`) |

## Deploy

GitHub Pages cannot run processes, so the MCP server is a separate entrypoint:

- **Option A — Docker / any Node host** (Render, Railway, Fly.io, HF Spaces):

  ```sh
  docker build -t msp-portfolio-mcp .
  docker run -p 3000:3000 msp-portfolio-mcp
  ```

- **Option B — Cloudflare Workers**: the SDK ships workerd-native shims and the
  handler used here (`createMcpHandler` → `.fetch()`) runs on Workers as-is.
  The repo already contains [`worker/index.ts`](../worker/index.ts) +
  [`wrangler.toml`](../wrangler.toml) (CORS for the GitHub Pages site baked in):

  ```sh
  pnpm cf:deploy
  # -> https://msp-portfolio.<your-subdomain>.workers.dev/mcp
  claude mcp add --transport http msp-portfolio https://msp-portfolio.<your-subdomain>.workers.dev/mcp
  ```

  Local check without an account (web-standard handler simulated in Node):

  ```sh
  node -e "import('./worker/index.ts').then(m=>m.default.fetch(new Request('http://x/mcp/health')).then(r=>r.text().then(console.log)))"
  ```

- **Option C — local only**: run `pnpm server` and connect tools that support
  localhost MCP endpoints.

## MCP directories & distribution

The server is published for discovery in MCP server directories (decision D1,
research 2026-08-15):

| Directory | Status | Where |
|-----------|--------|-------|
| Official MCP Registry | ready — publish on `v*` tag | `server.json` + `.github/workflows/publish-mcp.yml` |
| Smithery | ready — auto-crawled | `smithery.yaml` (repo root) |
| Glama / awesome-mcp-servers | manual PR (entry snippet) | [`docs/mcp-distribution.md`](../docs/mcp-distribution.md) |
| mcp.so / PulseMCP / MCPMarket | web forms (optional) | [`docs/mcp-distribution.md`](../docs/mcp-distribution.md) |

Full step-by-step checklist: [`docs/mcp-distribution.md`](../docs/mcp-distribution.md).
