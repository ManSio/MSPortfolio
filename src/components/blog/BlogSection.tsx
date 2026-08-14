import { useMetrics } from '../../hooks/useMetrics';
import type { DevToArticle } from '../../lib/types';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';

export function BlogSection() {
  const { status, snapshot } = useMetrics();
  const articles = snapshot?.devto ?? [];

  return (
    <div className="grid gap-5 md:grid-cols-2">
      {status === 'loading' && articles.length === 0
        ? [0, 1].map((i) => (
            <div key={i} className="rounded-xl border border-line bg-surface/60 p-5">
              <Skeleton className="h-40 w-full" />
              <Skeleton className="mt-3 h-5 w-3/4" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-1 h-4 w-2/3" />
            </div>
          ))
        : articles.map((a, i) => <ArticleCard key={a.url} article={a} glassy={i % 3 === 2} />)}
    </div>
  );
}

function ArticleCard({ article: a, glassy }: { article: DevToArticle; glassy?: boolean }) {
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className={`reveal group flex flex-col overflow-hidden rounded-xl border border-line bg-surface/60 transition-colors hover:border-accent/50 ${
        glassy ? 'glass' : ''
      }`}
    >
      {a.coverImage ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={a.coverImage}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-surface-2 to-surface font-mono text-4xl text-faint">
          &lt;post /&gt;
        </div>
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {(a.tags ?? []).slice(0, 4).map((t) => (
            <Badge key={t} tone="accent">
              #{t}
            </Badge>
          ))}
        </div>
        <h3 className="mt-3 text-base leading-snug font-bold transition-colors group-hover:text-accent">{a.title}</h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">{a.description}</p>
        <div className="mt-auto flex flex-wrap items-center gap-3 pt-4 text-xs text-faint">
          {a.readablePublishDate ? <span>{a.readablePublishDate}</span> : null}
          {a.readingTimeMinutes ? <span>~{a.readingTimeMinutes} min read</span> : null}
          {a.reactions ? <span>❤ {a.reactions}</span> : null}
          {a.comments ? <span>💬 {a.comments}</span> : null}
        </div>
      </div>
    </a>
  );
}
