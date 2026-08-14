# MSPortfolio MCP server — runs on any Node 20+ host (Render/Railway/Fly/HF Spaces)
FROM node:24-slim

WORKDIR /app

# Server source + the shared data/tools it imports
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod --frozen-lockfile

COPY server/ server/
COPY src/ src/

EXPOSE 3000

CMD ["node", "server/index.ts"]
