import timelineData from '../../data/timeline.json';

export function Timeline() {
  const events = [...timelineData.events].reverse();
  return (
    <ol className="relative border-l border-line pl-6">
      {events.map((ev) => (
        <li key={ev.date + ev.title} className="reveal relative pb-8 last:pb-0">
          <span className="absolute top-1.5 -left-[29px] h-3 w-3 rounded-full border-2 border-accent bg-ink" />
          <p className="font-mono text-xs text-accent">{ev.date}</p>
          <h3 className="mt-0.5 font-semibold">
            {ev.link ? (
              <a href={ev.link} target="_blank" rel="noreferrer" className="hover:text-accent">
                {ev.title}
              </a>
            ) : (
              ev.title
            )}
          </h3>
          <p className="mt-1 text-sm leading-relaxed text-paper/60">{ev.decision}</p>
        </li>
      ))}
    </ol>
  );
}
