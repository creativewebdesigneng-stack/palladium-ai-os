/**
 * Single-agent runtime loop guard.
 *
 * Patterns adapted from Atomic Agent (MIT licence, Copyright (c) 2026 Atomic
 * Bot): conservative parallel read batching, repeated/no-progress tool-call
 * detection, and compaction of oversized tool feedback. This is an independent
 * PalladiumAI implementation of those ideas — not a copy of their code — and it
 * is an optimisation/safety layer only. It never grants, bypasses or replaces
 * the approval pipeline, and it never touches credentials or persisted audit
 * records.
 */

import type { ToolGrant } from "./tools.server";

/* ------------------------------------------------ conservative read batching */

/**
 * Tools that are explicitly safe to run concurrently: read-only, side-effect
 * free, and incapable of creating an external action. Anything absent from this
 * list — including every future or unknown tool — executes sequentially.
 */
export const SAFE_PARALLEL_READ_TOOLS: readonly string[] = [
  "current_time",
  "calculator",
  "web_search",
  "web_fetch",
  "memory_search",
  "file_analysis",
  "data_analysis",
  "database_query",
  "integration_capabilities",
  "nango_capabilities",
];

const SAFE_READS = new Set(SAFE_PARALLEL_READ_TOOLS);

export type GuardToolCall = { id?: string; name: string; arguments: Record<string, unknown> };

/**
 * True only when every call in the model-emitted batch is an allow-listed safe
 * read that is granted to the agent and does not require approval.
 */
export function canBatchInParallel(
  calls: readonly GuardToolCall[],
  grants: Map<string, ToolGrant>,
): boolean {
  if (calls.length < 2) return false;
  return calls.every((call) => {
    if (!SAFE_READS.has(call.name)) return false;
    const grant = grants.get(call.name);
    if (!grant) return false;
    return grant.requiresApproval === false;
  });
}

/* ------------------------------------------- oversized tool result compaction */

const COMPACT_TARGET = 6_000;

function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (input: unknown): unknown => {
    if (input === null || typeof input !== "object") return input;
    if (seen.has(input as object)) return "[circular]";
    seen.add(input as object);
    if (Array.isArray(input)) return input.map(walk);
    const entries = Object.keys(input as Record<string, unknown>)
      .sort()
      .map((key) => [key, walk((input as Record<string, unknown>)[key])] as const);
    return Object.fromEntries(entries);
  };
  try {
    return JSON.stringify(walk(value)) ?? "null";
  } catch {
    return String(value);
  }
}

/**
 * Compresses a tool result for the model context only. Short results are passed
 * through untouched; oversized results keep a large head plus a useful tail
 * (where errors and totals usually live) separated by an explicit marker.
 */
export function compactToolResultForModel(output: unknown, target = COMPACT_TARGET): string {
  let text: string;
  try {
    text = JSON.stringify(output) ?? "null";
  } catch {
    text = String(output);
  }
  if (text.length <= target) return text;

  const budget = Math.max(target, 600);
  const tailSize = Math.floor(budget * 0.25);
  const headSize = budget - tailSize;
  const head = text.slice(0, headSize);
  const tail = text.slice(text.length - tailSize);
  return `${head}\n\n[...PALLADIUM_TRUNCATED: original result was ${text.length} characters; middle section omitted...]\n\n${tail}`;
}

/* --------------------------------------- repeated / no-progress loop detection */

/** Third prospective identical call gets a warning appended to its result. */
const WARN_AFTER_PRIOR_CALLS = 2;
/**
 * Palladium has four tool rounds, so after three identical no-progress
 * executions the fourth identical request is vetoed. That leaves the final
 * model turn available to use the existing results instead of exhausting the
 * run budget.
 */
const VETO_AFTER_PRIOR_CALLS = 3;
/** ...but only when the outcome has already repeated this many times. */
const VETO_AFTER_SAME_OUTCOMES = 3;

export type GuardDecision =
  | { action: "allow" }
  | { action: "warn"; notice: string }
  | { action: "veto"; output: Record<string, unknown> };

type Entry = { calls: number; outcomes: Map<string, number> };

/**
 * Per-run repeated-call detector. One instance per run; both the streaming and
 * non-streaming loops create one so behaviour cannot diverge.
 */
export class RunLoopGuard {
  private readonly entries = new Map<string, Entry>();

  private key(call: GuardToolCall): string {
    return `${call.name}::${stableStringify(call.arguments ?? {})}`;
  }

  private entry(key: string): Entry {
    let found = this.entries.get(key);
    if (!found) {
      found = { calls: 0, outcomes: new Map() };
      this.entries.set(key, found);
    }
    return found;
  }

  /** Called before executing a tool call. */
  inspect(call: GuardToolCall): GuardDecision {
    const entry = this.entries.get(this.key(call));
    const priorCalls = entry?.calls ?? 0;
    if (priorCalls === 0) return { action: "allow" };

    const repeatedOutcomes = entry
      ? Math.max(0, ...Array.from(entry.outcomes.values()))
      : 0;

    if (priorCalls >= VETO_AFTER_PRIOR_CALLS && repeatedOutcomes >= VETO_AFTER_SAME_OUTCOMES) {
      return {
        action: "veto",
        output: {
          ok: false,
          error: "repeated_no_progress_blocked",
          message:
            `This exact ${call.name} request has already been made ${priorCalls} times and returned the same result each time, so it was blocked before execution. ` +
            "Use the information you already have, or change your approach — do not repeat this call.",
          tool: call.name,
          prior_calls: priorCalls,
        },
      };
    }

    if (priorCalls >= WARN_AFTER_PRIOR_CALLS) {
      return {
        action: "warn",
        notice:
          `NOTICE: you have already made this exact ${call.name} request ${priorCalls} times. ` +
          "Unless you have new information, change your approach instead of repeating it.",
      };
    }

    return { action: "allow" };
  }

  /** Called after a tool call resolves (or is vetoed) to record the outcome. */
  record(call: GuardToolCall, output: unknown): void {
    const entry = this.entry(this.key(call));
    entry.calls += 1;
    const fingerprint = stableStringify(output).slice(0, 2_000);
    entry.outcomes.set(fingerprint, (entry.outcomes.get(fingerprint) ?? 0) + 1);
  }

  /** Applies a warning notice to the model-facing tool result text. */
  static withNotice(content: string, notice: string): string {
    return `${content}\n\n${notice}`;
  }
}
