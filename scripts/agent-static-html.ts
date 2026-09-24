/**
 * Build-time semantic HTML + Markdown fallback for non-JS agents.
 *
 * The site is a client-rendered React SPA: the raw HTML ships an empty
 * <div id="root"></div>, so retrieval agents that do not execute JavaScript
 * (and the Agentis Lux scanner, which explicitly never runs JS) see no
 * content, no landmarks and no links.
 *
 * This module renders the SAME data that feeds the UI and the MCP server
 * (src/data/*.json — single source of truth) into:
 *   1. semantic HTML injected into #root (React replaces it on mount), and
 *   2. a Markdown mirror (`index.md`) advertised via rel="alternate".
 *
 * The HTML is deliberately kept free of the patterns the scanner flags:
 * no form controls, no clickable div/span, no widget-like class names,
 * no placeholder hrefs, one <h1>, a skip link, and rel on external links.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const EXTERNAL = ' rel="noopener noreferrer"';

function esc(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function truncate(value: unknown, max: number): string {
  const s = String(value ?? '').trim();
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function readJson(rootDir: string, rel: string): any {
  return JSON.parse(readFileSync(join(rootDir, rel), 'utf8'));
}

function loadData(rootDir: string) {
  const projects = readJson(rootDir, 'src/data/projects.json');
  const principles = readJson(rootDir, 'src/data/principles.json');
  const timeline = readJson(rootDir, 'src/data/timeline.json');
  const known = readJson(rootDir, 'src/data/lab/known-issues.json');
  const experiments = readJson(rootDir, 'src/data/lab/experiments.json');
  const diary = readJson(rootDir, 'src/data/lab/diary.json');
  const evidence = readJson(rootDir, 'src/data/lab/evidence.json');
  const testSuites = readJson(rootDir, 'src/data/lab/test-suites.json');
  return { projects, principles, timeline, known, experiments, diary, evidence, testSuites };
}

export const AGENT_FALLBACK_CSS = `
.agent-fallback{background:#0a0a0a;color:#e5e7eb;min-height:100vh;padding:2rem 1.25rem;font-family:Inter,system-ui,sans-serif;line-height:1.6}
.agent-fallback a{color:#00d9ff}
.agent-fallback h1{font-size:1.6rem;margin:0 0 .5rem}
.agent-fallback h2{margin:1.5rem 0 .5rem;font-size:1.15rem}
.agent-fallback h3{margin:1rem 0 .25rem;font-size:1rem}
.agent-fallback ul{padding-left:1.1rem}
.agent-fallback header,.agent-fallback main,.agent-fallback footer{max-width:60rem;margin:0 auto}
.agent-fallback nav ul{display:flex;flex-wrap:wrap;gap:1rem;list-style:none;padding:0}
`.trim();

const ORIGIN = 'https://mansio.github.io/MSPortfolio/';
const MCP = 'https://msp-portfolio.mansio-dev.workers.dev';

export function buildAgentStaticHtml(rootDir: string): string {
  const { projects: projectsData, principles: principlesData, timeline: timelineData, known: knownData, experiments: experimentsData, diary: diaryData, evidence: evidenceData, testSuites: suitesData } =
    loadData(rootDir);

  const owner = projectsData.owner ?? 'ManSio';
  const profile = projectsData.profile ?? {};
  const projects: any[] = projectsData.projects ?? [];
  const principles: any[] = principlesData.principles ?? [];
  const events: any[] = timelineData.events ?? [];
  const issues: any[] = knownData.issues ?? [];
  const experiments: any[] = experimentsData.experiments ?? [];
  const diary: any[] = diaryData.entries ?? [];
  const claims: any[] = evidenceData.claims ?? [];
  const suites: any[] = suitesData.suites ?? [];

  const projectsHtml = projects
    .map((p) => {
      const highlights = (p.highlights ?? []).map((h: string) => `              <li>${esc(h)}</li>`).join('\n');
      return `          <li>
            <article>
              <h3>${esc(p.name)}</h3>
              <p>${esc(p.tagline)}. ${esc(p.description)}</p>
              <p>Language: ${esc(p.language)}. Stack: ${esc((p.stack ?? []).join(', '))}.</p>
              <ul>
${highlights}
              </ul>
              <p><a href="${esc(p.url)}"${EXTERNAL}>View ${esc(p.name)} on GitHub</a></p>
            </article>
          </li>`;
    })
    .join('\n');

  const principlesHtml = principles
    .map(
      (p) => `          <li>
            <article>
              <h3>${esc(p.title)}</h3>
              <p>${esc(p.statement)}</p>
              <p>Example: ${esc(p.example)}</p>
            </article>
          </li>`,
    )
    .join('\n');

  const timelineHtml = events
    .map((e) => {
      const link = e.link ? ` <a href="${esc(e.link)}"${EXTERNAL}>Repository for ${esc(e.title)}</a>` : '';
      return `          <li>
            <h3>${esc(e.title)}</h3>
            <p>${esc(e.date)} — ${esc(e.decision)}${link}</p>
          </li>`;
    })
    .join('\n');

  const issuesHtml = issues
    .map(
      (i) => `          <li>
            <p><strong>${esc(i.id)}</strong> (${esc(i.project)}) — ${esc(i.status)}, temperature: ${esc(i.temperature)}.</p>
            <p>${esc(truncate(i.problem, 400))}</p>
          </li>`,
    )
    .join('\n');

  const experimentsHtml = experiments
    .map(
      (x) => `          <li>
            <h3>${esc(x.title)}</h3>
            <p>${esc(x.date)} · ${esc(x.project)} · verdict: ${esc(x.verdict)}.</p>
            <p>${esc(truncate(x.finding ?? x.result, 280))}</p>
          </li>`,
    )
    .join('\n');

  const diaryHtml = diary
    .map(
      (d) => `          <li>
            <h3>${esc(d.title)}</h3>
            <p>${esc(d.date)} · ${esc(d.project)} · status: ${esc(d.status)}.</p>
            <p>${esc(truncate(d.rootCause, 280))}</p>
          </li>`,
    )
    .join('\n');

  const claimsHtml = claims
    .map((c) => `            <li>${esc(c.claim)} — ${esc(c.expected)}</li>`)
    .join('\n');

  const suitesHtml = suites
    .map((s) => `            <li>${esc(s.name)} — ${esc(s.tests)} tests (${esc(s.covers)})</li>`)
    .join('\n');

  return `<div class="agent-fallback">
      <a href="#main-content">Skip to main content</a>
      <header>
        <p>${esc(profile.name)} (${esc(owner)}) — ${esc(profile.role)}</p>
        <nav aria-label="Primary">
          <ul>
            <li><a href="#about">About</a></li>
            <li><a href="#projects">Projects</a></li>
            <li><a href="#principles">Engineering principles</a></li>
            <li><a href="#timeline">Timeline</a></li>
            <li><a href="#experiments">Experiments</a></li>
            <li><a href="#diary">Engineering diary</a></li>
            <li><a href="#claims">Verifiable claims</a></li>
            <li><a href="#tests">Test suites</a></li>
            <li><a href="#known-issues">Known issues</a></li>
            <li><a href="#for-agents">For AI agents</a></li>
            <li><a href="#connect">Connect</a></li>
          </ul>
        </nav>
      </header>
      <main id="main-content">
        <section id="about">
          <h1>${esc(profile.name)} (${esc(owner)}) — MCP-Native Engineering Portfolio</h1>
          <p>${esc(profile.summary)}</p>
          <p>Role: ${esc(profile.role)}. Location: ${esc(profile.location)}.</p>
        </section>
        <section id="projects">
          <h2>Projects</h2>
          <ul>
${projectsHtml}
          </ul>
        </section>
        <section id="principles">
          <h2>Engineering principles</h2>
          <ul>
${principlesHtml}
          </ul>
        </section>
        <section id="timeline">
          <h2>Engineering timeline</h2>
          <ul>
${timelineHtml}
          </ul>
        </section>
        <section id="experiments">
          <h2>Experiments</h2>
          <p>Every engineering experiment with its hypothesis, command and verdict (${experiments.length} total), documented in the open. The interactive lab is at <a href="#/lab">the lab page</a>.</p>
          <ul>
${experimentsHtml}
          </ul>
        </section>
        <section id="diary">
          <h2>Engineering diary</h2>
          <p>Incidents and hard bugs: symptom, root cause, fix and guard (${diary.length} entries).</p>
          <ul>
${diaryHtml}
          </ul>
        </section>
        <section id="claims">
          <h2>Verifiable claims</h2>
          <p>Claims about the owner that can be grounded against the portfolio data (${claims.length} checks).</p>
          <ul>
${claimsHtml}
          </ul>
        </section>
        <section id="tests">
          <h2>Test suites</h2>
          <ul>
${suitesHtml}
          </ul>
        </section>
        <section id="known-issues">
          <h2>Known issues</h2>
          <p>Open engineering debt, tracked in the open with status and temperature.</p>
          <ul>
${issuesHtml}
          </ul>
        </section>
        <section id="for-agents">
          <h2>For AI agents</h2>
          <p>This portfolio exposes its content as a production MCP server. Any agent can query the same data behind this page using the standard Streamable HTTP transport.</p>
          <ul>
            <li><a href="${MCP}/mcp"${EXTERNAL}>MCP server endpoint</a></li>
            <li><a href="${MCP}/openapi.json"${EXTERNAL}>OpenAPI description</a></li>
            <li><a href="${ORIGIN}llms.txt">llms.txt curated index</a></li>
            <li><a href="${ORIGIN}llms-full.txt">Full machine-readable content</a></li>
            <li><a href="${ORIGIN}index.md">Markdown mirror of this page</a></li>
            <li><a href="https://github.com/ManSio/MSPortfolio/blob/main/public/msp-portfolio.skill.md"${EXTERNAL}>Agent skill definition</a></li>
          </ul>
        </section>
      </main>
      <footer id="connect">
        <h2>Connect</h2>
        <ul>
          <li><a href="https://github.com/ManSio"${EXTERNAL}>GitHub profile of ${esc(owner)}</a></li>
          <li><a href="https://www.linkedin.com/in/ManSio"${EXTERNAL}>LinkedIn profile of ${esc(profile.name)}</a></li>
          <li><a href="https://dev.to/mansio"${EXTERNAL}>Dev.to articles by ${esc(owner)}</a></li>
          <li><a href="${ORIGIN}">Live portfolio site</a></li>
        </ul>
      </footer>
    </div>`;
}

/**
 * Markdown mirror of the same content, served at /index.md and advertised
 * from index.html via <link rel="alternate" type="text/markdown">.
 */
