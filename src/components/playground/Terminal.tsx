import { useEffect, useRef, useState } from 'react';
import { callLocalTool, TOOLS } from '../../lib/mcp-client';
import { Card } from '../ui/Card';

interface Line {
  kind: 'cmd' | 'out' | 'err' | 'info';
  text: string;
}

const ALIASES: Record<string, string> = {
  about: 'get_profile',
  projects: 'get_projects',
  stack: 'analyze_stack',
  principles: 'get_engineering_principles',
  timeline: 'get_timeline',
  articles: 'get_articles',
  recent: 'get_commit_history',
  bugs: 'get_antipatterns',
  simulate: 'simulate_architecture',
};

const HELP = [
  'help                        — this list',
  'about                       — get_profile',
  'projects [python|mcp|aws]   — get_projects',
  'stack <skills...>           — analyze_stack',
  'principles                  — get_engineering_principles',
  'timeline                    — get_timeline',
  'articles                    — get_articles',
  'recent                      — get_commit_history',
  'bugs                        — get_antipatterns',
  'simulate <proj> <scenario>  — simulate_architecture',
  'man <tool>                  — tool description',
  'clear                       — clear screen',
];

function fmt(value: unknown): string {
  if (typeof value === 'string') return value;
  return JSON.stringify(value, null, 2);
}

/**
 * Terminal-style surface for the same MCP tools — every command executes the
 * exact tool logic the deployed server exposes (local engine, no network).
 */
export function Terminal() {
  const [lines, setLines] = useState<Line[]>([
    { kind: 'info', text: 'MSPortfolio shell — every command runs the same MCP tools the server exposes. Type help.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines]);

  async function run(raw: string) {
    const cmd = raw.trim();
    if (!cmd || busy) return;
    const push = (l: Line) => setLines((prev) => [...prev, l]);
    push({ kind: 'cmd', text: `$ ${cmd}` });
    setInput('');

    if (cmd === 'clear') {
      setLines((prev) => prev.filter((l) => l.kind === 'info'));
      return;
    }
    if (cmd === 'help') {
      push({ kind: 'out', text: HELP.join('\n') });
      return;
    }
    if (cmd.startsWith('man ')) {
      const name = cmd.slice(4).trim();
      const tool = TOOLS.find((t) => t.name === name);
      push(tool ? { kind: 'out', text: `${tool.name}\n${tool.description}` } : { kind: 'err', text: `unknown tool: ${name}` });
      return;
    }

    const [name, ...rest] = cmd.split(/\s+/);
    let args: Record<string, unknown> = {};
    if (name === 'projects') args = rest[0] ? { filter: rest[0] } : {};
    if (name === 'stack') args = { required_skills: rest };
    if (name === 'simulate') args = { project_id: rest[0] ?? 'mscodebase-intelligence', scenario: rest[1] ?? 'load_spike' };

    const real = ALIASES[name] ?? name;
    setBusy(true);
    try {
      const result = await callLocalTool(real, args);
      push({ kind: 'out', text: fmt(result) });
    } catch (e) {
      push({ kind: 'err', text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="p-4">
      <p className="font-mono text-xs text-accent">~/portfolio $</p>
      <div
        ref={scrollRef}
        className="trace-scroll mt-2 h-80 overflow-y-auto rounded-lg border border-line bg-surface-2/60 p-3 font-mono text-xs leading-relaxed"
      >
        {lines.map((l, i) => (
          <pre
            key={i}
            className={`whitespace-pre-wrap ${
              l.kind === 'cmd' ? 'text-paper' : l.kind === 'err' ? 'text-red-400' : l.kind === 'info' ? 'text-faint' : 'text-muted'
            }`}
          >
            {l.text}
          </pre>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="font-mono text-xs text-accent">$</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void run(input);
          }}
          placeholder="type a command… (help)"
          disabled={busy}
          className="min-h-9 flex-1 rounded-lg border border-line bg-surface-2 px-3 font-mono text-xs text-paper placeholder:text-faint focus:border-accent/60 focus:outline-none"
        />
      </div>
    </Card>
  );
}
