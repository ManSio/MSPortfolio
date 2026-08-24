// Single source of truth for the MCP tool surface.
//
// This module is deliberately dependency-free so it can run in:
//   - the browser (agent-loop demo imports it directly, no backend needed)
//   - the MCP server (server/index.ts registers these tools over Streamable HTTP)
// The exact same logic answers a visitor's question and an AI agent's tool call.

import projectsData from '../data/projects.json' with { type: 'json' };
import principlesData from '../data/principles.json' with { type: 'json' };
import timelineData from '../data/timeline.json' with { type: 'json' };
import antipatternsData from '../data/antipatterns.json' with { type: 'json' };
import experimentsData from '../data/lab/experiments.json' with { type: 'json' };
import diaryData from '../data/lab/diary.json' with { type: 'json' };
import knownIssuesData from '../data/lab/known-issues.json' with { type: 'json' };
import type { Antipattern, DiaryEntry, ExperimentsData, GetProfileResult, KnownIssue, MCPTool, MetricsSnapshot, NextStep, Principle, ProjectsData, SimEvent, SimulationResult, StackAnalysis, VerifyClaimResult } from './types.js';
import { getLlmArm } from './llm-arm-registry.ts';

/** Public MCP endpoint — same origin the site and /resume.txt advertise (D8 nextSteps). */
const MCP_ENDPOINT = 'https://msp-portfolio.mansio-dev.workers.dev/mcp';

const projects = (projectsData as ProjectsData).projects;
const principles = (principlesData as { principles: Principle[] }).principles;

// ─────────────────────────────────────────────────────────────────────────────
// Architecture models for simulate_architecture
// ─────────────────────────────────────────────────────────────────────────────

interface Stage {
  name: string;
  baseMs: number;
  /** how strongly latency grows with load (0 = flat, higher = more contention) */
  contention: number;
  /** executed in parallel with other stages sharing the same group */
  group?: string;
  replicas?: number;
}

interface ArchitectureModel {
  stages: Stage[];
  cache?: { hitRatio: number; saveMs: number };
  llmDominant?: boolean;
}

const ARCHITECTURES: Record<string, ArchitectureModel> = {
  'mscodebase-intelligence': {
    stages: [
      { name: 'query_parse', baseMs: 1, contention: 0.1 },
      { name: 'vector_search', baseMs: 10, contention: 0.45, group: 'retrieval', replicas: 2 },
      { name: 'bm25_search', baseMs: 4, contention: 0.25, group: 'retrieval', replicas: 2 },
      { name: 'fusion_rerank', baseMs: 3, contention: 0.3 },
      { name: 'context_build', baseMs: 6, contention: 0.2 },
    ],
    cache: { hitRatio: 0.7, saveMs: 10 },
  },
  gemma_agent: {
    stages: [
      { name: 'intent_routing', baseMs: 5, contention: 0.15 },
      { name: 'memory_retrieval', baseMs: 8, contention: 0.2 },
      { name: 'tool_dispatch', baseMs: 4, contention: 0.15 },
      { name: 'llm_generate', baseMs: 400, contention: 0.9 },
    ],
    llmDominant: true,
  },
  'msp-portfolio': {
    stages: [
      { name: 'static_assets', baseMs: 2, contention: 0.05, group: 'edge', replicas: 5 },
      { name: 'metrics_fetch', baseMs: 35, contention: 0.2, group: 'edge', replicas: 5 },
      { name: 'mcp_tool_call', baseMs: 12, contention: 0.25 },
    ],
    cache: { hitRatio: 0.95, saveMs: 30 },
  },
};

export interface ScenarioDef {
  id: string;
  label: string;
  description: string;
}

export const SCENARIOS: ScenarioDef[] = [
  { id: 'load_spike', label: 'Load spike (x1 → x20)', description: 'Traffic multiplies. Which stage saturates first?' },
  { id: 'node_loss', label: 'Node loss', description: 'One replica of every parallel group disappears.' },
  { id: 'cache_cold', label: 'Cache cold start', description: 'Hit ratio drops to 0 (deploy, eviction, first-run).' },
  { id: 'llm_saturation', label: 'LLM saturation', description: 'Generation latency degrades super-linearly under queueing.' },
];

const LOADS = [1, 2, 5, 10, 20];

