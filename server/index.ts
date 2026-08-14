/**
 * MSPortfolio MCP Server — "living CV" endpoint.
 *
 * Any MCP client (Claude Code, Cursor, Claude Desktop, Copilot, ...) can connect
 * and ask structured questions about the portfolio owner's experience.
 * The tools are the SAME module the browser demo uses (`src/lib/mcp-tools.ts`) —
 * one source of truth for the whole portfolio.
 *
 * Protocol: Streamable HTTP (2025-11-25 / 2026-07-28), endpoint: POST/GET /mcp
 *
 * Run locally:
 *   node server/index.ts
 *   curl -s -X POST http://127.0.0.1:3000/mcp \
 *     -H 'Content-Type: application/json' \
 *     -H 'Accept: application/json, text/event-stream' \
 *     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
 *
 * Connect from Claude Code:
 *   claude mcp add --transport http msp-portfolio http://127.0.0.1:3000/mcp
 *
 * Env:
 *   PORT             port to listen on (default 3000)
 *   HOST             bind address (default 0.0.0.0 so containers/VMs can reach it)
 *   ALLOWED_HOSTS    comma-separated hostnames to accept (default localhost/127.0.0.1)
 *   ALLOWED_ORIGINS  comma-separated browser origins to accept for the site demo
 */
import cors from '@fastify/cors';
import { createMcpFastifyApp } from '@modelcontextprotocol/fastify';
import { toNodeHandler } from '@modelcontextprotocol/node';
import { createMcpHandler, McpServer } from '@modelcontextprotocol/server';
import * as z from 'zod/v4';
import { TOOLS } from '../src/lib/mcp-tools.ts';

const PORT = Number(process.env.PORT ?? 3000);
const HOST = process.env.HOST ?? '0.0.0.0';
const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS ?? 'localhost,127.0.0.1,::1')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const handler = createMcpHandler(() => {
  const server = new McpServer({ name: 'msp-portfolio', version: '1.0.0' });

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

const app = createMcpFastifyApp({ host: HOST, allowedHosts: ALLOWED_HOSTS, allowedOrigins: ALLOWED_ORIGINS });
const node = toNodeHandler(handler);

// CORS for the browser agent demo (MCP clients send no Origin header — unaffected).
await app.register(cors, {
  origin: ALLOWED_ORIGINS.length > 0 ? ALLOWED_ORIGINS : true,
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['content-type', 'accept', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id'],
  exposedHeaders: ['mcp-session-id', 'mcp-protocol-version'],
});

app.all('/mcp', (request, reply) => node(request.raw, reply.raw, request.body));

app.get('/mcp/health', async () => ({
  ok: true,
  name: 'msp-portfolio',
  version: '1.0.0',
  tools: TOOLS.map((t) => t.name),
  uptimeSec: Math.round(process.uptime()),
}));

await app.listen({ port: PORT, host: HOST });
console.log(`[mcp] msp-portfolio@1.0.0 -> http://${HOST}:${PORT}/mcp`);
console.log(`[mcp] tools: ${TOOLS.map((t) => t.name).join(', ')}`);
