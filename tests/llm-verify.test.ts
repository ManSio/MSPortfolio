import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyClaimLlmArm } from '../src/lib/llm-verify';

/**
 * v2 LLM arm — decision logic tests with a MOCKED model provider.
 *
 * These pin the fail-closed guards from docs/verify-claim-v2-llm-arm.md §5:
 * the arm never returns `supported` without a valid cited record, and any
 * failure (garbage, HTTP error, timeout, no candidates) degrades to `refused`.
 * The real-model recall/precision numbers come from scripts/eval-llm-arm.ts.
 */

const KEY = 'test-key';
const CONFIG = { apiKey: KEY, timeoutMs: 5000 };

function stubFetchOk(content: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string, init: { body: string }) => {
      // The user prompt must contain the claim and the candidate records.
      const body = JSON.parse(init.body as string) as { temperature: number; messages: Array<{ role: string; content: string }> };
      expect(body.temperature).toBe(0);
      expect(body.messages[0].role).toBe('system');
      return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verifyClaimLlmArm — decision logic (mocked model)', () => {
  it('supported with a valid cited record passes through with source + reason', async () => {
    stubFetchOk('{"verdict":"supported","source":"projects.json#profile","reason":"Profile mentions a production MCP server."}');
    const res = await verifyClaimLlmArm('production MCP server for codebase intelligence', CONFIG);
    expect(res.verdict).toBe('supported');
    expect(res.source).toBe('projects.json#profile');
    expect(res.reason).toContain('production');
    expect(res.error).toBeUndefined();
  });

  it('refused verdict is passed through honestly', async () => {
    stubFetchOk('{"verdict":"refused","source":null,"reason":"No record covers this."}');
    const res = await verifyClaimLlmArm('employed at the Google company', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.reason).toContain('No record');
  });

  it('garbage response fails closed to refused with an error', async () => {
    stubFetchOk('Sorry, I cannot answer that.');
    const res = await verifyClaimLlmArm('LanceDB and BM25 hybrid search', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.error).toContain('Unparseable');
  });

  it('supported without a cited source is refused (precision guard §5)', async () => {
    stubFetchOk('{"verdict":"supported","source":null,"reason":"It is implied."}');
    const res = await verifyClaimLlmArm('LanceDB and BM25 hybrid search', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.reason).toContain('fail-closed');
  });

  it('supported with a source not among the candidates is refused (guard §5)', async () => {
    stubFetchOk('{"verdict":"supported","source":"madeup.json#x","reason":"Some record."}');
    const res = await verifyClaimLlmArm('LanceDB and BM25 hybrid search', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.reason).toContain('fail-closed');
  });

  it('HTTP error fails closed to refused with the status', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('rate limited', { status: 429 })),
    );
    const res = await verifyClaimLlmArm('LanceDB and BM25 hybrid search', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.error).toContain('429');
  });

  it('abort/timeout fails closed to refused with a timeout message', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw Object.assign(new Error('aborted'), { name: 'AbortError' });
      }),
    );
    const res = await verifyClaimLlmArm('LanceDB and BM25 hybrid search', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.error).toContain('Timeout');
  });

  it('too-short claim (no significant tokens): refuses WITHOUT any network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await verifyClaimLlmArm('the and for when', CONFIG);
    expect(res.verdict).toBe('refused');
    expect(res.reason).toContain('too short');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('zero-overlap paraphrase still reaches the LLM with padded core records (p-01 fix)', async () => {
    // 'joins two retrieval styles to score results' shares no words with the
    // mscodebase record, but evidenceContext pads in the core identity records,
    // so the model can still find and cite the right source.
    const fetchMock = vi.fn(async (_url: string, init: { body: string }) => {
      const body = JSON.parse(init.body as string) as { messages: Array<{ role: string; content: string }> };
      // The padded context must include the mscodebase project record.
      expect(body.messages[1].content).toContain('mscodebase-intelligence');
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: '{"verdict":"supported","source":"projects.json#mscodebase-intelligence","reason":"Hybrid vector + BM25 search is two retrieval styles."}' } }],
        }),
        { status: 200 },
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const res = await verifyClaimLlmArm('joins two retrieval styles to score results', CONFIG);
    expect(res.verdict).toBe('supported');
    expect(res.source).toBe('projects.json#mscodebase-intelligence');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