function runSimulation(model: ArchitectureModel, scenario: string): { points: SimulationResult['points']; findings: string[]; events: SimEvent[] } {
  const findings: string[] = [];
  const events: SimEvent[] = [];
  const points: SimulationResult['points'] = [];

  for (const load of LOADS) {
    const stageLatencies: { name: string; ms: number }[] = [];

    for (const stage of model.stages) {
      let ms = stage.baseMs * (1 + (load - 1) * stage.contention);

      if (scenario === 'node_loss' && stage.replicas) {
        if (stage.replicas <= 1) {
          ms *= 3; // degraded, single node now
        } else {
          ms *= stage.replicas / (stage.replicas - 1);
        }
      }
      if (scenario === 'llm_saturation' && model.llmDominant && stage.name === 'llm_generate') {
        ms = stage.baseMs * (1 + (load - 1) * 1.6); // super-linear
      }
      stageLatencies.push({ name: stage.name, ms });
    }

    let chainMs = 0;
    // group parallel stages by `group`, take max within group
    const groups = new Map<string, number>();
    for (const s of stageLatencies) {
      const stage = model.stages.find((st) => st.name === s.name);
      if (stage?.group) {
        groups.set(stage.group, Math.max(groups.get(stage.group) ?? 0, s.ms));
      } else {
        chainMs += s.ms;
      }
    }
    for (const g of groups.values()) chainMs += g;

    // cache benefit applies once per request
    if (model.cache) {
      if (scenario === 'cache_cold') {
        chainMs += model.cache.saveMs * 3;
      } else {
        chainMs -= model.cache.saveMs * model.cache.hitRatio;
      }
      chainMs = Math.max(chainMs, 1);
    }

    const p50 = chainMs;
    const p95 = chainMs * 1.7;
    const bottleneck = [...stageLatencies].sort((a, b) => b.ms - a.ms)[0].name;
    const worstStageMs = [...stageLatencies].sort((a, b) => b.ms - a.ms)[0].ms;

    // Failure-mode events — derived from the same numbers the points use.
    if (worstStageMs >= 100) events.push({ load, type: 'circuit_open', detail: `${bottleneck} exceeds 100ms — breaker trips` });
    if (worstStageMs >= 200) events.push({ load, type: 'fallback_engaged', detail: `degraded path serves ${bottleneck}` });
    if (chainMs >= 2000) events.push({ load, type: 'budget_exceeded', detail: 'p95 budget (2s) crossed' });
    if (scenario === 'node_loss') events.push({ load, type: 'degraded_mode', detail: 'a replica is lost in every parallel group' });
    if (scenario === 'cache_cold' && model.cache) events.push({ load, type: 'cache_miss', detail: 'hit ratio dropped to 0 — cache serves nothing' });
    if (scenario === 'llm_saturation' && model.llmDominant) {
      if (load >= 2) events.push({ load, type: 'queue_backpressure', detail: 'LLM tier queues requests' });
      if (load >= 10) events.push({ load, type: 'llm_timeout_risk', detail: 'generation latency threatens client timeouts' });
    }

    points.push({
      load,
      p50: Math.round(p50 * 10) / 10,
      p95: Math.round(p95 * 10) / 10,
      throughput: Math.round((1000 / Math.max(p50, 0.1)) * 10) / 10,
      bottleneck,
    });
  }

  // findings
  const at20 = points[points.length - 1];
  if (at20 && at20.p95 > 2000) {
    findings.push(`At 20x load p95 reaches ${at20.p95.toFixed(0)}ms — the ${at20.bottleneck} stage saturates first.`);
  } else if (at20) {
    findings.push(`p95 stays under 2s even at 20x load (${at20.p95.toFixed(0)}ms); the design absorbs the spike.`);
  }
  if (scenario === 'node_loss') {
    findings.push('Losing a replica raises latency but keeps the system available (no hard failure at 20x).');
  }
  if (scenario === 'cache_cold' && model.cache) {
    findings.push(`Cold cache costs ~${Math.round((model.cache.saveMs * 3) * 10) / 10}ms per request on top of baseline.`);
  }
  if (scenario === 'llm_saturation') {
    if (model.llmDominant) {
      findings.push('LLM generation dominates — horizontal scaling of the model tier matters more than any micro-optimization.');
    } else {
      findings.push('This architecture has no LLM stage — llm_saturation degrades it no more than load_spike.');
    }
  }
  if (findings.length === 0) findings.push('No stage crosses the latency budget under this scenario.');

  return { points, findings, events };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool implementations
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// verify_claim — Evidence Score v1 (deterministic corpus grounding)
//
// Maps a claim about the owner to the data records that support it. Built from
// the SAME files the other tools read — grounding is mechanical, not LLM-based:
// a claim is `supported` when >=2 distinct significant words appear in one record.
// ─────────────────────────────────────────────────────────────────────────────

const CLAIM_STOPWORDS = new Set([
  'about', 'been', 'could', 'from', 'have', 'into', 'that', 'their', 'them',
  'there', 'these', 'they', 'this', 'those', 'using', 'what', 'when', 'where',
  'which', 'will', 'with', 'would', 'your', 'worked', 'built', 'used', 'made',
]);

interface EvidenceCorpusRecord {
  kind: string;
  source: string;
  title: string;
  text: string;
}

/** Flatten one typed record into searchable text (explicit fields, not raw JSON — no metadata noise). */
function recordText(...parts: Array<string | undefined>): string {
  return parts.filter(Boolean).join(' ').toLowerCase();
}

function buildEvidenceCorpus(): EvidenceCorpusRecord[] {
  const records: EvidenceCorpusRecord[] = [];
  const profile = projectsData.profile as { name?: string; role?: string; location?: string; summary?: string };
  records.push({
    kind: 'profile',
    source: 'projects.json#profile',
    title: 'Profile',
    text: recordText(profile?.name, profile?.role, profile?.location, profile?.summary),
  });
  for (const p of projects) {
    records.push({
      kind: 'project',
      source: `projects.json#${p.id}`,
      title: p.name,
      text: recordText(
        p.name,
        p.tagline,
        p.description,
        p.language,
        ...p.stack,
        ...p.highlights,
        ...p.decisionLog.flatMap((d) => [d.decision, d.reason, d.tradeoff]),
      ),
    });
  }
  for (const pr of principles) {
    records.push({
      kind: 'principle',
      source: `principles.json#${pr.id}`,
      title: pr.title,
      text: recordText(pr.title, pr.statement, pr.example, pr.abTest, pr.evidence),
    });
  }
  for (const ev of timelineData.events) {
    records.push({
      kind: 'timeline',
      source: `timeline.json#${ev.date}`,
      title: ev.title,
      text: recordText(ev.title, ev.decision),
    });
  }
  for (const ap of (antipatternsData as { antipatterns: Antipattern[] }).antipatterns) {
    records.push({
      kind: 'antipattern',
      source: `antipatterns.json#${ap.id}`,
      title: ap.title,
      text: recordText(ap.title, ap.mistake, ap.whyBad, ap.fix, ap.lesson),
    });
  }
  for (const ex of (experimentsData as ExperimentsData).experiments) {
    records.push({
      kind: 'experiment',
      source: `lab/experiments.json#${ex.id}`,
      title: ex.title,
      text: recordText(ex.title, ex.hypothesis, ex.result, ex.finding, ex.conclusion),
    });
  }
  for (const d of (diaryData as { entries: DiaryEntry[] }).entries) {
    records.push({
      kind: 'diary',
      source: `lab/diary.json#${d.date}`,
      title: d.title,
      text: recordText(d.title, d.rootCause, d.fix, d.guard, d.pattern),
    });
  }
  for (const ki of (knownIssuesData as { issues: KnownIssue[] }).issues) {
    records.push({
      kind: 'known-issue',
      source: `lab/known-issues.json#${ki.id}`,
      title: ki.problem,
      text: recordText(ki.problem, ki.status, ki.link),
    });
  }
  return records;
}

const EVIDENCE_CORPUS = buildEvidenceCorpus();

/**
 * Top-K candidate records for a claim, ranked by the same token-overlap scoring
 * v1 uses (precision-first: ≥1 token overlap to be a candidate). Exposes the
 * full record text so the v2 LLM arm can verify a paraphrase against real
 * content — candidates and tool share one corpus (SSOT).
 */
export function evidenceCandidates(claim: string, limit = 5): Array<EvidenceCorpusRecord & { matchedTokens: string[] }> {
  const tokens = claimTokens(claim);
  return EVIDENCE_CORPUS.map((r) => ({
    ...r,
    matchedTokens: tokens.filter((t) => r.text.includes(t)),
  }))
    .filter((r) => r.matchedTokens.length > 0)
    .sort((a, b) => b.matchedTokens.length - a.matchedTokens.length)
    .slice(0, limit);
}

/**
 * Context for the v2 LLM arm: core identity records (profile + all projects)
 * are ALWAYS shown — a fully-rephrased claim may share no words with the record
 * that supports it (p-01 in the paraphrase set) — plus token-overlap candidates
 * of every kind (timeline/antipatterns/experiments/diary/known-issues), ranked
 * by overlap. Cap = limit (default 8; per-call cost stays negligible).
 */
export function evidenceContext(claim: string, limit = 8): Array<EvidenceCorpusRecord & { matchedTokens: string[] }> {
  const overlap = evidenceCandidates(claim, limit);
  const base: Array<EvidenceCorpusRecord & { matchedTokens: string[] }> = [];
  const seen = new Set<string>();
  for (const r of EVIDENCE_CORPUS) {
    if (base.length >= limit) break;
    if (r.kind === 'profile' || r.kind === 'project') {
      base.push({ ...r, matchedTokens: [] });
      seen.add(r.source);
    }
  }
  const extra = overlap.filter((r) => !seen.has(r.source));
  return [...base, ...extra].slice(0, limit);
}

export type EvidenceCandidate = EvidenceCorpusRecord & { matchedTokens: string[] };

export function claimTokens(claim: string): string[] {
  const words = claim.toLowerCase().match(/[a-zа-я0-9]+/g) ?? [];
  return words.filter((w) => w.length >= 4 && !CLAIM_STOPWORDS.has(w));
}

export const TOOLS: MCPTool[] = [
  {
    name: 'get_profile',
    description: "Get the owner's professional profile summary, plus nextSteps — concrete ways to continue (contact channels, GitHub, MCP connect). Use it as the first tool in an interview.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      const profile = (projectsData as ProjectsData).profile;
      const nextSteps: NextStep[] = [];
      if (profile.contact?.linkedin) {
        nextSteps.push({ type: 'contact', label: 'LinkedIn', hint: 'Professional intros and messages.', url: profile.contact.linkedin });
      }
      if (profile.contact?.github) {
        nextSteps.push({ type: 'view', label: 'GitHub', hint: 'Public code, including this portfolio\'s source.', url: profile.contact.github });
      }
      if (profile.contact?.email) {
        nextSteps.push({ type: 'contact', label: 'Email', hint: 'Direct email.', url: `mailto:${profile.contact.email}` });
      }
      if (profile.contact?.telegram) {
        nextSteps.push({ type: 'contact', label: 'Telegram', hint: 'Direct chat.', url: profile.contact.telegram });
      }
      nextSteps.push({
        type: 'connect',
        label: 'Query this portfolio over MCP',
        hint: 'Keep the interview going — connect any MCP client to the live endpoint.',
        command: `claude mcp add --transport http msp-portfolio ${MCP_ENDPOINT}`,
      });
      return { ...profile, nextSteps } satisfies GetProfileResult;
    },
  },
  {
    name: 'get_projects',
    description: 'Get portfolio projects with stack, highlights, and decision logs. Optional filter by stack tag.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['all', 'python', 'typescript', 'mcp', 'aws', 'ai'],
          description: 'Filter projects by stack tag.',
        },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute({ filter }) {
      const tag = filter === undefined || filter === 'all' ? null : String(filter);
      const list = tag ? projects.filter((p) => p.stack.some((s) => s.toLowerCase() === tag)) : projects;
      return {
        count: list.length,
        projects: list.map((p) => ({
          id: p.id,
          name: p.name,
          tagline: p.tagline,
          description: p.description,
          language: p.language,
          stack: p.stack,
          stars: p.stars,
          url: p.url,
          decisionLog: p.decisionLog,
        })),
      };
    },
  },
  {
    name: 'search_projects',
    description: "Free-text search across portfolio projects — name, tagline, description, stack and decision-log rationale. Returns matched projects with a score and the fields that matched. Use when a fixed stack-tag filter is too narrow (e.g. 'RAG', 'latency', 'Zed'). Read-only, closed world.",
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: "Search terms, e.g. 'RAG' or 'latency Zed'." },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute({ query }) {
      const q = String(query ?? '').trim().toLowerCase();
      if (!q) return { query: q, count: 0, projects: [], note: 'Empty query — provide at least one term.' };
      const terms = q.split(/\s+/).filter(Boolean);
      const scored = projects
        .map((p) => {
          const decisionText = (p.decisionLog || [])
            .map((d: unknown) => Object.values(d as Record<string, unknown>).filter((v) => typeof v === 'string').join(' '))
            .join(' ');
          const haystack: Array<[string, string]> = [
            ['id', p.id],
            ['name', p.name],
            ['tagline', p.tagline],
            ['description', p.description],
            ['stack', (p.stack || []).join(' ')],
            ['decisionLog', decisionText],
          ];
          const matchedFields = new Set<string>();
          let hits = 0;
          for (const term of terms) for (const [field, text] of haystack) {
            if (text.toLowerCase().includes(term)) { hits += 1; matchedFields.add(field); }
          }
          return { project: p, score: hits, matchedFields: [...matchedFields] };
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score);
      return {
        query: q,
        count: scored.length,
        projects: scored.map((s) => ({
          id: s.project.id,
          name: s.project.name,
          tagline: s.project.tagline,
          language: s.project.language,
          stack: s.project.stack,
          url: s.project.url,
          score: s.score,
          matchedFields: s.matchedFields,
        })),
      };
    },
  },
  {
    name: 'get_engineering_principles',
    description: 'Get engineering principles with real examples and A/B-style counterfactuals.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      return { count: principles.length, principles };
    },
  },
  {
    name: 'get_timeline',
    description: 'Get the engineering decision timeline.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      return timelineData.events;
    },
  },
  {
    name: 'get_articles',
    description: 'Get recent Dev.to articles with reading time, tags and links.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async execute() {
      try {
        // dev.to serves /api/articles list endpoints through layered Varnish
        // caches that can lag after publication for some egresses. `state` is a
        // real API param, so it changes the Varnish cache key — unlike ad-hoc
        // params, which Varnish normalizes away. cache:no-store + UA header
        // cover the CF-side cache and the 403-on-headerless-fetch case.
        // per_page=8 (was 6): a real param, so bumping it busts a stale
        // Varnish entry (2026-08-15) and leaves headroom above the 7 posts.
        const res = await fetch('https://dev.to/api/articles?username=mansio&per_page=8&state=published', {
          cache: 'no-store',
          // dev.to rejects headerless fetches from datacenter egress (403); the
          // CI snapshot script already proves a UA header makes it through.
          headers: { 'User-Agent': 'msp-portfolio-server' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) throw new Error(`dev.to responded ${res.status}`);
        const articles = (await res.json()) as Array<{
          title: string;
          description?: string;
          reading_time_minutes?: number;
          url: string;
          tag_list?: string[];
        }>;
        return {
          count: articles.length,
          articles: articles.map((a) => ({
            title: a.title,
            description: a.description ?? '',
            readingTimeMinutes: a.reading_time_minutes ?? 0,
            url: a.url,
            tags: a.tag_list ?? [],
          })),
          source: 'live',
        };
      } catch (e) {
        // dev.to may still block Cloudflare egress. Fall back to the committed
        // metrics snapshot (refreshed hourly in CI) so agents get real data
        // instead of an empty error.
        const snap = await fetchCommittedMetrics();
        if (snap?.devto && snap.devto.length > 0) {
          return {
            count: snap.devto.length,
            articles: snap.devto.map((a) => ({
              title: a.title,
              description: a.description ?? '',
              readingTimeMinutes: a.readingTimeMinutes ?? 0,
              url: a.url,
              tags: a.tags ?? [],
            })),
            source: 'snapshot',
          };
        }
        return {
          count: 0,
          articles: [],
          source: 'unavailable',
          error: e instanceof Error ? e.message : String(e),
        };
      }
    },
  },
  {
    name: 'get_commit_history',
    description: "Get recent commit history across the owner's public repos (hourly snapshot). Use it to answer 'what has he been building lately' or 'show the hardest bugs he has fixed'.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async execute() {
      const snap = await fetchCommittedMetrics();
      if (!snap?.commits || snap.commits.length === 0) {
        return { count: 0, commits: [], source: 'unavailable', error: 'Commit snapshot unavailable.' };
      }
      return { count: snap.commits.length, commits: snap.commits, source: 'snapshot' };
    },
  },
  {
    name: 'get_antipatterns',
    description: "Get the owner's antipattern museum — real engineering mistakes with why they were bad, how they were fixed, and the lesson. Read-only, closed world.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      const list = (antipatternsData as { antipatterns: Antipattern[] }).antipatterns;
      return { count: list.length, antipatterns: list };
    },
  },
  {
    name: 'analyze_stack',
    description: 'Compare the owner\'s stack against a job\'s required skills. Returns per-skill match with evidence and coverage.',
    inputSchema: {
      type: 'object',
      properties: {
        required_skills: { type: 'array', items: { type: 'string' }, description: 'Skills the job requires.' },
      },
      required: ['required_skills'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute({ required_skills }) {
      const skills = Array.isArray(required_skills) ? required_skills.map(String) : [];
      const allStack = new Set<string>();
      for (const p of projects) for (const s of p.stack) allStack.add(s.toLowerCase());
      allStack.add('mcp');
      allStack.add('python');
      allStack.add('typescript');
      allStack.add('react');

      const matched: StackAnalysis['matched'] = skills.map((skill) => {
        const norm = skill.trim().toLowerCase();
        const found = [...allStack].find((s) => s.includes(norm) || norm.includes(s) || s.split(/[\s_\-/]/).some((part) => part === norm));
        return {
          skill,
          matched: Boolean(found),
          evidence: found
            ? `Covered: ${projects.filter((p) => p.stack.some((s) => s.toLowerCase() === found)).map((p) => p.name).join(', ')}`
            : 'Not directly evidenced — check get_projects() for adjacent skills.',
        };
      });

      const coverage = skills.length ? matched.filter((m) => m.matched).length / skills.length : 0;
      const verdict =
        coverage >= 0.8
          ? 'Strong fit — the required skills are directly evidenced by shipped projects.'
          : coverage >= 0.5
            ? 'Good fit with some gaps — adjacent MCP/AI infrastructure experience transfers.'
            : 'Partial fit — worth a conversation about how the underlying engineering transfers.';

      return { requiredSkills: skills, matched, coverage: Math.round(coverage * 100) / 100, verdict } satisfies StackAnalysis;
    },
  },
  {
    name: 'simulate_architecture',
    description: 'Simulate how a project\'s architecture behaves under a scenario (load spike, node loss, cache cold, LLM saturation). Returns latency percentiles per load and bottleneck analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          enum: Object.keys(ARCHITECTURES),
          description: 'Project to simulate.',
        },
        scenario: {
          type: 'string',
          enum: SCENARIOS.map((s) => s.id),
          description: 'Scenario to apply.',
        },
      },
      required: ['project_id', 'scenario'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute({ project_id, scenario }) {
      const projectId = String(project_id);
      const scenarioId = String(scenario);
      const model = ARCHITECTURES[projectId];
      if (!model) throw new Error(`Unknown project_id: ${projectId}. Available: ${Object.keys(ARCHITECTURES).join(', ')}`);
      if (!SCENARIOS.some((s) => s.id === scenarioId)) {
        throw new Error(`Unknown scenario: ${scenarioId}. Available: ${SCENARIOS.map((s) => s.id).join(', ')}`);
      }

      const { points, findings, events } = runSimulation(model, scenarioId);
      const scenarioDef = SCENARIOS.find((s) => s.id === scenarioId)!;
      const recommendation =
        scenarioId === 'llm_saturation'
          ? 'Scale the LLM tier horizontally; consider batching and a queue with backpressure.'
          : scenarioId === 'node_loss'
            ? 'Keep >=2 replicas per parallel group; add a passive standby for the critical path.'
            : scenarioId === 'cache_cold'
              ? 'Pre-warm caches on deploy; serve from last-good snapshot while warming.'
              : `Add autoscaling on the ${points[points.length - 1].bottleneck} stage before it saturates.`;

      return {
        projectId,
        scenario: scenarioId,
        scenarioLabel: scenarioDef.label,
        points,
        findings,
        events,
        recommendation,
      } satisfies SimulationResult;
    },
  },
  {
    name: 'get_experiments',
    description: "Get the owner's engineering experiments — hypothesis, command, raw result and verdict (confirmed/refuted/partial) for each. Use it to answer 'what did you measure' or 'show me an experiment you ran'. Includes negative results (approaches that failed). Read-only, closed world.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      return experimentsData as ExperimentsData;
    },
  },
  {
    name: 'get_diary',
    description: "Get the owner's engineering diary — incidents, root causes, fixes and guards, each tagged with a pattern (NEW vs recurring). Use it to answer 'what broke and how did you fix it' or 'show your hardest debugging session'. Read-only, closed world.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      const list = (diaryData as { entries: DiaryEntry[] }).entries;
      return { count: list.length, entries: list };
    },
  },
  {
    name: 'get_known_issues',
    description: "Get the owner's known-issues board — open debt with status, temperature (stable/watching) and deadlines. Use it to answer 'what's still broken' or 'what are you working on'. Read-only, closed world.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      const list = (knownIssuesData as { issues: KnownIssue[] }).issues;
      return { count: list.length, issues: list };
    },
  },
  {
    name: 'get_issue_detail',
    description: "Get the full detail of a single known issue by its ID (e.g. 'KI-109'). Drills into one open problem: status, temperature, owner, linked source and the raw problem statement. Returns a clear not-found with the available IDs if the ID does not match. Read-only, closed world.",
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: "The issue ID, e.g. 'KI-109' (case-insensitive)." },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute({ id }) {
      const wanted = String(id ?? '').trim().toUpperCase();
      const list = (knownIssuesData as { issues: KnownIssue[] }).issues;
      const issue = list.find((i) => i.id.toUpperCase() === wanted);
      if (!issue) {
        return { found: false, id: String(id ?? ''), availableIds: list.map((i) => i.id) };
      }
      return { found: true, issue };
    },
  },
  {
    name: 'verify_claim',
    description: "Ground a claim about the owner against the portfolio's data (profile, projects, principles, timeline, antipatterns, experiments, diary, known issues). Deterministic: returns the evidence records that support the claim (with source paths) and a supported verdict. Use it before asserting a fact about the owner, or to check what an answer was based on.",
    inputSchema: {
      type: 'object',
      properties: {
        claim: { type: 'string', description: 'The claim to verify, e.g. "built an MCP server with LanceDB hybrid search".' },
      },
      required: ['claim'],
    },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute({ claim }) {
      const claimText = String(claim ?? '').trim();
      const tokens = claimTokens(claimText);
      if (tokens.length < 2) {
        const note =
          tokens.length === 0
            ? 'Claim too short — no significant words found. Need at least 2 words of 4+ letters.'
            : `Claim too short — only ${tokens.length} significant word${tokens.length === 1 ? '' : 's'}: ${tokens.join(', ')}. Need at least 2 (words under 4 letters and generic ones like built/used/made are ignored).`;
        return {
          claim: claimText,
          tokens,
          supported: false,
          evidenceCount: 0,
          evidence: [],
          arm: 'deterministic',
          note,
        } satisfies VerifyClaimResult;
      }
      const evidence = EVIDENCE_CORPUS
        .map((r) => {
          const matchedTokens = tokens.filter((t) => r.text.includes(t));
          return { ...r, matchedTokens };
        })
        .filter((r) => r.matchedTokens.length >= 2) // precision guard: >=2 distinct words in the SAME record
        .sort((a, b) => b.matchedTokens.length - a.matchedTokens.length)
        .slice(0, 5)
        .map((r) => ({ kind: r.kind, source: r.source, title: r.title, matchedTokens: r.matchedTokens }));
      if (evidence.length > 0) {
        return {
          claim: claimText,
          tokens,
          supported: true,
          evidenceCount: evidence.length,
          evidence,
          arm: 'deterministic',
        } satisfies VerifyClaimResult;
      }

      // Deterministic miss → optional LLM arm (v2, KI-017; plan docs/verify-claim-v2-llm-arm.md).
      // Fail-closed: if the arm is unavailable or refuses, the refusal stands.
      // The worker arms this per request via setLlmArm (browser/tests: never).
      const arm = getLlmArm();
      if (arm) {
        const llm = await arm(claimText);
        if (llm.verdict === 'supported' && llm.source) {
          return {
            claim: claimText,
            tokens,
            supported: true,
            evidenceCount: 1,
            evidence: [{ kind: 'llm', source: llm.source, title: 'Verified via LLM paraphrase arm', matchedTokens: [] }],
            arm: 'llm',
            note: llm.reason,
          } satisfies VerifyClaimResult;
        }
        return {
          claim: claimText,
          tokens,
          supported: false,
          evidenceCount: 0,
          evidence: [],
          arm: 'llm',
          note: llm.error ? `LLM arm unavailable — fail-closed (${llm.error})` : llm.reason ?? undefined,
        } satisfies VerifyClaimResult;
      }

      return {
        claim: claimText,
        tokens,
        supported: false,
        evidenceCount: 0,
        evidence: [],
        arm: 'deterministic',
      } satisfies VerifyClaimResult;
    },
  },
  {
    name: 'verify_repo',
    description: "Verify a GitHub repository against the primary source: fetches the actual repo metadata (exists, language, description, topics, stars, last push) from the GitHub API and cross-checks it with the portfolio's project record when the repo is one of the owner's projects (language/stack agreement). With readme:true it also returns the actual README text, so claims about what the project does can be checked against the repository's own words. Use it to ground claims like 'the repo is Python' or 'he maintains mscodebase-intelligence' with live data instead of trusting the claim. Read-only, open world (network fetch).",
    inputSchema: {
      type: 'object',
      properties: {
        repo: {
          type: 'string',
          description: 'Repository name, e.g. "mscodebase-intelligence" (owner defaults to ManSio) or full "owner/name" or a github.com URL.',
        },
        readme: {
          type: 'boolean',
          description: 'Also fetch the repository README (first ~1200 chars) for claim checks against the project\'s own description.',
        },
      },
      required: ['repo'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async execute({ repo, readme }) {
      const raw = String(repo ?? '').trim();
      const normalized = raw.replace(/^https?:\/\/github\.com\//, '').replace(/^@/, '').replace(/\/$/, '').trim();
      const [ownerPart, namePart] = normalized.split('/');
      const name = (namePart ?? ownerPart ?? '').trim();
      if (!name) return { repo: raw, available: false, error: 'Provide a repository name.' };
      const owner = namePart ? ownerPart.trim() : 'ManSio';
      try {
        const res = await fetch(`https://api.github.com/repos/${owner}/${name}`, {
          headers: { 'User-Agent': 'msp-portfolio-server', Accept: 'application/vnd.github+json' },
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 404) {
          return { repo: raw, available: true, exists: false, note: `Repository ${owner}/${name} not found on GitHub (404).` };
        }
        if (!res.ok) {
          return { repo: raw, available: false, error: `GitHub API ${res.status}${res.status === 403 || res.status === 429 ? ' (rate limit?)' : ''}.` };
        }
        const data = (await res.json()) as {
          full_name?: string;
          language?: string | null;
          description?: string | null;
          topics?: string[];
          stargazers_count?: number;
          pushed_at?: string;
          archived?: boolean;
          owner?: { login?: string };
          name?: string;
        };
        // Cross-check with the curated portfolio record when this is one of the owner's projects.
        const fullName = data.full_name ?? `${owner}/${name}`;
        const project = projects.find((p) => p.repo?.toLowerCase() === fullName.toLowerCase());
        const portfolioProject = project
          ? {
              id: project.id,
              name: project.name,
              claimedLanguage: project.language,
              claimedStack: project.stack,
              liveLanguage: data.language ?? null,
              languageMatches: !project.language || !data.language || data.language === project.language,
            }
          : null;
        let readmeExcerpt: string | null = null;
        if (readme === true) {
          try {
            const rr = await fetch(`https://raw.githubusercontent.com/${owner}/${name}/HEAD/README.md`, {
              headers: { 'User-Agent': 'msp-portfolio-server' },
              signal: AbortSignal.timeout(8000),
            });
            if (rr.ok) readmeExcerpt = (await rr.text()).slice(0, 1200);
          } catch {
            readmeExcerpt = null; // README is a bonus — never fail the tool on it
          }
        }
        return {
          repo: raw,
          available: true,
          exists: true,
          fullName,
          language: data.language ?? null,
          description: data.description ?? null,
          topics: data.topics ?? [],
          stars: data.stargazers_count ?? 0,
          pushedAt: data.pushed_at ?? null,
          archived: data.archived ?? false,
          portfolioProject,
          readmeExcerpt,
        };
      } catch (err) {
        const message = err instanceof Error && err.name === 'AbortError' ? 'timeout after 8s' : err instanceof Error ? err.message : String(err);
        return { repo: raw, available: false, error: `GitHub unreachable: ${message}` };
      }
    },
  },
  {
    name: 'verify_article',
    description: "Verify an article against the primary source (Dev.to): does the owner have a published article matching the query? Fetches the live Dev.to API for the owner's articles and returns the real title/date/reactions/url when found — or an honest 'not found'. Use it to ground claims like 'he wrote about agent memory' in the platform's data instead of the portfolio's own words. Read-only, open world (network fetch).",
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Article title fragment or keyword, e.g. "agent memory" or an exact title.',
        },
      },
      required: ['query'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async execute({ query }) {
      const q = String(query ?? '').trim();
      if (q.length < 3) return { query: q, available: false, error: 'Query too short — provide at least 3 characters.' };
      try {
        const res = await fetch('https://dev.to/api/articles?username=mansio&per_page=100', {
          headers: { 'User-Agent': 'msp-portfolio-server' },
          signal: AbortSignal.timeout(8000),
        });
        if (!res.ok) return { query: q, available: false, error: `Dev.to API ${res.status}` };
        const articles = (await res.json()) as Array<{
          id: number;
          title: string;
          published_at?: string;
          public_reactions_count?: number;
          comments_count?: number;
          url?: string;
          tag_list?: string[];
        }>;
        const ql = q.toLowerCase();
        const matches = articles
          .filter((a) => a.title.toLowerCase().includes(ql))
          .slice(0, 5)
          .map((a) => ({
            title: a.title,
            publishedAt: a.published_at ?? null,
            reactions: a.public_reactions_count ?? 0,
            comments: a.comments_count ?? 0,
            url: a.url ?? null,
            tags: a.tag_list ?? [],
          }));
        return { query: q, available: true, found: matches.length > 0, matches, totalArticles: articles.length };
      } catch (err) {
        const message = err instanceof Error && err.name === 'AbortError' ? 'timeout after 8s' : err instanceof Error ? err.message : String(err);
        return { query: q, available: false, error: `Dev.to unreachable: ${message}` };
      }
    },
  },
  {
    name: 'verify_package',
    description: "Verify an npm package against the primary source (registry.npmjs.org): does it exist, latest version, publish date, description, license, maintainers — and is the owner among them? Use it to ground claims like 'he published an npm package' in the registry's data instead of the portfolio's. Honest 'not found' when the package does not exist. Read-only, open world (network fetch).",
    inputSchema: {
      type: 'object',
      properties: {
        package: {
          type: 'string',
          description: 'npm package name, e.g. "msp-portfolio" (lowercase).',
        },
      },
      required: ['package'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    async execute({ package: pkg }) {
      const name = String(pkg ?? '').trim().toLowerCase();
      if (!name) return { package: name, available: false, error: 'Provide a package name.' };
      try {
        const res = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}`, {
          headers: { 'User-Agent': 'msp-portfolio-server' },
          signal: AbortSignal.timeout(8000),
        });
        if (res.status === 404) {
          return { package: name, available: true, exists: false, note: `Package "${name}" not found on npm (404).` };
        }
        if (!res.ok) return { package: name, available: false, error: `npm registry ${res.status}` };
        const data = (await res.json()) as {
          name?: string;
          'dist-tags'?: Record<string, string>;
          description?: string;
          license?: string;
          maintainers?: Array<{ name?: string }>;
          time?: Record<string, string>;
        };
        const latest = data['dist-tags']?.['latest'] ?? null;
        const maintainers = (data.maintainers ?? []).map((m) => m.name ?? '');
        return {
          package: data.name ?? name,
          available: true,
          exists: true,
          latestVersion: latest,
          publishedAt: (latest && data.time?.[latest]) || null,
          description: data.description ?? null,
          license: data.license ?? null,
          maintainers,
          maintainedByOwner: maintainers.some((m) => m.toLowerCase() === 'mansio'),
        };
      } catch (err) {
        const message = err instanceof Error && err.name === 'AbortError' ? 'timeout after 8s' : err instanceof Error ? err.message : String(err);
        return { package: name, available: false, error: `npm registry unreachable: ${message}` };
      }
    },
  },
];

export function getTool(name: string): MCPTool | undefined {
  return TOOLS.find((t) => t.name === name);
}

export { runSimulation, ARCHITECTURES };

// ─────────────────────────────────────────────────────────────────────────────
// Committed metrics snapshot (hourly-refreshed in CI → public/metrics.json)
// ─────────────────────────────────────────────────────────────────────────────

const METRICS_SNAPSHOT_URL = 'https://mansio.github.io/MSPortfolio/metrics.json';

/** Fetches the committed metrics snapshot. Returns null on any failure. */
async function fetchCommittedMetrics(): Promise<MetricsSnapshot | null> {
  try {
    const res = await fetch(METRICS_SNAPSHOT_URL, {
      cache: 'no-store', // never serve a stale snapshot from the subrequest cache
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as MetricsSnapshot;
  } catch {
    return null;
  }
}
