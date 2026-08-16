import { useLang } from './LangContext';

/**
 * UI labels for the portfolio chrome (nav, section headers, lab page labels,
 * card chrome). Data content lives in per-language JSON files; this module
 * only covers the hardcoded UI strings.
 */

export const UI = {
  en: {
    // nav
    nav: {
      metrics: 'Metrics',
      projects: 'Projects',
      principles: 'Principles',
      blog: 'Blog',
      simulator: 'Simulator',
      agent: 'Agent',
      timeline: 'Timeline',
      lab: 'Lab',
      contact: 'Contact',
    },
    // hero
    hero: {
      badge1: 'MCP-Native Portfolio',
      badge2: 'Proof-of-Work Engine',
      badge3: 'Live metrics',
      title: 'Mikhail',
      titleAccent: 'AI / Backend Engineer',
      blurb:
        "I build MCP-native tooling and AI infrastructure. This portfolio is itself a system: a live dashboard, an MCP server any agent can query, and an interactive proof-of-work engine — no static claims, only process.",
      tryAgent: '▶ Try the agent loop',
      breakArch: 'Break the architecture',
      github: 'GitHub ↗',
    },
    // sections (main page)
    sections: {
      metrics: { kicker: '01 · live data', title: "Metrics that can't lie" },
      projects: { kicker: '02 · the work', title: 'Projects with decision logs' },
      principles: { kicker: '03 · how I think', title: 'Engineering principles, proven' },
      blog: { kicker: '04 · writing', title: 'Field notes from building AI agents' },
      simulator: { kicker: '05 · live system design', title: 'Break it. Watch it degrade.' },
      simulatorNote:
        'Interactive model with hand-tuned parameters — illustrative of the failure modes, not a production measurement.',
      agent: { kicker: '06 · proof of work', title: 'Ask the portfolio — watch the process' },
      agentNote1Title: "what you're seeing",
      agentNote1:
        'Every answer is produced by an agent loop that calls the same MCP tools the deployed server exposes — you watch the tool calls and raw results, not just the conclusion.',
      agentNote2Title: 'same tools, real MCP',
      agentNote2:
        'Point any MCP client at /mcp and you get get_projects, analyze_stack, simulate_architecture and more. Setup in server/README.md.',
      timeline: { kicker: '07 · the record', title: 'Engineering decision timeline' },
      contact: { kicker: '08 · the ask', title: "Let's talk" },
      contactBlurb:
        "If you're building AI infrastructure, agent tooling or MCP servers — I'd love to hear what you're working on.",
      contactLinkedin: "Let's talk on LinkedIn ↗",
      contactFork: 'Fork this portfolio ↗',
      antipatterns: { kicker: '09 · the museum', title: 'Antipattern museum — the mistakes that taught the most' },
    },
    // lab page
    lab: {
      badge1: 'The Laboratory',
      badge2: 'diaries · experiments · tests',
      badge3: 'real data, rendered from source',
      title: 'The evidence trail behind',
      titleAccent: 'this portfolio',
      blurb:
        'Every claim on the front page is backed by a logged experiment, a diary entry, a test, or a commit. This page is the machine-readable projection of those logs — the same data the MCP tools get_experiments, get_diary, get_known_issues and get_commit_history expose to agents.',
      metricExperiments: 'Experiments',
      metricExperimentsHint: 'lab-wide · hypothesis → verdict',
      metricDiary: 'Diary entries',
      metricDiaryHint: 'lab-wide · incidents, guards',
      metricIssues: 'Known issues',
      metricIssuesHint: 'lab-wide · open debt',
      metricTests: 'Tests',
      metricTestsHint: 'suites',
      allProjects: 'All projects',
      fullLab: 'full lab',
      showing: 'showing',
      // sections
      secDecisionLog: { kicker: '01 · decision logs', title: 'Architecture decisions, per project' },
      secDecisionLogNote:
        'From src/data/projects.json — the same single source of truth that feeds get_projects. Each entry: considered → chosen → why → what it cost.',
      secCommitLog: { kicker: '02 · commit log', title: 'What was shipped, per project' },
      secCommitLogNote:
        'From public/metrics.json — the hourly CI snapshot behind get_commit_history. Every project has its own commits here.',
      secExperiments: { kicker: '03 · experiments', title: 'Hypotheses, commands, verdicts' },
      secNegative: { kicker: '04 · do not repeat', title: 'Negative results' },
      secNegativeNote:
        'Approaches that were tried and failed — recorded so a future agent or the owner never re-runs them.',
      secDiary: { kicker: '05 · the diary', title: 'Incidents, root causes, guards' },
      secIssues: { kicker: '06 · known issues', title: 'Open debt, with temperature' },
      secNoLab: { kicker: '03 · lab logs', title: 'No lab pages for this project' },
      secNoLabNote:
        'The portfolio lab documents the build of this portfolio itself. Other projects keep their evidence in their own repositories — see their decision log (01) and commit history (02) above, or query get_commit_history for the live snapshot.',
      secTests: { kicker: '07 · tests', title: 'The suites behind the claims' },
      secDeps: { kicker: '08 · dependencies', title: 'Project × technology matrix' },
      secDepsNote:
        'The same single source of truth (src/data/projects.json) that feeds get_projects and analyze_stack.',
      secLoadCurves: { kicker: '09 · load curves', title: 'Watch latency degrade under load' },
      secLoadCurvesNote:
        'The same engine the simulate_architecture MCP tool exposes — real p50/p95 percentiles per load step, per project, per failure scenario.',
      // chrome labels
      verdictDistribution: 'Verdict distribution',
      status: 'Status',
      patterns: 'Patterns',
      experimentsCenter: 'experiments',
      entriesCenter: 'entries',
      verdicts: { confirmed: 'confirmed', refuted: 'refuted', partial: 'partial' },
      diaryStatus: { fixed: 'Fixed', partial: 'Partial' },
      considered: 'considered:',
      why: 'why:',
      cost: 'cost:',
      summary: 'hypothesis · command · raw result',
      fieldHypothesis: 'hypothesis',
      fieldCommand: 'command',
      fieldResult: 'raw result',
      finding: 'finding:',
      conclusion: 'conclusion:',
      related: 'related:',
      loading: 'loading commit snapshot…',
      noCommits: 'no commits in the snapshot for this project.',
      whyFailed: 'why it failed:',
      rootCause: 'root cause:',
      fix: 'fix:',
      guard: 'guard:',
      rootCauseSummary: 'root cause · fix · guard',
      deadline: 'deadline:',
      testsLabel: 'tests',
      evidenceScoreTitle: 'Evidence score — claims verified against the data',
      evidenceScoreSub: 'verify_claim · deterministic · KI-017',
      evidenceScoreNote:
        'The same tool the MCP server exposes: a claim is supported only when ≥2 significant words appear in one data record; otherwise it is refused rather than guessed.',
      supported: 'supported',
      refused: 'refused',
      claims: 'claims',
      total: 'Total',
      project: 'project',
    },
    // projects section
    projects: {
      decisionLog: 'Decision log',
      considered: 'considered',
      thisOne: 'this one',
      why: 'Why:',
      cost: 'What it cost:',
    },
    // principles section
    principles: {
      example: 'example',
      abTest: 'A/B · without this principle',
      evidence: 'evidence:',
    },
    // antipatterns section
    antipatterns: {
      mistake: 'the mistake:',
      whyBad: 'why it was bad:',
      fix: 'the fix:',
      lesson: 'lesson:',
    },
    // footer
    footer: {
      livingCv: 'built as a living CV',
      source: 'source ↗',
      github: 'github',
    },
  },

  ru: {
    nav: {
      metrics: 'Метрики',
      projects: 'Проекты',
      principles: 'Принципы',
      blog: 'Блог',
      simulator: 'Симулятор',
      agent: 'Агент',
      timeline: 'Таймлайн',
      lab: 'Лаборатория',
      contact: 'Контакты',
    },
    hero: {
      badge1: 'MCP-нативное портфолио',
      badge2: 'Proof-of-Work движок',
      badge3: 'Живые метрики',
      title: 'Михаил',
      titleAccent: 'AI / Backend инженер',
      blurb:
        'Я строю MCP-нативные инструменты и AI-инфраструктуру. Это портфолио — само по себе система: живой дашборд, MCP-сервер, к которому может обращаться любой агент, и интерактивный proof-of-work движок — никаких статичных заявлений, только процесс.',
      tryAgent: '▶ Попробовать агент',
      breakArch: 'Сломать архитектуру',
      github: 'GitHub ↗',
    },
    sections: {
      metrics: { kicker: '01 · живые данные', title: 'Метрики, которые не могут врать' },
      projects: { kicker: '02 · работа', title: 'Проекты с журналами решений' },
      principles: { kicker: '03 · как я мыслю', title: 'Инженерные принципы, доказанные' },
      blog: { kicker: '04 · заметки', title: 'Полевые заметки о создании AI-агентов' },
      simulator: { kicker: '05 · живой системный дизайн', title: 'Сломайте. Наблюдайте деградацию.' },
      simulatorNote:
        'Интерактивная модель с ручными параметрами — иллюстрирует режимы отказа, а не продакшн-замер.',
      agent: { kicker: '06 · proof of work', title: 'Спросите портфолио — наблюдайте процесс' },
      agentNote1Title: 'что вы видите',
      agentNote1:
        'Каждый ответ создаётся агентным циклом, вызывающим те же MCP-инструменты, что и развёрнутый сервер — вы видите вызовы инструментов и сырые результаты, а не только вывод.',
      agentNote2Title: 'те же инструменты, реальный MCP',
      agentNote2:
        'Наведите любой MCP-клиент на /mcp и получите get_projects, analyze_stack, simulate_architecture и другие. Настройка — в server/README.md.',
      timeline: { kicker: '07 · история', title: 'Таймлайн инженерных решений' },
      contact: { kicker: '08 · контакт', title: 'Давайте поговорим' },
      contactBlurb:
        'Если вы строите AI-инфраструктуру, агентные инструменты или MCP-серверы — буду рад узнать, над чем вы работаете.',
      contactLinkedin: 'Обсудить в LinkedIn ↗',
      contactFork: 'Форкнуть это портфолио ↗',
      antipatterns: { kicker: '09 · музей', title: 'Музей антипаттернов — ошибки, которые научили большему всего' },
    },
    lab: {
      badge1: 'Лаборатория',
      badge2: 'дневники · эксперименты · тесты',
      badge3: 'реальные данные из исходников',
      title: 'След доказательств за',
      titleAccent: 'этим портфолио',
      blurb:
        'Каждое заявление на главной странице подкреплено залогированным экспериментом, записью в дневнике, тестом или коммитом. Эта страница — машинно-читаемая проекция этих логов: те же данные, которые MCP-инструменты get_experiments, get_diary, get_known_issues и get_commit_history отдают агентам.',
      metricExperiments: 'Эксперименты',
      metricExperimentsHint: 'лаборатория · гипотеза → вердикт',
      metricDiary: 'Записи дневника',
      metricDiaryHint: 'лаборатория · инциденты, guards',
      metricIssues: 'Известные проблемы',
      metricIssuesHint: 'лаборатория · открытый долг',
      metricTests: 'Тесты',
      metricTestsHint: 'сьюты',
      allProjects: 'Все проекты',
      fullLab: 'вся лаборатория',
      showing: 'показать',
      secDecisionLog: { kicker: '01 · журналы решений', title: 'Архитектурные решения, по проектам' },
      secDecisionLogNote:
        'Из src/data/projects.json — того же единого источника, что питает get_projects. Каждая запись: рассмотрено → выбрано → почему → цена.',
      secCommitLog: { kicker: '02 · журнал коммитов', title: 'Что было выпущено, по проектам' },
      secCommitLogNote:
        'Из public/metrics.json — почасовой CI-снимок за get_commit_history. У каждого проекта здесь свои коммиты.',
      secExperiments: { kicker: '03 · эксперименты', title: 'Гипотезы, команды, вердикты' },
      secNegative: { kicker: '04 · не повторять', title: 'Отрицательные результаты' },
      secNegativeNote:
        'Подходы, которые были испробованы и провалились — записаны, чтобы будущий агент или владелец никогда не запускал их заново.',
      secDiary: { kicker: '05 · дневник', title: 'Инциденты, корневые причины, защиты' },
      secIssues: { kicker: '06 · известные проблемы', title: 'Открытый долг с температурой' },
      secNoLab: { kicker: '03 · lab-логи', title: 'Для этого проекта lab-страниц нет' },
      secNoLabNote:
        'Лаборатория портфолио документирует создание самого портфолио. Другие проекты хранят доказательства в своих репозиториях — смотрите журнал решений (01) и историю коммитов (02) выше или запросите get_commit_history для живого снимка.',
      secTests: { kicker: '07 · тесты', title: 'Сьюты за заявлениями' },
      secDeps: { kicker: '08 · зависимости', title: 'Матрица проект × технологии' },
      secDepsNote:
        'Тот же единый источник (src/data/projects.json), что питает get_projects и analyze_stack.',
      secLoadCurves: { kicker: '09 · нагрузочные кривые', title: 'Наблюдайте, как латентность деградирует под нагрузкой' },
      secLoadCurvesNote:
        'Тот же движок, что отдаёт MCP-инструмент simulate_architecture — реальные p50/p95 перцентили по шагам нагрузки, по проектам, по сценариям отказа.',
      verdictDistribution: 'Распределение вердиктов',
      status: 'Статус',
      patterns: 'Паттерны',
      experimentsCenter: 'эксперименты',
      entriesCenter: 'записи',
      verdicts: { confirmed: 'подтверждён', refuted: 'опровергнут', partial: 'частично' },
      diaryStatus: { fixed: 'Исправлено', partial: 'Частично' },
      considered: 'рассмотрено:',
      why: 'почему:',
      cost: 'цена:',
      summary: 'гипотеза · команда · сырой результат',
      fieldHypothesis: 'гипотеза',
      fieldCommand: 'команда',
      fieldResult: 'сырой результат',
      finding: 'вывод:',
      conclusion: 'заключение:',
      related: 'связано:',
      loading: 'загрузка снимка коммитов…',
      noCommits: 'в снимке нет коммитов для этого проекта.',
      whyFailed: 'почему провалилось:',
      rootCause: 'корневая причина:',
      fix: 'фикс:',
      guard: 'защита:',
      rootCauseSummary: 'корневая причина · фикс · защита',
      deadline: 'дедлайн:',
      testsLabel: 'тестов',
      evidenceScoreTitle: 'Оценка доказательств — заявления, проверенные по данным',
      evidenceScoreSub: 'verify_claim · детерминированный · KI-017',
      evidenceScoreNote:
        'Тот же инструмент, что отдаёт MCP-сервер: заявление поддержано, только если ≥2 значимых слова встречаются в одной записи данных; иначе — отказ, а не догадка.',
      supported: 'поддержано',
      refused: 'отклонено',
      claims: 'заявлений',
      total: 'Итого',
      project: 'проект',
    },
    projects: {
      decisionLog: 'Журнал решений',
      considered: 'рассмотрено',
      thisOne: 'выбрано это',
      why: 'Почему:',
      cost: 'Цена:',
    },
    principles: {
      example: 'пример',
      abTest: 'A/B · без этого принципа',
      evidence: 'доказательство:',
    },
    antipatterns: {
      mistake: 'ошибка:',
      whyBad: 'почему это было плохо:',
      fix: 'фикс:',
      lesson: 'урок:',
    },
    footer: {
      livingCv: 'создано как живое CV',
      source: 'исходники ↗',
      github: 'github',
    },
  },
};

export type UiDict = typeof UI.en;

/** Resolve the UI dictionary for the current language. */
export function useUi(): UiDict {
  const { lang } = useLang();
  return UI[lang];
}
