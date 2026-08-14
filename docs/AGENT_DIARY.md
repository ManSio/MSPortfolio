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

## [2026-08-14 11:10] — Форк чужого проекта (infrawise) попал в портфолио как «свой»
**Status:** ✅ Fixed
**Root Cause:** Данные о проектах взяты из `users/ManSio/repos` без проверки флага `fork`; `infrawise` — форк `Sidd27/infrawise`.
**Fix:** Удалён из projects/principles/timeline/архитектурных моделей; метрики фильтруют форки (live-fetch + update-metrics.ts + снапшот).
**Guard:** `fork !== true` в обоих путях метрик; проверка `gh api repos/…/infrawise` (fork/source) перед включением чужого кода.
**Pattern:** P-002-вариант (предположение вместо проверки)

## [2026-08-14 12:00] — Светлая тема нечитаема (белое на белом)
**Status:** ✅ Fixed
**Root Cause:** Компоненты хардкодили тёмные цвета (`text-paper` = белый текст) и не реагировали на светлую тему; переключался только фон body.
**Fix:** Семантические токены через CSS-переменные (ink=фон страницы, paper=основной текст, muted/faint=вторичный/третичный, accent темнеет на светлом) + `@custom-variant dark` для `dark:`-утилит. Тёмная тема визуально не изменилась, светлая читаема.
**Guard:** Цвета только через семантические классы; никаких `text-paper/\d+`-вариантов.
**Pattern:** NEW

## [2026-08-14 12:30] — Cloudflare Workers entrypoint (workerd-native MCP)
**Status:** ✅ Fixed
**Root Cause:** GH Pages — статика; MCP-серверу нужен процесс-хост → добавлен второй entrypoint для Workers.
**Fix:** `worker/index.ts` использует `handler.fetch()` (web-standard, без toNodeHandler — в Node-сборке это метод объекта, не функция); CORS/OPTIONS/health в обёртке. Проверено 7/7 тестов (health, 404, tools/list, tools/call, preflight allowed/denied, browser-origin call).
**Guard:** wrangler вынесен в npx (его build-скрипты workerd/esbuild ломают pnpm deps-check на Windows — §9).
**Pattern:** NEW

## [2026-08-14 13:00] — mansio.github.io отдавал 404; pnpm approval в CI
**Status:** ✅ Fixed
**Root Cause 1:** Репо `ManSio.github.io` не существовало — user-сайт не был настроен.
**Fix 1:** Создан `ManSio.github.io` с index.html (meta-refresh + JS redirect + canonical) на `/MSPortfolio/`; Pages включён через API (main, root). Проверено: 200 + заголовок.
**Root Cause 2:** pnpm 11 переименовал `onlyBuiltDependencies` → `allowBuilds` (map `pkg: true`), поле `pnpm` в package.json больше не читается → fresh `--frozen-lockfile` в CI падал ERR_PNPM_IGNORED_BUILDS.
**Fix 2:** `allowBuilds: esbuild: true` в pnpm-workspace.yaml (настройки pnpm 11 живут только там). Проверено fresh frozen install + esbuild binary.
**Pattern:** NEW

## [2026-08-14 13:30] — Live deploy: MCP на Cloudflare Workers + user-сайт
**Status:** ✅ Fixed
**Root Cause:** —
**Fix:** `wrangler login` (пользователь, браузер) → поддомен `mansio-dev.workers.dev` (CLI `subdomain` в v4 нет, зарегистрирован через REST API: PUT /accounts/{id}/workers/subdomain) → `wrangler deploy` → **https://msp-portfolio.mansio-dev.workers.dev/mcp**. Демо на сайте подключено к живому endpoint (`src/lib/config.ts` MCP_ENDPOINT), CORS разрешает GH Pages + localhost, CI-джоба `smoke` проверяет публичный endpoint с чистого раннера (health + tools/list) — success. Локальная песочница не может достучаться до workers.dev (TLS SEC_E_ILLEGAL_MESSAGE) — это ограничение окружения, публичная доступность подтверждена раннером.
**Guard:** CI smoke на живой endpoint; бандл проверяется `wrangler deploy --dry-run` + смоук собранного index.js.
**Pattern:** NEW
