import principlesData from '../../data/principles.json';
import type { PrinciplesData } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

const data = principlesData as PrinciplesData;

export function PrinciplesGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {data.principles.map((p, i) => (
        <Card key={p.id} className="reveal">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold">{p.title}</h3>
            <Badge tone="accent">P-{String(i + 1).padStart(2, '0')}</Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-paper/75">{p.statement}</p>

          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="font-mono text-[11px] text-emerald-400 uppercase">example</p>
            <p className="mt-1 text-sm text-paper/75">{p.example}</p>
          </div>

          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="font-mono text-[11px] text-amber-400 uppercase">A/B · without this principle</p>
            <p className="mt-1 text-sm text-paper/75">{p.abTest}</p>
          </div>

          <p className="mt-3 font-mono text-xs text-paper/40">evidence: {p.evidence}</p>
        </Card>
      ))}
    </div>
  );
}
