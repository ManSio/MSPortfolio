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
import { TOOLS } from '../src/lib/mcp-tools.ts';

const NAME = 'msp-portfolio';
const VERSION = '1.0.0';

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: NAME, version: VERSION });
  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      { description: tool.description, inputSchema: z.fromJSONSchema(tool.inputSchema) },
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

interface Env {
  /** Comma-separated browser origins allowed to call /mcp (e.g. https://mansio.github.io) */
  ALLOWED_ORIGINS?: string;
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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/mcp/health') {
      return Response.json({ ok: true, name: NAME, version: VERSION, tools: TOOLS.map((t) => t.name) });
    }
    if (url.pathname !== '/mcp') {
      return new Response('Not found', { status: 404 });
    }

    const origins = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const origin = request.headers.get('Origin');
    const cors = corsHeaders(origins, origin);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    const res = await handler.fetch(request);
    for (const [key, value] of Object.entries(cors)) res.headers.set(key, value);
    return res;
  },
};
