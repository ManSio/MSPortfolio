# Research: экосистема MCP-портфолио — что под капотом у конкурентов (2026-08-15)

> Задача: полноценный вскрышной анализ 5 внешних источников (страницы → репозитории →
> исходники) и ответ на вопрос: **есть ли там идеи лучше наших**.
> Метод: каждый источник вскрыт до уровня исходников (GitHub API + raw-файлы).
> Все утверждения о стороннем коде — Verified в этой сессии (ссылки на файлы/репо).

---

## 1. Краткая карта объектов

| # | Источник | Что это на самом деле | Вскрыто до |
|---|----------|----------------------|------------|
| 1 | lsquarem.com | L2M — MCP-native agent runtime (workflow builder + swarm + VS Code ext) | лендинг + org TensorGreed, репозитории (ai-orchestrator, l2m-samples, l2m-nodes-template, l2m-workflows) |
| 2 | registry.modelcontextprotocol.io | Официальный реестр MCP-серверов (git-based) | сайт + механика публикации (mcp-publisher CLI + GitHub OIDC, из статьи Prakhar) |
| 3 | sh20raj.github.io | Персональный портфель-воронка студента (500+ репо), ключевые MCP-проекты: MCP Pure, IndexFast | репо shade-solutions/mcp-pure (структура: apps/hub, apps/web, 13 серверов, docs/mcp/*.md), лендинг |
| 4 | dev.to/guptaprakhariitr | 17 MCP-продуктов на Cloudflare Workers + hub + монетизация | репо guptaprakhariitr (34+), флагман sec-edgar-mcp целиком: src/index.ts, mcp-server.ts, tools.ts, wrangler.toml, smithery.yaml, mcp-hub |
| 5 | glama.ai/.../srikanth-karthi/mcp-portfolio | Dual-stack MCP-сервер портфолио (Node + Python), stdio | репо целиком: src/index.js, portfolio-tools.js, db/ (git submodule), Dockerfile, CI/CD |

---

## 2. Что под капотом у каждого

### 2.1 L2M (lsquarem.com) — не портфолио, а рантайм для агентов

Продукт: «MCP-native agent runtime» — визуальный workflow-builder, где MCP-серверы —
первоклассные ноды, а не «HTTP-обёртки» (прямое сравнение с n8n/Langflow/Flowise).

**Архитектура (verified с лендинга):**
- **Workflow JSON** — версионированный контракт (`schemaVersion: "1.0.0"`): ноды
  (webhook_input, agent_orchestrator, chat_model, memory, mcp_tool) + рёбра DAG с
  attachment-портами. Чек-ин в git, диффы, импорт куда угодно.
- **Branching DAG executor**: топологический порядок, `if`/`switch`/`try-catch`,
  интерполяция `{{key}}` из merged scope.
- **Multi-agent Swarm**: Supervisor → Worker иерархия через attachment-порты, воркеры
  становятся «синтетическими тулами» для родителя (рекурсивно), у каждого свой
  model/memory/tools.
- **Транспорты**: stdio, http_streamable, mock — in-box. MCP Tool нода «пробует» сервер,
  листит тулы, dry-run'ит инлайн.
- **Production-фундамент**: auth (RBAC/MFA/SSO), AES-256-GCM secrets, webhooks
  (HMAC/idempotency), Prometheus/OTEL, multi-main HA на Postgres leader election.
- **Стек**: Vite + React 19 + React Flow / Fastify v5 + zod / SQLite (better-sqlite3) или
  Postgres / Docker·Helm·GHCR.
- Репо: org **TensorGreed** — `ai-orchestrator` (движок, TS), `l2m-samples`,
  `l2m-nodes-template` (скаффолд community-нод), `l2m-workflows`.

**Отношение к нам:** это класс «agent runtime», не «портфолио». Полезная идея —
**workflow-as-MCP-tool** (экспорт воркфлоу как MCP-инструмента) и **версионированный
JSON-контракт данных**. Наш аналог контракта уже есть: lab-данные + projects.json —
единый JSON, который читают сайт, MCP-тулы и чат.

### 2.2 Официальный реестр (registry.modelcontextprotocol.io)

Сайт — React-приложение поверх git-хранилища метаданных. Публикация — через
`mcp-publisher` CLI + GitHub OIDC в CI (**~2 мин после настройки workflow**, источник:
Prakhar §Distribution). Формат записи — `server.json` в репо-реестра.
Это **канал дистрибуции №1 для видимости** — у нас листинга нет.

### 2.3 sh20raj.github.io — портфель-воронка + MCP Pure

Личный сайт-воронка: метрики «proof» (4.3M запросов, 213k визитов...), кейсы, PR-доказательства
(79 merged PR во внешние репо, включая google-gemini/gemini-cli), fellowship'ы. MCP-проекты
встроены в общий нарратив как «real systems, used by real people».

**MCP Pure** (shade-solutions/mcp-pure, verified):
- **Один Cloudflare Worker = хаб нескольких MCP-серверов**: `apps/hub/src/mcp/<platform>/`
  с триадой файлов на каждый сервер: `index.ts` (роутинг/регистрация), `service.ts`
  (клиент провайдера), `tools.ts` (определения тулов). Хаб: `src/index.ts` + общая
  утилита `utils/mcp.ts` (обёртка над официальным
  `WebStandardStreamableHTTPServerTransport` из SDK, envMapper для Bearer-ключей).
- **apps/web** — Next.js-лендинг с per-server страницами `docs/mcp/*.md` (каждый сервер
  описан markdown-доком).
- Серверы: apollo, bluesky, exa, github, gmail, instagram, mastodon, reddit, resend,
  slack, telegram, tumblr, youtube (13) — большинство с OAuth-токенами.
- **IndexFast** — отдельный MCP-сервер: пушит URL в Google/Bing/IndexNow из IDE.

**Отношение к нам:** паттерн «один воркер — много серверов + общий транспорт» ценен,
если мы будем хостить >1 MCP-сервера (у нас сейчас 1 сервер × 12 тулов — норм).
Персональный сайт как воронка с proof-метриками — мы уже делаем это лучше
(живые метрики + lab).

### 2.4 Prakhar Gupta — 17-продуктовый MCP-портфель (dev.to + github.com/guptaprakhariitr)

**Тезис:** не один wedge, а 17 тонких Worker'ов поверх бесплатных публичных API;
портфель = хедж против неизвестности покупателя. Маржинальная стоимость продукта мала,
потому что есть шаблон.

**Шаблон продукта (verified на флагмане sec-edgar-mcp):**

```
src/index.ts        — роутер воркера: /mcp, /openapi.json, /llms.txt, /upgrade,
                      /account(+rotate/team/export/delete), /webhooks/dodo, /support,
                      /admin/list-*, /health, landing-страница (inlined HTML)
src/mcp-server.ts   — СВОЙ мини-JSON-RPC MCP-сервер (~160 строк): initialize,
                      tools/list, tools/call, ping; тир-гейтинг premium-тулов
                      (listTools(tier) фильтрует по "free|solo|team|pro")
src/tools.ts        — определения тулов (inputSchema + handler + premium?)
src/auth.ts         — extractBearer → resolveKey (KV) → tier
src/billing.ts      — checkAndIncrement: KV-квота, лимиты по тирам,
                      withRateLimitHeaders (callsRemaining в заголовках)
src/cache.ts        — KV-кэш upstream-ответов
src/edgar.ts        — клиент SEC EDGAR
src/checkout.ts     — 51 КБ! Dodo Payments checkout + account-портал + team-инвайты
src/webhook.ts      — Dodo webhook → выдача/ротация API-ключей
src/openapi.ts      — генерация OpenAPI из тулов
src/email.ts        — письма с ключом (Resend/Brevo)
src/admin.ts        — админка по ADMIN_TOKEN
wrangler.toml       — KV CACHE + KV USAGE, vars (продуктовые строки), secrets
smithery.yaml       — remote http: url + configSchema(apiKey) + tools + auth
server.json         — для официального реестра
docs/TOOLS.md, DISTRIBUTION.md, LISTINGS.md; llms.txt; test/ (vitest, fixtures)
```

**Экономика (verified с лендинга + wrangler.toml):**
free 100 calls/mo/IP → Solo $9/2k → Team $29/10k (премиум-тулы) → Pro $79/50k.
Платежи — Dodo Payments (не Stripe). Break-even ≈ 10 платных клиентов. На день публикации: 0.
Уроки: «build first 3 hard, then template», «Stripe day 0», «sharper buyer».

**Дистрибуция (главный практический вклад):**
| Каталог | Механизм | Стоимость |
|---------|----------|-----------|
| Официальный registry | mcp-publisher CLI + GitHub OIDC | ~2 мин после CI |
| Smithery | smithery.yaml в репо, автокравл | ~0 мин |
| Glama | автокравл awesome-mcp-servers | ~0 мин после PR |
| mcp.so / PulseMCP / MCPMarket | формы/issue | ~5 мин/продукт |
| Cursor gallery / awesome-mcp | PR | разово |

**Инсайт про tool surface** (прямая цитата): «Tool descriptions are what the LLM reads» —
описания пишутся как доки для «умного, но неинформированного коллеги»; тулы не должны
пре-суммаризировать (LLM сам лучше); композиция: `get_company` → `search_filings` →
`read_filing`. 3 тула — мало, 9-12 — верхняя граница до misrouting.

**Отношение к нам:** самый близкий по духу источник. Главный гэп у нас — дистрибуция
(0 листингов против 136 сабмитов). Второй гэп — квота на KV, работающая БЕЗ платного
тарифа CF (наш KI-007: rate limit код есть, enforcement нет).

### 2.5 srikanth-karthi/mcp-portfolio (Glama) — «портфолио как MCP» в минимальном виде

**Архитектура (verified):**
- **Dual-stack**: Node (src/index.js, stdio, официальный SDK
  `@modelcontextprotocol/sdk`, класс `Server` + `StdioServerTransport`) И Python
  (src/mcp_portfolio_server/) — один и тот же функционал на двух рантаймах.
- **Данные — git submodule**: `db/portfolio-data` → отдельный репозиторий
  srikanth-karthi/portfolio-data с `ai-portfolio.json` (категории: Profile, Experience,
  Education, Tech Stack, Certifications, Contact...). Загрузка данных — multi-path
  discovery + `DATA_PATH` env + graceful fallback.
- **5 тулов**: search_portfolio (substring-поиск по title/description/keywords + category
  + limit), get_portfolio_categories, get_portfolio_item (id), get_contact_info,
  get_tech_stack. Ошибки — `McpError` (InvalidRequest/MethodNotFound/InternalError).
- **Дистрибуция (избыточно богатая для портфолио)**: npm + GitHub Packages + PyPI +
  Docker Hub + GHCR; multi-stage Dockerfile (targets: nodejs/python/multi); docker-compose;
  CI/CD на git tags (multi-arch AMD64/ARM64).
- **Качество-обвязка**: vitest, .gitleaksignore, sonar-project.properties, SECURITY.md,
  CONTRIBUTING.md, deepsource.

**Отношение к нам:** функционально мы его обгоняем по всем осям (12 тулов, live-данные,
сайт+lab, HTTP-транспорт, security). Но у него есть то, чего нет у нас: **публикация
в 4 пакетных реестра** (npm/PyPI/Docker) и **данные отдельным репо**. Для портфолио
это over-engineering; заимствовать нечего, кроме дисциплины multi-registry, если решим
публиковать сервер как npm-пакет.

---

## 3. Сравнительная таблица «мы vs они»

| Ось | MSPortfolio (мы) | Prakhar (17) | srikanth | MCP Pure | L2M |
|-----|------------------|--------------|----------|----------|-----|
| MCP-транспорт | Streamable HTTP (Fastify + workerd-native) | HTTP (самописный JSON-RPC) | stdio | HTTP (SDK transport) | stdio/http_streamable/mock |
| Тулов | 12 | 3-12/продукт (6 у флагмана) | 5 | 3-8/сервер | ноды/воркфлоу |
| Single source of truth (тулы = сайт = чат = графы) | ✅ УНИКАЛЬНО | ❌ | ❌ | ❌ | частично (workflow JSON) |
| Live-данные + честный fallback | ✅ (live/snapshot/unavailable) | частично (KV-кэш upstream) | ❌ (статический JSON) | ❌ | ❌ |
| Телеметрия использования тулов | ✅ Analytics Engine (method+tool) | ✅ KV-квота | ❌ | ❌ | ✅ Prometheus/OTEL |
| Rate limiting / квоты | ⚠️ код есть, enforcement нет (KI-007) | ✅ KV-квоты по тирам, работает всегда | ❌ | ❌ | ✅ (на уровне продукта) |
| Монетизация | ❌ (не цель) | ✅ Dodo, 4 тира | ❌ | ❌ | ✅ enterprise-фундамент |
| Дистрибуция по каталогам | ❌ 0 листингов | ✅ 8 каталогов, 136 сабмитов | ✅ npm/PyPI/Docker/GHCR | ✅ сайт+репо | ✅ GitHub/docs |
| Landing/SEO | ✅ GH Pages + llms.txt + sitemap + OG | ✅ /llms.txt + лендинг с воркера + hub | ❌ | ✅ Next.js + docs/mcp/*.md | ✅ docs site |
| OpenAPI-экспорт | ❌ | ✅ /openapi.json | ❌ | ❌ | ❌ |
| Доказательство процесса (lab/эксперименты/дневник как тулы) | ✅ УНИКАЛЬНО | ❌ | ❌ | ❌ | ❌ |
| Интерактивный симулятор архитектуры | ✅ УНИКАЛЬНО | ❌ | ❌ | ❌ | ❌ (есть симуляция воркфлоу, не архитектуры) |

---

## 4. Идеи, которые лучше наших (или у нас отсутствуют) — вердикты

### P1. Дистрибуция: листинги в MCP-каталогах — НАШ ГЛАВНЫЙ ГЭП
У нас ноль листингов при готовом публичном endpoint. Для портфолио, чья цель —
видимость у рекрутеров и агентов, это самый дешёвый рост.
- **smithery.yaml** (автокравл, ~0 мин после пуша) — формат verified: `remote: http`,
  `tools: [...]`, `auth: bearer optional`.
- **server.json + mcp-publisher** в официальный registry (GitHub OIDC, CI workflow).
- **PR в punkpeye/awesome-mcp-servers** (разовый, даёт автокравл Glama).
- mcp.so / PulseMCP — формы, опционально.
Усилие: ~1-2 часа суммарно. Результат: сервер находится по запросу «MCP portfolio server».

### P2. KV-квота в стиле Prakhar как рабочий fallback к CF Rate Limiting
KI-007: CF `[[ratelimits]]` не применяется на бесплатном тарифе. Prakhar решил это
KV-счётчиком (~30 LOC, `incrementUsage` + `checkQuota`, eventually-consistent терпим).
У нас KV `MCP_STATS` уже есть (счётчик) — добавить лимит анонима (например
100 calls/mo/IP) — это и защита, и та же метрика. Проверено у них: работает на free tier.

### P3. /llms.txt и /openapi.json на воркере
У нас llms.txt есть ТОЛЬКО на статике (public/). Prakhar отдаёт `/llms.txt` прямо с
воркера (описание сервера + тулов + install-инструкция — для AI-поисковиков) и
генерирует `/openapi.json` из тулов. Оба — ~30-60 строк кода на наш воркер.

### P4. «Calls remaining» и квота как видимая метрика
У Prakhar ответ снабжён заголовками лимита и callsRemaining — пользователь видит остаток.
У нас /mcp/stats уже есть; можно сделать лимит-заголовки (X-RateLimit-*) — дёшево,
добавляет «живости» демо (см. идею 4 в portfolio-ideas.md — счётчик агентов).

### P5. Tool descriptions: добавить «Use this when...» паттерн во все 12 тулов
Мы частично уже в этом стиле (get_diary: «use it to answer "what broke"»). Prakhar делает
это системно. Плюс **12 тулов = верхняя граница** (9-12 до misrouting у слабых моделей) —
следить, не группировать ли get_diary/get_known_issues/get_experiments, если появится
misrouting. Сейчас не группировать: lab-страница и чат используют их раздельно.

### (Наблюдение) MCP Pure: «один воркер — много серверов»
Полезно ТОЛЬКО если заведём второй/третий MCP-сервер. Тогда паттерн
`src/mcp/<name>/{index,service,tools}.ts` + общий transport-утилит — чистый.
На сейчас — не нужно, наш сервер самодостаточен.

### (Наблюдение) L2M: workflow-as-MCP-tool / versioned JSON contract
Концептуально мы уже владеем: lab-данные + projects.json — импортируемый JSON-контракт,
читаемый тремя поверхностями. Экспорт нашего /chat как MCP-тула — по сути уже есть
(тулы — это и есть поверхность чата).

---

## 5. Где мы впереди (защищаемые позиции, ни у кого из 5 нет)

1. **Single source of truth**: одни тулы → Node-сервер, worker, браузерное демо,
   lab-графики, чат. Prakhar продаёт «одни данные на всё», но у него сервер и сайт-хаб
   разнесены; у нас это буквально один модуль `src/lib/mcp-tools.ts`.
2. **Двойной хостинг** одного кода: Fastify (Streamable HTTP) + workerd-native worker —
   zero-ops публичный endpoint и локальный для dev/CI.
3. **Честные живые метрики** с трёхпозиционным fallback (live/snapshot/unavailable) и
   «numbers can never be fake» — декларация Prakhar, реализация у нас.
4. **Grounded-чат** с цепочкой бесплатных моделей + BYO-key — ни у кого из них нет
   «спроси портфолио» на сайте.
5. **simulate_architecture + lab (diary/experiments/KI) как MCP-тулы** — уникальный
   «proof-of-work»-слой; конкуренты отдают только факты, мы отдаём процесс.
6. **Security-обвязка**: security headers, CORS allow-list, fail-open rate limit,
   waitUntil-телеметрия (исторический баг с KV на деплое задокументирован).

---

## 6. Рекомендации (приоритет)

| # | Действие | Источник идеи | Усилие | Эффект |
|---|----------|---------------|--------|--------|
| 1 | smithery.yaml + server.json + PR в awesome-mcp-servers (дистрибуция) | Prakhar | ~1-2 ч | Видимость сервера во всех каталогах |
| 2 | KV-квота анонима (fallback к rate limit) на воркере | Prakhar billing.ts | ~30-50 LOC + тест | Рабочая защита на free tier (закрывает KI-007 частично) |
| 3 | /llms.txt и /openapi.json на воркере | Prakhar index.ts/openapi.ts | ~60 LOC | AI-discoverability + curl-документация |
| 4 | X-RateLimit-* заголовки + видимый остаток квоты | Prakhar billing.ts | ~20 LOC | Живая метрика «сколько агентов опросили» |
| 5 | Аудит описаний тулов на «Use this when...» | Prakhar tools.ts | 30 мин | Меньше misrouting у слабых моделей |

**Не заимствовать** (осознанно): монетизация/Dodo (не цель портфолио), dual-stack
Node+Python+4 реестра (over-engineering), submodule-данные (у нас SSOT лучше),
premium-тулы (нет аудитории с ключами).

---

## 7. Ограничения метода

- Официальный registry вскрыт только до механики публикации (сайт — JS-приложение,
  API-эндпоинты не опрашивались); механика mcp-publisher подтверждена независимым
  источником (статья Prakhar, §Distribution).
- L2M вскрыт на уровне лендинга + списка репо (исходники движка не читались —
  для целей сравнения с портфолио это не требуется).
- Числа трафика sh20raj (4.3M запросов и т.п.) — его заявленные метрики, не верифицированы.

*Отчёт подготовлен по протоколу §1/§3 AGENTS.md. Первоисточники — ссылки в §1.*
