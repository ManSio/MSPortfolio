import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// GitHub Pages serves the repo at https://ManSio.github.io/MSPortfolio/
// -> base must be '/MSPortfolio/'. For local dev with the MCP server running
// on :3000, /mcp is proxied so the browser chat demo can hit it without CORS.
export default defineConfig({
  base: '/MSPortfolio/',
  plugins: [react(), tailwindcss()],
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
