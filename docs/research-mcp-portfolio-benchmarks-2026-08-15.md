# Research Round 2: 5 бенчмарков-людей + 1 новый конкурент. Решения для MSPortfolio (2026-08-15)

> Вход: анализ владельца (сравнение с OrchestKit/Yonatan, Nina, Ayush, Nishikanta + вывод
> «слабость — не архитектура, а proof of adoption»).
> Метод: **каждая цифра и репозиторий верифицированы** через GitHub API в этой сессии.
> Расхождения с входящим анализом — явно помечены. Итог — приоритизированные РЕШЕНИЯ
> с привязкой к нашему коду.

---

## 0. Верификация входящего анализа

| Утверждение из анализа | Проверено (GitHub API) | Вердикт |
|------------------------|------------------------|---------|
| OrchestKit: 105 skills, 36 agents, 215 hooks, ~218★, 20 forks, 93 issues | **219★, 20 forks, 88 issues; description: 105 skills, 36 agents, 217 hooks**; TypeScript, MIT; pushed 2026-08-14 (активен); homepage orchestkit.yonyon.ai | ✅ подтверждено (±1-5%) |
| OrchestKit hooks работают на SessionStart/UserPromptSubmit/PreToolUse/PostToolUse/Stop | Движок Claude Code hooks — стандарт; набор подтверждён масштабом репо (343 MB) | ✅ правдоподобно (детали движка не читал) |
| Nina: agent-memory-engine, «78% fewer context tokens at 93% recall», eval harness | Репо `Ninadnj/agent-memory-engine` (Python, MIT, 1★, 3 forks): «token-budgeted recall… **published benchmark and its controls**». **Числа 78%/93% — из её сайта, в GitHub-метаданных нет** — не верифицированы | ⚠️ частично: репо и benchmark подтверждены; конкретные цифры — с её слов |
| Nina сильнее в production-кейсах, слабее в failure analysis | **У неё ЕСТЬ honest-agent (phantom tool calls 6→0, deterministic + real-LLM eval arms), idk-layer (guard proxy против галлюцинаций), mcp-skills-kit (per-skill evals)** — это ровно наша ось epistemic correctness | ❌ анализ недооценил её близость к нашей линии |
| Ayush: portfolio-mcp-server, FastMCP, 5 тулов, mypy/ruff/CI/smoke | `ayush-s-tomar/portfolio-mcp-server` — Python, FastMCP, MIT, 1★; описание совпадает | ✅ подтверждено |
| Nishikanta: renderer-mcp-server 1 commit 0 stars, MCP как часть продукта | `NishikantaRay/renderer-mcp-server` — 0★, TypeScript, 46 KB, 1 push (2025-12-29); renderer — конфиг-портфолио | ✅ подтверждено |
| Yonatan portfolio MCP: ask_yonatan/browse_projects/book_intro_call, Streamable HTTP без auth | yonyon.ai + orchestkit подтверждены; **конкретные 3 тула — с mcp.so, напрямую не проверял** | ⚠️ частично |

### 🔴 НОВАЯ находка (не была во входящем анализе)

**`rubenmarcus/portfolio`** — «Agent-ready portfolio… a remote MCP server
(**io.github.rubenmarcus/portfolio, on the official MCP Registry**), a public Agent Skill,
llms.txt and a plain-text resume over curl». Astro + Svelte + Three.js + GSAP, 23★, 4 forks,
активен (pushed 2026-08-15), MIT. **Это единственный найденный прямой конкурент, который
УЖЕ сидит в официальном реестре MCP** — живое доказательство, что наш P1 (дистрибуция)
реализуем и уже так делается в нашей нише.

---

## 1. Бенчмарки (verified, кратко)

1. **Yonatan Gross / OrchestKit** — продукт, который «ставят и используют»: 219★, hooks
   в жизненном цикле агента, docs/discussions, MIT. Выигрывает adoption'ом и maintainer-дисциплиной.
