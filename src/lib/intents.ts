// Rule-based intent engine for the browser agent demo.
// Maps a visitor's natural-language question (RU/EN) to a sequence of MCP
// tool calls — the same tools the deployed MCP server exposes.

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
}

export interface Intent {
  id: string;
  label: string;
  matches: string[];
  tools: ToolCall[];
}

const n = (v: string) => v.toLowerCase();

export const INTENTS: Intent[] = [
  {
    id: 'profile',
    label: 'About',
    matches: ['кто ты', 'кто вы', 'профиль', 'о себе', 'about', 'who are you', 'summary', 'биография'],
    tools: [{ name: 'get_profile', args: {} }],
  },
  {
    id: 'projects',
    label: 'Projects',
    matches: ['проект', 'что делал', 'опыт', 'project', 'projects', 'portfolio', 'работы', 'кейс'],
    tools: [{ name: 'get_projects', args: {} }],
  },
  {
    id: 'projects_python',
    label: 'Python projects',
    matches: ['python', 'питон', 'пайтон'],
    tools: [{ name: 'get_projects', args: { filter: 'python' } }],
  },
  {
    id: 'projects_mcp',
    label: 'MCP projects',
    matches: ['mcp', 'мкп', 'протокол', 'модель контекста'],
    tools: [{ name: 'get_projects', args: { filter: 'mcp' } }],
  },
  {
    id: 'projects_aws',
    label: 'AWS projects',
    matches: ['aws', 'амазон', 'облако', 'инфраструктур'],
    tools: [{ name: 'get_projects', args: { filter: 'aws' } }],
  },
  {
    id: 'principles',
    label: 'Principles',
    matches: ['принцип', 'принципы', 'как мыслит', 'подход', 'философи', 'principle', 'approach', 'engineering'],
    tools: [{ name: 'get_engineering_principles', args: {} }],
  },
  {
    id: 'stack',
    label: 'Stack fit',
    matches: ['вакансия', 'требовани', 'job', 'skills', 'скилл', 'стек', 'подхожу', 'матчинг', 'requirements', 'coverage'],
    tools: [{ name: 'analyze_stack', args: { required_skills: ['python', 'mcp', 'typescript', 'react', 'aws'] } }],
  },
  {
    id: 'architecture',
    label: 'Architecture',
    matches: ['архитектур', 'как устроен', 'architecture', 'simulate', 'симуляц', 'нагрузк', 'масштабируем'],
    tools: [{ name: 'simulate_architecture', args: { project_id: 'mscodebase-intelligence', scenario: 'load_spike' } }],
  },
  {
    id: 'timeline',
    label: 'History',
    matches: ['история', 'таймлайн', 'timeline', 'решения', 'decisions', 'хронологи'],
    tools: [{ name: 'get_timeline', args: {} }],
  },
];

export const QUICK_QUESTIONS = [
  'What projects did you build?',
  'How does your MCP server work under load?',
  'What are your engineering principles?',
  'Do you fit a Python/MCP role?',
];

export function matchIntent(text: string): Intent {
  const q = n(text);
  // Specific filters first (python/mcp/aws) so "python projects" doesn't fall to generic projects
  const specific = INTENTS.filter((i) => ['projects_python', 'projects_mcp', 'projects_aws'].includes(i.id));
  for (const intent of specific) {
    if (intent.matches.some((m) => q.includes(n(m)))) return intent;
  }
  for (const intent of INTENTS) {
    if (intent.matches.some((m) => q.includes(n(m)))) return intent;
  }
  return INTENTS.find((i) => i.id === 'projects')!;
}

// Human-readable answers composed from tool results — the "agent's" summary.
export function composeAnswer(intent: Intent, results: unknown[]): string {
  const data = results[0] as Record<string, unknown> | undefined;

  switch (intent.id) {
    case 'profile': {
      const p = data as { name?: string; role?: string; summary?: string } | undefined;
      return `${p?.name ?? 'Mikhail'} — ${p?.role ?? 'AI / Backend Engineer'}. ${p?.summary ?? ''}`;
    }
    case 'projects': {
      const d = data as { count?: number; projects?: Array<{ name: string; tagline: string }> } | undefined;
      const list = (d?.projects ?? []).map((p) => `• ${p.name} — ${p.tagline}`).join('\n');
      return `${d?.count ?? 0} projects:\n${list}`;
    }
    case 'projects_python':
    case 'projects_mcp':
    case 'projects_aws': {
      const d = data as { projects?: Array<{ name: string }> } | undefined;
      const names = (d?.projects ?? []).map((p) => p.name);
      return names.length
        ? `Found ${names.length} matching project${names.length > 1 ? 's' : ''}: ${names.join(', ')}. Ask for details to see decision logs.`
        : 'No project matches this filter yet — the full list is in get_projects().';
    }
    case 'principles': {
      const d = data as { count?: number } | undefined;
      return `I live by ${d?.count ?? 0} principles — fail-closed by default, async-first I/O, single write path, measure-don\u2019t-assume, self-healing, agent-agnostic surfaces. Each one has a real code example and an A/B counterfactual in the trace above.`;
    }
    case 'stack': {
      const d = data as { coverage?: number; verdict?: string; matched?: Array<{ skill: string; matched: boolean }> } | undefined;
      const pct = Math.round((d?.coverage ?? 0) * 100);
      const hits = (d?.matched ?? []).filter((m) => m.matched).map((m) => m.skill);
      return `Stack coverage: ${pct}% (matched: ${hits.join(', ') || 'none'}). ${d?.verdict ?? ''}`;
    }
    case 'architecture': {
      const d = data as { points?: Array<{ load: number; p95: number; bottleneck: string }>; findings?: string[]; recommendation?: string } | undefined;
      const last = d?.points?.[d.points.length - 1];
      return [
        `Simulated ${'load spike'} for mscodebase-intelligence.`,
        last ? `At ${last.load}x load, p95 = ${last.p95.toFixed(0)}ms, bottleneck: ${last.bottleneck}.` : '',
        d?.findings?.[0] ?? '',
        `Recommendation: ${d?.recommendation ?? ''}`,
      ]
        .filter(Boolean)
        .join('\n');
    }
    case 'timeline': {
      const d = data as Array<{ date: string; title: string }> | undefined;
      const recent = (d ?? []).slice(-3).map((e) => `• ${e.date} — ${e.title}`).join('\n');
      return `Recent decisions:\n${recent}\n\nFull timeline is in the trace.`;
    }
    default:
      return JSON.stringify(results, null, 2);
  }
}
