# KNOWN_ISSUES.md

Синхронизируется из AGENT_DIARY при каждом итоге (§4.6 AGENTS.md).

| # | Проблема | Статус | Температура | Deadline | Owner | Ссылка |
|---|----------|--------|-------------|----------|-------|--------|
| KI-001 | MCP-сервер нельзя хостить на GitHub Pages (статический хостинг) — требуется процесс-хост (Docker/Workers/локально). | Открыто (by design) | 🟢 стабильно | — | owner | server/README.md |
| KI-002 | CORS: браузерное демо против удалённого /mcp требует явного ALLOWED_ORIGINS (secure-default: 403). | Открыто (by design) | 🟢 стабильно | — | owner | server/README.md |
| KI-003 | Локально браузерное демо ходит на /mcp через vite-proxy; на проде (без запущенного сервера) автоматически переключается на local engine. | Открыто (by design) | 🟢 стабильно | — | owner | src/lib/mcp-client.ts |
| KI-004 | Vite-скрипт `pnpm lint` (oxlint) — 0 warnings; аннотация CI про Node 20 deprecation у actions/checkout@v4 — косметика. | Открыто | 🟢 стабильно | — | owner | .github/workflows/deploy.yml |
| KI-005 | OG-превью кэшируется соцсетями (X/LinkedIn/Telegram): после деплоя первый share может показывать старое превью — сброс через validator'ы (developers.facebook.com/tools/debug, cards-dev.twitter.com/validator). | Открыто (by design) | 🟢 стабильно | — | owner | index.html (og:image) |
