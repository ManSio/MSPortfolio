# Mikhail (ManSio) — MCP-Native Engineering Portfolio

> Builds MCP-native tooling and AI infrastructure. Author of a production MCP server for codebase intelligence (LanceDB/BM25 hybrid search) in Zed.

- Role: AI / Backend Engineer
- Location: Remote-friendly
- GitHub: https://github.com/ManSio
- LinkedIn: https://www.linkedin.com/in/ManSio
- Dev.to: https://dev.to/mansio

## For AI agents

- MCP endpoint (Streamable HTTP): https://msp-portfolio.mansio-dev.workers.dev/mcp
- OpenAPI: https://msp-portfolio.mansio-dev.workers.dev/openapi.json
- llms.txt: https://mansio.github.io/MSPortfolio/llms.txt
- llms-full.txt: https://mansio.github.io/MSPortfolio/llms-full.txt

## Projects

### MSCodeBase Intelligence

Intelligent codebase search & indexing for Zed. Async MCP server featuring LanceDB/BM25 hybrid search, multi-bucket RAG, and autonomous self-healing workflows. High-performance, memory-safe, production-ready codebase intelligence.

- Language: Python
- Stack: Python, MCP, LanceDB, BM25, RAG, Zed
- Repository: https://github.com/ManSio/mscodebase-intelligence
- Hybrid search (vector + BM25) with fused ranking
- Multi-bucket RAG over code entities
- Autonomous self-healing: watchdog + reindex recovery
- Memory-safe indexing pipeline (no leaks under load)

### Gemma Agent

Telegram assistant for a small trusted circle. Telegram assistant with memory, routing, and tools when needed — built for a small trusted circle, not as a Google Gemma product.

- Language: Python
- Stack: Python, Telegram, LLM, Agents
- Repository: https://github.com/ManSio/gemma_agent
- Persistent memory across sessions
- Intent routing before tool dispatch
- Tool use gated by permission scope

### MSPortfolio (this site)

The MCP-native portfolio you are reading right now. A portfolio that is simultaneously a static dashboard, an MCP server about its owner's experience, and an interactive proof-of-work engine.

- Language: TypeScript
- Stack: React, TypeScript, Vite, Tailwind, MCP, Fastify
- Repository: https://github.com/ManSio/MSPortfolio
- MCP server endpoint: any AI agent can query the CV
- Browser agent-loop demo showing tool calls live
- Live metrics with freshness + static fallback
- Architecture simulator with break-it scenarios

## Engineering principles

### Fail-closed by default

When the system can't verify a condition, it must refuse rather than guess. Authorization, cache misses and unknown tool intents all default to 'no'.

Example: In mscodebase-intelligence, a missing index returns a structured error to the agent instead of an empty result — the agent must not confuse 'nothing found' with 'index empty'.

### Async-first I/O, offload CPU

I/O-bound work lives on the async loop; CPU-bound work is offloaded with explicit progress reporting. No blocking calls on the request path.

Example: The MCP tool server is fully async; reindex runs as a background task with progress notifications so the agent can poll instead of timing out.

### Single write path for derived state

Any state that is derived from other state (indexes, caches, fused rankings) is written through one code path. No ad-hoc mutations.

Example: Hybrid search keeps a vector index and a BM25 index consistent because both are updated by the same ingestion pipeline.

### Measure, don't assume

Performance and reliability claims come from benchmarks with a command line, a thread count and raw output — not from architecture diagrams.

Example: Every concurrency change in mscodebase-intelligence ships with a stress test that verifies both 'no exceptions' and 'correct input → correct output'.

### Autonomous self-healing

Where recovery is deterministic, the system does it itself: watchdogs, reindex triggers, stale-state cleanup. Humans only get involved for decisions, not for chores.

Example: MSCodeBase Intelligence detects a corrupted/stale index and schedules a reindex automatically while serving from the last-good snapshot.

### Agent-agnostic surfaces

Tooling speaks protocols (MCP), not personalities. One server, consumed by Claude Code, Cursor, Copilot or any future agent.

Example: This portfolio's own MCP server speaks standard Streamable HTTP — the same endpoint works from Claude Code, Cursor and Copilot with zero per-IDE setup.

## Engineering timeline

