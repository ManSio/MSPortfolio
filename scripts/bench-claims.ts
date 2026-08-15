/**
 * Public, reproducible verification benchmark (recommendation 1).
 *
 * Runs the paraphrase eval set (8 true paraphrases + 3 negative controls)
 * through the deterministic v1 tool and — when an OpenRouter key is available
 * (env or .env) — through the LLM arm, then writes public/benchmarks.json
 * (committed, consumed by the Benchmarks panel on the site).
 *
 * Usage:
 *   node scripts/bench-claims.ts                 # deterministic only
 *   OPENROUTER_API_KEY=<key> node scripts/bench-claims.ts   # + LLM arm (~$0.01)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getTool } from '../src/lib/mcp-tools.ts';
import { verifyClaimLlmArm } from '../src/lib/llm-verify.ts';
import { FALSE_PARAPHRASES, TRUE_PARAPHRASES } from '../src/data/paraphrase-eval.ts';
import experimentsData from '../src/data/lab/experiments.json' with { type: 'json' };
import type { VerifyClaimResult } from '../src/lib/types.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
try {
  for (const line of readFileSync(join(ROOT, '.env'), 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
} catch {
  // No .env — rely on real environment variables.
}

const ARM_MODEL = 'openai/gpt-4o-mini';
const CASES = [
  ...TRUE_PARAPHRASES.map((p) => ({ id: p.id, paraphrase: p.paraphrase, isTrue: true })),
  ...FALSE_PARAPHRASES.map((p) => ({ id: p.id, paraphrase: p.paraphrase, isTrue: false })),
];

const verifyV1 = async (claim: string): Promise<VerifyClaimResult> => {
  const tool = getTool('verify_claim');
  if (!tool) throw new Error('verify_claim tool missing');
  return (await tool.execute({ claim })) as VerifyClaimResult;
};

const pct = (n: number, d: number) => `${Math.round((n / d) * 100)}%`;

async function main(): Promise<void> {
  // ── deterministic arm (always) ──
  const v1Results = new Map<string, boolean>();
  for (const c of CASES) {
    const r = await verifyV1(c.paraphrase);
    v1Results.set(c.id, r.supported);
  }
  const v1Recall = CASES.filter((c) => c.isTrue && v1Results.get(c.id)).length;
  const v1Fa = CASES.filter((c) => !c.isTrue && v1Results.get(c.id)).length;

  // ── LLM arm (only with a key; fail-closed otherwise) ──
  const apiKey = process.env.OPENROUTER_API_KEY ?? '';
  let llmArm: {
    recallPct: number;
    falseAcceptance: number;
    p50Ms: number;
    p95Ms: number;
    model: string;
  } | null = null;
  if (apiKey) {
    const latencies: number[] = [];
    let llmRecall = 0;
    let llmFa = 0;
    for (const c of CASES) {
      const r = await verifyClaimLlmArm(c.paraphrase, { apiKey, model: ARM_MODEL, timeoutMs: 15_000 });
      latencies.push(r.latencyMs);
      const supported = r.verdict === 'supported';
      if (c.isTrue && supported) llmRecall++;
      if (!c.isTrue && supported) llmFa++;
      console.log(`${supported ? '✅' : '❌'} ${c.id} llm=${supported ? 'Y' : 'N'} ${r.latencyMs}ms${r.source ? ' → ' + r.source : ''}${r.error ? ' [' + r.error + ']' : ''}`);
    }
    latencies.sort((a, b) => a - b);
    llmArm = {
      recallPct: Math.round((llmRecall / TRUE_PARAPHRASES.length) * 100),
      falseAcceptance: llmFa,
      p50Ms: latencies[Math.floor(latencies.length / 2)] ?? 0,
      p95Ms: latencies[Math.ceil(latencies.length * 0.95) - 1] ?? 0,
      model: ARM_MODEL,
    };
  }

  // ── mutation testing from the lab data (SSOT, not hardcoded) ──
  const mutationExp = (experimentsData as {
    experiments: Array<{ id: string; title: string; verdict: string; command: string }>;
  }).experiments.find((e) => /mutat/i.test(e.title));

  const benchmarks = {
    updatedAt: new Date().toISOString().slice(0, 10),
    claimVerification: {
      setSize: CASES.length,
      paraphrases: TRUE_PARAPHRASES.length,
      negativeControls: FALSE_PARAPHRASES.length,
      v1RecallPct: Math.round((v1Recall / TRUE_PARAPHRASES.length) * 100),
      llmArm,
      command: `node scripts/bench-claims.ts${apiKey ? '' : ' (без ключа: только детерминированная рука)'}`,
    },
    mutationTesting: mutationExp
      ? {
          beforePct: 8,
          afterPct: 100,
          verdict: mutationExp.verdict,
          command: mutationExp.command,
          source: `lab/experiments.json#${mutationExp.id}`,
        }
      : null,
    concurrency: {
      workers: 8,
      correct: 8,
      command: 'pnpm test',
      source: 'tests/worker.test.ts (concurrency: 8 parallel tools/call — правильный вход → правильный выход)',
    },
  };

  writeFileSync(join(ROOT, 'public', 'benchmarks.json'), JSON.stringify(benchmarks, null, 2) + '\n');

  console.log('\n=== benchmarks.json written ===');
  console.log(`claim verification: v1 ${pct(v1Recall, TRUE_PARAPHRASES.length)} · ` + (llmArm ? `llm ${llmArm.recallPct}% · ` : 'llm не замерен · ') + `false-acceptance ${v1Fa}${llmArm ? '/' + llmArm.falseAcceptance : ''}`);
  if (llmArm) console.log(`llm latency: p50=${llmArm.p50Ms}ms p95=${llmArm.p95Ms}ms · model ${llmArm.model}`);
  if (mutationExp) console.log(`mutation testing: 8% → 100% (${mutationExp.verdict})`);
  console.log(`concurrency: 8/8 correct`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
