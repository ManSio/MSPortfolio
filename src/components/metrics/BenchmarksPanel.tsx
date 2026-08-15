import { useEffect, useState } from 'react';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

/**
 * Benchmarks panel — the portfolio's measured numbers (recommendation 1).
 * Reads public/benchmarks.json (written by `pnpm bench`, committed like
 * metrics.json). Every number has a command that reproduces it.
 */

interface BenchData {
  updatedAt: string;
  claimVerification: {
    setSize: number;
    paraphrases: number;
    negativeControls: number;
    v1RecallPct: number;
    llmArm: { recallPct: number; falseAcceptance: number; p50Ms: number; p95Ms: number; model: string } | null;
    command: string;
  };
  mutationTesting: { beforePct: number; afterPct: number; verdict: string; command: string; source: string } | null;
  concurrency: { workers: number; correct: number; command: string; source: string };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-2.5">
      <p className="text-xs text-faint">{label}</p>
      <p className="mt-0.5 font-mono text-lg font-bold text-paper">{value}</p>
      {hint ? <p className="mt-0.5 font-mono text-[10px] text-faint">{hint}</p> : null}
    </div>
  );
}

export function BenchmarksPanel() {
  const [data, setData] = useState<BenchData | null>(null);
  const [state, setState] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}benchmarks.json`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: BenchData) => {
        if (!cancelled) {
          setData(d);
          setState('ok');
        }
      })
      .catch(() => {
        if (!cancelled) setState('error');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state === 'loading') {
    return (
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-line bg-surface/60 p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-7 w-16" />
          </div>
        ))}
      </div>
    );
  }

  if (state === 'error' || !data) {
    return (
      <div className="rounded-xl border border-dashed border-line p-4 text-sm text-muted">
        Benchmarks unavailable — run <span className="font-mono text-accent">pnpm bench</span> to generate
        <span className="font-mono"> public/benchmarks.json</span>.
      </div>
    );
  }

  const cv = data.claimVerification;
  return (
    <div className="space-y-3">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-faint uppercase tracking-wide">Claim verification</p>
            <Badge tone="success">measured</Badge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="LLM arm recall" value={`${cv.llmArm ? cv.llmArm.recallPct + '%' : '—'} (${cv.paraphrases} paraphrases)`} hint="paraphrase set" />
            <Stat label="False accepts" value={cv.llmArm ? String(cv.llmArm.falseAcceptance) : '—'} hint={`of ${cv.negativeControls} controls`} />
            <Stat label="Latency p95" value={cv.llmArm ? `${cv.llmArm.p95Ms} ms` : '—'} hint={cv.llmArm?.model ?? ''} />
            <Stat label="v1 (exact words)" value={`${cv.v1RecallPct}%`} hint="deterministic arm" />
          </div>
          <p className="mt-2 font-mono text-[10px] text-faint">{cv.command}</p>
        </div>

        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="text-xs font-medium text-faint uppercase tracking-wide">Mutation testing</p>
          {data.mutationTesting ? (
            <>
              <p className="mt-2 font-mono text-lg font-bold text-paper">
                {data.mutationTesting.beforePct}% → {data.mutationTesting.afterPct}%
              </p>
              <p className="mt-1 text-xs text-muted">
                reranker grader mutation score after fixing value-validation (<span className="font-mono">NaN/Infinity</span> silently passed type checks).
              </p>
              <p className="mt-2 font-mono text-[10px] text-faint">{data.mutationTesting.command}</p>
            </>
          ) : (
            <p className="mt-2 text-sm text-muted">No mutation experiment recorded.</p>
          )}
        </div>

        <div className="rounded-xl border border-line bg-surface/60 p-4">
          <p className="text-xs font-medium text-faint uppercase tracking-wide">Concurrency correctness</p>
          <p className="mt-2 font-mono text-lg font-bold text-paper">
            {data.concurrency.correct}/{data.concurrency.workers}
          </p>
          <p className="mt-1 text-xs text-muted">parallel tool calls: correct input → correct output (no cross-talk).</p>
          <p className="mt-2 font-mono text-[10px] text-faint">{data.concurrency.command}</p>
        </div>
      </div>
      <p className="font-mono text-[10px] text-faint">
        reproduced with `pnpm bench` · updated {data.updatedAt}
      </p>
    </div>
  );
}
