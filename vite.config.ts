import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { buildAgentStaticHtml, AGENT_FALLBACK_CSS } from './scripts/agent-static-html.ts';

// Injects a build-time, data-driven semantic HTML fallback into #root so that
// agents which do not execute JavaScript (retrieval crawlers, the Agentis Lux
// scanner) see real content, landmarks and links instead of an empty div.
// React replaces it on mount — the human UI is unchanged.
function agentReadableHtml(): Plugin {
  let root = process.cwd();
  return {
    name: 'agent-readable-html',
    configResolved(config) {
      root = config.root;
    },
    transformIndexHtml(html) {
      const fallback = buildAgentStaticHtml(root);
      return html
        .replace('</head>', `<style>${AGENT_FALLBACK_CSS}</style></head>`)
        .replace('<div id="root"></div>', `<div id="root">${fallback}</div>`);
    },
  };
}

// GitHub Pages serves the repo at https://ManSio.github.io/MSPortfolio/
// -> base must be '/MSPortfolio/'. For local dev with the MCP server running
// on :3000, /mcp is proxied so the browser chat demo can hit it without CORS.
export default defineConfig({
  base: '/MSPortfolio/',
  plugins: [react(), tailwindcss(), agentReadableHtml()],
  server: {
    proxy: {
      '/mcp': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: false,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: false,
  },
});
