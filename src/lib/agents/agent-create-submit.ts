/**
 * Single-flight submit helpers for agent creation.
 *
 * The wizard must never fire more than one create request per click, and must
 * never report success unless the server confirmed a persisted row with an id.
 * These helpers are pure so they can be covered by tests without a DOM.
 */

/** Renders any thrown value as a safe, human-readable string (never "[object Object]"). */
export function describeError(error: unknown, fallback = "Please try again."): string {
  if (!error) return fallback;
  if (typeof error === "string") return error.trim() || fallback;
  if (error instanceof Error) return error.message || fallback;
  if (typeof error === "object") {
    const obj = error as Record<string, unknown>;
    for (const key of ["message", "error_description", "error", "detail", "hint"]) {
      const value = obj[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    try {
      const json = JSON.stringify(obj);
      if (json && json !== "{}") return json.slice(0, 300);
    } catch {
      /* circular — fall through */
    }
  }
  return fallback;
}

/** The persisted id of a created agent, or null when the server confirmed nothing. */
export function persistedAgentId(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const row = result as Record<string, unknown>;
  const candidate = row["id"] ?? (row["agent"] as Record<string, unknown> | undefined)?.["id"];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : null;
}

/**
 * Wraps a non-idempotent mutation so overlapping calls share one in-flight
 * promise. No automatic retry: a failure rejects and the guard resets.
 */
export function singleFlight<A extends unknown[], R>(fn: (...args: A) => Promise<R>) {
  let inFlight: Promise<R> | null = null;
  const wrapped = (...args: A): Promise<R> => {
    if (inFlight) return inFlight;
    const promise = (async () => fn(...args))().finally(() => {
      if (inFlight === promise) inFlight = null;
    });
    inFlight = promise;
    return promise;
  };
  wrapped.isPending = () => inFlight !== null;
  return wrapped;
}
