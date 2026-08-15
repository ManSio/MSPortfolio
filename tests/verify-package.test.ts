import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTool } from '../src/lib/mcp-tools';

/**
 * verify_package — npm registry primary-source verification (16th tool).
 * All registry responses are mocked; the live path is verified against the
 * deployed endpoint in the prod smoke.
 */

interface PackageResult {
  package: string;
  available: boolean;
  exists?: boolean;
  latestVersion?: string | null;
  maintainers?: string[];
  maintainedByOwner?: boolean;
  error?: string;
  note?: string;
}

function stubNpm(status: number, body: Record<string, unknown>) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: { headers: Record<string, string> }) => {
      expect(String(url)).toContain('registry.npmjs.org/');
      expect(init.headers['User-Agent']).toBe('msp-portfolio-server');
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }),
  );
}

const callPackage = async (name: string): Promise<PackageResult> => {
  const tool = getTool('verify_package');
  if (!tool) throw new Error('verify_package tool missing');
  return (await tool.execute({ package: name })) as PackageResult;
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('verify_package — npm primary-source verification', () => {
  it('existing package returns registry data and maintainer check', async () => {
    stubNpm(200, {
      name: 'some-pkg',
      'dist-tags': { latest: '1.2.3' },
      description: 'A package',
      license: 'MIT',
      maintainers: [{ name: 'someone' }, { name: 'mansio' }],
      time: { '1.2.3': '2026-01-01T00:00:00Z' },
    });
    const res = await callPackage('Some-Pkg'); // case-insensitive input
    expect(res.available).toBe(true);
    expect(res.exists).toBe(true);
    expect(res.latestVersion).toBe('1.2.3');
    expect(res.maintainers).toContain('mansio');
    expect(res.maintainedByOwner).toBe(true);
  });

  it('honest not-found for a package that does not exist', async () => {
    stubNpm(404, { error: 'Not found' });
    const res = await callPackage('no-such-package-xyz');
    expect(res.available).toBe(true);
    expect(res.exists).toBe(false);
    expect(res.note).toContain('not found');
  });

  it('registry failure degrades to an honest error', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('ECONNREFUSED'))));
    const res = await callPackage('some-pkg');
    expect(res.available).toBe(false);
    expect(res.error).toContain('unreachable');
  });

  it('empty input is refused without a network call', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await callPackage('   ');
    expect(res.available).toBe(false);
    expect(res.error).toContain('Provide a package name');
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
