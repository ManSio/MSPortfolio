# AGENT_DIARY.md

Единственный дневник проекта. Формат «Вердикт-Сначала» (§4.8 AGENTS.md).

## [2026-08-14 23:50] — Lab #/lab v5: кривые нагрузки (load curves) из движка simulate_architecture
**Status:** ✅ Fixed
**Root Cause:** — (запрос владельца: «добавить ещё визуализаций — кривые нагрузки на LabPage»)
**Fix:** (1) `LineChart` — универсальный dependency-free SVG (multi-series p50/p95, оси, сетка, точки с tooltip, hover-legend). (2) Секция «09 · load curves» на LabPage: переключатели project × scenario, кривые из `runSimulation` — ТОТ ЖЕ движок, что MCP-тул simulate_architecture (single source of truth), + панель findings сценария. (3) Тесты 47/47 (SSR 9 секций), typecheck, build 98.51 KB gzip (+1.2 KB).
**Guard:** runSimulation — чистый, без сети; ARCHITECTURES/SCENARIOS уже экспортированы.
**Pattern:** NEW

## [2026-08-14 23:30] — Live-валидация /chat: агент отвечает фактами по всем проектам (mscodebase/gemma)
**Status:** ✅ Fixed (live)
**Root Cause:** — (закрыт открытый вопрос бэклога «/chat тестировать? (расход квоты)» — владелец дал команду)
**Fix:** 2 вопроса через живой endpoint (модель openrouter/free, серверный ключ):
1. «ONNX migration in mscodebase?» → агент вызвал get_diary, ответил точно (хардкод lm_studio → порт-проверка, ONNX Runtime v2.7.0, 50 тулов) — совпадает с exp-8/diary.
2. «Weak memory in gemma_agent?» → агент вызвал get_known_issues, нашёл KI-014 (substring stub, 4/10, Mem0) — точный ответ.
Вывод: цикл «вопрос → MCP-тул (lab-данные по ВСЕМ проектам) → grounded-ответ» работает на проде; выдумок нет.
**Guard:** чат заземлён на тулы (system prompt запрещает выдумывать); CI smoke проверяет chatConfigured.
**Pattern:** NEW