2. **Nina Doinjashvili** — философия «if it isn't measured, it isn't done»: MCP-память с
   published benchmark + controls; плюс honest-agent/idk-layer (защита от фантомных вызовов
   тулов и галлюцинаций). Ближайшая к нам по epistemic-линии.
3. **Ayush Tomar** — аккуратный минимальный portfolio-MCP (FastMCP, 5 тулов, CI, lint).
   Архитектурно на голову проще нас — но onboarding-упаковка у него есть (MCP Inspector demo).
4. **Nishikanta Ray** — MCP решает проблему самого продукта (search docs / read repo /
   validate TOML / templates) — урок «MCP как полезность, а не витрина».
5. **Yonatan (yonyon.ai)** — portfolio → product → business funnel (book intro call через MCP).
6. **rubenmarcus** — **portfolio в официальном реестре + Agent Skill + llms.txt + резюме по curl**.

---

## 2. Сводная карта осей (обновлённая)

| Ось | ManSio | OrchestKit | Nina | Ayush | Nishikanta | rubenmarcus |
|-----|:------:|:----------:|:----:|:-----:|:----------:|:-----------:|
| MCP-архитектура | 9 | 9 | 8 | 6 | 7 | 7 |
| Agent systems | 8 | 10 | 9 | 5 | 6 | 5 |
| Evaluation / evals | 9 | 8 | 10 | 6 | 5 | 5 |
| Provenance / failure analysis | 10 | 7 | 9 | 5 | 5 | 5 |
| Product maturity / adoption | 3 | 9 | 4 | 2 | 2 | 3 |
| Portfolio-as-MCP | 10 | 7 | 8 | 8 | 7 | 9 |
| **Дистрибуция по MCP-каталогам** | **0** | 7 | 3 | 2 | 1 | **9** (официальный registry) |
| Onboarding «поставь и используй» | 5 | 10 | 6 | 8 | 5 | 7 |
| Site как продукт | 8 | 8 | 6 | 4 | 8 | 9 |

Диагноз подтверждён: **мы впереди по инженерной/эпистемической глубине; проигрываем
по adoption, дистрибуции и onboarding-упаковке.** rubenmarcus доказывает, что закрыть
дистрибуцию можно за дни, а не месяцы.

---

## 3. РЕШЕНИЯ (приоритизированный бэклог с привязкой к коду)

> **Статус реализации на 2026-08-15: D1 и D2 — РЕАЛИЗОВАНЫ** (тесты 51/51, typecheck чистый):
> `server.json`, `smithery.yaml`, `.github/workflows/publish-mcp.yml`, `public/msp-portfolio.skill.md`,
> воркер: `/resume.txt` + `/llms.txt` (генерируются из тех же тулов — SSOT),
> чеклист: `docs/mcp-distribution.md`. Осталось вручную: тег `v*` (публикация в registry) и
> PR в awesome-mcp-servers (сниппет готов). **D3 — РЕАЛИЗОВАН (см. §7 консенсус):**
> `verify_claim` (13-й тул, Evidence Score v1) + evidence-блок в /chat + `tests/evidence-eval.test.ts`.
> **Сайт (D3-видимость, 2026-08-15):** evidence-фрейм в чате (LLM и rules-режим) +
> виджет «Verify a claim» в Agent-секции (`ClaimVerifier.tsx`), общий `src/lib/evidence.ts` (SSOT воркер↔сайт).
> Приоритеты после консенсуса: D6 понижен до P3 (adoption-цифры вторичны).

### D1. Дистрибуция: официальный registry + Smithery + awesome-mcp — P1
- **Почему:** наш главный гэп (0 листингов); rubenmarcus — живой прецедент в той же нише.
- **Как:** `server.json` (формат официального реестра) + workflow `mcp-publisher` (GitHub
  OIDC) → `smithery.yaml` (remote http, verified формат у Prakhar) → PR в
  punkpeye/awesome-mcp-servers (даёт автокравл Glama).
