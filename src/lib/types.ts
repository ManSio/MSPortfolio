// Shared types matching src/data/*.json

export interface Profile {
  name: string;
  role: string;
  location: string;
  summary: string;
  /** Public contact channels (D8). Only channels present in data are advertised. */
  contact?: ProfileContact;
}

/** Contact channels a recruiter/agent can use to reach the owner (D8 funnel). */
export interface ProfileContact {
  linkedin?: string;
  github?: string;
  email?: string;
  telegram?: string;
}

/** One actionable next step returned by get_profile (D8). */
export interface NextStep {
  type: 'contact' | 'view' | 'connect';
  label: string;
  hint: string;
  url?: string;
  command?: string;
}

export type GetProfileResult = Profile & { nextSteps: NextStep[] };

export interface DecisionLogEntry {
  decision: string;
  alternatives: string[];
  reason: string;
  tradeoff: string;
}

export interface Project {
  id: string;
  name: string;
  repo: string;
  url: string;
  language: string;
  stack: string[];
  stars: number;
  forks: number;
  tagline: string;
  description: string;
  highlights: string[];
  decisionLog: DecisionLogEntry[];
  metrics: { type: string };
}

export interface ProjectsData {
  owner: string;
  profile: Profile;
  projects: Project[];
}

export interface Principle {
  id: string;
  title: string;
  statement: string;
  example: string;
  abTest: string;
  evidence: string;
}

export interface PrinciplesData {
  principles: Principle[];
}

export interface TimelineEvent {
  date: string;
  title: string;
  decision: string;
  link?: string;
}

export interface TimelineData {
  events: TimelineEvent[];
}

// ── Live metrics (from GitHub/npm/Dev.to APIs or static fallback) ──

export interface DevToArticle {
  id?: number;
  title: string;
  description?: string;
  readingTimeMinutes?: number;
  url: string;
  tags?: string[];
  reactions?: number;
  comments?: number;
  coverImage?: string | null;
  socialImage?: string | null;
  readablePublishDate?: string;
}

export interface GithubRepoMetric {
  name: string;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  language: string | null;
}

export interface CommitEntry {
  repo: string;
  sha: string;
  date: string;
  message: string;
  author: string;
}

export interface MetricsSnapshot {
  fetchedAt: string;
  source: 'live' | 'fallback';
  user: {
    login: string;
    publicRepos: number;
    followers: number;
    following: number;
  } | null;
  repos: GithubRepoMetric[];
  npm: { package: string; downloads: number }[];
  devto: DevToArticle[];
  /** Recent commit history per repo (powers get_commit_history). */
  commits: CommitEntry[];
}

// ── MCP tools ──

export interface ToolAnnotations {
  /** Tool does not modify state — safe to expose to agents without confirmation. */
  readOnlyHint?: boolean;
  /** Tool may have destructive side effects. */
  destructiveHint?: boolean;
  /** Tool is safe to retry — repeated calls produce the same result. */
  idempotentHint?: boolean;
  /** Tool may interact with the outside world (network, external systems). */
  openWorldHint?: boolean;
}

export interface MCPTool {
  name: string;
  description: string;
  /** JSON Schema (draft 2020-12) describing tool input. */
  inputSchema: Record<string, unknown>;
  /** Machine-readable behavior hints (MCP spec 2026-07-28: `annotations`). */
  annotations?: ToolAnnotations;
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export interface StackMatch {
  skill: string;
  matched: boolean;
  evidence: string;
}

export interface StackAnalysis {
  requiredSkills: string[];
  matched: StackMatch[];
  coverage: number; // 0..1
  verdict: string;
}

export interface SimPoint {
  load: number; // x baseline
  p50: number; // ms
  p95: number; // ms
  throughput: number; // req/s
  bottleneck: string;
}

export interface SimScenario {
  id: string;
  label: string;
  description: string;
}

export interface SimulationResult {
  projectId: string;
  scenario: string;
  scenarioLabel: string;
  points: SimPoint[];
  findings: string[];
  /** Failure-mode events per load (circuit open, fallback, retry storm...). */
  events: SimEvent[];
  recommendation: string;
}

export interface SimEvent {
  load: number;
  type: string;
  detail: string;
}

export interface Antipattern {
  id: string;
  title: string;
  mistake: string;
  whyBad: string;
  fix: string;
  lesson: string;
  tag: string;
}

// ── Lab page: diaries, experiments, known issues, test suites ──

export type ExperimentVerdict = 'confirmed' | 'refuted' | 'partial';

export type LabChartType = 'bar' | 'donut' | 'line' | 'stacked';

export interface LabBarDatum {
  label: string;
  value: number;
  sub?: string;
  color?: string;
}

export interface LabDonutSegment {
  label: string;
  value: number;
  color: string;
}

export interface LabLineSeries {
  label: string;
  color: string;
  points: { x: number; y: number }[];
}

/** Per-experiment chart data (rendered by the Lab page from the same JSON). */
export interface LabChart {
  type: LabChartType;
  title: string;
  xLabel?: string;
  yLabel?: string;
  data: LabBarDatum[] | LabDonutSegment[] | LabLineSeries[];
}

export interface Experiment {
  id: string;
  date: string;
  project?: string;
  title: string;
  hypothesis: string;
  command: string;
  result: string;
  verdict: ExperimentVerdict;
  finding: string;
  /** One or more charts summarizing the measured numbers. */
  chart?: LabChart | LabChart[];
  /** One-line takeaway, used by the lab page and agents. */
  conclusion?: string;
  /** Ids of experiments this one is related to (shared dataset / control / follow-up). */
  links?: string[];
}

export interface NegativeResult {
  attempt: string;
  whyFailed: string;
  date: string;
  ref: string;
}

export interface ExperimentsData {
  experiments: Experiment[];
  negativeResults: NegativeResult[];
}

export type DiaryStatus = 'fixed' | 'partial';

export interface DiaryEntry {
  date: string;
  project?: string;
  title: string;
  status: DiaryStatus;
  rootCause: string;
  fix: string;
  guard: string;
  pattern: string;
}

export interface DiaryData {
  entries: DiaryEntry[];
}

export type IssueTemperature = 'stable' | 'watching';

export interface KnownIssue {
  id: string;
  project?: string;
  problem: string;
  status: string;
  temperature: IssueTemperature;
  deadline: string | null;
  owner: string;
  link: string;
}

export interface KnownIssuesData {
  issues: KnownIssue[];
}

export interface TestSuite {
  file: string;
  name: string;
  tests: number;
  covers: string;
  updatedAt: string;
}

export interface TestSuitesData {
  suites: TestSuite[];
  total: number;
  updatedAt: string;
}

// ── Evidence verification (verify_claim — Evidence Score v1) ──

export interface EvidenceRecord {
  kind: string;
  source: string;
  title: string;
  matchedTokens: string[];
}

export interface VerifyClaimResult {
  claim: string;
  tokens: string[];
  supported: boolean;
  evidenceCount: number;
  evidence: EvidenceRecord[];
  note?: string;
}
