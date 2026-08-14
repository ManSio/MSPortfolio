import { describe, expect, it } from 'vitest';
import { composeAnswer, matchIntent } from '../src/lib/intents';

describe('intent matching (RU/EN)', () => {
  it('matches project questions', () => {
    expect(matchIntent('What projects did you build?').id).toBe('projects');
    expect(matchIntent('Какие проекты ты делал?').id).toBe('projects');
    expect(matchIntent('покажи опыт работы').id).toBe('projects');
  });

  it('prefers specific stack filters over generic projects', () => {
    expect(matchIntent('python проекты').id).toBe('projects_python');
    expect(matchIntent('mcp projects').id).toBe('projects_mcp');
    expect(matchIntent('aws инфраструктура').id).toBe('projects_aws');
  });

  it('matches principles, stack, architecture, articles', () => {
    expect(matchIntent('what are your engineering principles?').id).toBe('principles');
    expect(matchIntent('как ты мыслишь').id).toBe('principles');
    expect(matchIntent('подхожу ли я под вакансию').id).toBe('stack');
    expect(matchIntent('как устроен поиск под нагрузкой').id).toBe('architecture');
    expect(matchIntent('твои статьи на dev.to').id).toBe('articles');
    expect(matchIntent('история решений').id).toBe('timeline');
  });

  it('falls back to projects for unknown input', () => {
    expect(matchIntent('zzzzqqqq!!!').id).toBe('projects');
  });
});

describe('composeAnswer', () => {
  it('formats projects list', () => {
    const out = composeAnswer(matchIntent('projects'), [
      { count: 2, projects: [{ name: 'A', tagline: 'x' }, { name: 'B', tagline: 'y' }] },
    ]);
    expect(out).toContain('2 projects');
    expect(out).toContain('A — x');
  });

  it('formats stack coverage honestly', () => {
    const out = composeAnswer(matchIntent('stack'), [
      { coverage: 0.5, verdict: 'Good fit with some gaps', matched: [{ skill: 'python', matched: true }, { skill: 'aws', matched: false }] },
    ]);
    expect(out).toContain('50%');
    expect(out).toContain('python');
  });

  it('formats articles', () => {
    const out = composeAnswer(matchIntent('articles'), [
      { count: 1, articles: [{ title: 'T', readingTimeMinutes: 5, url: 'https://dev.to/x' }] },
    ]);
    expect(out).toContain('1 articles');
    expect(out).toContain('T');
  });
});
