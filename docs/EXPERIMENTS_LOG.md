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

---

## 🚫 Отрицательные результаты (не повторять)

| Что пробовали | Почему не сработало | Дата | Связь |
|---------------|---------------------|------|-------|
| Передача сырой JSON Schema в `registerTool` (server v2) | Фабрика createMcpHandler падает на каждом запросе → HTTP 500 | 2026-08-14 | exp #1 |
| Запуск сервера как фоновый процесс в одной shell-сессии и обращение из другой | Windows убивает фоновые процессы по завершении shell (exit 7 / 000) | 2026-08-14 | интеграционные тесты |
