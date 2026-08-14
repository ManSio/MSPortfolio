import projectsData from '../../data/projects.json';
import type { Project, ProjectsData } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Card, CardHeader } from '../ui/Card';

const data = projectsData as ProjectsData;

export function ProjectsGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      {data.projects.map((p, i) => (
        <ProjectCard key={p.id} project={p} glassy={i % 3 === 2} />
      ))}
    </div>
  );
}

function ProjectCard({ project: p, glassy }: { project: Project; glassy?: boolean }) {
  return (
    <Card className={`reveal flex flex-col ${glassy ? 'glass' : ''}`}>
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
          Decision log ({p.decisionLog.length})
        </summary>
        <div className="mt-3 space-y-4">
          {p.decisionLog.map((d, i) => (
            <div key={i} className="rounded-lg border border-line bg-surface-2/40 p-3">
              <p className="text-sm font-semibold">{d.decision}</p>
              <p className="mt-1 text-xs text-faint">Alternatives: {d.alternatives.join(', ')}</p>
              <p className="mt-1.5 text-sm text-muted">{d.reason}</p>
              <p className="mt-1.5 text-xs text-amber-600/80 dark:text-amber-400/80">Trade-off: {d.tradeoff}</p>
            </div>
          ))}
        </div>
      </details>
    </Card>
  );
}
