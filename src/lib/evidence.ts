// Shared evidence computation (Evidence Score v1) — used by BOTH the worker
// (/chat responses) and the browser agent demo. Browser-safe: no Node deps.
//
// The grounding summary is deterministic: derived only from the tool-call steps
// the agent loop records. "Grounded" = the tool returned a non-error result.

export interface ChatEvidence {
  toolCalls: number;
  grounded: number;
  failed: number;
  /** True when the model answered without calling any tool (ungrounded answer). */
  ungrounded: boolean;
}

export interface EvidenceStep {
  type: 'tool_call' | 'tool_result';
  result?: unknown;
}

/** Deterministic grounding summary for one chat answer. */
export function computeChatEvidence(steps: EvidenceStep[]): ChatEvidence {
  const results = steps.filter((s) => s.type === 'tool_result');
  const grounded = results.filter((s) => {
    if (s.result == null) return false;
    if (typeof s.result === 'object' && 'error' in (s.result as Record<string, unknown>)) return false;
    return true;
  }).length;
  return {
    toolCalls: steps.filter((s) => s.type === 'tool_call').length,
    grounded,
    failed: results.length - grounded,
    ungrounded: steps.length === 0,
  };
}

/** Human-readable one-liner for the agent-loop trace. */
export function evidenceLabel(ev: ChatEvidence): string {
  if (ev.ungrounded) return '⚠ ungrounded — answered without calling any tool';
  const calls = `${ev.toolCalls} tool call${ev.toolCalls === 1 ? '' : 's'}`;
  return `evidence: ${calls} · ${ev.grounded} grounded · ${ev.failed} failed`;
}
