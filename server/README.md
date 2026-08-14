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

Protocol: **Streamable HTTP** (2025-11-25 / 2026-07-28), single endpoint `POST/GET /mcp`.

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

- **Option B — Cloudflare Workers**: the site SDK ships a workerd entry
  (`@modelcontextprotocol/server` has workerd shims and upstream tests for
  Workers). Follow-up: `wrangler deploy` with the same `src/lib/mcp-tools.ts`.

- **Option C — local only**: run `pnpm server` and connect tools that support
  localhost MCP endpoints.
