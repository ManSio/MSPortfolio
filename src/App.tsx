import { ArchitectureSimulator } from './components/playground/ArchitectureSimulator';
import { AgentChat } from './components/mcp/AgentChat';
import { ClaimVerifier } from './components/mcp/ClaimVerifier';
import { McpStatsCard } from './components/mcp/McpStatsCard';
import { OnboardingBlock } from './components/mcp/OnboardingBlock';
import { AntipatternsGrid } from './components/antipatterns/AntipatternsGrid';
import { BlogSection } from './components/blog/BlogSection';
import { GithubStats } from './components/metrics/GithubStats';
import { ExternalWidgets } from './components/metrics/ExternalWidgets';
import { BenchmarksPanel } from './components/metrics/BenchmarksPanel';
import { ProjectsGrid } from './components/projects/ProjectsGrid';
import { PrinciplesGrid } from './components/projects/PrinciplesGrid';
import { Timeline } from './components/timeline/Timeline';
import { LabPage } from './components/lab/LabPage';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Section } from './components/ui/Section';
import { useReveal } from './hooks/useReveal';
import { useTheme } from './hooks/useTheme';
import { useLang } from './i18n/LangContext';
import { useUi } from './i18n/ui';
import { useEffect, useState } from 'react';

const NAV_IDS = ['metrics', 'projects', 'principles', 'blog', 'simulator', 'agent', 'timeline', 'lab', 'contact'] as const;

/** Hash routing: `#/lab` renders the Lab page, everything else is the one-page portfolio. */
function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return hash;
}

function navHref(id: string) {
  return id === 'lab' ? '#/lab' : `#${id}`;
}

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="inline-flex min-h-10 items-center rounded-lg border border-line px-2.5 text-sm transition-colors hover:border-accent/60"
    >
      {dark ? '☀' : '☾'}
    </button>
  );
}

function LangToggle() {
  const { lang, setLang } = useLang();
  return (
    <button
      onClick={() => setLang(lang === 'en' ? 'ru' : 'en')}
      aria-label="Switch language / Сменить язык"
      className="inline-flex min-h-10 items-center rounded-lg border border-line px-2.5 text-sm transition-colors hover:border-accent/60"
      title={lang === 'en' ? 'По-русски' : 'In English'}
    >
      {lang === 'en' ? 'RU' : 'EN'}
    </button>
  );
}

