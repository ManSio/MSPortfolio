import { useEffect, useState } from 'react';
import { callLocalTool, callMcpTool, probeMcpEndpoint, type McpMode } from '../../lib/mcp-client';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface EvidenceRecord {
  kind: string;
  source: string;
  title: string;
  matchedTokens: string[];
}

interface VerifyResult {
  claim: string;
  supported: boolean;
  evidenceCount: number;
  evidence: EvidenceRecord[];
  note?: string;
  arm?: 'deterministic' | 'llm';
}

/**
 * Evidence Score widget — runs the SAME `verify_claim` tool the MCP server
 * exposes (live endpoint when reachable, in-browser engine otherwise).
 * Paste any claim about the owner → see the source records behind it (or an
 * honest refusal when the data does not support it).
 */
export function ClaimVerifier() {
  const [mode, setMode] = useState<McpMode | 'probing'>('probing');
  const [claim, setClaim] = useState('');
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    probeMcpEndpoint().then(setMode);
  }, []);

  async function run() {
    const text = claim.trim();
    if (!text || busy) return;
    setBusy(true);
    setResult(null);
    try {
      const res =
        mode === 'live' ? await callMcpTool('verify_claim', { claim: text }, 99) : await callLocalTool('verify_claim', { claim: text });
      setResult(res as VerifyResult);
    } catch (e) {
      setResult({
        claim: text,
        supported: false,
        evidenceCount: 0,
        evidence: [],
        note: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-line bg-surface/70 p-4 backdrop-blur-sm">
      <p className="font-mono text-xs text-accent">verify a claim — evidence score</p>
      <p className="mt-1 text-xs leading-relaxed text-faint">
        Same <span className="font-mono">verify_claim</span> tool as the MCP server: is a statement about the owner
        supported by the data?
      </p>
      <div className="mt-3 flex gap-2">
        <input
          value={claim}
          onChange={(e) => setClaim(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run();
          }}
          placeholder='e.g. "built an MCP server with LanceDB"'
          disabled={busy}
          className="min-h-9 flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-paper placeholder:text-faint focus:border-accent/60 focus:outline-none disabled:opacity-40"
        />
        <Button variant="accent" onClick={() => void run()} disabled={busy}>
          Verify
        </Button>
      </div>

      {result && (
        <div className="mt-3 space-y-2 font-mono text-xs">
          <div className="flex flex-wrap items-center gap-2">
            {result.supported ? (
              <Badge tone="success">supported · {result.evidenceCount} record{result.evidenceCount === 1 ? '' : 's'}</Badge>
            ) : (
              <Badge tone="warn">not supported</Badge>
            )}
            {mode === 'live' ? <Badge tone="success">LIVE</Badge> : <Badge tone="warn">local</Badge>}
            {result.arm === 'llm' && <Badge tone="primary">LLM arm</Badge>}
          </div>
          {result.note ? (
            <p className="text-faint">{result.note}</p>
          ) : result.evidence.length === 0 ? (
            <p className="text-faint">No data record supports this claim — refused rather than guessed.</p>
          ) : (
            <ul className="space-y-1.5">
              {result.evidence.map((ev, i) => (
                <li key={i} className="rounded-lg border border-line bg-surface-2/60 px-2.5 py-1.5">
                  <span className="text-emerald-600 dark:text-emerald-400">{ev.kind}</span>
                  <span className="text-faint"> · </span>
                  <span className="text-paper">{ev.title}</span>
                  <div className="mt-0.5 text-faint">
                    {ev.source} · +{ev.matchedTokens.length} token{ev.matchedTokens.length === 1 ? '' : 's'}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
