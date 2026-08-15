import { useState } from 'react';
import { Badge } from '../ui/Badge';

/**
 * D7 — Onboarding block «connect in 30 seconds».
 *
 * Content task: one copy-paste command, the MCP Inspector entry point, and three
 * example questions grounded in real tools. No engine changes — the command and
 * endpoint are the same ones /resume.txt and the hero advertise (SSOT).
 */

const MCP_ENDPOINT = 'https://msp-portfolio.mansio-dev.workers.dev/mcp';
const CONNECT_COMMAND = `claude mcp add --transport http msp-portfolio ${MCP_ENDPOINT}`;

const EXAMPLE_QUESTIONS = [
  {
    tool: 'analyze_stack',
    question: 'Match this job description: Python, MCP, LanceDB, RAG',
  },
  {
    tool: 'verify_claim',
    question: 'Is "built an MCP server for codebase intelligence" supported by the data?',
  },
  {
    tool: 'get_known_issues',
    question: 'What is still broken? Show the known-issues board.',
  },
] as const;

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback for non-secure contexts (plain http / older browsers).
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      onClick={() => void copy()}
      aria-label="Copy the connect command"
      className="shrink-0 cursor-pointer rounded-lg border border-line bg-surface-2 px-2.5 py-1 font-mono text-xs text-muted transition-colors hover:border-accent/60 hover:text-accent"
    >
      {copied ? 'copied ✓' : 'copy'}
    </button>
  );
}

export function OnboardingBlock() {
  return (
    <div className="reveal mt-5 rounded-xl border border-line bg-surface/70 p-5 backdrop-blur-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs tracking-widest text-accent uppercase">set up — connect in 30 seconds</p>
        <Badge>Streamable HTTP · no auth</Badge>
      </div>

      <div className="mt-3 flex items-center gap-2 overflow-x-auto rounded-lg border border-line bg-ink/40 px-3 py-2.5">
        <code className="min-w-0 flex-1 whitespace-nowrap font-mono text-xs text-paper">{CONNECT_COMMAND}</code>
        <CopyButton text={CONNECT_COMMAND} />
      </div>

      <p className="mt-2 text-xs leading-relaxed text-faint">
        Or open it in the{' '}
        <a
          href="https://github.com/modelcontextprotocol/inspector"
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          MCP Inspector
        </a>{' '}
        (<span className="font-mono">npx @modelcontextprotocol/inspector</span>) and point it at{' '}
        <span className="font-mono">{MCP_ENDPOINT}</span>.
      </p>

      <div className="mt-4">
        <p className="font-mono text-xs text-faint">try asking the server</p>
        <ul className="mt-2 space-y-1.5">
          {EXAMPLE_QUESTIONS.map((e) => (
            <li key={e.tool} className="flex flex-wrap items-baseline gap-2 rounded-lg border border-line bg-surface-2/60 px-3 py-2">
              <Badge tone="accent">{e.tool}</Badge>
              <span className="font-mono text-xs text-paper">{e.question}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
