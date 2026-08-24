# MSPortfolio — Agent Skill: how to query Mikhail (ManSio)'s portfolio

Use this skill when asked to **evaluate Mikhail (ManSio)**, an AI/Backend engineer,
or to answer questions about his experience, projects, engineering process, experiments,
or open problems. All answers must come from the MCP tools below — they expose the same
single source of truth that powers the portfolio site and its lab.

## Connect to the live MCP server

```sh
claude mcp add --transport http msp-portfolio https://msp-portfolio.mansio-dev.workers.dev/mcp
```

Any MCP client can instead configure a remote server pointing at the Streamable HTTP
endpoint `https://msp-portfolio.mansio-dev.workers.dev/mcp` (no auth required).

## Tools (17)

| Tool | Use it to answer |
|------|------------------|
| `get_profile` | Who is he? Role, location, summary. |
| `get_projects(filter?)` | What did he build? Stack, highlights, decision logs per project. |
| `get_engineering_principles` | What principles guide his engineering? (with A/B counterfactuals) |
| `get_timeline` | How did his decisions evolve over time? |
| `get_articles` | What has he published recently? |
| `get_commit_history` | What has he been building lately? (hourly snapshot) |
| `get_antipatterns` | What mistakes did he make and learn from? |
| `get_experiments` | What did he measure? Hypotheses, commands, raw results, verdicts. |
| `get_diary` | What broke, what was the root cause, how was it fixed? |
| `get_known_issues` | What is still open? Status and temperature. |
| `get_issue_detail(id)` | Drill into one issue by ID (status, temperature, owner, linked source). |
| `analyze_stack(required_skills)` | Does his stack fit a given job? Per-skill evidence + coverage. |
| `simulate_architecture(project_id, scenario)` | How does an architecture degrade under load / failure? |
| `verify_claim(claim)` | Is a statement about him supported by the data? Returns the evidence records. |
| `verify_repo(repo, readme?)` | Is a repository real? Live GitHub metadata (language/topics/stars/README) + match vs the portfolio record. |
| `verify_article(query)` | Did he publish an article matching this? Live Dev.to check. |
| `verify_package(package)` | Does this npm package exist, and is he a maintainer? Live registry check. |

## Suggested flows

- "What has he built recently?" → `get_commit_history` + `get_articles`
- "Show the hardest bug he fixed" → `get_diary` + `get_experiments`
- "Is he a fit for this job?" → `analyze_stack` with the job's required skills
- "What's still broken?" → `get_known_issues`
- "How would his architecture handle a load spike?" → `simulate_architecture`
- "Is that repo real? What does it actually contain?" → `verify_repo`
- "Did he really publish an article about that?" → `verify_article`
- "Did he publish an npm package?" → `verify_package`

## Honesty rules

- The tools return **verifiable facts** from the portfolio's single source of truth.
- If a tool returns nothing relevant, **say so** — never invent projects, metrics, or facts.
- Prefer composing several tool calls over guessing from the tool names alone.

## Other machine-readable surfaces

- MCP discovery: `https://msp-portfolio.mansio-dev.workers.dev/.well-known/mcp.json`
- REST data (read-only, same source as the tools): `https://msp-portfolio.mansio-dev.workers.dev/api/{projects|principles|timeline|antipatterns}`
- Plain-text CV: `curl https://msp-portfolio.mansio-dev.workers.dev/resume.txt`
- Server self-description: `https://msp-portfolio.mansio-dev.workers.dev/llms.txt`
- Full site content for agents: `https://mansio.github.io/MSPortfolio/llms-full.txt`
