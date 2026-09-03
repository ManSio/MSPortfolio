import { useEffect, useState } from 'react';
import { getMcpLive, getMcpStats, type McpLiveCall } from '../../lib/api';
import { Card } from '../ui/Card';

/**
 * Live agent-traffic counter: how many MCP tool invocations the deployed
 * worker served today (and in total), plus the most recent real invocations
 * with timestamps. Reads the worker's /mcp/stats and /mcp/live endpoints.
 */
const RECENT_SHOWN = 8;

function formatTs(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date().toDateString() === d.toDateString();
  const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (today) return `today ${time}`;
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date} ${time}`;
}

export function McpStatsCard() {
  const [stats, setStats] = useState<{ enabled?: boolean; today?: number; total?: number } | null>(null);
  const [recent, setRecent] = useState<McpLiveCall[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getMcpStats().then((s) => {
      if (!cancelled) setStats(s);
    });
    void getMcpLive().then((live) => {
      if (!cancelled) setRecent(live?.recent?.slice(0, RECENT_SHOWN) ?? []);
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
      {Array.isArray(recent) && recent.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-line pt-3 text-xs">
          {recent.map((call, i) => (
            <li key={`${call.ts}-${i}`} className="flex items-center justify-between gap-3 font-mono">
              <span className="truncate text-paper">{call.tool}</span>
              <span className="shrink-0 text-muted">{formatTs(call.ts)}</span>
            </li>
          ))}
        </ul>
      )}
      {Array.isArray(recent) && recent.length === 0 && stats?.enabled && (
        <p className="mt-2 font-mono text-xs text-muted">no real MCP calls yet — check back after a query</p>
      )}
    </Card>
  );
}
