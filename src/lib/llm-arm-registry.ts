// Wires the optional v2 LLM arm into verify_claim WITHOUT a module cycle:
//
//   mcp-tools.ts ──value──> registry <──value── worker/index.ts
//        │  ▲                          │
//        │  └── (type-only) ───────────┘
//        └── runtime: getLlmArm() at tool-call time
//
// The worker sets the arm per request when OPENROUTER_API_KEY is configured;
// when it is unset (browser demo, local engine, tests, keyless deploys) the
// tool stays fully deterministic — the LLM arm is strictly additive.
import type { LlmArmResult } from './llm-verify.ts';

export type LlmArm = (claim: string) => Promise<LlmArmResult>;

let arm: LlmArm | undefined;

/** Configure (or disable) the LLM arm. Worker calls this per /mcp request. */
export function setLlmArm(fn: LlmArm | undefined): void {
  arm = fn;
}

/** Read by verify_claim at call time; undefined = deterministic-only. */
export function getLlmArm(): LlmArm | undefined {
  return arm;
}
