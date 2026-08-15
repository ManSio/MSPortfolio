import { afterEach, describe, expect, it } from 'vitest';
import { getTool } from '../src/lib/mcp-tools';
import { setLlmArm } from '../src/lib/llm-arm-registry';
import type { VerifyClaimResult } from '../src/lib/types';

/**
 * v2 этап 2 — verify_claim + LLM arm integration.
 *
 * The arm is strictly additive and fail-closed: when the registry has no arm
 * (browser demo, tests, keyless deploys) the tool behaves exactly like v1
 * (deterministic, arm:'deterministic'); when armed, a deterministic miss may be
 * rescued with arm:'llm' and a cited source — but a refused/errored arm NEVER
 * turns into a false supported.
 */

const call = (name: string, args: Record<string, unknown>) => {
  const tool = getTool(name);
  if (!tool) throw new Error(`tool ${name} missing`);
  return tool.execute(args);
};

// A deterministic miss: no two significant words in one corpus record.
const PARAPHRASE = 'joins two retrieval styles to score results';

afterEach(() => {
  setLlmArm(undefined);
});

describe('verify_claim + LLM arm (stage 2)', () => {
  it('stays deterministic (v1 behavior) when no arm is configured', async () => {
    setLlmArm(undefined);
    const res = (await call('verify_claim', { claim: PARAPHRASE })) as VerifyClaimResult;
    expect(res.supported).toBe(false);
    expect(res.arm).toBe('deterministic');
    expect(res.evidenceCount).toBe(0);
  });

  it('rescues a deterministic miss when the arm supports it (arm:llm + cited source)', async () => {
    setLlmArm(async (claim) => ({
      claim,
      verdict: 'supported',
      source: 'projects.json#mscodebase-intelligence',
      reason: 'Hybrid vector + BM25 is two retrieval styles.',
      arm: 'llm',
      latencyMs: 5,
    }));
    const res = (await call('verify_claim', { claim: PARAPHRASE })) as VerifyClaimResult;
    expect(res.supported).toBe(true);
    expect(res.arm).toBe('llm');
    expect(res.evidenceCount).toBe(1);
    expect(res.evidence[0].source).toBe('projects.json#mscodebase-intelligence');
    expect(res.evidence[0].kind).toBe('llm');
  });

  it('keeps the refusal when the arm refuses (no false acceptance)', async () => {
    setLlmArm(async (claim) => ({
      claim,
      verdict: 'refused',
      source: undefined,
      reason: 'No record covers this.',
      arm: 'llm',
      latencyMs: 5,
    }));
    const res = (await call('verify_claim', { claim: PARAPHRASE })) as VerifyClaimResult;
    expect(res.supported).toBe(false);
    expect(res.arm).toBe('llm');
    expect(res.evidenceCount).toBe(0);
  });

  it('keeps the refusal and reports fail-closed when the arm errors', async () => {
    setLlmArm(async (claim) => ({
      claim,
      verdict: 'refused',
      source: undefined,
      reason: 'LLM arm unavailable — fail-closed.',
      error: 'Timeout after 8000ms',
      arm: 'llm',
      latencyMs: 8000,
    }));
    const res = (await call('verify_claim', { claim: PARAPHRASE })) as VerifyClaimResult;
    expect(res.supported).toBe(false);
    expect(res.arm).toBe('llm');
    expect(res.note).toContain('fail-closed');
  });

  it('does NOT consult the arm on a deterministic hit (v1 result wins untouched)', async () => {
    let consulted = false;
    setLlmArm(async (claim) => {
      consulted = true;
      return { claim, verdict: 'refused', source: undefined, reason: '', arm: 'llm', latencyMs: 1 };
    });
    const res = (await call('verify_claim', { claim: 'LanceDB and BM25 hybrid search' })) as VerifyClaimResult;
    expect(res.supported).toBe(true);
    expect(res.arm).toBe('deterministic');
    expect(consulted).toBe(false);
  });
});