- **Где:** корень репо + `.github/workflows/publish-mcp.yml`.
- **Done:** сервер виден в registry.modelcontextprotocol.io + Smithery + Glama.
- **Усилие/риск:** ~2-3 ч; риск — требования реестра к метаданным (исправимо за минуты).

### D2. «Плоский текст по curl» + публичный Agent Skill — P1
- **Почему:** паттерн rubenmarcus; прямой ответ на «proof that people can use your system»;
  агент (и человек) получают резюме без MCP-клиента — нулевой порог входа.
- **Как:** (а) эндпоинт `/resume.txt` на воркере (генерируется из `src/data/projects.json` +
  profile — тот же SSOT); (б) `AGENTS.md`/skill-файл в репо (`public/msp-portfolio.skill.md`),
  который агент может забрать и использовать как инструкцию; (в) упомянуть оба в `llms.txt`.
- **Где:** `worker/index.ts` (+ строка в `public/llms.txt`).
- **Done:** `curl https://msp-portfolio.*.workers.dev/resume.txt` возвращает текст; skill-файл
  в репо.
- **Усилие/риск:** ~1-2 ч; риск минимальный (read-only данные, уже публичные).

### D3. Evaluation harness для MCP-тулов (deterministic + LLM arm) — P2
- **Почему:** идея Nina («if it isn't measured, it isn't done»); у нас lab.test.ts проверяет
  структуру, но НЕТ эвала «правильный ли ответ агент даёт рекрутеру на типовые вопросы».
  Это усиливает нашу уникальную линию проверяемости.
- **Как:** `tests/agent-eval.test.ts`: 5-10 канонических вопросов (RU/EN) → детерминированная
  рука (вызов `getTool(...).execute` + assert фактов, извлекаемых правилами, как в
  `src/lib/intents.ts`); опциональная LLM-рука через `runAgentWithModel` (worker) — маркируется
  как non-deterministic. Результаты — в lab (test-suites.json + diary).
- **Done:** тест в CI; эвал-кейсы видны на `#/lab`.
- **Усилие/риск:** ~0.5-1 день; риск — флаки LLM-руки (решается флагом/таймаутом).

### D4. KV-квота анонима на воркере — P2
- Round 1 P2, без изменений: `checkAndIncrement` в стиле Prakhar на существующем
  `MCP_STATS` KV — рабочий fallback к CF rate limit (KI-007), лимит ~100 calls/mo/IP,
  X-RateLimit-* заголовки (callsRemaining) — заодно даёт видимую метрику.

### D5. /llms.txt и /openapi.json на воркере — P2
- Round 1 P3, без изменений: AI-discoverability + curl-документация сервера.

### D6. Adoption-метрика на сайте — P2
- **Почему:** у нас телеметрия есть (Analytics Engine + /mcp/stats), но публичной витрины
  «сколько агентов сегодня опросили» нет (идея 4 из portfolio-ideas.md).
- **Как:** hero/секция на сайте тянет `/mcp/stats` (CORS уже настроен) с fallback на 0;
  статический снапшот в metrics.json для статики.
- **Усилие:** ~2-3 ч фронтенда.

### D7. Onboarding-блок «поставь и используй за 30 секунд» — P3
- **Почему:** урок Yonatan/Ayush (у Ayush — MCP Inspector demo).
- **Как:** секция на сайте: одна команда `claude mcp add --transport http ...` (уже есть в
  README) + ссылка на MCP Inspector + 3 примера вопросов. Контент-задача, без кода движка.

### D8. Contact CTA внутри MCP-тулов (funnel-паттерн Yonatan) — P3
- **Почему:** portfolio → business funnel; у нас get_contact_info есть, но нет CTA.
- **Как:** в результат `get_profile` добавить блок `nextSteps` (email/telegram/календарь),
  без новых тулов. Осторожно: не превращать тулы в спам.

---

## 4. Чего НЕ делаем (осознанный отказ)

