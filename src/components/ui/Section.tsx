import type { ReactNode } from 'react';

export function Section({
  id,
  kicker,
  title,
  children,
}: {
  id: string;
  kicker: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="mx-auto w-full max-w-5xl scroll-mt-24 px-5 py-16 sm:py-20">
      <div className="reveal">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">{kicker}</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  );
}
