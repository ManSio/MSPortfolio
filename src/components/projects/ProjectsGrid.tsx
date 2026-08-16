import projectsData from '../../data/projects.json';
import projectsRu from '../../data/projects.ru.json';
import type { Project, ProjectsData } from '../../lib/types';
import { useLang } from '../../i18n/LangContext';
import { useUi } from '../../i18n/ui';
import { Badge } from '../ui/Badge';
import { Card, CardHeader } from '../ui/Card';

const data = projectsData as ProjectsData;
const dataRu = projectsRu as ProjectsData;

export function ProjectsGrid() {
  const { isRu } = useLang();
  const ui = useUi();
  const d = isRu ? dataRu : data;
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {d.projects.map((p, i) => (
        <ProjectCard key={p.id} project={p} glassy={i % 3 === 2} ui={ui} />
      ))}
    </div>
  );
}

function ProjectCard({ project: p, glassy, ui }: { project: Project; glassy?: boolean; ui: ReturnType<typeof useUi> }) {
  return (
    <Card className={`reveal flex flex-col ${glassy ? 'glass-card hover-lift' : ''}`}>
      <CardHeader>
        <div>
          <a href={p.url} target="_blank" rel="noreferrer" className="text-lg font-bold hover:text-accent">
            {p.name}
          </a>
          <p className="text-sm text-muted">{p.tagline}</p>
        </div>
        <Badge tone="accent">
          ★ {p.stars}
        </Badge>
      </CardHeader>

      <p className="text-sm leading-relaxed text-muted">{p.description}</p>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {p.stack.map((s) => (
          <Badge key={s}>{s}</Badge>
        ))}
      </div>

      <ul className="mt-4 space-y-1 text-sm text-muted">
        {p.highlights.map((h) => (
          <li key={h} className="flex gap-2">
            <span className="text-accent">▸</span>
            {h}
          </li>
        ))}
      </ul>

      <details className="group mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer text-sm font-semibold text-muted transition-colors hover:text-accent">
          {ui.projects.decisionLog} ({p.decisionLog.length})
        </summary>
        <div className="mt-3 space-y-4">
          {p.decisionLog.map((d, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface-2/40 p-3">
              <p className="text-sm font-semibold">{d.decision}</p>
              {d.alternatives.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
                  <span className="text-faint">{ui.projects.considered}</span>
                  {d.alternatives.map((alt, j) => (
                    <span
                      key={j}
                      className="rounded border border-line px-1.5 py-0.5 text-faint line-through decoration-muted/50"
                    >
                      {alt}
                    </span>
                  ))}
                  <span className="text-faint">→</span>
                  <span className="rounded border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-accent">
                    {ui.projects.thisOne}
                  </span>
                </div>
              )}
              <p className="mt-2 text-sm text-muted">
                <span className="text-faint">{ui.projects.why} </span>
                {d.reason}
              </p>
              <p className="mt-1.5 text-xs text-amber-600/80 dark:text-amber-400/80">
                <span className="text-faint">{ui.projects.cost} </span>
                {d.tradeoff}
              </p>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}
