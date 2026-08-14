# KNOWN_ISSUES.md

Синхронизируется из AGENT_DIARY при каждом итоге (§4.6 AGENTS.md).

| # | Проблема | Статус | Температура | Deadline | Owner | Ссылка |
|---|----------|--------|-------------|----------|-------|--------|
| KI-001 | MCP-сервер нельзя хостить на GitHub Pages (статический хостинг) — требуется процесс-хост (Docker/Workers/локально). | Открыто (by design) | 🟢 стабильно | — | owner | server/README.md |
| KI-002 | CORS: браузерное демо против удалённого /mcp требует явного ALLOWED_ORIGINS (secure-default: 403). | Открыто (by design) | 🟢 стабильно | — | owner | server/README.md |
| KI-003 | Локально браузерное демо ходит на /mcp через vite-proxy; на проде (без запущенного сервера) автоматически переключается на local engine. | Открыто (by design) | 🟢 стабильно | — | owner | src/lib/mcp-client.ts |
| KI-004 | Vite-скрипт `pnpm lint` (oxlint) — 0 warnings; аннотация CI про Node 20 deprecation у actions/checkout@v4 — косметика. | Открыто | 🟢 стабильно | — | owner | .github/workflows/deploy.yml |
| KI-005 | OG-превью кэшируется соцсетями (X/LinkedIn/Telegram): после деплоя первый share может показывать старое превью — сброс через validator'ы (developers.facebook.com/tools/debug, cards-dev.twitter.com/validator). | Открыто (by design) | 🟢 стабильно | — | owner | index.html (og:image) |
| KI-006 | `get_articles` падал: dev.to → 403 с воркера (с обычного IP 200). **Фикс в коде:** UA-заголовок (`msp-portfolio-server`) + fallback на committed снапшот metrics.json (source: live/snapshot/unavailable). Проверено экспериментом (source: live, 5 статей). Live-подтверждение — после деплоя. | Фикс в коде, ждёт деплоя | 🟡 наблюдаем | после пуша | owner | mcp-tools.ts:228 |
| KI-007 | Публичный /mcp без rate limiting (эмпирически: 20×200, 0×429). **Реализовано:** `[[ratelimits]]` MCP 300/60 + CHAT 30/60 per IP+path в wrangler.toml, 429 в воркере (тест), fail-open при отсутствии биндинга. CF bot-protection для бот-UA остаётся на границе. Live-подтверждение — после деплоя. | Реализовано, ждёт деплоя | 🟡 наблюдаем | после пуша | owner | wrangler.toml, worker/index.ts |
| KI-008 | `simulate_architecture`: llm_saturation не влиял на не-LLM модели, но выдавал «LLM generation dominates». **Исправлено:** честный finding «no LLM stage» для не-LLM архитектур + тест (sat.points == load_spike.points). | ✅ Исправлено + тест | 🟢 стабильно | — | owner | mcp-tools.ts:153-159 |
| KI-009 | Драфт статьи: пример «I know Kubernetes» противоречит живому `analyze_stack` (matched:false, evidence в стеке проектов нет). | Открыто 🟡 (решение владельца) | 🟡 наблюдаем | до публикации статьи | owner | драфт статьи (§1) |
