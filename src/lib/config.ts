// Deployment configuration for the browser MCP client.
//
// MCP_ENDPOINT points the agent-loop demo at the live Cloudflare Worker.
// If the endpoint is unreachable the demo gracefully falls back to the
// in-browser engine (same tools, no network).
export const MCP_ENDPOINT = 'https://msp-portfolio.mansio-dev.workers.dev/mcp';
