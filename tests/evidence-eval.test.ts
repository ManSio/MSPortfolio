import { describe, expect, it } from 'vitest';
import { getTool, TOOLS } from '../src/lib/mcp-tools';
import type { VerifyClaimResult } from '../src/lib/types';
import { computeEvidence } from '../worker/index';
import evidenceData from '../src/data/lab/evidence.json' with { type: 'json' };
import { FALSE_PARAPHRASES, TRUE_PARAPHRASES } from '../src/data/paraphrase-eval';

/**
 * D3 — Evidence Score v1 eval (deterministic arm).
 *
 * Canonical claims a recruiter or agent would assert about the owner → check the
 * grounding is correct: supported claims find evidence records, unsupported ones
 * are refused honestly. No LLM in this arm — the corpus is the portfolio data.
 */

async function verify(claim: string): Promise<VerifyClaimResult> {
  const tool = getTool('verify_claim');
  expect(tool, 'verify_claim tool must be registered').toBeTruthy();
  const res = (await tool!.execute({ claim })) as VerifyClaimResult;
  return res;
}

describe('verify_claim — Evidence Score v1 (deterministic arm)', () => {
  it('is registered as the 13th tool with readOnlyHint and a required claim input', () => {
    const tool = TOOLS.find((t) => t.name === 'verify_claim');
    expect(tool).toBeTruthy();
    expect(TOOLS).toHaveLength(13);
    expect(tool?.annotations?.readOnlyHint).toBe(true);
    expect(tool?.annotations?.openWorldHint).toBe(false);
    const schema = tool?.inputSchema as { required?: string[] };
    expect(schema.required).toContain('claim');
  });

  it('supports a true claim about the profile with project evidence', async () => {
    const res = await verify('production MCP server for codebase intelligence');
    expect(res.supported).toBe(true);
    expect(res.evidenceCount).toBeGreaterThan(0);
    const top = res.evidence[0];
    expect(top.kind).toBe('profile');
    expect(top.matchedTokens.length).toBeGreaterThanOrEqual(2);
  });

  it('supports a claim traced to a specific project record', async () => {
    const res = await verify('LanceDB and BM25 hybrid search');
    expect(res.supported).toBe(true);
    const project = res.evidence.find((e) => e.kind === 'project');
    expect(project).toBeTruthy();
    expect(project?.source).toContain('mscodebase-intelligence');
  });

  it('refuses an unsupported claim honestly (negative control)', async () => {
    const res = await verify('worked at Google');
    expect(res.supported).toBe(false);
    expect(res.evidenceCount).toBe(0);
  });

  it('refuses an invented company claim (negative control 2)', async () => {
    const res = await verify('led a team of engineers at Meta');
    expect(res.supported).toBe(false);
    expect(res.evidenceCount).toBe(0);
  });

  it('notes when the claim is too short to verify instead of guessing', async () => {
    const short = await verify('portfolio');
    expect(short.supported).toBe(false);
    expect(short.note).toContain('too short');

    const empty = await verify('');
    expect(empty.supported).toBe(false);
    expect(empty.note).toBeTruthy();
  });
});

describe('evidence ledger — canonical claims match verify_claim (Proof-of-Portfolio)', () => {
  it('every ledger claim receives the expected verdict from verify_claim', async () => {
    const claims = (evidenceData as { claims: Array<{ id: string; claim: string; expected: 'supported' | 'refused' }> }).claims;
    const results: Array<{ id: string; claim: string; expected: string; actual: string }> = [];
    for (const c of claims) {
      const res = await verify(c.claim);
      results.push({ id: c.id, claim: c.claim, expected: c.expected, actual: res.supported ? 'supported' : 'refused' });
    }
    const mismatches = results.filter((r) => r.actual !== r.expected);
    expect(mismatches, JSON.stringify(mismatches, null, 2)).toEqual([]);
  });
});

describe('computeEvidence — chat grounding summary (deterministic)', () => {
  it('counts tool calls, grounded and failed results', () => {
    const ev = computeEvidence([
      { type: 'tool_call', name: 'get_projects', args: {} },
      { type: 'tool_result', name: 'get_projects', result: { count: 3, projects: [] } },
      { type: 'tool_call', name: 'get_articles', args: {} },
      { type: 'tool_result', name: 'get_articles', result: { error: 'dev.to 403' } },
    ]);
    expect(ev.toolCalls).toBe(2);
    expect(ev.grounded).toBe(1);
    expect(ev.failed).toBe(1);
    expect(ev.ungrounded).toBe(false);
  });

  it('flags an answer with no tool calls as ungrounded', () => {
    const ev = computeEvidence([]);
    expect(ev.toolCalls).toBe(0);
    expect(ev.grounded).toBe(0);
    expect(ev.failed).toBe(0);
    expect(ev.ungrounded).toBe(true);
  });

  it('treats a null result as failed, not grounded', () => {
    const ev = computeEvidence([
      { type: 'tool_call', name: 'get_profile', args: {} },
      { type: 'tool_result', name: 'get_profile', result: null },
    ]);
    expect(ev.grounded).toBe(0);
    expect(ev.failed).toBe(1);
  });
});

/**
 * v2 stage 0 — paraphrase eval set (KI-017 recall gap).
 *
 * v1 matches ≥2 significant words in ONE record; a true claim phrased with
 * synonyms/restructured words is refused even though the fact is in the corpus.
 * These tests pin the CURRENT baseline (the gap the v2 LLM arm must close) and
 * guard against regressions. See docs/verify-claim-v2-llm-arm.md §6.
 *
 * When the v2 LLM arm lands: flip `expected` for the true paraphrases to
 * 'supported' and update the baseline count — that is the v2 Definition of Done.
 */
describe('verify_claim — v2 stage 0: paraphrase eval set (recall gap baseline)', () => {
  // Paraphrase cases live in src/data/paraphrase-eval.ts (shared with the
  // offline LLM-arm eval scripts/eval-llm-arm.ts) — one source of truth.

  it('true paraphrases are currently refused — this is the v1 recall gap (baseline)', async () => {
    for (const p of TRUE_PARAPHRASES) {
      const res = await verify(p.paraphrase);
      // Baseline: v1 misses every paraphrase. Flip to `true` when the v2 LLM arm lands.
      expect(res.supported, `${p.id} became supported unexpectedly`).toBe(false);
    }
    console.log(`[v2-stage-0] paraphrase recall baseline: 0/${TRUE_PARAPHRASES.length} rescued by v1`);
  });

  it('paraphrased negative controls stay refused (no false-acceptance from recall work)', async () => {
    for (const p of FALSE_PARAPHRASES) {
      const res = await verify(p.paraphrase);
      expect(res.supported, `${p.id} must stay refused`).toBe(false);
      expect(res.evidenceCount).toBe(0);
    }
  });

  it('documents a v1 false-acceptance on generic words — substring collision (v2 must fix)', async () => {
    // "search" + "engine" both occur inside unrelated records (e.g. "engineering"),
    // so this FALSE claim currently gets supported. Pin the current behavior as a
    // baseline; the v2 Definition of Done flips it to refused.
    const res = await verify('spent several years at the big search engine company');
    expect(res.supported).toBe(true);
    expect(res.evidenceCount).toBeGreaterThan(0);
  });
});
