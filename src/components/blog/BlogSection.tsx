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
  // tags may arrive as a comma-string from some mirrors — never trust the shape
  const tags = Array.isArray(a.tags) ? a.tags : [];
  // Cover image -> dev.to auto-generated social image -> generated gradient art
  const img = a.coverImage || a.socialImage || null;
  return (
    <a
      href={a.url}
      target="_blank"
      rel="noreferrer"
      className={`reveal group flex flex-col overflow-hidden rounded-xl border border-line bg-surface/60 transition-colors hover:border-accent/50 ${
        glassy ? 'glass' : ''
      }`}
    >
      {img ? (
        <div className="relative h-40 overflow-hidden">
          <img
            src={img}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        </div>
      ) : (
        <GeneratedArt title={a.title} id={a.id} />
      )}

      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap gap-1.5">
          {(tags.slice(0, 4)).map((t) => (
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

const PALETTES: Array<[string, string]> = [
  ['#0066ff', '#00d9ff'],
  ['#7c3aed', '#00d9ff'],
  ['#0ea5e9', '#6366f1'],
  ['#10b981', '#0066ff'],
  ['#f59e0b', '#ef4444'],
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** Deterministic per-article placeholder: gradient + initials, no external deps. */
function GeneratedArt({ title, id }: { title: string; id?: number }) {
  const words = title.replace(/[^a-zA-Zа-яА-Я0-9 ]/g, '').split(' ').filter(Boolean);
  const initials = ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase();
  const [c1, c2] = PALETTES[hashStr(title + String(id ?? '')) % PALETTES.length];
  return (
    <div
      className="relative flex h-40 items-center justify-center"
      style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
    >
      <span className="font-mono text-5xl font-bold tracking-wider text-white/85">{initials || '✎'}</span>
      <span
        className="absolute inset-0 opacity-20"
        style={{ background: 'radial-gradient(circle at 80% 20%, #fff 0%, transparent 55%)' }}
      />
    </div>
  );
}
