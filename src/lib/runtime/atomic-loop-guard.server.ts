import { createHash } from "node:crypto";
import type { ToolGrant } from "./tools.server";

/**
 * Runtime patterns adapted from Atomic Agent (MIT, Copyright (c) 2026 Atomic Bot).
 * The implementation here is intentionally Palladium-specific: it uses our tool
 * grants/approval model and never parallelises a batch containing an uncertain
 * or externally mutating action.
 */

export type RuntimeToolCall = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

const PARALLEL_SAFE_READS = new Set([
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
]);

function stable(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  const row = value as Record<string, unknown>;
  return `{${Object.keys(row)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stable(row[key])}`)
    .join(",")}}`;
}

function hash(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex").slice(0, 24);
}

export function isParallelSafeRead(name: string, grant: ToolGrant | undefined): boolean {
  return Boolean(grant && !grant.requiresApproval && PARALLEL_SAFE_READS.has(name));
}

/**
 * Conservative policy: parallelise only when the whole model-emitted batch is
 * made of independently safe reads. A mixed batch stays sequential so writes,
 * approvals and browser state never race against observations.
 */
export function shouldParalleliseToolBatch(
  calls: readonly RuntimeToolCall[],
  grants: Map<string, ToolGrant>,
): boolean {
  return calls.length > 1 && calls.every((call) => isParallelSafeRead(call.name, grants.get(call.name)));
}

export type LoopVerdict =
  | { level: "ok" }
  | { level: "warn"; message: string }
  | { level: "critical"; message: string };

type HistoryEntry = {
  signature: string;
  outcomeHash?: string;
};

/**
 * Per-run no-progress detector. It does not terminate work on a mere repeat:
 * the third identical request gets a warning; repeated identical request +
 * identical result escalates so the caller can stop wasting tool rounds.
 */
export class ToolLoopGuard {
  private readonly history: HistoryEntry[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 24) {
    this.maxHistory = Math.max(8, maxHistory);
  }

  check(call: Pick<RuntimeToolCall, "name" | "arguments">): LoopVerdict {
    const signature = `${call.name}:${hash(call.arguments)}`;
    const matching = this.history.filter((entry) => entry.signature === signature);
    const repeatCount = matching.length;
    if (repeatCount >= 4) {
      const outcomes = matching.map((entry) => entry.outcomeHash).filter(Boolean);
      const latest = outcomes[outcomes.length - 1];
      const sameOutcomeStreak = latest
        ? [...outcomes].reverse().findIndex((value) => value !== latest)
        : -1;
      const noProgress = latest && (sameOutcomeStreak === -1 ? outcomes.length : sameOutcomeStreak) >= 3;
      if (noProgress) {
        return {
          level: "critical",
          message: `Blocked repeated ${call.name} call because the same request has produced the same result repeatedly. Use the information already returned or change approach.`,
        };
      }
    }
    if (repeatCount >= 2) {
      return {
        level: "warn",
        message: `You have already called ${call.name} with these same arguments ${repeatCount} times. Avoid repeating it unless new information makes another attempt necessary.`,
      };
    }
    return { level: "ok" };
  }

  recordCall(call: Pick<RuntimeToolCall, "name" | "arguments">): void {
    this.history.push({ signature: `${call.name}:${hash(call.arguments)}` });
    if (this.history.length > this.maxHistory) this.history.splice(0, this.history.length - this.maxHistory);
  }

  recordOutcome(call: Pick<RuntimeToolCall, "name" | "arguments">, output: unknown): void {
    const signature = `${call.name}:${hash(call.arguments)}`;
    for (let index = this.history.length - 1; index >= 0; index -= 1) {
      const entry = this.history[index];
      if (entry?.signature === signature && !entry.outcomeHash) {
        entry.outcomeHash = hash(output);
        return;
      }
    }
  }
}

/**
 * Keep tool feedback bounded before it is fed back into the next model turn.
 * Short structured results stay byte-for-byte JSON; very large results retain
 * a head and tail plus a clear truncation marker instead of consuming the
 * remaining context window.
 */
export function compactToolResult(output: unknown, maxChars = 6_000): string {
  let text: string;
  try {
    text = JSON.stringify(output ?? null);
  } catch {
    text = JSON.stringify({ error: "Tool returned an unserialisable result." });
  }
  if (text.length <= maxChars) return text;
  const marker = `…[tool result compressed: ${text.length} chars]…`;
  const remaining = Math.max(200, maxChars - marker.length);
  const head = Math.ceil(remaining * 0.65);
  const tail = remaining - head;
  return `${text.slice(0, head)}${marker}${text.slice(-tail)}`;
}
