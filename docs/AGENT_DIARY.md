# AGENT_DIARY.md

Единственный дневник проекта. Формат «Вердикт-Сначала» (§4.8 AGENTS.md).

## [2026-08-15 21:40] — Честный аудит + разбор конкурентов по живому GitHub (research-what-impresses-devs)
**Status:** ✅ Fixed (документ; код не менялся)
**Root Cause:** — (владелец: «профиль — много ерунды; изучи досканально, что у них и что реально удивит разработчиков»)
**Fix:** `docs/research-what-impresses-devs-2026-08-15.md` — живая проверка конкурентов (OrchestKit 221★/продукт для Claude Code; Nina 1★/published benchmark с контролями; rubenmarcus 23★/сайт+протокол без проверки; Prakhar/дистрибуция) + честный аудит: «ерунда» (симулятор-игрушка, фейковый терминал, музей, циркулярность verify_claim «проверяем себя по себе») vs реальное (измеренные эксперименты, отрицательные результаты, evals с цифрами — скрыты в лаборатории). **Рекомендации:** 1) публичный бенчмарк `pnpm bench` + секция Benchmarks на сайте (дёшево, кредово); 2) внешние arms проверки (GitHub/dev.to/npm) — убивает циркулярность; 3) «проверка по коду» через mscodebase-intelligence (долгосрочный wow, уникально); 4) убрать/переоформить ерунду, лабораторию поднять вверх.
**Guard:** ничего не реализовано — ждёт выбора владельца; рекомендация 1+4 = полтора дня и максимальный кред.
**Pattern:** NEW

## [2026-08-15 21:00] — 14-й тул verify_repo: живая проверка репозитория через GitHub API + сверка с портфолио
**Status:** ✅ Fixed (код + тесты 91/91, typecheck, lint; деплой после коммита)
**Root Cause:** — (владелец: «А» — живая проверка по репозиториям вместо поиска по чужим)
**Fix:** `verify_repo(repo)` в mcp-tools.ts: нормализация ввода (bare name → owner ManSio, owner/name, github.com URL), fetch GitHub API (UA msp-portfolio-server, таймаут 8s), 404 → exists:false, 403/429 → честная ошибка «rate limit», сетевой сбой → «unavailable»; для своих проектов — перекрёстная сверка live-language с заявленным в портфолио (languageMatches). 8 тестов с мок-fetch (verify-repo.test.ts). **Синхронизация 13→14 тулов:** worker.test.ts (tools/list + openapi), evidence-eval.test.ts (13th→14th), llms.txt/llms-full.txt/skill-файл/server-README/devto-article-published.md, test-suites.json (91). **Решение B (поиск по чужим репо) отклонено** — другой продукт, размывает фокус «доказательства обо мне».
**Guard:** GitHub API с воркера без токена — лимит ~60 req/h на общий egress CF; 403/429 обрабатываются честно (не ложный negative); KI-009 — число тулов сверено с tools/list во всех документах.
**Pattern:** NEW

## [2026-08-15 20:35] — v2 этап 2 РЕАЛИЗОВАН: LLM-рука в verify_claim (arm-флаг, fail-closed), интеграция в воркер + виджет
**Status:** ✅ Fixed (код + тесты 83/83, typecheck, lint, сквозной смоук с реальной gpt-4o-mini; прод не деплоен)
**Root Cause:** — (владелец: «1» — включить v2 в живой тул)
**Fix:** (1) `src/lib/llm-arm-registry.ts` — бесконфликтное подключение (mcp-tools → registry → worker, type-only импорт, без цикла). (2) `verify_claim` (mcp-tools.ts): детерминированный хит → `arm:'deterministic'` без обращения к руке; промах → вызов руки, supported только с источником (arm:'llm'), отказ/ошибка → fail-closed. (3) Воркер: `setLlmArm` per-request при OPENROUTER_API_KEY (env per-request; без ключа — чистый v1). (4) `VerifyClaimResult.arm` + бейдж «LLM arm» в ClaimVerifier. (5) 5 тестов интеграции (83/83). Смоук с реальной моделью: перефразировка → supported:true, arm:llm, источник mscodebase. **Стоимость:** ~$0.001-0.003/промах, лимит KV-квотой 100 calls/IP/month.
**Guard:** рука никогда не пересматривает детерминированный supported (тест); fail-closed без ключа (воркер-тесты не менялись); этап 2 закоммичен, но прод включится только после cf:deploy.
**Pattern:** NEW

