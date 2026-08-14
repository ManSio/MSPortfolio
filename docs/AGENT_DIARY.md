# AGENT_DIARY.md

Единственный дневник проекта. Формат «Вердикт-Сначала» (§4.8 AGENTS.md).

## [2026-08-14 09:30] — Создание MSPortfolio (MCP-Native Portfolio)
**Status:** ✅ Fixed
**Root Cause:** — (новая инициатива, не инцидент)
**Fix:** Репозиторий ManSio/MSPortfolio: статический сайт (React 19/Vite 8/Tailwind v4, GH Pages) + MCP-сервер (`server/`, @modelcontextprotocol/server@2 + Fastify, Streamable HTTP, 6 тулов) + браузерный агент-демо с trace + симулятор архитектуры + CI (deploy + hourly metrics refresh). Live: https://mansio.github.io/MSPortfolio/
**Guard:** §0.2 — verified_from_clean_state: `git clone` → `pnpm install` → `pnpm build` (см. финальный отчёт); MCP smoke через curl.
**Pattern:** NEW

## [2026-08-14 10:05] — ТЗ ошибочно предлагало Fastify-пакет `@fastify/mcp`
**Status:** ✅ Fixed
**Root Cause:** Пакет не существует в npm; официальная поддержка Fastify — `@modelcontextprotocol/fastify` (middleware v2).
**Fix:** Использован `@modelcontextprotocol/fastify@2` (createMcpFastifyApp + toNodeHandler + createMcpHandler) — проверено экспериментами №1-2.
**Guard:** Перед пином зависимости — проверка registry (репо №1 в §9 AGENTS.md).
**Pattern:** P-002-вариант

## [2026-08-14 10:20] — registerTool не принимает сырую JSON Schema → HTTP 500
**Status:** ✅ Fixed
**Root Cause:** SDK v2 ожидает zod-схему; фабрика createMcpHandler падает на регистрации при каждом запросе.
**Fix:** `z.fromJSONSchema(tool.inputSchema)` при регистрации (проверено: parse OK / invalid caught). Детали — EXPERIMENTS_LOG.md#1.
**Guard:** Тест интеграции (tools/list, tools/call) перед коммитом.
**Pattern:** NEW
