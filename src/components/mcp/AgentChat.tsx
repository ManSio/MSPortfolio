import { useEffect, useRef, useState } from 'react';
import { composeAnswer, matchIntent, QUICK_QUESTIONS, type Intent } from '../../lib/intents';
import { computeChatEvidence, evidenceLabel } from '../../lib/evidence';
import {
  callChat,
  callLocalTool,
  callMcpTool,
  probeChat,
  probeMcpEndpoint,
  type McpMode,
} from '../../lib/mcp-client';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { LiveDot } from '../metrics/MetricCard';

type Frame =
  | { kind: 'user'; text: string }
  | { kind: 'think'; text: string }
  | { kind: 'tool'; name: string; args: Record<string, unknown> }
  | { kind: 'result'; text: string }
  | { kind: 'evidence'; text: string }
  | { kind: 'answer'; text: string }
  | { kind: 'error'; text: string };

type ChatMode = 'llm' | 'rules';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const KEY_STORAGE = 'msp:openrouter-key';

// localStorage can throw in private mode / when storage is blocked — never crash on it.
function safeGet(key: string): string {
  try {
    return localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function safeSet(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // storage unavailable — the chat works in BYOK-session mode for this load only
  }
}

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
  const [chatMode, setChatMode] = useState<ChatMode>('rules');
  const [chatConfigured, setChatConfigured] = useState(false);
  const [userKey, setUserKey] = useState<string>(() => safeGet(KEY_STORAGE));
  const [frames, setFrames] = useState<Frame[]>([
    {
      kind: 'think',
      text: 'Agent loop ready. This demo runs the exact MCP tools the server exposes — pick a question or type your own.',
    },
  ]);
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const historyRef = useRef<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    Promise.all([probeMcpEndpoint(), probeChat()]).then(([mcpMode, chat]) => {
      setMode(mcpMode);
      setChatConfigured(chat.configured);
      setChatMode(chat.configured || userKey ? 'llm' : 'rules');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [frames]);

  async function runRules(question: string) {
    const intent = matchIntent(question);
    const draft = buildFrames(question, intent);
    const visible = draft.filter((f) => f.kind !== 'answer');
    setFrames((prev) => [...prev, ...visible]);

    const results: unknown[] = [];
    for (const call of intent.tools) {
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
    const grounded = results.filter((r) => !(r && typeof r === 'object' && 'error' in (r as Record<string, unknown>))).length;
    setFrames((prev) => [
      ...prev,
      { kind: 'evidence', text: evidenceLabel({ toolCalls: results.length, grounded, failed: results.length - grounded, ungrounded: results.length === 0 }) },
    ]);
    return answer;
  }

  async function runLlm(question: string) {
    historyRef.current.push({ role: 'user', content: question });
    setFrames((prev) => [...prev, { kind: 'user', text: question }]);

    const apiKey = userKey || ''; // empty → server key is used by the worker
    const res = await callChat(historyRef.current, apiKey);

    for (const step of res.steps) {
      await sleep(300);
      if (step.type === 'tool_call') {
        setFrames((prev) => [
          ...prev,
          { kind: 'think', text: `LLM decided to call ${step.name}(${JSON.stringify(step.args ?? {})})` },
          { kind: 'tool', name: step.name, args: (step.args ?? {}) as Record<string, unknown> },
        ]);
      } else {
        await sleep(500);
        setFrames((prev) => [...prev, { kind: 'result', text: JSON.stringify(step.result, null, 2).slice(0, 2000) }]);
      }
    }
    await sleep(300);
    setFrames((prev) => [...prev, { kind: 'answer', text: res.answer }]);
    setFrames((prev) => [...prev, { kind: 'evidence', text: evidenceLabel(res.evidence ?? computeChatEvidence(res.steps)) }]);
    historyRef.current.push({ role: 'assistant', content: res.answer });
    return res.answer;
  }

  async function run(question: string) {
    if (busy) return;
    setBusy(true);
    setInput('');
    try {
      if (chatMode === 'llm') {
        try {
          await runLlm(question);
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          setFrames((prev) => [
            ...prev,
            { kind: 'error', text: `LLM call failed (${msg}). Falling back to the rule-based engine…` },
          ]);
          await sleep(400);
          await runRules(question);
        }
      } else {
        await runRules(question);
      }
    } finally {
      setBusy(false);
    }
  }

  function setAndStoreKey(v: string) {
    setUserKey(v);
    safeSet(KEY_STORAGE, v.trim());
    setChatMode(v.trim() ? 'llm' : chatConfigured ? 'llm' : 'rules');
  }

  return (
    <div className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-line bg-surface/70 backdrop-blur-sm">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <LiveDot />
          <span className="font-mono text-sm font-semibold">agent-loop</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {mode === 'probing' ? <Badge>probing…</Badge> : mode === 'live' ? <Badge tone="success">LIVE MCP endpoint</Badge> : <Badge tone="warn">local engine (no server)</Badge>}
          {chatMode === 'llm' ? <Badge tone="accent">LLM · grounded</Badge> : <Badge>rule-based</Badge>}
        </div>
      </div>

      <div ref={scrollRef} className="trace-scroll min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 font-mono text-[13px] leading-relaxed">
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
          if (f.kind === 'error') {
            return (
              <div key={i} className="rounded-lg border border-red-500/30 bg-red-500/5 px-3 py-2 text-red-600 dark:text-red-400 whitespace-pre-wrap">
                {f.text}
              </div>
            );
          }
          if (f.kind === 'evidence') {
            return (
              <div key={i} className="rounded-lg border border-sky-500/25 bg-sky-500/5 px-3 py-1.5 text-xs text-sky-600 dark:text-sky-400">
                {f.text}
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

      <div className="shrink-0 border-t border-line p-3">
        {chatMode === 'llm' && !chatConfigured && (
          <div className="mb-2 flex items-center gap-2">
            <input
              value={userKey}
              onChange={(e) => setAndStoreKey(e.target.value)}
              type="password"
              placeholder="OpenRouter key (free models) — stored in your browser only"
              className="flex-1 rounded-lg border border-line bg-surface-2 px-2.5 py-1.5 font-mono text-xs text-paper placeholder:text-faint focus:border-accent/60 focus:outline-none"
            />
          </div>
        )}
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              disabled={busy}
              onClick={() => void run(q)}
              className="inline-flex min-h-11 items-center rounded-full border border-line px-3 text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent disabled:opacity-40"
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
            className="min-h-11 flex-1 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-paper placeholder:text-faint focus:border-accent/60 focus:outline-none disabled:opacity-40"
          />
          <Button variant="accent" type="submit" disabled={busy}>
            Run
          </Button>
        </form>
      </div>
    </div>
  );
}
