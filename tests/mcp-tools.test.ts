import { describe, expect, it } from 'vitest';
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
        'analyze_stack',
        'simulate_architecture',
      ]),
    );
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
