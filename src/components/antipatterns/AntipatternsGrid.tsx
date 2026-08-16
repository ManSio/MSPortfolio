import antipatternsData from '../../data/antipatterns.json';
import antipatternsRu from '../../data/antipatterns.ru.json';
import type { Antipattern } from '../../lib/types';
import { useLang } from '../../i18n/LangContext';
import { useUi } from '../../i18n/ui';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';

const antipatterns = (antipatternsData as { antipatterns: Antipattern[] }).antipatterns;
const antipatternsRuList = (antipatternsRu as { antipatterns: Antipattern[] }).antipatterns;

/**
 * Antipattern museum: real engineering mistakes, why they were bad,
 * how they were fixed, and the lesson. Honesty as a portfolio asset.
 */
export function AntipatternsGrid() {
  const { isRu } = useLang();
  const ui = useUi();
  const list = isRu ? antipatternsRuList : antipatterns;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {list.map((a) => (
        <Card key={a.id} className="p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="font-mono text-sm font-semibold text-paper">{a.title}</p>
            <Badge tone="warn">{a.tag}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">
            <span className="text-faint">{ui.antipatterns.mistake} </span>
            {a.mistake}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-faint">
            <span className="text-faint">{ui.antipatterns.whyBad} </span>
            {a.whyBad}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-faint">
            <span className="text-faint">{ui.antipatterns.fix} </span>
            {a.fix}
          </p>
          <p className="mt-2 border-t border-line pt-2 text-sm text-accent">
            <span className="text-faint">{ui.antipatterns.lesson} </span>
            {a.lesson}
          </p>
        </Card>
      ))}
    </div>
  );
}
