// v2 — LLM arm for verify_claim (KI-017 recall gap). Plan: docs/verify-claim-v2-llm-arm.md.
//
// Design (per plan §4-5):
//   - Called ONLY on a deterministic v1 miss; never downgrades a v1 `supported`.
//   - LLM receives the claim + top-K candidate records (same corpus as v1) and
//     must cite a record to say `supported`; anything else is fail-closed `refused`.
//   - Stateless: one fetch per call, no shared mutable state.
// Этап 1: this module powers the offline eval (scripts/eval-llm-arm.ts) and is
// NOT yet wired into the MCP tool — integration (этап 2) waits for eval numbers.

import { claimTokens, evidenceContext } from './mcp-tools.ts';

export interface LlmArmConfig {
  apiKey: string;
  model?: string;
  endpoint?: string;
  timeoutMs?: number;
  maxCandidates?: number;
}

export interface LlmArmResult {
  claim: string;
  verdict: 'supported' | 'refused';
  arm: 'llm';
  /** Record the LLM cited as the source (only for supported). */
  source?: string;
  /** Short human-readable justification from the LLM (transparency). */
  reason?: string;
  /** Set when the arm could not run — verdict is then fail-closed refused. */
  error?: string;
  latencyMs: number;
}

const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_MAX_CANDIDATES = 8;

const SYSTEM_PROMPT = `You verify a factual claim about a person against EXACTLY the provided data records.

Rules:
- Reply with ONLY a JSON object: {"verdict":"supported"|"refused","source":"<record source> or null","reason":"<one short sentence>"}
- "supported" ONLY if the claim is entailed by a SINGLE record: the record's text expresses the same fact, including close paraphrases (synonyms, reordered or reworded phrases).
- Refuse when the claim adds facts not present in the record, contradicts it, or only partially overlaps — the FULL claim must be supported by one record.
- Never assume, extrapolate, or use outside knowledge. When in doubt → "refused".
- For "supported" you MUST set "source" to exactly one of the provided record sources; otherwise the answer is rejected.

Example:
Claim: "built a search engine"
Records:
1. [projects.json#mscodebase] (project) Async MCP server with hybrid vector + BM25 search for code.
2. [principles.json#measure] (principle) Performance claims come from benchmarks with a command line.
Answer: {"verdict":"refused","source":null,"reason":"No record says he built a general search engine — only a code search server."}

Example:
Claim: "combines vector search with keyword ranking"
Records:
1. [projects.json#mscodebase] (project) Async MCP server with hybrid vector + BM25 search for code.
2. [principles.json#measure] (principle) Performance claims come from benchmarks with a command line.
Answer: {"verdict":"supported","source":"projects.json#mscodebase","reason":"The record describes hybrid vector + BM25 search — a close paraphrase of the claim."}`;

function buildUserPrompt(claim: string, candidates: Array<{ source: string; kind: string; text: string }>): string {
  const records = candidates.map((c, i) => `${i + 1}. [${c.source}] (${c.kind}) ${c.text}`).join('\n');
  return `Claim: "${claim}"\n\nRecords:\n${records}\n\nIs the claim supported by exactly one of these records?`;
}

/** Extract the first {...} JSON object from the model's content (tolerates code fences / prose). */
function parseVerdict(
  content: string,
): { verdict: 'supported' | 'refused'; source: string | null; reason: string } | null {
  const start = content.indexOf('{');
  const end = content.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(content.slice(start, end + 1)) as Record<string, unknown>;
    if (parsed.verdict !== 'supported' && parsed.verdict !== 'refused') return null;
    return {
      verdict: parsed.verdict,
      source: typeof parsed.source === 'string' && parsed.source ? parsed.source : null,
      reason: typeof parsed.reason === 'string' ? parsed.reason : '',
    };
  } catch {
    return null;
  }
}

/** Race a promise against a hard timeout; the timer is always cleared (no unhandled rejection). */
async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(Object.assign(new Error('timed out'), { name: 'AbortError' })), ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export async function verifyClaimLlmArm(claim: string, config: LlmArmConfig): Promise<LlmArmResult> {
  const started = Date.now();
  const latencyMs = () => Date.now() - started;

  // Mirror v1's "too short to verify" rule: refuse without a network call.
  if (claimTokens(claim).length < 2) {
    const tokens = claimTokens(claim);
    const reason =
      tokens.length === 0
        ? 'Claim too short — no significant words found. Need at least 2 words of 4+ letters.'
        : `Claim too short — only ${tokens.length} significant word${tokens.length === 1 ? '' : 's'}: ${tokens.join(', ')}. Need at least 2 (words under 4 letters and generic ones like built/used/made are ignored).`;
    return { claim, verdict: 'refused', arm: 'llm', reason, latencyMs: latencyMs() };
  }

  // Token-overlap candidates padded with core identity records (profile + projects + principles),
  // so a fully-rephrased claim still shows the LLM the records that may support it.
  const candidates = evidenceContext(claim, config.maxCandidates ?? DEFAULT_MAX_CANDIDATES);

  const endpoint = config.endpoint ?? DEFAULT_ENDPOINT;
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    let res: Response;
    try {
      res = await withTimeout(
        fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://mansio.github.io/MSPortfolio/',
            'X-Title': 'MSPortfolio verify_claim LLM arm',
          },
          body: JSON.stringify({
            model: config.model ?? DEFAULT_MODEL,
            temperature: 0,
            messages: [
              { role: 'system', content: SYSTEM_PROMPT },
              { role: 'user', content: buildUserPrompt(claim, candidates) },
            ],
          }),
        }),
        timeoutMs,
      );
    } catch (err) {
      const isTimeout = err instanceof Error && err.name === 'AbortError';
      throw new Error(isTimeout ? `Timeout after ${timeoutMs}ms` : err instanceof Error ? err.message : String(err));
    }

    if (!res.ok) {
      const text = (await res.text()).slice(0, 300);
      throw new Error(`OpenRouter ${res.status}: ${text}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseVerdict(content);
    if (!parsed) throw new Error('Unparseable LLM response');

    if (parsed.verdict === 'supported') {
      const sourceValid = candidates.some((c) => c.source === parsed.source);
      if (!sourceValid) {
        // Precision guard (§5): `supported` without a valid cited record is refused.
        return {
          claim,
          verdict: 'refused',
          arm: 'llm',
          reason: 'LLM claimed support without a valid cited record — fail-closed.',
          latencyMs: latencyMs(),
        };
      }
      return { claim, verdict: 'supported', source: parsed.source ?? undefined, reason: parsed.reason, arm: 'llm', latencyMs: latencyMs() };
    }

    return { claim, verdict: 'refused', arm: 'llm', reason: parsed.reason || undefined, latencyMs: latencyMs() };
  } catch (err) {
    const message = err instanceof Error && err.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : err instanceof Error ? err.message : String(err);
    return { claim, verdict: 'refused', arm: 'llm', reason: 'LLM arm unavailable — fail-closed.', error: message, latencyMs: latencyMs() };
  }
}
