/**
 * v2 этап 1 — offline eval of the verify_claim LLM arm (KI-017).
 *
 * Runs the paraphrase eval set through BOTH the deterministic v1 tool and the
 * LLM arm, prints recall / false-acceptance / latency. The v2 Definition of
 * Done (docs/verify-claim-v2-llm-arm.md): recall ≥80% on true paraphrases,
 * false-acceptance ≤1% on negative controls, LLM p95 < 3s.
 *
 * Usage:
 *   OPENROUTER_API_KEY=<key> node scripts/eval-llm-arm.ts
 *   OPENROUTER_API_KEY=<key> node scripts/eval-llm-arm.ts --model openrouter/free
 */
import { getTool } from '../src/lib/mcp-tools.ts';
import { verifyClaimLlmArm } from '../src/lib/llm-verify.ts';
import { FALSE_PARAPHRASES, TRUE_PARAPHRASES } from '../src/data/paraphrase-eval.ts';
import type { VerifyClaimResult } from '../src/lib/types.ts';

const apiKey = process.env.OPENROUTER_API_KEY ?? '';
const model = process.argv.includes('--model') ? process.argv[process.argv.indexOf('--model') + 1] : undefined;

if (!apiKey) {
  console.error('OPENROUTER_API_KEY is not set. Usage: OPENROUTER_API_KEY=<key> node scripts/eval-llm-arm.ts');
  process.exit(2);
}

const verifyV1 = async (claim: string): Promise<VerifyClaimResult> => {
  const tool = getTool('verify_claim');
  if (!tool) throw new Error('verify_claim tool missing');
  return (await tool.execute({ claim })) as VerifyClaimResult;
};

const pct = (n: number, d: number) => (d === 0 ? 'n/a' : `${Math.round((n / d) * 100)}%`);

interface Row {
  id: string;
  paraphrase: string;
  v1: boolean;
  llm: boolean;
  source?: string;
  error?: string;
  latencyMs: number;
}

async function runSet(cases: Array<{ id: string; paraphrase: string }>): Promise<Row[]> {
  const rows: Row[] = [];
  for (const c of cases) {
    const v1 = await verifyV1(c.paraphrase);
    const llm = await verifyClaimLlmArm(c.paraphrase, { apiKey, model });
    rows.push({
      id: c.id,
      paraphrase: c.paraphrase,
      v1: v1.supported,
      llm: llm.verdict === 'supported',
      source: llm.source,
      error: llm.error,
      latencyMs: llm.latencyMs,
    });
    console.log(
      `${llm.verdict === 'supported' ? '✅' : '❌'} ${c.id} v1=${v1.supported ? 'Y' : 'N'} llm=${llm.verdict === 'supported' ? 'Y' : 'N'} ` +
        `${llm.latencyMs}ms ${llm.source ?? ''}${llm.error ? ` [${llm.error}]` : ''}  "${c.paraphrase}"`,
    );
  }
  return rows;
}

const trueRows = await runSet(TRUE_PARAPHRASES);
const falseRows = await runSet(FALSE_PARAPHRASES);

const v1Recall = trueRows.filter((r) => r.v1).length;
const llmRecall = trueRows.filter((r) => r.llm).length;
const combinedRecall = trueRows.filter((r) => r.v1 || r.llm).length;
const v1FalseAccept = falseRows.filter((r) => r.v1).length;
const llmFalseAccept = falseRows.filter((r) => r.llm).length;

const latencies = [...trueRows, ...falseRows].map((r) => r.latencyMs).sort((a, b) => a - b);
const p50 = latencies.length ? latencies[Math.floor(latencies.length / 2)] : 0;
const p95 = latencies.length ? latencies[Math.ceil(latencies.length * 0.95) - 1] : 0;

console.log('\n=== v2 LLM arm — offline eval summary ===');
console.log(`model:                 ${model ?? 'openrouter/free'}`);
console.log(`true paraphrases:      ${TRUE_PARAPHRASES.length}`);
console.log(`  v1 recall:           ${pct(v1Recall, TRUE_PARAPHRASES.length)} (${v1Recall}/${TRUE_PARAPHRASES.length}) — deterministic baseline`);
console.log(`  llm recall:          ${pct(llmRecall, TRUE_PARAPHRASES.length)} (${llmRecall}/${TRUE_PARAPHRASES.length})`);
console.log(`  combined recall:     ${pct(combinedRecall, TRUE_PARAPHRASES.length)} (${combinedRecall}/${TRUE_PARAPHRASES.length}) — target ≥80%`);
console.log(`negative controls:     ${FALSE_PARAPHRASES.length}`);
console.log(`  v1 false-accept:     ${pct(v1FalseAccept, FALSE_PARAPHRASES.length)} (${v1FalseAccept})`);
console.log(`  llm false-accept:    ${pct(llmFalseAccept, FALSE_PARAPHRASES.length)} (${llmFalseAccept}) — target ≤1%`);
console.log(`latency:               p50=${p50}ms p95=${p95}ms — target p95 < 3000ms`);
console.log('\nDoD check: ' + (llmRecall / TRUE_PARAPHRASES.length >= 0.8 && llmFalseAccept === 0 && p95 < 3000 ? 'MET ✅' : 'NOT MET — iterate on prompt/model'));