- **2026-08** — MSPortfolio: the portfolio that is also an MCP server: Built a portfolio whose CV is machine-readable via MCP and whose claims are backed by live metrics and a browser agent-loop demo. (https://github.com/ManSio/MSPortfolio)
- **2026** — MSCodeBase Intelligence: hybrid search for code: Chose LanceDB + BM25 hybrid search over SQLite FTS5/Elasticsearch for an embedded, zero-ops, memory-safe code search MCP server for Zed. (https://github.com/ManSio/mscodebase-intelligence)
- **2026** — Gemma Agent: memory-first assistant: Designed the Telegram assistant around extracted memory (flat token cost) instead of full-transcript replay. (https://github.com/ManSio/gemma_agent)
- **2014** — Joined GitHub as ManSio: Started the public engineering record that this portfolio verifies live.

## Experiments (50)

### Memory Contamination Live-Arm: live LLM false-acceptance across 14 models

- Date: 2026-08-14 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Real LLM verdicts on the same 50 memory facts (25 true / 25 false, v4_rep dataset) differ from the deterministic proxy agent (exp-2); false-acceptance spans ~0 to ~0.3 across models and arms (memory_first vs code_first).
- Finding: The fail-closed look was anchor bias, not model paranoia: with token-string evidence qwen3.6/3.7 accepted 2-5/25 true claims (recall 0.08-0.20); with a real file fragment (V4 arm) recall jumps to 0.88 at FA 0.02-0.04. CORRECTED: the earlier 'every remaining false-accept is present-trap (R45/R46)' claim was a mislabeled-data issue - those facts are true, so real trap-FA = 0. The corrected labels expose a different, previously hidden gap: trap miss_true (fail-closed models qwen 4/5, deepseek 4/5 reject true usage-claims - truth loss invisible in old metrics). CoT does not pay off; qwen3.8-max (CoT) stays the middle option for the token-string regime.

### Memory Contamination proxy-control: retraction -88%, verify-on-read adoption to 0.0

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: A deterministic proxy agent ('check the claim against patterns in the code') measures memory contamination without LLM noise; retraction (ADR-0002) and lazy validation (ADR-0003) reduce adoption of false memory.
- Finding: The proxy always decides (unknown=0) and false_accept=0 by construction - the headline numbers are a property of the heuristic, not of LLM behavior; the live arm (exp-1) measures the real gap.

### Manifest anchoring (pkg: anchors, ADR-0005): closed-world manifest kills 7 false REFUTED

- Date: 2026-08-14 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: A manifest (pyproject.toml + requirements) as a closed world - absence there is proof - catches SILENT-trap prose that file/import/env anchors miss; fastmcp dist-name != import-path caused 7 false REFUTED.
- Finding: A closed-world manifest is a stronger evidence source than bare tokens; the fix was verified by 1-V-REP (0 false REFUTED of TRUE facts).

### Context aggregator vs multi-tool: 1 call instead of 4-5, -78% calls at recall parity

- Date: 2026-08-08 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: One get_edit_context-style aggregator beats 4-5 separate MCP calls for agent context gathering.
- Finding: The B-scheme (intent filter) is the optimum: same recall as multi-tool at 1 request and 275 tokens; the earlier recall gap was noise, not signal.

### Multi-RAG ablation: FTS5-only beats the full pipeline by recall; H1 refuted

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: H1: multi-RAG (vector+BM25+FTS5+graph) beats any single component by recall. H2: incremental component contributions are positive. H3: graph helps relationship tasks. H5: BM25 and FTS5 are redundant.
- Finding: Recall comes from keyword tiers (FTS5/BM25), precision is bought by the reranker, and the vector tier is the weakest on symbol tasks. Production bug found: hybrid_search_async cache-hit silently skips the dense tier - cache isolation per arm is mandatory in ablations (first run fully distorted).

### Shadow-canary fail-open: 5/5 attacks passed before the fix, 0 after

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Collapse-to-constant vectors, an empty canary and a failed baseline are treated as trust by the shadow embedder canary (fail-open).
- Finding: Relative metrics are attackable: absence of signal (empty canary) must fail closed, and a quality floor must be absolute, not relative.

### Concurrency vs semantic correctness: '0 errors' != correct data under race

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Replacing a thread-safety primitive (lock -> pool -> queue) creates a new race surface; the absence of exceptions does not prove result correctness.
- Finding: VC and VOR are complementary layers: consistency (VC) catches lost writes, semantics (VOR) catches lies. A verdict that flips when one scenario variable changes (A6) is an illustration, not a law.

### Mutation testing for the reranker grader: mutation score 8% -> 100%

- Date: 2026-08-14 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: validate_scores has holes that plain testing misses: NaN/Infinity pass isinstance, then clamp, then earn the maximum score.
- Finding: Validate values, not just types - NaN/Infinity otherwise silently earn the maximum score.

### Root-cause prediction audit: top-1 accuracy 0.13 on 31 incidents

- Date: 2026-07-22 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: The root-cause engine's predictions on the incident dataset can be evaluated against a gold standard; the audit quantifies current quality as a baseline to beat.
- Finding: Root-cause prediction is far from solved: the audit dataset and gold standard are the baseline, and the engine's current top-1 accuracy is 13%.

### PID-lock self-healing: orphan lock wait 30s -> 120ms

- Date: 2026-08-08 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Classifying the DB PID-lock holder (DEAD/HEALTHY/ORPHAN/AMBIGUOUS) instead of failing closed on a stale lock eliminates the zombie boot loop.
- Finding: Never block boot on a lock whose holder may be a zombie: classify the holder and self-heal instead of failing closed for 30 seconds.

### Late enrichment: imports metadata covers 0.0% of search chunks

- Date: 2026-08-08 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: Enriching search results with metadata (imports, calls) at query time (late) instead of at index time improves relevance.
- Finding: Index-time enrichment produced nothing for search chunks: imports coverage is 0.0, so the late path is kept behind a flag until the hypothesis is re-probed.

### Benchmark 2.0 scaffold: 12 repository-reasoning tasks at levels L3-L5

- Date: 2026-08-08 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: RepoReason (integration width, not file count) and Active-SWE motivate measuring reasoning quality (L3 explain, L4 impact, L5 hidden bug) instead of query -> 5 results -> latency.
- Finding: A reasoning-quality benchmark needs L3-L5 tasks with evidence and checks; short keyword queries are a separate failure mode (CoREB) that must be measured independently.

### Server unavailable during reindex: sync update_all blocks the event loop (P0 root cause)

- Date: 2026-08-13 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: The ~13-min MCP request timeouts during a full reindex are NOT caused by indexing itself (it runs in run_in_executor, loop stays free) but by the synchronous AutoDocUpdater.update_all() (generate_docs + README + KNOWN_ISSUES, rglob over docs/) called in the main event loop after indexing.
- Finding: 552s indexing + ~220s update_all = 771s unavailability, in line with the log. Indexing-in-executor (H1) refuted; fast-fail search while is_reindexing exists; the blocker was the sync update_all (same class as BS-11: run_full_diagnostic had already been moved to asyncio.to_thread).

### Vacuous-test scan: 1133/1143 tests are provable (hypothesis refuted in the good way)

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: A share of tests cannot syntactically fail (no assert/raises/warns/fail/raise) - 'vacuous' like the 33-unproven miniature; expectation 5-15%.
- Finding: The suite is almost fully provable - 1133/1143 (99.7%) contain a failing construct; the 3 'vacuous' are smoke tests that can still fail via exception propagation from helpers (discrimination weaker, not zero). MSCodeBase is NOT in the fintech state (7/40 proven) - which is precisely why its negative controls are valuable: they are few (0-3) but maximally informative.

### ln.strip() bug class replayed: broken assert-extractor gives 3/8 false passes

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: An assert-extractor that filters by ln.strip() but emits the raw ln yields false verified for a wrong answer when the nested assert's indent lands AFTER return in the function body; expectation >=2/8 false passes.
- Finding: Bug class replayed: valid Python that never executes, exit 0, 'verified:true' for a wrong answer. The form count differs (3/8 vs fintech's 5/8) but the essence is identical - signature/exit-code verify the PROCESS, not the SEMANTICS ('ask for the output, not the exit code').

### Population blind spot: '0 eligible' is indistinguishable from '0 collected'

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: An empty population (empty index - healthy idle) and a broken collector (garbage) emit the SAME signal: search_quality_passed=0 + warning 'no real results'; eligible_seen before selection is not measured.
- Finding: (a) and (b) share the same failure signal (passed=0, same warning class) - and (a)'s message claims 'empty/garbage chunks' when raw results were 0, a false explanation. '0 rows with 0 eligible' (healthy idle) is indistinguishable from '0 rows with N eligible' (broken collector). Searcher error (b2) is a separate class that does differ.

### verify_clean_state.sh falsifiability: the drift-gate is structurally unable to fail

- Date: 2026-08-11 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: (A) the drift-gate (lines 55-71) can fail on pin-vs-lock drift; (B) a vacuous suite (0 asserts) passes -> 'CLEAN STATE VERIFICATION: PASSED' - reproducibility without falsifiability.
- Finding: (B) confirmed: the gate prints PASSED for a suite with zero asserts - semantic blindness. (A) refuted in reverse: the drift-gate is STRUCTURALLY unable to fire - its grep -iE '^pkg==' requires the pin at line start, but pins live in a TOML array ('    "lancedb==0.34.0",') so PINNED is always empty and the DRIFT=1 branch is unreachable for all 3 packages. A live instance of the 'guard cannot fail' class. Bonus (curiosity): scripts/stale_detector.py is a placeholder 'No drifts detected', always exit 0, wired into the pre-commit hook - a second guard of the same class.

### Evidence Ladder E1-E3: evidence form (anchor -> file fragment -> graph) vs verification quality

- Date: 2026-08-15 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: Rung 1 (anchor string) is weak; rung 2 (file fragment) jumps recall; rung 3 (graph) either matches file (structure does not pay off) or beats it on present-trap (structural layer closes the failure mode). One matrix run: 3 models x 3 arms x 50 facts v4_rep.
- Finding: Evidence form is a per-model knob, not a global answer: the file fragment is the strongest recall driver for all models; the graph closes the trap failure mode only for evidence-honest models (and on corrected labels the trap gap itself was a label issue). Fail-open models (glm family) are not cured by ANY evidence form - that is a model property, not an evidence property. CORRECTED (E5, 2026-08-16): on the extended subject-validated trap category (20 false / 10 true) the graph really closes present-trap for deepseek (75%->40%) - the 'graph does not help' reading was an N=1 statistical issue; for glm the graph still does not help (14/20).

### Evidence Ladder E3b+E4: file+graph hybrid is NOT additive; git-provenance distinguishes existed-then vs exists-now

- Date: 2026-08-15 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: (E3b) a file+graph hybrid is additive (file recall + graph trap-zero); (E4) git-provenance (commit+date+branch in evidence) lets models tell 'existed until C' from 'exists at HEAD'.
- Finding: Hybridity is NOT additive: with a file fragment present, token presence dominates and the graph adds nothing (acc 0.900 < file 0.940) - VOR design must pick ONE evidence format: fragment for recall OR graph for trap-precision. Git-provenance is a cheap, powerful temporal signal for 2/3 models on existence-claims but does not cure qwen-family; the 'robust 2/3' framing was itself a hint issue (E4b) - temporal present-trap is universal and formulation solves it. CORRECTED (E5): the trap-precision claim below was measured on a single false fact (R42) - statistically meaningless; on the extended category graph closes trap for deepseek (75->40%) and does not for glm (14/20).

### ONNX embedder down: off-by-one project paths (not the model or ports)

- Date: 2026-08-03 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Fixing PROJECT_ROOT (parent x3 -> parents[3]) in onnx_client/onnx_server restores the ONNX mode: the server finds the script and the model, /embed returns 384-dim.
- Finding: Root cause is paths, not model/ports: (1) onnx_client looked for '...src/src/core/embedder/onnx_server.py' (duplicated src), (2) onnx_server looked for the model in '.../src/.codebase_models/...' (not the root). The off-by-one was copied between files (onnx_client <- onnx_server).

### Evidence Ladder E5: extended trap category (N=20, subject-validated labels) - present-trap is mass, graph really helps deepseek (75%->40%)

- Date: 2026-08-16 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: 'FA trap = 0' on the v4_rep category rested on a single false fact (R42) - statistically meaningless. With a trap category extended to 20 false / 10 true and labels validated per subject (grep subject = 0), present-trap is measurable and the graph arm's true effect can be estimated.
- Finding: Present-trap is NOT a mislabel issue: on honest subject-validated labels file_content FA is 2-15/20 (10-75%) - the earlier 'residual trap hole' was distorted by N=1. Graph evidence REALLY closes present-trap for deepseek (75%->40% FA); for glm it does not (14/20); qwen already has low FA (2/20) but pays recall (2-3/10 - fail-closed).

### Pinned-rerun on the corrected dataset (fp e6ce7b90): canonical series numbers, routing band removed

- Date: 2026-08-16 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Unpinned OpenRouter routing (>=8 upstreams, KI-105) adds per-run variance; pinning providers (qwen->Alibaba, deepseek/glm->DeepInfra per the pinned-probe) removes the routing band and gives canonical numbers for the series.
- Finding: Routing band removed but per-model conclusions unchanged: file_content is the best recall arm for qwen (0.88), graph for glm (0.84, FA trap 1), hybrid for deepseek (0.92); temporal present-trap is universal (NOW 12/12, 9/12, 12/12), past solved by formulation (40/40). glm stays non-deterministic even pinned (unpin 6FA -> pin-force1 2FA -> pin-force2 1FA) - pinning removed routing, not model variance (+/-0.02-0.04 FA). FA absent/silent = 0 in all pinned evidence arms - the corrected 1-L picture (trap miss_true 4/5 for fail-closed) is routing-independent.

### LSP live probe: call hierarchy + semantic tokens confirmed on pyright; type hierarchy / moniker NOT advertised

- Date: 2026-08-19 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: Of the advanced LSP features (call hierarchy, type hierarchy, semantic tokens, moniker, indexing gate), a real pyright-fork server (basedpyright) actually implements a subset; a feature being present in the 3.17 spec does not guarantee every server implements it.
- Finding: Spec-present != server-implemented. On the pyright family the graph really gets call hierarchy (compiler-accurate cross-file CALLS edges) and semantic tokens (exact spans/kinds); type hierarchy (3.17) and moniker (3.16) are NOT advertised by pyright -> dormant until a server supports them. Existing tree-sitter path kept as source of truth; LSP layer is capability-gated (ADR-0006).

### M1: real tool telemetry — 5/62 MCP tools ever used; the working-set boundary is single-digit

- Date: 2026-08-25 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: Of ~62 registered MCP tools most are dead weight in real sessions; the boundary of the effective working set is a single- or double-digit number.
- Finding: Only 5 of 62 tools ever recorded a metric; dead-tool metrics are NOT measurable with current telemetry — a per-call counter in the error_handler path is required. The LSP toolkit (8 calls, 3 errors) is the top latency risk.

### M2: sub-agent in a fresh project — natural 0/5 MCP calls vs MCP-first 9 (4 wasted on unindexed files)

- Date: 2026-08-25 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: A fresh agent without MCP instructions won't touch MCP tools (goes to grep/read); with instructions it uses them, but on unindexed files semantics is useless.
- Finding: Natural agent: 0/5 MCP; MCP-first: 9 calls, ~4 idle (2 search + get_symbol_info + find_path on unindexed lab), only read_live_file (disk) productive. New files are invisible until reindex -> semantic layer on fresh code = zero. Correctness control: A found the root with exact file:line, B fixed all 4 branches not just '-', tests green.

### M3: latency matrix — search fast 75ms HIT vs quality 3666ms MISS; get_symbol_info misses a real symbol

- Date: 2026-08-25 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: quality semantics gives better context at a comparable cost; get_symbol_info works as an exact tool by symbol name.
- Finding: quality was 49x slower than fast (3666 vs 75ms) and semantically worse; get_symbol_info misses exact names carrying a trailing hint. On short queries fast search + grep + read_live_file beat quality search + symbol info on time AND accuracy.

### E2: category pilot on the live index — fast 5/6 HIT (83%) vs quality 2/3 + leak to docs/JSON; index self-pollution discovered

- Date: 2026-08-26 · Project: mscodebase-intelligence · Verdict: partial
- Hypothesis: (H2.1) the leak between categories (docs/JSON instead of code) is the main quality defect; (H2.2) fast wins on identifiers, quality on prose.
- Finding: fast is 83% and an order of magnitude cheaper; quality saved the only fast-MISS (Q4) at ~35x cost. The leak is confirmed (Q1 quality -> JSON/CHANGELOG; Q4/Q6 quality top-1 incident datasets) but is NOT junk — semantically relevant docs; a category-priority filter is needed, not a prohibition. NEW: the index self-pollutes with its own experiment docs (experiments/mech_orch/* captures code queries). Binary fast/quality routing is suboptimal — cascade fast-hit->stop / MISS->quality+filter+budget.

### E3: category router on tasks_v3.json (30 tasks) — cascade 0.233 > fast 0.167 > quality 0.133; 4 graph classes 0.00 across all arms

- Date: 2026-08-26 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: (1) the fast->quality cascade pays off; (2) different klass need different arms (a class router beats a single arm).
- Finding: Cascade is the winner; the winner depends on klass (git_history/bug/prepare -> fast with quality 0.00 at bug; caller_callee/architecture -> quality); find_test/find_impact/modify/verify_change = 0.00 across ALL arms — search does not replace graph/AST/impact stages.

### E4: deterministic per-class keyword router (PoC) — 0.200 < cascade 0.233, klass_acc 0.40 (NEGATIVE)

- Date: 2026-08-26 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: A per-class router (fast/bug+git+prepare, quality/caller+arch, union/test+impact+modify+verify) gives recall >= cascade (0.233) at median < 600ms.
- Finding: klass_acc=0.40 — keyword rules are noisy (bug tasks contain 'callers', git tasks 'why'); the union arm does not save the 4 graph classes — search cannot find what is not textually in the index (callers/callees/impact must come from the graph). The search-only ceiling on this dataset is ~0.23 at ANY routing.

### E4.1: the graph stage breaks the search-only ceiling — recall 0.433 (cascade 0.267), med 177ms (Track 1)

- Date: 2026-08-26 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: A graph stage (SymbolIndexAdapter over graph.db, cold-start) lifts the 4 failing classes (find_test/find_impact/modify/verify) above the search-only ceiling; target recall>=0.40 med<600ms.
- Finding: The graph stage added +0.166 recall on three of the four failing classes at ~15ms latency and lost nowhere (fallback to cascade by construction). Lessons: (1) has_symbol is an exact node-name — search_symbols(LIKE) + strict suffix is required; (2) graph navigation must go through SymbolIndexAdapter(graph.db), not a disk-only SymbolIndex (empty JSON); (3) an empty symbol_index.json did not block the graph — it blocked choosing the wrong instance.

### E4.2: deterministic concept resolver (no LLM) — verify_change T9/T29 HIT on real graph.db, facts 4/4 & 3/4 (Track 2)

- Date: 2026-08-26 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: The two E4.1 remainders — verify_change=0 (T9 wrong-anchor 'engine', T29 no-anchor) and 'graph returns files, not text' (facts=0) — are closed NOT by an LLM classifier but by a mechanical concept-phrase registry (fail-open, klass-gated) BEFORE the lexical extract_symbol (resolution, not classification — RESEARCH.md rec #3). Regression on other classes is structurally excluded: recipes are klass-gated to verify_change, other classes fall back to the old extract_symbol.
- Finding: Both verify_change misses resolve to the correct file on the real graph.db (10748 nodes); graph rows now carry facts (graph_fact_text), not 0; regression is excluded by construction (klass-gating). A 'wordless' prompt is an anchor-resolution problem, not classification — lexical extract_symbol survives neither consequence-instead-of-name (T9) nor concept-instead-of-name (T29).

### system_alerts chain (file changed -> STALE -> VOR -> one-shot alert) + idle background stale-sweep

- Date: 2026-09-10 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: The 'file changed -> STALE -> VOR -> alert agent' chain did not exist in any link (audit 2026-09-09, Exhibit #23): VOR ran only from a manual read, mark_stale('memory') was never called, and no deliverable alert existed. Closing it needs (H1) an idle ticker driving background VOR, plus (A) one-shot system alerts with dedup-by-kind+payload pushed on the first STALE transition and on starved nodes, delivered into memory reads without token buildup.
- Finding: A one-shot alert store with atomic collect_and_clear is the right granularity: dedup by kind+payload prevents a spam-per-save alert, the atomic clear guarantees that a race between two MCP tools delivers the alert once and only once, and limit=5 caps token budget. Idle VOR is cheap enough to run in background without blocking a tool call (budget 250ms + 120s cooldown).

### VOR Catch-up Rate (H1): throughput per budget and cycles-to-finish

- Date: 2026-09-10 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: VerifyOnRead must verify ACTIVE nodes within budget_ms=50 (read-path default) and 250 (background idle-VOR); catch-up must not exceed 1-2 cycles. Systematic starvation starts only at thousands of nodes, not at realistic sizes (~250 nodes).
- Finding: Real project (~247 nodes) is far from budget limits: read-path covers ~420-490 nodes/pass, background ~1600-1900 nodes/pass. N<=2000 fits one 250ms pass; N=5000 needs 2 passes. Systematic starvation (MATCHED>0/DELIVERED=0) appears only around N=5000.

### VOR HEAD-polling catches external git changes without notify_change (H3)

- Date: 2026-09-10 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: VOR re-resolves HEAD (git rev-parse, 30s TTL) on the next pass; the per-node cache key hash(node_id|head) is invalidated on HEAD change, so nodes touched by an external git pull (no notify_change) are re-verified by themselves.
- Finding: Head-invalidation per node key is an honest detector of external code drift in a git repo: the node whose file anchor was removed went REFUTED, the node whose file changed but still exists stayed VERIFIED. First exp3 run gave a false REFUTED because statuses were read from pre-run memory instead of the store after transitions - a bug in the measurer, not the system.

### Burst-rename vs fail-closed VOR: prose-path anchoring causes false REFUTED (1-B/1-C/RT)

- Date: 2026-09-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Fail-closed VOR (ADR-0003) re-verifies NODE path anchors against HEAD. After one refactor-commit with mass move/rename it refutes ALL touched nodes (queue=100%) though files are alive - false refutes; a body-hash anchor (limpet/OpenLore) survives rename losslessly. And: prose-scanned anchors in ADR body contaminate the set, so read-path should trust EXPLICIT data.anchors only when present.
- Finding: Real queue is NOT huge (24 accumulated auto-refutes/month) but is DOMINATED by junk anchors from prose scanning (13/24 import:for/file/path regex hits), not by renames - renames caused only 1 FALSE_REFUTE (ADR-7232a6e2ba34: live node revoked by historical path from prose body). Synthetic sweep shows the pattern: one rename-sweep = 100% of the queue. Batch-by-commit does NOT solve it (blends move with delete, e661861f); body-identity (exact-body/exact-signature, OpenLore PR#206) or a reviewer aligning a failed anchor with R* rename sources in git history (rename_sources) is the deeper fix. This commit lands the conservative half: read-path skips prose scan when explicit anchors exist.

### H3 TTL-rotation for verify-on-read: last_checked for every checked node + stale_ttl label (closes the "hangs forever" class)

- Date: 2026-09-11 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Verify-On-Read writes a date only on a VERIFIED transition, so INCONCLUSIVE/unexercised nodes drift "forever" with no check trace (live 2026-09-11: 70 ACTIVE nodes without verified_at). Writing a check-trace (last_checked) for EVERY checked node (cache-hit and fresh check, INCLUDING INCONCLUSIVE) plus a stale_ttl label for nodes whose trace is older than N days - "not confirmed for N days" - makes eternal-hanging impossible without changing status (protects the 0.0968% false-retraction benchmark).
- Finding: A TTL needs a trace for nodes WITHOUT verdicts, not only for VERIFIED ones: INCONCLUSIVE nodes now get last_checked and it refreshes on every idle pass (H1), so "no dates at all" is replaced by "checked every 6h, labelled stale after 30d". stale_ttl is a computational label - no status change, the false-retraction guard stays intact. Nodes with NO trace at all are NOT flagged (new-node protection); systematic starvation is caught separately by the starved signal.

### H4 Agent-memory lifecycle at scale: capture latency on a dev.to graph grown 3.4x (threads 5.5x) + stale precision

- Date: 2026-09-13 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: On a dev.to KB grown from 3,989 to 13,519 articles (3.4x) while thread roots grew 9,106 -> 19,101 (2.1x) across snapshots, capture latency degrades with graph size more than raw article count would predict.
- Finding: Capture latency grew with graph size (earlier own refresh on ~9k threads completed in ~2 min vs 10m38s now) even though the numeric delta between snapshots was small (threads 19,056 -> 19,101, +45). The cost is the network capture phase (134 dev.to API calls), not the local graph rebuild: rebuild_derived built 50,498 thread objects in ~3s. Stale precision: 97.5% of stored comments are gone vs live dev.to (live=2,030, gone=80,494 of 82,527), so verify-on-read on a partially-refreshed graph misses real updates until the next capture.

### Bootstrap pipeline: test->function linking ? static name/import vs dynamic sys.settrace trace (89.8% vs 0%/77.9%)

- Date: 2026-09-15 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: For bootstrap extraction of business logic in a fresh repo, step 3 (tests as ground truth) is feasible deterministically. Name-based static linking test->function will fail (test names != impl names); import-based gives file-level only; running the suite with a sys.settrace plugin while recording executed src functions gives per-function ground truth at acceptable overhead.
- Finding: Dynamic trace (sys.settrace around pytest_runtest_call) is the only viable deterministic test->function linker: 89.8% vs 0% (name) and 77.9% (import, file-level only). Overhead +13.6% on a full run is fine for a one-off bootstrap pass. Entry points (@mcp_app.tool, 22 in src) are NOT yet emitted as DECORATES edges (decorator parser slices name correctly, node exists, tool-edges absent) ? step 2 needs graph-side enrichment; step 4 (git->ADR) already works via intel_auto_collect_adrs.

### Bootstrap follow-up: Tarantula ranking for test->function annotation — recall refuted (22.6% rank<=3), precision confirmed; dev.to cross-check

- Date: 2026-09-15 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: Tarantula heuristic (a function called frequently by this test and rarely by others is the target) gives >=60-70% of tests an unambiguous best candidate (rank<=3) computed from trace_result.json without mutations — enough to annotate test->target-function.
- Finding: Vanilla Tarantula cannot select the target function for most tests: recall is 22.6% rank<=3, far below the 60-70% recall target — shared utils (autouse fixtures safe_mkdir/get_data_root with 200+ callers) is the barrier, the same noise source TRUE Coverage reports (shared utility files reachable from 50+ tests). Precision of low ranks is high (5/5 hand-validated correct). Pragmatic consequence: TESTS-edge is built from the full dynamic trace and is correct by construction (no ranking needed); Tarantula ranks are only a confidence annotation for ~16% of tests, not a selection mechanism. dev.to cross-check (2026-09-15): (1) TRUE Coverage (Dawson) independently confirms static approaches fail and per-test coverage->reverse file->tests map cuts CI 43min->4min; (2) Empirical Failure Modes (adevbelgium) confirms Pass-Through Mirage (our phantom code) and Python 3.14 sys.monitoring low-overhead reachability (same backend as our coverage core=sysmon). Niche of TESTS-edges for LLM context remains unclaimed.

### Bootstrap A1: coverage.py sysmon driver overhead vs our sys.settrace plugin — sysmon refuted (+19.96% vs +13.6%)

- Date: 2026-09-16 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: `coverage run --rcfile=.coveragerc` with dynamic_context=test_function on Python 3.14 uses sys.monitoring (sysmon core), so overhead should drop below ~5% vs our sys.settrace plugin (+13.6%, Exp 7) — making coverage the standard driver for `mscodebase bootstrap`.
- Finding: sysmon is ~1.5x slower than our hand-rolled sys.settrace plugin on the full suite (+19.96% vs +13.6% in the same session, same methodology), so coverage.py is NOT adopted as the production driver. The earlier research estimate of 'sysmon ~3-7% median loss' (KNOWN_ISSUES:249) is rejected by this full-suite measurement. Context mechanism itself works well and remains a validation oracle for sample A/B cross-checks.

### Bootstrap Step B: Static Score Engine (AST calls/lexical/imports) vs dynamic trace ground truth

- Date: 2026-09-16 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: Static 3-level mapping (L1 AST direct calls, L2 lexical tokens, L3 imports) against trace_result.json gives functional hit-rate >=50% but aggregate recall <=30% -> static is only a companion; dynamic remains the driver. (Exp 7 measured ONLY the 'test name == function name' signal -> 0%; the call-level signal was never measured.)
- Finding: Hit >=50% confirmed (union 90.4%), but recall <=30% REFUTED: union recall is 70.0%. Static is much stronger than Exp 7 implied, because Exp 7 measured the weak name-signal (L2 reconfirms it: 17.7%). The call-level signal (L1) is a precise, narrow anchor: precision 68.0% with avg 2.9 candidates, recall 30.3%. L3 (imports) provides breadth (recall 72%) at the cost of noise (21.8% precision, avg 41.4 candidates). CORRECTS interpretation: hit != recall (hit 90% does not mean 90% coverage).

### E7: lazy stat-sweep (mtime+size) vs sha256-sweep for always-fresh index (FreshnessChecker hot-reload)

- Date: 2026-09-18 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Stat metadata check (mtime_ns + size, no content read) over the FULL INDEX_EXTENSIONS corpus is fast enough (<50ms) to run synchronously before every search_code query, making the index self-fresh without notify_change and without a full reindex (the 3-dot fallback).
- Finding: stat-sweep is 12x faster than sha256 over the same corpus and ~2% of a full reindex. (lancedb 0.34 detail: table.to_pandas(columns=[...]) crashes, table.to_lance().to_pandas(columns=[...]) is the correct API.) This made the synchronous pre-search freshness check viable: stat-first with sha256 hash-confirm fallback on mismatch.

### E10: full-text chunk embedding + e5-prefix + reranker pool 50 vs pure-vector plateau

- Date: 2026-09-19 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: Three simultaneous search-quality toggles lift hit@1/hit@5 on a 10-task panel: (1) embedding the full chunk text instead of the compact snippet, (2) e5 query:/passage: prefixes in the llama.cpp embedder branch (ONNX/OpenVINO already had _ensure_prefix), (3) reranker candidate pool 30->50.
- Finding: No confirmed shift within N=10 noise: quality hit@1 30%->20% (worse/noise), hit@5 30%->40% (noise). Toggles requiring a full prod reindex (~13 min) deliver zero -> pure-vector plateau reconfirmed (cf. Exp-29 search-only ceiling ~0.23). Next move: AST/Graph-hybrid re-ranking (graph_query scope_id + text-match), not embedding tweaks.

### E11: AST/Graph-hybrid re-ranking - symbol-lookup lift above the pure-vector plateau

- Date: 2026-09-19 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: NL queries in code search contain code identifiers (file_mtime_ns, notify, bm25) that embedding+BM25 keep missing (hit@5 ~20-30%); the repo already has a SymbolIndex (PropertyGraph search_symbols) that knows these symbols deterministically, but _graph_stage fires only on a pure identifier token. Extracting symbol substrings from the NL query, running search_symbols, and lifting graph hits into the fused top-k should save cases the vector path loses.
- Finding: Graph lift saved 2/10 target cases (project_indexer_registry.py, indexing_tools.py) that quality-vs-baseline lost; both targets were present in search_symbols output. Symbol-lookup cost is negligible (+6ms). Signal is conditional (loose graph files add noise - MRR stays small, hit@1 unchanged), matching the Y-Duck RAG-codebase caveat that graph rerank helps only on specific code. N=10 is noise-level; need a 30+ case panel before prod integration.

### E14: EmbeddingGemma 300M vs multilingual-e5-small - Hit@1 0.062->0.688 at ~4x CPU cost

- Date: 2026-09-22 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: EmbeddingGemma 300M (768-dim, ctx 2048, MRL 768/512/256/128) outperforms the production multilingual-e5-small Q8 (384-dim, ctx 512) on code retrieval on a real MSCodeBase corpus at the price of ~3-4x slower on CPU (10 threads, Ryzen 5600H).
- Finding: Real, reproducible quality gap on a code corpus: gemma Q8 gives +62.6pp Hit@1 and +56.4pp MRR over prod e5 at 2x RAM (176 vs 91MB) and 4.2x slower. QAT-Q4 (ggml-org) is NOT better than plain Q4_0 (unsloth): 0.653 vs 0.695 MRR - marketing claim not confirmed. Batch size does not help either model (throughput plateau 1..32). chunk-sweep optimum is small chunks (128 tok) for raw chars/s; retrieval quality per chunk size was NOT measured - separate question. PROD limit: ubatch=512 caps ANY embedder input at 512 tokens; e5 client already clips to 480 (LLAMA_EMBED_MAX_TOKENS), gemma cannot reach its 2048 ctx in prod config without changing llama_install.py resolve_ubatch.

### E17: TESTS-signal in graph-stage (A/B) — covering tests added over function defs, hit@1/MRR unchanged (7/7)

- Date: 2026-09-22 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: Turning the property-graph TESTS edges (built from a dynamic sys.settrace trace, exp-38/40/41) INTO a search consumer — appending covering tests to symbol-resolved definitions in the graph stage — yields new test references without displacing the function definitions in top-k.
- Finding: Covering tests are appended as a separate result sort (graph_score 0.4 vs def 1.0, sentinel chunk_index -20M+line) AFTER completed function defs, so def-first invariant holds (MRR 1.0 in both arms). The flag is off by default (MSCODEBASE_TESTS_SIGNAL env, like late_enrichment), so production search is byte-identical without it. 1/7 case had tests already in baseline because search_symbols matches test-node names by substring — this saturates the signal for query==test-name, not a regression. Overhead is not statistically measurable at this scale (0.2ms, noise).

### E12: real-path embed throughput — chunk length sets the ~3.5k tok/s ceiling, not batch, ubatch or parallelism

- Date: 2026-09-20 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: The "156 ch/s" figure (T3, batch=32) is an artifact of a synthetic corpus of ~10-token random_code texts. A real ~203-token chunk drops the true embedder ceiling far below it, and the ceiling is set by llama-server itself, not by the index_project_runner loop.
- Finding: The CPU embed ceiling (e5-small Q8, 10 threads, Ryzen 5600H) is ~3.4-3.7k tok/s — model physics, independent of batch size, token budget, parallelism or truncation. The old "156 ch/s" was synthetic (~1560 tok/s on 10-token texts). 335k chunks x 203 tok = 68M tokens -> ~5.7h of pure embed plus parse/write, so the ~8h reindex is expected, not a bug.

### E13: text RAG (doc-chunks) vs code baseline — doc-chunks miss top-5 for 14 of 16 queries

- Date: 2026-09-20 · Project: mscodebase-intelligence · Verdict: refuted
- Hypothesis: Text chunks (README + docs/en/ + docstrings) indexed and retrieved through search_with_mode quality are no worse than code chunks.
- Finding: Text RAG is far below code RAG: doc-chunks stay outside top-5 for 14 of 16 queries. The embedder packs code chunks (signatures, names) denser, doc-chunks are diffuse; the index is code-biased and queries without intent_hint='docs' route down the code path.

### E15: bge-small-en / MiniLM / nomic in equal prod conditions — bge-small-en is quality without the 3x slowdown

- Date: 2026-09-23 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: The E14 follow-up showed gemma gives MRR 0.691 vs 0.231 (e5) but is 3.3x slower. Is there an embedder that raises quality WITHOUT losing 3x speed? Candidates: bge-small-en-v1.5 (384-dim, 512 ctx), all-MiniLM-L6-v2 (384-dim), nomic-embed-text-v1.5 (768-dim, 8192 ctx), plus gemma_q4 (quality reference) and prod_e5 (baseline).
- Finding: bge-small-en-v1.5 Q8 is the only "quality without losing speed" candidate: MRR 0.545 (+136% vs e5) at 5024 tok/s (1.19x FASTER than e5) and dim=384 — same scheme, no reindex, RAM halved to 46MB. MiniLM is the fastest (2.6x) but MRR 0.487. nomic does not qualify: its 8192 ctx needs >512-token chunks and a reindex, and at the prod 512 cap it gives only 0.574 for a 3.1x slowdown. gemma_q4 stays the quality king (MRR 0.691) at 3.3x latency.

### E16: bootstrap-trace portability — dynamic trace transfers to foreign Python repos (97.3% / 100%)

- Date: 2026-09-22 · Project: mscodebase-intelligence · Verdict: confirmed
- Hypothesis: The dynamic trace (sys.settrace, src/core/bootstrap_trace_plugin.py) is not an artifact of our own code but reproduces on foreign Python repos; on non-Python (Go) the dynamic path is unavailable, though the test->function concept is portable by other means.
- Finding: The dynamic trace transfers to foreign Python repos unmodified: 97.3% on gemma_agent with 2.9k tests, 100% on commit-. Overhead scales with test activity (+17.4% on gemma_agent vs +13.6% on our larger corpus), not with corpus size. Non-Python: the pytest pipeline collects 0 tests, so dynamic tracing is CPython-only; the concept ports natively via go test -coverprofile (per-test function maps) at the cost of N runs instead of one pass.

## Engineering diary (20)

### Custom Python LSP cannot register in Zed (WONTFIX)

- Date: 2026-07-05 · Project: mscodebase-intelligence · Status: fixed
- Root cause: Zed settings.json can only override KNOWN LSPs; a pygls-based server is never started (verified on Zed 1.9.0 and 1.14.2).
- Fix: Deprecated the LSP->MCP bridge (writer removed 2026-07-20); replaced with LspClient spawning basedpyright as a subprocess -> 3 MCP tools (lsp_find_references / lsp_find_definition / lsp_document_symbols).
- Guard: docs/en/investigations/LSP_WONTFIX.md documents the dead end.

### ONNX migration: 7 critical bugs fixed while moving off LM Studio

- Date: 2026-07-08 · Project: mscodebase-intelligence · Status: fixed
- Root cause: LM Studio is an external process needing manual startup; the status API hardcoded 'lm_studio' as the provider, so it lied when port 1234 was closed.
- Fix: Replaced the hardcoded provider string with a real port probe; migrated embeddings + reranking to a local ONNX Runtime; all 50 tools work in ONNX mode (v2.7.0).
- Guard: intel_get_runtime_status now reflects the real runtime; docs/en/investigations/ONNX_SESSION_REPORT.md.

### Lock-zombie: MCP boot blocked up to 30s by a stale DB PID-lock

- Date: 2026-08-08 · Project: mscodebase-intelligence · Status: fixed
- Root cause: Boot failed closed on the DB PID-lock for up to 30s, exceeding the Zed timeout; the server was killed, the zombie stayed, and _is_pid_alive could not tell a healthy MCP from an orphan.
- Fix: Holder classification (DEAD/HEALTHY/ORPHAN/AMBIGUOUS) with a TOCTOU guard and retry-unlink in src/core/database_lock.py; orphan self-heals in 120ms.
- Guard: tests/test_database_lock_selfhealing.py (+17); benchmark_selfhealing.py.

### Probe script shadowed the production symbol build_call_graph

- Date: 2026-08-08 · Project: mscodebase-intelligence · Status: fixed
- Root cause: run_experiment_pagerank.py defined the same name as the production build_call_graph; the probe silently shadowed it in the graph module.
- Fix: Renamed and gated the probe; one-off experiment scripts now live in their folder or _archive (experiments/README rule).
- Guard: grep for name collisions before adding probes.

### Context aggregator D1-D3 defects found by the harness

- Date: 2026-08-08 · Project: mscodebase-intelligence · Status: partial
- Root cause: Intent filters git_history/verify_change silently returned empty in the B-scheme; harness gaps (D1-D3) hid the failures.
- Fix: Documented in KNOWN_ISSUES (yellow); re-run after the fix is planned.
- Guard: intent coverage asserted per task in bench_v2.

### Late enrichment: imports metadata = 0.0 on search chunks

- Date: 2026-08-08 · Project: mscodebase-intelligence · Status: partial
- Root cause: Chunks from the search pipeline (~186 tokens) carry no import metadata; enrichment at query time had nothing to add.
- Fix: Kept behind the MSCODEBASE_LATE_ENRICHMENT flag; the finding is recorded in KNOWN_ISSUES.
- Guard: flag stays off; the hypothesis is re-probed before enabling.

### Memory contamination: the memory layer accepts false claims

- Date: 2026-08-11 · Project: mscodebase-intelligence · Status: fixed
- Root cause: Project memory was add-only with no retraction and no validation against the code; false claims propagated into context.
- Fix: ADR-0002 (retraction + statuses) and ADR-0003 (lazy verify-on-read); measured adoption drop 1.0 -> 0.12 -> 0.0 in experiments 1-R / 1-V.
- Guard: tests/test_memory_retraction.py + tests/test_verify_on_read.py.

### Shadow canary fail-open: 5/5 attacks passed

- Date: 2026-08-11 · Project: mscodebase-intelligence · Status: fixed
- Root cause: The canary trusted empty responses and a failed baseline (fail-open); the quality metric was relative, so a collapse-to-constant passed.
- Fix: Fail-closed on empty canary and baseline failure, absolute anchor _ABS_MIN_QUALITY 0.5, collapse detector (variance < 1e-3).
- Guard: tests/test_shadow_canary.py 13/13 (realistic per-pair vectors).

### hybrid_search_async cache-hit skips the dense tier

- Date: 2026-08-11 · Project: mscodebase-intelligence · Status: partial
- Root cause: An embedding cache hit returned early, silently skipping the vector search tier; repeat queries lost vector recall (the first multi-RAG run was fully distorted).
- Fix: Cache isolation per arm in ablations; the production fix is tracked in KNOWN_ISSUES (hybrid-cache).
- Guard: ablation harness must isolate the cache per arm.

### Concurrency: 0 errors did not mean correct data

- Date: 2026-08-11 · Project: mscodebase-intelligence · Status: fixed
- Root cause: Replacing a thread-safety primitive created a new race surface (shared results dict, shared correlation id, result swap between inputs) that exception-free runs do not expose.
- Fix: Rule §2.3: results are collected per call; stress tests must verify the right input -> right output (adversarial probe EXP-7).
- Guard: tests on result correctness under N=2 and N=8 concurrency.

### Memory v2: SUPERSEDED filter + false-retraction metric not committed

- Date: 2026-08-12 · Project: mscodebase-intelligence · Status: partial
- Root cause: ADR-0004 cascade behavior (REFUTED propagation) was designed and validated but left uncommitted at session end.
- Fix: Recorded as tech debt; commit planned with the next memory batch.
- Guard: session-end checklist: commit or park experiments.

### Server unreachable during/after indexing

- Date: 2026-08-13 · Project: mscodebase-intelligence · Status: fixed
- Root cause: A sync update_all in the main loop blocked the server while indexing.
- Fix: Moved update_all off the hot path; indexing no longer blocks tool calls.
- Guard: get_health_report smoke after a full reindex.

### extract_anchors produced garbage anchors -> false VOR retractions

- Date: 2026-08-13 · Project: mscodebase-intelligence · Status: fixed
- Root cause: Anchor extraction over-matched identifiers, so verify-on-read retracted valid memory.
- Fix: Tightened anchor extraction; verified against the memory dataset.
- Guard: tests/test_verify_on_read.py (anchor quality cases).

### Reranker offline all day: PID-reuse in _is_pid_alive

- Date: 2026-08-13 · Project: mscodebase-intelligence · Status: fixed
- Root cause: A completed process object was classified as alive via PID reuse, so the reranker process was treated as running when it was dead.
- Fix: Process-object state check before PID liveness; the reranker restarts on demand.
- Guard: runtime status probe shows the real process state.

### Duplicate servers with two Zed windows

- Date: 2026-08-13 · Project: mscodebase-intelligence · Status: fixed
- Root cause: The lock was taken before Popen, not before port readiness; the second window started a duplicate server.
- Fix: Lock acquisition moved after the port-readiness check; multi-window PID-lock documented.
- Guard: KNOWN_ISSUES multi-window PID-lock entry.

### validate_scores grader: 11 holes (NaN/Infinity pass)

- Date: 2026-08-14 · Project: mscodebase-intelligence · Status: fixed
- Root cause: Type validation without value validation: NaN/Infinity passed isinstance, clamped, and earned the maximum score.
- Fix: P-006: math.isfinite, decline on duplicates, regex path through validate_scores; mutation score 8% -> 100%.
- Guard: tests/test_reranker.py (+13); evalmut probe in CI.

### stale_detector MCP tool: 11 false drifts

- Date: 2026-08-14 · Project: mscodebase-intelligence · Status: fixed
- Root cause: The stale detector reported drifts that were actually renames/reorders; severity_overrides has a Windows quirk.
- Fix: Fixed the 11 false drifts; the Windows quirk stays open in KNOWN_ISSUES.
- Guard: negative-controls runner (protocol of Tom).

### fastmcp dist-name vs import-path: 7 false REFUTED

- Date: 2026-08-14 · Project: mscodebase-intelligence · Status: fixed
- Root cause: VOR anchors (file/import/env) could not tell a dist name from an import path; the fastmcp class was retracted as absent.
- Fix: ADR-0005: pkg: anchors from the manifest (pyproject.toml + requirements) as a closed world; 7 false REFUTED -> 0.
- Guard: tests/test_verify_on_read.py (+7).

### CoT arm: glm-4.7 upstream EMPTY_CONTENT

- Date: 2026-08-15 · Project: mscodebase-intelligence · Status: partial
- Root cause: In reasoning mode the upstream returns finish=stop with an empty body (reasoning_tokens ~6) for 16-26% of responses; the share is unstable between runs.
- Fix: Documented as an upstream defect; glm CoT numbers are qualitative only; the harness retries and counts errors honestly.
- Guard: run report flags n(err) per model.

### VOR showed token strings instead of file fragments -> recall 0.08 (anchor bias)

- Date: 2026-08-15 · Project: mscodebase-intelligence · Status: fixed
- Root cause: The VOR layer presented bare pattern tokens ('typesense') as evidence; a model honestly answers false/unknown because a token string proves nothing (diagnosed by the V4 arm file_content_first).
- Fix: VOR must show the real file fragment around the anchor (+/-12-line window): recall(real) qwen3.6 0.08 -> 0.88, qwen3.7 0.20 -> 0.88 at FA 0.02-0.04. CORRECTED (RED TEAM on ground truth, 2026-08-15): the 'all remaining FA being present-trap (R45/R46)' phrasing was a mislabeled-data issue - R43/R45/R46/R47 are true facts, real trap-FA = 0; the corrected labels expose trap miss_true instead.
- Guard: exp-1L V4 arm + per-category metrics on the corrected dataset (29 true / 21 false, fp e5f7373d); next gap: trap miss_true (fail-closed models lose true usage-claims).

## Verifiable claims (29)

- production MCP server for codebase intelligence — supported
- LanceDB and BM25 hybrid search — supported
- Telegram assistant with memory and intent routing — supported
- React TypeScript Vite portfolio — supported
- Hybrid search with fused ranking — supported
- must refuse rather than guess when it cannot verify — supported
- performance claims come from benchmarks with a command line — supported
- derived state written through a single write path — supported
- watchdogs and reindex triggers recover deterministically — supported
- one server consumed by Claude Code and Cursor — supported
- chose LanceDB and BM25 over SQLite FTS5 — supported
- joined GitHub as ManSio — supported
- claimed a fork as my own work — supported
- hardcoded dark theme colors broke the light theme — supported
- mutation testing for the reranker grader — supported
- FTS5 only beats the full pipeline by recall — supported
- live LLM false-acceptance across 14 models — supported
- zero errors did not mean correct data — supported
- reranker was offline due to PID reuse — supported
- OpenRouter routes one prompt across multiple upstreams — supported
- two Zed windows can start duplicate servers — supported
- late enrichment found no imports on search chunks — supported
- worked at Google — refused
- led a team of engineers at Meta — refused
- built a mobile app for iOS — refused
- ten years at Netflix as staff engineer — refused
- contributed to the Linux kernel — refused
- won a Turing Award — refused
- CTO of a Series B startup — refused

## Test suites

- Intent matching (RU/EN) — 7 tests (Agent intent routing: projects, stack filters, principles, articles, timeline, fallback)
- MCP tools + architecture models — 18 tests (Tool surface, get_profile nextSteps (D8), filters, analyze_stack honesty, simulation (5 points, validation, llm_saturation, events), commit snapshot, antipatterns, lab tools, annotations, all architectures × all scenarios)
- Worker /mcp integration — 22 tests (tools/list (13 tools + annotations), health without rate limit, /mcp/stats (KV), tools/call counter, 429 MCP/CHAT, security headers, CORS allow/deny, 404, adversarial (malformed JSON, unknown tool/method), 8-way concurrency with filter correctness, /resume.txt + /llms.txt + 405, anonymous quota (D4: headers + 429), /openapi.json (D5))
- Lab data integrity + SSR render + benchmarks snapshot — 10 tests (Experiment completeness/verdicts + project tags, negative results refs, diary completeness/statuses + project tags, KI ids/temperatures + project tags, test-suite sum = total, evidence ledger ids/verdicts/summary, LabPage SSR (7 sections + filter), EN-only projections (incl. evidence claims), benchmarks.json sanity (DoD gates: llm recall ≥80%, 0 false-accepts, p95 < 3s))
- Evidence Score v1 (D3 deterministic arm) + v2 stage-0 paraphrase set — 13 tests (verify_claim: 13th tool registration + required claim input, supported true-claim (profile evidence), project-traced claim, negative controls (Google/Meta refused), too-short/empty claim notes; computeEvidence: toolCalls/grounded/failed counts, ungrounded flag, null result = failed; evidence ledger: every canonical claim verdict matches verify_claim; v2 stage 0: 8 true paraphrases refused by v1 (recall-gap baseline, KI-017), 3 paraphrased negative controls stay refused, documented substring false-acceptance (search+engine))
- v2 LLM arm decision logic (mocked provider) — 9 tests (verifyClaimLlmArm fail-closed guards (v2 plan §5): supported with valid cited record, refused passthrough, garbage response, supported without source, supported with source outside candidates, HTTP error, abort/timeout, too-short claim without network call, zero-overlap paraphrase reaches the LLM via padded core context (p-01 fix))
- verify_claim + LLM arm integration (stage 2) — 5 tests (arm absent -> deterministic v1 (arm:deterministic), arm rescues miss with cited source (arm:llm), arm refusal keeps refusal, arm error fail-closed, deterministic hit never consults the arm)
- verify_repo live GitHub verification (mocked) — 9 tests (bare name defaults to ManSio + portfolio cross-check (languageMatches), full owner/name, honest language mismatch vs curated record, 404 = not exists, 403/429 rate limit reported honestly, network failure, github.com URL normalization, empty input without network call, readme:true returns actual README text)
- verify_article live Dev.to verification (mocked) — 4 tests (title-fragment match with platform data, honest not-found, API failure honest error, short query refused without network call)
- verify_package live npm verification (mocked) — 4 tests (existing package + maintainer check (case-insensitive), honest 404 not-found, registry failure honest error, empty input without network call)

## Known issues (14)

- **KI-101** (mscodebase-intelligence) — Fix in code, temperature: watching. hybrid_search_async: an embedding cache-hit silently skips the dense tier - repeat queries lose vector recall (found by the multi-RAG ablation; the first run was fully distorted).
- **KI-102** (mscodebase-intelligence) — Open (by design), temperature: watching. Present-trap blindness is structural: claims about an existing file/import with the wrong subject or value are not caught by anchor verification (memory_first adoption 0.24 in the proxy control).
- **KI-103** (mscodebase-intelligence) — Open (research), temperature: watching. VOR fail-closed was anchor bias, not model paranoia: with token strings qwen3.6/3.7 accepted 2-5/25 true claims (recall 0.08-0.20); with a real file fragment (V4 arm, 2026-08-15) recall jumps to 0.88. CORRECTED (RED TEAM on ground truth, 2026-08-15): the apparent residual hole 'every remaining false-accept is present-trap (R45/R46)' was a mislabeled-data issue - R43/R45/R46/R47 are TRUE facts (the generator checked value != real_value, not the subject's absence), so real trap-FA = 0 across all models. The corrected labels (29 true / 21 false, fp e5f7373d) expose the actual remaining gap instead: trap miss_true - fail-closed models (qwen 4/5, deepseek 4/5) reject true usage-claims, a truth loss invisible in the old metrics. V4-claim 'FA 0.02-0.04 residual trap hole' is retracted: the hole was in the labels, not in the models.
- **KI-104** (mscodebase-intelligence) — Open (upstream), temperature: watching. glm-4.7-flash in reasoning mode returns 16-26% EMPTY_CONTENT (finish=stop, empty body) - an upstream defect; its CoT numbers are qualitative only.
- **KI-105** (mscodebase-intelligence) — Open (by design), temperature: stable. OpenRouter routes one prompt across >=8 upstreams (Alibaba/DeepInfra/DigitalOcean/Cloudflare/Novita/Baidu/StreamLake/Bedrock): per-run verdict variance (FA +/-0.05-0.10) is expected; determinism under temp=0 is an illusion.
- **KI-106** (mscodebase-intelligence) — Open (research), temperature: watching. Late enrichment: imports=0.0 on search chunks (~186 tokens/chunk); the MSCODEBASE_LATE_ENRICHMENT flag stays off until the hypothesis is re-probed.
- **KI-107** (mscodebase-intelligence) — Open (by design), temperature: stable. The vector tier (multilingual-e5-small) is the weakest on symbol tasks (recall 0.083-0.167); recall is carried by keyword tiers, precision by the reranker.
- **KI-108** (mscodebase-intelligence) — Open (research), temperature: watching. Graph enrichment adds metadata (callers/callees), not text: evidence metrics by text patterns do not see it; a separate graph-contribution protocol is needed.
- **KI-109** (mscodebase-intelligence) — Open (P1), temperature: watching. P1: propagation_engine.py is invisible to code search and the symbol graph - the root cause is not yet established.
- **KI-110** (mscodebase-intelligence) — Open, temperature: watching. Path storage is scattered and there is no GC: 2481 junk folders accumulated; a cleanup task is open.
- **KI-111** (mscodebase-intelligence) — Open, temperature: stable. severity_overrides has a Windows quirk (stale_detector) - behavior differs between platforms.
- **KI-112** (mscodebase-intelligence) — Open (mitigated), temperature: stable. Two Zed windows can start duplicate servers: the lock is taken before Popen, not before port readiness (mitigated 2026-08-13).
- **KI-113** (mscodebase-intelligence) — Fixed, temperature: stable. Memory verification was lazy-by-hand: VOR ran only from intel_get_project_memory (1 call site); 42/136 ACTIVE nodes had no verified_at since 2026-08-11; INCONCLUSIVE nodes (no anchors) never became STALE/REFUTED. FIXED (H1, 2026-09-09): idle background VOR wired into _check_index_health (cooldown 120s) via server-injected hook set_idle_vor_callback -> layer.run_background_verify (budget=250ms, locked()-guard, shared _write_lock/get_verifier registry).
- **KI-114** (mscodebase-intelligence) — Open, temperature: stable. PRE-EXISTING (found 2026-09-18 during Phase 1 hot-reload): tests/test_lsp_vfs_indexing.py is 8/8 broken - a bare MagicMock().embedding_dim is truthy, so db_writer.py:59 `_target_dim = self.embedder.embedding_dim or 768` gets a MagicMock and truncates vectors to zero -> Zero vector skipping -> empty table -> all asserts fail. Invisible in CI: module is pytestmark=slow, addopts `-m not slow` -> never runs. Phase 1 detects-but-does-not-fix.
