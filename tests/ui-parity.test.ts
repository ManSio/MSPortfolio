import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { UI, fmt, fmtParts } from '../src/i18n/ui';
import { LangProvider } from '../src/i18n/LangContext';
import { FreshnessBadge } from '../src/components/metrics/MetricCard';

/** Flatten a nested dict to dotted leaf paths. */
function paths(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix];
  return Object.entries(value as Record<string, unknown>).flatMap(([k, v]) => paths(v, prefix ? `${prefix}.${k}` : k));
}

const METRICS_DIR = 'src/components/metrics';

describe('UI dictionary parity — EN and RU must stay congruent', () => {
  // The RU site is a real deliverable, not a stub: a key present in EN and
  // missing in RU silently falls back to English for a Russian visitor, and
  // nothing else in the build would notice.
  it('has exactly the same leaf keys in both languages', () => {
    expect(paths(UI.ru).sort()).toEqual(paths(UI.en).sort());
  });

  it('has no empty translations', () => {
    const empty = paths(UI.ru)
      .map((p) => p.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], UI.ru))
      .filter((v) => typeof v === 'string' && v.trim() === '');
    expect(empty).toEqual([]);
  });
});

describe('metrics components are localized at all', () => {
  // The intent was "every metrics key is wired to a component", implemented as
  // a per-key property-access sweep. That is unsound here and was dropped after
  // it failed on correct code: the freshness labels are picked by a dynamic
  // index (`freshness[state]`), so a key legitimately never appears by name.
  // What this keeps is the failure it was meant to catch — a widget added to
  // this directory with English strings hardcoded and no dictionary at all.
  const files = readdirSync(METRICS_DIR).filter((f) => f.endsWith('.tsx'));

  it('covers the widget directory', () => {
    expect(files.sort()).toEqual(['BenchmarksPanel.tsx', 'ExternalWidgets.tsx', 'GithubStats.tsx', 'MetricCard.tsx']);
  });

  it.each(files)('imports the UI dictionary in %s', (file) => {
    expect(readFileSync(`${METRICS_DIR}/${file}`, 'utf8')).toMatch(/from '..\/..\/i18n\/ui'/);
  });
});

describe('fmt', () => {
  it('substitutes numbers and strings', () => {
    expect(fmt('{n} languages', { n: 3 })).toBe('3 languages');
    expect(fmt('of {n} controls', { n: 8 })).toBe('of 8 controls');
  });
  it('leaves an unknown placeholder visible instead of rendering a gap', () => {
    expect(fmt('{n} languages', {})).toBe('{n} languages');
  });
});

describe('fmtParts', () => {
  it('keeps a node variable as a node and substitutes the rest', () => {
    const parts = fmtParts('run {cmd} to make {file}.', {
      cmd: createElement('span', { className: 'mono' }, 'pnpm bench'),
      file: 'benchmarks.json',
    });
    expect(parts).toHaveLength(5);
    expect(parts[1]).toMatchObject({ type: 'span' });
    expect(parts[0]).toBe('run ');
    expect(parts[3]).toBe('benchmarks.json');
  });
  it('leaves an unknown placeholder visible', () => {
    expect(fmtParts('a {x} b', {})).toEqual(['a ', '{x}', ' b']);
  });
});

describe('FreshnessBadge in Russian', () => {
  it('renders the RU label, not the EN fallback', () => {
    const prev = (globalThis as { localStorage?: Storage }).localStorage;
    // LangProvider reads localStorage to pick the language; node has none, so
    // the default is EN and the RU assertion below would be vacuous.
    (globalThis as { localStorage?: Storage }).localStorage = {
      getItem: () => 'ru',
      setItem: () => {},
      clear: () => {},
      key: () => null,
      length: 0,
    } as Storage;
    try {
      const html = renderToStaticMarkup(
        createElement(
          LangProvider,
          null,
          createElement(FreshnessBadge, { source: 'partial', fetchedAt: '2026-09-29T05:51:00.000Z' }),
        ),
      );
      expect(html).toContain('Частично живые');
      expect(html).not.toContain('Partly live');
    } finally {
      if (prev === undefined) delete (globalThis as { localStorage?: Storage }).localStorage;
      else (globalThis as { localStorage?: Storage }).localStorage = prev;
    }
  });
});