export function buildAgentMarkdown(rootDir: string): string {
  const { projects: pd, principles: prd, timeline: td, known: kd, experiments: ed, diary: dd, evidence: evd, testSuites: sd } = loadData(rootDir);

  const owner = pd.owner ?? 'ManSio';
  const profile = pd.profile ?? {};
  const out: string[] = [];

  out.push(`# ${profile.name} (${owner}) — MCP-Native Engineering Portfolio`);
  out.push('');
  out.push(`> ${profile.summary ?? ''}`);
  out.push('');
  out.push(`- Role: ${profile.role ?? ''}`);
  out.push(`- Location: ${profile.location ?? ''}`);
  out.push(`- GitHub: ${profile.contact?.github ?? 'https://github.com/ManSio'}`);
  out.push(`- LinkedIn: ${profile.contact?.linkedin ?? ''}`);
  out.push(`- Dev.to: https://dev.to/mansio`);
  out.push('');

  out.push('## For AI agents');
  out.push('');
  out.push(`- MCP endpoint (Streamable HTTP): ${MCP}/mcp`);
  out.push(`- OpenAPI: ${MCP}/openapi.json`);
  out.push(`- llms.txt: ${ORIGIN}llms.txt`);
  out.push(`- llms-full.txt: ${ORIGIN}llms-full.txt`);
  out.push('');

  out.push('## Projects');
  out.push('');
  for (const p of pd.projects ?? []) {
    out.push(`### ${p.name}`);
    out.push('');
    out.push(`${p.tagline}. ${p.description}`);
    out.push('');
    out.push(`- Language: ${p.language}`);
    out.push(`- Stack: ${(p.stack ?? []).join(', ')}`);
    out.push(`- Repository: ${p.url}`);
    for (const h of p.highlights ?? []) out.push(`- ${h}`);
    out.push('');
  }

  out.push('## Engineering principles');
  out.push('');
  for (const p of prd.principles ?? []) {
    out.push(`### ${p.title}`);
    out.push('');
    out.push(p.statement);
    out.push('');
    out.push(`Example: ${p.example}`);
    out.push('');
  }

  out.push('## Engineering timeline');
  out.push('');
  for (const e of td.events ?? []) {
    out.push(`- **${e.date}** — ${e.title}: ${e.decision}${e.link ? ` (${e.link})` : ''}`);
  }
  out.push('');

  out.push(`## Experiments (${(ed.experiments ?? []).length})`);
  out.push('');
  for (const x of ed.experiments ?? []) {
    out.push(`### ${x.title}`);
    out.push('');
    out.push(`- Date: ${x.date} · Project: ${x.project} · Verdict: ${x.verdict}`);
    out.push(`- Hypothesis: ${x.hypothesis}`);
    out.push(`- Finding: ${x.finding ?? x.result}`);
    out.push('');
  }

  out.push(`## Engineering diary (${(dd.entries ?? []).length})`);
  out.push('');
  for (const d of dd.entries ?? []) {
    out.push(`### ${d.title}`);
    out.push('');
    out.push(`- Date: ${d.date} · Project: ${d.project} · Status: ${d.status}`);
    out.push(`- Root cause: ${d.rootCause}`);
    out.push(`- Fix: ${d.fix}`);
    out.push(`- Guard: ${d.guard}`);
    out.push('');
  }

  out.push(`## Verifiable claims (${(evd.claims ?? []).length})`);
  out.push('');
  for (const c of evd.claims ?? []) out.push(`- ${c.claim} — ${c.expected}`);
  out.push('');

  out.push('## Test suites');
  out.push('');
  for (const s of sd.suites ?? []) out.push(`- ${s.name} — ${s.tests} tests (${s.covers})`);
  out.push('');

  out.push(`## Known issues (${(kd.issues ?? []).length})`);
  out.push('');
  for (const i of kd.issues ?? []) out.push(`- **${i.id}** (${i.project}) — ${i.status}, temperature: ${i.temperature}. ${i.problem}`);
  out.push('');

  return out.join('\n');
}