export default function App() {
  const revealRef = useReveal<HTMLDivElement>();
  const { dark, toggle } = useTheme();
  const hash = useHashRoute();
  const isLab = hash === '#/lab';
  const ui = useUi();

  return (
    <div ref={revealRef} className="min-h-screen">
      {/* Decorative gradient blobs — blurred by the .glass surfaces */}
      <div className="ambient-blobs" aria-hidden="true">
        <span />
      </div>
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href="#top" className="font-mono text-sm font-bold tracking-tight">
            <span className="text-accent">~/</span>mikhail
          </a>
          <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
            {NAV_IDS.map((id) => (
              <a key={id} href={navHref(id)} className="transition-colors hover:text-accent">
                {ui.nav[id]}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <a
              href="https://github.com/ManSio"
              target="_blank"
              rel="noreferrer"
              className="text-sm text-muted transition-colors hover:text-accent"
            >
              GitHub ↗
            </a>
            <ThemeToggle dark={dark} toggle={toggle} />
            <LangToggle />
          </div>
        </div>
      </header>

      <main id="top">
        {isLab ? (
          <LabPage />
        ) : (
          <>
            {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-10 sm:pt-24">
          <div className="reveal">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">{ui.hero.badge1}</Badge>
              <Badge>{ui.hero.badge2}</Badge>
              <Badge tone="success">{ui.hero.badge3}</Badge>
            </div>
            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
              {ui.hero.title} —{' '}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                {ui.hero.titleAccent}
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">{ui.hero.blurb}</p>
            <div className="glass mt-7 flex flex-wrap gap-3 rounded-xl p-2">
              <a href="#agent">
                <Button variant="accent">{ui.hero.tryAgent}</Button>
              </a>
              <a href="#simulator">
                <Button variant="secondary">{ui.hero.breakArch}</Button>
              </a>
              <a href="https://github.com/ManSio" target="_blank" rel="noreferrer">
                <Button variant="outline">{ui.hero.github}</Button>
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-faint">
              connect:{' '}
              <span className="text-accent">claude mcp add --transport http msp-portfolio https://msp-portfolio.mansio-dev.workers.dev/mcp</span>
            </p>
          </div>
        </section>

        {/* ── Metrics ────────────────────────────────────────── */}
        <Section id="metrics" kicker={ui.sections.metrics.kicker} title={ui.sections.metrics.title}>
          <GithubStats />
          <div className="mt-4">
            <ExternalWidgets />
          </div>
          <div className="mt-4">
            <BenchmarksPanel />
          </div>
        </Section>

        {/* ── Projects ───────────────────────────────────────── */}
        <Section id="projects" kicker={ui.sections.projects.kicker} title={ui.sections.projects.title}>
          <ProjectsGrid />
        </Section>

        {/* ── Principles ─────────────────────────────────────── */}
        <Section id="principles" kicker={ui.sections.principles.kicker} title={ui.sections.principles.title}>
          <PrinciplesGrid />
        </Section>

        {/* ── Blog ───────────────────────────────────────────── */}
        <Section id="blog" kicker={ui.sections.blog.kicker} title={ui.sections.blog.title}>
          <BlogSection />
        </Section>

        {/* ── Simulator ──────────────────────────────────────── */}
        <Section id="simulator" kicker={ui.sections.simulator.kicker} title={ui.sections.simulator.title}>
          <p className="-mt-4 mb-5 font-mono text-xs text-faint">
            {ui.sections.simulatorNote}
          </p>
          <ArchitectureSimulator />
        </Section>

        {/* ── Agent ──────────────────────────────────────────── */}
        <Section id="agent" kicker={ui.sections.agent.kicker} title={ui.sections.agent.title}>
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <AgentChat />
            <div className="space-y-3">
              <Card>
                <p className="font-mono text-xs text-accent">{ui.sections.agentNote1Title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{ui.sections.agentNote1}</p>
              </Card>
              <Card>
                <p className="font-mono text-xs text-accent">{ui.sections.agentNote2Title}</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">{ui.sections.agentNote2}</p>
              </Card>
              <McpStatsCard />
              <ClaimVerifier />
            </div>
          </div>
          <OnboardingBlock />
        </Section>

        {/* ── Timeline ───────────────────────────────────────── */}
        <Section id="timeline" kicker={ui.sections.timeline.kicker} title={ui.sections.timeline.title}>
          <Timeline />
        </Section>

        {/* ── Contact ────────────────────────────────────────── */}
        <Section id="contact" kicker={ui.sections.contact.kicker} title={ui.sections.contact.title}>
          <div className="reveal glass mx-auto max-w-2xl rounded-xl p-8 text-center">
            <p className="leading-relaxed text-muted">{ui.sections.contactBlurb}</p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <a href="https://www.linkedin.com/in/ManSio" target="_blank" rel="noreferrer">
                <Button variant="accent">{ui.sections.contactLinkedin}</Button>
              </a>
              <a href="https://github.com/ManSio/MSPortfolio" target="_blank" rel="noreferrer">
                <Button variant="outline">{ui.sections.contactFork}</Button>
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-faint">
              or query the portfolio directly:{' '}
              <span className="text-accent">claude mcp add --transport http msp-portfolio https://msp-portfolio.mansio-dev.workers.dev/mcp</span>
            </p>
          </div>
        </Section>

        {/* ── Antipatterns ──────────────────────────────── */}
        <Section id="antipatterns" kicker={ui.sections.antipatterns.kicker} title={ui.sections.antipatterns.title}>
          <AntipatternsGrid />
        </Section>
          </>
        )}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-faint">
          <p>
            © {new Date().getFullYear()} Mikhail · {ui.footer.livingCv}
          </p>
          <p className="font-mono text-xs">
            <a href="https://github.com/ManSio/MSPortfolio" target="_blank" rel="noreferrer" className="hover:text-accent">
              {ui.footer.source}
            </a>
            <span className="mx-2">·</span>
            <a href="https://github.com/ManSio" target="_blank" rel="noreferrer" className="hover:text-accent">
              {ui.footer.github}
            </a>
            <span className="mx-2">·</span>
            <img
              src="https://github.com/ManSio/MSPortfolio/actions/workflows/deploy.yml/badge.svg"
              alt="CI status"
              className="inline h-4 align-middle opacity-70 hover:opacity-100"
            />
          </p>
        </div>
      </footer>
    </div>
  );
}
