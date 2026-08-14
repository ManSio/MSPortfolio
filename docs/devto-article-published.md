# I turned my portfolio into an MCP server (and I'm not a programmer)

*Опубликованная версия на dev.to (2026-08-14), синхронизированная с 12 тулами.
Оригинал: https://dev.to/mansio/i-turned-my-portfolio-into-an-mcp-server-and-im-not-a-programmer-4h0a*

---

My background is civil engineering. I don't write code — I direct AI agents to write it while I handle architecture, decisions, and QA.

So when I built my portfolio, I didn't want it to look like everyone else's. I wanted it to _do_ something no one else's does.

Here's what I built: a portfolio that answers questions from AI agents directly. Not a chatbot. Not a demo. A real server that any AI — Claude, GPT, anything — can connect to and interrogate.

```
claude mcp add --transport http msp-portfolio \
  https://msp-portfolio.mansio-dev.workers.dev/mcp
```

Ask it _"what has Mikhail built?"_ or _"does his stack match this job description?"_ and it answers with live data — not a frozen PDF from six months ago.

## The problem I was solving

Every portfolio makes the same silent promise: "trust that this is still true."

It's a snapshot. The moment you close the editor, it starts going stale. And there's no way for anyone — human or AI recruiter — to verify what's actually there.

I wanted the opposite. A portfolio that doesn't just display claims, but answers questions about them. If the evidence for a skill isn't there, it says so instead of bluffing.

## What I actually built

The site has three parts that share the same brain:

**1. The website** — what you see when you open it in a browser. Interactive, dark-themed, with a simulator you can break.

**2. A server for AI agents** — the same data, but in a format any AI can query directly. This is the MCP part.

**3. A local version** — for development and testing from the command line.

The unusual thing: all three read from exactly the same source. No copy-pasting, no "API version" vs "website version." One place, three doors.

## The twelve tools

Think of these as questions the AI can ask my portfolio:

| Question | Tool |
| --- | --- |
| Who is Mikhail? | `get_profile` |
| What has he built? | `get_projects` |
| What has he been working on lately? | `get_commit_history` |
| What are his engineering principles? | `get_engineering_principles` |
| What has he written recently? | `get_articles` |
| What mistakes has he made? | `get_antipatterns` |
| What experiments has he run? | `get_experiments` |
| What broke and how did he fix it? | `get_diary` |
| What's still open on his plate? | `get_known_issues` |
| How does his stack match this job? | `analyze_stack` |
| What decisions did he make and when? | `get_timeline` |
| What happens to his architecture under load? | `simulate_architecture` |

The one recruiters use most: `analyze_stack`. You paste a job description, it returns a per-skill breakdown with actual evidence — not "I know Kubernetes" but "used in project X, decision log here."

The one I'm most proud of: `get_antipatterns`. It's a museum of real mistakes I made while building this — a forked repo I accidentally claimed as mine, a feature that worked in local tests and silently broke in production, a counter that looked like it was writing data and wasn't. Honest lessons, not a polished highlight reel.

## The simulator

The portfolio has a live architecture simulator. You pick one of my real projects, pick a failure scenario — kill a node, freeze the cache, overload the AI — and watch the performance numbers change in real time.

It's not a video. It's not a screenshot. It runs the actual model.

At 20× load on the search architecture: p95 latency goes from ~10ms to 239ms under a load spike, 401ms if a node dies. When it crosses a threshold, a chip appears: `circuit_open`, `fallback_engaged`, `degraded_mode`. This is what I mean when I say "I understand distributed systems" — you can verify it yourself.

## What broke (the honest part)

**The package that doesn't exist.** I spent time trying to install `@fastify/mcp`. It doesn't exist. The real name is `@modelcontextprotocol/fastify`. Simple mistake, cost an hour.

**The function that worked locally and did nothing in production.** I had a counter that tracked how many times the MCP server was queried. It passed all tests. In production, the counter never wrote anything. Reason: in Cloudflare Workers, code that runs after you send a response gets cancelled immediately. My counter was running after the response. Fix: one line — `ctx.waitUntil(task)`. The lesson is that local Node.js and Cloudflare Workers have different rules about what happens after a request ends.

**The rate limiter that reported success but did nothing.** I set up a rate limit on the free plan. Every call returned `success: true`. Enforcement simply wasn't active at that tier. I only caught it by deliberately triggering it with a burst test. Configuration saying "yes" and the system actually enforcing it are two different things.

**The hourly commit that silently moved the code forward without me.** The CI runs every hour to refresh metrics. Each run makes a commit. If I pushed without fetching first, I'd be pushing on top of a diverged history. Now I always `git fetch` first. Not a disaster, just a thing you learn once.

## One thing I didn't expect

The agent loop — where you can type a question and watch the AI call tools step by step, live, in the browser — turned out to be the most interesting part to watch.

You see it think. It calls `get_profile`, reads the result, decides it needs more, calls `analyze_stack`, compares, then answers. The whole chain is visible. It's not a black box with an answer at the end. It's a process you can audit.

I didn't plan that as a feature. It came from trying to debug the demo and realizing the debug view was more interesting than the final answer.

## Try it

- **Portfolio:** mansio.github.io/MSPortfolio
- **Source:** github.com/ManSio/MSPortfolio
- **Add to Claude:**

```
claude mcp add --transport http msp-portfolio \
  https://msp-portfolio.mansio-dev.workers.dev/mcp
```

Then ask it: _"what did your mistakes teach you?"_

If you build something like this, drop a comment. I'd genuinely like to see it.
