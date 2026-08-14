// Shared types matching src/data/*.json

export interface Profile {
  name: string;
  role: string;
  location: string;
  summary: string;
}

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
  recommendation: string;
}