- **OrchestKit-масштаб** (105 skills / 36 agents / 217 hooks) — это другой продукт
  (инструмент для разработчиков), не портфолио; копировать операционную машинерию без
  аудитории = строить склад под пустой магазин.
- **Мульти-реестры npm/PyPI/Docker** (srikanth-паттерн) — over-engineering для портфолио;
  наша дистрибуция — MCP-каталоги (D1), а не пакетные менеджеры.
- **WebGL/Three.js сайт** (rubenmarcus) — не наша ось; наш контент (lab/данные) важнее обёртки.
- **Монетизация/тиры** (Prakhar-паттерн) — не цель портфолио.

---

## 5. Новая позиционирующая формулировка

Сейчас: «This is how I build» → уже есть: «Here is a system that lets you verify how I build».
Добавляем после D1-D3: **«...and here is a system you can actually use»** — дистрибуция
(D1), нулевой порог входа (D2) и измеренная корректность ответов (D3).

Это соответствует выводу владельца: копировать никого не надо; берём productization
(Yonatan/rubenmarcus), measurability (Nina), onboarding-простоту (Ayush), MCP-полезность
(Nishikanta) — ядро остаётся evidence/provenance/failure analysis.

---

## 6. Ограничения

- Цифры Nina (78%/93%) и тулы yonyon.ai MCP (ask_yonatan и др.) — со страниц, не из
  первоисточников кода.
- OrchestKit вскрыт на уровне метаданных + лендинга; внутренности движка не читались
  (для решений не требуется).
- rubenmarcus вскрыт только по метаданным репо (структура не читалась) — для D1-D2 это
  паттерн-прецедент, не исходник.

---

## 7. Консенсус с внешним ИИ (2026-08-15)

Вход: предложения внешнего ИИ («найти консенсус по протоколу»). Итог — по каждому пункту:

| Предложение внешнего ИИ | Вердикт | Что сделано |
|-------------------------|---------|-------------|
| Рефрейм: проблема не «adoption», а «доказать, что архитектурный moat существует и им можно воспользоваться» | ✅ принято | Позиционирование обновлено в `README.md` (Why this exists) + финальная фраза |
| D3 важнее adoption-метрик («MCP calls: 17,842 ничего не доказывает; 47/50 grounded — доказывает») | ✅ принято | D3 поднят в P1 и реализован; D6 понижен до P3 |
| **Evidence Score** (Answer→Claim→Evidence→Source→Temporal→Verification) | ✅ принято **с модификацией** | v1 — детерминированный тул `verify_claim` (13-й): корпус = те же данные, что у остальных тулов; supported при ≥2 значимых словах в одной записи; возвращает source-пути. Temporal-провенанс частично уже есть (`source: live/snapshot/unavailable` в get_articles/get_commit_history) |
| LLM-извлечение claims + скоринг | ❌ отклонено для v1 | Флаки + стоимость + риск круговой логики («verified потому что LLM сказал»). Детерминизм — наша ось; LLM-рука — только как опциональный eval (D3, v2) |
| «N/N claims verified» как язык доказательства | ✅ принято | `computeEvidence` в /chat: toolCalls/grounded/failed/ungrounded — детерминированно из шагов |
| Финальная фраза «And here is how I know when it is wrong» | ✅ принято | Добавлена в README (Why this exists) |
| Приоритеты P0 core / P1 D1+D2 / P1-P2 D3 / P2 D5·D4 / P3 D6·D7·D8 | ✅ принято | §3 обновлён |
| «Не гнаться за красивыми графиками adoption» | ✅ принято | D6 — P3; ось доказательства — grounded-ответы, не счётчики |

**Новая позиция после консенсуса:**

> **A verifiable, agent-native portfolio.** Portfolio → MCP → Agent → Evidence →
> Provenance → Verification. Это не «задним числом придуманное» позиционирование:
> оно выросло из lab/diary/experiments/KI + honest fallback + теперь verify_claim/evidence-блок.
