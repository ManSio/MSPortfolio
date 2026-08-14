import { useEffect, useRef, useState } from 'react';
import { composeAnswer, matchIntent, QUICK_QUESTIONS, type Intent } from '../../lib/intents';
import { callLocalTool, callMcpTool, probeMcpEndpoint, type McpMode } from '../../lib/mcp-client';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LiveDot } from '../metrics/MetricCard';

type Frame =
  | { kind: 'user'; text: string }
  | { kind: 'think'; text: string }
  | { kind: 'tool'; name: string; args: Record<string, unknown> }
  | { kind: 'result'; text: string }
  | { kind: 'answer'; text: string };

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function buildFrames(question: string, intent: Intent): Frame[] {
  const frames: Frame[] = [{ kind: 'user', text: question }];
  frames.push({ kind: 'think', text: `Intent matched: "${intent.label}"` });
  for (const call of intent.tools) {
    frames.push({ kind: 'tool', name: call.name, args: call.args });
  }
  frames.push({ kind: 'think', text: 'Composing evidence-based answer from tool results…' });
  frames.push({ kind: 'answer', text: '…' }); // placeholder, filled after execution
  return frames;
}

export function AgentChat() {
  const [mode, setMode] = useState<McpMode | 'probing'>('probing');
  const [frames, setFrames] = useState<Frame[]>([
    {
      kind: 'think',
      text: 'Agent loop ready. This demo runs the exact MCP tools the server exposes — pick a question or type your own.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    probeMcpEndpoint().then((m) => setMode(m));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [frames]);

  async function run(question: string) {
    if (busy) return;
    setBusy(true);
    setInput('');
    const intent = matchIntent(question);
    const draft = buildFrames(question, intent);
    const visible = draft.filter((f) => f.kind !== 'answer');
    setFrames((prev) => [...prev, ...visible]);

    const toolCalls = intent.tools;
    const results: unknown[] = [];

    for (const call of toolCalls) {
      await sleep(450);
      setFrames((prev) => [...prev, { kind: 'think', text: `Executing ${call.name}…` }]);
      await sleep(550);

      let result: unknown;
      try {
        result = mode === 'live' ? await callMcpTool(call.name, call.args, results.length + 2) : await callLocalTool(call.name, call.args);
      } catch (e) {
        result = { error: e instanceof Error ? e.message : String(e) };
      }
      results.push(result);
      setFrames((prev) => [...prev, { kind: 'result', text: JSON.stringify(result, null, 2).slice(0, 2000) }]);
      await sleep(350);
    }

    const answer = composeAnswer(intent, results);
    setFrames((prev) => [...prev, { kind: 'answer', text: answer }]);
    setBusy(false);
  }

  return (
    <Card className="flex h-[560px] flex-col p-0">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="font-mono text-sm font-semibold">agent-loop</span>
        </div>
        <div className="flex items-center gap-2">
          {mode === 'probing' ? <Badge>probing…</Badge> : mode === 'live' ? <Badge tone="success">LIVE MCP endpoint</Badge> : <Badge tone="warn">local engine (no server)</Badge>}
          <Badge tone="accent">Streamable HTTP</Badge>
        </div>
      </div>

      <div ref={scrollRef} className="trace-scroll flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
        {frames.map((f, i) => {
          if (f.kind === 'user') {
            return (
              <div key={i} className="flex justify-end">
                <div className="max-w-[85%] rounded-lg bg-primary/15 px-3 py-1.5 text-paper">{f.text}</div>
              </div>
            );
          }
          if (f.kind === 'think') {
            return (
              <div key={i} className="flex items-center gap-2 text-faint">
                <span className="text-accent">▸</span> <span>{f.text}</span>
                <span className="inline-block h-3.5 w-2 animate-blink bg-paper/40" />
              </div>
            );
          }
          if (f.kind === 'tool') {
            return (
              <div key={i} className="rounded-lg border border-accent/30 bg-accent/5 px-3 py-2">
                <span className="text-accent">$ tool</span>{' '}
                <span className="font-semibold text-paper">{f.name}</span>{' '}
                <span className="text-faint">{JSON.stringify(f.args)}</span>
              </div>
            );
          }
          if (f.kind === 'result') {
            return (
              <div key={i} className="max-h-56 overflow-auto rounded-lg border border-line bg-surface-2/60 px-3 py-2 text-muted whitespace-pre">
                <span className="text-emerald-600 dark:text-emerald-400">result:</span> {f.text}
              </div>
            );
          }
          return (
            <div key={i} className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 whitespace-pre-wrap">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">answer</span>
              <p className="mt-1 text-paper">{f.text}</p>
            </div>
          );
        })}
        {busy ? (
          <div className="flex items-center gap-2 text-faint">
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-accent" />
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-accent [animation-delay:200ms]" />
            <span className="inline-block h-2 w-2 animate-pulse-dot rounded-full bg-accent [animation-delay:400ms]" />
          </div>
        ) : null}
      </div>

      <div className="border-t border-line p-3">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              disabled={busy}
              onClick={() => void run(q)}
              className="rounded-full border border-line px-3 py-1 text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (input.trim()) void run(input.trim());
          }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask in EN or RU… e.g. «Как устроен поиск в mscodebase?»"
            disabled={busy}
            className="flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2 text-sm text-paper placeholder:text-faint focus:border-accent/60 focus:outline-none disabled:opacity-40"
          />
          <Button variant="accent" type="submit" disabled={busy}>
            Run
          </Button>
        </form>
      </div>
    </Card>
  );
}
