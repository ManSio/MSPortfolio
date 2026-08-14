# EXPERIMENTS_LOG.md

Гипотеза → замер → вывод. Правило §1.6 AGENTS.md: гипотеза без сырого вывода — не гипотеза.

## [2026-08-14] — Гипотеза: MCP-сервер на @modelcontextprotocol/server@2 + Fastify поднимается и отвечает без build-step
**Ожидание:** Node 24 нативно запускает TS (type-stripping); официальный `@modelcontextprotocol/fastify` + `toNodeHandler(createMcpHandler(factory))` отвечает на `tools/list`, `tools/call`, `initialize` по Streamable HTTP; JSON Schema в `registerTool` принимать НЕ будет — нужен `z.fromJSONSchema`.
**Команда:** `node server/index.ts` → `curl -X POST /mcp` (tools/list / tools/call / initialize) → проба `z.fromJSONSchema` (.zod-probe.mjs).
**Сырой результат:**
- `tools/list`: `{"result":{"tools":[{"name":"get_projects",...}]}}` — 6 тулов (полный список в health).
- `tools/call get_projects(filter=mcp)`: JSON со 2 проектами (mscodebase-intelligence, infrawise). *Поправка: infrawise в аккаунте — форк чужого проекта (Sidd27/infrawise); из данных портфолио удалён 2026-08-14, в метриках форки фильтруются.*
- `initialize`: `{"protocolVersion":"2025-11-25","capabilities":{"tools":{"listChanged":true}},"serverInfo":{"name":"msp-portfolio","version":"1.0.0"}}`.
- Raw JSON Schema в registerTool → HTTP 500 на КАЖДОМ запросе (фабрика падает). `z.fromJSONSchema(js)` → `PARSE_OK true INVALID_CAUGHT true` → фикс (500 ушёл).
**Вердикт:** подтверждена. Единственная ловушка — `registerTool` не принимает сырую JSON Schema; конвертация `z.fromJSONSchema` обязательна.

## [2026-08-14] — Гипотеза: сервер переживает adversarial-запросы и 8 параллельных вызовов без смешивания результатов
**Ожидание:** валидация JSON-RPC (400 на мусор), DNS-rebinding защита (403 на чужой Origin), параллельные вызовы возвращают СВОЙ результат по фильтру.
**Команда:** 7 атак (malformed JSON, unknown method, bad protocol version, unknown tool, missing args, CORS preflight, evil origin) + 8 параллельных `tools/call` с проверкой содержимого.
**Сырой результат:** 400 / -32601 / 400 / -32602 / validation error / 403 / 403; concurrency PASS=8/8 (mscodebase для filter=mcp, infrawise для filter=aws, без перекрёста). Сервер жив после всех атак (health OK).
**Вердикт:** подтверждена. CORS-preflight легитимного origin → 403 при пустом ALLOWED_ORIGINS — сознательный secure-default (fail-closed), документирован в server/README.md.

> Поправка 2026-08-14: infrawise оказался форком чужого проекта (Sidd27/infrawise) и удалён из портфолио; вывод о корректности параллелизма (правильный вход → правильный выход) не зависит от конкретного набора проектов и остаётся в силе.

## [2026-08-14 15:00] — Гипотеза: живой MCP-эндпоинт отвечает на tools/list/tools/call и отдаёт числа, совпадающие с симуляцией в коде
**Ожидание:** health/tools/list = 200; `simulate_architecture` на живом эндпоинте = результат `runSimulation` в mcp-tools.ts; `get_articles` возвращает статьи dev.to.
**Команда:** curl к https://msp-portfolio.mansio-dev.workers.dev (health, tools/list, tools/call × 4 сценария simulate_architecture, get_articles, analyze_stack) + python-бург 20× /mcp/health (curl-UA и Python-urllib UA).
**Сырой результат:**
- health: `{"ok":true,...,"chatConfigured":true}` — 97ms; tools/list — 105ms.
- simulate_architecture p95@20x: load_spike 238.5ms / node_loss 400.9ms / cache_cold 301.4ms / llm_saturation 238.5ms (= load_spike — сценарий не действует на не-LLM модель).
- get_articles: **403 от dev.to** (`count:0, error:"dev.to responded 403"`) — БАГ; с обычного IP dev.to = 200 → блокировка исходящих запросов воркера.
- analyze_stack([kubernetes,typescript,mcp,python]): coverage 0.75, kubernetes matched:false (нет evidence в стеке проектов).
- Бург 20× curl-UA: 200×20, 0×429 — **rate limit отсутствует**. Бург 20× Python-urllib UA: 403×20 — Cloudflare bot-protection на границе.
**Вердикт:** частично подтверждена. Числа симулятора совпали с кодом; get_articles опровергнут (403). Дефекты: KI-006 (get_articles), KI-007 (rate limit), KI-008 (llm_saturation no-op).