## [2026-08-14 23:00] — Lab #/lab v4: реальные данные по всем проектам (mscodebase/gemma из их репозиториев)
**Status:** ✅ Fixed
**Root Cause:** — (запрос владельца: «да» на добавление реальных записей по mscodebase/gemma; раньше lab-секции были только про MSPortfolio)
**Fix:** Собраны REAL-данные из публичных репозиториев через GitHub API (Verified):
- **mscodebase-intelligence**: exp-8 (ONNX-миграция с LM Studio, 7 критических багов, хардкод lm_studio → порт-проверка), exp-9 (LSP investigation — WONTFIX в Zed, решение basedpyright subprocess → 3 тула), diary ×2 (ONNX-фикс, LSP-bridge deprecation), KI-012 (LSP WONTFIX), KI-013 (LanceDB pin).
- **gemma_agent**: exp-10 (production evidence 2026-05, метрики токенов/латентности/стоимости, публичный экспорт ≠ возраст проекта), diary ×2 (export date ≠ prod date, memory stub 4/10), KI-014 (memory substring stub), KI-015 (название историческое, не Google Gemma).
- Итог: эксперименты 7→10 (7 confirmed / 1 partial / 2 refuted), дневник 19→23, KI 11→15.
**Guard:** данные собраны с публичных эндпоинтов (не выдуманы); docs/en/investigations/*.md и HONEST_POSITIONING.md — первоисточники.
**Pattern:** NEW

## [2026-08-14 22:30] — Lab #/lab v3: commit-log per project + честные пустые состояния (фикс «0 для mscodebase»)
**Status:** ✅ Fixed
**Root Cause:** владелец выбрал проект mscodebase-intelligence — секции экспериментов/дневника/KI показывали «0» (лаборатория документирует только сборку MSPortfolio), пустые карточки выглядели как сломанный UI; hero показывал «Tests 46», а реально lab.test.ts = 7 → сумма 47.
**Fix:** (1) **Commit-log per project** — новая секция «02 · commit log» из metrics.json (тот же источник, что get_commit_history): BarList по проектам + лента коммитов (repo/date/message/sha), фильтруется по выбранному проекту. (2) **Честные пустые состояния**: секции экспериментов/дневника/KI рендерятся только при наличии данных; при выборе проекта без lab-логов — единая секция «No lab pages for this project» (лаборатория документирует сам портфолио; evidence других проектов — decision log + commit history + get_commit_history). (3) test-suites.json: lab 6→7, total 46→47. (4) hero-метрики стали lab-wide (не зависят от фильтра), у фильтра подсказка.
**Guard:** SSR-тест проверяет 8 секций; данные commit-лога — из снапшота (не ломаются без сети, fallback пуст).
**Pattern:** NEW

## [2026-08-14 22:00] — Lab #/lab v2: EN-данные, per-project (decision logs + фильтр), стекло 2.0 + микро-анимации
**Status:** ✅ Fixed
**Root Cause:** — (запрос владельца: «агент берёт только из MSPortfolio? не вижу данных по каждому проекту, инцидентов, графиков решений; не хватает стекла/анимаций/интерактива; lab на русском»)
**Fix:** (1) **EN**: все JSON-проекции lab переведены (experiments/diary/known-issues/test-suites) — сайт полностью английский, русский остаётся только во внутренних docs/*.md (guard-тест: кириллица в lab-данных запрещена). (2) **Per-project**: добавлен тег `project` в эксперименты/дневник/KI + фильтр-вкладки «All projects / <проект>» + секция «01 · decision logs» (considered→chosen→why→cost из projects.json — single source of truth get_projects). (3) **Дизайн (тренды 2026)**: `.glass-card` — стекло 2.0 (слоистый blur+saturate, градиентная кромка через mask, верхний блик), `.hover-lift` на базовом Card, hover на Donut (active-сегмент + legend), hover-строки матрицы, hover-точки. prefers-reduced-motion поддержан. (4) Тесты 47/47 (lab +7: EN-проверка, project-теги, 7 секций SSR), typecheck, build 94.54 KB gzip.
**Guard:** tests/lab.test.ts (EN + структура); KI-011 обновлён; инструменты MCP отдают EN автоматически (читают те же JSON).
**Pattern:** NEW

## [2026-08-14 21:30] — Опубликованная dev.to-статья синхронизирована с 12 тулами; KI-009 закрыт
**Status:** ✅ Fixed
**Root Cause:** — (владелец опубликовал сокращённую версию статьи; в ней раздел «The nine tools» — 9 тулов, тогда как живой /mcp отдаёт 12; наш драфт docs/devto-article.md в публикацию НЕ попал — это разные тексты)
**Fix:** (1) Готовый текст правки для dev.to: заголовок «The nine tools» → «The twelve tools» + 3 строки таблицы (get_experiments/get_diary/get_known_issues) в стиле Question|Tool, порядок оригинала сохранён. (2) Сохранён зеркальный файл `docs/devto-article-published.md` — реально опубликованная версия + правка 12 тулов (репо теперь отражает опубликованное, а не расходящийся драфт). (3) KI-009 → ✅ Разрешено: Kubernetes в статье — только честный контрпример, консистентно с analyze_stack matched:false.
**Guard:** при публикации/правке статьи — сверять число тулов с `tools/list` живого endpoint; зеркало опубликованного хранить в docs/.
**Pattern:** P-002-вариант (расхождение «опубликовано vs репо» — проверка по живому источнику)

## [2026-08-14 21:00] — Lab page #/lab: лаборатория из дневников, экспериментов и тестов + 3 MCP-тула
**Status:** ✅ Fixed
**Root Cause:** — (feature по запросу владельца: «сделаем отдельную страничку со всеми данными и экспериментами, с графиками и зависимостями»)
**Fix:** (1) `src/data/lab/*.json` — машиночитаемые проекции EXPERIMENTS_LOG (7 экспериментов + 3 отрицательных), AGENT_DIARY (19 записей), KNOWN_ISSUES (10 KI), тест-сьютов (3/36). (2) Страница `#/lab` (`src/components/lab/LabPage.tsx` + dependency-free SVG `charts.tsx`: Donut/BarList/StackedBar — без библиотек, бандл +16KB gzip). (3) Хэш-роутинг в App.tsx (`#/lab` vs якоря секций; nav «Lab»). (4) MCP-тулы `get_experiments`/`get_diary`/`get_known_issues` (12 тулов всего) — агенты теперь могут отвечать «какие эксперименты ты проводил», «что сломалось и как чинил», «что ещё открыто» фактами. (5) Интенты RU/EN + QUICK_QUESTION + composeAnswer. (6) Тесты 45/45 (lab.test.ts 5 новых + mcp-tools +4), typecheck, build OK (95.62 KB gzip).
**Guard:** `tests/lab.test.ts` валидирует целостность lab-данных (вердикты, id, суммы тестов) — JSON-проекции не расходятся молча с кодом. KI-011 (синхронизация markdown↔JSON).
**Pattern:** NEW

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

## [2026-08-14 13:00] — SEO/mobile/CTA pass: OG-обложка, touch-targets, мобильная проверка
**Status:** ✅ Fixed
**Root Cause:** — (запрос владельца: закрыть пункты SEO-аудита, присланного вместе с задачей)
**Fix:** (1) Базовые мета уже были (title/description/og:title/og:description/og:url/canonical/JSON-LD Person) — добавлены `og:image` (сгенерирована `scripts/generate-og-cover.py` через PIL, 1200×630, фирменный стиль: ink/cyan/primary) + `og:image:width/height/alt` + `twitter:card=summary_large_image` + twitter:title/description/image. (2) CTA-секция 08 «Let's talk» (LinkedIn + fork-ссылка + MCP connect) после Timeline; mailto и Download CV не добавлены — email/CV у владельца не обнаружены (OPEN_QUESTION). (3) Мобильная проверка автоматизирована `scripts/check-mobile.mjs` (headless Edge + CDP, эмуляция 375×812): overflow=false, 8/8 секций рендерятся, но CTA-кнопки были 36–38px → Button получил `min-h-11` (44px, Apple HIG), инпут AgentChat выровнен. Timeline уже вертикальный — правок не потребовал.
**Guard:** `node scripts/check-mobile.mjs` как регресс-проверка вёрстки; og-cover регенерируется скриптом; .tmp в .gitignore.
**Pattern:** NEW

## [2026-08-14 15:00] — Live-аудит MCP-эндпоинта: get_articles 403, rate limit отсутствует
**Status:** 🟡 Partial (P1 открыт — KI-006)
**Root Cause:** (1) `get_articles` — dev.to отклоняет запросы из Cloudflare-воркера (с обычного IP 200, с воркера 403; вероятно IP-диапазон или отсутствующий User-Agent). (2) rate limiting не реализован ни в коде, ни в wrangler.toml (эмпирически 20×200, 0×429; смягчено только CF bot-protection для бот-UA).
**Fix:** НЕ фиксилось — найдено в исследовании (эксперименты против продакшена). План: get_articles → cron-snapshot (паттерн metrics, GITHUB_TOKEN/прямой fetch в CI) или User-Agent; rate limit → CF Rate Limiting API binding `[[ratelimits]]` (wrangler 4.36+, без латентности, per-location).
**Guard:** расширить CI smoke: tools/call get_articles (не только tools/list); эксперименты — EXPERIMENTS_LOG.md#3-4.
**Pattern:** NEW

## [2026-08-14 20:30] — get_articles не показывал новую статью (Varnish-кэш dev.to)
**Status:** ✅ Fixed (live)
**Root Cause:** dev.to отдаёт `/api/articles?username=...` через многослойный Varnish; после публикации статьи устаревшая копия живёт в кэше и отдаётся части egress'ов (CF, GH Actions — 5 статей; мой IP — 6). Доказательства: локальный пробник с тем же кодом давал 6; `cache: no-store` и cache-buster-параметр не помогали (Varnish нормализует неизвестные query-параметры); заголовки `Via: heroku-router, varnish, varnish` + `X-Cache: MISS, HIT`.
**Fix:** реальный API-параметр `state=published` меняет ключ Varnish-кэша → свежие данные. Проверено live: воркер отдаёт 6 статей, новая первой. Применено и в update-metrics.ts (CI-снапшот).
**Guard:** live-проверка get_articles; смоук tools/call get_articles уже в CI.
**Pattern:** P-002-вариант (три гипотезы подряд до подтверждения — кэш CF → URL-ключ CDN → egress; финальный корень на стороне dev.to)

## [2026-08-14 20:00] — Analytics Engine включён и привязан; авто-деплой токеном закрыт
**Status:** ✅ Fixed (live)
**Root Cause:** — (owner actions закрыты)
**Fix:**
1. CF API-токен (шаблон «Edit Cloudflare Workers») установлен через `gh secret set` (интерактивно) → `deploy-worker` впервые ЗЕЛЁНЫЙ (ранее 9109 — в секрете был битый токен; флаг `--body-file` в старой версии gh отсутствует → `--body`). Теперь каждый пуш авто-деплоит воркер.
2. Analytics Engine включён в дашборде; биндинг `ANALYTICS` → датасет `msp_portfolio` в wrangler.toml (согласовано с биндингом, добавленным в дашборде). Код writeDataPoint был готов (ctx.waitUntil, метод+тул) — другой агент не видел исходник и предлагал добавить его в минифицированный бандл (не понадобилось).
3. Live: 3 tools/call → счётчик today:16; AE-записи fire-and-forget. Проверка датасета — в дашборде (wrangler OAuth не имеет analytics-read, SQL API → 401).
**Guard:** CI smoke; KNOWN_ISSUES KI-007 (rate limit — не enforced на тарифе).
**Pattern:** NEW

## [2026-08-14 19:00] — Ideas 3/5/6: failure events в симуляторе, antipattern museum, terminal
**Status:** ✅ Fixed (live)
**Root Cause:** — (feature batch)
**Fix:**
1. Симулятор: runSimulation эмитит failure-mode события (circuit_open ≥100ms, fallback_engaged ≥200ms, degraded_mode при node_loss, cache_miss, queue_backpressure/llm_timeout_risk для LLM) — чипы в UI. Live: node_loss → degraded_mode + circuit_open@×10/×20.
2. Antipattern museum: `src/data/antipatterns.json` (7 реальных инцидентов из AGENT_DIARY, обобщённо: fork-as-own, hardcoded-theme, raw-json-schema-500, silent-live-break, wire-format-assertion, cancelled-fire-and-forget, assumed-binding-works) + MCP-тул `get_antipatterns` (9-й) + секция AntipatternsGrid.
3. Terminal: `src/components/playground/Terminal.tsx` — команды поверх тех же тулов (callLocalTool), секция «10 · the shell»; man/help/alias.
**Guard:** тесты 36/36 (get_antipatterns, events по сценариям, аннотации openWorldHint false); live-валидация: tools/list 9, antipatterns count 7, events.
**Pattern:** NEW

## [2026-08-14 18:30] — CI: refresh metrics до build; live-валидация новых фич
**Status:** ✅ Fixed
**Root Cause:** «Refresh metrics snapshot» стоял после «Build» — каждый деплой нёс снапшот предыдущего рана (get_commit_history показывал unavailable, пока CI не пересобрал).
**Fix:** шаг перенесён перед Build (deploy.yml). Live-валидация: get_commit_history → source:snapshot, count:15 (реальные коммиты); /mcp/stats → today:6/total:6 (считает tools/call); tools/list — 8 тулов; smoke зелёный.
**Guard:** смоук tools/list (get_commit_history) + tools/call get_articles.
**Pattern:** NEW

## [2026-08-14 18:00] — Features: get_commit_history, decision-log narrative, agent counter (/mcp/stats)
**Status:** ✅ Fixed (live)
**Root Cause:** — (feature batch)
**Fix:**
1. get_commit_history: снапшот коммитов в update-metrics.ts (топ-3/репо, фильтр cron-шума `[skip ci]`), тул читает metrics.json (fetch + fallback), /chat prompt + rule-based intent 'recent_work' + QUICK_QUESTION.
2. Decision log: нарратив «considered → this one → why → what it cost» в ProjectsGrid.tsx.
3. Agent counter: KV namespace MCP_STATS (4a57c087…), /mcp/stats (today/total), инкремент на tools/call (не на tools/list).
**Инцидент:** fire-and-forget `void promise` без `ctx.waitUntil` — workerd отменяет незавершённую работу после возврата response → KV пуст (wrangler kv key list = []), stats = 0 даже после tools/call. Фикс: `ctx.waitUntil(task)` + fallback `void task` для тестов. Подтверждено live: после фикса tools/call → stats today:1/total:1.
**Guard:** тесты воркера 34/34 (включая счётчик и /mcp/stats); live-валидация; §9 ловушка 10.
**Pattern:** NEW

## [2026-08-14 17:00] — Rate Limiting API не применяется на тарифе аккаунта (эксперимент)
**Status:** 🟡 Partial (код готов; enforcement зависит от плана)
**Root Cause:** Биндинг `[[ratelimits]]` деплоится и виден (env.MCP_RATE_LIMITER present), но `limit()` возвращает `success: true` на всех запросах даже при лимите 10 → рантайм не ограничивает. Вероятно, Rate Limiting API требует Workers Paid; точная причина не установлена (нет billing-доступа).
**Fix:** Эксперимент (limit=10 + debug-заголовки x-dbg-limiter/x-dbg-limit-result → 15/15 success) документирован; откат к limit=300 и чистой версии (03a42581 live). Биндинги остаются в wrangler.toml — начнут работать при апгрейде плана без изменения кода. Код fail-open, тесты зелёные.
**Guard:** EXPERIMENTS_LOG.md#7 (отрицательный результат); KI-007 обновлён. Смягчение на границе: CF bot-protection + read-only тулы.
**Pattern:** NEW

## [2026-08-14 16:40] — Smoke get_articles упал: экранирование `\"count\"` в SSE + live без фикса
**Status:** ✅ Fixed
**Root Cause:** (1) Новый смоук-шаг искал `"count"`, а в SSE-ответе tools/call поле лежит внутри JSON-строки text и экранировано (`\"count\"`) — grep никогда не матчил. (2) Дополнительно смоук честно показал, что live-воркер ещё на старом коде: `deploy-worker` скипается — секрет CLOUDFLARE_API_TOKEN в GitHub не задан (деплой вручную через wrangler login).
**Fix:** Паттерн смоука → `grep -q count` (без кавычек — матчится и старый, и новый формат); задокументировано в deploy.yml. Воркер с фиксами требует ручного деплоя владельцем (`pnpm cf:deploy`) или установки секрета CLOUDFLARE_API_TOKEN.
**Guard:** смоук гоняется на каждый push; тесты воркера (worker.test.ts) покрывают tools/call локально без SSE-нюансов.
**Pattern:** P-002-вариант (не сверил реальный wire-формат перед ассертом)

## [2026-08-14 16:00] — Хардненинг MCP-эндпоинта: rate limit, readOnlyHint, security-заголовки, KI-006/KI-008
**Status:** 🟡 Partial (код + тесты готовы; live-подтверждение после деплоя через CI deploy-worker)
**Root Cause:** KI-006 — dev.to 403 на запросы без UA из датацентрового egress; KI-007 — rate limit отсутствовал (подтверждено экспериментом 20×200); KI-008 — llm_saturation no-op без честного объяснения.
**Fix:** (1) `get_articles`: UA-заголовок + fallback на committed снапшот metrics.json (проверено: source live, 5 статей); (2) `wrangler.toml`: `[[ratelimits]]` MCP 300/60 + CHAT 30/60 (per IP+path), воркер возвращает 429, fail-open при отсутствии биндинга; (3) аннотации `readOnlyHint`/`openWorldHint` на все 7 тулов — SDK v2 сериализует их в tools/list (проверено тестом); (4) security-заголовки `nosniff`/`X-Frame-Options: DENY`/`Referrer-Policy` через finalize(); (5) KI-008: честный finding «no LLM stage» для не-LLM моделей; (6) CI smoke: добавлен tools/call get_articles (ловил бы KI-006); (7) Analytics Engine телеметрия /mcp (метод+тул, fire-and-forget).
**Guard:** tests/worker.test.ts (12 интеграционных: 429, CORS, adversarial, конкуренция 8×); tests/mcp-tools.test.ts (KI-008, аннотации); CI smoke get_articles. Итог: 29/29 тестов, typecheck, build.
**Pattern:** NEW

## [2026-08-14 15:30] — SDK v2 поддерживает annotations.readOnlyHint (проверено tsc)
**Status:** ✅ Fixed (знание)
**Root Cause:** — (верификация возможности)
**Fix:** Временная правка registerTool → tsc OK → revert. Спецификация MCP 2026-07-28 вводит `annotations`; SDK v2 типизирует readOnlyHint. Готово к использованию для документирования read-only тулов.
**Guard:** EXPERIMENTS_LOG.md#4.
**Pattern:** NEW
**Status:** ✅ Fixed
**Root Cause:** —
**Fix:**
1. Blog-раздел: карточки статей dev.to (обложки/теги/реакции), live+fallback+CI refresh, MCP-тул get_articles (7 тулов).
2. Vitest: 15 тестов (тулы MCP + интенты). Тесты поймали реальные дыры матчера: `мыслишь`/`вакансию`/`stack` не матчились — исправлено; несуществующее поле bottleneck в тесте — исправлено.
3. CI: deploy-worker job (авто-деплой Workers при CLOUDFLARE_API_TOKEN; секреты в `if` запрещены — прокси через env CF_TOKEN); CLOUDFLARE_ACCOUNT_ID установлен; прогон тестов добавлен в deploy.
4. LLM-чат: worker /chat (OpenRouter agent loop с заземлением на тулы), BYOK + серверный ключ; смоук проверяет chatConfigured.
**Инцидент:** при rebase потерялся T3.md (delete в коммите) — восстановлен из HEAD~1 (80211c0).
**Guard:** тесты в CI; T3.md — Danger Zone.
**Pattern:** NEW
