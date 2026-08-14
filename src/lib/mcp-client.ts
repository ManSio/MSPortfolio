// Minimal MCP client (Streamable HTTP) used by the browser agent demo to talk
// to the REAL /mcp endpoint when it is reachable (dev proxy or deployed host).
// Falls back to the shared in-browser engine when the endpoint is absent
// (e.g. pure static GitHub Pages without the server running).

import { TOOLS, getTool } from './mcp-tools';
import { MCP_ENDPOINT } from './config';

export type McpMode = 'live' | 'local';

interface JsonRpcResponse {
  jsonrpc: string;
  id: number;
  result?: { content?: Array<{ type: string; text: string }> };
  error?: { code: number; message: string };
}

function parseSse(raw: string): string {
  let payload = '';
  for (const line of raw.split('\n')) {
    if (line.startsWith('data:')) payload += line.slice(5).trim();
  }
  return payload;
}

async function rpcCall(method: string, params: unknown, id: number): Promise<JsonRpcResponse> {
  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-11-25',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id, method, params }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`MCP endpoint responded ${res.status}`);
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('text/event-stream')) {
    const raw = await res.text();
    const payload = parseSse(raw);
    if (!payload) throw new Error('Empty SSE payload');
    return JSON.parse(payload) as JsonRpcResponse;
  }
  return (await res.json()) as JsonRpcResponse;
}

export async function probeMcpEndpoint(): Promise<McpMode> {
  try {
    const r = await rpcCall('tools/list', {}, 1);
    return r.result?.content !== undefined || r.error === undefined ? 'live' : 'local';
  } catch {
    return 'local';
  }
}

export async function callMcpTool(name: string, args: Record<string, unknown>, id: number): Promise<unknown> {
  const r = await rpcCall('tools/call', { name, arguments: args }, id);
  if (r.error) throw new Error(`MCP error ${r.error.code}: ${r.error.message}`);
  const text = r.result?.content?.find((c) => c.type === 'text')?.text;
  if (text === undefined) throw new Error('Tool returned no text content');
  return JSON.parse(text);
}

/** Local execution via the shared module — identical tool logic, no network. */
export function callLocalTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const tool = getTool(name);
  if (!tool) return Promise.reject(new Error(`Unknown tool: ${name}`));
  return tool.execute(args);
}

export { TOOLS };
