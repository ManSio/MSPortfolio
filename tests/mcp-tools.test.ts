import { describe, expect, it, vi } from 'vitest';
import { ARCHITECTURES, getTool, runSimulation, TOOLS } from '../src/lib/mcp-tools';
import type { StackAnalysis, SimulationResult } from '../src/lib/types';

const call = (name: string, args: Record<string, unknown>) => {
  const tool = getTool(name);
  if (!tool) throw new Error(`tool ${name} missing`);
  return tool.execute(args);
};

describe('MCP tools', () => {
  it('registers the expected tool surface', () => {
    const names = TOOLS.map((t) => t.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'get_profile',
        'get_projects',
        'get_engineering_principles',
        'get_timeline',
        'get_articles',
        'get_commit_history',
        'get_antipatterns',
        'get_experiments',
        'get_diary',
        'get_known_issues',
        'analyze_stack',
        'simulate_architecture',
      ]),
    );
  });

  it('get_profile returns nextSteps with verified contact channels and MCP connect (D8)', async () => {
    const res = (await call('get_profile', {})) as {
      name: string;
      nextSteps: Array<{ type: string; label: string; url?: string; command?: string }>;
    };
    expect(res.name).toBe('Mikhail');
    const contact = res.nextSteps.filter((s) => s.type === 'contact');
    const linkedin = contact.find((s) => s.label === 'LinkedIn');
    expect(linkedin?.url).toBe('https://www.linkedin.com/in/ManSio');
    const github = res.nextSteps.find((s) => s.label === 'GitHub');
    expect(github?.type).toBe('view');
    const connect = res.nextSteps.find((s) => s.type === 'connect');
    expect(connect?.command).toContain('/mcp');
  });

  it('get_projects filters by stack tag and returns decision logs', async () => {
    const all = (await call('get_projects', {})) as { count: number; projects: Array<{ id: string }> };
    expect(all.count).toBeGreaterThanOrEqual(3);

    const mcp = (await call('get_projects', { filter: 'mcp' })) as { projects: Array<{ id: string }> };
    expect(mcp.projects.length).toBeGreaterThan(0);
    for (const p of mcp.projects) expect(p.id).not.toBe('infrawise');

    const aws = (await call('get_projects', { filter: 'aws' })) as { projects: Array<{ id: string }> };
    // infrawise was removed as a fork — aws must not match anything
    expect(aws.projects).toEqual([]);
  });

  it('get_engineering_principles returns six principles with A/B counterfactuals', async () => {
    const data = (await call('get_engineering_principles', {})) as { count: number; principles: Array<{ abTest: string }> };
    expect(data.count).toBe(6);
    for (const p of data.principles) expect(p.abTest.length).toBeGreaterThan(10);
  });

  it('analyze_stack matches real skills with evidence and is honest about gaps', async () => {
    const res = (await call('analyze_stack', { required_skills: ['python', 'mcp', 'react', 'kubernetes'] })) as StackAnalysis;
    expect(res.coverage).toBeCloseTo(0.75, 2);
    const bySkill = Object.fromEntries(res.matched.map((m) => [m.skill, m.matched]));
    expect(bySkill['python']).toBe(true);
    expect(bySkill['mcp']).toBe(true);
    expect(bySkill['react']).toBe(true);
    expect(bySkill['kubernetes']).toBe(false); // never pretend an unproven skill matches
    expect(res.matched.find((m) => m.skill === 'python')?.evidence).toContain('MSCodeBase');
  });

  it('simulate_architecture returns a 5-point curve and identifies a bottleneck', async () => {
    const res = (await call('simulate_architecture', {
      project_id: 'mscodebase-intelligence',
      scenario: 'load_spike',
    })) as SimulationResult;
    expect(res.points).toHaveLength(5);
    expect(res.points[0].load).toBe(1);
    expect(res.points[4].load).toBe(20);
    expect(res.points[4].p95).toBeGreaterThan(res.points[0].p95);
    expect(res.points[4].bottleneck.length).toBeGreaterThan(0);
    expect(res.findings.length).toBeGreaterThan(0);
  });

  it('simulate_architecture validates project/scenario inputs', async () => {
    await expect(call('simulate_architecture', { project_id: 'nope', scenario: 'load_spike' })).rejects.toThrow(/Unknown project_id/);
    await expect(call('simulate_architecture', { project_id: 'gemma_agent', scenario: 'nope' })).rejects.toThrow(/Unknown scenario/);
  });

  it('llm_saturation degrades super-linearly (gemma)', async () => {
    const res = (await call('simulate_architecture', { project_id: 'gemma_agent', scenario: 'llm_saturation' })) as SimulationResult;
    const ratio = res.points[4].p95 / res.points[0].p95;
    expect(ratio).toBeGreaterThan(3); // LLM dominates and saturates hard
    expect(res.findings.some((f) => f.includes('LLM'))).toBe(true);
  });

  it('llm_saturation is a no-op on non-LLM architectures and says so (KI-008)', async () => {
    const spike = (await call('simulate_architecture', { project_id: 'mscodebase-intelligence', scenario: 'load_spike' })) as SimulationResult;
    const sat = (await call('simulate_architecture', { project_id: 'mscodebase-intelligence', scenario: 'llm_saturation' })) as SimulationResult;
    expect(sat.points).toEqual(spike.points);
    expect(sat.findings.some((f) => f.toLowerCase().includes('no llm stage'))).toBe(true);
    expect(sat.findings.some((f) => f.includes('LLM generation dominates'))).toBe(false);
  });

  it('get_commit_history maps the committed snapshot (mock fetch)', async () => {
    const fakeFetch = vi.fn(async () =>
      new Response(
        JSON.stringify({
          fetchedAt: '2026-08-14T00:00:00Z',
          source: 'fallback',
          user: null,
          repos: [],
          npm: [],
          devto: [],
          commits: [
            { repo: 'msp-portfolio', sha: 'abc123', date: '2026-08-14T10:00:00Z', message: 'fix: hardening', author: 'ManSio' },
          ],
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fakeFetch);
    try {
      const res = (await call('get_commit_history', {})) as { count: number; commits: Array<{ repo: string; message: string }>; source: string };
      expect(res.count).toBe(1);
      expect(res.commits[0].repo).toBe('msp-portfolio');
      expect(res.commits[0].message).toBe('fix: hardening');
      expect(res.source).toBe('snapshot');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('get_antipatterns returns the museum with lessons (closed world)', async () => {
    const res = (await call('get_antipatterns', {})) as { count: number; antipatterns: Array<{ title: string; lesson: string; tag: string }> };
    expect(res.count).toBeGreaterThanOrEqual(6);
    for (const a of res.antipatterns) {
      expect(a.lesson.length).toBeGreaterThan(10);
      expect(a.tag.length).toBeGreaterThan(0);
    }
  });

  it('get_experiments returns experiments with verdicts and negative results (closed world)', async () => {
    const res = (await call('get_experiments', {})) as {
      experiments: Array<{ id: string; verdict: 'confirmed' | 'refuted' | 'partial'; finding: string }>;
      negativeResults: Array<{ attempt: string; whyFailed: string }>;
    };
    expect(res.experiments.length).toBeGreaterThanOrEqual(7);
    for (const e of res.experiments) {
      expect(['confirmed', 'refuted', 'partial']).toContain(e.verdict);
      expect(e.finding.length).toBeGreaterThan(10);
    }
    expect(res.negativeResults.length).toBeGreaterThanOrEqual(3);
    for (const n of res.negativeResults) {
      expect(n.attempt.length).toBeGreaterThan(5);
      expect(n.whyFailed.length).toBeGreaterThan(5);
    }
  });

  it('get_diary returns entries with root cause, fix and guard', async () => {
    const res = (await call('get_diary', {})) as {
      count: number;
      entries: Array<{ date: string; title: string; status: 'fixed' | 'partial'; rootCause: string; fix: string; guard: string; pattern: string }>;
    };
    expect(res.count).toBeGreaterThanOrEqual(15);
    for (const e of res.entries) {
      expect(e.rootCause.length).toBeGreaterThan(0);
      expect(e.fix.length).toBeGreaterThan(0);
      expect(e.guard.length).toBeGreaterThan(0);
      expect(['fixed', 'partial']).toContain(e.status);
    }
  });

  it('get_known_issues returns the board with temperature (closed world)', async () => {
    const res = (await call('get_known_issues', {})) as {
      count: number;
      issues: Array<{ id: string; status: string; temperature: 'stable' | 'watching' }>;
    };
    expect(res.count).toBeGreaterThanOrEqual(10);
    for (const i of res.issues) {
      expect(i.id).toMatch(/^KI-\d+$/);
      expect(['stable', 'watching']).toContain(i.temperature);
    }
  });

  it('lab tools are closed-world read-only', () => {
    for (const name of ['get_experiments', 'get_diary', 'get_known_issues']) {
      const tool = getTool(name);
      expect(tool?.annotations?.readOnlyHint).toBe(true);
      expect(tool?.annotations?.openWorldHint).toBe(false);
    }
  });

  it('simulate_architecture emits failure-mode events per scenario', async () => {
    const nodeLoss = (await call('simulate_architecture', { project_id: 'mscodebase-intelligence', scenario: 'node_loss' })) as SimulationResult;
    expect(nodeLoss.events.some((e) => e.type === 'degraded_mode')).toBe(true);
    expect(nodeLoss.events.some((e) => e.type === 'circuit_open')).toBe(true); // vector_search >100ms at 20x

    const gemma = (await call('simulate_architecture', { project_id: 'gemma_agent', scenario: 'llm_saturation' })) as SimulationResult;
    expect(gemma.events.some((e) => e.type === 'queue_backpressure')).toBe(true);
    expect(gemma.events.some((e) => e.type === 'circuit_open')).toBe(true); // llm_generate >> 100ms
  });

  it('every tool declares readOnlyHint annotations (read-only surface)', () => {
    for (const t of TOOLS) {
      expect(t.annotations?.readOnlyHint).toBe(true);
    }
    const articles = getTool('get_articles');
    expect(articles?.annotations?.openWorldHint).toBe(true); // network fetch
    const commits = getTool('get_commit_history');
    expect(commits?.annotations?.openWorldHint).toBe(true); // fetches metrics snapshot
    const antipatterns = getTool('get_antipatterns');
    expect(antipatterns?.annotations?.openWorldHint).toBe(false); // closed world
    const local = getTool('get_projects');
    expect(local?.annotations?.openWorldHint).toBe(false); // closed world
  });
});

describe('architecture models', () => {
  it('every architecture model produces a curve for every scenario', () => {
    const scenarios = ['load_spike', 'node_loss', 'cache_cold', 'llm_saturation'] as const;
    for (const projectId of Object.keys(ARCHITECTURES)) {
      for (const scenario of scenarios) {
        const model = ARCHITECTURES[projectId];
        const { points } = runSimulation(model, scenario);
        expect(points).toHaveLength(5);
        for (const p of points) {
          expect(p.p50).toBeGreaterThan(0);
          expect(p.p95).toBeGreaterThanOrEqual(p.p50);
          expect(p.bottleneck.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
