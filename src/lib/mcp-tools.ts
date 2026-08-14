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
import type { Antipattern, DiaryEntry, ExperimentsData, KnownIssue, MCPTool, MetricsSnapshot, Principle, ProjectsData, SimEvent, SimulationResult, StackAnalysis } from './types.js';

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

export const TOOLS: MCPTool[] = [
  {
    name: 'get_profile',
    description: "Get the owner's professional profile summary.",
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: false },
    async execute() {
      return projectsData.profile;
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
        const res = await fetch('https://dev.to/api/articles?username=mansio&per_page=6&state=published', {
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
