// Deployment configuration for the browser MCP client.
//
// MCP_ENDPOINT points the agent-loop demo at the live Cloudflare Worker's MCP
// endpoint. If the endpoint is unreachable the demo gracefully falls back to
// the in-browser engine (same tools, no network).
export const MCP_ENDPOINT = 'https://msp-portfolio.mansio-dev.workers.dev/mcp';

// The worker's chat endpoint lives at the worker root (NOT under /mcp).
export const CHAT_ENDPOINT = 'https://msp-portfolio.mansio-dev.workers.dev/chat';
