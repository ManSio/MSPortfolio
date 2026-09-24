/**
 * Build-time semantic HTML fallback for non-JS agents.
 *
 * The site is a client-rendered React SPA: the raw HTML ships an empty
 * <div id="root"></div>, so retrieval agents that do not execute JavaScript
 * (and the Agentis Lux scanner, which explicitly never runs JS) see no
 * content, no landmarks and no links.
 *
 * This module renders the SAME data that feeds the UI and the MCP server
 * (src/data/*.json — single source of truth) into semantic HTML that is
 * injected into #root at build time. React replaces it on mount, so the
 * human experience is unchanged; agents get a real, readable page.
 *
 * The markup is deliberately kept free of the patterns the scanner flags:
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

function readJson(rootDir: string, rel: string): any {
  return JSON.parse(readFileSync(join(rootDir, rel), 'utf8'));
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

export function buildAgentStaticHtml(rootDir: string): string {
  const projectsData = readJson(rootDir, 'src/data/projects.json');
  const principlesData = readJson(rootDir, 'src/data/principles.json');
  const timelineData = readJson(rootDir, 'src/data/timeline.json');
  const knownData = readJson(rootDir, 'src/data/lab/known-issues.json');

  const owner = projectsData.owner ?? 'ManSio';
  const profile = projectsData.profile ?? {};
  const projects: any[] = projectsData.projects ?? [];
  const principles: any[] = principlesData.principles ?? [];
  const events: any[] = timelineData.events ?? [];
  const issues: any[] = knownData.issues ?? [];

  const origin = 'https://mansio.github.io/MSPortfolio/';
  const mcp = 'https://msp-portfolio.mansio-dev.workers.dev';

  const projectsHtml = projects
    .map((p) => {
      const highlights = (p.highlights ?? [])
        .map((h: string) => `              <li>${esc(h)}</li>`)
        .join('\n');
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
      const link = e.link
        ? ` <a href="${esc(e.link)}"${EXTERNAL}>Repository for ${esc(e.title)}</a>`
        : '';
      return `          <li>
            <h3>${esc(e.title)}</h3>
            <p>${esc(e.date)} — ${esc(e.decision)}${link}</p>
          </li>`;
    })
    .join('\n');

  const issuesHtml = issues
    .map((i) => {
      const problem = String(i.problem ?? '').slice(0, 400);
      return `          <li>
            <p><strong>${esc(i.id)}</strong> (${esc(i.project)}) — ${esc(i.status)}, temperature: ${esc(i.temperature)}.</p>
            <p>${esc(problem)}</p>
          </li>`;
    })
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
            <li><a href="${mcp}/mcp"${EXTERNAL}>MCP server endpoint</a></li>
            <li><a href="${mcp}/openapi.json"${EXTERNAL}>OpenAPI description</a></li>
            <li><a href="${origin}llms.txt">llms.txt curated index</a></li>
            <li><a href="${origin}llms-full.txt">Full machine-readable content</a></li>
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
          <li><a href="${origin}">Live portfolio site</a></li>
        </ul>
      </footer>
    </div>`;
}
