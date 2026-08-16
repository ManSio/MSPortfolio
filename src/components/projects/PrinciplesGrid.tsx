import principlesData from '../../data/principles.json';
import principlesRu from '../../data/principles.ru.json';
import type { PrinciplesData } from '../../lib/types';
import { useLang } from '../../i18n/LangContext';
import { useUi } from '../../i18n/ui';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

const data = principlesData as PrinciplesData;
const dataRu = principlesRu as PrinciplesData;

export function PrinciplesGrid() {
  const { isRu } = useLang();
  const ui = useUi();
  const d = isRu ? dataRu : data;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {d.principles.map((p, i) => (
        <Card key={p.id} className={`reveal ${i % 3 === 2 ? 'glass-card hover-lift' : ''}`}>
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-bold">{p.title}</h3>
            <Badge tone="accent">P-{String(i + 1).padStart(2, '0')}</Badge>
          </div>
          <p className="mt-2 text-sm leading-relaxed text-muted">{p.statement}</p>

          <div className="mt-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
            <p className="font-mono text-[11px] text-emerald-600 uppercase dark:text-emerald-400">{ui.principles.example}</p>
            <p className="mt-1 text-sm text-muted">{p.example}</p>
          </div>

          <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <p className="font-mono text-[11px] text-amber-600 uppercase dark:text-amber-400">{ui.principles.abTest}</p>
            <p className="mt-1 text-sm text-muted">{p.abTest}</p>
          </div>

          <p className="mt-3 font-mono text-xs text-faint">{ui.principles.evidence} {p.evidence}</p>
        </Card>
      ))}
    </div>
  );
}
