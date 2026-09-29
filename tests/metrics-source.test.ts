import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { classifySnapshot, isNoiseCommit, selectPublishedRepos } from '../scripts/metrics-source';
import { isLiveCall, displayedSource, resolveSource } from '../src/hooks/useMetrics';
import { FreshnessBadge, LiveDot } from '../src/components/metrics/MetricCard';
import type { MetricsSnapshot } from '../src/lib/types';

/**
 * KI-021: public/metrics.json used to ship a hardcoded `source: 'fallback'`
 * while holding live data. The field is the only signal an agent gets about
 * how much of a snapshot is real, so every state is pinned here — including
 * the negative cases, otherwise a classifier that always answers 'live' would
 * pass the happy-path test.
 */
describe('classifySnapshot — metrics source flag (KI-021)', () => {
  const cases = [
    { name: 'every source answered', status: { github: true, devto: true, commitsOk: 12, commitsTotal: 12 }, expected: 'live' },
    { name: 'Dev.to down, commits complete', status: { github: true, devto: false, commitsOk: 12, commitsTotal: 12 }, expected: 'partial' },
    { name: 'one repo commit history failed', status: { github: true, devto: true, commitsOk: 11, commitsTotal: 12 }, expected: 'partial' },
    { name: 'all commit histories failed, Dev.to up', status: { github: true, devto: true, commitsOk: 0, commitsTotal: 12 }, expected: 'partial' },
    { name: 'nothing but identity data (Dev.to + commits down)', status: { github: true, devto: false, commitsOk: 0, commitsTotal: 12 }, expected: 'fallback' },
    { name: 'GitHub failed', status: { github: false, devto: true, commitsOk: 12, commitsTotal: 12 }, expected: 'fallback' },
    { name: 'no repos to fetch commits for is not a degradation', status: { github: true, devto: true, commitsOk: 0, commitsTotal: 0 }, expected: 'live' },
  ] as const;

  for (const { name, status, expected } of cases) {
    it(`${name} -> ${expected}`, () => {
      const value = classifySnapshot(status);
      expect(value).toBe(expected);
      // The classifier must not invent a value the snapshot type rejects.
      const asType: MetricsSnapshot['source'] = value;
      expect(asType).toBe(value);
    });
  }
});

/**
 * Same defect, same file: `repos` filtered forks out, the commit feed did not.
 * 18 of the 30 published commits were other people's (measured 2026-09-29),
 * which pushed the owner's own newest work out of the window.
 */
describe('selectPublishedRepos — fork filter (KI-021 follow-up)', () => {
  const account = [
    { name: 'MSPortfolio', fork: false },
    { name: 'mscodebase-intelligence', fork: false },
    { name: 'Stanford-Town-AI-Project', fork: true },
    { name: 'awesome-mcp-servers', fork: true },
    { name: 'ManSio' },
  ];

  it('keeps only non-forks', () => {
    expect(selectPublishedRepos(account).map((r) => r.name)).toEqual(['MSPortfolio', 'mscodebase-intelligence', 'ManSio']);
  });

  it('treats a missing fork flag as an owned repo', () => {
    expect(selectPublishedRepos([{ name: 'ManSio' }])).toHaveLength(1);
  });

  it('drops every commit source when the account is all forks', () => {
    // A fork-only account must not look like a degraded source, and must not
    // quietly publish third-party commits.
    expect(selectPublishedRepos([{ name: 'x', fork: true }])).toEqual([]);
  });

  it('an empty account stays empty', () => {
    expect(selectPublishedRepos([])).toEqual([]);
  });
});

/**
 * The code promised "real work, not bot commits" but only filtered the cron
 * snapshot, so a dependabot bump reached the published feed.
 */
describe('isNoiseCommit — commit feed filter', () => {
  const drops = [
    { name: 'the metrics cron', commit: { message: 'chore: refresh metrics snapshot', authorName: 'metrics-bot' } },
    { name: 'a [skip ci] push', commit: { message: 'docs: sync diary [skip ci]', authorName: 'Mikhail' } },
    { name: 'dependabot', commit: { message: 'Bump fastapi from 0.115 to 0.116', authorName: 'dependabot[bot]' } },
    { name: 'renovate', commit: { message: 'Update dependency vite to v6', authorName: 'renovate[bot]' } },
    { name: 'the classic github-actions bot', commit: { message: 'Bump actions/checkout', authorName: 'github-actions[bot]' } },
  ];
  for (const { name, commit } of drops) {
    it(`drops ${name}`, () => expect(isNoiseCommit(commit)).toBe(true));
  }

  const keeps = [
    { name: 'the owner', commit: { message: 'fix(redteam): wire silent_subprocess into entry point', authorName: 'Mikhail' } },
    { name: "the owner's own agent", commit: { message: 'refactor(lab): keep the lab corpus pure', authorName: 'MSCodeBase Agent' } },
    // A person whose handle merely contains "bot" is still a person.
    { name: 'a human named Bot', commit: { message: 'feat: add bot-mode evaluation harness', authorName: 'robotics-dev' } },
    { name: 'a commit with an empty message', commit: { message: '', authorName: 'ManSio' } },
    // Unknown author is not evidence of automation — dropping it would silently
    // delete the owner's own commits whenever the API omits the name.
    { name: 'a commit whose author name is missing', commit: { message: 'feat: add a thing', authorName: undefined } as { message: string; authorName?: string } },
  ];
  for (const { name, commit } of keeps) {
    it(`keeps ${name}`, () => expect(isNoiseCommit(commit)).toBe(false));
  }
});

