# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- Agent-readiness round 2: the semantic fallback now also carries the lab data
  (50 experiments, 20 diary entries, 29 verifiable claims, test suites) and a
  generated `/index.md` Markdown mirror advertised via
  `rel="alternate" type="text/markdown"`. JSON-LD is now a `@graph` of
  `ProfilePage` + `Person`. Homepage raw HTML grows to ~58 kB (18 kB gzip).
- Build-time semantic HTML fallback for non-JS agents
  (`scripts/agent-static-html.ts` + a `transformIndexHtml` plugin in
  `vite.config.ts`): the SPA's empty `#root` is filled with a data-driven,
  semantic rendering (skip link, `header`/`nav`, a single `main`, a single `h1`,
  lists, real links with `rel`). React replaces it on mount, so the human UI is
  unchanged. Raises the Agentis Lux agent-readiness score from 84 to 100/100
  (zero findings).
- CI smoke guards for MCP data freshness (`.github/workflows/deploy.yml`):
  - the live `get_experiments` / `get_known_issues` counts are compared against
    the repo JSON, so a Worker lagging `origin/main` fails CI;
  - `get_articles` must be non-empty and the hourly metrics snapshot must be
    younger than 120 minutes, so a stopped metrics cron or an empty fallback
    fails CI.
- `docs/AGENT_DIARY.md`: a `P-###` pattern registry. The freshness-guard class
  is recorded as P-003 ("a guard that checks a field is present, not that the
  data is live").

### Fixed

- The smoke job passed on a healthy-but-stale endpoint: `get_articles` with
  `source:"unavailable", count:0` still matched the `count` grep, so a 6-week
  Worker lag went unnoticed.
