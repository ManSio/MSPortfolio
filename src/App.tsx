import { ArchitectureSimulator } from './components/playground/ArchitectureSimulator';
import { AgentChat } from './components/mcp/AgentChat';
import { BlogSection } from './components/blog/BlogSection';
import { GithubStats } from './components/metrics/GithubStats';
import { ExternalWidgets } from './components/metrics/ExternalWidgets';
import { ProjectsGrid } from './components/projects/ProjectsGrid';
import { PrinciplesGrid } from './components/projects/PrinciplesGrid';
import { Timeline } from './components/timeline/Timeline';
import { Badge } from './components/ui/Badge';
import { Button } from './components/ui/Button';
import { Card } from './components/ui/Card';
import { Section } from './components/ui/Section';
import { useReveal } from './hooks/useReveal';
import { useTheme } from './hooks/useTheme';

const NAV = [
  ['metrics', 'Metrics'],
  ['projects', 'Projects'],
  ['principles', 'Principles'],
  ['blog', 'Blog'],
  ['simulator', 'Simulator'],
  ['agent', 'Agent'],
  ['timeline', 'Timeline'],
] as const;

function ThemeToggle({ dark, toggle }: { dark: boolean; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="rounded-lg border border-line px-2.5 py-1.5 text-sm transition-colors hover:border-accent/60"
    >
      {dark ? '☀' : '☾'}
    </button>
  );
}

export default function App() {
  const revealRef = useReveal<HTMLDivElement>();
  const { dark, toggle } = useTheme();

  return (
    <div ref={revealRef} className="min-h-screen">
      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-line bg-ink/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <a href="#top" className="font-mono text-sm font-bold tracking-tight">
            <span className="text-accent">~/</span>mikhail
          </a>
          <nav className="hidden items-center gap-5 text-sm text-muted md:flex">
            {NAV.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="transition-colors hover:text-accent">
                {label}
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
          </div>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ───────────────────────────────────────────── */}
        <section className="mx-auto max-w-5xl px-5 pt-16 pb-10 sm:pt-24">
          <div className="reveal">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="accent">MCP-Native Portfolio</Badge>
              <Badge>Proof-of-Work Engine</Badge>
              <Badge tone="success">Live metrics</Badge>
            </div>
            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight sm:text-6xl">
              Mikhail —{' '}
              <span className="bg-gradient-to-r from-accent to-primary bg-clip-text text-transparent">
                AI / Backend Engineer
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
              I build <span className="text-paper">MCP-native tooling</span> and AI infrastructure. This portfolio is
              itself a system: a <span className="text-accent">live dashboard</span>, an{' '}
              <span className="text-accent">MCP server</span> any agent can query, and an interactive{' '}
              <span className="text-accent">proof-of-work engine</span> — no static claims, only process.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#agent">
                <Button variant="accent">▶ Try the agent loop</Button>
              </a>
              <a href="#simulator">
                <Button variant="secondary">Break the architecture</Button>
              </a>
              <a href="https://github.com/ManSio" target="_blank" rel="noreferrer">
                <Button variant="outline">GitHub ↗</Button>
              </a>
            </div>
            <p className="mt-6 font-mono text-xs text-faint">
              connect:{' '}
              <span className="text-accent">claude mcp add --transport http msp-portfolio https://msp-portfolio.mansio-dev.workers.dev/mcp</span>
            </p>
          </div>
        </section>

        {/* ── Metrics ────────────────────────────────────────── */}
        <Section id="metrics" kicker="01 · live data" title="Metrics that can't lie">
          <GithubStats />
          <div className="mt-4">
            <ExternalWidgets />
          </div>
        </Section>

        {/* ── Projects ───────────────────────────────────────── */}
        <Section id="projects" kicker="02 · the work" title="Projects with decision logs">
          <ProjectsGrid />
        </Section>

        {/* ── Principles ─────────────────────────────────────── */}
        <Section id="principles" kicker="03 · how I think" title="Engineering principles, proven">
          <PrinciplesGrid />
        </Section>

        {/* ── Blog ───────────────────────────────────────────── */}
        <Section id="blog" kicker="04 · writing" title="Field notes from building AI agents">
          <BlogSection />
        </Section>

        {/* ── Simulator ──────────────────────────────────────── */}
        <Section id="simulator" kicker="05 · live system design" title="Break it. Watch it degrade.">
          <ArchitectureSimulator />
        </Section>

        {/* ── Agent ──────────────────────────────────────────── */}
        <Section id="agent" kicker="06 · proof of work" title="Ask the portfolio — watch the process">
          <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
            <AgentChat />
            <div className="space-y-3">
              <Card>
                <p className="font-mono text-xs text-accent">what you're seeing</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Every answer is produced by an <span className="text-paper">agent loop</span> that calls the same
                  MCP tools the deployed server exposes — you watch the{' '}
                  <span className="text-paper">tool calls and raw results</span>, not just the conclusion.
                </p>
              </Card>
              <Card>
                <p className="font-mono text-xs text-accent">same tools, real MCP</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Point any MCP client at <span className="font-mono">/mcp</span> and you get{' '}
                  <span className="text-paper">get_projects, analyze_stack, simulate_architecture</span> and more.
                  Setup in <span className="text-accent">server/README.md</span>.
                </p>
              </Card>
            </div>
          </div>
        </Section>

        {/* ── Timeline ───────────────────────────────────────── */}
        <Section id="timeline" kicker="07 · the record" title="Engineering decision timeline">
          <Timeline />
        </Section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-6 text-sm text-faint">
          <p>
            © {new Date().getFullYear()} Mikhail · built as a <span className="text-accent">living CV</span>
          </p>
          <p className="font-mono text-xs">
            <a href="https://github.com/ManSio/MSPortfolio" target="_blank" rel="noreferrer" className="hover:text-accent">
              source ↗
            </a>
            <span className="mx-2">·</span>
            <a href="https://github.com/ManSio" target="_blank" rel="noreferrer" className="hover:text-accent">
              github
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