/**
 * KI-021 on the client: `useMetrics` substituted a failed Dev.to call with the
 * snapshot's articles and still stamped the payload `source: 'live'`, so a
 * visitor saw a green live badge over data that was half a file.
 */
describe('resolveSource — what the client actually shows', () => {
  const cases = [
    { name: 'Dev.to answered', devto: 8, snapshot: 8, expected: 'live' },
    { name: 'Dev.to down, snapshot has articles', devto: 0, snapshot: 8, expected: 'partial' },
    { name: 'Dev.to down, snapshot empty, bundled copy used', devto: 0, snapshot: 0, expected: 'fallback' },
    // Dev.to answering with nothing is a silent degradation, not a success.
    { name: 'Dev.to answered with an empty list', devto: 0, snapshot: 0, expected: 'fallback' },
  ] as const;

  for (const { name, devto, snapshot, expected } of cases) {
    it(`${name} -> ${expected}`, () => {
      const value = resolveSource(devto, snapshot);
      expect(value).toBe(expected);
      const asType: MetricsSnapshot['source'] = value;
      expect(asType).toBe(value);
    });
  }
});

describe('isLiveCall — does the dashboard stay live', () => {
  it('treats a partial response as live enough to render numbers', () => {
    expect(isLiveCall('partial')).toBe(true);
    expect(isLiveCall('live')).toBe(true);
  });
  it('treats a static snapshot, loading and error as not live', () => {
    expect(isLiveCall('fallback')).toBe(false);
    expect(isLiveCall('loading')).toBe(false);
    expect(isLiveCall('error')).toBe(false);
  });
});

describe('displayedSource — what the badge may claim', () => {
  it('shows a live call as live', () => {
    expect(displayedSource('live', 'live')).toBe('live');
  });
  it('shows a half-substituted live call as partial', () => {
    expect(displayedSource('partial', 'partial')).toBe('partial');
  });
  // The regression this rule exists for: a file captured while live must not
  // announce "Live" to a visitor being served that static file.
  it('never lets a file that claims live speak for a served snapshot', () => {
    expect(displayedSource('fallback', 'live')).toBe('fallback');
    expect(displayedSource('fallback', 'partial')).toBe('fallback');
  });
  it('falls back when there is nothing to show', () => {
    expect(displayedSource('error', undefined)).toBe('fallback');
    expect(displayedSource('live', undefined)).toBe('fallback');
  });
});

describe('FreshnessBadge — the badge must be able to say partial', () => {
  const when = '2026-09-29T05:38:34.453Z';
  // createElement, not JSX: this file is .ts, and the repo has no .tsx tests.
  const render = (source: 'live' | 'partial' | 'fallback') => renderToStaticMarkup(createElement(FreshnessBadge, { source, fetchedAt: when }));

  it('labels a partial response distinctly from live', () => {
    expect(render('partial')).toContain('Partly live');
  });
  it('does not let a partial response read as fully live', () => {
    expect(render('partial')).not.toContain('>Live');
  });
  it('keeps the static wording for a full fallback', () => {
    expect(render('fallback')).toContain('Static snapshot');
  });
  it('keeps the live wording for a fully live response', () => {
    expect(render('live')).toContain('Live · ');
  });
});

describe('LiveDot — a static snapshot must not pulse green', () => {
  const render = (state?: 'live' | 'partial' | 'fallback') => renderToStaticMarkup(createElement(LiveDot, { state }));

  it('pulses only for live', () => {
    expect(render('live')).toContain('animate-ping');
  });
  it('stops pulsing for partial and fallback', () => {
    expect(render('partial')).not.toContain('animate-ping');
    expect(render('fallback')).not.toContain('animate-ping');
  });
  it('defaults to the live dot for unrelated callers', () => {
    expect(render()).toContain('animate-ping');
  });
});
