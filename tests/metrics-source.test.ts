import { describe, expect, it } from 'vitest';
import { classifySnapshot } from '../scripts/metrics-source';
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
