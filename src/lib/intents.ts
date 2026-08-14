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
    matches: ['принцип', 'принципы', 'как мыслит', 'мысл', 'подход', 'философи', 'principle', 'approach', 'engineering'],
    tools: [{ name: 'get_engineering_principles', args: {} }],
  },
  {
    id: 'stack',
    label: 'Stack fit',
    matches: ['ваканс', 'требовани', 'job', 'skills', 'скилл', 'стек', 'stack', 'подхожу', 'матчинг', 'requirements', 'coverage'],
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
  {
    id: 'articles',
    label: 'Articles',
    matches: ['стать', 'article', 'articles', 'blog', 'блог', 'writing', 'публикац', 'dev.to', 'писа'],
    tools: [{ name: 'get_articles', args: {} }],
  },
  {
    id: 'recent_work',
    label: 'Recent work',
    matches: ['недавн', 'последн', 'свеж', 'что сейчас', 'над чем', 'нового', 'recent', 'lately', 'коммит', 'commit', 'shipped', 'баг', 'bug', 'сложн', 'hardest', 'ошиб'],
    tools: [{ name: 'get_commit_history', args: {} }],
  },
  {
    id: 'antipatterns',
    label: 'Antipatterns',
    matches: ['антипаттерн', 'antipattern', 'музей', 'museum', 'mistake', 'урок', 'lesson', 'провал', 'факап', 'неудач'],
    tools: [{ name: 'get_antipatterns', args: {} }],
  },
  {
    id: 'experiments',
    label: 'Experiments',
    matches: ['эксперимент', 'experiment', 'гипотез', 'hypothes', 'замер', 'измер', 'measure', 'benchmark', 'лаборатор', 'lab', 'negative', 'отрицательн'],
    tools: [{ name: 'get_experiments', args: {} }],
  },
  {
    id: 'diary',
    label: 'Diary',
    matches: ['дневник', 'diary', 'инцидент', 'incident', 'сложн', 'hardest', 'отладк', 'debug', 'баг', 'bug', 'сломал', 'что сломалось', 'root cause'],
    tools: [{ name: 'get_diary', args: {} }],
  },
  {
    id: 'known_issues',
    label: 'Known issues',
    matches: ['known issue', 'известн', 'открыт', 'что сломано', 'что не работает', 'open', 'debt', 'долг', 'техдолг', 'бэклог', 'backlog'],
    tools: [{ name: 'get_known_issues', args: {} }],
  },
];

export const QUICK_QUESTIONS = [
  'What projects did you build?',
  'How does your MCP server work under load?',
  'What are your engineering principles?',
  'Do you fit a Python/MCP role?',
  'What has he shipped recently?',
  'What did your mistakes teach you?',
  'What experiments has he run?',
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
      const arr = Array.isArray(data) ? (data as Array<{ date: string; title: string }>) : [];
      const recent = arr.slice(-3).map((e) => `• ${e.date} — ${e.title}`).join('\n');
      return `Recent decisions:\n${recent}\n\nFull timeline is in the trace.`;
    }
    case 'articles': {
      const d = data as { count?: number; articles?: Array<{ title: string; readingTimeMinutes: number; url: string }> } | undefined;
      const list = (d?.articles ?? []).map((a) => `• ${a.title} (~${a.readingTimeMinutes} min) — ${a.url}`).join('\n');
      return `${d?.count ?? 0} articles on Dev.to:\n${list}`;
    }
    case 'recent_work': {
      const d = data as { count?: number; commits?: Array<{ repo: string; message: string; date: string }> } | undefined;
      const list = (d?.commits ?? []).slice(0, 5).map((c) => `• [${c.repo}] ${c.message} (${c.date.slice(0, 10)})`).join('\n');
      return `Recent commits (${d?.count ?? 0}):\n${list}`;
    }
    case 'antipatterns': {
      const d = data as { count?: number; antipatterns?: Array<{ title: string; lesson: string }> } | undefined;
      const list = (d?.antipatterns ?? []).map((a) => `• ${a.title} — ${a.lesson}`).join('\n');
      return `Antipattern museum (${d?.count ?? 0}):\n${list}`;
    }
    case 'experiments': {
      const d = data as { experiments?: Array<{ id: string; title: string; verdict: string; finding: string }>; negativeResults?: Array<{ attempt: string }> } | undefined;
      const list = (d?.experiments ?? []).map((e) => `• [${e.verdict}] ${e.title} — ${e.finding}`).join('\n');
      const neg = (d?.negativeResults ?? []).map((n) => `• ${n.attempt}`).join('\n');
      const tail = neg ? `\n\nDo not repeat:\n${neg}` : '';
      return `Experiments (${d?.experiments?.length ?? 0}):\n${list}${tail}`;
    }
    case 'diary': {
      const d = data as { entries?: Array<{ date: string; title: string; status: string; rootCause: string }> } | undefined;
      const list = (d?.entries ?? [])
        .slice(-5)
        .map((e) => `• [${e.status}] ${e.date} — ${e.title} (root cause: ${e.rootCause.slice(0, 90)})`)
        .join('\n');
      return `Diary (${d?.entries?.length ?? 0} entries, recent first):\n${list}`;
    }
    case 'known_issues': {
      const d = data as { issues?: Array<{ id: string; problem: string; status: string; temperature: string }> } | undefined;
      const list = (d?.issues ?? []).map((i) => `• ${i.id} [${i.status}] (${i.temperature}) — ${i.problem.slice(0, 110)}`).join('\n');
      return `Known issues (${d?.issues?.length ?? 0}):\n${list}`;
    }
    default:
      return JSON.stringify(results, null, 2);
  }
}
