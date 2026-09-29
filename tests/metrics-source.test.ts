import { describe, expect, it } from 'vitest';
import { classifySnapshot, isNoiseCommit, selectPublishedRepos } from '../scripts/metrics-source';
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