## [2026-08-15 20:10] — v2 DoD ДОСТИГНУТ на gpt-4o-mini (88% recall, 0 FA, p95 2.1s); этап 2 — решение владельца
**Status:** ✅ Fixed (измерено: EXPERIMENTS_LOG#exp-12; код + тесты 78/78; этап 2 НЕ интегрирован — ждёт решения о стоимости на публичном эндпоинте)
**Root Cause:** — (владелец: «попробуй платную»)
**Fix:** (1) `evidenceContext()` в mcp-tools.ts — ядро данных (профиль + все проекты) ВСЕГДА в кандидатах LLM-руки, поверх — токен-оверлап остальных видов; лимит 5→8. Без этого p-01 (нулевой токен-оверлап с mscodebase) невидим модели — потолок был в кандидатах, не в модели (exp-12). (2) Промпт разрешает синонимы/перестановки при сохранении требования цитаты. (3) Гвард «слишком короткое» (зеркало v1). (4) **Замер:** gpt-4o-mini → recall 7/8 (88%), FA 0/3, p50=1.5s p95=2.1s → DoD MET. Сравнение: free tier 38-42% (exp-11), gpt-5-mini 6/8 но p95=11.5s. Стоимость прогона ~$0.01.
**Guard:** этап 2 (интеграция в verify_claim с arm:flag) НЕ начинать без явного решения владельца — каждый детерминированный промах на публичном /mcp станет платным LLM-вызовом (KV-квота 100 calls/IP/month ограничивает, но не отменяет).
**Pattern:** NEW

## [2026-08-15 19:40] — v2 этап 1 ИЗМЕРЕН: free tier не проходит DoD (recall 38-42%, p95 18-65s), false-acceptance 0/9; этап 2 заблокирован
**Status:** ✅ Fixed (измерено честно, EXPERIMENTS_LOG#exp-11; решение по платной модели — за владельцем)
**Root Cause:** — (владелец добавил ключ в .env → замер стал возможен)
**Fix:** (1) eval-скрипт загружает .env (без зависимостей, значения не печатаются; .env уже в .gitignore). (2) llm-verify.ts: таймаут переведён на надёжный Promise.race (старый abort не сработал — замер n-02 64s), промпт усилен few-shot примерами. (3) **Замер (4 конфига free-моделей):** openrouter/free — recall 3/8, FA 0, p95 65s; gemma — все 429; gpt-oss — recall 3/8, FA 0, 6/11 вызовов 429, p95 18s; nemotron — recall 3/7, вызовы 20-55s. **Вывод: free tier структурно непригоден для синхронной LLM-проверки; recall-гейт ≥80% и latency-гейт p95<3s не достигаются; false-acceptance 0/9 — precision-guard §5 доказан.** Этап 2 (интеграция в тул) заблокирован гейтами плана — это защита, не баг: в живой тул не попадает то, что не доказало качество.
**Guard:** гейты DoD плана v2 (recall ≥80%, FA ≤1%, p95 <3s) — жёсткие; повторный замер после смены модели — той же командой `node scripts/eval-llm-arm.ts --model <m>`.
**Pattern:** NEW (P-001-вариант: замена механизма не засчитана без замеренного качества)

## [2026-08-15 19:10] — v2 этап 1: LLM-рука verifyClaimLlmArm + eval-скрипт + 8 fail-closed тестов (живые числа — за ключом)
**Status:** ✅ Fixed (код + тесты 77/77, typecheck, lint; этап 2 — интеграция в тул — отложен до чисел)
**Root Cause:** — (владелец: «продолжи, объясни не программисту» → этап 1 плана v2)
**Fix:** (1) `src/data/paraphrase-eval.ts` — парафраз-набор вынесен в общий модуль (SSOT: тест + eval-скрипт). (2) `src/lib/mcp-tools.ts` — экспорт `evidenceCandidates()` (та же токенная оценка v1, полный текст записей — корпус один, SSOT). (3) `src/lib/llm-verify.ts` — `verifyClaimLlmArm()`: промпт с t=0 и жёсткими правилами, строгий JSON-парсинг, precision-guards §5 (supported требует валидный source из кандидатов; мусор/429/таймаут/0 кандидатов → fail-closed refused). (4) `scripts/eval-llm-arm.ts` — офлайн-оценка: v1 vs llm vs combined recall на 8 true-парафразах + false-acceptance на 3 негативных + p50/p95, DoD-чек (≥80% / ≤1% / p95<3s). (5) `tests/llm-verify.test.ts` — 8 тестов решения с мок-моделью. **Ключа OpenRouter в окружении нет — живые числа не измерены; скрипт готов к запуску владельцем.**
**Guard:** fail-closed гарантирован тестами (мок); этап 2 (интеграция) не начнётся, пока eval не покажет recall ≥80% и false-acceptance ≤1% (DoD плана v2).
**Pattern:** NEW

## [2026-08-15 18:50] — v2 этап 0: парафраз-набор (baseline recall) + синхронизация llms-full.txt / test-suites.json
**Status:** ✅ Fixed (тесты 69/69, typecheck, lint; прод не деплоен)
**Root Cause:** — (владелец: «да» на следующий шаг — синхронизировать устаревшие статы и начать v2 по плану)
**Fix:** (1) **v2 этап 0** (docs/verify-claim-v2-llm-arm.md §6): парафраз-набор в tests/evidence-eval.test.ts — 8 true-парафраз (все эмпирически проверены: refused у v1, baseline 0/8, лог [v2-stage-0]) + 3 парафраза негативных контролей (refused) + задокументированный false-acceptance v1: «search»+«engine» substring-collision («engineering») даёт ложное supported — тест пинит поведение, v2 DoD перевернёт его в refused. (2) Синхронизация: public/llms-full.txt — статы лаборатории по данным (12 experiments 8c/3p/1r + 6 negative; 20 diary; 12 KI-101..112; 5 suites/69 tests; было устаревшее 10/23/15/47); src/data/lab/test-suites.json — mcp-tools 18, evidence-eval 13, total 69.
**Guard:** парафраз-набор — «живой baseline»: тесты падают при изменении поведения v1 (намеренно, переворачиваются при v2); test-suites.json — счётчики сверяются с vitest-прогоном при изменении тестов.
**Pattern:** NEW

## [2026-08-15 18:20] — P3 закрыты: D7 (onboarding-блок) + D8 (contact CTA в get_profile) + план v2 (LLM-рука verify_claim)
**Status:** ✅ Fixed (код + тесты 66/66, typecheck, build; прод не деплоен)
**Root Cause:** — (владелец: «2 3» — реализовать D7/D8 из бэклога и подготовить план v2)
**Fix:** (1) **D8** — `get_profile` возвращает `nextSteps` (LinkedIn/GitHub из `profile.contact` в projects.json — только верифицированные каналы, email/telegram оставлены как опциональные поля) + connect-команду MCP. **Без новых тулов** — лимит 13 enforced тестами (worker.test.ts:41, evidence-eval.test.ts:26). (2) **D7** — `OnboardingBlock.tsx` в Agent-секции: команда с copy-кнопкой, MCP Inspector (`npx @modelcontextprotocol/inspector` — существование верифицировано в npm registry, v2.2.0), 3 примера вопросов с тегами тулов (analyze_stack/verify_claim/get_known_issues). (3) **v2** — `docs/verify-claim-v2-llm-arm.md`: план LLM-руки (второе мнение на детерминированных промахах, precision-флоор, eval-набор с парафразами, guard'ы, DoD). README — абзац про onboarding/nextSteps.
**Guard:** nextSteps строится только из data (SSOT, не хардкод каналов); тест D8 проверяет каналы и connect; v2 — fail-closed, LLM никогда не понижает детерминированный supported.
**Pattern:** NEW

## [2026-08-15 17:30] — Evidence-реестр расширен до 29 claims (22 supported / 7 refused), тесты 65/65
**Status:** ✅ Fixed (локально; GH Pages обновится по push)
**Root Cause:** — (владелец: «да» на расширение реестра до ~20-30 утверждений по всем типам данных)
**Fix:** `src/data/lab/evidence.json` — 29 claims, **каждый вердикт измерен** через живой verify_claim (не выдуман): 22 supported по профилю/проектам/принципам (fail-closed, measure-not-assume, single-write-path, self-healing, agent-agnostic)/таймлайну (2014 ManSio, LanceDB+BM25 vs FTS5)/антипаттернам (fork-as-own, hardcoded-theme)/экспериментам (mutmut reranker, FTS5-only beats pipeline, live-LLM false-acceptance)/дневнику (0 errors ≠ correct data, PID-reuse)/KI (OpenRouter multi-upstream, duplicate Zed windows, late enrichment) + 7 честных отказов (Google/Meta/iOS/Netflix/Linux/Turing/CTO). Guard: evidence-eval.test.ts сверяет каждый claim с verify_claim, lab.test.ts — целостность и суммы.
**Guard:** при добавлении claims — тот же процесс: сформулировать по фактам из data → измерить вердикт → записать; тест не даст реестру разойтись с корпусом.
**Pattern:** NEW

## [2026-08-15 17:00] — P2: D4 (KV-квота анонима) + D5 (/openapi.json) + PR в awesome-mcp (#12210)
**Status:** ✅ Fixed (прод: воркер задеплоен a6ef377a, тесты 63/63)
**Root Cause:** — (владелец: «да» на закрытие хвостов: PR в awesome-mcp + P2 D4/D5)
**Fix:** (1) **awesome-mcp PR #12210** открыт (fork ManSio, ветка add-msp-portfolio, секция Other Tools, 📇☁️, Glama-бейдж) — после мержа Glama подхватит листинг. (2) **D4**: KV-квота анонима 100 calls/IP/month (ключ `quota:<ip>:<YYYY-MM>`, expirationTtl 31д, fail-open без биндинга) + X-RateLimit-Limit/Remaining на успешных ответах — рабочий fallback к CF rate limit на free tier (KI-007). (3) **D5**: `/openapi.json` — OpenAPI 3.0.3 из TOOLS (paths для /mcp,/health,/stats,/resume.txt,/llms.txt,/chat + x-mcp-tools). Тесты +3 (квота-заголовки, 429, openapi). Прод-проверка: openapi 200, X-RateLimit-Limit=100/Remaining=99.
**Guard:** квота — eventually-consistent (допускает небольшой перебор, как у Prakhar); счётчик-тест tools/list обновлён (квота добавляет KV-ключ); теги для реестра — только после валидации (`mcp-publisher validate`).
**Pattern:** NEW

## [2026-08-15 16:30] — D1 ЗАКРЫТ: сервер опубликован в официальном реестре MCP (io.github.ManSio/msp-portfolio v1.0.4, active)
**Status:** ✅ Fixed (прод: registry v1.0.4 active; воркер задеплоен; тесты 60/60)
**Root Cause:** — (владелец: «делай» — закрыть D1: деплой + публикация)
**Fix:** (1) `pnpm cf:deploy` — воркер жив (13 тулов, /resume.txt, /llms.txt, evidence в /chat). (2) Публикация в официальный реестр через OIDC-workflow по тегу `v*`. **Две ловушки реестра (пойманы экспериментально, зафиксированы в docs/mcp-distribution.md):** (а) `description` ≤ 100 символов (422, v1.0.0); (б) **имя сервера должно совпадать с GitHub-логином РЕГИСТРОЧУВСТВИТЕЛЬНО** — OIDC даёт `io.github.ManSio/*` (логин с заглавной S), имя `io.github.Mansio/...` → 403 (v1.0.1-v1.0.3). Диагностика: обёртка шага в ::error:: (первая — теряла многострочный вывод), затем raw curl → получили точный ответ сервера. (3) Коммиты: feat(D1+D2+D3), docs, fix(description), fix(case), ci-диагностика; теги v1.0.0..v1.0.4 (в реестре только v1.0.4). (4) KI-016 → частично закрыто (остался awesome-mcp PR).
**Guard:** при смене аккаунта/домена — сверять имя с точным кейсом логина; description ≤100; проверка `curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.ManSio"`.
**Pattern:** NEW (P-002-вариант: сверить с живым источником, не с доками)

## [2026-08-15 15:00] — D3 видим посетителю: evidence-блок в чате + виджет Verify a claim (сайт)
**Status:** ✅ Fixed (тесты 60/60, typecheck, build 103.26 kB gzip)
**Root Cause:** — (владелец: «да» на обновление сайта — D3 должен быть публичным доказательством)
**Fix:** (1) `src/lib/evidence.ts` — общий browser-safe `computeChatEvidence`/`evidenceLabel` (SSOT: воркер и сайт; воркер re-экспортирует — worker.test.ts не сломан). (2) `AgentChat.tsx`: новый evidence-фрейм после каждого ответа — «evidence: N tool calls · N grounded · N failed» / «⚠ ungrounded»; работает в LLM-режиме (из ответа /chat) и в rules-режиме (локально из результатов). (3) Новый `ClaimVerifier.tsx`: виджет «verify a claim — evidence score» — тот же тул `verify_claim` (live /mcp при доступности, иначе локальный движок), показывает supported/refused + записи-источники (kind · title · source · +tokens). (4) `App.tsx`: виджет в правой колонке Agent-секции; README — описание виджета и evidence-строки.
**Guard:** evidence детерминирован и считается из тех же шагов, что показаны в трейсе; виджет вызывает тот же тул, что MCP-сервер (SSOT, никакого дублирования логики).
**Pattern:** NEW

## [2026-08-15 14:00] — Консенсус с внешним ИИ + D3: verify_claim (Evidence Score v1) + evidence-блок /chat
**Status:** ✅ Fixed (код + тесты 60/60, typecheck чистый)
**Root Cause:** — (владелец: «предложения внешнего ИИ — найти консенсус по протоколу»)
**Fix:** Консенсус (`docs/research-mcp-portfolio-benchmarks-2026-08-15.md` §7): приняты рефрейм «доказать moat, не adoption», D3>D6, Evidence Score (с модификацией — детерминированный, не LLM), финальная фраза; отклонён LLM-скоринг для v1. Реализовано: (1) **13-й MCP-тул `verify_claim`** — корпус из тех же данных, что остальные тулы (SSOT), supported при ≥2 значимых словах в одной записи, возвращает source-пути (projects.json#id / lab/*.json#id); (2) **evidence-блок в /chat** — `computeEvidence` (toolCalls/grounded/failed/ungrounded), детерминированно из шагов; (3) `tests/evidence-eval.test.ts` (9 тестов: позитив/негатив-контроли/короткие claims + computeEvidence); (4) README — позиционирование «verifiable, agent-native» + строка «And here is how I know when it is wrong»; (5) синхронизированы llms.txt/smithery.yaml/skill-файл/test-suites.json (13 тулов, total 60), devto-драфт → 13 тулов, зеркало публикации — update-нота.
**Guard:** verify_claim не дублирует данные (корпус из тех же JSON); D3-эвал — детерминированная рука в CI; KI-017 зафиксировал recall-ограничение v1 (precision-first).
**Pattern:** NEW

## [2026-08-15 13:30] — Реализация D1+D2: дистрибуция (registry/Smithery/awesome-mcp) + /resume.txt + skill-файл
**Status:** ✅ Fixed (код + тесты 51/51, typecheck чистый)
**Root Cause:** — (владелец: «да» на предложение реализовать D1+D2 из research Round 2)
**Fix:** (1) **D1**: `server.json` (официальная схема registry, remote streamable-http, namespace io.github.Mansio/msp-portfolio — верифицирован из гайдов registry), `smithery.yaml` (формат из sec-edgar-mcp), `.github/workflows/publish-mcp.yml` (OIDC, официальный шаблон, remote-only без npm), чеклист `docs/mcp-distribution.md` (+ готовый сниппет для PR в awesome-mcp). (2) **D2**: воркер — `/resume.txt` (генерируется из get_profile/get_projects — тот же SSOT, что MCP) и `/llms.txt` (self-doc сервера, частично закрывает D5); `public/msp-portfolio.skill.md` (публичный Agent Skill); `public/llms.txt` обновлён. (3) Тесты: +3 в worker.test.ts (resume/llms/405); server/README.md — секция дистрибуции.
**Guard:** /resume.txt и /llms.txt рендерятся из тулов (не дублируют данные); версия в server.json берётся из git-тега workflow'ем.
**Pattern:** NEW

## [2026-08-15 13:00] — Research Round 2: 5 бенчмарков-людей + новый конкурент rubenmarcus; решения для MSPortfolio
**Status:** ✅ Fixed (документ)
**Root Cause:** — (владелец: «так же проведи полный, нам надо решения идеи что мы можем сделать лучше» + входящий анализ другого ИИ)
**Fix:** `docs/research-mcp-portfolio-benchmarks-2026-08-15.md` — **все цифры верифицированы** GitHub API: OrchestKit 219★/20f/88i (105 skills/36 agents/217 hooks) ✅; Nina: agent-memory-engine с published benchmark ✅, но 78%/93% — с её сайта ⚠️, и анализ недооценил её honest-agent/idk-layer (наша ось!); Ayush/Nishikanta ✅ проще нас. **НОВОЕ:** найден `rubenmarcus/portfolio` — portfolio-MCP В официальном реестре + Agent Skill + llms.txt + резюме по curl — живой прецедент нашего гэпа дистрибуции.
**Решения (P1):** D1 дистрибуция (server.json + mcp-publisher + smithery.yaml + awesome-mcp PR, закрывает KI-016); D2 /resume.txt по curl + публичный skill-файл (нулевой порог входа); D3 eval harness для MCP-тулов (deterministic + LLM arm, эвал «правильно ли отвечает рекрутеру»). P2: KV-квота (KI-007), /llms.txt+/openapi.json, adoption-метрика на сайте. P3: onboarding-блок, contact CTA. Отказ: OrchestKit-масштаб, мульти-реестры, WebGL, монетизация.
**Guard:** вердикты отчёта — основа бэклога; при реализации D1-D3 сверяться с §3 документа.
**Pattern:** NEW

## [2026-08-15 12:00] — Research: экосистема MCP-портфолио (5 источников, вскрытие до исходников)
**Status:** ✅ Fixed (документ)
**Root Cause:** — (запрос владельца: полноценное исследование 5 источников, «есть ли идеи лучше наших»)
**Fix:** `docs/research-mcp-ecosystem-2026-08-15.md` — вскрыт до исходников L2M/TensorGreed, официальный registry, MCP Pure (13 серверов на 1 воркере), Prakhar (sec-edgar-mcp целиком: самописный JSON-RPC, KV-квоты по тирам, Dodo, smithery.yaml, дистрибуция по 8 каталогам), srikanth-mcp-portfolio (dual-stack stdio, данные-submodule). Сравнительная таблица + вердикты.
**Главные выводы:** (1) P1-гэп: у нас 0 листингов в MCP-каталогах при живом endpoint (у Prakhar — 136 сабмитов); (2) KV-квота анонима — рабочий fallback к CF rate limit (закрывает KI-007 частично, ~30 LOC, работает на free tier); (3) /llms.txt + /openapi.json на воркере; (4) 12 тулов = верхняя граница (Prakhar: 9-12 до misrouting) — не группировать без признаков misrouting; (5) мы впереди: single source of truth (один модуль → сервер/воркер/сайт/lab/чат), dual-hosting, live/snapshot-fallback, lab+симулятор как MCP-тулы.
**Guard:** KI-016 заведён (дистрибуция) — вердикты отчёта сверять при доработках.
**Pattern:** NEW

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