## [2026-08-14 15:30] — Гипотеза: SDK v2 `registerTool` принимает `annotations.readOnlyHint`
**Ожидание:** tsc без ошибок при `{ annotations: { readOnlyHint: true } }` в опциях registerTool.
**Команда:** временная правка worker/index.ts → `npx tsc -p worker/tsconfig.json` → revert.
**Сырой результат:** `Command executed successfully` (0 ошибок), правка откачена.
**Вердикт:** подтверждена — спецификация MCP 2026-07-28 (tools.md) вводит поле `annotations`; SDK v2 типизирует `readOnlyHint`. Это позволяет документировать read-only тулы нативно, без текста в description.

## [2026-08-14 16:00] — Гипотеза: get_articles чинится UA-заголовком; возвращаются реальные статьи
**Ожидание:** `get_articles.execute()` с headers `User-Agent` возвращает live-статьи (source: live), а не 403.
**Команда:** `node .tmp/probe_articles.ts` (реальный fetch на dev.to с фиксом UA).
**Сырой результат:** `source: live, count: 5` — реальные заголовки («The Mechanical vs. The Semantic…» и др.). Дополнительно: `public/metrics.json` содержит 5 статей (CI-снапшот с UA-заголовком с GH Actions IP работает) → дифференциатор — UA, не IP-блок.
**Вердикт:** подтверждена. KI-006 закрыт в коде; live-подтверждение с CF-egress после деплоя.

## [2026-08-14 16:10] — Гипотеза: интеграционные тесты воркера покрывают rate limit, CORS, adversarial и конкуренцию
**Ожидание:** tests/worker.test.ts (12 тестов): 429 на лимит (MCP и CHAT), health без лимита, security-заголовки, CORS allow/deny, malformed JSON → 400, unknown tool/method → error, 8 параллельных tools/call с проверкой корректности фильтра; SDK v2 сериализует annotations в tools/list.
**Команда:** `pnpm test` (3 файла) + `pnpm typecheck` + `pnpm build`.
**Сырой результат:** 29/29 passed; typecheck чистый; build OK (252.60 KB JS, gzip 79.19 KB).
**Вердикт:** подтверждена — rate limit даёт 429, CORS fail-closed, adversarial отклоняются (400/-32602), конкуренция 8/8 без перекрёста, `readOnlyHint`/`openWorldHint` видны в tools/list.

## [2026-08-14 21:00] — Гипотеза: страница Lab #/lab собирается из JSON-проекций без новых зависимостей
**Ожидание:** 4 JSON-файла (experiments/diary/known-issues/test-suites) + dependency-free SVG-графики + хэш-роутинг не ломают сборку; тул-поверхность растёт 9→12 без потери readOnlyHint-аннотаций; тесты целостности ловят битые данные.
**Команда:** `pnpm test` (4 файла) + `pnpm typecheck` + `pnpm build`.
**Сырой результат:**
- `45 passed (45)` — intents 7, lab 5, mcp-tools 17, worker 16.
- typecheck: 0 ошибок (src + server + worker).
- build: `dist/assets/index-C5e-Dl4g.js 308.12 kB │ gzip 95.62 kB` (рост +16.4 KB gzip против 79.19 KB — страница+данные; библиотек не добавлено).
**Вердикт:** подтверждена. Данные/страница/тулы собираются, целостность охраняется тестами.

## [2026-08-14 17:00] — Гипотеза: CF Rate Limiting API binding применяется на аккаунте
**Ожидание:** после деплоя `[[ratelimits]]` (limit=10/60) бург POST /mcp даст 429 после ~10 запросов.
**Команда:** временный limit=10 + диагностика `x-dbg-limiter`/`x-dbg-limit-result` в заголовках (версия d1f29214) → бург 15 запросов → откат к limit=300 и чистой версии (03a42581).
**Сырой результат:** на всех запросах `limiter=present`, но `limit_result=true` на ВСЕХ 15 (при лимите 10) → 429 ни разу. Ранее: бург 320 с limit=300 → 0×429; бург 30 с limit=10 → 0×429. Деплой принимает биндинг (deployments list: версия 3b44fd05 активна 100%), рантайм не ограничивает.
**Вердикт:** опровергнута — на текущем тарифе Rate Limiting API НЕ применяется (вероятно, требует Workers Paid; точную причину не установить без billing-доступа). Биндинги оставлены в wrangler.toml (бесплатны, начнут enforce при апгрейде); код fail-open. Смягчение: CF bot-protection на границе (бот-UA → 403) + read-only поверхность тулов.

---

## 🚫 Отрицательные результаты (не повторять)

| Что пробовали | Почему не сработало | Дата | Связь |
|---------------|---------------------|------|-------|
| Передача сырой JSON Schema в `registerTool` (server v2) | Фабрика createMcpHandler падает на каждом запросе → HTTP 500 | 2026-08-14 | exp #1 |
| CF Rate Limiting API binding (`[[ratelimits]]`) на бесплатном тарифе | Деплой принимает биндинг, но `limit()` возвращает `success: true` всегда → enforcement отсутствует (проверено limit=10, бург 15/30/320) | 2026-08-14 | exp #7 |
| Запуск сервера как фоновый процесс в одной shell-сессии и обращение из другой | Windows убивает фоновые процессы по завершении shell (exit 7 / 000) | 2026-08-14 | интеграционные тесты |
