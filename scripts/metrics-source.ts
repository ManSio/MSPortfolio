/**
 * Classifies how much of a metrics snapshot came from live APIs (KI-021).
 *
 * The snapshot is a public, machine-read artifact: agents fetch it. A flag
 * that always says 'fallback' teaches every consumer the wrong thing, so the
 * value is derived from what each source actually returned instead of being
 * hardcoded.
 *
 * - live     every source answered
 * - partial  at least one source is missing (or answered empty) while others
 *            are real — the snapshot is usable but incomplete
 * - fallback nothing but static/identity data — a consumer must not treat it
 *            as fresh measurements
 */
export type MetricsSource = 'live' | 'partial' | 'fallback';

export interface SourceStatus {
  /** GitHub user + repo list. A failed call aborts the writer, so a written snapshot is normally true. */
  github: boolean;
  /** Dev.to article list answered with a 2xx. */
  devto: boolean;
  /** Repos whose commit history was fetched successfully. */
  commitsOk: number;
  /** Repos we attempted to fetch commit history for. */
  commitsTotal: number;
}

export function classifySnapshot(status: SourceStatus): MetricsSource {
  if (!status.github) return 'fallback';
  const commitsComplete = status.commitsOk >= status.commitsTotal;
  if (status.devto && commitsComplete) return 'live';
  if (!status.devto && status.commitsOk === 0) return 'fallback';
  return 'partial';
}
