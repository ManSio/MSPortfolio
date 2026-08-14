import { useEffect, useState } from 'react';
import { getMcpStats } from '../../lib/api';
import { Card } from '../ui/Card';

/**
 * Live agent-traffic counter: how many MCP tool invocations the deployed
 * worker served today (and in total). Reads the worker's /mcp/stats endpoint.
 */
export function McpStatsCard() {
  const [stats, setStats] = useState<{ enabled?: boolean; today?: number; total?: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMcpStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <p className="font-mono text-xs text-accent">live agent traffic</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {stats?.enabled ? (
          <>
            <span className="text-paper">{stats.today ?? 0}</span> MCP queries today ·{' '}
            <span className="text-paper">{stats.total ?? 0}</span> total
          </>
        ) : (
          'Agent counter is warming up — check back after the first query.'
        )}
      </p>
    </Card>
  );
}
