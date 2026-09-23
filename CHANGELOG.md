# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

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
